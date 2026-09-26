import 'dotenv/config';
import {createHash} from 'node:crypto';
import {copyFile,mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import '../../nft-source/verify-lock.mjs';

const SUPPLY=888;
const imageBase=cleanBase(process.env.NFT_IMAGE_BASE_URI,'NFT_IMAGE_BASE_URI');
const metadataBase=optionalBase(process.env.NFT_METADATA_BASE_URI??process.env.MINT_BASE_URI,'NFT_METADATA_BASE_URI');
const externalBase=optionalHttpsBase(process.env.NFT_EXTERNAL_URL);
const output=resolve(process.env.NFT_RELEASE_DIR??'publication');
const images=resolve(output,'images');
const metadataDir=resolve(output,'metadata');

function cleanBase(value:string|undefined,name:string){
 if(!value)throw new Error(`Set ${name} to the permanent HTTPS, IPFS, or Arweave directory containing the images`);
 const cleaned=value.replace(/\/$/,'');
 if(!/^(https:\/\/|ipfs:\/\/|ar:\/\/)/.test(cleaned)||/placeholder|pending|replace|\{\{|__+/i.test(cleaned))throw new Error(`${name} must be a final durable URI, not a placeholder`);
 return cleaned;
}
function optionalBase(value:string|undefined,name:string){return value?cleanBase(value,name):null;}
function optionalHttpsBase(value:string|undefined){
 if(!value)return null;
 const cleaned=value.replace(/\/$/,'');
 if(!cleaned.startsWith('https://'))throw new Error('NFT_EXTERNAL_URL must use HTTPS');
 return cleaned;
}
const sha=(data:Buffer|string)=>createHash('sha256').update(data).digest('hex');
const json=(value:unknown)=>JSON.stringify(value,null,2)+'\n';

// A release directory is immutable by design. Use a new NFT_RELEASE_DIR for another candidate.
await mkdir(output,{recursive:false}).catch((error:any)=>{
 if(error?.code==='EEXIST')throw new Error(`Release directory already exists: ${output}. Refusing to overwrite it.`);
 throw error;
});
await mkdir(images);
await mkdir(metadataDir);

const collection=JSON.parse(await readFile('site/studio/collection.json','utf8'));
const lock=JSON.parse(await readFile('nft-source/collection.lock.json','utf8'));
if(collection.supply!==SUPPLY||collection.items?.length!==SUPPLY)throw new Error('Locked collection must contain exactly 888 items');

const items=[];
for(let id=1;id<=SUPPLY;id++){
 const sourceImage=resolve('site/studio/art',`${id}.png`);
 const image=await readFile(sourceImage);
 const artHash=sha(image);
 if(artHash!==lock.pngSha256[String(id)])throw new Error(`Artwork lock mismatch for seat ${id}`);
 if(image.readUInt32BE(16)!==480||image.readUInt32BE(20)!==480)throw new Error(`Seat ${id} is not a 480x480 PNG`);
 await copyFile(sourceImage,resolve(images,`${id}.png`));

 const source=JSON.parse(await readFile(resolve('site/studio/metadata',`${id}.json`),'utf8'));
 const item=collection.items.find((candidate:any)=>candidate.id===id);
 if(!item)throw new Error(`Missing locked collection item ${id}`);
 const imageUri=`${imageBase}/${id}.png`;
 const document={
  name:`hive.md Agent #${String(id).padStart(3,'0')}`,
  symbol:'HMD',
  description:'One of 888 onchain identities for independent AI-agent operators in the hive.md network.',
  image:imageUri,
  ...(externalBase?{external_url:`${externalBase}/agents/${id}`}:{ }),
  seller_fee_basis_points:0,
  attributes:source.attributes,
  collection:{name:'hive.md Agent Seats',family:'hive.md'},
  properties:{category:'image',files:[{uri:imageUri,type:'image/png'}],seed:source.properties.seed,artHash,rarityRank:item.rank,rarityScore:item.score}
 };
 const encoded=json(document),metadataHash=sha(encoded);
 await writeFile(resolve(metadataDir,`${id}.json`),encoded,{flag:'wx'});
 items.push({id,name:document.name,image:imageUri,metadataUri:metadataBase?`${metadataBase}/${id}.json`:null,imageFile:`images/${id}.png`,metadataFile:`metadata/${id}.json`,artHash,metadataHash,bytes:image.byteLength,attributes:source.attributes,rarityRank:item.rank,rarityScore:item.score});
}

// The cover is a separate copy of approved seat #155, not a 889th mintable seat.
await copyFile(resolve('site/studio/art/155.png'),resolve(images,'collection.png'));
const collectionImage=`${imageBase}/collection.png`;
const collectionMetadata={
 name:'hive.md Agent Seats',symbol:'HMD',
 description:'The verified collection of 888 hive.md AI-agent operator seats on Solana.',
 image:collectionImage,...(externalBase?{external_url:externalBase}:{ }),seller_fee_basis_points:0,
 attributes:[{trait_type:'SUPPLY',value:'888'},{trait_type:'NETWORK',value:'SOLANA'},{trait_type:'ACCESS',value:'AI AGENT OPERATOR SEAT'}],
 properties:{category:'image',files:[{uri:collectionImage,type:'image/png'}]}
};
const collectionText=json(collectionMetadata);
await writeFile(resolve(metadataDir,'collection.json'),collectionText,{flag:'wx'});

const manifest={schemaVersion:1,collection:'hive.md Agent Seats',symbol:'HMD',supply:SUPPLY,
 mintPolicy:{burnDisplayAmount:'8,888 HMD',burnWholeTokens:'8888',maxPerWallet:2,userPaysSolanaFees:true},
 imageBaseUri:imageBase,metadataBaseUri:metadataBase,collectionMetadataUri:metadataBase?`${metadataBase}/collection.json`:null,
 lockedCollectionSha256:lock.collectionSha256,collectionMetadataSha256:sha(collectionText),collectionCoverArtSha256:lock.pngSha256['155'],items};
await writeFile(resolve(output,'manifest.json'),json(manifest),{flag:'wx'});
await writeFile(resolve(output,'mint-config.json'),json({MINT_BASE_URI:metadataBase??'SET_AFTER_METADATA_UPLOAD',HMD_MINT:'SET_AFTER_HMD_LAUNCH',HMD_BURN_AMOUNT:'SET_TO_8888_X_10_POW_TOKEN_DECIMALS',SEAT_COLLECTION_ADDRESS:'SET_AFTER_COLLECTION_NFT_CREATION',MAX_SEATS_PER_WALLET:2,GAS_POLICY:'user-pays'}),{flag:'wx'});
const total=(await Promise.all(items.map(async item=>(await stat(resolve(output,item.imageFile))).size))).reduce((a,b)=>a+b,0);
console.log(`Prepared immutable release candidate: ${output}`);
console.log(`888 metadata files + 888 locked PNGs verified (${total} bytes).`);
console.log(metadataBase?'Metadata base URI is final. Run npm run nft:verify.':'Images are ready. After the metadata upload location is known, set NFT_METADATA_BASE_URI and create a new release candidate.');
