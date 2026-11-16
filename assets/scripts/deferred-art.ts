import {assetManager,Texture2D,SpriteFrame,Rect} from 'cc';
import {loadGameBundle} from './game-resources';
type Listener={alive:()=>boolean;done:(error?:Error)=>void};
type Sheet={name:string;columns:number;rows:number;keys:string[]};
const pending=new WeakMap<Record<string,SpriteFrame>,Map<string,Listener[]>>();
/** One in-flight group per scene. Frames become visible only after every sheet succeeds. */
function ensureSheets(bundleName:string,sheets:Sheet[],frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void):void {
 if(sheets.every(s=>s.keys.every(k=>!!frames[k]))){done();return;}
 let groups=pending.get(frames);if(!groups){groups=new Map();pending.set(frames,groups);}const waiting=groups.get(bundleName);
 if(waiting){waiting.push({alive,done});return;}const listeners=[{alive,done}];groups.set(bundleName,listeners);
 let settled=false,timer:ReturnType<typeof setTimeout>|undefined;const loaded:{sheet:Sheet;texture:Texture2D}[]=[];
 const discard=(t:Texture2D)=>{if(!Object.values(frames).some(f=>f.texture===t))assetManager.releaseAsset(t);};
 const finish=(error?:Error)=>{if(settled)return;settled=true;if(timer!==undefined)clearTimeout(timer);groups!.delete(bundleName);
  const live=listeners.filter(l=>l.alive());if(!error&&!live.length)error=new Error('已离开资源准备界面');
  if(!error)for(const {sheet,texture} of loaded)sheet.keys.forEach((key,i)=>{const f=new SpriteFrame();f.texture=texture;f.rect=new Rect(i%sheet.columns*texture.width/sheet.columns,Math.floor(i/sheet.columns)*texture.height/sheet.rows,texture.width/sheet.columns,texture.height/sheet.rows);frames[key]=f;});
  else for(const {texture} of loaded)discard(texture);
  for(const l of listeners)l.done(error||(!l.alive()?new Error('已取消资源请求'):undefined));
 };
 if(typeof setTimeout==='function')timer=setTimeout(()=>finish(new Error('资源下载超时')),20000);
 loadGameBundle(bundleName,(error,bundle)=>{if(settled)return;if(error||!bundle){finish(error||new Error('资源不可用'));return;}let remaining=sheets.length;
  for(const sheet of sheets)bundle.load(sheet.name+'/texture',Texture2D,(e,t)=>{if(settled){if(t)Promise.resolve().then(()=>{if(!groups!.has(bundleName))discard(t);});return;}if(e||!t){finish(e||new Error('贴图不可用'));return;}loaded.push({sheet,texture:t});if(--remaining===0)finish();});
 });
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
 const textures=new Set<SpriteFrame['texture']>();for(const id of ['liubei','guanyu','zhangfei']){const key='result-'+id,f=frames[key];if(f){textures.add(f.texture);delete frames[key];f.destroy();}}
 for(const t of textures)if(!Object.values(frames).some(f=>f.texture===t))assetManager.releaseAsset(t);
}
