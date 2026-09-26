import {z} from 'zod';
import {Fault,hash,type Bundle} from '../shared/domain.js';
import type {Evidence,Executor} from './docker.js';

const evidenceSchema=z.object({exitCode:z.number().int(),stdout:z.string(),stderr:z.string(),durationMs:z.number().nonnegative(),command:z.array(z.string()),artifactHash:z.string().regex(/^[a-f0-9]{64}$/),image:z.string()});
export class RemoteExecutor implements Executor{
 constructor(private endpoint:string,private token:string){}
 async run(bundle:Bundle,command:string[]):Promise<Evidence>{
  let response:Response;
  try{response=await fetch(new URL('/execute',this.endpoint),{method:'POST',headers:{authorization:'Bearer '+this.token,'content-type':'application/json'},body:JSON.stringify({bundle,command}),signal:AbortSignal.timeout(command.includes('/runner/build-solana.cjs')?300000:130000)});}catch{throw new Fault(503,'execution_service_unavailable');}
  if(!response.ok){
   const body=await response.json().catch(()=>null) as any;
   throw new Fault(response.status===504?504:503,body?.error??'execution_service_unavailable');
  }
  const evidence=evidenceSchema.parse(await response.json());
  if(evidence.artifactHash!==hash(bundle)||JSON.stringify(evidence.command)!==JSON.stringify(command))throw new Fault(502,'execution_evidence_mismatch');
  return evidence;
 }
}
