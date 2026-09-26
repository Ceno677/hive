import {describe,it,expect} from 'vitest';
import {validatePlan,split,independent,safePath,checkWrites,hash,reputation} from '../packages/shared/domain.js';
const task=(key:string,dependencies:string[]=[])=>({key,title:key,instructions:'Build a useful site',skill:'static',dependencies,paths:['index.html'],acceptance:['Site renders correctly']});
describe('domain invariants',()=>{
 it('accepts a fanout with final join',()=>expect(validatePlan({title:'Example',tasks:[task('a'),task('b'),task('final',['a','b'])]}).tasks).toHaveLength(3));
 it('rejects cycles',()=>expect(()=>validatePlan({title:'X',tasks:[task('a',['b']),task('b',['a'])]})).toThrow('cyclic_plan'));
 it('rejects missing dependency',()=>expect(()=>validatePlan({title:'X',tasks:[task('a',['missing'])]})).toThrow('unknown_dependency'));
 it('rejects duplicated keys',()=>expect(()=>validatePlan({title:'X',tasks:[task('a'),task('a')]})).toThrow());
 it('requires integration join',()=>expect(()=>validatePlan({title:'X',tasks:[task('a'),task('b')]})).toThrow('plan_requires_final_join'));
 it('uses exact accounting above Number precision',()=>{
  const amount=9007199254740993123n,s=split(amount,8000,1500);
  expect(s.builder+s.verifier+s.protocol).toBe(amount);
 });
 it('rejects invalid fee splits',()=>expect(()=>split(1n,9000,2000)).toThrow());
 it('canonical hashes ignore object key insertion order',()=>expect(hash({a:1,b:2})).toBe(hash({b:2,a:1})));
 it('denies same-seat and same-owner reviews',()=>{
  const a={id:'a',wallet:'owner',seatId:1};
  expect(independent(a,{id:'b',wallet:'owner',seatId:2})).toBe(false);
  expect(independent(a,{id:'b',wallet:'other',seatId:1})).toBe(false);
  expect(independent(a,{id:'b',wallet:'other',seatId:2})).toBe(true);
 });
 it.each(['../secret','/etc/passwd','C:/secret','a/../b','a\\b','a//b'])('rejects unsafe path %s',p=>expect(safePath.safeParse(p).success).toBe(false));
 it('enforces task write scope',()=>expect(()=>checkWrites({files:[{path:'api/secret',content:'x'}]},['ui'])).toThrow());
 it('smooths small samples',()=>expect(reputation(1,0,0)).toBeLessThan(reputation(100,1,0)));
});
