import {createAppAuth} from '@octokit/auth-app';
import type {Config} from '../shared/config.js';
import {Fault} from '../shared/domain.js';
import {loadTextSecret} from '../shared/secrets.js';

const headers=(token:string)=>({authorization:'Bearer '+token,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'});
export async function githubInstallationToken(c:Config,installationId:string){
 if(!c.GITHUB_APP_ID||(!c.GITHUB_APP_PRIVATE_KEY_PATH&&!c.GITHUB_APP_PRIVATE_KEY)||!/^[1-9][0-9]*$/.test(installationId))throw new Fault(503,'github_not_configured');
 const numeric=Number(installationId);if(!Number.isSafeInteger(numeric))throw new Fault(503,'github_installation_invalid');
 const auth=createAppAuth({appId:c.GITHUB_APP_ID,privateKey:await loadTextSecret(c.GITHUB_APP_PRIVATE_KEY_PATH,c.GITHUB_APP_PRIVATE_KEY),installationId:numeric});
 return (await auth({type:'installation'})).token;
}

async function githubJson(url:string,token:string){
 const response=await fetch(url,{headers:headers(token),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Fault(502,'github_connection_failed');
 return response.json() as Promise<any>;
}

export type ConnectedGitHubRepository={installationId:string;account:string;fullName:string;private:boolean};
export async function exchangeGitHubConnection(c:Config,code:string):Promise<ConnectedGitHubRepository[]>{
 if(!c.GITHUB_CLIENT_ID||!c.GITHUB_CLIENT_SECRET)throw new Fault(503,'github_oauth_not_configured');
 const callback=new URL('/api/github/callback',c.PUBLIC_ORIGIN).toString();
 const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify({client_id:c.GITHUB_CLIENT_ID,client_secret:c.GITHUB_CLIENT_SECRET,code,redirect_uri:callback}),signal:AbortSignal.timeout(30000)});
 const exchanged=await response.json().catch(()=>null) as any;
 if(!response.ok||typeof exchanged?.access_token!=='string')throw new Fault(502,'github_authorization_failed');
 const token=exchanged.access_token,repositories:ConnectedGitHubRepository[]=[];
 const installs=await githubJson('https://api.github.com/user/installations?per_page=100',token);
 for(const installation of (installs.installations??[]).slice(0,100)){
  const id=String(installation.id),account=String(installation.account?.login??'');
  if(!/^[1-9][0-9]*$/.test(id)||!account)continue;
  for(let page=1;page<=10;page++){
   const result=await githubJson(`https://api.github.com/user/installations/${id}/repositories?per_page=100&page=${page}`,token);
   const rows=Array.isArray(result.repositories)?result.repositories:[];
   for(const repo of rows){
    if(typeof repo?.full_name!=='string'||(!repo.permissions?.push&&!repo.permissions?.admin))continue;
    repositories.push({installationId:id,account,fullName:repo.full_name,private:Boolean(repo.private)});
   }
   if(rows.length<100)break;
  }
 }
 return repositories.sort((a,b)=>a.fullName.localeCompare(b.fullName));
}
