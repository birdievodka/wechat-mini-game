import {Asset,AssetManager,assetManager,SpriteFrame,AudioClip} from 'cc';
import {boundedCall,notifySafely} from './load-lifetime';
type Done<T>=(error:Error|null,value?:T)=>void;
type Listener={deliver:Done<Asset>};
type Job={listeners:Set<Listener>;cancel?:()=>void};
type Slot={job?:Job;retired:Set<Asset>};
const sources=new WeakMap<object,Map<string,Slot>>();
// Engine addRef/decRef protects assets shared by scene scopes and in-flight publication.
const held=new WeakMap<object,number>();
function hold(a:Asset):void {held.set(a,(held.get(a)||0)+1);a.addRef?.();}
function drop(a:Asset):void {
 const n=held.get(a)||0;if(n<=0)return;held.set(a,n-1);
 if(a.decRef){
  // Cached, synchronous cue callbacks can all finish before the next engine tick.
  // Retire the last unreferenced AudioClip metadata player now, after ALL listeners.
  const immediate=n===1&&a instanceof AudioClip;a.decRef(!immediate);
  if(immediate&&a.refCount===0)assetManager.releaseAsset(a);
 }else if(n===1)assetManager.releaseAsset(a);
}
/** Each scene owns a lease, rather than force-releasing a texture another scene uses. */
export class AssetScope {
 private assets=new Set<Asset>();private requests=new Set<()=>void>();private closed=false;
 get disposed():boolean{return this.closed;}
 own<T extends Asset>(a:T):T {if(!this.closed&&!this.assets.has(a)){this.assets.add(a);hold(a);}return a;}
 release(a:Asset):void {if(this.assets.delete(a))drop(a);}
 request<T>(start:(done:Done<T>)=>void,done:Done<T>,ms=18000,late?:(a:T)=>void):()=>void {
  if(this.closed){done(new Error('资源场景已销毁'));return ()=>{};}let finished=false,cancel:()=>void;
  cancel=boundedCall(start,(error,value)=>{finished=true;this.requests.delete(cancel);done(error,value);},ms,late);
  if(!finished)this.requests.add(cancel);return cancel;
 }
 load<T extends Asset>(bundle:AssetManager.Bundle,path:string,type:new(...args:any[])=>T,done:Done<T>,ms=18000):()=>void {
  if(this.closed){done(new Error('资源场景已销毁'));return ()=>{};}
  let map=sources.get(bundle);if(!map){map=new Map();sources.set(bundle,map);}const key=path+':'+type.name;
  let slot=map.get(key);if(!slot){slot={retired:new Set()};map.set(key,slot);}const source=slot;
  let finished=false,cancel:()=>void;
  const listener:Listener={deliver:(error,a)=>{if(finished)return;finished=true;this.requests.delete(cancel);if(!error&&a&&!this.closed)this.own(a);done(error||(this.closed?new Error('资源场景已销毁'):null),a as T|undefined);}};
  const existing=source.job,job=existing||{listeners:new Set<Listener>()};source.job=job;job.listeners.add(listener);
  cancel=()=>{if(finished)return;job.listeners.delete(listener);notifySafely(()=>listener.deliver(new Error('已取消资源请求')));if(!job.listeners.size)job.cancel?.();};this.requests.add(cancel);
  if(!existing){
   const seen=new Set<Asset>();
   const receiveLate=(a:Asset)=>{if(seen.has(a))return;seen.add(a);if(source.retired.has(a))return;hold(a);if(source.job)source.retired.add(a);else drop(a);};
   job.cancel=boundedCall<Asset>(finish=>bundle.load(path,type,(error,a)=>finish(error,a)),(error,a)=>{
    if(a){seen.add(a);hold(a);}if(source.job===job)source.job=undefined;
    const listeners=Array.from(job.listeners);job.listeners.clear();
    for(const l of listeners)notifySafely(()=>l.deliver(error,a));
    if(a)drop(a);
    // A late old callback cannot destroy a texture before a replacement has published it.
    if(!source.job){for(const retired of source.retired)drop(retired);source.retired.clear();}
   },ms,receiveLate);
  }
  return cancel;
 }
 destroy():void {if(this.closed)return;this.closed=true;for(const cancel of Array.from(this.requests))notifySafely(cancel);this.requests.clear();for(const a of Array.from(this.assets))notifySafely(()=>this.release(a));}
}
const scopes=new WeakMap<Record<string,SpriteFrame>,AssetScope>();
export function artScope(frames:Record<string,SpriteFrame>):AssetScope {let scope=scopes.get(frames);if(!scope){scope=new AssetScope();scopes.set(frames,scope);}return scope;}
export function releaseArtTexture(frames:Record<string,SpriteFrame>,texture:SpriteFrame['texture']):void {if(!Object.values(frames).some(f=>f.texture===texture))artScope(frames).release(texture);}
