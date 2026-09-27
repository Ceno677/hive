import {Worker as QueueWorker} from 'bullmq';
import {config} from '../../packages/shared/config.js';
import {db} from '../../packages/database/client.js';
import {createChain} from '../../packages/solana/factory.js';
import {artifactStore} from '../../packages/artifacts/factory.js';
import {HttpModel,modelConfig} from '../../packages/ai/provider.js';
import {createExecutor} from '../../packages/execution/factory.js';
import {Engine} from '../../packages/orchestrator/engine.js';
import {Payments} from '../../packages/payments/requests.js';
import {Scheduler} from '../../packages/orchestrator/scheduler.js';
import {HostedPool} from '../../packages/orchestrator/hosted-pool.js';
import {ProviderRuntime} from '../../worker/daemon/runtime.js';
import {Outbox,queueConnection} from '../../packages/queue/service.js';
const c=config(),chain=createChain(c),store=artifactStore(c),engine=new Engine(db,chain,store,c),executor=createExecutor(c);
const reviewer=new HttpModel(modelConfig(c,'REVIEWER'));
const scheduler=new Scheduler(db,engine,new Payments(db,chain,engine,c),store,executor,reviewer,new HttpModel(modelConfig(c,'FINAL')));
const hosted=new HostedPool(db,engine,store,executor,new ProviderRuntime(new HttpModel(modelConfig(c,'BUILDER')),executor,reviewer,c.AGENT_REPAIR_PASSES),c);
const outbox=new Outbox(db,c.REDIS_URL);
let busy=false,stopping=false;
const report=(e:unknown)=>console.error(JSON.stringify({level:'error',service:'scheduler',message:e instanceof Error?e.message:'failure'}));
async function tick(){
 if(busy||stopping)return;busy=true;
 try{await scheduler.tick(report);}catch(e){report(e);}
 try{await hosted.tick(report);}catch(e){report(e);}
 try{await outbox.flush();}catch(e){report(e);}
 finally{busy=false;}
}
const consumer=new QueueWorker('hive-events',async()=>tick(),{connection:queueConnection(c.REDIS_URL),concurrency:1});
consumer.on('error',report);
const timer=setInterval(tick,5000);await tick();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{stopping=true;clearInterval(timer);await consumer.close();await outbox.queue.close();await db.$disconnect();process.exit(0);});
