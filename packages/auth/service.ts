import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {PublicKey} from '@solana/web3.js';
import type {PrismaClient} from '@prisma/client';
import {serial} from '../database/client.js';
import {Fault,secret,digest} from '../shared/domain.js';
import type {Config} from '../shared/config.js';
import {randomBytes} from 'node:crypto';
export class Auth {
 constructor(private db:PrismaClient,private c:Config){}
 async challenge(wallet:string){
  new PublicKey(wallet);
  const nonce=randomBytes(16).toString('hex'),expiresAt=new Date(Date.now()+300000);
  const chainId=this.c.SOLANA_CLUSTER==='mainnet-beta'?'mainnet':this.c.SOLANA_CLUSTER;
  const message=[new URL(this.c.PUBLIC_ORIGIN).host+' wants you to sign in with your Solana account:',wallet,'','Sign in to hive.md. This does not authorize transactions.','','URI: '+this.c.PUBLIC_ORIGIN,'Version: 1','Chain ID: '+chainId,'Nonce: '+nonce,'Issued At: '+new Date().toISOString(),'Expiration Time: '+expiresAt.toISOString()].join('\n');
  const row=await this.db.authChallenge.create({data:{wallet,message,expiresAt}});
  return{id:row.id,message,expiresAt};
 }
 async verify(id:string,wallet:string,signature:string){
  const challenge=await this.db.authChallenge.findUnique({where:{id}});
  if(!challenge||challenge.wallet!==wallet||challenge.consumedAt||challenge.expiresAt<=new Date())throw new Fault(401,'invalid_challenge');
  let valid=false;
  try{valid=nacl.sign.detached.verify(Buffer.from(challenge.message),bs58.decode(signature),new PublicKey(wallet).toBytes());}catch{}
  if(!valid)throw new Fault(401,'invalid_signature');
  const token=secret(),csrf=secret();
  await serial(async tx=>{
   const used=await tx.authChallenge.updateMany({where:{id,consumedAt:null,expiresAt:{gt:new Date()}},data:{consumedAt:new Date()}});
   if(used.count!==1)throw new Fault(401,'challenge_replayed');
   await tx.wallet.upsert({where:{address:wallet},create:{address:wallet},update:{}});
   await tx.session.create({data:{wallet,tokenHash:digest(token),csrfHash:digest(csrf),expiresAt:new Date(Date.now()+86400000)}});
  },this.db);
  return{token,csrf,wallet};
 }
 async session(token:string,csrf?:string,mutation=false){
  const s=await this.db.session.findUnique({where:{tokenHash:digest(token)}});
  if(!s||s.revokedAt||s.expiresAt<=new Date())throw new Fault(401,'session_expired');
  if(mutation&&(!csrf||digest(csrf)!==s.csrfHash))throw new Fault(403,'csrf_required');
  return s.wallet;
 }
 async device(token:string){
  const w=await this.db.worker.findUnique({where:{tokenHash:digest(token)}});
  if(!w||w.status==='SUSPENDED'||w.expiresAt<=new Date())throw new Fault(401,'device_revoked');
  return w;
 }
}
