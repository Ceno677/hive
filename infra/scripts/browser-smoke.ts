import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {AddressInfo} from 'node:net';
import {mkdir,readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Keypair} from '@solana/web3.js';
import nacl from 'tweetnacl';
const root=resolve('site'),types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const staticServer=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url??'/', 'http://localhost').pathname),relative=pathname==='/'?'index.html':pathname.slice(1),file=resolve(root,relative);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const content=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'}).end(content);
 }catch{res.writeHead(404).end();}
});
await new Promise<void>((done,reject)=>{staticServer.once('error',reject);staticServer.listen(0,'127.0.0.1',done);});
const base='http://127.0.0.1:'+(staticServer.address() as AddressInfo).port;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));
const wallet=Keypair.generate();
await page.exposeFunction('hiveTestSign',(bytes:number[])=>Array.from(nacl.sign.detached(Uint8Array.from(bytes),wallet.secretKey)));
await page.addInitScript({content:'window.solana={publicKey:{toBase58:()=>'+JSON.stringify(wallet.publicKey.toBase58())+'},async connect(){},async signMessage(bytes){return {signature:Uint8Array.from(await window.hiveTestSign(Array.from(bytes)))}}};'});
await page.route('**/api/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 const json=(status:number,body:unknown)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(path==='/api/auth/me')return json(401,{error:'sign_in_required'});
 if(path==='/api/auth/challenge')return json(200,{id:randomUUID(),message:'Sign in to the isolated hive.md browser test.'});
 if(path==='/api/auth/verify')return json(200,{csrf:randomUUID()});
 if(path==='/api/capabilities')return json(200,{security:{turnstileSiteKey:null},delivery:{site:false,programConfigured:false,githubConnect:false}});
 if(path==='/api/requests/quote')return json(503,{error:'integration_not_configured'});
 if(path==='/api/mint/config')return json(200,{enabled:false});
 if(path==='/api/network/snapshot')return json(200,{agents:[],activity:[],jobs:[],reviews:[],artifacts:[]});
 return json(404,{error:'not_found'});
});
try{
 await page.goto(base+'/',{waitUntil:'networkidle'});
 await page.locator('#wallet').click();
 try{await page.getByRole('button',{name:'MY BUILDS'}).waitFor({timeout:10000});}
 catch(e){console.error({errors,dialog:await page.locator('#dialog').innerText()});throw e;}
 await page.locator('#close-dialog').click();
 await page.locator('#brief').fill('Build a personal portfolio website with my projects.');
 await page.locator('#job-form').evaluate((form:HTMLFormElement)=>form.requestSubmit());
 await page.getByRole('button',{name:'GET MY QUOTE'}).waitFor();
 await mkdir('.hive',{recursive:true});
 await page.screenshot({path:'.hive/ui-build-dialog.png'});
 await page.getByRole('button',{name:'GET MY QUOTE'}).click();
 await page.getByRole('status').filter({hasText:'not open'}).waitFor();
 await page.locator('#close-dialog').click();
 await page.locator('#theme-toggle').click();
 await page.locator('#brief').fill('agent pls mint');
 await page.locator('#job-form').evaluate((form:HTMLFormElement)=>form.requestSubmit());
 await page.getByRole('status').filter({hasText:'Seat minting is not open yet'}).waitFor();
 await page.screenshot({path:'.hive/ui-mint-dialog.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'.hive/ui-mobile.png'});
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Browser passed: wallet signing UI, dialogs, unavailable states, theme and mobile; no page errors.');
}finally{
 await browser.close();
 await new Promise<void>((done,reject)=>staticServer.close(error=>error?reject(error):done()));
}
