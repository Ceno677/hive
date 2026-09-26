import {randomUUID} from 'node:crypto';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {config} from '../../packages/shared/config.js';

const c=config(),key='_health/'+randomUUID()+'.txt',body='hive-storage-smoke-'+randomUUID();
if(c.ARTIFACT_STORAGE!=='s3')throw Error('ARTIFACT_STORAGE must be s3');
const client=new S3Client({endpoint:c.S3_ENDPOINT,region:c.S3_REGION,forcePathStyle:true,credentials:{accessKeyId:c.S3_ACCESS_KEY,secretAccessKey:c.S3_SECRET_KEY}});
let written=false;
try{
 await client.send(new PutObjectCommand({Bucket:c.S3_BUCKET,Key:key,Body:body,ContentType:'text/plain'}));
 written=true;
 const result=await client.send(new GetObjectCommand({Bucket:c.S3_BUCKET,Key:key}));
 if(!result.Body)throw Error('Storage returned an empty response body');
 const received=await result.Body.transformToString();
 if(received!==body)throw Error('Storage round-trip content mismatch');
 console.log('Private artifact storage write/read check passed.');
}finally{
 if(written){
  await client.send(new DeleteObjectCommand({Bucket:c.S3_BUCKET,Key:key}));
  console.log('Temporary storage test object deleted.');
 }
 client.destroy();
}
