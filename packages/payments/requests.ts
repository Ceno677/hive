import {Transaction} from '@solana/web3.js';
import bs58 from 'bs58';
import type {PrismaClient,Prisma} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import type {Config} from '../shared/config.js';
import {missing,mintKeys,paymentKeys} from '../shared/config.js';
import {Fault,hash} from '../shared/domain.js';
import {serial,event} from '../database/client.js';
import type {Chain} from '../solana/chain.js';
import type {Engine} from '../orchestrator/engine.js';
import {mintPriceBaseUnits} from '../shared/mint-price.js';
import {allocateHolderRevenue,DasHolderSnapshot,type HolderSnapshotSource} from './holders.js';
export function sameMessage(prepared:string,signed:string){
 try{
  const a=Transaction.from(Buffer.from(prepared,'base64')),b=Transaction.from(Buffer.from(signed,'base64'));
  if(!a.serializeMessage().equals(b.serializeMessage())||!b.verifySignatures())throw Error();
  return bs58.encode(b.signature!);
 }catch{throw new Fault(400,'transaction_mismatch');}
}
export class Payments {
 private holderSource:HolderSnapshotSource;
 constructor(private db:PrismaClient,private chain:Chain,private engine:Engine,private c:Config,holderSource?:HolderSnapshotSource){
  this.holderSource=holderSource??new DasHolderSnapshot(c.HOLDER_SNAPSHOT_RPC_URL??c.SOLANA_RPC_URL);
 }
 require(keys:(keyof Config)[]){const fields=missing(this.c,keys);if(fields.length)throw new Fault(503,'integration_not_configured','Required settings are missing',{fields});}
 async prepare(wallet:string,id:string){
  this.require(paymentKeys(this.c));
  const flow=await this.db.workflow.findUnique({where:{id}});
  if(!flow||flow.wallet!==wallet)throw new Fault(404,'not_found');
  if(!['QUOTED','AWAITING_FUNDS'].includes(flow.status)||flow.expiresAt<=new Date())throw new Fault(409,'quote_not_payable');
  const existing=await this.db.chainOperation.findUnique({where:{operationKey:'fund:'+id}});
  if(existing?.signature)throw new Fault(409,'payment_already_submitted');
  const deadlineAt=new Date(Date.now()+flow.deadlineHours*3600000),deadline=Math.floor(deadlineAt.getTime()/1000);
  const prepared=await this.chain.prepareFund(wallet,id,flow.amount,flow.planHash!,deadline);
  await serial(async tx=>{
   const f=await tx.workflow.findUniqueOrThrow({where:{id}});
   if(f.status!=='QUOTED'&&f.status!=='AWAITING_FUNDS')throw new Fault(409,'quote_not_payable');
   const op=await tx.chainOperation.findUnique({where:{operationKey:'fund:'+id}});
   if(op?.signature)throw new Fault(409,'payment_already_submitted');
   await tx.chainOperation.upsert({where:{operationKey:'fund:'+id},create:{workflowId:id,operationKey:'fund:'+id,kind:'FUND',transaction:prepared.transaction,lastValidBlockHeight:prepared.lastValidBlockHeight},update:{transaction:prepared.transaction,lastValidBlockHeight:prepared.lastValidBlockHeight}});
   await tx.workflow.update({where:{id},data:{status:'AWAITING_FUNDS',escrow:prepared.escrow,deadlineAt}});
  },this.db);
  return prepared;
 }
 async broadcast(wallet:string,key:string,signed:string){
  const op=await this.db.chainOperation.findUnique({where:{operationKey:key},include:{workflow:true}});
  if(!op?.transaction)throw new Fault(404,'transaction_not_prepared');
  if(op.workflow?op.workflow.wallet!==wallet:(await this.db.mintRequest.findUnique({where:{id:op.mintRequestId!}}))?.wallet!==wallet)throw new Fault(404,'not_found');
  const signature=sameMessage(op.transaction,signed);
  await serial(async tx=>{
   const current=await tx.chainOperation.findUniqueOrThrow({where:{id:op.id}});
   if(!['PREPARED','SUBMITTED'].includes(current.state))throw new Fault(409,'payment_attempt_closed');
   if(!current.transaction||sameMessage(current.transaction,signed)!==signature)throw new Fault(409,'payment_attempt_changed');
   if(current.signature&&current.signature!==signature)throw new Fault(409,'payment_attempt_conflict');
   await tx.chainOperation.update({where:{id:op.id},data:{state:'SUBMITTED',signature}});
  },this.db);
  try{await this.chain.broadcast(signed);}catch{ /* Unknown RPC outcome is reconciled, never treated as failed payment. */ }
  return{signature,state:'SUBMITTED'};
 }
 async reconcile(){
  for(const original of await this.db.chainOperation.findMany({where:{state:{in:['PREPARED','SUBMITTED']}},take:100})){
   let op=original;
   // Check finalized height before receipt lookup so an expiring broadcast cannot be missed.
   const expired=!op.signature&&op.lastValidBlockHeight&&this.chain.transactionExpired?await this.chain.transactionExpired(op.lastValidBlockHeight):false;
   if(!op.signature&&this.chain.operationSignature){
    const req=op.mintRequestId?await this.db.mintRequest.findUniqueOrThrow({where:{id:op.mintRequestId}}):null;
    const signature=await this.chain.operationSignature(op.workflowId??req!.id,op.kind as 'FUND'|'MINT'|'REFUND',req?.seatId);
    if(signature)op=await this.db.chainOperation.update({where:{id:op.id},data:{signature,state:'SUBMITTED'}});
   }
   // A never-sent prepared transaction also expires; its reservation is then safe to release.
   if(!op.signature&&op.lastValidBlockHeight&&this.chain.transactionExpired){
    if(expired){
     await serial(async tx=>{
      await tx.chainOperation.update({where:{id:op.id},data:{state:'EXPIRED'}});
      if(op.mintRequestId)await tx.mintRequest.update({where:{id:op.mintRequestId},data:{state:'FAILED'}});
      if(op.workflowId)await tx.workflow.updateMany({where:{id:op.workflowId,status:{in:['CANCEL_REQUESTED','AWAITING_FUNDS']}},data:{status:(await tx.workflow.findUniqueOrThrow({where:{id:op.workflowId}})).status==='CANCEL_REQUESTED'?'CANCELLED':'PAYMENT_FAILED'}});
     },this.db);
    }
    continue;
   }
   if(op.signature&&op.lastValidBlockHeight&&this.chain.transactionState){
    const state=await this.chain.transactionState(op.signature,op.lastValidBlockHeight);
    if(state==='FAILED'||state==='EXPIRED'){
     await serial(async tx=>{
      await tx.chainOperation.update({where:{id:op.id},data:{state,error:'chain_'+state.toLowerCase()}});
      if(op.mintRequestId)await tx.mintRequest.update({where:{id:op.mintRequestId},data:{state:'FAILED'}});
      if(op.workflowId)await tx.workflow.updateMany({where:{id:op.workflowId,status:{in:['AWAITING_FUNDS','CANCEL_REQUESTED']}},data:{status:(await tx.workflow.findUniqueOrThrow({where:{id:op.workflowId}})).status==='CANCEL_REQUESTED'?'CANCELLED':'PAYMENT_FAILED',failure:'chain_'+state.toLowerCase()}});
     },this.db);continue;
    }
   }
   if(!op.signature||!await this.chain.finalized(op.signature))continue;
   if(op.kind==='FUND')await this.engine.admit(op.workflowId!,op.signature);
   if(op.kind==='MINT'){
    const req=await this.db.mintRequest.findUniqueOrThrow({where:{id:op.mintRequestId!}});
    const seat=await this.chain.minted(req.wallet,req.seatId,req.id,req.mint);
    if(!seat)continue;
    await serial(async tx=>{
     await tx.seat.update({where:{id:req.seatId},data:{mint:seat.mint,ownerWallet:null,checkedAt:null,slot:BigInt(seat.slot)}});
     await tx.mintRequest.update({where:{id:req.id},data:{state:'MINTED',signature:op.signature,mint:seat.mint}});
    },this.db);
   }
   if(op.kind==='REFUND'){
    const flow=await this.db.workflow.findUniqueOrThrow({where:{id:op.workflowId!}});
    if(!this.chain.refunded||!await this.chain.refunded(flow.wallet,flow.id,flow.amount))continue;
    await serial(async tx=>{
     await tx.workflow.updateMany({where:{id:flow.id,status:'REFUND_PENDING'},data:{status:'CANCELLED'}});
     await tx.ledgerEntry.upsert({where:{operationKey:'refund:'+flow.id},create:{operationKey:'refund:'+flow.id,workflowId:flow.id,kind:'REFUND',amount:flow.amount,beneficiary:flow.wallet,signature:op.signature!},update:{signature:op.signature!}});
     await event(tx,flow.id,'payment.refunded');
    },this.db);
   }
   await this.db.chainOperation.update({where:{id:op.id},data:{state:'FINALIZED'}});
  }
 }
 async mintQuote(wallet:string,key:string,seatId:number){
  this.require(mintKeys(this.c));
  if(!this.chain.tokenInfo)throw new Fault(503,'token_information_unavailable');
  if(mintPriceBaseUnits((await this.chain.tokenInfo()).decimals)!==this.c.HMD_BURN_AMOUNT)throw new Fault(503,'mint_price_mismatch','Mint price must equal 8,888 HMD');
  return serial(async tx=>{
   const inputHash=hash({seatId}),old=await tx.mintRequest.findUnique({where:{wallet_requestKey:{wallet,requestKey:key}}});
   if(old){if(old.inputHash!==inputHash)throw new Fault(409,'request_key_conflict');return old;}
   const claimed=await tx.mintRequest.count({where:{wallet,OR:[{state:'MINTED'},{state:{in:['QUOTED','PREPARED','SUBMITTED']},OR:[{expiresAt:{gt:new Date()}},{state:{in:['PREPARED','SUBMITTED']}}]}]}});
   if(claimed>=Number(this.c.MAX_SEATS_PER_WALLET))throw new Fault(409,'wallet_mint_limit');
   const seat=await tx.seat.findUnique({where:{id:seatId}});
   if(!seat||seat.mint)throw new Fault(409,'seat_unavailable');
   const reservations=await tx.mintRequest.count({where:{seatId,state:{in:['QUOTED','PREPARED','SUBMITTED']},OR:[{expiresAt:{gt:new Date()}},{state:{in:['PREPARED','SUBMITTED']}}]}});
   if(reservations)throw new Fault(409,'seat_reserved');
   return tx.mintRequest.create({data:{wallet,requestKey:key,inputHash,seatId,amount:this.c.HMD_BURN_AMOUNT!,expiresAt:new Date(Date.now()+600000)}});
  },this.db);
 }
 async prepareExpiredRefund(wallet:string,id:string){
  if(!this.chain.prepareExpiredRefund)throw new Fault(503,'refund_unavailable');
  let flow=await this.db.workflow.findUnique({where:{id}});
  if(!flow||flow.wallet!==wallet)throw new Fault(404,'not_found');
  if(!flow.deadlineAt||flow.deadlineAt>new Date())throw new Fault(409,'refund_not_available');
  if(flow.status!=='REFUND_PENDING')flow=await this.engine.expire(id);
  const prepared=await this.chain.prepareExpiredRefund(wallet,id);
  await this.db.chainOperation.upsert({where:{operationKey:'refund-expired:'+id},create:{workflowId:id,operationKey:'refund-expired:'+id,kind:'REFUND',transaction:prepared.transaction,lastValidBlockHeight:prepared.lastValidBlockHeight},update:{state:'PREPARED',signature:null,transaction:prepared.transaction,lastValidBlockHeight:prepared.lastValidBlockHeight,error:null}});
  return prepared;
 }
 async prepareMint(wallet:string,id:string){
  this.require(mintKeys(this.c));
  const r=await this.db.mintRequest.findUniqueOrThrow({where:{id}});
  if(r.wallet!==wallet)throw new Fault(404,'not_found');
  if(r.state!=='QUOTED'||r.expiresAt<=new Date())throw new Fault(409,'mint_not_payable');
  const p=await this.chain.prepareMint(wallet,id,r.seatId);
  await serial(async tx=>{
   const change=await tx.mintRequest.updateMany({where:{id,state:'QUOTED',expiresAt:{gt:new Date()}},data:{state:'PREPARED',mint:p.mint}});
   if(!change.count)throw new Fault(409,'mint_already_prepared');
   await tx.chainOperation.create({data:{mintRequestId:id,operationKey:'mint:'+id,kind:'MINT',transaction:p.transaction,lastValidBlockHeight:p.lastValidBlockHeight}});
  },this.db);
  return p;
 }
 async payRewards(){
  if(this.chain.recordWork){
   const tasks=await this.db.task.findMany({where:{state:'ACCEPTED',workflow:{status:'COMPLETED'}},include:{attempts:{where:{kind:'BUILD'},orderBy:{startedAt:'desc'},take:1}}});
   for(const t of tasks){
    if(await this.db.chainOperation.findUnique({where:{operationKey:'record:'+t.id}}))continue;
    const v=await this.db.verification.findFirstOrThrow({where:{state:'ACCEPTED',attempt:{taskId:t.id}},include:{attempt:true},orderBy:{createdAt:'desc'}});
    const signature=await this.chain.recordWork(t.id,v.artifactHash,t.attempts[0].ownerWallet,v.attempt.ownerWallet);
    await this.db.chainOperation.upsert({where:{operationKey:'record:'+t.id},create:{workflowId:t.workflowId,operationKey:'record:'+t.id,kind:'RECORD',state:'FINALIZED',signature},update:{}});
   }
  }
  for(const r of await this.db.reward.findMany({where:{state:{in:['CLAIMABLE','PAYING']},workflow:{status:'COMPLETED'}},take:50,include:{workflow:true}})){
   if(r.state==='CLAIMABLE'){
    const claimed=await this.db.reward.updateMany({where:{id:r.id,state:'CLAIMABLE'},data:{state:'PAYING'}});if(!claimed.count)continue;
   }
   try{
    const retained=this.c.PAYMENT_MODE==='custodial'&&r.kind==='PROTOCOL'&&r.beneficiary===this.c.TREASURY_WALLET;
    const signature=retained?`retained:${r.workflow.fundedSignature}`:await this.chain.settle(r.workflowId,r.beneficiary,r.amount,r.receiptHash);
    await serial(async tx=>{
     const changed=await tx.reward.updateMany({where:{id:r.id,state:'PAYING'},data:{state:'PAID',signature}});if(!changed.count)return;
     await tx.ledgerEntry.upsert({where:{operationKey:'reward:'+r.id},create:{operationKey:'reward:'+r.id,workflowId:r.workflowId,kind:retained?'RETAINED':'PAYOUT',amount:r.amount,beneficiary:r.beneficiary,signature},update:{signature}});
     await event(tx,r.workflowId,'payment.released',{rewardId:r.id,kind:retained?'RETAINED':'PAYOUT'});
    },this.db);
   }catch(error){await this.db.reward.updateMany({where:{id:r.id,state:'PAYING'},data:{state:'CLAIMABLE'}});throw error;}
  }
  if(this.c.PAYMENT_MODE==='custodial'){
   if(!this.chain.burnFee)throw new Fault(503,'fee_burn_not_configured');
   const completed=await this.db.workflow.findMany({where:{status:'COMPLETED',rewards:{some:{},every:{state:'PAID'}}},take:50});
   for(const flow of completed){
    if(await this.db.ledgerEntry.findUnique({where:{operationKey:'burn:'+flow.id}}))continue;
    const receipt=hash({id:flow.id,kind:'CUSTOMER_FEE_BURN',amount:flow.amount});
    const operation=await this.db.chainOperation.upsert({where:{operationKey:'burn:'+flow.id},create:{workflowId:flow.id,operationKey:'burn:'+flow.id,kind:'BURN',state:'PREPARED'},update:{}});
    if(operation.state==='FINALIZED')continue;
    const claim='claim:'+randomUUID(),claimed=await this.db.chainOperation.updateMany({where:{id:operation.id,OR:[{state:{in:['PREPARED','FAILED']}},{state:'PAYING',updatedAt:{lt:new Date(Date.now()-15*60000)}}]},data:{state:'PAYING',error:claim}});
    if(!claimed.count)continue;
    try{
     const signature=await this.chain.burnFee(flow.id,flow.amount,receipt);
     await serial(async tx=>{
      const finalized=await tx.chainOperation.updateMany({where:{id:operation.id,state:'PAYING',error:claim},data:{state:'FINALIZED',signature,error:null}});if(!finalized.count)return;
      await tx.ledgerEntry.upsert({where:{operationKey:'burn:'+flow.id},create:{operationKey:'burn:'+flow.id,workflowId:flow.id,kind:'BURN',amount:flow.amount,signature},update:{signature}});
      await event(tx,flow.id,'payment.burned',{amount:flow.amount});
     },this.db);
    }catch(error){
     await this.db.chainOperation.updateMany({where:{id:operation.id,state:'PAYING',error:claim},data:{state:'FAILED',error:(error instanceof Error?error.message:'fee burn failed').slice(0,1000)}});
     throw error;
    }
   }
  }
  for(const f of await this.db.workflow.findMany({where:{status:{in:['REFUND_PENDING','REFUND_SENDING']}},take:50})){
   if(await this.db.reward.count({where:{workflowId:f.id}}))throw new Fault(409,'earned_rewards_prevent_full_refund');
   if(f.status==='REFUND_PENDING'){
    const claimed=await this.db.workflow.updateMany({where:{id:f.id,status:'REFUND_PENDING'},data:{status:'REFUND_SENDING'}});if(!claimed.count)continue;
   }
   try{
    const signature=await this.chain.settle(f.id,f.wallet,f.amount,hash({id:f.id,refund:true}),true);
    await serial(async tx=>{
     const changed=await tx.workflow.updateMany({where:{id:f.id,status:'REFUND_SENDING'},data:{status:'CANCELLED'}});if(!changed.count)return;
     await tx.ledgerEntry.upsert({where:{operationKey:'refund:'+f.id},create:{operationKey:'refund:'+f.id,workflowId:f.id,kind:'REFUND',amount:f.amount,beneficiary:f.wallet,signature},update:{signature}});
     await event(tx,f.id,'payment.refunded');
    },this.db);
   }catch(error){await this.db.workflow.updateMany({where:{id:f.id,status:'REFUND_SENDING'},data:{status:'REFUND_PENDING'}});throw error;}
  }
 }
 async prepareHolderDistribution(now=new Date(),force=false){
  if(this.c.HOLDER_DISTRIBUTIONS_ENABLED!=='true')return null;
  if(this.c.PAYMENT_MODE!=='custodial'||!this.c.SEAT_COLLECTION_ADDRESS)throw new Fault(503,'holder_distributions_not_configured');
  const cutoff=new Date(now),eligible=await this.db.reward.findMany({where:{kind:'PROTOCOL',state:'PAID',signature:{startsWith:'retained:'},holderDistributionId:null,createdAt:{lte:cutoff}},orderBy:{createdAt:'asc'}});
  if(!eligible.length)return null;
  if(!force&&eligible[0].createdAt.getTime()+this.c.HOLDER_DISTRIBUTION_INTERVAL_HOURS*3600000>now.getTime())return null;
  const initialTotal=eligible.reduce((sum,row)=>sum+BigInt(row.amount),0n);
  if(this.c.HOLDER_DISTRIBUTION_MIN_AMOUNT&&initialTotal<BigInt(this.c.HOLDER_DISTRIBUTION_MIN_AMOUNT))return null;
  const snapshot=await this.holderSource.snapshot(this.c.SEAT_COLLECTION_ADDRESS);
  if(!snapshot.assets.length)return null;
  const distributionId=randomUUID(),salt=this.c.SEAT_COLLECTION_ADDRESS+':'+cutoff.toISOString();
  return serial(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('hive-holder-distribution'))`;
   const rewards=await tx.reward.findMany({where:{kind:'PROTOCOL',state:'PAID',signature:{startsWith:'retained:'},holderDistributionId:null,createdAt:{lte:cutoff}},orderBy:{createdAt:'asc'}});
   if(!rewards.length)return null;
   const total=rewards.reduce((sum,row)=>sum+BigInt(row.amount),0n);
   if(this.c.HOLDER_DISTRIBUTION_MIN_AMOUNT&&total<BigInt(this.c.HOLDER_DISTRIBUTION_MIN_AMOUNT))return null;
   const allocated=allocateHolderRevenue(total,snapshot.assets,Number(this.c.MAX_SEATS_PER_WALLET),salt);
   const orderedSnapshot=[...snapshot.assets].sort((a,b)=>a.assetId.localeCompare(b.assetId));
   const distribution=await tx.holderDistribution.create({data:{
    id:distributionId,status:'PREPARED',collection:this.c.SEAT_COLLECTION_ADDRESS!,snapshotSlot:snapshot.slot,snapshotHash:allocated.snapshotHash,
    snapshot:orderedSnapshot as unknown as Prisma.InputJsonValue,totalAmount:total.toString(),eligibleSeats:allocated.eligibleSeats,excludedSeats:allocated.excludedSeats,cutoffAt:cutoff,
    entries:{create:allocated.allocations.map(row=>({...row,receiptHash:hash({kind:'HOLDER_DISTRIBUTION',distributionId,wallet:row.wallet,amount:row.amount,assetIds:row.assetIds})}))}
   }});
   await tx.reward.updateMany({where:{id:{in:rewards.map(row=>row.id)},holderDistributionId:null},data:{holderDistributionId:distribution.id}});
   return distribution;
  },this.db);
 }
 async payHolderDistributions(){
  if(this.c.HOLDER_DISTRIBUTIONS_ENABLED!=='true')return{paid:0,pending:0};
  let paid=0;
  for(const distribution of await this.db.holderDistribution.findMany({where:{status:{in:['PREPARED','PAYING']}},orderBy:{createdAt:'asc'},take:3})){
   await this.db.holderDistribution.updateMany({where:{id:distribution.id,status:'PREPARED'},data:{status:'PAYING'}});
   const entries=await this.db.holderDistributionEntry.findMany({where:{distributionId:distribution.id,state:{in:['CLAIMABLE','PAYING']}},orderBy:{wallet:'asc'},take:25});
   for(const entry of entries){
    if(entry.state==='CLAIMABLE'){
     const claimed=await this.db.holderDistributionEntry.updateMany({where:{id:entry.id,state:'CLAIMABLE'},data:{state:'PAYING',error:null}});if(!claimed.count)continue;
    }
    try{
     const signature=await this.chain.settle('holder:'+distribution.id,entry.wallet,entry.amount,entry.receiptHash);
     await serial(async tx=>{
      const changed=await tx.holderDistributionEntry.updateMany({where:{id:entry.id,state:'PAYING'},data:{state:'PAID',signature,error:null}});if(!changed.count)return;
      await tx.ledgerEntry.upsert({where:{operationKey:'holder:'+entry.id},create:{operationKey:'holder:'+entry.id,workflowId:'holder:'+distribution.id,kind:'HOLDER_DISTRIBUTION',amount:entry.amount,beneficiary:entry.wallet,signature},update:{signature}});
     },this.db);paid++;
    }catch(error){
     const message=(error instanceof Error?error.message:'holder payout failed').slice(0,1000);
     await this.db.holderDistributionEntry.updateMany({where:{id:entry.id,state:'PAYING'},data:{state:'CLAIMABLE',error:message}});
    }
   }
   const pending=await this.db.holderDistributionEntry.count({where:{distributionId:distribution.id,state:{not:'PAID'}}});
   if(!pending)await this.db.holderDistribution.updateMany({where:{id:distribution.id,status:{in:['PREPARED','PAYING']}},data:{status:'COMPLETED',completedAt:new Date()}});
  }
  return{paid,pending:await this.db.holderDistributionEntry.count({where:{state:{in:['CLAIMABLE','PAYING']}}})};
 }
}
