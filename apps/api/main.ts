import {config} from '../../packages/shared/config.js';
import {db} from '../../packages/database/client.js';
import {createChain} from '../../packages/solana/factory.js';
import {artifactStore} from '../../packages/artifacts/factory.js';
import {HttpModel,modelConfig} from '../../packages/ai/provider.js';
import {buildServer} from './server.js';
const c=config(),{app}=buildServer({db,c,chain:createChain(c),store:artifactStore(c),model:new HttpModel(modelConfig(c,'PLANNER')),pricingModel:new HttpModel(modelConfig(c,'PRICING'))});
await app.listen({port:c.PORT,host:'0.0.0.0'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();await db.$disconnect();process.exit(0);});
