import {readFile} from 'node:fs/promises';
import {Connection,Keypair,PublicKey,Transaction,TransactionInstruction} from '@solana/web3.js';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {createNoopSigner,createSignerFromKeypair,keypairIdentity,percentAmount,publicKey} from '@metaplex-foundation/umi';
import {fromWeb3JsKeypair,toWeb3JsInstruction} from '@metaplex-foundation/umi-web3js-adapters';
import {createNft,fetchDigitalAsset,findMetadataPda,mplTokenMetadata,verifyCollectionV1} from '@metaplex-foundation/mpl-token-metadata';
import type {Config} from '../shared/config.js';
import {Fault} from '../shared/domain.js';
import {mintPriceBaseUnits} from '../shared/mint-price.js';
import type {Chain,Ownership} from './chain.js';
import {resilientConnection} from './chain.js';
import {createAssociatedTokenAccountIdempotentInstruction,createBurnCheckedInstruction,createTransferCheckedInstruction,getAssociatedTokenAddressSync,getMint,TOKEN_PROGRAM_ID} from './tokens.js';

const MEMO_PROGRAM_ID=new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const memoInstruction=(text:string,signer:PublicKey)=>new TransactionInstruction({programId:MEMO_PROGRAM_ID,keys:[{pubkey:signer,isSigner:true,isWritable:false}],data:Buffer.from(text)});
const seatName=(id:number)=>`hive.md Agent #${String(id).padStart(3,'0')}`;

