import {access,readFile} from 'node:fs/promises';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {Connection,Keypair} from '@solana/web3.js';
import {S3Client,HeadBucketCommand} from '@aws-sdk/client-s3';
import {createAppAuth} from '@octokit/auth-app';
import {PrismaClient} from '@prisma/client';
import {config,deliveryKeys,missing,missingModels,mintKeys,paymentKeys} from '../../packages/shared/config.js';
import {createChain} from '../../packages/solana/factory.js';
import {mintPriceBaseUnits} from '../../packages/shared/mint-price.js';

const c=config({...process.env,NODE_ENV:'test'}),problems:string[]=[];
const db=new PrismaClient({datasourceUrl:c.DATABASE_URL});
const required=[...new Set([...mintKeys(c),...paymentKeys(c),...deliveryKeys,'AI_API_KEY','OPERATIONS_TOKEN','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','NETLIFY_TOKEN','NETLIFY_SITE_ID','DEPLOY_PROGRAM_SEED','SIGNER_KEYPAIR_PATH','SOLANA_BUILD_IMAGE','RUST_SANDBOX_IMAGE'] as const)];
for(const name of missing(c,required))problems.push('missing '+name);
for(const name of missingModels(c))problems.push('missing '+name+' (or AI_MODEL fallback)');
if(process.env.NODE_ENV!=='production')problems.push('NODE_ENV must be production');
if(c.TRUST_PROXY!=='true')problems.push('TRUST_PROXY must be true behind the production proxy');
if(c.EXECUTION_ENABLED!=='true')problems.push('EXECUTION_ENABLED must be true');
if(c.ARTIFACT_STORAGE!=='s3')problems.push('ARTIFACT_STORAGE must be s3');
if(!c.PUBLIC_ORIGIN.startsWith('https://'))problems.push('PUBLIC_ORIGIN must use HTTPS');
if(!c.SOLANA_BACKUP_RPC_URL)problems.push('SOLANA_BACKUP_RPC_URL is recommended for launch consistency');

const check=async(name:string,fn:()=>Promise<void>)=>{
 try{await fn();console.log('[PASS] '+name);}catch(error){const reason=error instanceof Error?error.message:'failed';problems.push(name+': '+reason);console.log('[FAIL] '+name+' - '+reason);}
};
console.log('HIVE PRODUCTION READINESS CHECK (read-only; no deploys, payments or writes)');
console.log('Approved mint price: 8,888 HMD | seat cap: 888 | wallet cap: '+c.MAX_SEATS_PER_WALLET);
console.log('Models: '+(['PLANNER','BUILDER','REVIEWER','FINAL'] as const).map(role=>role+'='+(c[`AI_${role}_MODEL`]??c.AI_MODEL??'MISSING')).join(', '));
console.log('Model policy: '+c.AI_API_STYLE+', reasoning='+c.AI_REASONING_EFFORT+', timeout='+c.AI_REQUEST_TIMEOUT_MS+'ms, retries='+c.AI_MAX_RETRIES);

await check('PostgreSQL and independent online capacity',async()=>{
 await db.$queryRaw`SELECT 1`;
 const online=await db.worker.findMany({where:{status:{in:['ONLINE','BUSY']},heartbeatAt:{gt:new Date(Date.now()-45000)},expiresAt:{gt:new Date()}}});
 for(const skill of ['html','typescript',...(c.RUST_SANDBOX_IMAGE?['rust']:[])] as const){
  const capable=online.filter(w=>w.capabilities.includes(skill));
  if(new Set(capable.map(w=>w.wallet)).size<c.REVIEW_QUORUM+1)throw Error('need '+(c.REVIEW_QUORUM+1)+' distinct online wallets for '+skill);
 }
});

await check('primary Solana RPC, HMD mint and '+(c.PAYMENT_MODE==='custodial'?'custodial policy':'deployed policy'),async()=>{
 const chain=createChain(c),info=await chain.tokenInfo!(),expected=mintPriceBaseUnits(info.decimals);
 if(c.HMD_BURN_AMOUNT!==expected)throw Error('HMD_BURN_AMOUNT must be '+expected+' for '+info.decimals+' decimals');
 if(!chain.validateMintPolicy)throw Error('mint policy validator unavailable');await chain.validateMintPolicy();
});
if(c.SOLANA_BACKUP_RPC_URL)await check('backup Solana RPC',async()=>{await new Connection(c.SOLANA_BACKUP_RPC_URL!,'finalized').getLatestBlockhash('finalized');});

