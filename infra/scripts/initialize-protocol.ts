import 'dotenv/config';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Connection,Keypair,PublicKey,SystemProgram,Transaction,TransactionInstruction,sendAndConfirmTransaction} from '@solana/web3.js';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {publicKey} from '@metaplex-foundation/umi';
import {fetchDigitalAsset,mplTokenMetadata} from '@metaplex-foundation/mpl-token-metadata';

const execute=process.argv.includes('--execute');
const rpc=process.env.SOLANA_RPC_URL,cluster=process.env.SOLANA_CLUSTER;
const mintText=process.env.HMD_MINT,collectionText=process.env.SEAT_COLLECTION_ADDRESS,programText=process.env.HIVE_PROGRAM_ID;
const authorityPath=process.env.SIGNER_KEYPAIR_PATH,baseUri=process.env.MINT_BASE_URI?.replace(/\/$/,'');
if(!rpc||!cluster||!mintText||!collectionText||!programText||!authorityPath||!baseUri)throw new Error('Set SOLANA_RPC_URL, SOLANA_CLUSTER, HMD_MINT, SEAT_COLLECTION_ADDRESS, HIVE_PROGRAM_ID, SIGNER_KEYPAIR_PATH, and MINT_BASE_URI');
if(!['devnet','mainnet-beta'].includes(cluster))throw new Error('Protocol initialization is allowed only on explicit devnet or mainnet-beta configuration');
if(!/^(https:\/\/|ipfs:\/\/|ar:\/\/)/.test(baseUri)||baseUri.length>170||/pending|placeholder|replace|\{\{|__+/i.test(baseUri))throw new Error('MINT_BASE_URI must be a final durable directory URI no longer than 170 characters');
if(cluster==='mainnet-beta'&&process.env.CONFIRM_MAINNET_PROTOCOL_INITIALIZE!=='INITIALIZE_HIVE_WITH_HMD')throw new Error('Mainnet initialization requires CONFIRM_MAINNET_PROTOCOL_INITIALIZE=INITIALIZE_HIVE_WITH_HMD');

const connection=new Connection(rpc,'finalized');
const authority=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(authorityPath,'utf8'))));
const mint=new PublicKey(mintText),collection=new PublicKey(collectionText),program=new PublicKey(programText);
const tokenProgram=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const loader=new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
const [config]=PublicKey.findProgramAddressSync([Buffer.from('config')],program);
const [programData]=PublicKey.findProgramAddressSync([program.toBuffer()],loader);
const [mintInfo,programInfo,collectionAsset]=await Promise.all([
 connection.getAccountInfo(mint,'finalized'),connection.getAccountInfo(program,'finalized'),
 fetchDigitalAsset(createUmi(rpc).use(mplTokenMetadata()),publicKey(collection.toBase58()),{commitment:'finalized'})
]);
if(!mintInfo||!mintInfo.owner.equals(tokenProgram)||mintInfo.data.length!==82||mintInfo.data[45]!==1)throw new Error('HMD_MINT is not an initialized classic SPL Token mint');
if(!programInfo?.executable||!programInfo.owner.equals(loader))throw new Error('HIVE_PROGRAM_ID is not a deployed upgradeable program');
if(collectionAsset.metadata.collectionDetails.__option!=='Some')throw new Error('SEAT_COLLECTION_ADDRESS is not a sized Metaplex collection NFT');
const decimals=mintInfo.data[44],burnAmount=8888n*(10n**BigInt(decimals));
if(burnAmount>18446744073709551615n)throw new Error('8,888 HMD does not fit into u64 for this mint');
if(process.env.HMD_BURN_AMOUNT&&BigInt(process.env.HMD_BURN_AMOUNT)!==burnAmount)throw new Error(`HMD_BURN_AMOUNT must be ${burnAmount}`);

const existing=await connection.getAccountInfo(config,'finalized');
if(existing){
 if(!existing.owner.equals(program)||existing.data.length<117||!new PublicKey(existing.data.subarray(40,72)).equals(mint)||!new PublicKey(existing.data.subarray(72,104)).equals(collection)||existing.data.readBigUInt64LE(104)!==burnAmount||existing.data.readUInt16LE(112)!==2)throw new Error('Config PDA already exists with a different policy');
 console.log(`Protocol is already initialized at ${config}; paused=${Boolean(existing.data[116])}`);
 process.exit(0);
}

const disc=(name:string)=>createHash('sha256').update('global:'+name).digest().subarray(0,8);
const u64=Buffer.alloc(8);u64.writeBigUInt64LE(burnAmount);
const max=Buffer.alloc(2);max.writeUInt16LE(2);
const uriBytes=Buffer.from(baseUri,'utf8'),uriLength=Buffer.alloc(4);uriLength.writeUInt32LE(uriBytes.length);
const instruction=new TransactionInstruction({programId:program,keys:[
 {pubkey:authority.publicKey,isSigner:true,isWritable:true},
 {pubkey:program,isSigner:false,isWritable:false},
 {pubkey:programData,isSigner:false,isWritable:false},
 {pubkey:config,isSigner:false,isWritable:true},
 {pubkey:mint,isSigner:false,isWritable:false},
 {pubkey:collection,isSigner:false,isWritable:false},
 {pubkey:SystemProgram.programId,isSigner:false,isWritable:false}
],data:Buffer.concat([disc('initialize'),u64,max,uriLength,uriBytes])});
const block=await connection.getLatestBlockhash('finalized');
const transaction=new Transaction({...block,feePayer:authority.publicKey}).add(instruction);transaction.sign(authority);
const simulation=await connection.simulateTransaction(transaction);
if(simulation.value.err)throw new Error('Initialization simulation failed: '+JSON.stringify({error:simulation.value.err,logs:simulation.value.logs}));
console.log(`Preflight passed: cluster=${cluster} program=${program} config=${config} HMD=${mint} decimals=${decimals} burn=${burnAmount} collection=${collection} paused=true`);
if(!execute){console.log('No transaction sent. Re-run with --execute after reviewing every address.');process.exit(0);}
const signature=await sendAndConfirmTransaction(connection,transaction,[authority],{commitment:'finalized'});
const finalized=await connection.getAccountInfo(config,'finalized');
if(!finalized||finalized.data[116]!==1)throw new Error('Initialization finalized but the config was not found paused');
console.log(`Protocol initialized PAUSED: ${signature}`);
console.log('Next: transfer collection authority to the config PDA, complete a canary, then explicitly unpause.');
