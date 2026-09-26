import 'dotenv/config';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const SUPPLY=888;
const release=resolve(process.env.NFT_RELEASE_DIR??'publication');
const imageBase=process.env.NFT_IMAGE_BASE_URI?.replace(/\/$/,'');
const metadataBase=process.env.NFT_METADATA_BASE_URI?.replace(/\/$/,'');
const fast=process.argv.includes('--fast');
const gateway=process.env.TURBO_FAST_GATEWAY??'https://turbo-gateway.com';
if(!imageBase||!metadataBase)throw new Error('Set NFT_IMAGE_BASE_URI and NFT_METADATA_BASE_URI');
const remap=(url:string)=>fast?`${gateway.replace(/\/$/,'')}${new URL(url).pathname}`:url;
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const work=[
 ...Array.from({length:SUPPLY},(_,index)=>({url:remap(`${imageBase}/${index+1}.png`),file:resolve(release,'images',`${index+1}.png`)})),
 {url:remap(`${imageBase}/collection.png`),file:resolve(release,'images','collection.png')},
 ...Array.from({length:SUPPLY},(_,index)=>({url:remap(`${metadataBase}/${index+1}.json`),file:resolve(release,'metadata',`${index+1}.json`)})),
 {url:remap(`${metadataBase}/collection.json`),file:resolve(release,'metadata','collection.json')}
];

let cursor=0,verified=0;
async function verify(entry:{url:string,file:string}){
 const expected=await readFile(entry.file);
 let last='';
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(entry.url,{signal:AbortSignal.timeout(30_000)});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const received=Buffer.from(await response.arrayBuffer());
   if(sha(received)!==sha(expected))throw new Error('SHA-256 mismatch');
   return;
  }catch(error){last=error instanceof Error?error.message:String(error); await new Promise(done=>setTimeout(done,500*(attempt+1)));}
 }
 throw new Error(`${entry.url}: ${last}`);
}
async function worker(){
 while(cursor<work.length){
  const index=cursor++;
  await verify(work[index]);
  verified++;
  if(verified%100===0||verified===work.length)console.log(`Verified ${verified}/${work.length}`);
 }
}
await Promise.all(Array.from({length:16},()=>worker()));
console.log(`REMOTE NFT RELEASE VERIFIED: ${verified}/${work.length} files match the immutable local release via ${fast?'Turbo fast-finality':'permanent Arweave'} gateway.`);
