const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
let input='';
process.stdin.on('data',x=>{input+=x;if(input.length>4000000)process.exit(65)});
process.stdin.on('end',()=>{
 try{
  const request=JSON.parse(input);
  for(const f of request.files){
   if(!/^[a-zA-Z0-9_./@ -]+$/.test(f.path)||f.path.split('/').some(x=>!x||x==='..'||x==='.')||f.path.startsWith('/')||f.path.startsWith('.hive/'))throw Error('invalid_path');
   const p=path.join('/work',f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.content,{flag:'wx'});
  }
  const start=Date.now(),[command,...args]=request.command;
  const programBuild=args.includes('/runner/build-solana.cjs');
  const r=cp.spawnSync(command,args,{cwd:'/work',env:{PATH:process.env.PATH,HOME:'/tmp',CI:'true',RUSTUP_HOME:process.env.RUSTUP_HOME,CARGO_HOME:process.env.CARGO_HOME},encoding:'utf8',timeout:programBuild?240000:90000,maxBuffer:programBuild?2500000:256000});
  const stdout=(r.stdout||'').slice(0,programBuild?2500000:64000),stderr=(r.stderr||'').slice(0,64000);
  // Exit 0 with no discovered tests is not a valid Node test result.
  const noTests=command==='node'&&args[0]==='--test'&&!/# tests [1-9][0-9]*/.test(stdout);
  process.stdout.write(JSON.stringify({exitCode:noTests?1:(r.status??1),stdout,stderr:noTests?'No tests discovered':stderr,durationMs:Date.now()-start,command:request.command}));
 }catch(e){process.stdout.write(JSON.stringify({exitCode:1,stdout:'',stderr:String(e.message),durationMs:0,command:[]}));process.exitCode=1;}
});