for(const path of [c.CUSTODY_KEYPAIR_PATH,c.SIGNER_KEYPAIR_PATH,c.GITHUB_APP_PRIVATE_KEY_PATH].filter(Boolean) as string[]){
 await check('private key file '+path,async()=>{await access(path);if(path!==c.GITHUB_APP_PRIVATE_KEY_PATH)Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path,'utf8'))));});
}

if(c.ARTIFACT_STORAGE==='s3')await check('private artifact bucket',async()=>{
 const client=new S3Client({endpoint:c.S3_ENDPOINT,region:c.S3_REGION,forcePathStyle:true,credentials:{accessKeyId:c.S3_ACCESS_KEY,secretAccessKey:c.S3_SECRET_KEY}});
 try{await client.send(new HeadBucketCommand({Bucket:c.S3_BUCKET}));}finally{client.destroy();}
});

if(c.GITHUB_APP_ID&&c.GITHUB_INSTALLATION_ID&&c.GITHUB_APP_PRIVATE_KEY_PATH&&c.GITHUB_ALLOWED_OWNER)await check('GitHub App installation and allowed owner',async()=>{
 const auth=createAppAuth({appId:c.GITHUB_APP_ID!,installationId:Number(c.GITHUB_INSTALLATION_ID),privateKey:await readFile(c.GITHUB_APP_PRIVATE_KEY_PATH!,'utf8')});
 const token=await auth({type:'installation'}),response=await fetch('https://api.github.com/installation/repositories?per_page=100',{headers:{authorization:'Bearer '+token.token,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'}});
 if(!response.ok)throw Error('GitHub returned HTTP '+response.status);
 const body=await response.json() as any;if(!body.repositories?.some((repo:any)=>repo.owner?.login?.toLowerCase()===c.GITHUB_ALLOWED_OWNER!.toLowerCase()))throw Error('installation has no repository under '+c.GITHUB_ALLOWED_OWNER);
});

if(c.NETLIFY_TOKEN&&c.NETLIFY_SITE_ID)await check('Netlify site access',async()=>{
 const response=await fetch('https://api.netlify.com/api/v1/sites/'+encodeURIComponent(c.NETLIFY_SITE_ID!),{headers:{authorization:'Bearer '+c.NETLIFY_TOKEN}});
 if(!response.ok)throw Error('Netlify returned HTTP '+response.status);
});

if(c.AI_API_KEY)await check('AI model access',async()=>{
 const models=[...new Set((['PLANNER','BUILDER','REVIEWER','FINAL'] as const).map(role=>c[`AI_${role}_MODEL`]??c.AI_MODEL).filter(Boolean))] as string[];
 for(const model of models){
  const headers:Record<string,string>=c.AI_PROVIDER==='anthropic'?{'x-api-key':c.AI_API_KEY!,'anthropic-version':'2023-06-01'}:{authorization:'Bearer '+c.AI_API_KEY};
  const response=await fetch(c.AI_BASE_URL.replace(/\/$/,'')+'/models/'+encodeURIComponent(model),{headers});if(!response.ok)throw Error(model+' returned HTTP '+response.status);
 }
});

if(c.EXECUTION_ENABLED==='true')for(const image of [...new Set([c.SANDBOX_IMAGE,c.RUST_SANDBOX_IMAGE,c.SOLANA_BUILD_IMAGE].filter(Boolean))] as string[])await check('sandbox image '+image+' is installed',async()=>{await promisify(execFile)('docker',['image','inspect',image],{windowsHide:true});});

await db.$disconnect();
console.log('Repair passes: '+c.AGENT_REPAIR_PASSES+' | independent review quorum: '+c.REVIEW_QUORUM);
if(problems.length){console.log('\nNOT READY ('+problems.length+' issue'+(problems.length===1?'':'s')+')');for(const problem of problems)console.log('- '+problem);process.exitCode=1;}
else console.log('\nREADY: configuration and read-only dependency probes passed. Run the credentialed benchmark and security gate before opening payment intake.');
