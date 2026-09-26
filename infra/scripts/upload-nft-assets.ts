import 'dotenv/config';
import {createHash} from 'node:crypto';
import {copyFile,mkdir,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import bs58 from 'bs58';
import {Keypair,LAMPORTS_PER_SOL,Connection} from '@solana/web3.js';
import {ExistingBalanceFunding,OnDemandFunding,TurboFactory} from '@ardrive/turbo-sdk';

const SUPPLY=888;
const stage=process.argv.find(value=>value==='images'||value==='metadata');
const execute=process.argv.includes('--execute');
if(!stage)throw new Error('Usage: npm run nft:upload -- images|metadata (quote) or npm run nft:upload -- --execute images (upload)');

const walletPath=process.env.TURBO_WALLET_KEYPAIR_PATH;
const rpc=process.env.SOLANA_RPC_URL;
const gateway=(process.env.TURBO_GATEWAY??'https://arweave.net').replace(/\/$/,'');
const releaseDir=resolve(process.env.NFT_RELEASE_DIR??'publication');
if(!walletPath||!rpc)throw new Error('Set TURBO_WALLET_KEYPAIR_PATH and SOLANA_RPC_URL');

async function prepareImages(){
 const source=resolve('site/studio/art');
 const target=resolve('.hive/nft-upload/images');
 await mkdir(target,{recursive:true});
 const sourceNames=(await readdir(source)).filter(name=>/^\d+\.png$/.test(name));
 if(sourceNames.length!==SUPPLY)throw new Error(`Expected ${SUPPLY} locked source PNGs, found ${sourceNames.length}`);
 for(let id=1;id<=SUPPLY;id++)await copyFile(resolve(source,`${id}.png`),resolve(target,`${id}.png`));
 await copyFile(resolve(source,'155.png'),resolve(target,'collection.png'));
 return target;
}

const folder=stage==='images'?await prepareImages():resolve(releaseDir,'metadata');
const names=(await readdir(folder)).sort();
const expected=new Set([...Array.from({length:SUPPLY},(_,index)=>`${index+1}.${stage==='images'?'png':'json'}`),`collection.${stage==='images'?'png':'json'}`]);
if(names.length!==expected.size||names.some(name=>!expected.has(name)))throw new Error(`${stage} folder must contain exactly the 888 numbered assets plus collection.${stage==='images'?'png':'json'}`);

const sizes=await Promise.all(names.map(async name=>(await stat(resolve(folder,name))).size));
const byteCount=sizes.reduce((total,size)=>total+size,0);
const publicClient=TurboFactory.unauthenticated({token:'solana'});
const quote=await publicClient.getTokenPriceForBytes({byteCount});
const quotedSol=Number(quote.tokenPrice);
const maxSol=Number(stage==='images'?process.env.TURBO_MAX_IMAGE_SOL??'0.045':process.env.TURBO_MAX_METADATA_SOL??'0.005');
if(!Number.isFinite(maxSol)||maxSol<=0)throw new Error('Turbo maximum SOL must be a positive number');

const secret=Uint8Array.from(JSON.parse(await readFile(walletPath,'utf8')));
const wallet=Keypair.fromSecretKey(secret);
const connection=new Connection(rpc,'confirmed');
const walletSol=await connection.getBalance(wallet.publicKey)/LAMPORTS_PER_SOL;
console.log(JSON.stringify({mode:execute?'execute':'quote-only',stage,folder,files:names.length,byteCount,quotedSol,maxSol,wallet:wallet.publicKey.toBase58(),walletSol},null,2));
if(quotedSol>maxSol)throw new Error(`Turbo quote ${quotedSol} SOL exceeds the configured ${maxSol} SOL cap`);
if(!execute){
 console.log(`Quote only: no upload or payment occurred. Set CONFIRM_TURBO_UPLOAD=UPLOAD_PERMANENT_ASSETS and re-run with --execute.`);
 process.exit(0);
}
if(process.env.CONFIRM_TURBO_UPLOAD!=='UPLOAD_PERMANENT_ASSETS')throw new Error('Execution requires CONFIRM_TURBO_UPLOAD=UPLOAD_PERMANENT_ASSETS');
if(walletSol<maxSol+0.03)throw new Error(`Refusing upload: keep at least 0.03 SOL beyond the ${maxSol} SOL upload cap for collection creation and fees`);

const client=TurboFactory.authenticated({privateKey:bs58.encode(secret),token:'solana'});
const result=await client.uploadFolder({
 folderPath:folder,
 throwOnFailure:true,
 maxConcurrentUploads:10,
 fundingMode:quotedSol===0?new ExistingBalanceFunding():new OnDemandFunding({maxTokenAmount:String(Math.ceil(maxSol*LAMPORTS_PER_SOL)),topUpBufferMultiplier:1.1}),
 dataItemOpts:{tags:[{name:'App-Name',value:'hive.md'},{name:'Hive-Asset-Stage',value:stage}]}
});
if(result.errors?.length)throw new Error(`Turbo returned ${result.errors.length} upload errors`);
if(!result.manifestResponse?.id||!result.manifest)throw new Error('Turbo upload completed without a folder manifest');
const baseUri=`${gateway}/${result.manifestResponse.id}`;
const receipt={schemaVersion:1,stage,uploadedAt:new Date().toISOString(),wallet:wallet.publicKey.toBase58(),files:result.fileResponses.length,byteCount,quotedSol,maxSol,manifestId:result.manifestResponse.id,baseUri,manifestSha256:createHash('sha256').update(JSON.stringify(result.manifest)).digest('hex'),cryptoFundResult:result.cryptoFundResult??null};
await mkdir(resolve('.hive/nft-upload'),{recursive:true});
await writeFile(resolve('.hive/nft-upload',`${stage}-receipt.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(`${stage.toUpperCase()}_BASE_URI=${baseUri}`);
console.log(`Permanent upload receipt: .hive/nft-upload/${stage}-receipt.json`);
