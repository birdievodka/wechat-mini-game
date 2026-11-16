import {assetManager,AssetManager,Texture2D,SpriteFrame,Rect} from 'cc';
import {NPC_GEAR_BOUNDS} from './npc-art-layout';
import {EXTRA_WEAPONS} from './extra-weapons';
import {REFORGED_BOSSES} from './boss-roster';
import {loadGameBundle} from './game-resources';
export const BOSS_ART_IDS=['zhangjiao','lvbu','dongzhuo','yuanshao','caocao','menghuo','simayi'];
const readyBosses=new WeakMap<Record<string,SpriteFrame>,Set<string>>();
export const bossArtReady=(frames:Record<string,SpriteFrame>,id:string):boolean=>id==='zhangjiao'?!!frames['boss-zhangjiao-action-0']:!!readyBosses.get(frames)?.has(id);
export async function loadChronicleArt(frames:Record<string,SpriteFrame>,alive:()=>boolean):Promise<void>{
 const loadBundle=(id:string)=>new Promise<AssetManager.Bundle>((resolve,reject)=>assetManager.loadBundle(id,(e,b)=>e?reject(e):resolve(b)));
 const [ui,units,presentation]=await Promise.all([loadBundle('chronicle-ui'),loadBundle('chronicle-units'),loadBundle('presentation')]);
 const load=(bundle:AssetManager.Bundle,name:string)=>new Promise<Texture2D>((resolve,reject)=>bundle.load(name+'/texture',Texture2D,(e,t)=>e?reject(e):resolve(t)));
 const atlas=async(bundle:AssetManager.Bundle,name:string,cols:number,rows:number,keys:string[])=>{const t=await load(bundle,name);if(!alive())return;keys.forEach((key,i)=>{const f=new SpriteFrame();f.texture=t;f.rect=new Rect(i%cols*t.width/cols,Math.floor(i/cols)*t.height/rows,t.width/cols,t.height/rows);frames[key]=f;});};
 await Promise.all([
  atlas(presentation,'growth',6,4,Array.from({length:24},(_,i)=>i<18?'mount-'+['liubei','guanyu','zhangfei'][Math.floor(i/6)]+'-'+i%6:i<21?'growth-torso-'+['liubei','guanyu','zhangfei'][i-18]:'growth-held-'+['liubei','guanyu','zhangfei'][i-21])),
  atlas(ui,'weapons',5,5,EXTRA_WEAPONS.map(w=>'icon-'+w.id)),
  atlas(ui,'stage-jade',1,1,['stage-panel']),
  atlas(ui,'stage-journey',1,1,['stage-journey']),
  atlas(ui,'stage-switch',1,1,['stage-switch']),
  atlas(ui,'stage-themes',3,2,Array.from({length:6},(_,i)=>'stage-cell-'+(i+1))),
  atlas(ui,'skills',6,4,Array.from({length:24},(_,i)=>'skill-'+i)),
  atlas(ui,'boss-portraits',4,2,BOSS_ART_IDS.map(id=>'boss-'+id)),
  atlas(units,'boss-zhangjiao-actions',4,4,Array.from({length:16},(_,i)=>'boss-zhangjiao-action-'+i)),
  atlas(units,'boss-props',4,4,Array.from({length:16},(_,i)=>'boss-prop-'+i)),
  ...['a','b'].reduce<Promise<void>[]>((all,g,gi)=>[...all,...['front','back'].map(async v=>{const t=await load(units,'troops-'+g+'-'+v);if(!alive())return;const cell=(index:number,b:readonly number[]=[0,0,96,96])=>{const f=new SpriteFrame();f.texture=t;f.rect=new Rect(index%5*96+b[0],Math.floor(index/5)*96+b[1],b[2],b[3]);return f;};const sleeve=cell(60,NPC_GEAR_BOUNDS[40]),fist=cell(61,NPC_GEAR_BOUNDS[41]),shield=cell(62,NPC_GEAR_BOUNDS[42]);for(let i=0;i<20;i++){const key='E'+('0'+(gi*20+i+1)).slice(-2)+'-'+v;frames['enemy-'+key]=cell(i);frames['npc-body-'+key]=cell(i+20);frames['npc-gear-'+key]=cell(i+40,NPC_GEAR_BOUNDS[gi*20+i]);frames['npc-sleeve-'+key]=sleeve;frames['npc-fist-'+key]=fist;frames['npc-shield-'+key]=shield;}})],[]),
 ]);
 if(frames['stage-panel']){const f=frames['stage-panel'];f.insetLeft=64;f.insetRight=64;f.insetTop=48;f.insetBottom=48;}
 for(let i=1;i<=6;i++){const cell=frames['stage-cell-'+i];if(!cell)continue;for(const [name,y,height]of [['stage-thumb-',0,128],['stage-ground-',128,192]] as const){const f=new SpriteFrame();f.texture=cell.texture;const inset=i===1&&name==='stage-ground-'?2:0;f.rect=new Rect(cell.rect.x+inset,cell.rect.y+y+inset,320-inset*2,height-inset*2);frames[name+i]=f;}const map=new SpriteFrame();map.texture=cell.texture;map.rect=new Rect(cell.rect.x+28,cell.rect.y,264,128);frames['stage-map-'+i]=map;}
 for(const w of EXTRA_WEAPONS)frames['weapon-'+w.id]=frames['icon-'+w.id];
 // Local compact boss portraits serve selectors/codex even before animation download.
}

