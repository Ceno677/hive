import {Buffer} from 'buffer';
import {Transaction} from '@solana/web3.js';
import bs58 from 'bs58';
(globalThis as any).Buffer=Buffer;
const win=window as any;
win.HIVE_DASHBOARD_CONFIG={snapshotUrl:'/api/network/snapshot',...win.HIVE_DASHBOARD_CONFIG};
const dialog=document.querySelector<HTMLDialogElement>('#dialog')!;
const content=document.querySelector<HTMLDivElement>('#dialog-content')!;
let csrf=sessionStorage.getItem('hive-csrf')??'',wallet='',stream:EventSource|undefined,capabilitiesPromise:Promise<any>|undefined,turnstileLoad:Promise<void>|undefined;
function element<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls=''){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function show(kicker:string,title:string){
 stream?.close();document.querySelector('#dialog-kicker')!.textContent='hive.md / '+kicker;
 content.replaceChildren(element('h2',title));if(!dialog.open)dialog.showModal();
}
function status(text:string){let p=content.querySelector<HTMLParagraphElement>('[role=status]');if(!p){p=element('p');p.setAttribute('role','status');content.append(p);}p.textContent=text;}
 function amount(value:string,decimals:number){const padded=value.padStart(decimals+1,'0');return decimals?(padded.slice(0,-decimals)+'.'+padded.slice(-decimals)).replace(/\.?0+$/,''):value;}
function action(label:string,fn:()=>Promise<void>|void,secondary=false){
 const b=element('button',label,secondary?'outline':'dark-button');b.type='button';
 b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){status(e instanceof Error?e.message:'Please try again.');}finally{b.disabled=false;}};
 let actions=content.querySelector('.dialog-actions:not([role="group"])');if(!actions){actions=element('div','','dialog-actions');content.append(actions);}actions.append(b);return b;
}
async function api(path:string,body?:unknown){
 const r=await fetch('/api'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'content-type':'application/json',...(csrf?{'x-csrf-token':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok){
  const messages:Record<string,string>={sign_in_required:'Connect your wallet to continue.',session_expired:'Please reconnect your wallet.',integration_not_configured:'The network is not open for transactions yet.',execution_not_configured:'The build service is not available yet.',independent_capacity_unavailable:'The hive is waiting for available build and review agents. Try again shortly.',seat_unavailable:'That seat has already been minted.',seat_reserved:'Someone is currently minting that seat. Choose another.',quote_not_payable:'This quote expired. Request a new quote.',payment_not_finalized:'Your transaction is still confirming.',refund_not_available:'The escrow refund is not available yet.',csrf_required:'Please reconnect your wallet.',transaction_mismatch:'The transaction changed. Request a new quote.',human_verification_required:'Complete the anti-bot check to request a quote.',human_verification_failed:'The anti-bot check expired. Please try again.',human_verification_unavailable:'The anti-bot service is temporarily unavailable.',repository_not_connected:'Connect this GitHub repository before delivery.',github_authorization_failed:'GitHub authorization failed. Please reconnect GitHub.'};
  throw Error(messages[d.error]??d.message??'The network could not complete this request.');
 }
 return d;
}
function capabilities(){return capabilitiesPromise??=api('/capabilities');}
async function humanToken(){
 const caps=await capabilities(),sitekey=caps.security?.turnstileSiteKey;if(!sitekey)return undefined;
 if(!win.turnstile){
  turnstileLoad??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.onload=()=>resolve();script.onerror=()=>reject(Error('The anti-bot check could not load.'));document.head.append(script);});
  await turnstileLoad;
 }
 const holder=element('div','','turnstile-check');content.append(holder);
 return new Promise<string>((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('The anti-bot check timed out. Please try again.')),120000);
  const widget=win.turnstile.render(holder,{sitekey,action:'quote',execution:'execute',appearance:'interaction-only',callback:(token:string)=>{clearTimeout(timer);resolve(token);},'error-callback':()=>{clearTimeout(timer);reject(Error('The anti-bot check failed. Please try again.'));},'expired-callback':()=>{clearTimeout(timer);reject(Error('The anti-bot check expired. Please try again.'));}});
  win.turnstile.execute(widget);
 });
}
function provider(){const p=win.phantom?.solana??win.solflare??win.solana;if(!p?.connect||!p?.signMessage)throw Error('Open this page in a Solana wallet browser, or enable your Solana wallet extension.');return p;}
async function connect(){
 const p=provider();await p.connect();wallet=p.publicKey.toBase58();
 const challenge=await api('/auth/challenge',{wallet});
 const result=await p.signMessage(new TextEncoder().encode(challenge.message),'utf8');
 const auth=await api('/auth/verify',{id:challenge.id,wallet,signature:bs58.encode(result.signature??result)});
 csrf=auth.csrf;sessionStorage.setItem('hive-csrf',csrf);
 document.querySelector('#wallet')!.textContent=wallet.slice(0,4)+'…'+wallet.slice(-4)+' ↗';
}
async function ensure(){if(!wallet||!csrf)await connect();}
async function sign(prepared:{transaction:string}){
 const p=provider(),tx=Transaction.from(Buffer.from(prepared.transaction,'base64'));
 status('Review and approve the transaction in your wallet.');
 const signed=await p.signTransaction(tx);
 return Buffer.from(signed.serialize()).toString('base64');
}
async function account(){
 show('WALLET','Your place in the hive.');
 await ensure();content.append(element('p',wallet));
 action('MY BUILDS ↗',async()=>{
  show('YOUR BUILDS','Your projects.');
  const list=await api('/workflows');
  if(!list.length)status('Your submitted projects will appear here.');
  for(const f of list)action(f.title+' / '+f.status,()=>viewFlow(f.id),true);
 });
 action('DISCONNECT',async()=>{await api('/auth/logout',{});wallet='';csrf='';sessionStorage.removeItem('hive-csrf');document.querySelector('#wallet')!.textContent='CONNECT WALLET ↗';dialog.close();},true);
}
async function mint(){
 show('NFT SEAT','Take your seat.');
 const config=await api('/mint/config');
 content.append(element('p','Burn 8,888 $HMD to mint one of the 888 approved identities. Review the exact amount and network fee in your wallet before approving.'));
 if(!config.enabled){status('Seat minting is not open yet.');return;}
 const availability=await api('/mint/availability');
 if(!availability.next){status('All 888 NFT seats are minted or currently reserved.');return;}
 content.append(element('p',availability.remaining+' SEATS AVAILABLE / NEXT '+String(availability.next).padStart(3,'0')));
 await ensure();
 const label=element('label','CHOOSE YOUR SEAT / 1–888'),input=element('input');input.type='number';input.min='1';input.max='888';input.value=String(availability.next);input.setAttribute('aria-label','NFT seat number');
 label.append(input);content.append(label);
 action('REVIEW MINT ↗',async()=>{
  const quote=await api('/mint/quote',{requestKey:crypto.randomUUID(),seatId:Number(input.value)});
  show('MINT REVIEW','Seat #'+quote.seatId);
  const token=await api('/token');content.append(element('p','BURN '+amount(quote.amount,token.decimals)+' $HMD / '+config.cluster.toUpperCase()));
  content.append(element('p','Your wallet will show the $HMD burn amount and SOL network fee. Your NFT is issued in the same transaction.'));
  action('APPROVE IN WALLET ↗',async()=>{
   const prepared=await api('/mint/prepare',{id:quote.id}),transaction=await sign(prepared);
   const submitted=await api('/mint/confirm',{id:quote.id,transaction});
   status('Transaction submitted: '+submitted.signature);
   action('CHECK CONFIRMATION',async()=>{
    const result=await api('/mint/requests/'+quote.id);status(result.state==='MINTED'?'Your NFT seat is minted.':'Confirmation pending. You can safely close this dialog.');
   },true);
  });
 });
}
function isMintIntent(value:string){
 const text=value.trim().toLowerCase();
 if(!/\bmint\b/.test(text))return false;
 if(/\b(nft|seat|agent)\b/.test(text))return true;
 return /^(?:hey\s+)?(?:agent\s+)?(?:(?:please|pls)\s+)?mint(?:\s+(?:me\s+)?(?:one|1))?[.!?]*$/.test(text);
}
async function draft(){
 const prompt=(document.querySelector('#brief') as HTMLTextAreaElement).value.trim();
 show('BUILD REQUEST','What shall we build?');
 if(prompt.length<12){status('Describe your project in at least 12 characters.');return;}
 content.append(element('p',prompt,'draft-text'));
 content.append(element('p','The hive will plan your project and show a quote in $HMD. Your work stays private.'));
 let mode='BUILD';const choices=element('div','','dialog-actions');choices.setAttribute('role','group');choices.setAttribute('aria-label','Project type');
 for(const [value,label]of [['BUILD','WEBSITE / CODE'],['SOLANA_APP','SOLANA APP + WEBSITE']]){const option=element('button',(value===mode?'[ SELECTED ] ':'')+label,'outline');option.type='button';option.setAttribute('aria-pressed',String(value===mode));option.onclick=()=>{mode=value;for(const b of Array.from(choices.children) as HTMLButtonElement[]){const selected=b===option;b.setAttribute('aria-pressed',String(selected));b.textContent=(selected?'[ SELECTED ] ':'')+b.dataset.label;} };option.dataset.label=label;choices.append(option);}content.append(choices);
 action('GET MY QUOTE ↗',async()=>{
  await ensure();status('Planning your project…');
  const turnstileToken=await humanToken();
  const q=await api('/requests/quote',{requestKey:crypto.randomUUID(),prompt,public:false,mode,...(turnstileToken?{turnstileToken}:{})});
  show('YOUR QUOTE',q.title);
  const token=await api('/token');content.append(element('p',amount(q.amount,token.decimals)+' $HMD'));
  content.append(element('p','DELIVERY DEADLINE / '+q.deadlineHours+' HOURS AFTER PAYMENT'));
  for(const t of q.plan.tasks)content.append(element('p',t.title));
  content.append(element('p','Review the $HMD amount and network fee in your wallet. No payment is made until you approve.'));
  action('REVIEW PAYMENT ↗',async()=>{
   const prepared=await api('/requests/'+q.id+'/prepare-payment'),transaction=await sign(prepared);
   await api('/requests/'+q.id+'/submit',{transaction});await viewFlow(q.id);
  });
 });
}
async function viewFlow(id:string){
 const flow=await api('/workflows/'+id);
 show('YOUR BUILD',flow.title);status(flow.status.replaceAll('_',' '));
 const list=element('div');
 for(const t of flow.tasks){const row=element('p',t.title+' / '+t.state.replaceAll('_',' '));list.append(row);
  if(t.acceptedArtifact&&flow.status==='COMPLETED')action('DOWNLOAD '+t.title,async()=>{
   const artifact=await api('/artifacts/'+t.acceptedArtifact);
   const blob=new Blob([JSON.stringify(artifact.bundle,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=element('a');
   a.href=url;a.download='hive-'+t.key+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  },true);
 }
 content.append(list);
 for(const release of flow.releases??[]){
  content.append(element('p',release.kind.replaceAll('_',' ')+' / '+release.state.replaceAll('_',' ')));
  if(release.state==='COMPLETED'&&release.url?.startsWith('https://'))action('OPEN '+release.kind.replaceAll('_',' ')+' ↗',()=>{window.open(release.url,'_blank','noopener,noreferrer');},true);
 }
 if(flow.status==='COMPLETED')action('DOWNLOAD PROJECT ↗',()=>{const a=element('a');a.href='/api/workflows/'+id+'/download';a.download='hive-project.zip';a.click();});
 if(flow.status==='REFUND_PENDING'&&flow.deadlineAt&&new Date(flow.deadlineAt)<=new Date())action('RECLAIM ESCROW REFUND ↗',async()=>{const prepared=await api('/workflows/'+id+'/prepare-expired-refund',{}),transaction=await sign(prepared);await api('/workflows/'+id+'/submit-expired-refund',{transaction});status('Refund submitted. Finalization is being checked.');},true);
 if(['COMPLETED','AWAITING_APPROVAL'].includes(flow.status)){
  const caps=await capabilities();
  const reviewDelivery=async(kind:string,target:string)=>{
   const result=await api('/workflows/'+id+'/result');show('DELIVERY APPROVAL','Ready to publish?');
   content.append(element('p','Destination: '+target));content.append(element('p','This publishes the reviewed version. Network or hosting fees may apply.'));
   action('APPROVE DELIVERY ↗',async()=>{const approval=await api('/workflows/'+id+'/approve-delivery',{action:kind,target,artifactHash:result.artifactHash});status('Publishing…');await api('/approvals/'+approval.id+'/publish',{});await viewFlow(id);});
  };
  if(caps.delivery.site&&flow.stage!=='DEPLOYMENT')action('PUBLISH WEBSITE ↗',()=>reviewDelivery('STATIC_SITE',caps.delivery.site),true);
   if(caps.delivery.programConfigured&&flow.stage==='DEPLOYMENT')action('REVIEW PROGRAM DEPLOYMENT ↗',async()=>{const result=await api('/workflows/'+id+'/result');if(!result.deploymentTarget)throw Error('The deployment target is unavailable.');await reviewDelivery('SOLANA_PROGRAM',result.deploymentTarget);},true);
  if(caps.delivery.githubConnect&&flow.stage==='DELIVERY'){
   const repositories=await api('/github/repositories');
   if(!repositories.length)action('CONNECT GITHUB ↗',async()=>{const connection=await api('/github/connect',{});location.assign(connection.url);},true);
   else{
    const label=element('label','CONNECTED GITHUB REPOSITORY'),repo=element('select') as HTMLSelectElement;repo.setAttribute('aria-label','Connected GitHub repository');
    for(const item of repositories){const option=element('option',item.fullName) as HTMLOptionElement;option.value=item.fullName;repo.append(option);}
    label.append(repo);content.append(label);action('DELIVER TO GITHUB ↗',()=>reviewDelivery('GITHUB',repo.value),true);
   }
  }else if(caps.delivery.githubOwner&&flow.stage==='DELIVERY'){
   const label=element('label','CONNECTED GITHUB REPOSITORY / '+caps.delivery.githubOwner+'/name'),repo=element('input');repo.type='text';repo.placeholder=caps.delivery.githubOwner+'/repository';repo.setAttribute('aria-label','Connected GitHub repository');label.append(repo);content.append(label);
   action('DELIVER TO GITHUB ↗',()=>reviewDelivery('GITHUB',repo.value.trim()),true);
  }
 }
 if(!['COMPLETED','CANCELLED','REFUND_PENDING','CANCEL_REQUESTED'].includes(flow.status))action('CANCEL BUILD',async()=>{await api('/workflows/'+id+'/cancel',{});await viewFlow(id);},true);
 action('REFRESH',()=>viewFlow(id),true);
 stream=new EventSource('/api/workflows/'+id+'/events/stream');
 stream.onmessage=e=>{const event=JSON.parse(e.data);status(event.type.replaceAll('.',' '));};
}
dialog.addEventListener('close',()=>stream?.close());
document.querySelector<HTMLButtonElement>('#wallet')!.onclick=()=>account().catch(e=>status(e.message));
document.querySelector<HTMLButtonElement>('#seat-details')!.onclick=()=>mint().catch(e=>status(e.message));
document.querySelectorAll<HTMLAnchorElement>('[data-open-mint]').forEach(a=>a.onclick=e=>{e.preventDefault();mint().catch(e=>status(e.message));});
(win as any).HIVE_OPEN_MINT=()=>mint().catch(e=>status(e.message));
document.querySelector<HTMLFormElement>('#job-form')!.onsubmit=e=>{e.preventDefault();const value=(document.querySelector('#brief') as HTMLTextAreaElement).value;isMintIntent(value)?mint().catch(e=>status(e.message)):draft().catch(e=>status(e.message));};
api('/auth/me').then(me=>{wallet=me.wallet;document.querySelector('#wallet')!.textContent=wallet.slice(0,4)+'…'+wallet.slice(-4)+' ↗';}).catch(()=>{});
