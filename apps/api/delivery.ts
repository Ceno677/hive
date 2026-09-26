import type {FastifyInstance,FastifyRequest} from 'fastify';
import type {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {serial,event} from '../../packages/database/client.js';
import type {ArtifactStore} from '../../packages/artifacts/store.js';
import type {Config} from '../../packages/shared/config.js';
import {Fault,hash} from '../../packages/shared/domain.js';
import {Publisher} from '../../packages/delivery/publish.js';
import {Scheduler} from '../../packages/orchestrator/scheduler.js';
import {deployProgram} from '../../packages/delivery/solana-deploy.js';
import type {Engine} from '../../packages/orchestrator/engine.js';
import {zipSync,strToU8} from 'fflate';
export function deliveryRoutes(app:FastifyInstance,db:PrismaClient,c:Config,store:ArtifactStore,wallet:(r:FastifyRequest)=>Promise<string>,resolveBundle:(taskId:string)=>ReturnType<Scheduler['artifactTree']>,engine:Engine){
 const publisher=new Publisher(c);
 app.get('/api/workflows/:id/download',async(r,reply)=>{
  const owner=await wallet(r),id=z.string().uuid().parse((r.params as any).id);
  const f=await db.workflow.findUnique({where:{id},include:{tasks:{include:{dependents:true}}}});
  if(!f||f.wallet!==owner)throw new Fault(404,'not_found');
  if(f.status!=='COMPLETED')throw new Fault(409,'work_not_verified');
  const sink=f.tasks.find(t=>!t.dependents.length)!;
  const bundle=await resolveBundle(sink.id);
  return reply.header('content-type','application/zip').header('content-disposition','attachment; filename="hive-project.zip"').send(Buffer.from(zipSync(Object.fromEntries(bundle.files.map(f=>[f.path,strToU8(f.content)])))));
 });
 app.post('/api/workflows/:id/approve-delivery',async r=>{
  const owner=await wallet(r),id=z.string().uuid().parse((r.params as any).id);
  const input=z.object({action:z.enum(['GITHUB','STATIC_SITE','SOLANA_PROGRAM']),target:z.string().min(1).max(160),artifactHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(r.body);
  const f=await db.workflow.findUnique({where:{id},include:{tasks:{include:{dependents:true}}}});
  if(!f||f.wallet!==owner)throw new Fault(404,'not_found');
  if(f.status!=='COMPLETED'&&!(f.status==='AWAITING_APPROVAL'&&((f.stage==='DELIVERY'&&input.action==='GITHUB')||(f.stage==='DEPLOYMENT'&&input.action==='SOLANA_PROGRAM')||(f.stage==='HOSTING'&&input.action==='STATIC_SITE'))))throw new Fault(409,'work_not_verified');
  if(input.action==='SOLANA_PROGRAM'&&input.target!==f.deploymentTarget)throw new Fault(403,'deployment_target_not_allowed');
  const sink=f.tasks.find(t=>t.dependents.length===0)!;
  const bundle=await resolveBundle(sink.id);
  if(hash(bundle)!==input.artifactHash)throw new Fault(409,'artifact_changed');
  return db.approval.create({data:{workflowId:id,wallet:owner,...input,cluster:c.SOLANA_CLUSTER,expiresAt:new Date(Date.now()+600000)}});
 });
 app.get('/api/workflows/:id/result',async r=>{
  const owner=await wallet(r),id=z.string().uuid().parse((r.params as any).id);
  const f=await db.workflow.findUnique({where:{id},include:{tasks:{include:{dependents:true}}}});
  if(!f||f.wallet!==owner)throw new Fault(404,'not_found');
  if(!['COMPLETED','AWAITING_APPROVAL'].includes(f.status))throw new Fault(409,'work_not_verified');
  const sink=f.tasks.find(t=>!t.dependents.length)!;
  const bundle=await resolveBundle(sink.id);
  return{workflowId:id,artifactHash:hash(bundle),fileCount:bundle.files.length,deploymentTarget:f.stage==='DEPLOYMENT'?f.deploymentTarget:null};
 });
 app.post('/api/approvals/:id/publish',async r=>{
  const owner=await wallet(r),id=z.string().uuid().parse((r.params as any).id);
  const approved=await db.approval.findUnique({where:{id},include:{workflow:{include:{tasks:{include:{dependents:true}}}}}});
  if(!approved||approved.wallet!==owner)throw new Fault(404,'not_found');
  if(approved.expiresAt<=new Date()||approved.cluster!==c.SOLANA_CLUSTER)throw new Fault(409,'approval_expired');
  const sink=approved.workflow.tasks.find(t=>!t.dependents.length)!;
  const bundle=await resolveBundle(sink.id);
  if(hash(bundle)!==approved.artifactHash||!['COMPLETED','AWAITING_APPROVAL'].includes(approved.workflow.status))throw new Fault(409,'approval_mismatch');
  const release=await serial(async tx=>{
   const existing=await tx.release.findUnique({where:{workflowId_kind_artifactHash_target:{workflowId:approved.workflowId,kind:approved.action,artifactHash:approved.artifactHash,target:approved.target}}});
   if(existing)return existing;
   const locked=await tx.approval.updateMany({where:{id,usedAt:null},data:{usedAt:new Date()}});
   if(!locked.count)throw new Fault(409,'approval_used');
   return tx.release.create({data:{workflowId:approved.workflowId,kind:approved.action,target:approved.target,artifactHash:approved.artifactHash}});
  },db);
  if(release.state==='COMPLETED')return release;
  const won=await db.release.updateMany({where:{id:release.id,state:{in:['PENDING','FAILED']}},data:{state:'PUBLISHING'}});
  if(!won.count)throw new Fault(409,'publication_in_progress');
  try{
   const result=approved.action==='GITHUB'?await publisher.github(bundle,approved.target,release.id):approved.action==='SOLANA_PROGRAM'?await deployProgram(c,bundle,approved.target,approved.workflow.wallet+':'+approved.workflow.requestKey):await publisher.staticSite(bundle,approved.target,release.id);
   const row=await serial(async tx=>{
    const row=await tx.release.update({where:{id:release.id},data:{state:approved.action==='STATIC_SITE'?'VALIDATING':'COMPLETED',url:result.url,manifest:result.manifest,failure:null}});
    if(approved.workflow.mode==='SOLANA_APP'&&approved.action==='SOLANA_PROGRAM'){
     const manifestHash=hash(result.manifest);
     const frontend=await tx.task.create({data:{workflowId:approved.workflowId,key:'release_frontend',title:'Connect the website to the deployed program',skill:'static',requiredSkills:['html'],state:'QUEUED',instructions:'Build the requested website against this actual deployment. Original brief: '+approved.workflow.prompt+'\nDeployment: '+JSON.stringify(result.manifest)+'\nInclude hive-deployment.json containing {manifestHash:"'+manifestHash+'",programId:"'+approved.target+'"}. Never invent addresses or change the program.',policy:{version:1,paths:['index.html','app.js','style.css','hive-deployment.json'],acceptance:['The site implements the requested user flow against the deployed program and IDL','hive-deployment.json matches the supplied manifest'],command:['node','/runner/check-static.cjs'],deploymentManifestHash:manifestHash,programId:approved.target}}});
     await tx.dependency.create({data:{taskId:frontend.id,parentId:sink.id}});
     await tx.workflow.update({where:{id:approved.workflowId},data:{stage:'FRONTEND',status:'RUNNING'}});
    }
    if(approved.workflow.mode==='SOLANA_APP'&&approved.action==='STATIC_SITE')await tx.workflow.update({where:{id:approved.workflowId},data:{stage:'VALIDATING',status:'VERIFYING'}});
    await event(tx,approved.workflowId,'delivery.published',{releaseId:row.id});return row;
   },db);
   if(approved.workflow.mode==='BUILD'&&approved.action==='GITHUB'&&row.state==='COMPLETED')await engine.delivered(approved.workflowId,row.id);
   return row;
  }catch(e){
   await db.release.update({where:{id:release.id},data:{state:'FAILED',failure:'publication_failed'}});
   throw e;
  }
 });
}
