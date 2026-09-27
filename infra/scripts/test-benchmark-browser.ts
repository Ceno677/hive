import {resolve} from 'node:path';
import {auditBenchmarkBrowser} from './benchmark-browser.js';
const root=resolve('.hive','benchmarks',process.env.BENCHMARK_RUN_ID??'signal-board');
const result=await auditBenchmarkBrowser(root,resolve(root,'artifact'));
if(!result.passed)throw new Error(result.errors.join('; '));
console.log(JSON.stringify(result));