/** Load only the encounter's atlas. No code is fetched remotely. */
export function ensureBossArt(id:string,frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void):void {
 if(bossArtReady(frames,id)){done();return;}
 if(!BOSS_ART_IDS.includes(id)){done(new Error('未知首领：'+id));return;}
 let settled=false,timer:ReturnType<typeof setTimeout>|undefined;
 const loaded:{texture:Texture2D,cols:number,rows:number,prefix:string}[]=[];
 const discard=(texture:Texture2D)=>{if(!Object.values(frames).some(f=>f.texture===texture))assetManager.releaseAsset(texture);};
 const finish=(error?:Error)=>{
  if(settled)return;settled=true;if(timer!==undefined)clearTimeout(timer);
  if(error){for(const texture of Array.from(new Set(loaded.map(x=>x.texture))))discard(texture);done(error);return;}
  // Publish frames atomically: an incomplete Menghuo/beast download is never ready.
  for(const {texture,cols,rows,prefix} of loaded)for(let i=0;i<cols*rows;i++){const f=new SpriteFrame();f.texture=texture;f.rect=new Rect(i%cols*texture.width/cols,Math.floor(i/cols)*texture.height/rows,texture.width/cols,texture.height/rows);frames[prefix+i]=f;}
  let set=readyBosses.get(frames);if(!set){set=new Set();readyBosses.set(frames,set);}set.add(id);done();
 };
 if(typeof setTimeout==='function')timer=setTimeout(()=>finish(new Error('资源下载超时，请重试')),20000);
 loadGameBundle('boss-'+id,(error,bundle)=>{
  if(settled)return;
  if(error||!bundle||!alive()){finish(error||new Error('首领资源不可用'));return;}
  const name=id==='lvbu'?'lvbu-actions':'boss-'+id+'-actions';let remaining=id==='menghuo'?2:1;
  const load=(path:string,cols:number,rows:number,prefix:string)=>bundle.load(path+'/texture',Texture2D,(e,texture)=>{
   if(settled){if(texture)discard(texture);return;}
   if(e||!texture||!alive()){if(texture)discard(texture);finish(e||new Error('已离开准备界面'));return;}
   loaded.push({texture,cols,rows,prefix});if(--remaining===0)finish();
  });
  load(name,4,id==='lvbu'?5:4,id==='lvbu'?'lvbu-action-':'boss-'+id+'-action-');
  if(id==='menghuo')load('boss-beasts',6,4,'boss-beast-');
 });
}

/** Scene actors have been hidden before calling this; local portraits are kept. */
export function releaseBossArt(frames:Record<string,SpriteFrame>,detach?:(removed:Set<SpriteFrame>)=>void):Set<SpriteFrame> {
 readyBosses.delete(frames);const removed=new Set<SpriteFrame>(),textures=new Set<SpriteFrame['texture']>();
 for(const key of Object.keys(frames))if(key.startsWith('lvbu-action-')||key.startsWith('boss-beast-')||REFORGED_BOSSES.some(id=>id!=='zhangjiao'&&key.startsWith('boss-'+id+'-action-'))){removed.add(frames[key]);textures.add(frames[key].texture);delete frames[key];}
 detach?.(removed);for(const f of removed)f.destroy();for(const t of textures)assetManager.releaseAsset(t);return removed;
}
