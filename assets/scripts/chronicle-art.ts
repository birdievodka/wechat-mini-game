import {assetManager,AssetManager,Texture2D,SpriteFrame,Rect} from 'cc';
import {NPC_GEAR_BOUNDS} from './npc-art-layout';
import {EXTRA_WEAPONS} from './extra-weapons';
import {REFORGED_BOSSES} from './boss-roster';
export const BOSS_ART_IDS=['zhangjiao','lvbu','dongzhuo','yuanshao','caocao','menghuo','simayi'];
export async function loadChronicleArt(frames:Record<string,SpriteFrame>,alive:()=>boolean):Promise<void>{
 const loadBundle=(id:string)=>new Promise<AssetManager.Bundle>((resolve,reject)=>assetManager.loadBundle(id,(e,b)=>e?reject(e):resolve(b)));
 const [ui,units,presentation]=await Promise.all([loadBundle('chronicle-ui'),loadBundle('chronicle-units'),loadBundle('presentation')]);
 const load=(bundle:AssetManager.Bundle,name:string)=>new Promise<Texture2D>((resolve,reject)=>bundle.load(name+'/texture',Texture2D,(e,t)=>e?reject(e):resolve(t)));
 const atlas=async(bundle:AssetManager.Bundle,name:string,cols:number,rows:number,keys:string[])=>{const t=await load(bundle,name);if(!alive())return;keys.forEach((key,i)=>{const f=new SpriteFrame();f.texture=t;f.rect=new Rect(i%cols*t.width/cols,Math.floor(i/cols)*t.height/rows,t.width/cols,t.height/rows);frames[key]=f;});};
 await Promise.all([
  atlas(presentation,'growth',6,4,Array.from({length:24},(_,i)=>i<18?'mount-'+['liubei','guanyu','zhangfei'][Math.floor(i/6)]+'-'+i%6:i<21?'growth-torso-'+['liubei','guanyu','zhangfei'][i-18]:'growth-held-'+['liubei','guanyu','zhangfei'][i-21])),
  atlas(ui,'hero-portraits',2,2,['hero-select-zhaoyun','hero-select-kongming','result-zhaoyun','result-kongming']),
  atlas(ui,'hero-parts',2,3,['hero-zhaoyun-open','hero-kongming-open','hero-zhaoyun-closed','hero-kongming-closed','hero-zhaoyun-torso','hero-kongming-torso']),
  atlas(ui,'weapons',5,5,EXTRA_WEAPONS.map(w=>'icon-'+w.id)),
  atlas(ui,'stage-jade',1,1,['stage-panel']),
  atlas(ui,'stage-themes',3,2,Array.from({length:6},(_,i)=>'stage-cell-'+(i+1))),
  atlas(ui,'skills',6,4,Array.from({length:24},(_,i)=>'skill-'+i)),
  atlas(units,'lvbu-actions',4,5,Array.from({length:20},(_,i)=>'lvbu-action-'+i)),
  ...REFORGED_BOSSES.map(id=>atlas(units,'boss-'+id+'-actions',4,4,Array.from({length:16},(_,i)=>'boss-'+id+'-action-'+i))),
  atlas(units,'boss-beasts',6,4,Array.from({length:24},(_,i)=>'boss-beast-'+i)),
  atlas(units,'boss-props',4,4,Array.from({length:16},(_,i)=>'boss-prop-'+i)),
  ...['a','b'].reduce<Promise<void>[]>((all,g,gi)=>[...all,...['front','back'].map(async v=>{const t=await load(units,'troops-'+g+'-'+v);if(!alive())return;const cell=(index:number,b:readonly number[]=[0,0,96,96])=>{const f=new SpriteFrame();f.texture=t;f.rect=new Rect(index%5*96+b[0],Math.floor(index/5)*96+b[1],b[2],b[3]);return f;};const sleeve=cell(60,NPC_GEAR_BOUNDS[40]),fist=cell(61,NPC_GEAR_BOUNDS[41]),shield=cell(62,NPC_GEAR_BOUNDS[42]);for(let i=0;i<20;i++){const key='E'+('0'+(gi*20+i+1)).slice(-2)+'-'+v;frames['enemy-'+key]=cell(i);frames['npc-body-'+key]=cell(i+20);frames['npc-gear-'+key]=cell(i+40,NPC_GEAR_BOUNDS[gi*20+i]);frames['npc-sleeve-'+key]=sleeve;frames['npc-fist-'+key]=fist;frames['npc-shield-'+key]=shield;}})],[]),
 ]);
 if(frames['stage-panel']){const f=frames['stage-panel'];f.insetLeft=64;f.insetRight=64;f.insetTop=48;f.insetBottom=48;}
 for(let i=1;i<=6;i++){const cell=frames['stage-cell-'+i];if(!cell)continue;for(const [name,y,height]of [['stage-thumb-',0,128],['stage-ground-',128,192]] as const){const f=new SpriteFrame();f.texture=cell.texture;f.rect=new Rect(cell.rect.x,cell.rect.y+y,320,height);frames[name+i]=f;}}
 for(const w of EXTRA_WEAPONS)frames['weapon-'+w.id]=frames['icon-'+w.id];
 // Keep Lu Bu's codex/training portrait consistent with the approved mounted palette.
 frames['boss-lvbu']=frames['lvbu-action-12'];
 for(const id of REFORGED_BOSSES)frames['boss-'+id]=frames['boss-'+id+'-action-0'];
}
