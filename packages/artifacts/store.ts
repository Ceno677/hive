import {S3Client,PutObjectCommand,GetObjectCommand,HeadObjectCommand} from '@aws-sdk/client-s3';
import type {Config} from '../shared/config.js';
import {bundleSchema,canonical,digest,Fault,type Bundle} from '../shared/domain.js';
export interface ArtifactStore { put(bundle:Bundle):Promise<{hash:string;key:string;bytes:number}>; get(key:string,hash:string):Promise<Bundle> }
export class S3Artifacts implements ArtifactStore {
 private client:S3Client;
 constructor(private c:Config){this.client=new S3Client({endpoint:c.S3_ENDPOINT,region:c.S3_REGION,forcePathStyle:true,credentials:{accessKeyId:c.S3_ACCESS_KEY,secretAccessKey:c.S3_SECRET_KEY}});}
 async put(input:Bundle){
  const data=canonical(bundleSchema.parse(input)),hash=digest(data),key='sha256/'+hash;
  let exists=false;
  try{await this.client.send(new HeadObjectCommand({Bucket:this.c.S3_BUCKET,Key:key}));exists=true;}
  catch(e:any){if(e.$metadata?.httpStatusCode!==404&&e.name!=='NotFound'&&e.Code!=='NoSuchKey')throw e;}
  if(!exists)await this.client.send(new PutObjectCommand({Bucket:this.c.S3_BUCKET,Key:key,Body:data,ContentType:'application/json'}));
  await this.get(key,hash);
  return{hash,key,bytes:Buffer.byteLength(data)};
 }
 async get(key:string,hash:string){
  if(key!=='sha256/'+hash||!/^[a-f0-9]{64}$/.test(hash))throw new Fault(400,'invalid_artifact_key');
  const r=await this.client.send(new GetObjectCommand({Bucket:this.c.S3_BUCKET,Key:key}));
  const text=await r.Body!.transformToString();
  if(digest(text)!==hash)throw new Fault(502,'artifact_integrity');
  return bundleSchema.parse(JSON.parse(text));
 }
}
