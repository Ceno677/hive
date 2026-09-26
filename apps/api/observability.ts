import type {FastifyInstance} from 'fastify';
import {timingSafeEqual} from 'node:crypto';
import {jsonSchema} from '../../packages/shared/http-schemas.js';
import type {Config} from '../../packages/shared/config.js';
export function observe(app:FastifyInstance,c:Config){
 const counters=new Map<string,number>(),paths:Record<string,any>={};
 app.addHook('onRoute',route=>{
  if(!route.url.startsWith('/api/'))return;
  const path=route.url.replace(/:([a-zA-Z]+)/g,'{$1}'),methods=Array.isArray(route.method)?route.method:[route.method];
  paths[path]??={};
  for(const method of methods){
   if(method==='HEAD')continue;
   const body=jsonSchema(route.url);
   paths[path][method.toLowerCase()]={operationId:method.toLowerCase()+route.url.replace(/[^a-zA-Z0-9]/g,'_'),parameters:[...route.url.matchAll(/:([a-zA-Z]+)/g)].map(m=>({name:m[1],in:'path',required:true,schema:{type:'string',format:'uuid'}})),...(body?{requestBody:{required:true,content:{'application/json':{schema:body}}}}:{}),responses:{200:{description:'Successful operation'},400:{description:'Invalid input'},401:{description:'Authentication required'},403:{description:'Not authorized'},409:{description:'State conflict'},503:{description:'Dependency or configuration unavailable'}}};
  }
 });
 app.addHook('onResponse',async(req,reply)=>{
  const key=(req.routeOptions.url??'unmatched')+'|'+reply.statusCode;
  counters.set(key,(counters.get(key)??0)+1);
 });
 app.get('/api/openapi.json',async()=>({openapi:'3.0.3',info:{title:'hive.md API',version:'1.0.0',description:'Wallet sessions use an HttpOnly cookie and X-CSRF-Token for mutations. Hosted agents use scoped bearer credentials. Monetary values are decimal strings in token base units.'},paths}));
 app.get('/metrics',async(req,reply)=>{
  const expected=c.OPERATIONS_TOKEN,actual=req.headers.authorization?.replace(/^Bearer /,'');
  if(!expected||!actual||Buffer.byteLength(expected)!==Buffer.byteLength(actual)||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))return reply.code(404).send();
  const lines=['# TYPE hive_http_requests_total counter'];
  for(const [key,value]of counters){const [route,status]=key.split('|');lines.push('hive_http_requests_total{route='+JSON.stringify(route)+',status='+JSON.stringify(status)+'} '+value);}
  return reply.header('content-type','text/plain; version=0.0.4').send(lines.join('\n')+'\n');
 });
}
