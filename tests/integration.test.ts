import {describe,it,expect,beforeAll,beforeEach,afterAll} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {Keypair} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {randomUUID} from 'node:crypto';
import {Engine} from '../packages/orchestrator/engine.js';
import {Payments} from '../packages/payments/requests.js';
import {buildServer} from '../apps/api/server.js';
import {LocalArtifacts} from '../packages/artifacts/local.js';
import {config} from '../packages/shared/config.js';
import {digest,hash,Fault} from '../packages/shared/domain.js';
import type {Chain} from '../packages/solana/chain.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const enabled=process.env.TEST_DATABASE_URL;
describe.skipIf(!enabled)('PostgreSQL API and orchestration integration (chain/model are explicit test doubles)',()=>{
 const db=new PrismaClient({datasourceUrl:enabled});
 const c=config({NODE_ENV:'test',DATABASE_URL:enabled,REDIS_URL:process.env.REDIS_URL??'redis://localhost:6381',PUBLIC_ORIGIN:'http://localhost:4320',REVIEW_QUORUM:'1'});
 let path:string,store:LocalArtifacts,engine:Engine,server:ReturnType<typeof buildServer>;
 const actor=Keypair.generate(),other=Keypair.generate(),wallet=actor.publicKey.toBase58();
 const second=other.publicKey.toBase58(),sessionTokens:string[]=[];
 let revoked=false;
 const chain:Chain={
  async ownership(w,m){if(revoked)throw new Fault(403,'seat_not_owned');return{wallet:w,mint:m,slot:1};},
  async prepareFund(){throw Error('unused test transport');},async funded(){return true;},
  async prepareMint(){throw Error('unused test transport');},async minted(){return null;},
  async finalized(){return true;},async broadcast(){throw Error('unused test transport');},async settle(){throw Error('unused test transport');}
 };
 const model={async json(){throw Error('AI is deliberately not mocked as real execution');}};
 const plan={title:'Private test project',tasks:[{key:'build',title:'Build',instructions:'Build an accessible page',skill:'static',dependencies:[],paths:['index.html'],acceptance:['Contains a functional HTML page']}]};
 let builder:any,verifier:any,flowId:string,attempt:any;
 const admit=async(e:Engine,id:string,signature='TEST_ONLY_'+randomUUID())=>{await db.workflow.update({where:{id},data:{deadlineAt:new Date(Date.now()+24*3600000)}});return e.admit(id,signature);};
 beforeAll(async()=>{
  path=await mkdtemp(join(tmpdir(),'hive-test-'));store=new LocalArtifacts(path);
  engine=new Engine(db,chain,store,c);server=buildServer({db,c,chain,store,model,serveStatic:false,logger:false});
  await db.wallet.createMany({data:[{address:wallet},{address:second}]});
  // Use isolated test database, never a production database.
  for(const id of [887,888])await db.seat.upsert({where:{id},create:{id,imageHash:'fixture',mint:Keypair.generate().publicKey.toBase58()},update:{mint:Keypair.generate().publicKey.toBase58()}});
  const a=await engine.enroll(wallet,{seatId:887,deviceKey:Keypair.generate().publicKey.toBase58(),name:'Test builder',capabilities:['html'],maxConcurrent:1,public:false});
  const b=await engine.enroll(second,{seatId:888,deviceKey:Keypair.generate().publicKey.toBase58(),name:'Test verifier',capabilities:['html'],maxConcurrent:1,public:false});
  builder=await db.worker.findUniqueOrThrow({where:{id:a.id}});verifier=await db.worker.findUniqueOrThrow({where:{id:b.id}});
 });
 beforeEach(async()=>{
  if(!builder||!verifier)return;
  await db.worker.updateMany({where:{id:{in:[builder.id,verifier.id]}},data:{status:'ONLINE',heartbeatAt:new Date()}});
 });
 afterAll(async()=>{
  await server?.app.close();await db.$disconnect();
  if(path&&path.startsWith(join(tmpdir(),'hive-test-')))await rm(path,{recursive:true});
 });
 it('reports ready only after PostgreSQL and Redis respond',async()=>{
  const response=await server.app.inject('/ready');expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({status:'ready',dependencies:{postgres:'ok',redis:'ok'}});
 });
 it('reports unminted and unreserved random NFT availability',async()=>{
  await db.seat.createMany({data:[{id:1,imageHash:'availability-1'},{id:2,imageHash:'availability-2'}]});
  const initial=(await server.app.inject('/api/mint/availability')).json();
  expect(initial.available).toBe(true);expect(initial.remaining).toBe(2);
  const reservation=await db.mintRequest.create({data:{wallet,requestKey:randomUUID(),inputHash:'availability-test',seatId:1,amount:'8888',expiresAt:new Date(Date.now()+60000)}});
  const reserved=(await server.app.inject('/api/mint/availability')).json();
  expect(reserved.available).toBe(true);expect(reserved.remaining).toBe(1);
 await db.mintRequest.delete({where:{id:reservation.id}});
 await db.seat.deleteMany({where:{id:{in:[1,2]}}});
 });
 it('randomly assigns distinct remaining seats and keeps request retries idempotent',async()=>{
  await db.seat.createMany({data:[{id:4,imageHash:'random-4'},{id:5,imageHash:'random-5'}]});
  const mintConfig=config({NODE_ENV:'test',PAYMENT_MODE:'custodial',HMD_MINT:Keypair.generate().publicKey.toBase58(),HMD_BURN_AMOUNT:'8888',SEAT_COLLECTION_ADDRESS:Keypair.generate().publicKey.toBase58(),MINT_BASE_URI:'https://arweave.net/test',MAX_SEATS_PER_WALLET:'2',GAS_POLICY:'user-pays',CUSTODY_KEYPAIR_PATH:'test-only'});
  const mintChain={...chain,async tokenInfo(){return{mint:mintConfig.HMD_MINT!,decimals:0};}},payments=new Payments(db,mintChain,engine,mintConfig);
  const firstKey=randomUUID(),[first,secondMint]=await Promise.all([payments.mintQuote(wallet,firstKey),payments.mintQuote(second,randomUUID())]);
  expect([4,5]).toContain(first.seatId);expect([4,5]).toContain(secondMint.seatId);expect(first.seatId).not.toBe(secondMint.seatId);
  expect((await payments.mintQuote(wallet,firstKey)).id).toBe(first.id);
  await db.mintRequest.deleteMany({where:{id:{in:[first.id,secondMint.id]}}});
  await db.seat.deleteMany({where:{id:{in:[4,5]}}});
 });
 it('enforces the two-seat limit in the serializable backend reservation layer',async()=>{
  await db.seat.create({data:{id:3,imageHash:'wallet-cap-3'}});
  const first=await db.mintRequest.create({data:{wallet,requestKey:randomUUID(),inputHash:'cap-1',seatId:887,amount:'8888',state:'MINTED',expiresAt:new Date(Date.now()+60000)}});
  const secondMint=await db.mintRequest.create({data:{wallet,requestKey:randomUUID(),inputHash:'cap-2',seatId:888,amount:'8888',state:'MINTED',expiresAt:new Date(Date.now()+60000)}});
  const mintConfig=config({NODE_ENV:'test',PAYMENT_MODE:'custodial',HMD_MINT:Keypair.generate().publicKey.toBase58(),HMD_BURN_AMOUNT:'8888',SEAT_COLLECTION_ADDRESS:Keypair.generate().publicKey.toBase58(),MINT_BASE_URI:'https://arweave.net/test',MAX_SEATS_PER_WALLET:'2',GAS_POLICY:'user-pays',CUSTODY_KEYPAIR_PATH:'test-only'});
  const mintChain={...chain,async tokenInfo(){return{mint:mintConfig.HMD_MINT!,decimals:0};}};
  await expect(new Payments(db,mintChain,engine,mintConfig).mintQuote(wallet,randomUUID())).rejects.toThrow('wallet_mint_limit');
  await db.mintRequest.deleteMany({where:{id:{in:[first.id,secondMint.id]}}});await db.seat.delete({where:{id:3}});
 });
 it('authenticates real ed25519 signatures and rejects replay and CSRF',async()=>{
  const ch=await server.app.inject({method:'POST',url:'/api/auth/challenge',payload:{wallet}});
  const body=ch.json();
  expect(body.message).toContain('\nChain ID: devnet\n');
  expect(body.message).not.toContain('\nChain:');
  expect(body.message.match(/\nNonce: ([A-Za-z0-9]+)\n/)?.[1]).toHaveLength(32);
  const signature=bs58.encode(nacl.sign.detached(Buffer.from(body.message),actor.secretKey));
  const auth=await server.app.inject({method:'POST',url:'/api/auth/verify',payload:{id:body.id,wallet,signature}});
  expect(auth.statusCode).toBe(200);
  const replay=await server.app.inject({method:'POST',url:'/api/auth/verify',payload:{id:body.id,wallet,signature}});
  expect(replay.statusCode).toBe(401);
  const cookie=String(auth.headers['set-cookie']).split(';')[0];sessionTokens.push(cookie);
  const out=await server.app.inject({method:'POST',url:'/api/auth/logout',headers:{cookie},payload:{}});
  expect(out.statusCode).toBe(403);
  const evil=await server.app.inject({method:'POST',url:'/api/auth/challenge',headers:{origin:'https://evil.invalid'},payload:{wallet}});
  expect(evil.statusCode).toBe(403);
 });
 it('requires a live collection NFT before a customer can request a build',async()=>{
  const customer=Keypair.generate(),address=customer.publicKey.toBase58(),collection=Keypair.generate().publicKey.toBase58();
  const gated=buildServer({db,c:config({NODE_ENV:'test',DATABASE_URL:enabled,REDIS_URL:process.env.REDIS_URL??'redis://localhost:6381',PUBLIC_ORIGIN:'http://localhost:4320',SEAT_COLLECTION_ADDRESS:collection}),chain,store,model,holderSource:{async snapshot(){return{slot:1n,assets:[]};}},serveStatic:false,logger:false});
  const challenge=(await gated.app.inject({method:'POST',url:'/api/auth/challenge',payload:{wallet:address}})).json();
  const signature=bs58.encode(nacl.sign.detached(Buffer.from(challenge.message),customer.secretKey));
  const signed=await gated.app.inject({method:'POST',url:'/api/auth/verify',payload:{id:challenge.id,wallet:address,signature}}),session=signed.json(),cookie=String(signed.headers['set-cookie']).split(';')[0];
  const response=await gated.app.inject({method:'POST',url:'/api/requests/quote',headers:{cookie,'x-csrf-token':session.csrf},payload:{requestKey:randomUUID(),prompt:'Build a complete responsive application',public:false,mode:'BUILD'}});
  expect(response.statusCode).toBe(403);expect(response.json().error).toBe('nft_required');
  await gated.app.close();
 });
 it('creates one workflow per idempotency key and rejects changed input',async()=>{
  const pricing={marketAmountBaseUnits:'2000',expiresAt:'2099-01-01T00:00:00.000Z'} as any;
  const key=randomUUID(),a=await engine.create(wallet,key,'Build a private page',plan,false,'1000',8000,2000,wallet,24,'BUILD',undefined,pricing);
  const b=await engine.create(wallet,key,'Build a private page',plan,false,'1000',8000,2000,wallet,24,'BUILD',undefined,pricing);
  expect(a.id).toBe(b.id);flowId=a.id;
  await expect(engine.create(wallet,key,'Changed private page',plan,false,'1000',8000,2000,wallet,24,'BUILD',undefined,pricing)).rejects.toThrow('request_key_conflict');
 });
 it('does not schedule unfunded work',async()=>expect(await engine.claim(builder,'BUILD')).toBeNull());
 it('runs build and independent review through hosted agents without NFT seats',async()=>{
  await db.worker.updateMany({where:{id:{in:[builder.id,verifier.id]}},data:{status:'SUSPENDED'}});
  const hosted=[];
  for(const index of [1,2])hosted.push(await db.worker.create({data:{wallet,seatId:null,hosted:true,deviceKey:Keypair.generate().publicKey.toBase58(),name:'Hosted integration '+index,capabilities:['html'],maxConcurrent:1,status:'ONLINE',tokenHash:digest(randomUUID()),expiresAt:new Date('2100-01-01'),heartbeatAt:new Date()}}));
  const pricing={marketAmountBaseUnits:'2000',expiresAt:'2099-01-01T00:00:00.000Z'} as any;
  const flow=await engine.create(wallet,randomUUID(),'Run entirely on hosted agents',plan,false,'1000',8000,2000,wallet,24,'BUILD',undefined,pricing);
  await admit(engine,flow.id);
  const build=await engine.claim(hosted[0],'BUILD');expect(build).toBeTruthy();
  await engine.submit(hosted[0],build!.attempt.id,build!.attempt.generation,{files:[{path:'index.html',content:'<html><body>Hosted</body></html>'}]});
  const assignment=await engine.claim(hosted[1],'VERIFY');expect(assignment).toBeTruthy();
  const review=await engine.review(hosted[1],assignment!.attempt.id,assignment!.attempt.generation,{artifactHash:assignment!.submission!.hash,decision:'ACCEPT',checks:[{name:'hosted',passed:true,evidence:'fixture'}],issues:[]});
  await engine.resolve(review.id,true,{exitCode:0});
  expect((await db.task.findUniqueOrThrow({where:{id:build!.task.id}})).state).toBe('ACCEPTED');
  await db.workflow.update({where:{id:flow.id},data:{status:'CANCELLED'}});
  await db.worker.updateMany({where:{id:{in:hosted.map(item=>item.id)}},data:{status:'SUSPENDED'}});
 });
 it('atomically admits payment and prevents simultaneous duplicate claims',async()=>{
  await admit(engine,flowId);
  const results=await Promise.all([engine.claim(builder,'BUILD'),engine.claim(verifier,'BUILD')]);
  expect(results.filter(Boolean)).toHaveLength(1);
  attempt=results.find(Boolean)!;
  if(attempt.attempt.workerId===verifier.id)[builder,verifier]=[verifier,builder];
 });
 it('rejects stale generation and commits immutable submission',async()=>{
  const bundle={files:[{path:'index.html',content:'<html><body>Hello</body></html>'}]};
  await expect(engine.submit(builder,attempt.attempt.id,attempt.attempt.generation+1,bundle)).rejects.toThrow('stale_lease');
  const a=await engine.submit(builder,attempt.attempt.id,attempt.attempt.generation,bundle);
  const b=await engine.submit(builder,attempt.attempt.id,attempt.attempt.generation,bundle);
  expect(a.id).toBe(b.id);
  await expect(engine.submit(builder,attempt.attempt.id,attempt.attempt.generation,{files:[{path:'index.html',content:'Changed'}]})).rejects.toThrow('submission_conflict');
 });
 it('prevents self-review and does not trust verifier acceptance alone',async()=>{
  expect(await engine.claim(builder,'VERIFY')).toBeNull();
  const review=await engine.claim(verifier,'VERIFY');expect(review).toBeTruthy();
  const v=await engine.review(verifier,review!.attempt.id,review!.attempt.generation,{artifactHash:review!.submission!.hash,decision:'ACCEPT',checks:[{name:'test',passed:true,evidence:'test fixture'}],issues:[]});
  expect((await db.task.findUniqueOrThrow({where:{id:attempt.task.id}})).state).toBe('VERIFYING');
  await engine.resolve(v.id,false,{exitCode:1});
  expect((await db.task.findUniqueOrThrow({where:{id:attempt.task.id}})).state).toBe('QUEUED');
  expect((await db.attempt.findUniqueOrThrow({where:{id:attempt.attempt.id}})).feedback).toMatchObject({trustedEvidence:{exitCode:1}});
 });
 it('reclaims expired leases and rejects late results',async()=>{
  const job=await engine.claim(builder,'BUILD');expect(job).toBeTruthy();
  await db.attempt.update({where:{id:job!.attempt.id},data:{leaseUntil:new Date(0)}});
  await engine.recover();
  await expect(engine.renew(builder,job!.attempt.id,job!.attempt.generation)).rejects.toThrow('stale_lease');
  expect((await db.task.findUniqueOrThrow({where:{id:attempt.task.id}})).state).toBe('QUEUED');
 });
 it('sends a final semantic defect back to the integration task for repair',async()=>{
  const pricing={marketAmountBaseUnits:'2000',expiresAt:'2099-01-01T00:00:00.000Z'} as any;
  const flow=await engine.create(wallet,randomUUID(),'Repair a final semantic defect',plan,false,'1000',8000,2000,wallet,24,'BUILD',undefined,pricing);
  const task=await db.task.findFirstOrThrow({where:{workflowId:flow.id}}),bundle={files:[{path:'index.html',content:'<html><button>Overflow</button></html>'}]},stored=await store.put(bundle);
  const build=await db.attempt.create({data:{taskId:task.id,workerId:builder.id,ownerWallet:builder.wallet,seatId:builder.seatId,kind:'BUILD',generation:1,state:'SUBMITTED',leaseUntil:new Date(Date.now()+60000),finishedAt:new Date(),submissionHash:stored.hash}});
  const artifact=await db.artifact.create({data:{workflowId:flow.id,taskId:task.id,attemptId:build.id,hash:stored.hash,objectKey:stored.key,bytes:stored.bytes,accepted:true}});
  await db.task.update({where:{id:task.id},data:{state:'ACCEPTED',generation:1,buildCount:1,acceptedArtifact:artifact.id}});
  await db.workflow.update({where:{id:flow.id},data:{status:'VERIFYING'}});
  await engine.finish(flow.id,{semantic:{passed:false,reason:'Completion button visibly overflows'}},false);
  const repaired=await db.workflow.findUniqueOrThrow({where:{id:flow.id}}),queued=await db.task.findUniqueOrThrow({where:{id:task.id}}),attemptRow=await db.attempt.findUniqueOrThrow({where:{id:build.id}});
  expect(repaired.status).toBe('QUEUED');expect(repaired.failure).toBeNull();expect(queued.state).toBe('QUEUED');expect(queued.acceptedArtifact).toBeNull();
  expect((await db.artifact.findUniqueOrThrow({where:{id:artifact.id}})).accepted).toBe(false);expect(attemptRow.feedback).toMatchObject({stage:'FINAL_VALIDATION'});
  await db.workflow.update({where:{id:flow.id},data:{status:'CANCELLED'}});
 });
 it('requires final integration before creating rewards and preserves accounting',async()=>{
  const job=await engine.claim(builder,'BUILD');expect(job).toBeTruthy();
  await engine.submit(builder,job!.attempt.id,job!.attempt.generation,{files:[{path:'index.html',content:'<html><body>Fixed</body></html>'}]});
  const review=await engine.claim(verifier,'VERIFY');
  const v=await engine.review(verifier,review!.attempt.id,review!.attempt.generation,{artifactHash:review!.submission!.hash,decision:'ACCEPT',checks:[{name:'check',passed:true,evidence:'fixture'}],issues:[]});
  await engine.resolve(v.id,true,{exitCode:0});
  expect(await db.reward.count({where:{workflowId:flowId}})).toBe(0);
  await engine.finish(flowId,{exitCode:0},true);
  expect((await db.workflow.findUniqueOrThrow({where:{id:flowId}})).stage).toBe('DELIVERY');
  const accepted=await db.artifact.findFirstOrThrow({where:{workflowId:flowId,accepted:true}});
  const release=await db.release.create({data:{workflowId:flowId,state:'COMPLETED',kind:'GITHUB',target:'fixture/repository',artifactHash:accepted.hash,url:'https://github.com/fixture/repository/tree/hive/release-test'}});
  await engine.delivered(flowId,release.id);await engine.delivered(flowId,release.id);
  const rewards=await db.reward.findMany({where:{workflowId:flowId}});
  expect(rewards.reduce((s,r)=>s+BigInt(r.amount),0n)).toBe(2000n);
  expect(rewards).toHaveLength(2);
  let payouts=0,burns=0;
  const payments=new Payments(db,{...chain,async settle(){payouts++;return'TEST_ONLY_'+randomUUID();},async burnFee(){burns++;return'TEST_ONLY_'+randomUUID();}},engine,c);
  await payments.payRewards();await payments.payRewards();
  expect(payouts).toBe(2);expect(burns).toBe(1);
  expect((await db.ledgerEntry.findUniqueOrThrow({where:{operationKey:'burn:'+flowId}})).amount).toBe('1000');
 });
 it('refunds instead of starting when treasury cannot reserve fee burn and market-rate rewards',async()=>{
  const constrained=new Engine(db,{...chain,async treasuryBalance(){return 2999n;}},store,c),pricing={marketAmountBaseUnits:'2000',expiresAt:'2099-01-01T00:00:00.000Z'} as any;
  const flow=await constrained.create(wallet,randomUUID(),'Build only with reserved treasury rewards',plan,false,'1000',8000,2000,wallet,24,'BUILD',undefined,pricing);
  await db.workflow.update({where:{id:flow.id},data:{deadlineAt:new Date(Date.now()+24*3600000)}});
  const result=await constrained.admit(flow.id,'TEST_ONLY_'+randomUUID());
  expect(result.status).toBe('REFUND_PENDING');expect(result.failure).toBe('treasury_capacity_unavailable');
  expect(await db.task.count({where:{workflowId:flow.id,state:'QUEUED'}})).toBe(0);
  expect(await db.reward.count({where:{workflowId:flow.id}})).toBe(0);
  await db.workflow.update({where:{id:flow.id},data:{status:'CANCELLED'}});
 });
 it('hides private workflow data and requires ownership for artifacts',async()=>{
  const snapshot=(await server.app.inject('/api/network/snapshot')).json();
  expect(snapshot).toEqual({agents:[],activity:[],jobs:[],reviews:[],artifacts:[]});
  const flow=await server.app.inject('/api/workflows/'+flowId);expect(flow.statusCode).toBe(401);
  const artifact=await db.artifact.findFirstOrThrow({where:{workflowId:flowId}});
  const download=await server.app.inject('/api/artifacts/'+artifact.id);expect(download.statusCode).toBe(401);
 });
 it('publishes sanitized proof records for opted-in workflows and agents',async()=>{
  await db.workflow.update({where:{id:flowId},data:{public:true}});await db.worker.update({where:{id:builder.id},data:{public:true}});
  const flow=(await server.app.inject('/api/workflows/'+flowId)).json();
  expect(flow.status).toBe('COMPLETED');expect(flow.prompt).toBeUndefined();expect(flow.plan).toBeUndefined();
  const tasks=(await server.app.inject('/api/workflows/'+flowId+'/tasks')).json();
  expect(tasks[0].instructions).toBeUndefined();expect(tasks[0].policy).toBeUndefined();
  const checks=tasks[0].attempts.flatMap((a:any)=>a.verification?.checks??[]);
  expect(checks.every((check:any)=>check.evidence===undefined)).toBe(true);
  const artifact=await db.artifact.findFirstOrThrow({where:{workflowId:flowId,accepted:true}});
  const proof=(await server.app.inject('/api/artifacts/'+artifact.id)).json();
  expect(proof.hash).toBe(artifact.hash);expect(proof.bundle).toBeUndefined();
  const publicTask=(await server.app.inject('/api/tasks/'+tasks[0].id)).json();expect(publicTask.instructions).toBeUndefined();
  const workers=(await server.app.inject('/api/workers')).json();expect(workers.some((w:any)=>w.id===builder.id)).toBe(true);
  await db.workflow.update({where:{id:flowId},data:{public:false}});await db.worker.update({where:{id:builder.id},data:{public:false}});
 });
 it('revokes transferred seats',async()=>{
  await db.seat.update({where:{id:builder.seatId},data:{checkedAt:new Date(0)}});
  revoked=true;await expect(engine.claim(builder,'BUILD')).rejects.toThrow('seat_not_owned');
  expect((await db.worker.findUniqueOrThrow({where:{id:builder.id}})).status).toBe('SUSPENDED');revoked=false;
 });
 it('defers Solana release rewards until deployment and hosting finish',async()=>{
  const flow=await engine.create(wallet,randomUUID(),'Build a Solana application',plan,false,'1000',8000,2000,wallet,24,'SOLANA_APP');
  await admit(engine,flow.id);
  await db.task.updateMany({where:{workflowId:flow.id},data:{state:'ACCEPTED'}});
  await db.workflow.update({where:{id:flow.id},data:{status:'VERIFYING'}});
  await engine.finish(flow.id,{exitCode:0},true);
  const pending=await db.workflow.findUniqueOrThrow({where:{id:flow.id}});
  expect(pending.status).toBe('AWAITING_APPROVAL');expect(pending.stage).toBe('DEPLOYMENT');
  expect(await db.reward.count({where:{workflowId:flow.id}})).toBe(0);
  await engine.cancel(wallet,flow.id);
  expect((await db.workflow.findUniqueOrThrow({where:{id:flow.id}})).status).toBe('REFUND_PENDING');
 });
 it('refunds funding finalized after cancellation without scheduling work',async()=>{
  const f=await engine.create(wallet,randomUUID(),'Cancel pending funding',plan,false,'1000',8000,2000,wallet,24);
  await db.workflow.update({where:{id:f.id},data:{status:'AWAITING_FUNDS',deadlineAt:new Date(Date.now()+24*3600000)}});
  await db.chainOperation.create({data:{workflowId:f.id,operationKey:'fund:'+f.id,kind:'FUND',state:'SUBMITTED',signature:'TEST_ONLY_'+randomUUID()}});
  await engine.cancel(wallet,f.id);
  expect((await db.workflow.findUniqueOrThrow({where:{id:f.id}})).status).toBe('CANCEL_REQUESTED');
  await admit(engine,f.id);
  expect((await db.workflow.findUniqueOrThrow({where:{id:f.id}})).status).toBe('REFUND_PENDING');
  expect(await db.task.count({where:{workflowId:f.id,state:'CANCELLED'}})).toBe(1);
  expect(await db.reward.count({where:{workflowId:f.id}})).toBe(0);
  await db.chainOperation.update({where:{operationKey:'fund:'+f.id},data:{state:'FINALIZED'}});
 });
 it('expires never-broadcast funding only after checking finalized receipts',async()=>{
  const f=await engine.create(wallet,randomUUID(),'Cancel unsigned funding',plan,false,'1000',8000,2000,wallet,24);
  await db.workflow.update({where:{id:f.id},data:{status:'AWAITING_FUNDS'}});
  await db.chainOperation.create({data:{workflowId:f.id,operationKey:'fund:'+f.id,kind:'FUND',lastValidBlockHeight:100}});
  await engine.cancel(wallet,f.id);
  const order:string[]=[];
  const payments=new Payments(db,{...chain,async transactionExpired(){order.push('height');return true;},async operationSignature(){order.push('receipt');return null;}},engine,c);
  await payments.reconcile();
  expect(order).toEqual(['height','receipt']);
  expect((await db.workflow.findUniqueOrThrow({where:{id:f.id}})).status).toBe('CANCELLED');
  expect((await db.chainOperation.findUniqueOrThrow({where:{operationKey:'fund:'+f.id}})).state).toBe('EXPIRED');
 });
 it('recovers direct wallet broadcasts before expiring a prepared operation',async()=>{
  const f=await engine.create(wallet,randomUUID(),'Recover direct funding',plan,false,'1000',8000,2000,wallet,24);
  await db.workflow.update({where:{id:f.id},data:{status:'AWAITING_FUNDS',deadlineAt:new Date(Date.now()+24*3600000)}});
  await db.chainOperation.create({data:{workflowId:f.id,operationKey:'fund:'+f.id,kind:'FUND',lastValidBlockHeight:100}});
  await engine.cancel(wallet,f.id);
  const signature='TEST_ONLY_'+randomUUID();
  await new Payments(db,{...chain,async transactionExpired(){return true;},async operationSignature(){return signature;}},engine,c).reconcile();
  const result=await db.workflow.findUniqueOrThrow({where:{id:f.id}});
  expect(result.status).toBe('REFUND_PENDING');expect(result.fundedSignature).toBe(signature);
  expect((await db.chainOperation.findUniqueOrThrow({where:{operationKey:'fund:'+f.id}})).state).toBe('FINALIZED');
 });
 it('moves a funded job to full refund when its delivery deadline is missed',async()=>{
  const f=await engine.create(wallet,randomUUID(),'Refund a late delivery',plan,false,'1000',8000,2000,wallet,1);
  await admit(engine,f.id);
  await db.workflow.update({where:{id:f.id},data:{deadlineAt:new Date(0)}});
  await engine.recover();
  const late=await db.workflow.findUniqueOrThrow({where:{id:f.id}});
  expect(late.status).toBe('REFUND_PENDING');expect(late.failure).toBe('delivery_deadline_missed');
  expect(await db.reward.count({where:{workflowId:f.id}})).toBe(0);
  expect(await db.task.count({where:{workflowId:f.id,state:'CANCELLED'}})).toBe(1);
  const signature='TEST_ONLY_'+randomUUID(),refunds=new Payments(db,{...chain,async prepareExpiredRefund(){return{transaction:'requester-signed-fixture',lastValidBlockHeight:999};},async operationSignature(_id,kind){return kind==='REFUND'?signature:null;},async refunded(){return true;}},engine,c);
  await refunds.prepareExpiredRefund(wallet,f.id);await refunds.reconcile();
  expect((await db.workflow.findUniqueOrThrow({where:{id:f.id}})).status).toBe('CANCELLED');
  expect((await db.chainOperation.findUniqueOrThrow({where:{operationKey:'refund-expired:'+f.id}})).state).toBe('FINALIZED');
  expect((await db.ledgerEntry.findUniqueOrThrow({where:{operationKey:'refund:'+f.id}})).amount).toBe('1000');
 });
 it('requires two independent accepted reviews and splits the verifier reward',async()=>{
  const qEngine=new Engine(db,chain,store,{...c,REVIEW_QUORUM:2});
  const keys=[Keypair.generate(),Keypair.generate(),Keypair.generate()],workers:any[]=[];
  for(let i=0;i<3;i++){
   const seatId=883+i,w=keys[i].publicKey.toBase58();
   await db.wallet.create({data:{address:w}});
   await db.seat.upsert({where:{id:seatId},create:{id:seatId,imageHash:'quorum-fixture',mint:Keypair.generate().publicKey.toBase58()},update:{mint:Keypair.generate().publicKey.toBase58()}});
   const enrolled=await qEngine.enroll(w,{seatId,deviceKey:Keypair.generate().publicKey.toBase58(),name:'Quorum agent '+i,capabilities:['html'],maxConcurrent:1,public:false});
   workers.push(await db.worker.findUniqueOrThrow({where:{id:enrolled.id}}));
  }
  const flow=await qEngine.create(keys[0].publicKey.toBase58(),randomUUID(),'Build with a review quorum',plan,false,'1000',7000,3000,keys[0].publicKey.toBase58(),24);
  await admit(qEngine,flow.id);
  const build=await qEngine.claim(workers[0],'BUILD');expect(build).toBeTruthy();
  await qEngine.submit(workers[0],build!.attempt.id,build!.attempt.generation,{files:[{path:'index.html',content:'<html><body>Quorum</body></html>'}]});
  for(let i=1;i<3;i++){
   const claimed=await qEngine.claim(workers[i],'VERIFY');expect(claimed).toBeTruthy();
   const review=await qEngine.review(workers[i],claimed!.attempt.id,claimed!.attempt.generation,{artifactHash:claimed!.submission!.hash,decision:'ACCEPT',checks:[{name:'complete',passed:true,evidence:'fixture'}],issues:[]});
   await qEngine.resolve(review.id,true,{exitCode:0});
   expect((await db.task.findUniqueOrThrow({where:{id:build!.task.id}})).state).toBe(i===1?'SUBMITTED':'ACCEPTED');
   if(i===1)expect(await qEngine.claim(workers[i],'VERIFY')).toBeNull();
  }
  await qEngine.finish(flow.id,{exitCode:0},true);
  const artifact=await db.artifact.findFirstOrThrow({where:{workflowId:flow.id,accepted:true}});
  const release=await db.release.create({data:{workflowId:flow.id,state:'COMPLETED',kind:'GITHUB',target:'fixture/quorum',artifactHash:artifact.hash,url:'https://github.com/fixture/quorum/tree/hive/release-test'}});
  await qEngine.delivered(flow.id,release.id);
  const rewards=await db.reward.findMany({where:{workflowId:flow.id}}),verifiers=rewards.filter(r=>r.kind==='VERIFY');
  expect(rewards.reduce((sum,r)=>sum+BigInt(r.amount),0n)).toBe(1000n);
  expect(verifiers).toHaveLength(2);expect(verifiers.reduce((sum,r)=>sum+BigInt(r.amount),0n)).toBe(300n);
 });
});
