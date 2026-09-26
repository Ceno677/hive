import {readFile} from 'node:fs/promises';
import {db} from '../../packages/database/client.js';
const lock=JSON.parse(await readFile('nft-source/collection.lock.json','utf8'));
for(let id=1;id<=888;id++)await db.seat.upsert({where:{id},create:{id,imageHash:lock.pngSha256[String(id)]},update:{}});
console.log('Imported 888 artwork identities; no ownership or minting inferred.');
await db.$disconnect();
