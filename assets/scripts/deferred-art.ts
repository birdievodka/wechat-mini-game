import {Texture2D,SpriteFrame,Rect,Size,Vec2} from 'cc';
import {loadGameBundle} from './game-resources';
import {AssetScope,artScope,releaseArtTexture} from './asset-scope';
import {boundedCall,notifySafely} from './load-lifetime';
type Listener={alive:()=>boolean;done:(error?:Error)=>void};
export type PackedFrame=readonly [number,number,number,number,number,number,number,number];
export function makeSheetFrame(texture:Texture2D,index:number,cols:number,rows:number,packed?:PackedFrame):SpriteFrame {
 const f=new SpriteFrame();f.texture=texture;
 if(packed){
  const [x,y,w,h,ow,oh,left,top]=packed;
  f.rect=new Rect(x,y,w,h);f.originalSize=new Size(ow,oh);
  f.offset=new Vec2(left+(w-ow)/2,(oh-h)/2-top);
 }else{
  const w=texture.width/cols,h=texture.height/rows;
  f.rect=new Rect(index%cols*w,Math.floor(index/cols)*h,w,h);
 }
 return f;
}
export type Sheet={name:string;columns:number;rows:number;keys:string[];layout?:readonly PackedFrame[]};
type Group={listeners:Listener[];cancel?:()=>void};
type LoadedSheet={sheet:Sheet;texture:Texture2D};
const pending=new WeakMap<Record<string,SpriteFrame>,Map<string,Group>>();
const isAlive=(l:Listener):boolean=>{try{return l.alive();}catch(error){console.warn('资源存活检查异常',error);return false;}};
function scaleFrame(frame:PackedFrame,scale:number):PackedFrame {
 const [x,y,w,h,ow,oh,left,top]=frame;
 const startX=Math.round(x*scale),startY=Math.round(y*scale);
 return [startX,startY,Math.round((x+w)*scale)-startX,Math.round((y+h)*scale)-startY,ow*scale,oh*scale,left*scale,top*scale];
}
function loadSheetGroup(bundleName:string,sheets:Sheet[],hasListeners:()=>boolean,deadline:number,done:(error:Error|null,loaded:LoadedSheet[])=>void):()=>void {
 const temporary=new AssetScope(),loaded:LoadedSheet[]=[];
 let settled=false;
 return boundedCall<void>(complete=>{
  loadGameBundle(bundleName,(error,bundle)=>{
   if(settled)return;
   if(error||!bundle){complete(new Error(bundleName+'：'+(error?.message||'资源包不可用')));return;}
   if(!hasListeners()){complete(new Error('已离开资源准备界面'));return;}
   let remaining=sheets.length;
   for(const sheet of sheets){
    if(settled)break;
    temporary.load(bundle,sheet.name+'/texture',Texture2D,(error,texture)=>{
     if(settled)return;
     if(error||!texture){complete(new Error(sheet.name+'：'+(error?.message||'贴图不可用')));return;}
     loaded.push({sheet,texture});if(--remaining===0)complete(null);
    });
   }
  });
 },error=>{
  settled=true;
  if(error)temporary.destroy();
  try{done(error,loaded);}finally{temporary.destroy();}
 },deadline);
}
/** Coalesce the complete publication, not just its underlying downloads. */
export function ensureSheets(bundleName:string,sheets:Sheet[],frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void,layoutScale?:number):void {
 const scope=artScope(frames),listener:Listener={alive,done};
 if(scope.disposed||!isAlive(listener)){notifySafely(()=>done(new Error('已离开资源准备界面')));return;}
 if(sheets.every(s=>s.keys.every(k=>!!frames[k]))){notifySafely(()=>done());return;}
 let groups=pending.get(frames);if(!groups){groups=new Map();pending.set(frames,groups);}const waiting=groups.get(bundleName);
 if(waiting){waiting.listeners.push(listener);return;}
 const group:Group={listeners:[listener]};groups.set(bundleName,group);
 const hasListeners=()=>!scope.disposed&&group.listeners.some(isAlive);
 group.cancel=loadSheetGroup(bundleName,sheets,hasListeners,20000,(error,loaded)=>{
  if(groups!.get(bundleName)===group)groups!.delete(bundleName);
  if(!error&&!hasListeners())error=new Error('已离开资源准备界面');
  const published:Record<string,SpriteFrame>={};
  try{if(!error){
   for(const {sheet,texture} of loaded)sheet.keys.forEach((key,i)=>{
    const frame=sheet.layout?.[i];
    published[key]=makeSheetFrame(texture,i,sheet.columns,sheet.rows,frame&&layoutScale?scaleFrame(frame,layoutScale):frame);
   });
   for(const {texture} of loaded)scope.own(texture);
   for(const key of Object.keys(published))frames[key]=published[key];
  }}catch(cause){error=cause instanceof Error?cause:new Error(String(cause));for(const f of Object.values(published))f.destroy();}
  for(const l of group.listeners)notifySafely(()=>l.done(error||(scope.disposed||!isAlive(l)?new Error('已取消资源请求'):undefined)));
 });
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
