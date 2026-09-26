import 'dotenv/config';
import {config} from '../../packages/shared/config.js';
import {HttpModel,modelConfig} from '../../packages/ai/provider.js';
import {DockerExecutor,combine,overlay} from '../../packages/execution/docker.js';
import {ProviderRuntime,HttpAgentRuntime} from './runtime.js';
import {HiveClient} from '../sdk/client.js';
import {setTimeout as pause} from 'node:timers/promises';
const c=config(),token=process.env.WORKER_TOKEN;
if(!token)throw Error('Set the enrolled hosted agent WORKER_TOKEN; never expose it in the website.');
const client=new HiveClient(process.env.HIVE_API_URL??c.PUBLIC_ORIGIN,token);
const executor=new DockerExecutor(c.SANDBOX_IMAGE,c.EXECUTION_ENABLED==='true');
const runtime=process.env.RUNTIME_URL?new HttpAgentRuntime(process.env.RUNTIME_URL):new ProviderRuntime(new HttpModel(modelConfig(c,'BUILDER')),executor,new HttpModel(modelConfig(c,'REVIEWER')),c.AGENT_REPAIR_PASSES);
let stopping=false,active:any=null;
const report=(e:unknown)=>console.error(JSON.stringify({service:'hosted-agent',message:e instanceof Error?e.message:'failed'}));
let heartbeatBusy=false;
const heartbeat=setInterval(async()=>{
 if(heartbeatBusy)return;heartbeatBusy=true;
 try{await client.call('/api/workers/heartbeat',{});if(active)await client.call('/api/worker/attempts/'+active.id+'/renew',{generation:active.generation});}
 catch(e){report(e);}finally{heartbeatBusy=false;}
},15000);
for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>{stopping=true;});
while(!stopping){
 try{
  await client.call('/api/workers/heartbeat',{});
  const review=await client.call('/api/worker/claim',{kind:'VERIFY'});
  const job=review.assignment??(await client.call('/api/worker/claim',{kind:'BUILD'})).assignment;
  if(!job){await pause(3000);continue;}
  active=job.attempt;
  const parents=await Promise.all(job.parents.map(async(p:any)=>(await client.call('/api/artifacts/'+p.id+'?assembled=1')).bundle));
  const base=parents.length?combine(parents):{files:[]};
  if(active.kind==='BUILD'){
   const bundle=await runtime.build(job.task,base,job.feedback);
   await client.call('/api/worker/attempts/'+active.id+'/submit',{generation:active.generation,bundle});
  }else{
   const submitted=await client.call('/api/artifacts/'+job.submission.id),bundle=overlay(base,submitted.bundle);
   const evidence=await executor.run(bundle,job.task.policy.command);
   const verdict=await runtime.review(job.task,bundle,evidence);
   if(evidence.exitCode!==0)verdict.decision='REJECT';
   await client.call('/api/worker/attempts/'+active.id+'/review',{generation:active.generation,artifactHash:submitted.hash,...verdict});
  }
 }catch(e){report(e);await pause(3000);}finally{active=null;}
}
clearInterval(heartbeat);
