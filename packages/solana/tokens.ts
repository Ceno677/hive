import {Connection,PublicKey,SystemProgram,TransactionInstruction} from '@solana/web3.js';
import {Fault} from '../shared/domain.js';
export const TOKEN_PROGRAM_ID=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID=new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export function getAssociatedTokenAddressSync(mint:PublicKey,owner:PublicKey,allowOffCurve=false){
 if(!allowOffCurve&&!PublicKey.isOnCurve(owner.toBytes()))throw new Fault(400,'invalid_token_owner');
 return PublicKey.findProgramAddressSync([owner.toBuffer(),TOKEN_PROGRAM_ID.toBuffer(),mint.toBuffer()],ASSOCIATED_TOKEN_PROGRAM_ID)[0];
}
// Classic SPL Token mint layout only; Token-2022 and extensions are intentionally rejected.
export async function getMint(connection:Connection,mint:PublicKey,_commitment='finalized',program=TOKEN_PROGRAM_ID){
 const a=await connection.getAccountInfo(mint,'finalized');
 if(!a||!a.owner.equals(program)||a.data.length!==82||a.data[45]!==1)throw new Fault(503,'unsupported_token_mint');
 return{decimals:a.data[44],supply:a.data.readBigUInt64LE(36)};
}
const amountData=(instruction:number,amount:string|bigint,decimals:number)=>{
 const data=Buffer.alloc(10);data[0]=instruction;data.writeBigUInt64LE(BigInt(amount),1);data[9]=decimals;return data;
};
export function createAssociatedTokenAccountIdempotentInstruction(payer:PublicKey,ata:PublicKey,owner:PublicKey,mint:PublicKey){
 return new TransactionInstruction({programId:ASSOCIATED_TOKEN_PROGRAM_ID,keys:[
  {pubkey:payer,isSigner:true,isWritable:true},{pubkey:ata,isSigner:false,isWritable:true},{pubkey:owner,isSigner:false,isWritable:false},
  {pubkey:mint,isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}
 ],data:Buffer.from([1])});
}
export function createTransferCheckedInstruction(source:PublicKey,mint:PublicKey,destination:PublicKey,owner:PublicKey,amount:string|bigint,decimals:number){
 return new TransactionInstruction({programId:TOKEN_PROGRAM_ID,keys:[
  {pubkey:source,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false},{pubkey:destination,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:false}
 ],data:amountData(12,amount,decimals)});
}
export function createBurnCheckedInstruction(account:PublicKey,mint:PublicKey,owner:PublicKey,amount:string|bigint,decimals:number){
 return new TransactionInstruction({programId:TOKEN_PROGRAM_ID,keys:[
  {pubkey:account,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:false}
 ],data:amountData(15,amount,decimals)});
}
