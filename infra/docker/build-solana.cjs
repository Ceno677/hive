const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const build=cp.spawnSync('anchor',['build','--','--offline'],{cwd:'/work',encoding:'utf8',timeout:80000,maxBuffer:256000});
if(build.status!==0){process.stderr.write(build.stderr||'Anchor build failed');process.exit(1);}
const programs=fs.readdirSync('/work/target/deploy').filter(f=>f.endsWith('.so'));
if(programs.length!==1)throw Error('One program per deployment is required');
const name=path.basename(programs[0],'.so'),binary=fs.readFileSync('/work/target/deploy/'+programs[0]);
if(binary.length>1500000)throw Error('Program exceeds configured limit');
const idl=JSON.parse(fs.readFileSync('/work/target/idl/'+name+'.json','utf8'));
process.stdout.write(JSON.stringify({binary:binary.toString('base64'),idl}));
