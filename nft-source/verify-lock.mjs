import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const lock=JSON.parse(readFileSync(new URL('./collection.lock.json',import.meta.url)));
const data=JSON.parse(readFileSync(new URL('../site/studio/collection.json',import.meta.url)));
for(const item of data.items){const actual=createHash('sha256').update(readFileSync(new URL(`../site/studio/art/${item.id}.png`,import.meta.url))).digest('hex');if(actual!==lock.pngSha256[String(item.id)])throw Error(`Artwork changed: ${item.id}`);for(const a of item.attributes)if(a.value!==a.value.toUpperCase()||a.trait_type!==a.trait_type.toUpperCase())throw Error('Non-uppercase trait');}
const hash=createHash('sha256').update(readFileSync(new URL('../site/studio/collection.json',import.meta.url))).digest('hex');if(hash!==lock.collectionSha256)throw Error('Collection manifest changed');console.log('LOCK VERIFIED: 888 artworks and approved collection manifest match. All traits uppercase.');
