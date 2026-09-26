import {createHash} from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import {Fault,hash} from '../shared/domain.js';

export type HolderAsset={assetId:string;wallet:string};
export type HolderSnapshot={slot:bigint;assets:HolderAsset[]};
export interface HolderSnapshotSource{snapshot(collection:string):Promise<HolderSnapshot>}

export type HolderAllocation={wallet:string;assetIds:string[];amount:string};
export function allocateHolderRevenue(total:bigint,assets:HolderAsset[],maxSeatsPerWallet:number,salt:string){
 if(total<=0n)throw new Fault(409,'empty_distribution');
 const unique=new Map<string,HolderAsset>();
 for(const asset of assets){
  try{new PublicKey(asset.assetId);new PublicKey(asset.wallet);}catch{throw new Fault(502,'invalid_holder_snapshot');}
  if(unique.has(asset.assetId))throw new Fault(502,'duplicate_holder_asset');
  unique.set(asset.assetId,asset);
 }
 const canonicalAssets=[...unique.values()].sort((a,b)=>a.assetId.localeCompare(b.assetId));
 const ordered=[...canonicalAssets].sort((a,b)=>{
  const left=createHash('sha256').update(salt+':'+a.assetId).digest('hex');
  const right=createHash('sha256').update(salt+':'+b.assetId).digest('hex');
  return left.localeCompare(right)||a.assetId.localeCompare(b.assetId);
 });
 const accepted:HolderAsset[]=[],counts=new Map<string,number>();
 for(const asset of ordered){
  const count=counts.get(asset.wallet)??0;
  if(count>=maxSeatsPerWallet)continue;
  counts.set(asset.wallet,count+1);accepted.push(asset);
 }
 if(!accepted.length)throw new Fault(409,'no_eligible_holders');
 const base=total/BigInt(accepted.length),remainder=Number(total%BigInt(accepted.length));
 const wallets=new Map<string,{assetIds:string[];amount:bigint}>();
 accepted.forEach((asset,index)=>{
  const row=wallets.get(asset.wallet)??{assetIds:[],amount:0n};
  row.assetIds.push(asset.assetId);row.amount+=base+(index<remainder?1n:0n);wallets.set(asset.wallet,row);
 });
 const allocations:HolderAllocation[]=[...wallets].filter(([,row])=>row.amount>0n).map(([wallet,row])=>({wallet,assetIds:row.assetIds.sort(),amount:row.amount.toString()})).sort((a,b)=>a.wallet.localeCompare(b.wallet));
 return{allocations,eligibleSeats:accepted.length,excludedSeats:ordered.length-accepted.length,snapshotHash:hash(canonicalAssets.map(a=>({assetId:a.assetId,wallet:a.wallet})))};
}

export class DasHolderSnapshot implements HolderSnapshotSource{
 constructor(private rpcUrl:string){}
 private async rpc(method:string,params:unknown){
  let response:Response;
  try{response=await fetch(this.rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:method,method,params}),signal:AbortSignal.timeout(30000)});}catch{throw new Fault(503,'holder_snapshot_unavailable');}
  if(!response.ok)throw new Fault(503,'holder_snapshot_unavailable');
  const body=await response.json() as any;
  if(body.error)throw new Fault(503,'holder_snapshot_unavailable',String(body.error.message??'DAS request failed'));
  return body.result;
 }
 async snapshot(collection:string):Promise<HolderSnapshot>{
  try{new PublicKey(collection);}catch{throw new Fault(503,'collection_not_configured');}
  const result=await this.rpc('getAssetsByGroup',{groupKey:'collection',groupValue:collection,page:1,limit:1000,sortBy:{sortBy:'id',sortDirection:'asc'},options:{showUnverifiedCollections:false,showCollectionMetadata:false,showFungible:false}});
  const items=Array.isArray(result?.items)?result.items:[];
  if(Number(result?.total??items.length)!==items.length||items.length>888)throw new Fault(503,'incomplete_holder_snapshot');
  const assets:HolderAsset[]=[];
  for(const item of items){
   if(item?.burnt===true||item?.compression?.compressed===true)continue;
   const grouped=Array.isArray(item?.grouping)&&item.grouping.some((group:any)=>group?.group_key==='collection'&&group?.group_value===collection);
   if(!grouped||typeof item?.id!=='string'||typeof item?.ownership?.owner!=='string')throw new Fault(502,'invalid_holder_snapshot');
   assets.push({assetId:item.id,wallet:item.ownership.owner});
  }
  const slot=BigInt(await this.rpc('getSlot',[{commitment:'finalized'}]));
  return{slot,assets};
 }
}
