import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';

const source=process.env.DATABASE_URL;
if(!source)throw Error('DATABASE_URL is required');
const name='hive_test_'+randomUUID().replaceAll('-','');
if(!/^hive_test_[a-f0-9]{32}$/.test(name))throw Error('Unsafe generated database name');
const testUrl=new URL(source);
testUrl.pathname='/'+name;
testUrl.searchParams.delete('schema');
const admin=new PrismaClient({datasourceUrl:source});
let created=false;
let status=1;
try{
 await admin.$executeRawUnsafe('CREATE DATABASE "'+name+'"');
 created=true;
 console.log('Created isolated integration database '+name+'.');
 status=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','infra/scripts/test-integration.ts','--skip-sandbox'],{
  env:{...process.env,TEST_DATABASE_URL:testUrl.href,TEST_REMOTE_DATABASE:'true'},stdio:'inherit',windowsHide:true
 }).status??1;
}finally{
 if(created){
  await admin.$executeRawUnsafe("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",name);
  await admin.$executeRawUnsafe('DROP DATABASE "'+name+'"');
  console.log('Removed isolated integration database '+name+'.');
 }
 await admin.$disconnect();
}
process.exitCode=status;
