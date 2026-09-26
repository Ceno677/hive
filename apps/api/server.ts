import Fastify,{type FastifyRequest} from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import {resolve} from 'node:path';
import {z,ZodError} from 'zod';
import {PublicKey} from '@solana/web3.js';
import {Redis} from 'ioredis';
import type {PrismaClient} from '@prisma/client';
import {Auth} from '../../packages/auth/service.js';
import {Engine} from '../../packages/orchestrator/engine.js';
import {Payments} from '../../packages/payments/requests.js';
import {Fault,digest,hash,bundleSchema,planSchema,keySchema,skills} from '../../packages/shared/domain.js';
import {type Config,missing,missingModels,paymentKeys,mintKeys,deliveryKeys} from '../../packages/shared/config.js';
import {plan,type Model} from '../../packages/ai/provider.js';
import type {Chain} from '../../packages/solana/chain.js';
import type {ArtifactStore} from '../../packages/artifacts/store.js';
import {assemble} from '../../packages/artifacts/assemble.js';
import {deliveryRoutes} from './delivery.js';
import {observe} from './observability.js';
import {requestSchemas} from '../../packages/shared/http-schemas.js';
import {deploymentAddress} from '../../packages/delivery/solana-deploy.js';
const uuid=z.string().uuid(),idOf=(r:FastifyRequest)=>uuid.parse((r.params as any).id);
export function buildServer(opts:{db:PrismaClient;c:Config;chain:Chain;store:ArtifactStore;model:Model;serveStatic?:boolean;logger?:boolean}){
 const {db,c,chain,store,model}=opts,auth=new Auth(db,c),engine=new Engine(db,chain,store,c),payments=new Payments(db,chain,engine,c);
 const paymentRequired=paymentKeys(c),mintRequired=mintKeys(c),deliveryRequired=deliveryKeys(c);
 const app=Fastify({logger:opts.logger===false?false:{redact:['req.headers.authorization','req.headers.cookie','req.body','res.headers.set-cookie']},bodyLimit:2_100_000,trustProxy:c.TRUST_PROXY==='true'});
 app.register(cookie);
 app.register(cors,{origin:c.PUBLIC_ORIGIN,credentials:true});
 app.register(helmet,{contentSecurityPolicy:false});
 app.register(rateLimit,{max:100,timeWindow:'1 minute'});
 observe(app,c);
 app.addHook('preValidation',async r=>{const schema=requestSchemas[r.routeOptions.url??''];if(schema&&r.method==='POST')r.body=schema.parse(r.body);});
 app.addHook('onRequest',async(req,reply)=>{
  if(req.url.startsWith('/api/'))reply.header('cache-control','no-store');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&req.headers.origin!==c.PUBLIC_ORIGIN)throw new Fault(403,'origin_not_allowed');
 });
 app.setErrorHandler((error,request,reply)=>{
  if(error instanceof Fault)return reply.code(error.status).send({error:error.code,message:error.message,details:error.details,requestId:request.id});
  if(error instanceof ZodError)return reply.code(400).send({error:'invalid_input',problems:error.issues.map(x=>({path:x.path,message:x.message}))});
  if((error as any).statusCode===429)return reply.code(429).send({error:'rate_limited'});
  if((error as any).code==='P2025')return reply.code(404).send({error:'not_found'});
  if((error as any).code==='P2002')return reply.code(409).send({error:'conflict'});
  request.log.error({err:error},'Request failed');return reply.code(500).send({error:'internal_error',requestId:request.id});
 });
 async function wallet(r:FastifyRequest){
  const token=r.cookies.hive_session;if(!token)throw new Fault(401,'sign_in_required');
  return auth.session(token,r.headers['x-csrf-token'] as string,!['GET','HEAD'].includes(r.method));
 }
 async function device(r:FastifyRequest){
  const token=r.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if(!token)throw new Fault(401,'device_required');return auth.device(token);
 }
 async function ownFlow(r:FastifyRequest,id=idOf(r)){
  const owner=await wallet(r),f=await db.workflow.findUnique({where:{id}});
  if(!f||f.wallet!==owner)throw new Fault(404,'not_found');return f;
 }
 async function readableFlow(r:FastifyRequest,id=idOf(r)){
  const f=await db.workflow.findUnique({where:{id}});
  if(!f)throw new Fault(404,'not_found');
  if(f.public)return{flow:f,owner:Boolean(r.cookies.hive_session&&await auth.session(r.cookies.hive_session).then(w=>w===f.wallet).catch(()=>false))};
  return{flow:await ownFlow(r,id),owner:true};
 }
 const publicEvent=(e:any)=>({seq:e.seq.toString(),workflowId:e.workflowId,type:e.type,createdAt:e.createdAt,data:Object.fromEntries(Object.entries((e.data&&typeof e.data==='object'?e.data:{}) as Record<string,unknown>).filter(([key])=>['taskId','verificationId','stage','kind','releaseId','deadlineAt'].includes(key)))});
 const publicTask=(task:any)=>{
  const {instructions,policy,...safe}=task;
  return{...safe,attempts:(safe.attempts??[]).map((attempt:any)=>({...attempt,verification:attempt.verification?{...attempt.verification,checks:Array.isArray(attempt.verification.checks)?attempt.verification.checks.map((check:any)=>({name:String(check?.name??'check'),passed:Boolean(check?.passed)})):[]}:null}))};
 };
 const jobMissing=[...missing(c,[...paymentRequired,...deliveryRequired,'AI_API_KEY']),...missingModels(c)];
 async function verifyHuman(token:string|undefined,ip:string){
  if(!c.TURNSTILE_SECRET_KEY)return;
  if(!token)throw new Fault(400,'human_verification_required');
  let response:Response;
  try{response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:c.TURNSTILE_SECRET_KEY,response:token,remoteip:ip}),signal:AbortSignal.timeout(10000)});}catch{throw new Fault(503,'human_verification_unavailable');}
  if(!response.ok)throw new Fault(503,'human_verification_unavailable');
  const result=await response.json() as any;
  if(!result.success||result.action!=='quote'||result.hostname!==new URL(c.PUBLIC_ORIGIN).hostname)throw new Fault(403,'human_verification_failed');
 }
 app.get('/health',async()=>({status:'ok'}));
 app.get('/ready',async()=>{
  await db.$queryRaw`SELECT 1`;
  const redis=new Redis(c.REDIS_URL,{lazyConnect:true,connectTimeout:3000,maxRetriesPerRequest:0,enableOfflineQueue:false});
  try{await redis.connect();await redis.ping();}finally{redis.disconnect();}
  return{status:'ready',dependencies:{postgres:'ok',redis:'ok'}};
 });
 app.get('/api/capabilities',async()=>({
  cluster:c.SOLANA_CLUSTER,hosted:true,
  mint:{enabled:!missing(c,mintRequired).length,missing:missing(c,mintRequired)},
  jobs:{enabled:!jobMissing.length&&c.EXECUTION_ENABLED==='true',missing:jobMissing,execution:c.EXECUTION_ENABLED==='true'},
  skills:Object.keys(skills).filter(s=>s!=='rust'||!!c.RUST_SANDBOX_IMAGE),tokenMint:c.HMD_MINT??null,quality:{reviewQuorum:c.REVIEW_QUORUM,repairPasses:c.AGENT_REPAIR_PASSES},
  delivery:{site:c.NETLIFY_SITE_ID??null,githubOwner:c.GITHUB_ALLOWED_OWNER??null,programConfigured:c.SOLANA_RELEASES_ENABLED==='true'&&Boolean(c.DEPLOY_PROGRAM_SEED&&c.SOLANA_BUILD_IMAGE)},
  holderDistributions:{enabled:c.HOLDER_DISTRIBUTIONS_ENABLED==='true',intervalHours:c.HOLDER_DISTRIBUTION_INTERVAL_HOURS},
  security:{turnstileSiteKey:c.TURNSTILE_SITE_KEY??null}
 }));
 app.get('/api/token',async()=>{if(!c.HMD_MINT||!chain.tokenInfo)throw new Fault(503,'integration_not_configured');return chain.tokenInfo();});
 app.post('/api/auth/challenge',{config:{rateLimit:{max:10,timeWindow:'1 minute'}}},async r=>{
  const {wallet}=z.object({wallet:keySchema}).strict().parse(r.body);
  try{new PublicKey(wallet);}catch{throw new Fault(400,'invalid_wallet');}
  return auth.challenge(wallet);
 });
 app.post('/api/auth/verify',async(r,reply)=>{
  const b=z.object({id:uuid,wallet:keySchema,signature:z.string().max(100)}).strict().parse(r.body);
  const s=await auth.verify(b.id,b.wallet,b.signature);
  reply.setCookie('hive_session',s.token,{httpOnly:true,secure:c.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:86400});
  return{wallet:s.wallet,csrf:s.csrf};
 });
 app.get('/api/auth/me',async r=>({wallet:await wallet(r)}));
 app.post('/api/auth/logout',async(r,reply)=>{
  await wallet(r);await db.session.update({where:{tokenHash:digest(r.cookies.hive_session!)},data:{revokedAt:new Date()}});
  reply.clearCookie('hive_session',{path:'/'});return{ok:true};
 });
 app.get('/api/seats/mine',async r=>{const w=await wallet(r);return db.seat.findMany({where:{ownerWallet:w},select:{id:true,mint:true,checkedAt:true}});});
 app.get('/api/mint/config',async()=>({enabled:!missing(c,mintRequired).length,amount:c.HMD_BURN_AMOUNT??null,displayAmount:'8888',token:'HMD',tokenMint:c.HMD_MINT??null,cluster:c.SOLANA_CLUSTER,supply:888,perWallet:c.MAX_SEATS_PER_WALLET??null,sponsored:false,mode:c.PAYMENT_MODE}));
 app.get('/api/mint/availability',async()=>{
  const [seats,reservations]=await Promise.all([
   db.seat.findMany({where:{mint:null},orderBy:{id:'asc'},select:{id:true}}),
   db.mintRequest.findMany({where:{state:{in:['QUOTED','PREPARED','SUBMITTED']},OR:[{expiresAt:{gt:new Date()}},{state:{in:['PREPARED','SUBMITTED']}}]},select:{seatId:true}})
  ]);
  const reserved=new Set(reservations.map(row=>row.seatId)),available=seats.map(row=>row.id).filter(id=>!reserved.has(id));
  return{next:available[0]??null,remaining:available.length,available:available.slice(0,50)};
 });
 app.post('/api/mint/quote',async r=>{const b=z.object({requestKey:uuid,seatId:z.number().int().min(1).max(888)}).strict().parse(r.body);return payments.mintQuote(await wallet(r),b.requestKey,b.seatId);});
 app.post('/api/mint/prepare',async r=>{const b=z.object({id:uuid}).strict().parse(r.body);return payments.prepareMint(await wallet(r),b.id);});
 app.post('/api/mint/confirm',async r=>{const b=z.object({id:uuid,transaction:z.string().max(16000)}).strict().parse(r.body);return payments.broadcast(await wallet(r),'mint:'+b.id,b.transaction);});
 app.get('/api/mint/requests/:id',async r=>{const w=await wallet(r),row=await db.mintRequest.findUnique({where:{id:idOf(r)}});if(!row||row.wallet!==w)throw new Fault(404,'not_found');return row;});
 app.post('/api/requests/quote',{config:{rateLimit:{max:3,timeWindow:'1 minute'}}},async r=>{
  const w=await wallet(r);
  payments.require(paymentRequired);
  const unavailable=[...missing(c,deliveryRequired),...missingModels(c)];
  if(!c.AI_API_KEY||unavailable.length)throw new Fault(503,'integration_not_configured','Required build or delivery settings are missing',{fields:[...(!c.AI_API_KEY?['AI_API_KEY']:[]),...unavailable]});
  if(c.EXECUTION_ENABLED!=='true')throw new Fault(503,'execution_not_configured');
  const b=z.object({requestKey:uuid,prompt:z.string().min(12).max(8000),public:z.boolean().default(false),mode:z.enum(['BUILD','SOLANA_APP']).default('BUILD'),plan:planSchema.optional(),turnstileToken:z.string().min(1).max(2048).optional()}).strict().parse(r.body);
  const old=await db.workflow.findUnique({where:{wallet_requestKey:{wallet:w,requestKey:b.requestKey}}});
  if(old){if(old.prompt!==b.prompt||old.public!==b.public||old.mode!==b.mode)throw new Fault(409,'request_key_conflict');return old;}
  await verifyHuman(b.turnstileToken,r.ip);
  if(b.mode==='SOLANA_APP'&&(c.SOLANA_RELEASES_ENABLED!=='true'||!c.SOLANA_BUILD_IMAGE||!c.DEPLOY_PROGRAM_SEED||!c.SIGNER_KEYPAIR_PATH||!c.NETLIFY_SITE_ID||!c.NETLIFY_TOKEN))throw new Fault(503,'solana_release_not_configured');
  const deploymentTarget=b.mode==='SOLANA_APP'?deploymentAddress(c,w+':'+b.requestKey):undefined;
  const planned=b.plan??await plan(model,b.prompt,b.mode,deploymentTarget);
  const workers=await db.worker.findMany({where:{status:{in:['ONLINE','BUSY']},heartbeatAt:{gt:new Date(Date.now()-45000)},expiresAt:{gt:new Date()}}});
  for(const task of planned.tasks){
   if(task.skill==='rust'&&!c.RUST_SANDBOX_IMAGE)throw new Fault(422,'rust_execution_not_configured');
   const capable=workers.filter(w=>skills[task.skill].requiredSkills.every(s=>w.capabilities.includes(s)));
   if(new Set(capable.map(w=>w.wallet)).size<c.REVIEW_QUORUM+1||new Set(capable.map(w=>w.seatId)).size<c.REVIEW_QUORUM+1)throw new Fault(422,'independent_capacity_unavailable',(c.REVIEW_QUORUM+1)+' independent hosted agents are needed for '+task.skill);
  }
  return engine.create(w,b.requestKey,b.prompt,planned,b.public,c.HMD_JOB_AMOUNT!,Number(c.BUILDER_BPS),Number(c.VERIFIER_BPS),c.TREASURY_WALLET!,c.JOB_DEADLINE_HOURS!,b.mode,deploymentTarget);
 });
 app.post('/api/requests/:id/prepare-payment',async r=>payments.prepare(await wallet(r),idOf(r)));
 app.post('/api/requests/:id/submit',async r=>{const b=z.object({transaction:z.string().max(16000)}).strict().parse(r.body);return payments.broadcast(await wallet(r),'fund:'+idOf(r),b.transaction);});
 app.post('/api/workflows/:id/prepare-expired-refund',async r=>payments.prepareExpiredRefund(await wallet(r),idOf(r)));
 app.post('/api/workflows/:id/submit-expired-refund',async r=>{const b=z.object({transaction:z.string().max(16000)}).strict().parse(r.body);return payments.broadcast(await wallet(r),'refund-expired:'+idOf(r),b.transaction);});
 app.get('/api/requests/:id',async r=>ownFlow(r));
 app.get('/api/workflows',async r=>{
  const w=await wallet(r);return db.workflow.findMany({where:{wallet:w},orderBy:{createdAt:'desc'},take:50,select:{id:true,title:true,status:true,failure:true,createdAt:true,amount:true}});
 });
 app.get('/api/workflows/:id',async r=>{
  const {flow:f,owner}=await readableFlow(r);
  const tasks=await db.task.findMany({where:{workflowId:f.id},select:{id:true,key:true,title:true,state:true,buildCount:true,acceptedArtifact:true}});
  const releases=await db.release.findMany({where:{workflowId:f.id},select:{id:true,kind:true,state:true,url:true,artifactHash:true,createdAt:true}});
  if(owner)return{...f,tasks,releases};
  return{id:f.id,title:f.title,status:f.status,mode:f.mode,stage:f.stage,public:true,failure:f.failure,createdAt:f.createdAt,updatedAt:f.updatedAt,deadlineAt:f.deadlineAt,tasks,releases};
 });
 app.get('/api/workflows/:id/tasks',async r=>{
  const {flow,owner}=await readableFlow(r);
  const tasks=await db.task.findMany({where:{workflowId:flow.id},orderBy:{key:'asc'},select:{
   id:true,key:true,title:true,skill:true,state:true,buildCount:true,acceptedArtifact:true,
   instructions:true,policy:true,
   attempts:{orderBy:{startedAt:'asc'},select:{id:true,kind:true,state:true,seatId:true,ownerWallet:true,startedAt:true,finishedAt:true,submissionHash:true,verification:{select:{id:true,artifactHash:true,decision:true,state:true,checks:true,createdAt:true}}}}
  }});
  return owner?tasks:tasks.map(publicTask);
 });
 app.post('/api/workflows/:id/cancel',async r=>{await engine.cancel(await wallet(r),idOf(r));return{ok:true};});
 app.get('/api/workflows/:id/events',async r=>{
  const {flow:f,owner}=await readableFlow(r),after=z.coerce.bigint().nonnegative().parse((r.query as any).after??0);
  const events=await db.event.findMany({where:{workflowId:f.id,seq:{gt:after}},orderBy:{seq:'asc'},take:100});
  return events.map(e=>owner?{...e,seq:e.seq.toString()}:publicEvent(e));
 });
 app.get('/api/workflows/:id/events/stream',async(r,reply)=>{
  const {flow:f,owner}=await readableFlow(r),after=z.coerce.bigint().nonnegative().parse(r.headers['last-event-id']??0);
  reply.hijack();reply.raw.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store','connection':'keep-alive','x-accel-buffering':'no'});
  let cursor=after,busy=false,closed=false;
  const tick=async()=>{
   if(busy||closed)return;busy=true;
   try{
    if(owner)await wallet(r);
    for(const e of await db.event.findMany({where:{workflowId:f.id,seq:{gt:cursor}},orderBy:{seq:'asc'},take:100})){
     cursor=e.seq;
     const payload=owner?{type:e.type,data:e.data,time:e.createdAt}:publicEvent(e);
     if(!reply.raw.write('id: '+e.seq+'\ndata: '+JSON.stringify(payload)+'\n\n')){reply.raw.end();break;}
    }
    if(!reply.raw.writableEnded)reply.raw.write(': heartbeat\n\n');
   }catch{reply.raw.end();}finally{busy=false;}
  };
  const timer=setInterval(tick,2000);reply.raw.on('close',()=>{closed=true;clearInterval(timer);});await tick();
 });
 app.post('/api/workers/register',async r=>{
  const b=z.object({seatId:z.number().int().min(1).max(888),deviceKey:keySchema,name:z.string().min(1).max(80),capabilities:z.array(z.enum(['typescript','html','rust'])).min(1).max(3),maxConcurrent:z.number().int().min(1).max(4).default(1),public:z.boolean().default(false)}).strict().parse(r.body);
  return engine.enroll(await wallet(r),b);
 });
 app.post('/api/workers/heartbeat',async r=>{const w=await device(r);await engine.requireOwned(w);await db.worker.update({where:{id:w.id},data:{heartbeatAt:new Date(),status:'ONLINE'}});return{ok:true};});
 app.post('/api/workers/revoke',async r=>{
  const w=await wallet(r),b=z.object({id:uuid}).strict().parse(r.body);
  await db.worker.updateMany({where:{id:b.id,wallet:w},data:{status:'SUSPENDED',generation:{increment:1}}});return{ok:true};
 });
 app.get('/api/workers',async()=>{
  const rows=await db.worker.findMany({where:{public:true},orderBy:{heartbeatAt:'desc'},take:1000,select:{id:true,wallet:true,seatId:true,name:true,capabilities:true,status:true,heartbeatAt:true,buildAccepted:true,buildRejected:true,verifyAccepted:true,verifyRejected:true,timeouts:true}});
  return rows.map(w=>({...w,status:w.status==='SUSPENDED'?'SUSPENDED':w.heartbeatAt.getTime()<Date.now()-45000?'OFFLINE':w.status}));
 });
 app.get('/api/workers/:id',async r=>{
  const w=await db.worker.findFirst({where:{id:idOf(r),public:true},select:{id:true,wallet:true,seatId:true,name:true,capabilities:true,status:true,heartbeatAt:true,buildAccepted:true,buildRejected:true,verifyAccepted:true,verifyRejected:true,timeouts:true}});
  if(!w)throw new Fault(404,'not_found');
  return{...w,status:w.status==='SUSPENDED'?'SUSPENDED':w.heartbeatAt.getTime()<Date.now()-45000?'OFFLINE':w.status,acceptedAssignments:w.buildAccepted+w.verifyAccepted};
 });
 app.post('/api/worker/claim',async r=>{const b=z.object({kind:z.enum(['BUILD','VERIFY'])}).strict().parse(r.body);return{assignment:await engine.claim(await device(r),b.kind)};});
 app.post('/api/worker/attempts/:id/renew',async r=>{const b=z.object({generation:z.number().int()}).strict().parse(r.body);const a=await engine.renew(await device(r),idOf(r),b.generation);return{leaseUntil:a.leaseUntil};});
 app.post('/api/worker/attempts/:id/submit',async r=>{
  const b=z.object({generation:z.number().int(),bundle:bundleSchema}).strict().parse(r.body);
  return engine.submit(await device(r),idOf(r),b.generation,b.bundle);
 });
 app.post('/api/worker/attempts/:id/review',async r=>{
  const b=z.object({generation:z.number().int(),artifactHash:z.string().regex(/^[a-f0-9]{64}$/),decision:z.enum(['ACCEPT','REJECT']),checks:z.array(z.object({name:z.string().max(100),passed:z.boolean(),evidence:z.string().max(4000)}).strict()).min(1).max(30),issues:z.array(z.string().max(2000)).max(30)}).strict().parse(r.body);
  const{generation,...review}=b;return engine.review(await device(r),idOf(r),generation,review);
 });
 app.get('/api/artifacts/:id',async r=>{
  const a=await db.artifact.findUnique({where:{id:idOf(r)},include:{workflow:true}});
  if(!a)throw new Fault(404,'not_found');
  if(r.headers.authorization){
   const w=await device(r);
   const assignments=await db.attempt.findMany({where:{workerId:w.id,state:{in:['CLAIMED','RUNNING']},leaseUntil:{gt:new Date()}},include:{task:{include:{dependencies:true}}}});
   if(!assignments.some(x=>x.task.workflowId===a.workflowId&&(x.taskId===a.taskId||x.task.dependencies.some(d=>d.parentId===a.taskId))))throw new Fault(404,'not_found');
  }else if(!r.cookies.hive_session&&a.workflow.public&&a.accepted){
   return{id:a.id,workflowId:a.workflowId,taskId:a.taskId,hash:a.hash,bytes:a.bytes,accepted:true,createdAt:a.createdAt};
  }else if(await wallet(r)!==a.workflow.wallet||a.workflow.status!=='COMPLETED')throw new Fault(404,'not_found');
  const assembled=(r.query as any).assembled==='1';
  if(assembled&&!a.accepted)throw new Fault(409,'artifact_not_accepted');
  const bundle=assembled?await assemble(db,store,a.taskId):await store.get(a.objectKey,a.hash);
  return{hash:assembled?hash(bundle):a.hash,submissionHash:a.hash,bundle};
 });
 app.get('/api/tasks/:id',async r=>{
  const t=await db.task.findUnique({where:{id:idOf(r)},include:{workflow:true,attempts:{orderBy:{startedAt:'asc'},select:{id:true,kind:true,state:true,seatId:true,ownerWallet:true,startedAt:true,finishedAt:true,submissionHash:true,verification:{select:{id:true,artifactHash:true,decision:true,state:true,checks:true,createdAt:true}}}}}});
  if(!t)throw new Fault(404,'not_found');
  const owner=t.workflow.public?Boolean(r.cookies.hive_session&&await auth.session(r.cookies.hive_session).then(w=>w===t.workflow.wallet).catch(()=>false)):await wallet(r).then(w=>w===t.workflow.wallet);
  if(!t.workflow.public&&!owner)throw new Fault(404,'not_found');
  const {workflow,...task}=t;
  if(owner)return task;
  return publicTask(task);
 });
 app.get('/api/network/snapshot',async()=>{
  const [workers,flows,reviews,events,releases]=await Promise.all([
   db.worker.findMany({where:{public:true},orderBy:{heartbeatAt:'desc'},take:5000}),
   db.workflow.findMany({where:{public:true},orderBy:{updatedAt:'desc'},take:5000}),
   db.verification.findMany({where:{state:{in:['ACCEPTED','REJECTED']},attempt:{task:{workflow:{public:true}}}},include:{attempt:{include:{task:true}}},orderBy:{createdAt:'desc'},take:5000}),
   db.event.findMany({where:{workflow:{public:true}},orderBy:{seq:'desc'},take:5000}),
   db.release.findMany({where:{workflow:{public:true},state:'COMPLETED'},orderBy:{createdAt:'desc'},take:5000})
  ]);
  return{
   agents:workers.map(w=>({id:w.id,nftId:w.seatId,name:w.name,wallet:w.wallet,status:w.status==='SUSPENDED'?'suspended':w.heartbeatAt.getTime()<Date.now()-45000?'offline':w.status==='BUSY'?'working':'online'})),
   jobs:flows.map(f=>({id:f.id,title:f.title,status:f.status.toLowerCase(),updatedAt:f.updatedAt.toISOString()})),
   reviews:reviews.map(v=>({id:v.id,jobId:v.attempt.task.workflowId,nftId:v.attempt.seatId,status:v.state.toLowerCase(),summary:v.state==='ACCEPTED'?'Required checks passed':'Changes requested'})),
   activity:events.map(e=>({id:e.seq.toString(),jobId:e.workflowId,time:e.createdAt.toISOString(),type:e.type,message:e.type.replaceAll('.',' ')})),
   artifacts:releases.filter(r=>r.url?.startsWith('https://')).map(r=>({id:r.id,jobId:r.workflowId,kind:r.kind,title:r.kind+' delivery',url:r.url!}))
  };
 });
 app.get('/api/holder-distributions',async()=>{
  const rows=await db.holderDistribution.findMany({orderBy:{createdAt:'desc'},take:100,select:{id:true,status:true,collection:true,snapshotSlot:true,snapshotHash:true,totalAmount:true,eligibleSeats:true,excludedSeats:true,cutoffAt:true,createdAt:true,completedAt:true,_count:{select:{entries:true,rewards:true}}}});
  return rows.map(row=>({...row,snapshotSlot:row.snapshotSlot.toString()}));
 });
 app.get('/api/holder-distributions/:id',async r=>{
  const row=await db.holderDistribution.findUnique({where:{id:idOf(r)},include:{entries:{orderBy:{wallet:'asc'},select:{wallet:true,assetIds:true,amount:true,state:true,signature:true}},rewards:{select:{workflowId:true,amount:true}}}});
  if(!row)throw new Fault(404,'not_found');
  return{...row,snapshotSlot:row.snapshotSlot.toString()};
 });
 app.get('/api/rewards',async r=>db.reward.findMany({where:{beneficiary:await wallet(r)},orderBy:{id:'desc'},take:100}));
 deliveryRoutes(app,db,c,store,wallet,taskId=>assemble(db,store,taskId),engine);
 if(opts.serveStatic!==false)app.register(staticFiles,{root:resolve('site'),wildcard:false});
 return{app,engine,payments,auth,wallet,ownFlow};
}
