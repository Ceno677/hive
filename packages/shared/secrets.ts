import {readFile} from 'node:fs/promises';
import {Keypair} from '@solana/web3.js';
import bs58 from 'bs58';

export async function loadSolanaKeypair(path?:string,secret?:string){
 const raw=secret??(path?await readFile(path,'utf8'):undefined);
 if(!raw)throw new Error('Solana signer is not configured');
 let bytes:Uint8Array;
 try{
  const value=JSON.parse(raw);
  if(!Array.isArray(value)||value.some(x=>!Number.isInteger(x)||x<0||x>255))throw new Error();
  bytes=Uint8Array.from(value);
 }catch{
  try{bytes=bs58.decode(raw.trim());}catch{throw new Error('Solana signer must be a JSON byte array or base58 secret key');}
 }
 if(bytes.length!==64)throw new Error('Solana signer must contain exactly 64 secret-key bytes');
 return Keypair.fromSecretKey(bytes);
}

export async function loadTextSecret(path?:string,secret?:string){
 const value=secret??(path?await readFile(path,'utf8'):undefined);
 if(!value)throw new Error('Secret is not configured');
 return value.replace(/\\n/g,'\n');
}
