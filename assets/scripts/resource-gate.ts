/** Callback-based request deduplication. Failed entries are retryable, never cached. */
export class ResourceGate<T> {
 private ready=new Map<string,T>();
 private pending=new Map<string,((error:Error|null,value?:T)=>void)[]>();
 constructor(private fetch:(key:string,done:(error:Error|null,value?:T)=>void)=>void){}
 has(key:string):boolean{return this.ready.has(key);}
 get(key:string,done:(error:Error|null,value?:T)=>void):void {
  const value=this.ready.get(key);if(value!==undefined){done(null,value);return;}
  const queue=this.pending.get(key);if(queue){queue.push(done);return;}
  this.pending.set(key,[done]);let settled=false;
  const finish=(error:Error|null,result?:T)=>{if(settled)return;settled=true;const listeners=this.pending.get(key)||[];this.pending.delete(key);
   if(!error&&result!==undefined)this.ready.set(key,result);
   for(const listener of listeners)listener(error||(result===undefined?new Error('资源为空：'+key):null),result);
  };
  try{this.fetch(key,finish);}catch(error){finish(error instanceof Error?error:new Error(String(error)));}
 }
 forget(key:string):void{this.ready.delete(key);}
}
