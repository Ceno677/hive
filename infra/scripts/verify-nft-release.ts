import 'dotenv/config';
import {createHash} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const SUPPLY=888;
const root=resolve(process.env.NFT_RELEASE_DIR??'publication');
const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
const lock=JSON.parse(await readFile('nft-source/collection.lock.json','utf8'));
const sha=(data:Buffer|string)=>createHash('sha256').update(data).digest('hex');
const durable=(value:unknown)=>typeof value==='string'&&/^(https:\/\/|ipfs:\/\/|ar:\/\/)/.test(value)&&!/placeholder|pending|replace|\{\{|__+/i.test(value);
const fail=(message:string):never=>{throw new Error(message);};

if(manifest.schemaVersion!==1||manifest.supply!==SUPPLY||manifest.items?.length!==SUPPLY)fail('Manifest must contain exactly 888 items');
if(manifest.mintPolicy?.burnWholeTokens!=='8888'||manifest.mintPolicy?.maxPerWallet!==2||manifest.mintPolicy?.userPaysSolanaFees!==true)fail('Mint policy mismatch');
if(manifest.lockedCollectionSha256!==lock.collectionSha256)fail('Collection lock mismatch');
if(!durable(manifest.imageBaseUri))fail('Image base URI is not durable');
if(manifest.metadataBaseUri!==null&&!durable(manifest.metadataBaseUri))fail('Metadata base URI is not durable');

const imageNames=(await readdir(resolve(root,'images'))).sort();
const metadataNames=(await readdir(resolve(root,'metadata'))).sort();
if(imageNames.length!==SUPPLY+1||!imageNames.includes('collection.png'))fail('Release must contain 888 images plus collection.png');
if(metadataNames.length!==SUPPLY+1||!metadataNames.includes('collection.json'))fail('Release must contain 888 metadata files plus collection.json');

const artHashes=new Set<string>(),metadataHashes=new Set<string>();
for(let id=1;id<=SUPPLY;id++){
 const row=manifest.items[id-1];
 if(row.id!==id)fail(`Manifest order/ID mismatch at ${id}`);
 const image=await readFile(resolve(root,row.imageFile));
 if(image.subarray(1,4).toString()!=='PNG'||image.readUInt32BE(16)!==480||image.readUInt32BE(20)!==480)fail(`Invalid PNG ${id}`);
 const artHash=sha(image);
 if(artHash!==lock.pngSha256[String(id)]||artHash!==row.artHash)fail(`Art hash mismatch ${id}`);
 if(artHashes.has(artHash))fail(`Duplicate artwork ${id}`);
 artHashes.add(artHash);

 const text=await readFile(resolve(root,row.metadataFile),'utf8');
 const document=JSON.parse(text),metadataHash=sha(text);
 if(metadataHash!==row.metadataHash||metadataHashes.has(metadataHash))fail(`Metadata hash mismatch/duplicate ${id}`);
 metadataHashes.add(metadataHash);
 if(document.name!==`hive.md Agent #${String(id).padStart(3,'0')}`||document.symbol!=='HMD')fail(`Identity mismatch ${id}`);
 if(document.image!==`${manifest.imageBaseUri}/${id}.png`||document.properties?.files?.[0]?.uri!==document.image)fail(`Image URI mismatch ${id}`);
 if(document.seller_fee_basis_points!==0||document.properties?.category!=='image'||document.properties?.artHash!==artHash)fail(`Metadata policy mismatch ${id}`);
 if(!Array.isArray(document.attributes)||document.attributes.length!==7||document.attributes.some((a:any)=>a.trait_type!==a.trait_type.toUpperCase()||a.value!==a.value.toUpperCase()))fail(`Trait metadata mismatch ${id}`);
 if(manifest.metadataBaseUri&&row.metadataUri!==`${manifest.metadataBaseUri}/${id}.json`)fail(`Metadata URI mismatch ${id}`);
}

const collectionText=await readFile(resolve(root,'metadata/collection.json'),'utf8');
const collection=JSON.parse(collectionText);
if(sha(collectionText)!==manifest.collectionMetadataSha256||collection.name!=='hive.md Agent Seats'||collection.symbol!=='HMD'||collection.seller_fee_basis_points!==0)fail('Collection metadata mismatch');
if(collection.image!==`${manifest.imageBaseUri}/collection.png`)fail('Collection image URI mismatch');
const cover=await readFile(resolve(root,'images/collection.png'));
if(sha(cover)!==lock.pngSha256['155'])fail('Collection cover mismatch');

console.log(`NFT RELEASE VERIFIED: 888/888 unique locked assets and metadata files in ${root}`);
console.log(manifest.metadataBaseUri?'READY FOR COLLECTION CREATION AND PROGRAM INITIALIZATION':'METADATA PACKAGE READY FOR UPLOAD; SET ITS RESULTING DIRECTORY URI AS MINT_BASE_URI');
