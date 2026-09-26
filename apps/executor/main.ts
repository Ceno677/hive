import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {z,ZodError} from 'zod';
import {bundleSchema,Fault} from '../../packages/shared/domain.js';
import {allowedExecutionCommand,DockerExecutor} from '../../packages/execution/docker.js';

const env=z.object({PORT:z.coerce.number().int().min(1).max(65535).default(8090),EXECUTOR_TOKEN:z.string().min(32),SANDBOX_IMAGE:z.string().default('hive-sandbox:local'),RUST_SANDBOX_IMAGE:z.string().optional(),SOLANA_BUILD_IMAGE:z.string().optional()}).parse(process.env);
const app=Fastify({logger:{redact:['req.headers.authorization','req.body']},bodyLimit:3_500_000}),executor=new DockerExecutor(env.SANDBOX_IMAGE,true);
await app.register(rateLimit,{max:30,timeWindow:'1 minute'});
const authorized=(header:string|undefined)=>{
 const actual=header?.match(/^Bearer (.+)$/)?.[1];
 return Boolean(actual&&Buffer.byteLength(actual)===Buffer.byteLength(env.EXECUTOR_TOKEN)&&timingSafeEqual(Buffer.from(actual),Buffer.from(env.EXECUTOR_TOKEN)));
};
app.setErrorHandler((error,request,reply)=>{
 if(error instanceof Fault)return reply.code(error.status).send({error:error.code});
 if(error instanceof ZodError)return reply.code(400).send({error:'invalid_input'});
 request.log.error({err:error},'Execution failed');return reply.code(500).send({error:'execution_failed'});
});
app.get('/health',async()=>({status:'ok'}));
app.get('/ready',async(req,reply)=>{
 if(!authorized(req.headers.authorization))return reply.code(404).send();
 for(const image of [...new Set([env.SANDBOX_IMAGE,env.RUST_SANDBOX_IMAGE,env.SOLANA_BUILD_IMAGE].filter(Boolean))] as string[])await promisify(execFile)('docker',['image','inspect',image],{windowsHide:true});
 return{status:'ready',images:[env.SANDBOX_IMAGE,...[env.RUST_SANDBOX_IMAGE,env.SOLANA_BUILD_IMAGE].filter(Boolean)]};
});
app.post('/execute',async(req,reply)=>{
 if(!authorized(req.headers.authorization))return reply.code(404).send();
 const body=z.object({bundle:bundleSchema,command:z.array(z.string().min(1).max(500)).min(1).max(30)}).strict().parse(req.body);
 if(!allowedExecutionCommand(body.command))throw new Fault(422,'execution_command_not_allowed');
 return executor.run(body.bundle,body.command);
});
await app.listen({host:'0.0.0.0',port:env.PORT});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});
