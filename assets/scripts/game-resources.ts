import {assetManager,AssetManager} from 'cc';
import {ResourceGate} from './resource-gate';
const bundles=new ResourceGate<AssetManager.Bundle>((name,done)=>{
 let attempts = 0;
 let finished = false;
 // Release the shared request before the preparation panel's 20-second deadline.
 const timeout = typeof setTimeout === 'function'
  ? setTimeout(() => finish(new Error('资源包下载超时：' + name)), 18000)
  : undefined;
 function finish(error: Error | null, bundle?: AssetManager.Bundle): void {
  if (finished) return;
  finished = true;
  if (timeout !== undefined) clearTimeout(timeout);
  done(error, bundle);
 }
 function request(): void {
  if (finished) return;
  attempts++;
  try {
   assetManager.loadBundle(name, (error, bundle) => {
    if (finished) return;
    if (error && attempts < 3 && typeof setTimeout === 'function') {
     setTimeout(request, 300 * attempts);
     return;
    }
    finish(error || null, bundle);
   });
  } catch (error) {
   finish(error instanceof Error ? error : new Error(String(error)));
  }
 }
 request();
});
export const loadGameBundle=(name:string,done:(error:Error|null,bundle?:AssetManager.Bundle)=>void):void=>bundles.get(name,done);
export function forgetGameBundle(name:string):void {bundles.forget(name);}

/** Current stage needs at most two real bosses. Hidden/deferred content is not boot-critical. */
export const stageBosses=(stage:number):string[]=>stage===2?['lvbu','dongzhuo']:[['zhangjiao'],[],['yuanshao'],['caocao'],['menghuo'],['simayi']][Math.max(0,Math.min(5,stage-1))];
