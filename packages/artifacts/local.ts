import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {bundleSchema,canonical,digest,Fault,type Bundle} from '../shared/domain.js';
import type {ArtifactStore} from './store.js';
// Development storage. Only hash-derived filenames are accepted; never user paths.
export class LocalArtifacts implements ArtifactStore{
 constructor(private root=resolve('.hive/artifacts')){}
 async put(input:Bundle){
  const content=canonical(bundleSchema.parse(input)),hash=digest(content);
  await mkdir(this.root,{recursive:true});
  try{await writeFile(resolve(this.root,hash+'.json'),content,{flag:'wx',mode:0o600});}catch(e:any){if(e.code!=='EEXIST')throw e;}
  return{hash,key:'sha256/'+hash,bytes:Buffer.byteLength(content)};
 }
 async get(key:string,hash:string){
  if(!/^[a-f0-9]{64}$/.test(hash)||key!=='sha256/'+hash)throw new Fault(400,'invalid_artifact_key');
  const text=await readFile(resolve(this.root,hash+'.json'),'utf8');
  if(digest(text)!==hash)throw new Fault(502,'artifact_integrity');
  return bundleSchema.parse(JSON.parse(text));
 }
}
