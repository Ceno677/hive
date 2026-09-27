import 'dotenv/config';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {Connection,PublicKey} from '@solana/web3.js';
import {getMint,TOKEN_2022_PROGRAM_ID} from '../../packages/solana/tokens.js';

const mintText=process.env.HMD_MINT;
const rpc=process.env.SOLANA_RPC_URL;
if(!mintText||!rpc)throw new Error('Set HMD_MINT to the launched token contract address and SOLANA_RPC_URL to the target cluster');
const mint=new PublicKey(mintText),connection=new Connection(rpc,'finalized');
const result=await connection.getAccountInfoAndContext(mint,{commitment:'finalized'});
if(!result.value)throw new Error('HMD mint does not exist at finalized commitment');
const token=await getMint(connection,mint),decimals=token.decimals;
if(decimals>19)throw new Error('Unsupported token decimals');
const burnAmount=8888n*(10n**BigInt(decimals));
if(burnAmount>18446744073709551615n)throw new Error('8,888 HMD does not fit into a Solana u64 at this decimal precision');
const output=resolve(process.env.HMD_BINDING_OUTPUT??'.hive/hmd-binding.env');
await mkdir(dirname(output),{recursive:true});
const fingerprint=createHash('sha256').update(result.value.data).digest('hex');
const text=[
 `# Verified at finalized slot ${result.context.slot}`,
 `# Mint account SHA-256 ${fingerprint}`,
 `# Token program ${token.programId}`,
 `# Safe extensions ${token.programId.equals(TOKEN_2022_PROGRAM_ID)?token.extensions.join(',')||'none':'classic'}`,
 `HMD_MINT=${mint}`,
 `HMD_DECIMALS=${decimals}`,
 `HMD_BURN_AMOUNT=${burnAmount}`,
 'MAX_SEATS_PER_WALLET=2',
 'GAS_POLICY=user-pays',
 ''
].join('\n');
await writeFile(output,text,{flag:'wx'});
console.log(text.trim());
console.log(`Wrote verified public token binding to ${output}`);
