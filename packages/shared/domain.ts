import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
export class Fault extends Error {
  constructor(public status: number, public code: string, message = code, public details?: unknown) { super(message); }
}
export const assert = (ok: unknown, code: string, status = 409): asserts ok => { if (!ok) throw new Fault(status, code); };
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
}
export const digest = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
export const hash = (v: unknown) => digest(canonical(v));
export const secret = () => randomBytes(32).toString('base64url');
export const keySchema = z.string().min(32).max(44);
export const units = z.string().regex(/^[1-9][0-9]{0,19}$/).refine(v=>BigInt(v)<=18446744073709551615n);
export const safePath = z.string().min(1).max(200).refine(p => !p.includes('\\') && !p.includes(':') && !p.startsWith('/') && p.split('/').every(x => x && x !== '.' && x !== '..') && !/[\x00-\x1f]/.test(p), 'Unsafe path');
export const bundleSchema = z.object({ files: z.array(z.object({path:safePath, content:z.string().max(400000)}).strict()).min(1).max(100) }).strict().superRefine((v,c)=>{
  if(new Set(v.files.map(f=>f.path.toLowerCase())).size!==v.files.length)c.addIssue({code:'custom',message:'Duplicate file paths'});
  if(Buffer.byteLength(JSON.stringify(v))>2_000_000)c.addIssue({code:'custom',message:'Bundle exceeds 2 MB'});
});
export const taskSchema = z.object({
  key:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/), title:z.string().min(1).max(160),
  instructions:z.string().min(12).max(8000), skill:z.enum(['node','static','rust']),
  dependencies:z.array(z.string()).max(32), paths:z.array(safePath).min(1).max(20),
  acceptance:z.array(z.string().min(5).max(500)).min(1).max(12)
}).strict();
export const planSchema = z.object({ title:z.string().min(1).max(160), tasks:z.array(taskSchema).min(1).max(12) }).strict();
export type Plan = z.infer<typeof planSchema>;
export type Bundle = z.infer<typeof bundleSchema>;
export function validatePlan(input:unknown): Plan {
 const plan=planSchema.parse(input), keys=new Set(plan.tasks.map(t=>t.key));
 if(keys.size!==plan.tasks.length)throw new Fault(422,'duplicate_task');
 const visiting=new Set<string>(), done=new Set<string>();
 function visit(key:string) {
   if(visiting.has(key))throw new Fault(422,'cyclic_plan');
   if(done.has(key))return;
   const t=plan.tasks.find(t=>t.key===key);
   if(!t)throw new Fault(422,'unknown_dependency');
   visiting.add(key); for(const dep of t.dependencies)visit(dep); visiting.delete(key); done.add(key);
 }
 plan.tasks.forEach(t=>visit(t.key));
 const sinks=plan.tasks.filter(t=>!plan.tasks.some(x=>x.dependencies.includes(t.key)));
 if(sinks.length!==1)throw new Fault(422,'plan_requires_final_join');
 return plan;
}
export function split(amount: bigint, builderBps:number, verifierBps:number) {
 if(!Number.isInteger(builderBps)||!Number.isInteger(verifierBps)||builderBps<0||verifierBps<0||builderBps+verifierBps>10000)throw new Fault(503,'invalid_fee_policy');
 const builder=amount*BigInt(builderBps)/10000n, verifier=amount*BigInt(verifierBps)/10000n;
 return {builder,verifier,protocol:amount-builder-verifier};
}
export type WorkerIdentity={id:string;wallet:string;seatId:number|null;hosted?:boolean};
export function independent(a:WorkerIdentity,b:WorkerIdentity) {
 if(a.id===b.id)return false;
 if(a.hosted&&b.hosted)return true;
 return a.wallet!==b.wallet&&a.seatId!==null&&b.seatId!==null&&a.seatId!==b.seatId;
}
export function independentCapacity(workers:WorkerIdentity[],needed:number) {
 const search=(chosen:WorkerIdentity[],start:number):boolean=>{
  if(chosen.length>=needed)return true;
  for(let i=start;i<workers.length;i++)if(chosen.every(current=>independent(current,workers[i]))&&search([...chosen,workers[i]],i+1))return true;
  return false;
 };
 return search([],0);
}
export function reputation(accepted:number,rejected:number,timeouts:number) {
 return (accepted+2)/(accepted+rejected+timeouts+4);
}
export function checkWrites(bundle:Bundle, paths:string[]) {
 for(const file of bundle.files) {
  const lower=file.path.toLowerCase();
  if(lower.startsWith('.hive/')||lower.startsWith('.git/')||lower==='.github/workflows'||lower.startsWith('.github/workflows/')||file.path==='Dockerfile')throw new Fault(422,'reserved_path');
  if(!paths.some(p=>file.path===p||file.path.startsWith(p+'/')))throw new Fault(422,'write_outside_policy');
 }
}
export const skills = {
 node: { version:1, requiredSkills:['typescript'], command:['node','--test'], image:'node' },
 static: { version:1, requiredSkills:['html'], command:['node','/runner/check-static.cjs'], image:'node' },
 rust: { version:1, requiredSkills:['rust'], command:['cargo','test','--offline'], image:'rust' }
} as const;
