import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import type {Bundle} from '../shared/domain.js';
import {Fault,hash} from '../shared/domain.js';
export type Evidence={exitCode:number;stdout:string;stderr:string;durationMs:number;command:string[];artifactHash:string;image:string};
export interface Executor {run(bundle:Bundle,command:string[]):Promise<Evidence>}
export class DockerExecutor implements Executor {
 constructor(private image:string,private enabled:boolean){}
 async run(bundle:Bundle,command:string[]):Promise<Evidence>{
  if(!this.enabled)throw new Fault(503,'execution_not_configured');
  const name='hive-'+randomUUID();
  return new Promise((resolve,reject)=>{
   const programBuild=command.includes('/runner/build-solana.cjs');
   const image=command[0]==='cargo'?(process.env.RUST_SANDBOX_IMAGE??this.image):this.image;
   const args=['run','--rm','-i','--name',name,'--label','hive.sandbox=true','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','64','--memory',programBuild?'2g':'512m','--memory-swap',programBuild?'2g':'512m','--cpus','1','--user','1000:1000','--tmpfs',programBuild?'/work:rw,nosuid,nodev,size=512m,uid=1000,gid=1000':'/work:rw,nosuid,nodev,size=128m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,uid=1000,gid=1000',image];
   const child=spawn('docker',args,{stdio:['pipe','pipe','pipe'],windowsHide:true});
   let output='',errors='',done=false;
   const cleanup=()=>{const p=spawn('docker',['rm','-f',name],{stdio:'ignore',windowsHide:true});p.on('error',()=>{});};
   const finish=(error?:Error,value?:Evidence)=>{if(done)return;done=true;clearTimeout(timer);if(error){cleanup();reject(error);}else resolve(value!);};
   const timer=setTimeout(()=>{child.kill();finish(new Fault(504,'sandbox_timeout'));},programBuild?270000:110000);
   child.stdout.on('data',x=>{output+=x;if(output.length>(programBuild?3000000:300000)){child.kill();finish(new Fault(413,'sandbox_output_limit'));}});
   child.stderr.on('data',x=>{errors=(errors+x).slice(-8000);});
   child.on('error',e=>finish(e));
   child.on('close',code=>{
    if(done)return;
    try{
     const result=JSON.parse(output);
     if(typeof result.exitCode!=='number'||!Array.isArray(result.command))throw Error();
     finish(undefined,{...result,artifactHash:hash(bundle),image});
    }catch{finish(new Fault(503,'sandbox_unavailable','Sandbox could not run', {exitCode:code,detail:errors}));}
   });
   child.stdin.on('error',()=>{});
   child.stdin.end(JSON.stringify({...bundle,command}));
  });
 }
}
export function combine(bundles:Bundle[]):Bundle{
 const files=new Map<string,string>();
 for(const b of bundles)for(const f of b.files){
  const old=files.get(f.path);
  if(old!==undefined&&old!==f.content)throw new Fault(409,'artifact_merge_conflict','Conflicting accepted parent files: '+f.path);
  files.set(f.path,f.content);
 }
 return{files:[...files].map(([path,content])=>({path,content}))};
}
export function overlay(base:Bundle,patch:Bundle):Bundle{
 const files=new Map(base.files.map(f=>[f.path,f.content]));
 for(const f of patch.files)files.set(f.path,f.content);
 return{files:[...files].map(([path,content])=>({path,content}))};
}
