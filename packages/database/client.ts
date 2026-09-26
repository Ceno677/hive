import { PrismaClient, Prisma } from '@prisma/client';
import { config } from '../shared/config.js';
export const db = new PrismaClient({datasourceUrl:config().DATABASE_URL});
export type Tx = Prisma.TransactionClient;
export async function serial<T>(fn:(tx:Tx)=>Promise<T>, client:PrismaClient=db):Promise<T>{
 for(let attempt=0;;attempt++){
  try{return await client.$transaction(fn,{isolationLevel:'Serializable',maxWait:10000,timeout:15000});}
  catch(e){if(!(e instanceof Prisma.PrismaClientKnownRequestError)||e.code!=='P2034'||attempt>=4)throw e;}
 }
}
export async function event(tx:Tx,workflowId:string,type:string,data:Prisma.InputJsonValue={}){
 return tx.event.create({data:{workflowId,type,data}});
}
