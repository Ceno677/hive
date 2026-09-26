import {createAppAuth} from '@octokit/auth-app';
import {readFile} from 'node:fs/promises';
import type {Config} from '../shared/config.js';
import {Fault,digest,type Bundle} from '../shared/domain.js';
export class Publisher{
 constructor(private c:Config){}
 async github(bundle:Bundle,target:string,releaseId:string){
  if(!this.c.GITHUB_APP_ID||!this.c.GITHUB_APP_PRIVATE_KEY_PATH||!this.c.GITHUB_INSTALLATION_ID)throw new Fault(503,'github_not_configured');
  const allowed=this.c.GITHUB_ALLOWED_OWNER;
  if(!allowed||!new RegExp('^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$').test(target)||target.split('/')[0]!==allowed)throw new Fault(403,'repository_not_allowed');
  const auth=createAppAuth({appId:this.c.GITHUB_APP_ID,privateKey:await readFile(this.c.GITHUB_APP_PRIVATE_KEY_PATH,'utf8'),installationId:Number(this.c.GITHUB_INSTALLATION_ID)});
  const token=await auth({type:'installation'});
  const call=async(path:string,body?:unknown)=>{
   const r=await fetch('https://api.github.com'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token.token,accept:'application/vnd.github+json','content-type':'application/json','x-github-api-version':'2022-11-28'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
   if(!r.ok)throw new Fault(502,'github_request_failed');return r.json() as Promise<any>;
  };
  const base='/repos/'+target,repo=await call(base),branch='hive/release-'+releaseId;
  // Existing published branch makes retry safe after a process crash.
  const lookup=await fetch('https://api.github.com'+base+'/git/ref/heads/'+branch,{headers:{authorization:'Bearer '+token.token},signal:AbortSignal.timeout(30000)});
  if(lookup.ok){const existing=await lookup.json() as any;return{url:'https://github.com/'+target+'/tree/'+branch,manifest:{repository:target,branch,commit:existing.object.sha}};}
  if(lookup.status!==404)throw new Fault(502,'github_lookup_failed');
  const head=await call(base+'/git/ref/heads/'+repo.default_branch),commit=await call(base+'/git/commits/'+head.object.sha);
  const tree=await call(base+'/git/trees',{base_tree:commit.tree.sha,tree:bundle.files.map(f=>({path:f.path,mode:'100644',type:'blob',content:f.content}))});
  const result=await call(base+'/git/commits',{message:'hive.md verified release '+releaseId,tree:tree.sha,parents:[head.object.sha]});
  await call(base+'/git/refs',{ref:'refs/heads/'+branch,sha:result.sha});
  return{url:'https://github.com/'+target+'/tree/'+branch,manifest:{repository:target,branch,commit:result.sha,baseCommit:head.object.sha}};
 }
 async staticSite(bundle:Bundle,target:string,releaseId:string){
  if(!this.c.NETLIFY_TOKEN||!this.c.NETLIFY_SITE_ID||target!==this.c.NETLIFY_SITE_ID)throw new Fault(503,'hosting_not_configured');
  const files=Object.fromEntries(bundle.files.map(f=>['/'+f.path,digestSha1(f.content)]));
  const headers={authorization:'Bearer '+this.c.NETLIFY_TOKEN};
  const r=await fetch('https://api.netlify.com/api/v1/sites/'+target+'/deploys',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({files,draft:true,title:'hive-'+releaseId}),signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw new Fault(502,'hosting_request_failed');
  const deploy=await r.json() as any;
  for(const hash of deploy.required??[]){
   const file=bundle.files.find(f=>digestSha1(f.content)===hash)!;
   const upload=await fetch('https://api.netlify.com/api/v1/deploys/'+deploy.id+'/files/'+file.path.split('/').map(encodeURIComponent).join('/'),{method:'PUT',headers:{...headers,'content-type':'application/octet-stream'},body:file.content,signal:AbortSignal.timeout(30000)});
   if(!upload.ok)throw new Fault(502,'hosting_upload_failed');
  }
  return{url:deploy.deploy_ssl_url,manifest:{provider:'netlify',deployId:deploy.id,files,draft:true}};
 }
}
import {createHash} from 'node:crypto';
function digestSha1(text:string){return createHash('sha1').update(text).digest('hex');}
