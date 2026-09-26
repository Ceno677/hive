import 'dotenv/config';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Connection,Keypair,PublicKey,Transaction,TransactionInstruction,sendAndConfirmTransaction} from '@solana/web3.js';

const execute=process.argv.includes('--execute');
const rpc=process.env.SOLANA_RPC_URL,cluster=process.env.SOLANA_CLUSTER,programText=process.env.HIVE_PROGRAM_ID,path=process.env.SIGNER_KEYPAIR_PATH,state=process.env.HIVE_PAUSED;
if(!rpc||!cluster||!programText||!path||!['true','false'].includes(state??''))throw new Error('Set SOLANA_RPC_URL, SOLANA_CLUSTER, HIVE_PROGRAM_ID, SIGNER_KEYPAIR_PATH and HIVE_PAUSED=true|false');
if(!['devnet','mainnet-beta'].includes(cluster))throw new Error('Protocol administration is allowed only on explicit devnet or mainnet-beta configuration');
if(cluster==='mainnet-beta'&&process.env.CONFIRM_MAINNET_PROTOCOL_ADMIN!=='SET_HIVE_PAUSE_STATE')throw new Error('Mainnet administration requires CONFIRM_MAINNET_PROTOCOL_ADMIN=SET_HIVE_PAUSE_STATE');
const paused=state==='true',program=new PublicKey(programText),authority=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path,'utf8'))));
const [config]=PublicKey.findProgramAddressSync([Buffer.from('config')],program),connection=new Connection(rpc,'finalized');
const current=await connection.getAccountInfo(config,'finalized');
if(!current?.owner.equals(program)||current.data.length<117||!new PublicKey(current.data.subarray(8,40)).equals(authority.publicKey))throw new Error('Signer is not the configured protocol authority');
if(Boolean(current.data[116])===paused){console.log(`Protocol is already paused=${paused}`);process.exit(0);}
const data=Buffer.concat([createHash('sha256').update('global:set_paused').digest().subarray(0,8),Buffer.from([paused?1:0])]);
const instruction=new TransactionInstruction({programId:program,keys:[{pubkey:authority.publicKey,isSigner:true,isWritable:false},{pubkey:config,isSigner:false,isWritable:true}],data});
const block=await connection.getLatestBlockhash('finalized'),transaction=new Transaction({...block,feePayer:authority.publicKey}).add(instruction);transaction.sign(authority);
const simulation=await connection.simulateTransaction(transaction);if(simulation.value.err)throw new Error('Pause simulation failed: '+JSON.stringify({error:simulation.value.err,logs:simulation.value.logs}));
console.log(`Preflight passed: cluster=${cluster} program=${program} paused=${paused}`);
if(!execute){console.log('No transaction sent. Re-run with --execute after review.');process.exit(0);}
const signature=await sendAndConfirmTransaction(connection,transaction,[authority],{commitment:'finalized'}),finalized=await connection.getAccountInfo(config,'finalized');
if(!finalized||Boolean(finalized.data[116])!==paused)throw new Error('Pause transaction finalized but verification failed');
console.log(`Protocol paused=${paused}: ${signature}`);
