import {LVBU_LAYOUT} from './lvbu-art-layout';
import {BOSS_LAYOUTS} from './boss-prop-layout';
import {assetManager,AssetManager,Texture2D,SpriteFrame,Rect} from 'cc';
import {NPC_GEAR_BOUNDS} from './npc-art-layout';
import {EXTRA_WEAPONS} from './extra-weapons';
import {artScope,releaseArtTexture} from './asset-scope';
import {ensureSheets,cancelArtGroups,makeSheetFrame,PackedFrame,Sheet} from './deferred-art';
import {BOSS_ATLAS_SCALE} from './boss-atlas-scale';
import {PIXEL_RECTS} from './pixelfx-layout';
import {VFX_MATERIAL_KEYS} from './vfx-materials';
import type {WeaponId} from './weapons';
export const REDESIGN_WEAPONS:WeaponId[]=[
 'sandal','pole','cleaver','twin-swords','guandao','serpent-spear','halberd','silver-spear','qinggang','yitian','seven-saber','ancient-saber',
 'twin-halberds','trident','repeater','phoenix-bow','heavy-crossbow','hand-halberd','chain-hook','caltrops','firecracker','oil-jar','thunder-bomb','peach',
 'feather-fan','thunder','taiping-book','gourd','bagua','star-lamps','sword','wood-ox','wood-kite',
];
const REDESIGN_SKILL_ICONS=[0,2,7,6,9,11,17,18,19,21,24,25];
const bossLayouts={...BOSS_LAYOUTS,...LVBU_LAYOUT};
export const BOSS_ART_IDS=['zhangjiao','lvbu','dongzhuo','yuanshao','caocao','menghuo','simayi'];
export const bossPropKeys=Array.from({length:16},(_,i)=>'boss-prop-'+i);
export const bossBeastKeys=Array.from({length:24},(_,i)=>'boss-beast-'+i);
export const bossActionKeys:Record<string,string[]>={};
for(const id of BOSS_ART_IDS){
 const prefix=id==='lvbu'?'lvbu-action-':'boss-'+id+'-action-';
 bossActionKeys[id]=Array.from({length:id==='lvbu'?20:16},(_,i)=>prefix+i);
}
const usesProps=(id:string)=>['zhangjiao','dongzhuo','yuanshao','simayi'].includes(id);
export function ensureBossProps(frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void):void {
 ensureSheets('boss-props',[{name:'boss-props',columns:4,rows:4,keys:bossPropKeys,layout:BOSS_LAYOUTS['boss-props']}],frames,alive,done,BOSS_ATLAS_SCALE);
}
export const bossArtReady=(frames:Record<string,SpriteFrame>,id:string):boolean=>{
 const first=bossActionKeys[id]?.[0];
 return !!first&&!!frames[first]&&(!usesProps(id)||!!frames[bossPropKeys[15]])&&(id!=='menghuo'||!!frames[bossBeastKeys[23]]);
};
export async function loadChronicleArt(frames:Record<string,SpriteFrame>,alive:()=>boolean):Promise<void>{
 const scope=artScope(frames);
 const loadBundle=(id:string)=>new Promise<AssetManager.Bundle>((resolve,reject)=>scope.request<AssetManager.Bundle>(done=>assetManager.loadBundle(id,done),(e,b)=>e||!b?reject(e||new Error('资源包为空')):resolve(b)));
 const [ui,units,presentation]=await Promise.all([loadBundle('chronicle-ui'),loadBundle('chronicle-units'),loadBundle('presentation')]);
 const load=(bundle:AssetManager.Bundle,name:string)=>new Promise<Texture2D>((resolve,reject)=>scope.load(bundle,name+'/texture',Texture2D,(e,t)=>e||!t?reject(e||new Error('贴图为空')):resolve(t)));
 const atlas=async(bundle:AssetManager.Bundle,name:string,cols:number,rows:number,keys:string[],layout?:readonly PackedFrame[])=>{
  const texture=await load(bundle,name);
  if(!alive()){releaseArtTexture(frames,texture);return;}
  keys.forEach((key,i)=>frames[key]=makeSheetFrame(texture,i,cols,rows,layout?.[i]));
 };
 await Promise.all([
  (async()=>{
   const texture=await load(presentation,'pixelfx');
   if(!alive()){releaseArtTexture(frames,texture);return;}
   for(const [key,x,y,w,h] of PIXEL_RECTS){const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(x,y,w,h);frames[key]=frame;}
  })(),
  atlas(presentation,'vfx-materials',4,4,VFX_MATERIAL_KEYS.map(k=>'vfx-'+k)),
  atlas(presentation,'growth',6,4,Array.from({length:24},(_,i)=>i<18?'mount-'+['liubei','guanyu','zhangfei'][Math.floor(i/6)]+'-'+i%6:i<21?'growth-torso-'+['liubei','guanyu','zhangfei'][i-18]:'growth-held-'+['liubei','guanyu','zhangfei'][i-21])),
  atlas(ui,'weapons',5,5,EXTRA_WEAPONS.map(w=>'icon-'+w.id)),
  atlas(ui,'stage-jade',1,1,['stage-panel']),
  atlas(ui,'stage-switch',1,1,['stage-switch']),
  atlas(ui,'stage-themes',3,2,Array.from({length:6},(_,i)=>'stage-cell-'+(i+1))),
  atlas(ui,'redesign-relief',3,2,Array.from({length:6},(_,i)=>'stage-relief-'+(i+1))),
  atlas(ui,'redesign-stage-thumbs',3,2,Array.from({length:6},(_,i)=>'stage-ui-thumb-'+(i+1))),
  atlas(ui,'redesign-arsenal',8,5,REDESIGN_WEAPONS.map(id=>'redesign-icon-'+id)),
  atlas(ui,'skills',6,4,Array.from({length:24},(_,i)=>'skill-'+i)),
  atlas(ui,'redesign-skills',4,3,REDESIGN_SKILL_ICONS.map(icon=>'redesign-skill-'+icon)),
  atlas(ui,'boss-portraits',4,2,BOSS_ART_IDS.map(id=>'boss-'+id)),
  ...['a','b'].reduce<Promise<void>[]>((all,g,gi)=>[...all,...['front','back'].map(async v=>{const t=await load(units,'troops-'+g+'-'+v);if(!alive()){releaseArtTexture(frames,t);return;}const cell=(index:number,b:readonly number[]=[0,0,96,96])=>{const f=new SpriteFrame();f.texture=t;f.rect=new Rect(index%5*96+b[0],Math.floor(index/5)*96+b[1],b[2],b[3]);return f;};const sleeve=cell(60,NPC_GEAR_BOUNDS[40]),fist=cell(61,NPC_GEAR_BOUNDS[41]),shield=cell(62,NPC_GEAR_BOUNDS[42]);for(let i=0;i<20;i++){const key='E'+('0'+(gi*20+i+1)).slice(-2)+'-'+v;frames['enemy-'+key]=cell(i);frames['npc-body-'+key]=cell(i+20);frames['npc-gear-'+key]=cell(i+40,NPC_GEAR_BOUNDS[gi*20+i]);frames['npc-sleeve-'+key]=sleeve;frames['npc-fist-'+key]=fist;frames['npc-shield-'+key]=shield;}})],[]),
 ]);
 if(!alive())return;
 frames['boss-eye']=frames['skill-19'];
 for(const icon of REDESIGN_SKILL_ICONS){
  const key='skill-'+icon;
  if(icon!==19)frames[key]?.destroy();
  frames[key]=frames['redesign-skill-'+icon];
 }
 if(frames['stage-panel']){const f=frames['stage-panel'];f.insetLeft=64;f.insetRight=64;f.insetTop=48;f.insetBottom=48;}
 for(let i=1;i<=6;i++){const cell=frames['stage-cell-'+i];if(!cell)continue;for(const [name,y,height]of [['stage-thumb-',0,128],['stage-ground-',128,192]] as const){const f=new SpriteFrame();f.texture=cell.texture;const inset=name==='stage-ground-'?2:0;f.rect=new Rect(cell.rect.x+inset,cell.rect.y+y+inset,320-inset*2,height-inset*2);frames[name+i]=f;}const map=new SpriteFrame();map.texture=cell.texture;map.rect=new Rect(cell.rect.x+28,cell.rect.y,264,128);frames['stage-map-'+i]=map;}
 for(const w of EXTRA_WEAPONS)frames['weapon-'+w.id]=frames['icon-'+w.id];
 // Local compact boss portraits serve selectors/codex even before animation download.
}

