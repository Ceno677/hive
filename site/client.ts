import {Buffer} from 'buffer';
import {Transaction} from '@solana/web3.js';
import bs58 from 'bs58';
import {getWallets} from '@wallet-standard/app';
(globalThis as any).Buffer=Buffer;
const win=window as any;
win.HIVE_DASHBOARD_CONFIG={snapshotUrl:'/api/network/snapshot',...win.HIVE_DASHBOARD_CONFIG};
const dialog=document.querySelector<HTMLDialogElement>('#dialog')!;
const content=document.querySelector<HTMLDivElement>('#dialog-content')!;
const walletRegistry=getWallets();
let csrf=sessionStorage.getItem('hive-csrf')??'',wallet='',selectedWalletName=sessionStorage.getItem('hive-wallet')??'',selectedStandardWallet:any,stream:EventSource|undefined,capabilitiesPromise:Promise<any>|undefined,turnstileLoad:Promise<void>|undefined;
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
 const messages:Record<string,string>={sign_in_required:'Connect your wallet to continue.',session_expired:'Please reconnect your wallet.',nft_required:'Hold at least one hive.md NFT in this wallet to request a build.',integration_not_configured:'The network is not open for transactions yet.',execution_not_configured:'The build service is not available yet.',independent_capacity_unavailable:'The hive is waiting for available build and review agents. Try again shortly.',planner_output_invalid:'Planning could not produce a valid build plan. Please retry.',model_request_failed:'The planning model is temporarily unavailable. Please retry.',model_output_truncated:'The requested project needs a smaller brief. Please shorten it and retry.',seat_unavailable:'That seat has already been minted.',seat_reserved:'Someone is currently minting that seat. Choose another.',insufficient_hmd_balance:'This wallet needs at least 8,888 HMD to mint.',insufficient_sol_balance:'This wallet needs more SOL for NFT rent and network fees.',transaction_rejected:'Solana rejected the transaction. Nothing was burned or minted.',broadcast_unconfirmed:'The RPC could not confirm submission. Check the transaction before trying again.',quote_not_payable:'This quote expired. Request a new quote.',payment_not_finalized:'Your transaction is still confirming.',refund_not_available:'The escrow refund is not available yet.',csrf_required:'Please reconnect your wallet.',transaction_mismatch:'The transaction changed. Request a new quote.',human_verification_required:'Complete the anti-bot check to request a quote.',human_verification_failed:'The anti-bot check expired. Please try again.',human_verification_unavailable:'The anti-bot service is temporarily unavailable.',repository_not_connected:'Connect this GitHub repository before delivery.',repository_workflows_not_allowed:'Choose a clean delivery repository without GitHub Actions workflows.',repository_tree_too_large:'Choose a smaller clean repository for delivery.',github_authorization_failed:'GitHub authorization failed. Please reconnect GitHub.'};
  const error=Error(messages[d.error]??d.message??'The network could not complete this request.');
  (error as any).code=d.error;throw error;
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
function compatibleWallets(){
 const found=new Map<string,{name:string;standard?:any;legacy?:any}>(),seen=new Set<any>();
 for(const standard of walletRegistry.get().filter((wallet:any)=>wallet.features?.['standard:connect']&&wallet.features?.['solana:signMessage']&&wallet.features?.['solana:signTransaction']))found.set(standard.name,{name:standard.name,standard});
 const candidates:[string,any][]=[['Phantom',win.phantom?.solana],['Solflare',win.solflare],['Backpack',win.backpack?.solana??win.backpack]];
 if(win.solana)candidates.push([win.solana.isPhantom?'Phantom':win.solana.isSolflare?'Solflare':win.solana.isBackpack?'Backpack':'Solana Wallet',win.solana]);
 for(const [name,legacy] of candidates)if(legacy?.connect&&legacy?.signMessage&&legacy?.signTransaction&&!seen.has(legacy)){seen.add(legacy);if(!found.has(name))found.set(name,{name,legacy});}
 return[...found.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function standardProvider(detected:{name:string;standard?:any;legacy?:any}){
 if(detected.legacy)return detected.legacy;
 const walletStandard=detected.standard;
 let account:any;
 const current=()=>account??walletStandard.accounts?.find((value:any)=>value.features?.includes('solana:signMessage')&&value.features?.includes('solana:signTransaction'));
 return{
  async connect(){await walletStandard.features['standard:connect'].connect();account=current();if(!account)throw Error(walletStandard.name+' does not expose a compatible Solana account.');},
  get publicKey(){const value=current();if(!value)throw Error('Connect '+walletStandard.name+' first.');return{toBase58:()=>value.address};},
  async signMessage(message:Uint8Array){const value=current(),result=await walletStandard.features['solana:signMessage'].signMessage({account:value,message});return result[0];},
  async signTransaction(transaction:Transaction){
   const value=current(),chain=value.chains?.includes('solana:mainnet')?'solana:mainnet':value.chains?.find((item:string)=>item.startsWith('solana:'));
   const result=await walletStandard.features['solana:signTransaction'].signTransaction({account:value,transaction:transaction.serialize({requireAllSignatures:false,verifySignatures:false}),...(chain?{chain}:{})});
   return Transaction.from(result[0].signedTransaction);
  }
 };
}
function provider(){
 selectedStandardWallet=selectedStandardWallet??compatibleWallets().find(value=>value.name===selectedWalletName);
 if(selectedStandardWallet)return standardProvider(selectedStandardWallet);
 throw Error('Choose one of your detected Solana wallets first.');
}
async function chooseWallet(){
 show('WALLET','Choose your Solana wallet.');
 const wallets=compatibleWallets();
 if(!wallets.length){status('No compatible Solana wallet was detected. Enable Phantom, Solflare, Backpack, or another Wallet Standard wallet and reload.');throw Error('No compatible Solana wallet detected.');}
 content.append(element('p','Detected wallets on this device:'));
 return new Promise<void>(resolve=>{
  for(const detected of wallets)action('CONNECT '+detected.name.toUpperCase()+' ↗',async()=>{selectedWalletName=detected.name;selectedStandardWallet=detected;sessionStorage.setItem('hive-wallet',selectedWalletName);await connect();resolve();},true);
 });
}
async function connect(){
 const p=provider();await p.connect();wallet=p.publicKey.toBase58();
 const challenge=await api('/auth/challenge',{wallet});
 const result=await p.signMessage(new TextEncoder().encode(challenge.message));
 const auth=await api('/auth/verify',{id:challenge.id,wallet,signature:bs58.encode(result.signature??result)});
 csrf=auth.csrf;sessionStorage.setItem('hive-csrf',csrf);
 document.querySelector('#wallet')!.textContent=wallet.slice(0,4)+'…'+wallet.slice(-4)+' ↗';
}
async function ensure(){if(!wallet||!csrf||!selectedWalletName){if(!selectedWalletName)await chooseWallet();else await connect();}}
async function withFreshSession<T>(operation:()=>Promise<T>){
 try{return await operation();}
 catch(error){
  if(!['session_expired','csrf_required','sign_in_required'].includes(String((error as any)?.code)))throw error;
  wallet='';csrf='';sessionStorage.removeItem('hive-csrf');
  document.querySelector('#wallet')!.textContent='CONNECT WALLET â†—';
  await ensure();return operation();
 }
}
async function sign(prepared:{transaction:string}){
 const p=provider(),tx=Transaction.from(Buffer.from(prepared.transaction,'base64'));
 status('Review and approve the transaction in your wallet.');
 const signed=await p.signTransaction(tx);
 return Buffer.from(signed.serialize()).toString('base64');
}
async function account(){
 await ensure();show('WALLET','Your place in the hive.');content.append(element('p',wallet));
 action('MY BUILDS ↗',async()=>{
  show('YOUR BUILDS','Your projects.');
  const list=await api('/workflows');
  if(!list.length)status('Your submitted projects will appear here.');
  for(const f of list)action(f.title+' / '+f.status,()=>viewFlow(f.id),true);
 });
 action('MY NFT SEATS',showSeats,true);
 action('DISCONNECT',async()=>{await api('/auth/logout',{});wallet='';csrf='';selectedWalletName='';selectedStandardWallet=undefined;sessionStorage.removeItem('hive-csrf');sessionStorage.removeItem('hive-wallet');document.querySelector('#wallet')!.textContent='CONNECT WALLET ↗';dialog.close();},true);
}
async function showSeats(){
 show('YOUR SEATS','NFT access to hosted agents.');
 const seats=await api('/seats/mine');
 if(!seats.length){status('No hive.md NFT is currently verified in this wallet.');action('MINT A SEAT ↗',mint);return;}
 for(const seat of seats)content.append(element('p','#'+String(seat.id).padStart(3,'0')+' / '+(seat.mint??'MINT PENDING')));
 status('Access active. Submit a build and the hosted hive agents will work automatically.');
 action('BACK TO WALLET',account,true);
}
async function mint(){
 await ensure();
 show('NFT SEAT','Take your seat.');
 const config=await api('/mint/config');
 content.append(element('p','Burn 8,888 $HMD to mint one random identity. One click opens the wallet confirmation; after signing, the NFT is issued in the same transaction.'));
 if(!config.enabled){status('Seat minting is not open yet.');return;}
 const availability=await api('/mint/availability');
 if(!availability.available){status('All 888 NFT seats are minted or currently reserved.');return;}
 content.append(element('p',availability.remaining+' RANDOM NFT SEATS AVAILABLE'));
 content.append(element('p','Your NFT identity is selected randomly from the remaining collection when you request the mint.'));
 action('MINT RANDOM NFT ↗',async()=>{
  status('Selecting and reserving your random NFT…');
  const quote=await api('/mint/quote',{requestKey:crypto.randomUUID()});
  const prepared=await api('/mint/prepare',{id:quote.id}),transaction=await sign(prepared);
  const submitted=await api('/mint/confirm',{id:quote.id,transaction});
  show('MINT SUBMITTED','Random seat #'+String(quote.seatId).padStart(3,'0'));
  content.append(element('p','Your random NFT is confirming on '+config.cluster.toUpperCase()+'.'));
  status('Transaction submitted: '+submitted.signature);
  action('CHECK CONFIRMATION',async()=>{
   const result=await api('/mint/requests/'+quote.id);status(result.state==='MINTED'?'Your random NFT is now in your wallet.':'Confirmation pending. You can safely close this dialog.');
  },true);
 });
}
function isMintIntent(value:string){
 return /\bmint\b/i.test(value);
}
async function draft(){
 const prompt=(document.querySelector('#brief') as HTMLTextAreaElement).value.trim();
 show('BUILD REQUEST','What shall we build?');
 if(prompt.length<12){status('Describe your project in at least 12 characters.');return;}
 content.append(element('p',prompt,'draft-text'));
 content.append(element('p','Hold at least one hive.md NFT in this wallet to access the agents. The hive will plan your project and show a separate quote in $HMD. Your work stays private.'));
 let mode='BUILD';const choices=element('div','','dialog-actions');choices.setAttribute('role','group');choices.setAttribute('aria-label','Project type');
 for(const [value,label]of [['BUILD','WEBSITE / CODE'],['SOLANA_APP','SOLANA APP + WEBSITE']]){const option=element('button',(value===mode?'[ SELECTED ] ':'')+label,'outline');option.type='button';option.setAttribute('aria-pressed',String(value===mode));option.onclick=()=>{mode=value;for(const b of Array.from(choices.children) as HTMLButtonElement[]){const selected=b===option;b.setAttribute('aria-pressed',String(selected));b.textContent=(selected?'[ SELECTED ] ':'')+b.dataset.label;} };option.dataset.label=label;choices.append(option);}content.append(choices);
 action('GET MY QUOTE ↗',async()=>{
  await ensure();status('Planning your project…');
  const turnstileToken=await humanToken();
  const requestKey=crypto.randomUUID(),quoteBody={requestKey,prompt,public:false,mode,...(turnstileToken?{turnstileToken}:{})};
  const q=await withFreshSession(()=>api('/requests/quote',quoteBody));
  show('YOUR QUOTE',q.title);
  const token=await api('/token');content.append(element('p',amount(q.amount,token.decimals)+' $HMD'));
  if(q.pricing){
   content.append(element('p','NORMAL MARKET ESTIMATE / $'+q.pricing.marketPriceUsd+' USD'));
   content.append(element('p','HIVE PRICE / $'+q.pricing.chargedPriceUsd+' USD / '+(q.pricing.marketPercentageBps/100)+'% OF MARKET'));
   content.append(element('p','DIFFICULTY / '+q.pricing.complexity+' / '+q.pricing.estimatedHours+' MARKET HOURS @ $'+q.pricing.marketRateUsd+'/HR'));
   content.append(element('p',q.pricing.tokenPriceSource==='manual'?'$HMD RATE / $'+q.pricing.tokenPriceUsd+' / MANUAL LAUNCH PRICE':'$HMD RATE / $'+q.pricing.tokenPriceUsd+' / LIQUIDITY $'+q.pricing.tokenLiquidityUsd.toLocaleString()));
   content.append(element('p','MARKET CHECK / '+q.pricing.sources.length+' CURRENT SOURCES'));
   for(const source of q.pricing.sources){const row=element('p'),link=element('a',source.title+' ↗');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';row.append(link);content.append(row);}
   content.append(element('p','QUOTE LOCKED UNTIL / '+new Date(q.pricing.expiresAt).toLocaleTimeString()));
  }
  content.append(element('p','SUCCESS / YOUR FULL JOB FEE IS BURNED / AGENTS ARE PAID FROM TREASURY'));
  content.append(element('p','DELIVERY DEADLINE / '+q.deadlineHours+' HOURS AFTER PAYMENT'));
  for(const t of q.plan.tasks)content.append(element('p',t.title));
  content.append(element('p','Review the $HMD amount and network fee in your wallet. Successful delivery burns this fee. A missed deadline returns it in full.'));
  action('REVIEW PAYMENT ↗',async()=>{
   const prepared=await api('/requests/'+q.id+'/prepare-payment',{}),transaction=await sign(prepared);
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
 action('VIEW BUILD PROOF',()=>showProof(id),true);
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
async function showProof(id:string){
 show('PROOF OF WORK','Build and independent verification.');
 const tasks=await api('/workflows/'+id+'/tasks');
 if(!tasks.length)status('The plan is still being prepared.');
 for(const task of tasks){
  content.append(element('p',task.title+' / '+task.state));
  const acceptance=Array.isArray(task.policy?.acceptance)?task.policy.acceptance:[];
  for(const criterion of acceptance)content.append(element('p','ACCEPTANCE / '+criterion));
  for(const attempt of task.attempts??[]){
   content.append(element('p',attempt.kind+' / '+(attempt.seatId===null?'HOSTED AGENT':'NFT #'+String(attempt.seatId).padStart(3,'0'))+' / '+attempt.state));
   const verification=attempt.verification;
   if(verification){
    content.append(element('p','VERIFIER / '+verification.state+' / '+verification.decision));
    for(const check of Array.isArray(verification.checks)?verification.checks:[])content.append(element('p',(check.passed?'PASS':'FAIL')+' / '+check.name+(check.evidence?' / '+check.evidence:'')));
   }
  }
 }
 action('BACK TO BUILD',()=>viewFlow(id),true);
}
dialog.addEventListener('close',()=>stream?.close());
document.querySelector<HTMLButtonElement>('#wallet')!.onclick=()=>account().catch(e=>status(e.message));
document.querySelector<HTMLButtonElement>('#seat-details')!.onclick=()=>mint().catch(e=>status(e.message));
document.querySelectorAll<HTMLAnchorElement>('[data-open-mint]').forEach(a=>a.onclick=e=>{e.preventDefault();mint().catch(e=>status(e.message));});
(win as any).HIVE_OPEN_MINT=()=>mint().catch(e=>status(e.message));
const briefInput=document.querySelector<HTMLTextAreaElement>('#brief')!;
briefInput.removeAttribute('minlength');
briefInput.placeholder='Build a Solana app that... or type mint';
document.querySelector<HTMLFormElement>('#job-form')!.onsubmit=e=>{e.preventDefault();const value=briefInput.value;isMintIntent(value)?mint().catch(e=>status(e.message)):draft().catch(e=>status(e.message));};
api('/auth/me').then(me=>{wallet=me.wallet;document.querySelector('#wallet')!.textContent=wallet.slice(0,4)+'…'+wallet.slice(-4)+' ↗';}).catch(()=>{});
