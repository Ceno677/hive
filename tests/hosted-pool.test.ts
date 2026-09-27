import {describe,it,expect,vi} from 'vitest';
import {Keypair} from '@solana/web3.js';
import {HostedPool} from '../packages/orchestrator/hosted-pool.js';

describe('hosted agent pool',()=>{
 it('provisions private workers without NFT seats and claims work automatically',async()=>{
  const wallet=Keypair.generate().publicKey.toBase58(),created:any[]=[];
  const db={
   wallet:{upsert:vi.fn()},
   worker:{upsert:vi.fn(async({create}:any)=>{created.push(create);return{id:'worker-'+created.length,generation:1,...create};})}
  };
  const engine={claim:vi.fn().mockResolvedValue(null)};
  const pool=new HostedPool(db as any,engine as any,{} as any,{} as any,{} as any,{
   TREASURY_WALLET:wallet,OPERATIONS_TOKEN:'x'.repeat(32),AI_API_KEY:'configured',EXECUTION_ENABLED:'true',REVIEW_QUORUM:2
  } as any);
  await pool.tick(()=>{});
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(created).toHaveLength(3);
  expect(created.every(worker=>worker.hosted&&worker.seatId===null&&worker.public===false)).toBe(true);
  expect(engine.claim).toHaveBeenCalledTimes(6);
  expect(engine.claim.mock.calls.every((call:any[])=>call[0].hosted===true)).toBe(true);
 });

 it('stays disabled until the platform configuration is complete',async()=>{
  const db={wallet:{upsert:vi.fn()},worker:{upsert:vi.fn()}};
  const engine={claim:vi.fn()};
  await new HostedPool(db as any,engine as any,{} as any,{} as any,{} as any,{REVIEW_QUORUM:2} as any).tick(()=>{});
  expect(db.worker.upsert).not.toHaveBeenCalled();
  expect(engine.claim).not.toHaveBeenCalled();
 });
});