/** Load the encounter's atlas from its own game subpackage. */
export function ensureBossArt(id:string,frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void):void {
 if(!BOSS_ART_IDS.includes(id)){done(new Error('未知首领：'+id));return;}
 const name=id==='lvbu'?'lvbu-actions':'boss-'+id+'-actions',cols=4,rows=id==='lvbu'?5:4;
 const layouts:Readonly<Record<string,readonly PackedFrame[]>>=bossLayouts;
 const sheets:Sheet[]=[{name,columns:cols,rows,keys:bossActionKeys[id],layout:layouts[name]}];
 if(id==='menghuo')sheets.push({name:'boss-beasts',columns:6,rows:4,keys:bossBeastKeys,layout:BOSS_LAYOUTS['boss-beasts']});
 if(!usesProps(id)){ensureSheets('boss-'+id,sheets,frames,alive,done,BOSS_ATLAS_SCALE);return;}
 // Each bundle owns its texture independently, including when two bosses share props.
 let pending=2,failed=false;
 const finish=(error?:Error)=>{
  if(failed)return;
  if(error){failed=true;done(error);return;}
  if(--pending===0)done();
 };
 ensureSheets('boss-'+id,sheets,frames,alive,finish,BOSS_ATLAS_SCALE);
 ensureBossProps(frames,alive,finish);
}

/** Scene actors have been hidden before calling this; local portraits are kept. */
export function releaseBossArt(frames:Record<string,SpriteFrame>,detach?:(removed:Set<SpriteFrame>)=>void,keepIds:string[]=[]):Set<SpriteFrame> {
 const keepProps=keepIds.some(usesProps);
 const keepBundles=new Set(keepIds.map(id=>'boss-'+id));
 if(keepProps)keepBundles.add('boss-props');
 cancelArtGroups(frames,name=>name.startsWith('boss-')&&!keepBundles.has(name));
 const removed=new Set<SpriteFrame>(),textures=new Set<SpriteFrame['texture']>();
 const discard=(keys:string[])=>{for(const key of keys){const f=frames[key];if(f){removed.add(f);textures.add(f.texture);delete frames[key];}}};
 for(const id of BOSS_ART_IDS)if(!keepIds.includes(id))discard(bossActionKeys[id]);
 if(!keepIds.includes('menghuo'))discard(bossBeastKeys);
 if(!keepProps)discard(bossPropKeys);
 detach?.(removed);for(const f of removed)f.destroy();for(const t of textures)releaseArtTexture(frames,t);return removed;
}
