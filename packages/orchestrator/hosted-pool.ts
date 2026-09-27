import {createHash} from 'node:crypto';
import {Keypair} from '@solana/web3.js';
import type {PrismaClient,Worker} from '@prisma/client';
import type {Config} from '../shared/config.js';
import {digest,type Bundle} from '../shared/domain.js';
import type {ArtifactStore} from '../artifacts/store.js';
import type {Executor} from '../execution/docker.js';
import {combine,overlay} from '../execution/docker.js';
import type {AgentRuntime} from '../../worker/daemon/runtime.js';
import type {Engine} from './engine.js';

export class HostedPool {
 private active=new Set<string>();
 constructor(private db:PrismaClient,private engine:Engine,private store:ArtifactStore,private executor:Executor,private runtime:AgentRuntime,private c:Config){}

 private configured(){return Boolean(this.c.TREASURY_WALLET&&this.c.OPERATIONS_TOKEN&&this.c.AI_API_KEY&&this.c.EXECUTION_ENABLED==='true');}

 async ensure(){
  if(!this.configured())return [];
  const wallet=this.c.TREASURY_WALLET!;
  await this.db.wallet.upsert({where:{address:wallet},create:{address:wallet},update:{}});
  const workers:Worker[]=[];
  for(let index=1;index<=this.c.REVIEW_QUORUM+1;index++){
   const material=`hive-hosted-agent:${index}:${this.c.OPERATIONS_TOKEN}`;
   const deviceKey=Keypair.fromSeed(createHash('sha256').update(material).digest()).publicKey.toBase58();
   workers.push(await this.db.worker.upsert({
    where:{deviceKey},
    create:{wallet,seatId:null,hosted:true,deviceKey,name:`hive.md hosted agent ${index}`,capabilities:['typescript','html','rust'],maxConcurrent:1,status:'ONLINE',tokenHash:digest('token:'+material),expiresAt:new Date('2100-01-01T00:00:00.000Z'),heartbeatAt:new Date(),public:false},
    update:{wallet,seatId:null,hosted:true,name:`hive.md hosted agent ${index}`,capabilities:['typescript','html','rust'],maxConcurrent:1,status:'ONLINE',expiresAt:new Date('2100-01-01T00:00:00.000Z'),heartbeatAt:new Date(),public:false}
   }));
  }
  return workers;
 }

 async tick(report:(error:unknown)=>void){
  for(const worker of await this.ensure()){
   if(this.active.has(worker.id))continue;
   this.active.add(worker.id);
   void this.run(worker,report).catch(report).finally(()=>this.active.delete(worker.id));
  }
 }

 private async bundleFor(items:{id:string;hash:string}[]):Promise<Bundle>{
  const bundles=await Promise.all(items.map(async item=>{
   const artifact=await this.db.artifact.findUniqueOrThrow({where:{id:item.id}});
   return this.store.get(artifact.objectKey,item.hash);
  }));
  return bundles.length?combine(bundles):{files:[]};
 }

 private async run(worker:Worker,report:(error:unknown)=>void){
  let job:any=await this.engine.claim(worker,'VERIFY');
  if(!job)job=await this.engine.claim(worker,'BUILD');
  if(!job)return;
  const attempt=job.attempt;
  const renew=setInterval(()=>void this.engine.renew(worker,attempt.id,attempt.generation).catch(report),30000);
  try{
   const base=await this.bundleFor(job.parents);
   if(attempt.kind==='BUILD'){
    const bundle=await this.runtime.build(job.task,base,job.feedback);
    await this.engine.submit(worker,attempt.id,attempt.generation,bundle);
    return;
   }
   if(!job.submission)throw new Error('Hosted verification assignment is missing its submission');
   const artifact=await this.db.artifact.findUniqueOrThrow({where:{id:job.submission.id}});
   const submitted=await this.store.get(artifact.objectKey,job.submission.hash);
   const bundle=overlay(base,submitted);
   const evidence=await this.executor.run(bundle,job.task.policy.command);
   const verdict=await this.runtime.review(job.task,bundle,evidence);
   if(evidence.exitCode!==0)verdict.decision='REJECT';
   await this.engine.review(worker,attempt.id,attempt.generation,{artifactHash:job.submission.hash,...verdict});
  }finally{clearInterval(renew);}
 }
}
