import {it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {SolanaChain} from '../packages/solana/chain.js';
import {CustodialSolanaChain} from '../packages/solana/custodial.js';
import {createChain} from '../packages/solana/factory.js';
import {createAssociatedTokenAccountIdempotentInstruction,createBurnCheckedInstruction,createTransferCheckedInstruction,getAssociatedTokenAddressSync,TOKEN_PROGRAM_ID} from '../packages/solana/tokens.js';
import {digest} from '../packages/shared/domain.js';
import {Keypair,Transaction,SystemProgram} from '@solana/web3.js';
import {sameMessage} from '../packages/payments/requests.js';
import {config,deliveryKeys,mintKeys,paymentKeys} from '../packages/shared/config.js';
const wallet=Keypair.generate(),to=Keypair.generate().publicKey;
function unsigned(lamports:number){return new Transaction({feePayer:wallet.publicKey,recentBlockhash:Keypair.generate().publicKey.toBase58()}).add(SystemProgram.transfer({fromPubkey:wallet.publicKey,toPubkey:to,lamports}));}
it('accepts the exact prepared message after wallet signing',()=>{
 const tx=unsigned(1),prepared=tx.serialize({requireAllSignatures:false}).toString('base64');tx.sign(wallet);
 expect(sameMessage(prepared,tx.serialize().toString('base64'))).toBeTruthy();
});
it('rejects replacement transactions even when legitimately signed',()=>{
 const original=unsigned(1),prepared=original.serialize({requireAllSignatures:false}).toString('base64'),changed=unsigned(1000);changed.sign(wallet);
 expect(()=>sameMessage(prepared,changed.serialize().toString('base64'))).toThrow('transaction_mismatch');
});
it('rejects unsigned approvals',()=>{
 const tx=unsigned(1),prepared=tx.serialize({requireAllSignatures:false}).toString('base64');
 expect(()=>sameMessage(prepared,prepared)).toThrow();
});
it('does not invent a production settlement policy',()=>expect(config({NODE_ENV:'test'}).SETTLEMENT_POLICY).toBeUndefined());
it('rejects invalid monetary configuration',()=>{
 expect(()=>config({HMD_BURN_AMOUNT:'1.5'})).toThrow();
 expect(()=>config({JOB_MIN_PRICE_USD:'100',JOB_MAX_PRICE_USD:'50'})).toThrow();
 expect(()=>config({BUILDER_BPS:'9000',VERIFIER_BPS:'1500'})).toThrow();
});
it('charges half of the estimated market price by default',()=>expect(config({NODE_ENV:'test'}).JOB_PRICE_MARKET_BPS).toBe(5000));
it('uses the low-cost custodial integration without requiring a custom program',()=>{
 const c=config({NODE_ENV:'test',PAYMENT_MODE:'custodial'});
 expect(createChain(c)).toBeInstanceOf(CustodialSolanaChain);
 expect(mintKeys(c)).toContain('CUSTODY_KEYPAIR_PATH');expect(mintKeys(c)).not.toContain('HIVE_PROGRAM_ID');
 expect(paymentKeys(c)).toContain('CUSTODY_KEYPAIR_PATH');expect(paymentKeys(c)).not.toContain('SIGNER_KEYPAIR_PATH');
});
it('supports customer GitHub installations without a single allowed owner',()=>{
 const c=config({NODE_ENV:'test',GITHUB_CLIENT_ID:'Iv1.test',GITHUB_CLIENT_SECRET:'secret',GITHUB_APP_SLUG:'hive-delivery'});
 expect(deliveryKeys(c)).toContain('GITHUB_CLIENT_ID');expect(deliveryKeys(c)).toContain('GITHUB_APP_SLUG');expect(deliveryKeys(c)).not.toContain('GITHUB_INSTALLATION_ID');
});
it('encodes official SPL idempotent ATA, transfer-checked and burn-checked instructions',()=>{
 const payer=wallet.publicKey,mint=Keypair.generate().publicKey,recipient=Keypair.generate().publicKey;
 const source=getAssociatedTokenAddressSync(mint,payer),destination=getAssociatedTokenAddressSync(mint,recipient);
 const ata=createAssociatedTokenAccountIdempotentInstruction(payer,destination,recipient,mint);
 const transfer=createTransferCheckedInstruction(source,mint,destination,payer,'8888000000',6);
 const burn=createBurnCheckedInstruction(source,mint,payer,'8888000000',6);
 expect([...ata.data]).toEqual([1]);expect(ata.keys[0]).toMatchObject({isSigner:true,isWritable:true});
 expect(transfer.programId.equals(TOKEN_PROGRAM_ID)).toBe(true);expect(transfer.data[0]).toBe(12);expect(transfer.data.readBigUInt64LE(1)).toBe(8888000000n);expect(transfer.data[9]).toBe(6);
 expect(burn.programId.equals(TOKEN_PROGRAM_ID)).toBe(true);expect(burn.data[0]).toBe(15);expect(burn.data.readBigUInt64LE(1)).toBe(8888000000n);expect(burn.keys[2]).toMatchObject({isSigner:true});
});
it('confirms the original mint receipt after transfer without granting ownership',async()=>{
 const chain=new SolanaChain(config({HIVE_PROGRAM_ID:Keypair.generate().publicKey.toBase58()}));
 const id='test-mint-request',seatId=5,seat=Buffer.alloc(2);seat.writeUInt16LE(seatId);
 const mint=chain.pda(Buffer.from('seat_mint'),seat);
 const data=Buffer.concat([createHash('sha256').update('account:SeatReceipt').digest().subarray(0,8),seat,wallet.publicKey.toBuffer(),mint.toBuffer(),Buffer.from(digest(id),'hex')]);
 vi.spyOn(chain.connection,'getAccountInfoAndContext').mockResolvedValue({context:{slot:123},value:{data,owner:chain.program(),executable:false,lamports:1,rentEpoch:0}});
 const ownership=vi.spyOn(chain,'ownership').mockRejectedValue(Error('seat_transferred'));
 expect(await chain.minted(wallet.publicKey.toBase58(),seatId,id)).toEqual({mint:mint.toBase58(),slot:123});
 expect(ownership).not.toHaveBeenCalled();
 await expect(chain.minted(wallet.publicKey.toBase58(),seatId,'another-request')).rejects.toThrow('seat_issued_elsewhere');
});
