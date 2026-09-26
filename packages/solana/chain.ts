import {Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY} from '@solana/web3.js';
import {getMint, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID} from './tokens.js';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {publicKey} from '@metaplex-foundation/umi';
import {fetchDigitalAsset, mplTokenMetadata} from '@metaplex-foundation/mpl-token-metadata';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Fault,digest,hash} from '../shared/domain.js';
import type {Config} from '../shared/config.js';
import {mintPriceBaseUnits} from '../shared/mint-price.js';
const metadataProgram=new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const disc=(s:string)=>createHash('sha256').update('global:'+s).digest().subarray(0,8);
const accountDisc=(s:string)=>createHash('sha256').update('account:'+s).digest().subarray(0,8);
const bytes=(s:string)=>Buffer.from(digest(s),'hex');
export const u64=(v:string|bigint)=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(v));return b;};
const u16=(v:number)=>{const b=Buffer.alloc(2);b.writeUInt16LE(v);return b;};
const i64=(v:number)=>{const b=Buffer.alloc(8);b.writeBigInt64LE(BigInt(v));return b;};
export interface Ownership {mint:string;wallet:string;slot:number}
export interface Chain {
 tokenInfo?():Promise<{mint:string;decimals:number}>;
 validateMintPolicy?():Promise<void>;
 transactionExpired?(lastValidHeight:number):Promise<boolean>;
 transactionState?(signature:string,lastValidHeight:number):Promise<'PENDING'|'FINALIZED'|'FAILED'|'EXPIRED'>;
 operationSignature?(id:string,kind:'FUND'|'MINT'|'REFUND',seatId?:number):Promise<string|null>;
 recordWork?(taskId:string,artifactHash:string,builder:string,verifier:string):Promise<string>;
 ownership(wallet:string,mint:string):Promise<Ownership>;
 prepareFund(wallet:string,id:string,amount:string,planHash:string,deadline:number):Promise<{transaction:string;lastValidBlockHeight:number;escrow:string}>;
 funded(wallet:string,id:string,amount:string,planHash:string,deadline:number,signature?:string):Promise<boolean>;
 prepareExpiredRefund?(wallet:string,id:string):Promise<{transaction:string;lastValidBlockHeight:number}>;
 refunded?(wallet:string,id:string,amount:string):Promise<boolean>;
 prepareMint(wallet:string,id:string,seatId:number):Promise<{transaction:string;lastValidBlockHeight:number;mint:string}>;
 minted(wallet:string,seatId:number,requestId:string,expectedMint?:string|null):Promise<{mint:string;slot:number}|null>;
 finalized(signature:string):Promise<boolean>;
 broadcast(transaction:string):Promise<string>;
 settle(id:string,beneficiary:string,amount:string,receipt:string,refund?:boolean):Promise<string>;
}
export function resilientConnection(primary:Connection,backup?:Connection):Connection{
 if(!backup)return primary;
 return new Proxy(primary,{get(target,key){
  const value=(target as any)[key];
  if(typeof value!=='function')return value;
  return async(...args:unknown[])=>{try{return await value.apply(target,args);}catch(primaryError){
   const fallback=(backup as any)[key];if(typeof fallback!=='function')throw primaryError;
   return fallback.apply(backup,args);
  }};
 }}) as Connection;
}
export class SolanaChain implements Chain {
 connection:Connection;
 constructor(private c:Config){this.connection=resilientConnection(new Connection(c.SOLANA_RPC_URL,'finalized'),c.SOLANA_BACKUP_RPC_URL?new Connection(c.SOLANA_BACKUP_RPC_URL,'finalized'):undefined);}
 program(){if(!this.c.HIVE_PROGRAM_ID)throw new Fault(503,'program_not_configured');return new PublicKey(this.c.HIVE_PROGRAM_ID);}
 pda(...seeds:Buffer[]){return PublicKey.findProgramAddressSync(seeds,this.program())[0];}
 config(){return this.pda(Buffer.from('config'));}
 async tokenInfo(){const mint=await this.hmd();const info=await getMint(this.connection,mint);return{mint:mint.toBase58(),decimals:info.decimals};}
 escrow(id:string){return this.pda(Buffer.from('escrow'),bytes(id));}
 async ownership(wallet:string,mint:string){
  if(!this.c.SEAT_COLLECTION_ADDRESS)throw new Fault(503,'collection_not_configured');
  const load=async(url:string)=>fetchDigitalAsset(createUmi(url).use(mplTokenMetadata()),publicKey(mint));
  let asset;try{asset=await load(this.c.SOLANA_RPC_URL);}catch(error){if(!this.c.SOLANA_BACKUP_RPC_URL)throw error;asset=await load(this.c.SOLANA_BACKUP_RPC_URL);}
  if(asset.metadata.collection.__option!=='Some'||!asset.metadata.collection.value.verified||asset.metadata.collection.value.key!==this.c.SEAT_COLLECTION_ADDRESS)throw new Fault(403,'not_collection_member');
  if(asset.mint.decimals!==0||asset.mint.supply!==1n)throw new Fault(403,'not_unique_nft');
  const result=await this.connection.getParsedTokenAccountsByOwner(new PublicKey(wallet),{mint:new PublicKey(mint)},'finalized');
  if(!result.value.some(a=>a.account.owner.equals(TOKEN_PROGRAM_ID)&&a.account.data.parsed.info.tokenAmount.amount==='1'))throw new Fault(403,'seat_not_owned');
  return{wallet,mint,slot:result.context.slot};
 }
 async hmd(){if(!this.c.HMD_MINT)throw new Fault(503,'hmd_not_configured');const mint=new PublicKey(this.c.HMD_MINT);await getMint(this.connection,mint,'finalized',TOKEN_PROGRAM_ID);return mint;}
 async validateProtocol(minting=false){
  if(minting&&mintPriceBaseUnits((await this.tokenInfo()).decimals)!==this.c.HMD_BURN_AMOUNT)throw new Fault(503,'mint_price_mismatch');
  const a=await this.connection.getAccountInfo(this.config(),'finalized');
  if(!a||!a.owner.equals(this.program())||!a.data.subarray(0,8).equals(accountDisc('Config'))||a.data.length<122||new PublicKey(a.data.subarray(40,72)).toBase58()!==this.c.HMD_MINT||a.data[116]!==0)throw new Fault(503,'protocol_unavailable');
  if(minting&&(new PublicKey(a.data.subarray(72,104)).toBase58()!==this.c.SEAT_COLLECTION_ADDRESS||a.data.readBigUInt64LE(104)!==BigInt(this.c.HMD_BURN_AMOUNT!)||a.data.readUInt16LE(112)!==Number(this.c.MAX_SEATS_PER_WALLET)))throw new Fault(503,'mint_policy_mismatch');
 }
 async validateMintPolicy(){await this.validateProtocol(true);}
 async encode(wallet:string,ix:TransactionInstruction){
  const block=await this.connection.getLatestBlockhash('finalized');
  const tx=new Transaction({feePayer:new PublicKey(wallet),...block}).add(ix);
  return{transaction:tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64'),lastValidBlockHeight:block.lastValidBlockHeight};
 }
 async prepareFund(wallet:string,id:string,amount:string,planHash:string,deadline:number){
  await this.validateProtocol();
  const payer=new PublicKey(wallet),mint=await this.hmd(),escrow=this.escrow(id),vault=getAssociatedTokenAddressSync(mint,escrow,true);
  const ix=new TransactionInstruction({programId:this.program(),keys:[
   {pubkey:payer,isSigner:true,isWritable:true},{pubkey:this.config(),isSigner:false,isWritable:false},
   {pubkey:mint,isSigner:false,isWritable:false},{pubkey:escrow,isSigner:false,isWritable:true},
   {pubkey:vault,isSigner:false,isWritable:true},{pubkey:getAssociatedTokenAddressSync(mint,payer),isSigner:false,isWritable:true},
   {pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},
   {pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],
   data:Buffer.concat([disc('fund'),bytes(id),u64(amount),Buffer.from(planHash,'hex'),i64(deadline)])});
  return{...await this.encode(wallet,ix),escrow:escrow.toBase58()};
 }
 async funded(wallet:string,id:string,amount:string,planHash:string,deadline:number){
  const a=await this.connection.getAccountInfo(this.escrow(id),'finalized');
  if(!a)return false;
  const b=a.data;
  return a.owner.equals(this.program())&&b.length>=161&&b.subarray(0,8).equals(accountDisc('Escrow'))&&
   b.subarray(8,40).equals(bytes(id))&&new PublicKey(b.subarray(40,72)).toBase58()===wallet&&
   new PublicKey(b.subarray(72,104)).toBase58()===this.c.HMD_MINT&&b.readBigUInt64LE(104)===BigInt(amount)&&b.subarray(120,152).toString('hex')===planHash&&Number(b.readBigInt64LE(152))===deadline;
 }
 async prepareExpiredRefund(wallet:string,id:string){
  const requester=new PublicKey(wallet),escrow=this.escrow(id),mint=await this.hmd();
  const receiptId=Buffer.from(hash({id,refund:true}),'hex'),receipt=this.pda(Buffer.from('payment'),escrow.toBuffer(),receiptId);
  const ix=new TransactionInstruction({programId:this.program(),keys:[
   {pubkey:requester,isSigner:true,isWritable:true},{pubkey:escrow,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false},
   {pubkey:getAssociatedTokenAddressSync(mint,escrow,true),isSigner:false,isWritable:true},{pubkey:getAssociatedTokenAddressSync(mint,requester),isSigner:false,isWritable:true},
   {pubkey:receipt,isSigner:false,isWritable:true},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],
   data:Buffer.concat([disc('refund_expired'),receiptId])});
  return this.encode(wallet,ix);
 }
 async refunded(wallet:string,id:string,amount:string){
  const a=await this.connection.getAccountInfo(this.escrow(id),'finalized');if(!a)return false;
  const b=a.data;return a.owner.equals(this.program())&&b.length>=161&&b.subarray(0,8).equals(accountDisc('Escrow'))&&new PublicKey(b.subarray(40,72)).toBase58()===wallet&&b.readBigUInt64LE(104)===BigInt(amount)&&b.readBigUInt64LE(112)===BigInt(amount);
 }
 async prepareMint(wallet:string,id:string,seatId:number){
  await this.validateProtocol(true);
  const owner=new PublicKey(wallet),mint=this.pda(Buffer.from('seat_mint'),u16(seatId)),seat=this.pda(Buffer.from('seat'),u16(seatId));
  const hmd=await this.hmd();
  if(!this.c.SEAT_COLLECTION_ADDRESS)throw new Fault(503,'collection_not_configured');
  const collection=new PublicKey(this.c.SEAT_COLLECTION_ADDRESS);
  const meta=(m:PublicKey)=>PublicKey.findProgramAddressSync([Buffer.from('metadata'),metadataProgram.toBuffer(),m.toBuffer()],metadataProgram)[0];
  const edition=PublicKey.findProgramAddressSync([Buffer.from('metadata'),metadataProgram.toBuffer(),collection.toBuffer(),Buffer.from('edition')],metadataProgram)[0];
  const ix=new TransactionInstruction({programId:this.program(),keys:[
   {pubkey:owner,isSigner:true,isWritable:true},{pubkey:this.config(),isSigner:false,isWritable:true},
   {pubkey:hmd,isSigner:false,isWritable:true},{pubkey:getAssociatedTokenAddressSync(hmd,owner),isSigner:false,isWritable:true},
   {pubkey:seat,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:true},
   {pubkey:getAssociatedTokenAddressSync(mint,owner),isSigner:false,isWritable:true},
   {pubkey:meta(mint),isSigner:false,isWritable:true},{pubkey:collection,isSigner:false,isWritable:false},
   {pubkey:meta(collection),isSigner:false,isWritable:true},{pubkey:edition,isSigner:false,isWritable:false},
   {pubkey:this.pda(Buffer.from('wallet'),owner.toBuffer()),isSigner:false,isWritable:true},
   {pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},
   {pubkey:metadataProgram,isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
   {pubkey:SYSVAR_RENT_PUBKEY,isSigner:false,isWritable:false},
   {pubkey:this.pda(Buffer.from('mint_request'),owner.toBuffer(),bytes(id)),isSigner:false,isWritable:true},
   {pubkey:PublicKey.findProgramAddressSync([Buffer.from('metadata'),metadataProgram.toBuffer(),mint.toBuffer(),Buffer.from('edition')],metadataProgram)[0],isSigner:false,isWritable:true}],
   data:Buffer.concat([disc('mint_seat'),u16(seatId),bytes(id)])});
  return{...await this.encode(wallet,ix),mint:mint.toBase58()};
 }
 async minted(wallet:string,seatId:number,requestId:string){
  const mint=this.pda(Buffer.from('seat_mint'),u16(seatId)).toBase58();
  const result=await this.connection.getAccountInfoAndContext(this.pda(Buffer.from('seat'),u16(seatId)),'finalized');
  const a=result.value;
  if(!a)return null;
  if(!a.owner.equals(this.program())||a.data.length<106||!a.data.subarray(0,8).equals(accountDisc('SeatReceipt'))||a.data.readUInt16LE(8)!==seatId||new PublicKey(a.data.subarray(10,42)).toBase58()!==wallet||new PublicKey(a.data.subarray(42,74)).toBase58()!==mint||!a.data.subarray(74,106).equals(bytes(requestId)))throw new Fault(409,'seat_issued_elsewhere');
  // Issuance remains valid after transfer; access always checks current ownership separately.
  return{mint,slot:result.context.slot};
 }
 async finalized(signature:string){
  const r=await this.connection.getSignatureStatuses([signature],{searchTransactionHistory:true});
  return r.value[0]?.confirmationStatus==='finalized'&&r.value[0].err===null;
 }
 async operationSignature(id:string,kind:'FUND'|'MINT'|'REFUND',seatId?:number){
  const escrow=this.escrow(id),address=kind==='FUND'?escrow:kind==='MINT'?this.pda(Buffer.from('seat'),u16(seatId!)):this.pda(Buffer.from('payment'),escrow.toBuffer(),Buffer.from(hash({id,refund:true}),'hex'));
  if(kind==='MINT'){
   const receipt=await this.connection.getAccountInfo(address,'finalized');
   if(!receipt||!receipt.owner.equals(this.program())||receipt.data.length<106||!receipt.data.subarray(0,8).equals(accountDisc('SeatReceipt'))||!receipt.data.subarray(74,106).equals(bytes(id)))return null;
  }
  const signatures=await this.connection.getSignaturesForAddress(address,{limit:20},'finalized');
  return signatures.find(s=>s.err===null)?.signature??null;
 }
 async transactionExpired(lastValidHeight:number){return await this.connection.getBlockHeight('finalized')>lastValidHeight;}
 async transactionState(signature:string,lastValidHeight:number):Promise<'PENDING'|'FINALIZED'|'FAILED'|'EXPIRED'>{
  const s=(await this.connection.getSignatureStatuses([signature],{searchTransactionHistory:true})).value[0];
  if(s?.err)return 'FAILED';
  if(s?.confirmationStatus==='finalized')return 'FINALIZED';
  if(!s&&await this.connection.getBlockHeight('finalized')>lastValidHeight)return 'EXPIRED';
  return 'PENDING';
 }
 async recordWork(taskId:string,artifactHash:string,builder:string,verifier:string){
  if(!this.c.SIGNER_KEYPAIR_PATH)throw new Fault(503,'registry_signer_missing');
  const signer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(this.c.SIGNER_KEYPAIR_PATH,'utf8'))));
  const record=this.pda(Buffer.from('record'),bytes(taskId));
  const prior=await this.connection.getAccountInfo(record,'finalized');
  if(prior){
   if(!prior.owner.equals(this.program())||!prior.data.subarray(0,8).equals(accountDisc('WorkRecord'))||prior.data.subarray(40,72).toString('hex')!==artifactHash||new PublicKey(prior.data.subarray(72,104)).toBase58()!==builder||new PublicKey(prior.data.subarray(104,136)).toBase58()!==verifier)throw new Fault(409,'registry_conflict');
   const list=await this.connection.getSignaturesForAddress(record,{limit:20},'finalized');
   const signature=list.find(x=>!x.err)?.signature;if(!signature)throw new Fault(503,'registry_signature_unavailable');return signature;
  }
  const ix=new TransactionInstruction({programId:this.program(),keys:[{pubkey:signer.publicKey,isSigner:true,isWritable:true},{pubkey:this.config(),isSigner:false,isWritable:false},{pubkey:record,isSigner:false,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],data:Buffer.concat([disc('record'),bytes(taskId),Buffer.from(artifactHash,'hex'),new PublicKey(builder).toBuffer(),new PublicKey(verifier).toBuffer(),Buffer.from([1])])});
  const block=await this.connection.getLatestBlockhash('finalized'),tx=new Transaction({...block,feePayer:signer.publicKey}).add(ix);tx.sign(signer);
  const signature=await this.connection.sendRawTransaction(tx.serialize());
  const r=await this.connection.confirmTransaction({...block,signature},'finalized');if(r.value.err)throw new Fault(502,'registry_failed');return signature;
 }
 async broadcast(transaction:string){
  const tx=Transaction.from(Buffer.from(transaction,'base64'));
  if(!tx.verifySignatures())throw new Fault(400,'invalid_transaction_signature');
  return this.connection.sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:3});
 }
 async settle(id:string,beneficiary:string,amount:string,receipt:string,refund=false){
  if(!this.c.SIGNER_KEYPAIR_PATH)throw new Fault(503,'settlement_signer_not_configured');
  const signer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(this.c.SIGNER_KEYPAIR_PATH,'utf8'))));
  const escrow=this.escrow(id),mint=await this.hmd(),to=new PublicKey(beneficiary);
  const receiptPda=this.pda(Buffer.from('payment'),escrow.toBuffer(),Buffer.from(receipt,'hex'));
  const prior=await this.connection.getAccountInfo(receiptPda,'finalized');
  if(prior){
   if(!prior.owner.equals(this.program())||!prior.data.subarray(0,8).equals(accountDisc('PaymentReceipt'))||!prior.data.subarray(40,72).equals(escrow.toBuffer())||!prior.data.subarray(72,104).equals(to.toBuffer())||prior.data.readBigUInt64LE(104)!==BigInt(amount)||prior.data[112]!==Number(refund))throw new Fault(409,'settlement_receipt_conflict');
   const sigs=await this.connection.getSignaturesForAddress(receiptPda,{limit:20},'finalized');
   const sig=sigs.find(s=>s.err===null)?.signature;if(!sig)throw new Fault(503,'receipt_signature_unavailable');return sig;
  }
  const ix=new TransactionInstruction({programId:this.program(),keys:[
   {pubkey:signer.publicKey,isSigner:true,isWritable:true},{pubkey:this.config(),isSigner:false,isWritable:false},
   {pubkey:escrow,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false},
   {pubkey:getAssociatedTokenAddressSync(mint,escrow,true),isSigner:false,isWritable:true},{pubkey:to,isSigner:false,isWritable:false},
   {pubkey:getAssociatedTokenAddressSync(mint,to),isSigner:false,isWritable:true},{pubkey:receiptPda,isSigner:false,isWritable:true},
   {pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},
   {pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],
   data:Buffer.concat([disc('release'),Buffer.from(receipt,'hex'),u64(amount),Buffer.from([refund?1:0])])});
  const b=await this.connection.getLatestBlockhash('finalized');const tx=new Transaction({...b,feePayer:signer.publicKey}).add(ix);tx.sign(signer);
  const sig=await this.connection.sendRawTransaction(tx.serialize());
  const result=await this.connection.confirmTransaction({...b,signature:sig},'finalized');
  if(result.value.err)throw new Fault(502,'settlement_failed');
  return sig;
 }
}
