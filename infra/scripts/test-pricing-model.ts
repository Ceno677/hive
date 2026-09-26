import {config} from '../../packages/shared/config.js';
import {HttpModel,modelConfig} from '../../packages/ai/provider.js';
import {marketEstimate} from '../../packages/pricing/quote.js';

const c=config();
const result=await marketEstimate(new HttpModel(modelConfig(c,'PRICING')),
 'Build a responsive production website with wallet authentication, an API, database persistence, tests and GitHub delivery.',
 {title:'Pricing smoke test',tasks:[
  {key:'frontend',title:'Frontend',instructions:'Build the accessible responsive frontend',skill:'static',dependencies:[],paths:['site'],acceptance:['Responsive and keyboard accessible']},
  {key:'api',title:'API',instructions:'Build and test the authenticated API',skill:'node',dependencies:[],paths:['api'],acceptance:['Authentication and errors are tested']},
  {key:'integration',title:'Integration',instructions:'Integrate and test the complete project',skill:'node',dependencies:['frontend','api'],paths:['integration'],acceptance:['The complete workflow passes tests']}
 ]},'BUILD');
console.log(JSON.stringify(result,null,2));
