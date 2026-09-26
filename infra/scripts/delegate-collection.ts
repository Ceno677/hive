import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {Connection,Keypair,PublicKey} from '@solana/web3.js';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {createSignerFromKeypair,keypairIdentity,publicKey} from '@metaplex-foundation/umi';
import {fromWeb3JsKeypair} from '@metaplex-foundation/umi-web3js-adapters';
import {fetchDigitalAsset,findMetadataPda,mplTokenMetadata,updateMetadataAccountV2} from '@metaplex-foundation/mpl-token-metadata';

const execute=process.argv.includes('--execute');
const rpc=process.env.SOLANA_RPC_URL,cluster=process.env.SOLANA_CLUSTER,programText=process.env.HIVE_PROGRAM_ID,collectionText=process.env.SEAT_COLLECTION_ADDRESS;
const authorityPath=process.env.COLLECTION_AUTHORITY_KEYPAIR_PATH??process.env.SIGNER_KEYPAIR_PATH;
if(!rpc||!cluster||!programText||!collectionText||!authorityPath)throw new Error('Set SOLANA_RPC_URL, SOLANA_CLUSTER, HIVE_PROGRAM_ID, SEAT_COLLECTION_ADDRESS and the collection authority keypair path');
if(!['devnet','mainnet-beta'].includes(cluster))throw new Error('Collection delegation is allowed only on explicit devnet or mainnet-beta configuration');
if(cluster==='mainnet-beta'&&process.env.CONFIRM_MAINNET_COLLECTION_DELEGATE!=='TRANSFER_COLLECTION_TO_HIVE')throw new Error('Mainnet delegation requires CONFIRM_MAINNET_COLLECTION_DELEGATE=TRANSFER_COLLECTION_TO_HIVE');
const authority=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(authorityPath,'utf8'))));
const program=new PublicKey(programText),collection=new PublicKey(collectionText),[config]=PublicKey.findProgramAddressSync([Buffer.from('config')],program);
const connection=new Connection(rpc,'finalized'),configInfo=await connection.getAccountInfo(config,'finalized');
if(!configInfo?.owner.equals(program))throw new Error('Hive config PDA is not initialized by HIVE_PROGRAM_ID');
const umi=createUmi(rpc).use(mplTokenMetadata()),signer=createSignerFromKeypair(umi,fromWeb3JsKeypair(authority));umi.use(keypairIdentity(signer));
const collectionKey=publicKey(collection.toBase58()),asset=await fetchDigitalAsset(umi,collectionKey,{commitment:'finalized'});
if(asset.metadata.collectionDetails.__option!=='Some')throw new Error('Configured collection is not a sized collection NFT');
if(asset.metadata.updateAuthority===config.toBase58()){console.log(`Collection authority is already the Hive config PDA: ${config}`);process.exit(0);}
if(asset.metadata.updateAuthority!==authority.publicKey.toBase58())throw new Error('Configured signer is not the current collection update authority');
console.log(`Preflight passed: collection=${collection} currentAuthority=${authority.publicKey} newAuthority=${config}`);
if(!execute){console.log('No transaction sent. Re-run with --execute after reviewing the irreversible authority handoff.');process.exit(0);}
await updateMetadataAccountV2(umi,{metadata:findMetadataPda(umi,{mint:collectionKey}),updateAuthority:signer,newUpdateAuthority:publicKey(config.toBase58())}).sendAndConfirm(umi,{confirm:{commitment:'finalized'}});
const finalAsset=await fetchDigitalAsset(umi,collectionKey,{commitment:'finalized'});
if(finalAsset.metadata.updateAuthority!==config.toBase58())throw new Error('Authority transaction finalized but verification failed');
console.log(`Collection verification authority transferred to ${config}`);
