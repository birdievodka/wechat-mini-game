import {Texture2D,SpriteFrame,Rect} from 'cc';
import {loadGameBundle} from './game-resources';
import {AssetScope,artScope,releaseArtTexture} from './asset-scope';
import {boundedCall,notifySafely} from './load-lifetime';
type Listener={alive:()=>boolean;done:(error?:Error)=>void};
export type Sheet={name:string;columns:number;rows:number;keys:string[]};
type Group={listeners:Listener[];cancel?:()=>void};
const pending=new WeakMap<Record<string,SpriteFrame>,Map<string,Group>>();
const isAlive=(l:Listener):boolean=>{try{return l.alive();}catch(error){console.warn('资源存活检查异常',error);return false;}};
/** Coalesce the complete publication, not just its underlying downloads. */
export function ensureSheets(bundleName:string,sheets:Sheet[],frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void):void {
 if(sheets.every(s=>s.keys.every(k=>!!frames[k]))){notifySafely(()=>done());return;}
 if(artScope(frames).disposed){notifySafely(()=>done(new Error('资源场景已销毁')));return;}
 let groups=pending.get(frames);if(!groups){groups=new Map();pending.set(frames,groups);}const waiting=groups.get(bundleName);
 if(waiting){waiting.listeners.push({alive,done});return;}
 const group:Group={listeners:[{alive,done}]};groups.set(bundleName,group);const temporary=new AssetScope(),loaded:{sheet:Sheet;texture:Texture2D}[]=[];
 let settled=false;
 group.cancel=boundedCall<void>(complete=>{
  loadGameBundle(bundleName,(error,bundle)=>{
   if(settled)return;if(error||!bundle){complete(error||new Error('资源不可用'));return;}
   if(!group.listeners.some(isAlive)){complete(new Error('已离开资源准备界面'));return;}
   let remaining=sheets.length;
   for(const sheet of sheets){if(settled)break;temporary.load(bundle,sheet.name+'/texture',Texture2D,(error,t)=>{
    if(settled)return;if(error||!t){complete(error||new Error('贴图不可用'));return;}loaded.push({sheet,texture:t});if(--remaining===0)complete(null);
   });}
  });
 },error=>{
  settled=true;if(groups!.get(bundleName)===group)groups!.delete(bundleName);
  if(!error&&!group.listeners.some(isAlive))error=new Error('已离开资源准备界面');
  const published:Record<string,SpriteFrame>={};
  try{if(!error){
   for(const {sheet,texture} of loaded)sheet.keys.forEach((key,i)=>{const f=new SpriteFrame();f.texture=texture;f.rect=new Rect(i%sheet.columns*texture.width/sheet.columns,Math.floor(i/sheet.columns)*texture.height/sheet.rows,texture.width/sheet.columns,texture.height/sheet.rows);published[key]=f;});
   for(const {texture} of loaded)artScope(frames).own(texture);
   for(const key of Object.keys(published))frames[key]=published[key];
  }}catch(cause){error=cause instanceof Error?cause:new Error(String(cause));for(const f of Object.values(published))f.destroy();}
  temporary.destroy();
  for(const l of group.listeners)notifySafely(()=>l.done(error||(!isAlive(l)?new Error('已取消资源请求'):undefined)));
 },20000);
}
export function cancelArtGroups(frames:Record<string,SpriteFrame>,matches:(name:string)=>boolean=()=>true):void {
 for(const [name,group]of Array.from(pending.get(frames)||[]))if(matches(name))group.cancel?.();
}
export function ensureResultArt(frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void):void {
 ensureSheets('results',[{name:'portraits',columns:3,rows:1,keys:['liubei','guanyu','zhangfei'].map(id=>'result-'+id)}],frames,alive,done);
}
export function ensureHiddenHeroArt(frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void):void {
 ensureSheets('hidden-heroes',[
  {name:'hero-portraits',columns:2,rows:2,keys:['hero-select-zhaoyun','hero-select-kongming','result-zhaoyun','result-kongming']},
  {name:'hero-parts',columns:2,rows:3,keys:['hero-zhaoyun-open','hero-kongming-open','hero-zhaoyun-closed','hero-kongming-closed','hero-zhaoyun-torso','hero-kongming-torso']},
 ],frames,alive,done);
}

/** Result view has been removed before this release. HUD portraits live elsewhere. */
export function releaseResultArt(frames:Record<string,SpriteFrame>):void {
 cancelArtGroups(frames,name=>name==='results');
 const textures=new Set<SpriteFrame['texture']>();for(const id of ['liubei','guanyu','zhangfei']){const key='result-'+id,f=frames[key];if(f){textures.add(f.texture);delete frames[key];f.destroy();}}
 for(const t of textures)if(!Object.values(frames).some(f=>f.texture===t))releaseArtTexture(frames,t);
}