export class CustodialSolanaChain implements Chain {
 readonly connection:Connection;
 constructor(private c:Config){
  this.connection=resilientConnection(new Connection(c.SOLANA_RPC_URL,'finalized'),c.SOLANA_BACKUP_RPC_URL?new Connection(c.SOLANA_BACKUP_RPC_URL,'finalized'):undefined);
 }
 private async signer(){
  if(!this.c.CUSTODY_KEYPAIR_PATH)throw new Fault(503,'custody_signer_not_configured');
  const signer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(this.c.CUSTODY_KEYPAIR_PATH,'utf8'))));
  if(this.c.TREASURY_WALLET&&signer.publicKey.toBase58()!==this.c.TREASURY_WALLET)throw new Fault(503,'custody_treasury_mismatch');
  return signer;
 }
 private async hmd(){
  if(!this.c.HMD_MINT)throw new Fault(503,'hmd_not_configured');
  const mint=new PublicKey(this.c.HMD_MINT);await getMint(this.connection,mint,'finalized',TOKEN_PROGRAM_ID);return mint;
 }
 async tokenInfo(){const mint=await this.hmd(),info=await getMint(this.connection,mint);return{mint:mint.toBase58(),decimals:info.decimals};}
 async validateMintPolicy(){
  if(!this.c.HMD_BURN_AMOUNT||!this.c.SEAT_COLLECTION_ADDRESS||!this.c.MINT_BASE_URI)throw new Fault(503,'mint_not_configured');
  const token=await this.tokenInfo();if(mintPriceBaseUnits(token.decimals)!==this.c.HMD_BURN_AMOUNT)throw new Fault(503,'mint_price_mismatch');
  const authority=await this.signer(),asset=await fetchDigitalAsset(createUmi(this.c.SOLANA_RPC_URL).use(mplTokenMetadata()),publicKey(this.c.SEAT_COLLECTION_ADDRESS));
  if(asset.metadata.collectionDetails.__option!=='Some'||asset.metadata.updateAuthority!==publicKey(authority.publicKey))throw new Fault(503,'collection_authority_mismatch');
  if(!/^https:\/\//.test(this.c.MINT_BASE_URI))throw new Fault(503,'mint_metadata_unavailable');
 }
 async ownership(wallet:string,mint:string):Promise<Ownership>{
  if(!this.c.SEAT_COLLECTION_ADDRESS)throw new Fault(503,'collection_not_configured');
  const load=async(url:string)=>fetchDigitalAsset(createUmi(url).use(mplTokenMetadata()),publicKey(mint));
  let asset;try{asset=await load(this.c.SOLANA_RPC_URL);}catch(error){if(!this.c.SOLANA_BACKUP_RPC_URL)throw error;asset=await load(this.c.SOLANA_BACKUP_RPC_URL);}
  if(asset.metadata.collection.__option!=='Some'||!asset.metadata.collection.value.verified||asset.metadata.collection.value.key!==this.c.SEAT_COLLECTION_ADDRESS)throw new Fault(403,'not_collection_member');
  if(asset.mint.decimals!==0||asset.mint.supply!==1n)throw new Fault(403,'not_unique_nft');
  const result=await this.connection.getParsedTokenAccountsByOwner(new PublicKey(wallet),{mint:new PublicKey(mint)},'finalized');
  if(!result.value.some(a=>a.account.owner.equals(TOKEN_PROGRAM_ID)&&a.account.data.parsed.info.tokenAmount.amount==='1'))throw new Fault(403,'seat_not_owned');
  return{wallet,mint,slot:result.context.slot};
 }
 private async encode(wallet:PublicKey,instructions:TransactionInstruction[],signers:Keypair[]=[]){
  const block=await this.connection.getLatestBlockhash('finalized');
  const tx=new Transaction({feePayer:wallet,...block}).add(...instructions);
  if(signers.length)tx.partialSign(...signers);
  const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});
  if(bytes.length>1232)throw new Fault(503,'transaction_too_large');
  return{transaction:bytes.toString('base64'),lastValidBlockHeight:block.lastValidBlockHeight};
 }
 async prepareFund(wallet:string,id:string,amount:string,planHash:string,deadline:number){
  const payer=new PublicKey(wallet),mint=await this.hmd(),treasury=await this.signer(),info=await getMint(this.connection,mint);
  const source=getAssociatedTokenAddressSync(mint,payer),destination=getAssociatedTokenAddressSync(mint,treasury.publicKey);
  const memo=`hive:fund:${id}:${amount}:${planHash}:${deadline}`;
  const instructions=[createAssociatedTokenAccountIdempotentInstruction(payer,destination,treasury.publicKey,mint),createTransferCheckedInstruction(source,mint,destination,payer,amount,info.decimals),memoInstruction(memo,payer)];
  return{...await this.encode(payer,instructions),escrow:`custodial:${id}`};
 }
 private parsedTransfer(transaction:any,source:PublicKey,destination:PublicKey,authority:PublicKey,mint:PublicKey,amount:string){
  return transaction?.transaction?.message?.instructions?.some((instruction:any)=>{
   const parsed=instruction?.parsed;if(parsed?.type!=='transferChecked')return false;
   const info=parsed.info??{},tokenAmount=info.tokenAmount??{};
   return info.source===source.toBase58()&&info.destination===destination.toBase58()&&info.authority===authority.toBase58()&&info.mint===mint.toBase58()&&String(tokenAmount.amount)===amount;
  })??false;
 }
 private parsedMemo(transaction:any,memo:string){
  return transaction?.transaction?.message?.instructions?.some((instruction:any)=>instruction?.programId?.toBase58?.()===MEMO_PROGRAM_ID.toBase58()&&(instruction.parsed===memo||instruction.parsed?.memo===memo))??false;
 }
 async funded(wallet:string,id:string,amount:string,planHash:string,deadline:number,signature?:string){
  if(!signature)return false;
  const payer=new PublicKey(wallet),mint=await this.hmd(),treasury=await this.signer();
  const tx=await this.connection.getParsedTransaction(signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
  if(!tx||tx.meta?.err)return false;
  const signed=tx.transaction.message.accountKeys.some(key=>key.pubkey.equals(payer)&&key.signer);
  return signed&&this.parsedTransfer(tx,getAssociatedTokenAddressSync(mint,payer),getAssociatedTokenAddressSync(mint,treasury.publicKey),payer,mint,amount)&&this.parsedMemo(tx,`hive:fund:${id}:${amount}:${planHash}:${deadline}`);
 }
 async prepareMint(wallet:string,id:string,seatId:number){
  if(!this.c.SEAT_COLLECTION_ADDRESS||!this.c.MINT_BASE_URI||!this.c.HMD_BURN_AMOUNT)throw new Fault(503,'mint_not_configured');
  const owner=new PublicKey(wallet),hmd=await this.hmd(),token=await getMint(this.connection,hmd),authority=await this.signer();
  if(mintPriceBaseUnits(token.decimals)!==this.c.HMD_BURN_AMOUNT)throw new Fault(503,'mint_price_mismatch');
  const collectionMint=new PublicKey(this.c.SEAT_COLLECTION_ADDRESS),umi=createUmi(this.c.SOLANA_RPC_URL).use(mplTokenMetadata());
  const collection=await fetchDigitalAsset(umi,publicKey(collectionMint));
  if(collection.metadata.collectionDetails.__option!=='Some'||collection.metadata.updateAuthority!==publicKey(authority.publicKey))throw new Fault(503,'collection_authority_mismatch');
  const mint=Keypair.generate(),authoritySigner=createSignerFromKeypair(umi,fromWeb3JsKeypair(authority)),mintSigner=createSignerFromKeypair(umi,fromWeb3JsKeypair(mint));
  umi.use(keypairIdentity(authoritySigner));
  const payer=createNoopSigner(publicKey(owner)),mintPk=mintSigner.publicKey,collectionPk=publicKey(collectionMint);
  const builder=createNft(umi,{mint:mintSigner,payer,authority:authoritySigner,updateAuthority:authoritySigner,tokenOwner:publicKey(owner),name:seatName(seatId),symbol:'HMD',uri:`${this.c.MINT_BASE_URI.replace(/\/$/,'')}/${seatId}.json`,sellerFeeBasisPoints:percentAmount(0),isMutable:false,collection:{key:collectionPk,verified:false}})
   .add(verifyCollectionV1(umi,{authority:authoritySigner,metadata:findMetadataPda(umi,{mint:mintPk}),collectionMint:collectionPk}));
  const burn=createBurnCheckedInstruction(getAssociatedTokenAddressSync(hmd,owner),hmd,owner,this.c.HMD_BURN_AMOUNT,token.decimals);
  const prepared=await this.encode(owner,[burn,...builder.getInstructions().map(toWeb3JsInstruction),memoInstruction(`hive:mint:${id}:${seatId}:${mint.publicKey.toBase58()}`,authority.publicKey)],[authority,mint]);
  return{...prepared,mint:mint.publicKey.toBase58()};
 }
 async minted(wallet:string,seatId:number,_requestId:string,expectedMint?:string|null){
  if(!expectedMint||!this.c.SEAT_COLLECTION_ADDRESS||!this.c.MINT_BASE_URI)throw new Fault(409,'mint_receipt_missing');
  const asset=await fetchDigitalAsset(createUmi(this.c.SOLANA_RPC_URL).use(mplTokenMetadata()),publicKey(expectedMint));
  if(asset.metadata.name.trim()!==seatName(seatId)||asset.metadata.uri!==`${this.c.MINT_BASE_URI.replace(/\/$/,'')}/${seatId}.json`)throw new Fault(409,'mint_metadata_mismatch');
  if(asset.metadata.collection.__option!=='Some'||!asset.metadata.collection.value.verified||asset.metadata.collection.value.key!==this.c.SEAT_COLLECTION_ADDRESS)throw new Fault(409,'mint_collection_mismatch');
  if(asset.mint.decimals!==0||asset.mint.supply!==1n)throw new Fault(409,'mint_supply_mismatch');
  const result=await this.connection.getParsedTokenAccountsByOwner(new PublicKey(wallet),{mint:new PublicKey(expectedMint)},'finalized');
  if(!result.value.some(a=>a.account.data.parsed.info.tokenAmount.amount==='1'))throw new Fault(409,'mint_owner_mismatch');
  return{mint:expectedMint,slot:result.context.slot};
 }
 async finalized(signature:string){
  const r=await this.connection.getSignatureStatuses([signature],{searchTransactionHistory:true});return r.value[0]?.confirmationStatus==='finalized'&&r.value[0].err===null;
 }
 async transactionExpired(lastValidHeight:number){return await this.connection.getBlockHeight('finalized')>lastValidHeight;}
 private async signatureWithMemo(address:PublicKey,prefix:string){
  for(const row of await this.connection.getSignaturesForAddress(address,{limit:100},'finalized')){
   if(row.err)continue;const tx=await this.connection.getParsedTransaction(row.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
   const found=tx?.transaction.message.instructions.some((instruction:any)=>{
    if(instruction?.programId?.toBase58?.()!==MEMO_PROGRAM_ID.toBase58())return false;
    const value=typeof instruction.parsed==='string'?instruction.parsed:instruction.parsed?.memo;return typeof value==='string'&&value.startsWith(prefix);
   });
   if(found)return row.signature;
  }
  return null;
 }
 async operationSignature(id:string,kind:'FUND'|'MINT'|'REFUND',seatId?:number){
  const authority=await this.signer();
  if(kind==='MINT')return this.signatureWithMemo(authority.publicKey,`hive:mint:${id}:${seatId}:`);
  if(kind==='FUND'){
   const mint=await this.hmd();return this.signatureWithMemo(getAssociatedTokenAddressSync(mint,authority.publicKey),`hive:fund:${id}:`);
  }
  return null;
 }
 async transactionState(signature:string,lastValidHeight:number):Promise<'PENDING'|'FINALIZED'|'FAILED'|'EXPIRED'>{
  const s=(await this.connection.getSignatureStatuses([signature],{searchTransactionHistory:true})).value[0];
  if(s?.err)return'FAILED';if(s?.confirmationStatus==='finalized')return'FINALIZED';if(!s&&await this.connection.getBlockHeight('finalized')>lastValidHeight)return'EXPIRED';return'PENDING';
 }
 async broadcast(transaction:string){
  const tx=Transaction.from(Buffer.from(transaction,'base64'));if(!tx.verifySignatures())throw new Fault(400,'invalid_transaction_signature');
  return this.connection.sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:3});
 }
 private async priorSettlement(source:PublicKey,memo:string,destination:PublicKey,mint:PublicKey,amount:string,authority:PublicKey){
  for(const row of await this.connection.getSignaturesForAddress(source,{limit:30},'finalized')){
   if(row.err)continue;
   const tx=await this.connection.getParsedTransaction(row.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
   if(tx&&!tx.meta?.err&&this.parsedMemo(tx,memo)&&this.parsedTransfer(tx,source,destination,authority,mint,amount))return row.signature;
  }
  return null;
 }
 async settle(_id:string,beneficiary:string,amount:string,receipt:string,_refund=false){
  const authority=await this.signer(),mint=await this.hmd(),token=await getMint(this.connection,mint),to=new PublicKey(beneficiary);
  if(to.equals(authority.publicKey))throw new Fault(409,'treasury_share_requires_no_transfer');
  const source=getAssociatedTokenAddressSync(mint,authority.publicKey),destination=getAssociatedTokenAddressSync(mint,to),memo=`hive:settle:${receipt}`;
  const prior=await this.priorSettlement(source,memo,destination,mint,amount,authority.publicKey);if(prior)return prior;
  const block=await this.connection.getLatestBlockhash('finalized');
  const tx=new Transaction({feePayer:authority.publicKey,...block}).add(createAssociatedTokenAccountIdempotentInstruction(authority.publicKey,destination,to,mint),createTransferCheckedInstruction(source,mint,destination,authority.publicKey,amount,token.decimals),memoInstruction(memo,authority.publicKey));
  tx.sign(authority);const signature=await this.connection.sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:3});
  const result=await this.connection.confirmTransaction({...block,signature},'finalized');if(result.value.err)throw new Fault(502,'settlement_failed');return signature;
 }
}
