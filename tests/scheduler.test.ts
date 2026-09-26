import {it,expect,vi} from 'vitest';
import {Scheduler} from '../packages/orchestrator/scheduler.js';

it.each(['PROGRAM','FRONTEND'])('uses stage-aware final validation for %s',async stage=>{
 const flow={id:'flow',status:'VERIFYING',mode:'SOLANA_APP',stage,prompt:'Build a Solana program and website',tasks:[{id:'task',state:'ACCEPTED',dependents:[],policy:{command:['node','check'],acceptance:['Program logic works']}}]};
 const db={workflow:{findUniqueOrThrow:vi.fn().mockResolvedValue(flow)}};
 const engine={finish:vi.fn()},model={json:vi.fn(async(_system:string,_input:string)=>({passed:true,reason:'Test fixture'}))};
 const executor={run:vi.fn().mockResolvedValue({exitCode:0,stdout:'',stderr:''})};
 const scheduler=new Scheduler(db as any,engine as any,{} as any,{} as any,executor as any,model);
 vi.spyOn(scheduler,'artifactTree').mockResolvedValue({files:[{path:'index.html',content:'<html>Fixture</html>'}]});
 await scheduler.final('flow');
 expect(model.json).toHaveBeenCalledOnce();
 const instruction=String(model.json.mock.calls[0][0]);
 expect(instruction.includes('program-only stage')).toBe(stage==='PROGRAM');
 expect(engine.finish).toHaveBeenCalledWith('flow',expect.anything(),true);
});
