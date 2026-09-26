import {S3Client,CreateBucketCommand} from '@aws-sdk/client-s3';
import {config} from '../../packages/shared/config.js';
const c=config(),client=new S3Client({endpoint:c.S3_ENDPOINT,region:c.S3_REGION,forcePathStyle:true,credentials:{accessKeyId:c.S3_ACCESS_KEY,secretAccessKey:c.S3_SECRET_KEY}});
try{await client.send(new CreateBucketCommand({Bucket:c.S3_BUCKET}));console.log('Private artifact bucket created.');}
catch(e:any){if(!['BucketAlreadyOwnedByYou','BucketAlreadyExists'].includes(e.name))throw e;console.log('Artifact bucket already exists.');}
