const fs=require('node:fs'),path=require('node:path');
if(!fs.existsSync('index.html'))throw Error('index.html is required');
const html=fs.readFileSync('index.html','utf8');
if(!/<html[\s>]/i.test(html)||!/<body[\s>]/i.test(html))throw Error('HTML must include html and body');
for(const m of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)){
 const url=m[1];
 if(/^(https?:|data:|mailto:|tel:|\/\/)/.test(url))continue;
 const local=url.replace(/^\//,'');
 if(local.includes('..')||!fs.existsSync(path.resolve(local)))throw Error('Missing or unsafe local asset: '+url);
}
console.log('Static entrypoint and local asset references verified');
