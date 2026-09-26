import type {PrismaClient} from '@prisma/client';
import type {ArtifactStore} from './store.js';
import {combine,overlay} from '../execution/docker.js';
import {Fault,type Bundle} from '../shared/domain.js';
export async function assemble(db:PrismaClient,store:ArtifactStore,taskId:string,seen=new Set<string>()):Promise<Bundle>{
 if(seen.has(taskId))throw new Fault(409,'artifact_cycle');
 seen.add(taskId);
 const t=await db.task.findUniqueOrThrow({where:{id:taskId},include:{dependencies:true}});
 const parents=await Promise.all(t.dependencies.map(d=>assemble(db,store,d.parentId,new Set(seen))));
 const base=parents.length?combine(parents):{files:[]};
 if(!t.acceptedArtifact)return base;
 const a=await db.artifact.findUniqueOrThrow({where:{id:t.acceptedArtifact}});
 return overlay(base,await store.get(a.objectKey,a.hash));
}
