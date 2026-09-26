import {afterEach,describe,expect,it,vi} from 'vitest';
import {Keypair} from '@solana/web3.js';
import {amountForUsd,createJobPricing} from '../packages/pricing/quote.js';
import {config} from '../packages/shared/config.js';

const mint=Keypair.generate().publicKey.toBase58();
const plan={title:'Test project',tasks:[{key:'site',title:'Build site',instructions:'Build and test the complete site',skill:'static' as const,dependencies:[],paths:['index.html'],acceptance:['The site works']} ]};

afterEach(()=>vi.unstubAllGlobals());

describe('dynamic job pricing',()=>{
 it('converts USD cents to exact token base units and rounds up',()=>{
  expect(amountForUsd(5000n,'0.25',6)).toBe('200000000');
  expect(amountForUsd(1n,'3',0)).toBe('1');
 });

 it('uses AI difficulty, a market benchmark, a 50% charge and a liquid HMD price',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify([
   {chainId:'solana',baseToken:{address:mint},priceUsd:'0.25',liquidity:{usd:12000}},
   {chainId:'solana',baseToken:{address:mint},priceUsd:'0.26',liquidity:{usd:3000}}
  ]),{status:200,headers:{'content-type':'application/json'}})));
  const model={async json(){return{estimatedHours:10,marketRateUsd:75,complexity:'STANDARD',confidence:'HIGH',factors:['Authentication and testing'],sources:[{title:'Current market benchmark',url:'https://example.com/rates'}]};}};
  const quote=await createJobPricing({c:config({NODE_ENV:'test'}),model,prompt:'Build a secure application',plan,mode:'BUILD',mint,decimals:6,now:Date.parse('2026-09-26T12:00:00Z')});
  expect(quote.marketPriceUsd).toBe('750.00');
  expect(quote.chargedPriceUsd).toBe('375.00');
  expect(quote.amountBaseUnits).toBe('1500000000');
  expect(quote.marketPercentageBps).toBe(5000);
  expect(quote.expiresAt).toBe('2026-09-26T12:05:00.000Z');
 });

 it('rejects prices without the configured liquidity',async()=>{
  const illiquid=Keypair.generate().publicKey.toBase58();
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify([{chainId:'solana',baseToken:{address:illiquid},priceUsd:'1',liquidity:{usd:100}}]),{status:200})));
  const model={async json(){return{estimatedHours:2,marketRateUsd:50,complexity:'SIMPLE',confidence:'LOW',factors:['Small scope'],sources:[{title:'Current market benchmark',url:'https://example.com/rates'}]};}};
  await expect(createJobPricing({c:config({NODE_ENV:'test'}),model,prompt:'Build an illiquid application',plan,mode:'BUILD',mint:illiquid,decimals:6,now:Date.parse('2026-09-26T12:20:00Z')})).rejects.toMatchObject({code:'token_price_illiquid'});
 });

 it('rejects a quote that is too large for observed market depth',async()=>{
  const shallow=Keypair.generate().publicKey.toBase58();
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify([{chainId:'solana',baseToken:{address:shallow},priceUsd:'0.01',liquidity:{usd:10000}}]),{status:200})));
  const model={async json(){return{estimatedHours:500,marketRateUsd:500,complexity:'EXPERT',confidence:'HIGH',factors:['Large expert build'],sources:[{title:'Current market benchmark',url:'https://example.com/rates'}]};}};
  await expect(createJobPricing({c:config({NODE_ENV:'test'}),model,prompt:'Build a very large expert application',plan,mode:'BUILD',mint:shallow,decimals:6,now:Date.parse('2026-09-26T12:30:00Z')})).rejects.toMatchObject({code:'token_price_depth_insufficient'});
 });

 it('uses an explicit devnet-only test price without weakening mainnet pricing',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  const model={async json(){return{estimatedHours:10,marketRateUsd:50,complexity:'STANDARD',confidence:'HIGH',factors:['Full devnet flow'],sources:[{title:'Current market benchmark',url:'https://example.com/rates'}]};}};
  const c=config({NODE_ENV:'test',SOLANA_CLUSTER:'devnet',DEVNET_TEST_HMD_PRICE_USD:'0.10'});
  const quote=await createJobPricing({c,model,prompt:'Build and test a devnet application',plan,mode:'BUILD',mint,decimals:6,now:Date.parse('2026-09-26T13:00:00Z')});
  expect(quote.tokenPriceSource).toBe('devnet-test');expect(quote.amountBaseUnits).toBe('2500000000');expect(fetch).not.toHaveBeenCalled();
  expect(()=>config({NODE_ENV:'production',SOLANA_CLUSTER:'mainnet-beta',DEVNET_TEST_HMD_PRICE_USD:'0.10',PUBLIC_ORIGIN:'https://example.com',TRUST_PROXY:'true',ARTIFACT_STORAGE:'s3',S3_SECRET_KEY:'secure',OPERATIONS_TOKEN:'secure',TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret'})).toThrow('forbidden on mainnet-beta');
 });
});
