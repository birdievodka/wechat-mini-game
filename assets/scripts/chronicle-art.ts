import {assetManager,AssetManager,Texture2D,SpriteFrame,Rect} from 'cc';
import {EXTRA_WEAPONS} from './extra-weapons';
export const BOSS_ART_IDS=['zhangjiao','lvbu','dongzhuo','yuanshu','yuanshao','xiahoudun','caocao','zhouyu','huangzhong','machao','luxun','zhurong','menghuo','simayi'];
export async function loadChronicleArt(frames:Record<string,SpriteFrame>,alive:()=>boolean):Promise<void>{
 const loadBundle=(id:string)=>new Promise<AssetManager.Bundle>((resolve,reject)=>assetManager.loadBundle(id,(e,b)=>e?reject(e):resolve(b)));
 const [ui,units]=await Promise.all([loadBundle('chronicle-ui'),loadBundle('chronicle-units')]);
 const load=(bundle:AssetManager.Bundle,name:string)=>new Promise<Texture2D>((resolve,reject)=>bundle.load(name+'/texture',Texture2D,(e,t)=>e?reject(e):resolve(t)));
 const atlas=async(bundle:AssetManager.Bundle,name:string,cols:number,rows:number,keys:string[])=>{const t=await load(bundle,name);if(!alive())return;keys.forEach((key,i)=>{const f=new SpriteFrame();f.texture=t;f.rect=new Rect(i%cols*t.width/cols,Math.floor(i/cols)*t.height/rows,t.width/cols,t.height/rows);frames[key]=f;});};
 await Promise.all([
  atlas(ui,'hero-portraits',2,2,['hero-select-zhaoyun','hero-select-kongming','result-zhaoyun','result-kongming']),
  atlas(ui,'hero-parts',2,3,['hero-zhaoyun-open','hero-kongming-open','hero-zhaoyun-closed','hero-kongming-closed','hero-zhaoyun-torso','hero-kongming-torso']),
  atlas(ui,'weapons',5,5,EXTRA_WEAPONS.map(w=>'icon-'+w.id)),
  atlas(ui,'skills',6,4,Array.from({length:24},(_,i)=>'skill-'+i)),
  atlas(units,'bosses',7,2,BOSS_ART_IDS.map(id=>'boss-'+id)),
  atlas(units,'boss-mounts',3,2,['mount-lvbu-front','mount-xiahoudun-front','mount-machao-front','mount-lvbu-back','mount-xiahoudun-back','mount-machao-back']),
  ...['a','b'].reduce<Promise<void>[]>((all,g,gi)=>[...all,...['front','back'].map(v=>atlas(units,'troops-'+g+'-'+v,5,4,Array.from({length:20},(_,i)=>'enemy-E'+('0'+(gi*20+i+1)).slice(-2)+'-'+v)))],[]),
 ]);
 for(const w of EXTRA_WEAPONS)frames['weapon-'+w.id]=frames['icon-'+w.id];
}
