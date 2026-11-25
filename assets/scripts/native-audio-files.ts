import {assetManager,AssetManager,AudioClip} from 'cc';
import {AssetScope} from './asset-scope';
import {loadGameBundle} from './game-resources';
/** Resolve bundle UUIDs without AudioClip.load: that operation creates a native player. */
export class NativeAudioFiles {
  private scope=new AssetScope();private paths=new Map<string,string>();
  get count():number{return this.paths.size;}
  invalidate(bundleName:string,path:string):void {this.paths.delete(bundleName+'/'+path);}
  load(bundleName:string,path:string,done:(error:Error|null,url?:string)=>void,ms=18000,local?:AssetManager.Bundle):()=>void {
    const key=bundleName+'/'+path,cached=this.paths.get(key);if(cached&&!this.scope.disposed){done(null,cached);return ()=>{};}
    let active=true;
    return this.scope.request<string>(finish=>{
      const loaded=(error:Error|null,bundle?:AssetManager.Bundle)=>{
        if(!active||this.scope.disposed)return;
        if(error||!bundle){finish(error||new Error('音频分包不可用'));return;}
        try{
          const info=bundle.getInfoWithPath(path,AudioClip);if(!info)throw new Error('音频索引缺失：'+key);
          // This project ships music as M4A, every FX (including the original sandal) as PCM WAV.
          // The public utility applies the bundle base and build's native version hash.
          const url=assetManager.utils.getUrlWithUuid(info.uuid,{isNative:true,nativeExt:bundleName==='music'?'.m4a':'.wav'});
          if(!url||/^https?:\/\//i.test(url))throw new Error('音频分包地址无效：'+key);
          finish(null,url);
        }catch(error){finish(error instanceof Error?error:new Error(String(error)));}
      };
      if(local)loaded(null,local);else loadGameBundle(bundleName,loaded);
    },(error,url)=>{
      active=false;
      if(!error&&url)this.paths.set(key,url);done(error,url);
    },ms);
  }
  destroy():void {this.scope.destroy();this.paths.clear();}
}
