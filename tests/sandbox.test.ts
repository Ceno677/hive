import {describe,it,expect} from 'vitest';
import {DockerExecutor} from '../packages/execution/docker.js';
describe.skipIf(process.env.TEST_SANDBOX!=='true')('real isolated execution',()=>{
 const runner=new DockerExecutor('hive-sandbox:local',true);
 it('executes real tests with no network, secret variables or writable root',async()=>{
  const r=await runner.run({files:[{path:'isolation.test.cjs',content:`
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('isolated',()=>{assert.equal(process.env.AI_API_KEY,undefined);assert.throws(()=>fs.writeFileSync('/etc/hive-test','x'));assert.equal(fs.existsSync('/var/run/docker.sock'),false);});
`}]},['node','--test']);
  expect(r.exitCode).toBe(0);expect(r.stdout).toContain('pass 1');
 });
 it('fails on empty test suites',async()=>{
  const r=await runner.run({files:[{path:'hello.js',content:'console.log("hello")'}]},['node','--test']);
  expect(r.exitCode).not.toBe(0);
 });
 it('validates actual static asset references',async()=>{
  const r=await runner.run({files:[{path:'index.html',content:'<html><body><img src="missing.png"></body></html>'}]},['node','/runner/check-static.cjs']);
  expect(r.exitCode).not.toBe(0);
 });
});
