import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {extname,resolve,sep} from 'node:path';
import {chromium} from '@playwright/test';

export async function auditBenchmarkBrowser(root:string,artifactRoot:string){
 const errors:string[]=[];
 const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
 const server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url??'/','http://localhost').pathname),relative=pathname==='/'?'index.html':pathname.slice(1),target=resolve(artifactRoot,relative);
   if(target!==artifactRoot&&!target.startsWith(artifactRoot+sep)){res.writeHead(403).end();return;}
   res.writeHead(200,{'content-type':types[extname(target)]??'application/octet-stream'}).end(await readFile(target));
  }catch{res.writeHead(404).end();}
 });
 await new Promise<void>((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:'+(server.address() as AddressInfo).port,{waitUntil:'networkidle'});
  const input=page.locator('input[type="text"]').first();
  if(await input.count()){await input.fill('Browser quality check');const add=page.getByRole('button',{name:/add/i}).first();if(await add.count())await add.click();}
  for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
   await page.setViewportSize(viewport);
   const audit=await page.locator('body').evaluate(body=>{
    const root=document.documentElement,failures:string[]=[];
    if(root.scrollWidth>root.clientWidth+1)failures.push(`page horizontal overflow ${root.scrollWidth}>${root.clientWidth}`);
    for(const element of body.querySelectorAll<HTMLElement>('button,input,textarea,select,a[href]')){
     const style=getComputedStyle(element);if(style.display==='none'||style.visibility==='hidden')continue;
     const labels='labels' in element?[...((element as HTMLInputElement).labels??[])].map(label=>label.textContent?.trim()).join(' '):'';
     const name=element.getAttribute('aria-label')||element.getAttribute('title')||element.textContent?.trim()||labels;
     if(!name)failures.push(`${element.tagName.toLowerCase()} has no accessible name`);
     if(element.scrollWidth>element.clientWidth+1||element.scrollHeight>element.clientHeight+1)failures.push(`${element.tagName.toLowerCase()} content overflows ${element.clientWidth}x${element.clientHeight} with ${element.scrollWidth}x${element.scrollHeight}`);
    }
    return failures;
   });
   errors.push(...audit.map(error=>`${viewport.width}px: ${error}`));
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:resolve(root,'preview.png'),fullPage:true});
 }finally{
  await browser.close();
  await new Promise<void>((done,reject)=>server.close(error=>error?reject(error):done()));
 }
 return{passed:errors.length===0,viewports:[390,1440],errors};
}
