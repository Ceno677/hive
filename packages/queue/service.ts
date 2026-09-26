import {Queue} from 'bullmq';
import type {PrismaClient} from '@prisma/client';
export function queueConnection(url:string){
 const u=new URL(url);return{host:u.hostname,port:Number(u.port||6379),username:u.username||undefined,password:u.password||undefined,...(u.protocol==='rediss:'?{tls:{}}:{})};
}
export class Outbox {
 queue:Queue;
 constructor(private db:PrismaClient,url:string){this.queue=new Queue('hive-events',{connection:queueConnection(url)});}
 async flush(){
  const events=await this.db.event.findMany({where:{publishedAt:null},orderBy:{seq:'asc'},take:100});
  for(const e of events){
   await this.queue.add(e.type,{workflowId:e.workflowId,seq:e.seq.toString()},{jobId:e.seq.toString(),removeOnComplete:1000,removeOnFail:1000});
   await this.db.event.updateMany({where:{seq:e.seq,publishedAt:null},data:{publishedAt:new Date()}});
  }
 }
}
