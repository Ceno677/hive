import 'dotenv/config';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Keypair} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
const file=process.env.HOLDER_WALLET_KEYPAIR_PATH??process.env.OPERATOR_WALLET_KEYPAIR_PATH,seatId=Number(process.env.HOLDER_SEAT_ID??process.env.OPERATOR_SEAT_ID);
if(!file||!Number.isInteger(seatId)||seatId<1||seatId>888)throw Error('Set HOLDER_WALLET_KEYPAIR_PATH and HOLDER_SEAT_ID for an NFT seat you currently own.');
const key=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(file,'utf8')))),wallet=key.publicKey.toBase58();
const base=process.env.HIVE_API_URL??'http://localhost:4320';
const request=async(path:string,body:unknown,headers:Record<string,string>={})=>{
 const r=await fetch(new URL('/api'+path,base),{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
 const data=await r.json() as any;if(!r.ok)throw Error(data.error);return{data,r};
};
const {data:challenge}=await request('/auth/challenge',{wallet});
const signed=bs58.encode(nacl.sign.detached(Buffer.from(challenge.message),key.secretKey));
const session=await request('/auth/verify',{id:challenge.id,wallet,signature:signed});
await mkdir('.hive',{recursive:true});
const devicePath='.hive/agent-'+seatId+'-device.json';
let device:Keypair;
try{device=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(devicePath,'utf8'))));}
catch{device=Keypair.generate();await writeFile(devicePath,JSON.stringify([...device.secretKey]),{flag:'wx',mode:0o600});}
const capabilities=(process.env.WORKER_CAPABILITIES??'html,typescript').split(',').map(x=>x.trim()).filter(Boolean);
const maxConcurrent=Number(process.env.WORKER_MAX_CONCURRENT??1);
const isPublic=process.env.WORKER_PUBLIC==='true';
const {data}=await request('/workers/register',{seatId,deviceKey:device.publicKey.toBase58(),name:process.env.WORKER_NAME??'Hive agent',capabilities,maxConcurrent,public:isPublic},{cookie:session.r.headers.get('set-cookie')!.split(';')[0],'x-csrf-token':session.data.csrf});
await writeFile('.hive/agent-'+seatId+'.env','WORKER_TOKEN='+data.token+'\nHIVE_API_URL='+base+'\nWORKER_DEVICE_KEYPAIR_PATH='+devicePath+'\n',{mode:0o600});
await request('/auth/logout',{}, {cookie:session.r.headers.get('set-cookie')!.split(';')[0],'x-csrf-token':session.data.csrf});
console.log('NFT seat paired. Scoped agent credential and device key were saved privately under .hive; the holder wallet key was not sent to the server.');
