import {Commitment,Connection,PublicKey,SystemProgram,TransactionInstruction} from '@solana/web3.js';
import {Fault} from '../shared/domain.js';
export const TOKEN_PROGRAM_ID=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM_ID=new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const ASSOCIATED_TOKEN_PROGRAM_ID=new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const MINT_SIZE=82,TOKEN_ACCOUNT_SIZE=165,TOKEN_2022_MINT_ACCOUNT_TYPE=1;
const SAFE_TOKEN_2022_MINT_EXTENSIONS=new Set<number>([18,19]); // MetadataPointer, TokenMetadata
function token2022Extensions(data:Buffer){
 if(data.length===MINT_SIZE)return[];
 if(data.length<=TOKEN_ACCOUNT_SIZE||data[TOKEN_ACCOUNT_SIZE]!==TOKEN_2022_MINT_ACCOUNT_TYPE)throw new Fault(503,'unsupported_token_mint');
 const extensions:number[]=[];let offset=TOKEN_ACCOUNT_SIZE+1;
 while(offset<data.length){
  if(offset+4>data.length)throw new Fault(503,'unsupported_token_mint');
  const type=data.readUInt16LE(offset),length=data.readUInt16LE(offset+2);offset+=4;
  if(offset+length>data.length)throw new Fault(503,'unsupported_token_mint');
  extensions.push(type);offset+=length;
 }
 return extensions;
}
export function supportedTokenProgram(program:PublicKey){return program.equals(TOKEN_PROGRAM_ID)||program.equals(TOKEN_2022_PROGRAM_ID);}
export function getAssociatedTokenAddressSync(mint:PublicKey,owner:PublicKey,allowOffCurve=false,program=TOKEN_PROGRAM_ID){
 if(!supportedTokenProgram(program))throw new Fault(503,'unsupported_token_program');
 if(!allowOffCurve&&!PublicKey.isOnCurve(owner.toBytes()))throw new Fault(400,'invalid_token_owner');
 return PublicKey.findProgramAddressSync([owner.toBuffer(),program.toBuffer(),mint.toBuffer()],ASSOCIATED_TOKEN_PROGRAM_ID)[0];
}
// Token-2022 support is deliberately narrow: pump.fun metadata extensions do not
// alter balances, transfers, or burns. Accounting-changing extensions are rejected.
export async function getMint(connection:Connection,mint:PublicKey,commitment:Commitment='finalized',expectedProgram?:PublicKey){
 const account=await connection.getAccountInfo(mint,commitment);
 if(!account||!supportedTokenProgram(account.owner)||expectedProgram&&!account.owner.equals(expectedProgram))throw new Fault(503,'unsupported_token_mint');
 if(account.data.length<MINT_SIZE||account.data[45]!==1)throw new Fault(503,'unsupported_token_mint');
 if(account.owner.equals(TOKEN_PROGRAM_ID)&&account.data.length!==MINT_SIZE)throw new Fault(503,'unsupported_token_mint');
 const extensions=account.owner.equals(TOKEN_2022_PROGRAM_ID)?token2022Extensions(account.data):[];
 if(extensions.some(extension=>!SAFE_TOKEN_2022_MINT_EXTENSIONS.has(extension)))throw new Fault(503,'unsupported_token_extension');
 return{decimals:account.data[44],supply:account.data.readBigUInt64LE(36),programId:account.owner,extensions};
}
const amountData=(instruction:number,amount:string|bigint,decimals:number)=>{
 const data=Buffer.alloc(10);data[0]=instruction;data.writeBigUInt64LE(BigInt(amount),1);data[9]=decimals;return data;
};
export function createAssociatedTokenAccountIdempotentInstruction(payer:PublicKey,ata:PublicKey,owner:PublicKey,mint:PublicKey,program=TOKEN_PROGRAM_ID){
 if(!supportedTokenProgram(program))throw new Fault(503,'unsupported_token_program');
 return new TransactionInstruction({programId:ASSOCIATED_TOKEN_PROGRAM_ID,keys:[
  {pubkey:payer,isSigner:true,isWritable:true},{pubkey:ata,isSigner:false,isWritable:true},{pubkey:owner,isSigner:false,isWritable:false},
  {pubkey:mint,isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},{pubkey:program,isSigner:false,isWritable:false}
 ],data:Buffer.from([1])});
}
export function createTransferCheckedInstruction(source:PublicKey,mint:PublicKey,destination:PublicKey,owner:PublicKey,amount:string|bigint,decimals:number,program=TOKEN_PROGRAM_ID){
 if(!supportedTokenProgram(program))throw new Fault(503,'unsupported_token_program');
 return new TransactionInstruction({programId:program,keys:[
  {pubkey:source,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false},{pubkey:destination,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:false}
 ],data:amountData(12,amount,decimals)});
}
export function createBurnCheckedInstruction(account:PublicKey,mint:PublicKey,owner:PublicKey,amount:string|bigint,decimals:number,program=TOKEN_PROGRAM_ID){
 if(!supportedTokenProgram(program))throw new Fault(503,'unsupported_token_program');
 return new TransactionInstruction({programId:program,keys:[
  {pubkey:account,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:false}
 ],data:amountData(15,amount,decimals)});
}
