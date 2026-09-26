import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Connection,Keypair,PublicKey} from '@solana/web3.js';
import {DockerExecutor} from '../execution/docker.js';
import {Fault,digest,type Bundle} from '../shared/domain.js';
import type {Config} from '../shared/config.js';
import {createHmac} from 'node:crypto';
export function deploymentKeypair(c:Config,scope:string){
 if(!c.DEPLOY_PROGRAM_SEED)throw new Fault(503,'solana_deployment_not_configured');
 return Keypair.fromSeed(createHmac('sha256',c.DEPLOY_PROGRAM_SEED).update('hive-program:'+scope).digest());
}
export function deploymentAddress(c:Config,scope:string){return deploymentKeypair(c,scope).publicKey.toBase58();}
// Runs only on the trusted deployment service host, after artifact-bound requester approval.
export async function deployProgram(c:Config,bundle:Bundle,target:string,scope:string){
 if(c.SOLANA_CLUSTER==='mainnet-beta')throw new Fault(503,'mainnet_deployment_disabled','Mainnet program publishing requires a reviewed deployment policy.');
 const image=c.SOLANA_BUILD_IMAGE;
 if(!image||!c.DEPLOY_PROGRAM_SEED||!c.SIGNER_KEYPAIR_PATH)throw new Fault(503,'solana_deployment_not_configured');
 const program=deploymentKeypair(c,scope);
 if(program.publicKey.toBase58()!==target)throw new Fault(403,'deployment_target_not_allowed');
 const runner=new DockerExecutor(image,true);
 const build=await runner.run(bundle,['node','/runner/build-solana.cjs']);
 if(build.exitCode!==0)throw new Fault(422,'solana_build_failed');
 let result:{binary:string;idl:unknown};
 try{result=JSON.parse(build.stdout);}catch{throw new Fault(502,'invalid_program_build_output');}
 const binary=Buffer.from(result.binary,'base64');
 if(binary.length<4||binary.length>1_500_000||!binary.subarray(0,4).equals(Buffer.from([127,69,76,70])))throw new Fault(422,'invalid_program_binary');
 const idl=result.idl as any;
 if(idl?.address!==target)throw new Fault(409,'idl_program_mismatch');
 const dir=await mkdtemp(join(tmpdir(),'hive-deploy-')),binaryPath=join(dir,'program.so'),keyPath=join(dir,'program-keypair.json');
 try{
  await writeFile(binaryPath,binary,{flag:'wx',mode:0o600});
  await writeFile(keyPath,JSON.stringify([...program.secretKey]),{flag:'wx',mode:0o600});
  const output=await new Promise<string>((resolve,reject)=>{
   const child=spawn('solana',['program','deploy',binaryPath,'--url',c.SOLANA_RPC_URL,'--keypair',c.SIGNER_KEYPAIR_PATH!,'--program-id',keyPath,'--output','json','--commitment','finalized'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
   let out='',err='';const timeout=setTimeout(()=>{child.kill();reject(new Fault(504,'deployment_outcome_unknown'));},300000);
   child.stdout.on('data',x=>{out+=x;if(out.length>1000000){child.kill();reject(new Fault(502,'deployment_output_limit'));}});
   child.stderr.on('data',x=>{err=(err+x).slice(-1000);});
   child.on('error',e=>{clearTimeout(timeout);reject(e);});
   child.on('close',code=>{clearTimeout(timeout);code===0?resolve(out):reject(new Fault(502,'deployment_failed'));});
  });
  const deployment=JSON.parse(output);
  const connection=new Connection(c.SOLANA_RPC_URL,'finalized');
  const account=await connection.getAccountInfo(new PublicKey(target),'finalized');
  const loader=new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
  if(!account?.executable||!account.owner.equals(loader)||account.data.readUInt32LE(0)!==2)throw new Fault(502,'deployed_program_unverified');
  const programData=new PublicKey(account.data.subarray(4,36));
  const data=await connection.getAccountInfo(programData,'finalized');
  if(!data||data.data.readUInt32LE(0)!==3||!data.data.subarray(45,45+binary.length).equals(binary))throw new Fault(502,'deployed_binary_mismatch');
  const manifest={version:1,cluster:c.SOLANA_CLUSTER,genesisHash:await connection.getGenesisHash(),programId:target,programData:programData.toBase58(),binaryHash:digest(binary),idlHash:digest(JSON.stringify(idl)),idl,buildImage:image,deployment};
  return{url:'https://explorer.solana.com/address/'+target+'?cluster='+(c.SOLANA_CLUSTER==='localnet'?'custom&customUrl='+encodeURIComponent(c.SOLANA_RPC_URL):'devnet'),manifest};
 }finally{
  // Only the exact temporary directory created above, never a user-selected path.
  if(dir.startsWith(join(tmpdir(),'hive-deploy-')))await rm(dir,{recursive:true,force:true});
 }
}
