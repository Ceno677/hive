import type {PrismaClient, Prisma, Worker} from '@prisma/client';
import {serial,event,type Tx} from '../database/client.js';
import {Fault,validatePlan,hash,checkWrites,skills,type Bundle,split,canonical,digest,secret,reputation} from '../shared/domain.js';
import type {Chain} from '../solana/chain.js';
import type {ArtifactStore} from '../artifacts/store.js';
import type {Config} from '../shared/config.js';
import {scan} from '../verification/scan.js';
import type {JobPricing} from '../pricing/quote.js';
const live=['CLAIMED','RUNNING'];
export class Engine {
 constructor(public db:PrismaClient,public chain:Chain,public store:ArtifactStore,public c:Config){}
 async requireOwned(w:Worker){
  const seat=await this.db.seat.findUniqueOrThrow({where:{id:w.seatId}});
  if(!seat.mint)throw new Fault(403,'seat_not_minted');
  if(seat.ownerWallet===w.wallet&&seat.checkedAt&&seat.checkedAt.getTime()>Date.now()-this.c.OWNERSHIP_RECHECK_SECONDS*1000)return;
  try{
   const owned=await this.chain.ownership(w.wallet,seat.mint);
   await this.db.seat.update({where:{id:seat.id},data:{ownerWallet:w.wallet,checkedAt:new Date(),slot:BigInt(owned.slot)}});
  }catch(e){
   if(e instanceof Fault&&e.status===403)await this.db.worker.update({where:{id:w.id},data:{status:'SUSPENDED',generation:{increment:1}}});
   throw e;
  }
 }
 async enroll(wallet:string,input:{seatId:number;deviceKey:string;name:string;capabilities:string[];maxConcurrent:number;public:boolean}){
  const seat=await this.db.seat.findUnique({where:{id:input.seatId}});
  if(!seat?.mint)throw new Fault(403,'seat_not_minted');
  const ownership=await this.chain.ownership(wallet,seat.mint),token=secret();
  const worker=await serial(async tx=>{
   await tx.seat.update({where:{id:seat.id},data:{ownerWallet:wallet,checkedAt:new Date(),slot:BigInt(ownership.slot)}});
   const old=await tx.worker.findUnique({where:{seatId:seat.id}});
   if(old&&old.wallet===wallet&&old.deviceKey!==input.deviceKey&&old.status!=='SUSPENDED')throw new Fault(409,'seat_already_enrolled');
   const data={...input,wallet,tokenHash:digest(token),status:'ONLINE',heartbeatAt:new Date(),expiresAt:new Date(Date.now()+30*86400000)};
   return tx.worker.upsert({where:{seatId:seat.id},create:data,update:{...data,generation:{increment:1}}});
  },this.db);
  return{id:worker.id,token,expiresAt:worker.expiresAt};
 }
 async create(wallet:string,key:string,prompt:string,raw:unknown,isPublic:boolean,amount:string,builderBps:number,verifierBps:number,treasury:string,deadlineHours:number,mode='BUILD',deploymentTarget?:string,pricing?:JobPricing){
  if(!Number.isInteger(deadlineHours)||deadlineHours<1||deadlineHours>168)throw new Fault(503,'invalid_job_deadline');
  const base=validatePlan(raw),plan=deploymentTarget?{...base,tasks:base.tasks.map(t=>({...t,instructions:t.instructions+'\nRequired deployment program address: '+deploymentTarget+'. Use it exactly in declare_id, Anchor.toml and the generated IDL.'}))}:base;
  const inputHash=hash({prompt,plan,isPublic,amount,builderBps,verifierBps,treasury,deadlineHours,mode,deploymentTarget,pricing});
  split(BigInt(amount),builderBps,verifierBps);
  return serial(async tx=>{
   const old=await tx.workflow.findUnique({where:{wallet_requestKey:{wallet,requestKey:key}}});
   if(old){if(old.prompt!==prompt||old.public!==isPublic||old.mode!==mode)throw new Fault(409,'request_key_conflict');return old;}
   const workflow=await tx.workflow.create({data:{wallet,requestKey:key,inputHash,prompt,title:plan.title,public:isPublic,plan:plan as unknown as Prisma.InputJsonValue,planHash:hash({plan,mode,deploymentTarget}),pricing:pricing as unknown as Prisma.InputJsonValue|undefined,mode,stage:mode==='SOLANA_APP'?'PROGRAM':'BUILD',deploymentTarget,amount,builderBps,verifierBps,treasury,deadlineHours,status:'QUOTED',expiresAt:pricing?new Date(pricing.expiresAt):new Date(Date.now()+600000)}});
   for(const t of plan.tasks)await tx.task.create({data:{workflowId:workflow.id,key:t.key,title:t.title,instructions:t.instructions,skill:t.skill,requiredSkills:[...skills[t.skill].requiredSkills],policy:{paths:t.paths,acceptance:t.acceptance,version:1,command:[...skills[t.skill].command]}}});
   const tasks=await tx.task.findMany({where:{workflowId:workflow.id}});
   for(const t of plan.tasks)for(const parent of t.dependencies)await tx.dependency.create({data:{taskId:tasks.find(x=>x.key===t.key)!.id,parentId:tasks.find(x=>x.key===parent)!.id}});
   await event(tx,workflow.id,'workflow.quoted');return workflow;
  },this.db);
 }
 async admit(id:string,signature:string){
  const flow=await this.db.workflow.findUniqueOrThrow({where:{id}});
  if(!flow.deadlineAt||!await this.chain.finalized(signature)||!await this.chain.funded(flow.wallet,id,flow.amount,flow.planHash!,Math.floor(flow.deadlineAt.getTime()/1000),signature))throw new Fault(409,'payment_not_finalized');
  return serial(async tx=>{
   const f=await tx.workflow.findUniqueOrThrow({where:{id}});
   if(f.fundedSignature)return f;
   if(!['QUOTED','AWAITING_FUNDS','CANCEL_REQUESTED'].includes(f.status))throw new Fault(409,'workflow_not_payable');
   const cancelling=f.status==='CANCEL_REQUESTED';
   await tx.workflow.update({where:{id},data:{status:cancelling?'REFUND_PENDING':'QUEUED',fundedSignature:signature}});
   await tx.ledgerEntry.create({data:{operationKey:'fund:'+id,workflowId:id,kind:'FUNDED',amount:f.amount,signature}});
   if(!cancelling)await tx.task.updateMany({where:{workflowId:id,dependencies:{none:{}}},data:{state:'QUEUED'}});
   await event(tx,id,'workflow.funded');return tx.workflow.findUniqueOrThrow({where:{id}});
  },this.db);
 }
 async claim(worker:Worker,kind:'BUILD'|'VERIFY'){
  await this.requireOwned(worker);
  return serial(async tx=>{
   await tx.$queryRaw`SELECT id FROM "Worker" WHERE id=${worker.id} FOR UPDATE`;
   const w=await tx.worker.findUniqueOrThrow({where:{id:worker.id}});
   if(w.generation!==worker.generation||w.status==='SUSPENDED'||w.heartbeatAt.getTime()<Date.now()-45000)throw new Fault(409,'worker_unavailable');
   const buildSamples=w.buildAccepted+w.buildRejected,verifySamples=w.verifyAccepted+w.verifyRejected;
   if(kind==='BUILD'&&buildSamples>=this.c.WORKER_REPUTATION_SAMPLE&&reputation(w.buildAccepted,w.buildRejected,w.timeouts)<this.c.BUILDER_MIN_REPUTATION)throw new Fault(403,'builder_reputation_below_policy');
   if(kind==='VERIFY'&&verifySamples>=this.c.WORKER_REPUTATION_SAMPLE&&reputation(w.verifyAccepted,w.verifyRejected,w.timeouts)<this.c.VERIFIER_MIN_REPUTATION)throw new Fault(403,'verifier_reputation_below_policy');
   if(await tx.attempt.count({where:{workerId:w.id,state:{in:live},leaseUntil:{gt:new Date()}}})>=w.maxConcurrent)return null;
   const candidates=await tx.task.findMany({where:{state:kind==='BUILD'?'QUEUED':'SUBMITTED',requiredSkills:{hasEvery:[]},workflow:{status:{in:['QUEUED','RUNNING','VERIFYING']}}},orderBy:{id:'asc'},take:100,include:{attempts:{include:{verification:true},orderBy:{startedAt:'desc'}}}});
   const eligible=candidates.filter(t=>{
    if(!t.requiredSkills.every(s=>w.capabilities.includes(s)))return false;
    if(kind==='BUILD')return true;
    const built=t.attempts.find(a=>a.kind==='BUILD'&&a.state==='SUBMITTED'&&a.submissionHash);
    if(!built||built.workerId===w.id||built.seatId===w.seatId||built.ownerWallet===w.wallet)return false;
     return !t.attempts.some(a=>a.kind==='VERIFY'&&a.verification?.artifactHash===built.submissionHash&&(a.workerId===w.id||a.seatId===w.seatId||a.ownerWallet===w.wallet));
    });
   if(kind==='VERIFY'){
    const pairings=new Map((await tx.pairing.findMany({where:{verifier:w.id}})).map(p=>[p.builder,p.count]));
    eligible.sort((a,b)=>{
     const ab=a.attempts.find(x=>x.kind==='BUILD'&&x.state==='SUBMITTED'&&x.submissionHash)?.workerId;
     const bb=b.attempts.find(x=>x.kind==='BUILD'&&x.state==='SUBMITTED'&&x.submissionHash)?.workerId;
     return (pairings.get(ab??'')??0)-(pairings.get(bb??'')??0)||a.id.localeCompare(b.id);
    });
   }
   const task=eligible[0];
   if(!task)return null;
   if(kind==='BUILD'&&task.buildCount>=3){await tx.task.update({where:{id:task.id},data:{state:'FAILED'}});await tx.workflow.update({where:{id:task.workflowId},data:{status:'FAILED',failure:'attempt_limit'}});return null;}
   const updated=await tx.task.updateMany({where:{id:task.id,state:task.state,generation:task.generation},data:{state:kind==='BUILD'?'CLAIMED':'VERIFYING',generation:{increment:1},...(kind==='BUILD'?{buildCount:{increment:1}}:{})}});
   if(!updated.count)return null;
   const attempt=await tx.attempt.create({data:{taskId:task.id,workerId:w.id,ownerWallet:w.wallet,seatId:w.seatId,kind,generation:task.generation+1,leaseUntil:new Date(Date.now()+120000)}});
   await tx.workflow.update({where:{id:task.workflowId},data:{status:'RUNNING'}});
   await event(tx,task.workflowId,kind==='BUILD'?'task.claimed':'verification.started',{taskId:task.id,attemptId:attempt.id});
   const parents=await tx.dependency.findMany({where:{taskId:task.id},include:{parent:true}});
   const artifacts=await tx.artifact.findMany({where:{id:{in:parents.map(p=>p.parent.acceptedArtifact).filter((x):x is string=>!!x)}}});
   const latestBuild=task.attempts.find(a=>a.kind==='BUILD'&&a.state==='SUBMITTED'&&a.submissionHash)??task.attempts.find(a=>a.kind==='BUILD');
   const submission=kind==='VERIFY'&&latestBuild?await tx.artifact.findUnique({where:{attemptId:latestBuild.id}}):null;
   return{attempt,task,parents:artifacts.map(a=>({id:a.id,hash:a.hash})),submission:submission?{id:submission.id,hash:submission.hash}:null,feedback:latestBuild?.feedback};
  },this.db);
 }
 async active(tx:Tx,worker:Worker,id:string,generation:number){
  const a=await tx.attempt.findUnique({where:{id},include:{task:{include:{workflow:true}},worker:true}});
  if(!a||a.workerId!==worker.id||a.worker.generation!==worker.generation||a.worker.status==='SUSPENDED'||a.generation!==generation||a.task.generation!==generation||!live.includes(a.state)||a.leaseUntil<=new Date()||['CANCELLED','FAILED','REFUND_PENDING'].includes(a.task.workflow.status))throw new Fault(409,'stale_lease');
  return a;
 }
 async renew(worker:Worker,id:string,generation:number){
  return serial(async tx=>{await this.active(tx,worker,id,generation);return tx.attempt.update({where:{id},data:{state:'RUNNING',leaseUntil:new Date(Date.now()+120000)}});},this.db);
 }
 async submit(worker:Worker,id:string,generation:number,bundle:Bundle){
  const a=await this.db.attempt.findUniqueOrThrow({where:{id},include:{task:true}});
  if(a.workerId!==worker.id||a.kind!=='BUILD')throw new Fault(403,'not_builder');
  checkWrites(bundle,(a.task.policy as any).paths);
  scan(bundle);
  const stored=await this.store.put(bundle);
  await this.requireOwned(worker);
  return serial(async tx=>{
   const existing=await tx.artifact.findUnique({where:{attemptId:id}});
   if(existing){if(existing.hash!==stored.hash)throw new Fault(409,'submission_conflict');return existing;}
   const current=await this.active(tx,worker,id,generation);
   const artifact=await tx.artifact.create({data:{workflowId:current.task.workflowId,taskId:current.taskId,attemptId:id,hash:stored.hash,objectKey:stored.key,bytes:stored.bytes}});
   await tx.attempt.update({where:{id},data:{state:'SUBMITTED',submissionHash:stored.hash,finishedAt:new Date()}});
   await tx.task.update({where:{id:current.taskId},data:{state:'SUBMITTED'}});
   await event(tx,current.task.workflowId,'task.submitted',{taskId:current.taskId,artifactId:artifact.id});return artifact;
  },this.db);
 }
 async review(worker:Worker,id:string,generation:number,input:{artifactHash:string;decision:'ACCEPT'|'REJECT';checks:unknown[];issues:unknown[]}){
  await this.requireOwned(worker);
  return serial(async tx=>{
   const existing=await tx.verification.findUnique({where:{attemptId:id}});
   if(existing){
    const a=await tx.attempt.findUniqueOrThrow({where:{id}});if(a.workerId!==worker.id||hash({artifactHash:existing.artifactHash,decision:existing.decision,checks:existing.checks,issues:existing.issues})!==hash(input))throw new Fault(409,'review_conflict');return existing;
   }
   const a=await this.active(tx,worker,id,generation);
   if(a.kind!=='VERIFY')throw new Fault(403,'not_verifier');
   const built=await tx.attempt.findFirstOrThrow({where:{taskId:a.taskId,kind:'BUILD',state:'SUBMITTED'},orderBy:{startedAt:'desc'}});
   if(built.submissionHash!==input.artifactHash||built.ownerWallet===worker.wallet||built.seatId===worker.seatId||built.workerId===worker.id)throw new Fault(403,'independence_or_hash');
   const review=await tx.verification.create({data:{attemptId:id,artifactHash:input.artifactHash,decision:input.decision,checks:input.checks as Prisma.InputJsonValue,issues:input.issues as Prisma.InputJsonValue}});
   await tx.attempt.update({where:{id},data:{state:'SUBMITTED',finishedAt:new Date()}});
   await tx.pairing.upsert({where:{builder_verifier:{builder:built.workerId,verifier:worker.id}},create:{builder:built.workerId,verifier:worker.id},update:{count:{increment:1},lastAt:new Date()}});
   await event(tx,a.task.workflowId,'verification.submitted',{verificationId:review.id});return review;
  },this.db);
 }
 async resolve(reviewId:string,passed:boolean,evidence:Prisma.InputJsonValue){
  return serial(async tx=>{
   const v=await tx.verification.findUniqueOrThrow({where:{id:reviewId},include:{attempt:{include:{task:true,worker:true}}}});
   if(v.state!=='PENDING_TRUSTED')return;
   const t=v.attempt.task;
   if(t.generation!==v.attempt.generation||t.state!=='VERIFYING')return;
   const flow=await tx.workflow.findUniqueOrThrow({where:{id:t.workflowId}});
   if(['FAILED','CANCELLED','REFUND_PENDING'].includes(flow.status))return;
   const built=await tx.attempt.findFirstOrThrow({where:{taskId:t.id,kind:'BUILD',submissionHash:v.artifactHash},orderBy:{startedAt:'desc'}});
   const checks=Array.isArray(v.checks)?v.checks:[],issues=Array.isArray(v.issues)?v.issues:[];
   const acceptCoherent=v.decision==='ACCEPT'&&checks.length>0&&checks.every(c=>c!==null&&typeof c==='object'&&!Array.isArray(c)&&c.passed===true)&&issues.length===0;
   const rejectCoherent=v.decision==='REJECT'&&(issues.length>0||checks.some(c=>c!==null&&typeof c==='object'&&!Array.isArray(c)&&c.passed===false));
   const good=passed&&acceptCoherent,agreed=(passed&&acceptCoherent)||(!passed&&rejectCoherent);
   await tx.verification.update({where:{id:reviewId},data:{state:good?'ACCEPTED':'REJECTED',trustedEvidence:evidence}});
   await tx.worker.update({where:{id:v.attempt.workerId},data:agreed?{verifyAccepted:{increment:1}}:{verifyRejected:{increment:1}}});
   await tx.attempt.update({where:{id:built.id},data:{feedback:{issues:v.issues,checks:v.checks,trustedEvidence:evidence} as Prisma.InputJsonValue}});
   if(good){
    const accepted=await tx.verification.count({where:{artifactHash:v.artifactHash,state:'ACCEPTED',attempt:{taskId:t.id}}});
    if(accepted<this.c.REVIEW_QUORUM){
     await tx.task.update({where:{id:t.id},data:{state:'SUBMITTED'}});
     await event(tx,t.workflowId,'verification.quorum_progress',{taskId:t.id,accepted,required:this.c.REVIEW_QUORUM});
     return;
    }
    const artifact=await tx.artifact.update({where:{attemptId:built.id},data:{accepted:true}});
    await tx.task.update({where:{id:t.id},data:{state:'ACCEPTED',acceptedArtifact:artifact.id}});
    await tx.worker.update({where:{id:built.workerId},data:{buildAccepted:{increment:1}}});
    const blocked=await tx.task.findMany({where:{workflowId:t.workflowId,state:'BLOCKED'},include:{dependencies:{include:{parent:true}}}});
    for(const child of blocked)if(child.dependencies.every(d=>d.parent.state==='ACCEPTED'))await tx.task.update({where:{id:child.id},data:{state:'QUEUED'}});
    const pending=await tx.task.count({where:{workflowId:t.workflowId,state:{not:'ACCEPTED'}}});
    if(!pending){await tx.workflow.update({where:{id:t.workflowId},data:{status:'VERIFYING'}});await event(tx,t.workflowId,'workflow.final_validation_requested');}
   }else{
    await tx.worker.update({where:{id:built.workerId},data:{buildRejected:{increment:1}}});
    const state=t.buildCount>=3?'FAILED':'QUEUED';
    await tx.task.update({where:{id:t.id},data:{state}});
    if(state==='FAILED')await tx.workflow.update({where:{id:t.workflowId},data:{status:'FAILED',failure:'verification_attempt_limit'}});
   }
   await event(tx,t.workflowId,good?'verification.accepted':'verification.rejected',{taskId:t.id,verificationId:v.id});
  },this.db);
 }
 async finish(id:string,evidence:Prisma.InputJsonValue,passed:boolean){
  return serial(async tx=>{
   const f=await tx.workflow.findUniqueOrThrow({where:{id},include:{tasks:{include:{attempts:{where:{kind:'BUILD'},orderBy:{startedAt:'desc'},take:1}}}}});
   if(f.status!=='VERIFYING'||f.tasks.some(t=>t.state!=='ACCEPTED'))return;
   if(!passed){await tx.workflow.update({where:{id},data:{status:'FAILED',failure:'final_validation_failed'}});await event(tx,id,'workflow.failed',{evidence});return;}
   if(f.mode==='SOLANA_APP'&&['PROGRAM','FRONTEND'].includes(f.stage)){
    await tx.workflow.update({where:{id},data:{status:'AWAITING_APPROVAL',stage:f.stage==='PROGRAM'?'DEPLOYMENT':'HOSTING'}});
    await event(tx,id,'workflow.approval_required',{stage:f.stage==='PROGRAM'?'DEPLOYMENT':'HOSTING'});return;
   }
   if(f.mode==='BUILD'&&f.stage==='BUILD'){
    await tx.workflow.update({where:{id},data:{status:'AWAITING_APPROVAL',stage:'DELIVERY'}});
    await event(tx,id,'workflow.approval_required',{stage:'DELIVERY',kind:'GITHUB'});return;
   }
   await this.complete(tx,f,evidence);
  },this.db);
 }
 private async complete(tx:Tx,f:any,evidence:Prisma.InputJsonValue){
   const id=f.id as string;
   const amounts=split(BigInt(f.amount),f.builderBps,f.verifierBps);
   for(let i=0;i<f.tasks.length;i++){
    const t=f.tasks[i],b=t.attempts[0];
    const taskBuilder=amounts.builder/BigInt(f.tasks.length)+(i===0?amounts.builder%BigInt(f.tasks.length):0n);
    if(taskBuilder>0n)await tx.reward.create({data:{workflowId:id,kind:'BUILD',beneficiary:b.ownerWallet,amount:taskBuilder.toString(),receiptHash:hash({id,task:t.id,kind:'BUILD'})}});
    const reviews=await tx.verification.findMany({where:{state:'ACCEPTED',artifactHash:b.submissionHash!,attempt:{taskId:t.id}},include:{attempt:true},orderBy:{createdAt:'asc'},take:this.c.REVIEW_QUORUM});
    if(reviews.length<this.c.REVIEW_QUORUM)throw new Fault(409,'review_quorum_missing');
    const taskVerifier=amounts.verifier/BigInt(f.tasks.length)+(i===0?amounts.verifier%BigInt(f.tasks.length):0n);
    for(let j=0;j<reviews.length;j++){
     const amount=taskVerifier/BigInt(reviews.length)+(j===0?taskVerifier%BigInt(reviews.length):0n);
     if(amount>0n)await tx.reward.create({data:{workflowId:id,kind:'VERIFY',beneficiary:reviews[j].attempt.ownerWallet,amount:amount.toString(),receiptHash:hash({id,task:t.id,kind:'VERIFY',verification:reviews[j].id})}});
    }
   }
   if(amounts.protocol>0n)await tx.reward.create({data:{workflowId:id,kind:'PROTOCOL',beneficiary:f.treasury,amount:amounts.protocol.toString(),receiptHash:hash({id,kind:'PROTOCOL'})}});
   await tx.workflow.update({where:{id},data:{status:'COMPLETED'}});
   await event(tx,id,'workflow.completed',{evidence});
 }
 async delivered(id:string,releaseId:string){
  return serial(async tx=>{
   const f=await tx.workflow.findUniqueOrThrow({where:{id},include:{tasks:{include:{attempts:{where:{kind:'BUILD'},orderBy:{startedAt:'desc'},take:1}}}}});
   if(f.status==='COMPLETED')return f;
   if(f.status!=='AWAITING_APPROVAL'||f.stage!=='DELIVERY')throw new Fault(409,'workflow_not_ready_for_delivery');
   const release=await tx.release.findUnique({where:{id:releaseId}});
   if(!release||release.workflowId!==id||release.kind!=='GITHUB'||release.state!=='COMPLETED')throw new Fault(409,'delivery_not_completed');
   await this.complete(tx,f,{releaseId,url:release.url,artifactHash:release.artifactHash} as Prisma.InputJsonValue);
   return tx.workflow.findUniqueOrThrow({where:{id}});
  },this.db);
 }
 async expire(id:string){
  return serial(async tx=>{
   const f=await tx.workflow.findUnique({where:{id}});
   if(!f)throw new Fault(404,'not_found');
   if(f.status==='REFUND_PENDING'||f.status==='CANCELLED')return f;
   if(f.status==='COMPLETED'||!f.fundedSignature||!f.deadlineAt||f.deadlineAt>new Date())throw new Fault(409,'refund_not_available');
   await tx.task.updateMany({where:{workflowId:id,state:{notIn:['ACCEPTED','CANCELLED']}},data:{state:'CANCELLED',generation:{increment:1}}});
   await tx.attempt.updateMany({where:{task:{workflowId:id},state:{in:live}},data:{state:'CANCELLED',finishedAt:new Date()}});
   await tx.workflow.update({where:{id},data:{status:'REFUND_PENDING',failure:'delivery_deadline_missed'}});
   await event(tx,id,'workflow.deadline_missed',{deadlineAt:f.deadlineAt});
   return tx.workflow.findUniqueOrThrow({where:{id}});
  },this.db);
 }
 async recover(){
  const missed=await this.db.workflow.findMany({where:{fundedSignature:{not:null},deadlineAt:{lte:new Date()},status:{notIn:['COMPLETED','CANCELLED','REFUND_PENDING']}}});
  for(const f of missed)await this.expire(f.id);
  return serial(async tx=>{
   await tx.worker.updateMany({where:{status:{in:['ONLINE','BUSY']},heartbeatAt:{lt:new Date(Date.now()-45000)}},data:{status:'OFFLINE'}});
   const expired=await tx.attempt.findMany({where:{state:{in:live},leaseUntil:{lte:new Date()}},include:{task:true}});
   for(const a of expired){
    await tx.attempt.update({where:{id:a.id},data:{state:'EXPIRED',finishedAt:new Date()}});
    await tx.worker.update({where:{id:a.workerId},data:{timeouts:{increment:1}}});
    if(a.task.generation!==a.generation)continue;
    const state=a.kind==='VERIFY'?'SUBMITTED':a.task.buildCount>=3?'FAILED':'QUEUED';
    await tx.task.update({where:{id:a.taskId},data:{state,generation:{increment:1}}});
    if(state==='FAILED')await tx.workflow.update({where:{id:a.task.workflowId},data:{status:'FAILED',failure:'worker_timeouts'}});
    await event(tx,a.task.workflowId,'task.lease_expired',{taskId:a.taskId});
   }
  },this.db);
 }
 async cancel(wallet:string,id:string){
  return serial(async tx=>{
   const f=await tx.workflow.findUniqueOrThrow({where:{id}});
   if(f.wallet!==wallet)throw new Fault(404,'not_found');
   if(['COMPLETED','REFUND_PENDING','CANCELLED','CANCEL_REQUESTED'].includes(f.status))throw new Fault(409,'cannot_cancel');
   await tx.task.updateMany({where:{workflowId:id},data:{state:'CANCELLED',generation:{increment:1}}});
   await tx.attempt.updateMany({where:{task:{workflowId:id},state:{in:live}},data:{state:'CANCELLED'}});
   const pending=await tx.chainOperation.count({where:{workflowId:id,kind:'FUND',state:{in:['PREPARED','SUBMITTED']}}});
   await tx.workflow.update({where:{id},data:{status:f.fundedSignature?'REFUND_PENDING':pending?'CANCEL_REQUESTED':'CANCELLED'}});
   await event(tx,id,'workflow.cancelled');
  },this.db);
 }
}
