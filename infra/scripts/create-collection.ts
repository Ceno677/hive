import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {Keypair} from '@solana/web3.js';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {createSignerFromKeypair,keypairIdentity,percentAmount} from '@metaplex-foundation/umi';
import {fromWeb3JsKeypair} from '@metaplex-foundation/umi-web3js-adapters';
import {createNft,fetchDigitalAsset,mplTokenMetadata} from '@metaplex-foundation/mpl-token-metadata';

const execute=process.argv.includes('--execute');
const rpc=process.env.SOLANA_RPC_URL;
const cluster=process.env.SOLANA_CLUSTER;
const authorityPath=process.env.COLLECTION_AUTHORITY_KEYPAIR_PATH??process.env.SIGNER_KEYPAIR_PATH;
const mintPath=process.env.COLLECTION_MINT_KEYPAIR_PATH;
const uri=process.env.COLLECTION_METADATA_URI;
if(!rpc||!cluster||!authorityPath||!mintPath||!uri)throw new Error('Set SOLANA_RPC_URL, SOLANA_CLUSTER, COLLECTION_AUTHORITY_KEYPAIR_PATH (or SIGNER_KEYPAIR_PATH), COLLECTION_MINT_KEYPAIR_PATH, and COLLECTION_METADATA_URI');
if(!['devnet','mainnet-beta'].includes(cluster))throw new Error('Collection creation is allowed only on explicit devnet or mainnet-beta configuration');
if(!/^(https:\/\/|ipfs:\/\/|ar:\/\/)/.test(uri)||/pending|placeholder|replace|\{\{|__+/i.test(uri))throw new Error('COLLECTION_METADATA_URI must be the final permanent collection.json URI');
if(cluster==='mainnet-beta'&&process.env.CONFIRM_MAINNET_COLLECTION_CREATE!=='CREATE_HIVE_COLLECTION')throw new Error('Mainnet creation requires CONFIRM_MAINNET_COLLECTION_CREATE=CREATE_HIVE_COLLECTION');
if(!execute){
 console.log(`Preflight complete for ${cluster}. This command creates one sized Metaplex collection NFT and spends SOL. Re-run with --execute after reviewing the cluster, authority, mint keypair, and URI.`);
 process.exit(0);
}
const load=async(path:string)=>Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path,'utf8'))));
const authority=await load(authorityPath),collectionMint=await load(mintPath);
const umi=createUmi(rpc).use(mplTokenMetadata());
const authoritySigner=createSignerFromKeypair(umi,fromWeb3JsKeypair(authority));
const mintSigner=createSignerFromKeypair(umi,fromWeb3JsKeypair(collectionMint));
umi.use(keypairIdentity(authoritySigner));
await createNft(umi,{mint:mintSigner,name:'hive.md Agent Seats',symbol:'HMD',uri,sellerFeeBasisPoints:percentAmount(0),isCollection:true,isMutable:true}).sendAndConfirm(umi,{confirm:{commitment:'finalized'}});
const asset=await fetchDigitalAsset(umi,mintSigner.publicKey,{commitment:'finalized'});
if(asset.metadata.uri!==uri||asset.metadata.name.trim()!=='hive.md Agent Seats'||asset.metadata.collectionDetails.__option!=='Some')throw new Error('Collection was created but finalized metadata verification failed');
console.log(`SEAT_COLLECTION_ADDRESS=${mintSigner.publicKey}`);
console.log('Collection finalized. Keep its update authority secure until it is deliberately transferred to the deployed Hive config PDA.');
