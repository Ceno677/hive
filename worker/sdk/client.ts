export class HiveClient{
 constructor(private url:string,private token:string){}
 async call(path:string,body?:unknown){
  const r=await fetch(new URL(path,this.url),{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+this.token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const data=await r.json() as any;if(!r.ok)throw Error(data.error??'hive_request_failed');return data;
 }
}
