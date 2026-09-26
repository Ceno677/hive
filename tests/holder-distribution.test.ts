import {it,expect} from 'vitest';
import {Keypair} from '@solana/web3.js';
import bs58 from 'bs58';
import {allocateHolderRevenue} from '../packages/payments/holders.js';
import {loadSolanaKeypair} from '../packages/shared/secrets.js';
import {config,mintKeys,paymentKeys} from '../packages/shared/config.js';
import {hash} from '../packages/shared/domain.js';

it('allocates every base unit per eligible NFT and caps a wallet at two seats',()=>{
 const ownerA=Keypair.generate().publicKey.toBase58(),ownerB=Keypair.generate().publicKey.toBase58();
 const assets=[0,1,2].map(()=>({assetId:Keypair.generate().publicKey.toBase58(),wallet:ownerA}));
 assets.push({assetId:Keypair.generate().publicKey.toBase58(),wallet:ownerB});
 const result=allocateHolderRevenue(10n,assets,2,'distribution-1');
 expect(result.eligibleSeats).toBe(3);expect(result.excludedSeats).toBe(1);
 expect(result.allocations.reduce((sum,row)=>sum+BigInt(row.amount),0n)).toBe(10n);
 expect(result.allocations.find(row=>row.wallet===ownerA)?.assetIds).toHaveLength(2);
 const canonical=[...assets].sort((a,b)=>a.assetId.localeCompare(b.assetId));
 expect(result.snapshotHash).toBe(hash(canonical));
});

it('rejects duplicate assets in a holder snapshot',()=>{
 const assetId=Keypair.generate().publicKey.toBase58(),wallet=Keypair.generate().publicKey.toBase58();
 expect(()=>allocateHolderRevenue(1n,[{assetId,wallet},{assetId,wallet}],2,'duplicate')).toThrow('duplicate_holder_asset');
});

it('accepts a Railway secret key without requiring a mounted file',async()=>{
 const original=Keypair.generate(),loaded=await loadSolanaKeypair(undefined,bs58.encode(original.secretKey));
 expect(loaded.publicKey.toBase58()).toBe(original.publicKey.toBase58());
 const c=config({NODE_ENV:'test',PAYMENT_MODE:'custodial',CUSTODY_KEYPAIR_SECRET:bs58.encode(original.secretKey)});
 expect(mintKeys(c)).toContain('CUSTODY_KEYPAIR_SECRET');expect(paymentKeys(c)).toContain('CUSTODY_KEYPAIR_SECRET');
});

it('requires a paired URL and strong token for remote execution',()=>{
 expect(()=>config({NODE_ENV:'test',EXECUTION_URL:'https://executor.example'})).toThrow();
 expect(()=>config({NODE_ENV:'test',EXECUTION_TOKEN:'short'})).toThrow();
 expect(config({NODE_ENV:'test',EXECUTION_URL:'https://executor.example',EXECUTION_TOKEN:'x'.repeat(32)}).EXECUTION_URL).toBe('https://executor.example');
});
