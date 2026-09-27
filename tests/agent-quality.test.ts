import {it,expect,vi} from 'vitest';
import {ProviderRuntime} from '../worker/daemon/runtime.js';
import {config,missingModels} from '../packages/shared/config.js';
import {modelConfig} from '../packages/ai/provider.js';
import {mintPriceBaseUnits} from '../packages/shared/mint-price.js';
import {deploymentAddress} from '../packages/delivery/solana-deploy.js';
const task={policy:{paths:['index.html','app.js'],command:['node','check'],acceptance:['Button works']}};
const ok={decision:'ACCEPT',checks:[{name:'Button works',passed:true,evidence:'Handler implements action'}],issues:[]};
const no={decision:'REJECT',checks:[{name:'Button works',passed:false,evidence:'Missing handler'}],issues:['Wire up the button']};
const patch={files:[{path:'index.html',content:'<button>Go</button>'}]};
const executor=()=>({run:vi.fn().mockResolvedValue({exitCode:0,stdout:'',stderr:'',durationMs:1,command:['node','check'],artifactHash:'test',image:'fixture'})});
it('repairs semantic defects even when deterministic checks pass and preserves earlier files',async()=>{
 const builder={json:vi.fn().mockResolvedValueOnce(patch).mockResolvedValueOnce({files:[{path:'app.js',content:'document.querySelector("button").onclick=()=>{};'}]})};
 const reviewer={json:vi.fn().mockResolvedValueOnce(no).mockResolvedValueOnce(ok)};
 const out=await new ProviderRuntime(builder,executor(),reviewer,2).build(task,{files:[]},null);
 expect(out.files.map(f=>f.path)).toEqual(['index.html','app.js']);
 expect(JSON.parse(builder.json.mock.calls[1][1]).feedback.critique.issues).toEqual(no.issues);
});
it('never submits an exhausted failed-quality patch as successful output',async()=>{
 const builder={json:vi.fn().mockResolvedValue(patch)},reviewer={json:vi.fn().mockResolvedValue(no)};
 await expect(new ProviderRuntime(builder,executor(),reviewer,2).build(task,{files:[]},null)).rejects.toThrow('Build did not satisfy');
 expect(builder.json).toHaveBeenCalledTimes(2);
});
it('does not accept a contradictory reviewer approval',async()=>{
 const builder={json:vi.fn().mockResolvedValue(patch)},reviewer={json:vi.fn().mockResolvedValue({...no,decision:'ACCEPT'})};
 await expect(new ProviderRuntime(builder,executor(),reviewer,1).build(task,{files:[]},null)).rejects.toThrow();
});
it('rejects out-of-scope files before running them',async()=>{
 const runner=executor(),builder={json:vi.fn().mockResolvedValue({files:[{path:'server.js',content:'no'}]})};
 await expect(new ProviderRuntime(builder,runner).build(task,{files:[]},null)).rejects.toThrow('write_outside_policy');
 expect(runner.run).not.toHaveBeenCalled();
});
it('selects explicit models per role without changing the base configuration',()=>{
 const c=config({AI_MODEL:'base-model',AI_BUILDER_MODEL:'builder-model',AI_REVIEWER_MODEL:'review-model'});
 expect(modelConfig(c,'BUILDER').AI_MODEL).toBe('builder-model');
 expect(modelConfig(c,'REVIEWER').AI_MODEL).toBe('review-model');
 expect(modelConfig(c,'PLANNER').AI_REASONING_EFFORT).toBe('medium');
 expect(modelConfig(c,'BUILDER').AI_REASONING_EFFORT).toBe('high');
 expect(modelConfig(c,'FINAL').AI_MODEL).toBe('base-model');expect(c.AI_MODEL).toBe('base-model');
});
it('accepts four role-specific models without requiring a redundant base model',()=>{
 const c=config({AI_PLANNER_MODEL:'planner',AI_BUILDER_MODEL:'builder',AI_REVIEWER_MODEL:'reviewer',AI_FINAL_MODEL:'final'});
 expect(missingModels(c)).toEqual([]);
});
it('converts the approved 8,888-token mint price without floating point arithmetic',()=>{
 expect(mintPriceBaseUnits(6)).toBe('8888000000');expect(mintPriceBaseUnits(9)).toBe('8888000000000');
 expect(()=>mintPriceBaseUnits(16)).toThrow();expect(()=>mintPriceBaseUnits(-1)).toThrow();
});
it('defaults to two seats per wallet and a two-review quorum',()=>{
 const c=config({NODE_ENV:'test'});expect(c.MAX_SEATS_PER_WALLET).toBe('2');expect(c.REVIEW_QUORUM).toBe(2);
});
it('derives a stable and distinct Solana program address for each workflow',()=>{
 const c=config({DEPLOY_PROGRAM_SEED:'test-only-seed-with-at-least-32-characters'});
 expect(deploymentAddress(c,'wallet:job-a')).toBe(deploymentAddress(c,'wallet:job-a'));
 expect(deploymentAddress(c,'wallet:job-a')).not.toBe(deploymentAddress(c,'wallet:job-b'));
});
