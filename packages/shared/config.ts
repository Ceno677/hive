import 'dotenv/config';
import { z } from 'zod';
const optional = z.preprocess(v => v === '' ? undefined : v, z.string().optional());
const optionalUrl = z.preprocess(v => v === '' ? undefined : v, z.string().url().optional());
const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4320),
  PUBLIC_ORIGIN: z.string().url().default('http://localhost:4320'),
  DATABASE_URL: z.string().default('postgresql://hive:hive_local_only@localhost:5434/hive'),
  REDIS_URL: z.string().default('redis://localhost:6381'),
  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  SOLANA_BACKUP_RPC_URL: optional,
  SOLANA_CLUSTER: z.enum(['localnet','devnet','mainnet-beta']).default('devnet'),
  PAYMENT_MODE: z.enum(['custodial','custom-program']).default('custodial'),
  HMD_MINT: optional, SEAT_COLLECTION_ADDRESS: optional, HIVE_PROGRAM_ID: optional,
  HMD_BURN_AMOUNT: optional, MINT_BASE_URI: optional,
  BUILDER_BPS: optional, VERIFIER_BPS: optional, TREASURY_WALLET: optional,
  MAX_SEATS_PER_WALLET: z.preprocess(v => v === '' || v === undefined ? '2' : v, z.string().regex(/^[1-9][0-9]{0,2}$/).refine(v=>Number(v)<=888)), SIGNER_KEYPAIR_PATH: optional,
  CUSTODY_KEYPAIR_PATH: optional, CUSTODY_KEYPAIR_SECRET: optional,
  SETTLEMENT_POLICY: optional, GAS_POLICY: optional,
  JOB_DEADLINE_HOURS: z.preprocess(v=>v===''?undefined:v,z.coerce.number().int().min(1).max(168).optional()),
  JOB_PRICE_MARKET_BPS: z.coerce.number().int().min(1).max(10000).default(5000),
  JOB_MIN_PRICE_USD: z.coerce.number().int().min(1).max(100000).default(25),
  JOB_MAX_PRICE_USD: z.coerce.number().int().min(1).max(1000000).default(10000),
  JOB_QUOTE_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(300),
  HMD_PRICE_MIN_LIQUIDITY_USD: z.coerce.number().int().min(100).max(1000000000).default(10000),
  HMD_PRICE_MAX_DEVIATION_BPS: z.coerce.number().int().min(100).max(10000).default(1500),
  HMD_PRICE_MAX_QUOTE_LIQUIDITY_BPS: z.coerce.number().int().min(10).max(5000).default(500),
  HMD_PRICE_CACHE_SECONDS: z.coerce.number().int().min(5).max(120).default(20),
  HMD_MANUAL_PRICE_USD: z.preprocess(v=>v===''?undefined:v,z.string().regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/).refine(v=>Number(v)>0).optional()),
  DEVNET_TEST_HMD_PRICE_USD: z.preprocess(v=>v===''?undefined:v,z.string().regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/).refine(v=>Number(v)>0).optional()),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_API_KEY: optional, AI_MODEL: optional,
  AI_PLANNER_MODEL: optional, AI_PRICING_MODEL: optional, AI_BUILDER_MODEL: optional, AI_REVIEWER_MODEL: optional, AI_FINAL_MODEL: optional,
  AI_API_STYLE: z.enum(['responses','chat-completions']).default('responses'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(30000).max(600000).default(300000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1024).max(65536).default(32768),
  AI_MAX_INPUT_CHARS: z.coerce.number().int().min(50000).max(2000000).default(600000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(3),
  AI_REASONING_EFFORT: z.enum(['none','low','medium','high','xhigh']).default('high'),
  AI_PRICING_REASONING_EFFORT: z.enum(['none','low','medium','high','xhigh']).default('low'),
  AI_SERVICE_TIER: z.enum(['auto','default','priority']).default('default'),
  AGENT_REPAIR_PASSES: z.coerce.number().int().min(1).max(8).default(4),
  REVIEW_QUORUM: z.coerce.number().int().min(1).max(3).default(2),
  WORKER_REPUTATION_SAMPLE: z.coerce.number().int().min(3).max(100).default(5),
  BUILDER_MIN_REPUTATION: z.coerce.number().min(0).max(1).default(0.5),
  VERIFIER_MIN_REPUTATION: z.coerce.number().min(0).max(1).default(0.5),
  OWNERSHIP_RECHECK_SECONDS: z.coerce.number().int().min(15).max(300).default(60),
  DEADLINE_WARNING_MINUTES: z.coerce.number().int().min(5).max(720).default(60),
  AI_PROVIDER: z.enum(['openai-compatible','anthropic']).default('openai-compatible'),
  EXECUTION_ENABLED: z.enum(['true','false']).default('false'),
  EXECUTION_URL: optionalUrl, EXECUTION_TOKEN: optional,
  SANDBOX_IMAGE: z.string().default('hive-sandbox:local'),
  ARTIFACT_STORAGE: z.enum(['local','s3']).default('local'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'), S3_BUCKET: z.string().default('hive-artifacts'),
  S3_ACCESS_KEY: z.string().default('hive_local'), S3_SECRET_KEY: z.string().default('hive_local_secret_change_me'),
  GITHUB_APP_ID: optional, GITHUB_APP_PRIVATE_KEY_PATH: optional, GITHUB_APP_PRIVATE_KEY: optional, GITHUB_INSTALLATION_ID: optional,
  GITHUB_CLIENT_ID: optional, GITHUB_CLIENT_SECRET: optional, GITHUB_APP_SLUG: z.preprocess(v=>v===''?undefined:v,z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/).optional()),
  GITHUB_ALLOWED_OWNER: optional,
  NETLIFY_TOKEN: optional, NETLIFY_SITE_ID: optional,
  SOLANA_RELEASES_ENABLED: z.enum(['true','false']).default('false'),
  DEPLOY_PROGRAM_SEED: optional,
  SOLANA_BUILD_IMAGE: optional, RUST_SANDBOX_IMAGE: optional,
  OPERATIONS_TOKEN: optional,
  TURNSTILE_SITE_KEY: optional, TURNSTILE_SECRET_KEY: optional,
  HOLDER_DISTRIBUTIONS_ENABLED: z.enum(['true','false']).default('false'),
  HOLDER_DISTRIBUTION_INTERVAL_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  HOLDER_DISTRIBUTION_MIN_AMOUNT: z.preprocess(v=>v===''?undefined:v,z.string().regex(/^[1-9][0-9]{0,19}$/).optional()),
  HOLDER_SNAPSHOT_RPC_URL: optionalUrl,
  TRUST_PROXY: z.enum(['true','false']).default('false')
});
export type Config = z.infer<typeof schema>;
export function config(env: NodeJS.ProcessEnv = process.env): Config {
  const c = schema.parse(env);
  if(c.HMD_BURN_AMOUNT&&(!/^[1-9][0-9]{0,19}$/.test(c.HMD_BURN_AMOUNT)||BigInt(c.HMD_BURN_AMOUNT)>18446744073709551615n))throw Error('HMD_BURN_AMOUNT must be positive u64 token base units');
  if(c.BUILDER_BPS&&c.VERIFIER_BPS&&(!/^[0-9]+$/.test(c.BUILDER_BPS)||!/^[0-9]+$/.test(c.VERIFIER_BPS)||Number(c.BUILDER_BPS)+Number(c.VERIFIER_BPS)>10000))throw Error('Invalid fee allocation');
  if(c.SETTLEMENT_POLICY&&c.SETTLEMENT_POLICY!=='final-release')throw Error('Supported settlement policy: final-release');
  if(c.GAS_POLICY&&c.GAS_POLICY!=='user-pays')throw Error('Supported gas policy: user-pays');
  if(c.SOLANA_BACKUP_RPC_URL&&c.SOLANA_BACKUP_RPC_URL===c.SOLANA_RPC_URL)throw new Error('Backup RPC must use a different endpoint');
  if(c.DEPLOY_PROGRAM_SEED&&c.DEPLOY_PROGRAM_SEED.length<32)throw new Error('DEPLOY_PROGRAM_SEED must contain at least 32 characters');
  if((c.EXECUTION_URL&&!c.EXECUTION_TOKEN)||(!c.EXECUTION_URL&&c.EXECUTION_TOKEN))throw new Error('EXECUTION_URL and EXECUTION_TOKEN must be configured together');
  if(c.EXECUTION_TOKEN&&c.EXECUTION_TOKEN.length<32)throw new Error('EXECUTION_TOKEN must contain at least 32 characters');
  if(c.HOLDER_DISTRIBUTIONS_ENABLED==='true'&&c.PAYMENT_MODE!=='custodial')throw new Error('Holder distributions currently require custodial payment mode');
  if(Boolean(c.GITHUB_CLIENT_ID)!==Boolean(c.GITHUB_CLIENT_SECRET))throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured together');
  if(c.JOB_MIN_PRICE_USD>c.JOB_MAX_PRICE_USD)throw new Error('JOB_MIN_PRICE_USD must not exceed JOB_MAX_PRICE_USD');
  if(c.DEVNET_TEST_HMD_PRICE_USD&&c.SOLANA_CLUSTER==='mainnet-beta')throw new Error('DEVNET_TEST_HMD_PRICE_USD is forbidden on mainnet-beta');
  if(c.HMD_MANUAL_PRICE_USD&&c.DEVNET_TEST_HMD_PRICE_USD)throw new Error('Configure only one manual HMD price source');
  if(c.PAYMENT_MODE==='custodial'&&c.BUILDER_BPS&&c.VERIFIER_BPS&&Number(c.BUILDER_BPS)+Number(c.VERIFIER_BPS)*c.REVIEW_QUORUM!==10000)throw new Error('Custodial rewards require BUILDER_BPS + VERIFIER_BPS * REVIEW_QUORUM = 10000');
  if (c.NODE_ENV === 'production') {
    const invalid=[
      !c.PUBLIC_ORIGIN.startsWith('https:')&&'HTTPS PUBLIC_ORIGIN',
      c.TRUST_PROXY!=='true'&&'TRUST_PROXY=true',
      c.ARTIFACT_STORAGE!=='s3'&&'ARTIFACT_STORAGE=s3',
      c.S3_SECRET_KEY.includes('change_me')&&'private S3 credentials',
      !c.OPERATIONS_TOKEN&&'OPERATIONS_TOKEN',
      (!c.TURNSTILE_SITE_KEY||!c.TURNSTILE_SECRET_KEY)&&'Turnstile keys'
    ].filter(Boolean);
    if(invalid.length)throw new Error('Production requires: '+invalid.join(', '));
  }
  return c;
}
export function missing(c: Config, keys: (keyof Config)[]) { return keys.filter(k => !c[k]); }
export const modelRoles=['PLANNER','BUILDER','REVIEWER','FINAL'] as const;
export type ModelRoleName=typeof modelRoles[number];
export function missingModels(c:Config,roles:readonly ModelRoleName[]=modelRoles){
  return roles.filter(role=>!c[`AI_${role}_MODEL`]&&!c.AI_MODEL).map(role=>'AI_'+role+'_MODEL');
}
const paymentBase: (keyof Config)[] = ['HMD_MINT','BUILDER_BPS','VERIFIER_BPS','TREASURY_WALLET','SETTLEMENT_POLICY','GAS_POLICY','JOB_DEADLINE_HOURS'];
const mintBase: (keyof Config)[] = ['HMD_MINT','HMD_BURN_AMOUNT','SEAT_COLLECTION_ADDRESS','MINT_BASE_URI','MAX_SEATS_PER_WALLET','GAS_POLICY'];
const custodyKey=(c:Config):keyof Config=>c.CUSTODY_KEYPAIR_SECRET?'CUSTODY_KEYPAIR_SECRET':'CUSTODY_KEYPAIR_PATH';
const githubKey=(c:Config):keyof Config=>c.GITHUB_APP_PRIVATE_KEY?'GITHUB_APP_PRIVATE_KEY':'GITHUB_APP_PRIVATE_KEY_PATH';
export const paymentKeys=(c:Config):(keyof Config)[]=>[...paymentBase,...(c.PAYMENT_MODE==='custodial'?[custodyKey(c)]:['HIVE_PROGRAM_ID' as const,'SIGNER_KEYPAIR_PATH' as const])];
export const mintKeys=(c:Config):(keyof Config)[]=>[...mintBase,...(c.PAYMENT_MODE==='custodial'?[custodyKey(c)]:['HIVE_PROGRAM_ID' as const])];
export const deliveryKeys=(c:Config):(keyof Config)[]=>c.GITHUB_CLIENT_ID&&c.GITHUB_CLIENT_SECRET
 ? ['GITHUB_APP_ID',githubKey(c),'GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','GITHUB_APP_SLUG']
 : ['GITHUB_APP_ID',githubKey(c),'GITHUB_INSTALLATION_ID','GITHUB_ALLOWED_OWNER'];
