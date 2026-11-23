import {Color,Graphics,Node,Sprite,SpriteFrame,UITransform} from 'cc';

/** One authored 1024² RGBA texture. Ordinary/priority quotas share a fixed 96-quad ceiling. */
export const VFX_MATERIAL_LIMIT=96;
export const VFX_MATERIAL_KEYS=['gold','jade','silver','crimson','flame','wave','lightning','impact','dust','petals','wind','ink','meteor','guard','heal','stone'] as const;
export type VfxMaterial=typeof VFX_MATERIAL_KEYS[number];
const FRAME_KEYS={} as Record<VfxMaterial,string>;for(const key of VFX_MATERIAL_KEYS)FRAME_KEYS[key]='vfx-'+key;
const WHITE=Array.from({length:33},(_,i)=>new Color(255,255,255,Math.round(i*255/32)));
interface Quad {sprite:Sprite;ui:UITransform;key:string;width:number;height:number;alpha:number;}
interface Layer {g:Graphics;slots:Quad[];used:number;}
const registry=new WeakMap<Graphics,{owner:VfxMaterials;layer:Layer}>();
/** Render submissions are decoration only: no simulation clock, RNG, damage, loading or Canvas. */
export function material(g:Graphics,key:VfxMaterial,x:number,y:number,width:number,height:number,angle=0,alpha=1,priority=0):boolean {
 const entry=registry.get(g);return !!entry&&entry.owner.submit(entry.layer,key,x,y,width,height,angle,alpha,priority);
}
export class VfxMaterials {
 private layers:Layer[]=[];private used=0;private ordinary=0;private disposed=false;
 constructor(private frames:Record<string,SpriteFrame>,graphics:Graphics[]){for(const g of graphics){const layer={g,slots:[],used:0};this.layers.push(layer);registry.set(g,{owner:this,layer});}}
 begin():void {this.used=this.ordinary=0;for(const l of this.layers)l.used=0;}
 submit(l:Layer,key:VfxMaterial,x:number,y:number,w:number,h:number,angle:number,alpha:number,priority:number):boolean {
  const frame=this.frames[FRAME_KEYS[key]];if(this.disposed||!frame||alpha<.025||w<=0||h<=0||!Number.isFinite(x+y+w+h+angle+alpha)||this.used>=VFX_MATERIAL_LIMIT||(!priority&&this.ordinary>=64))return false;
  // Stable per-layer allocation quotas prevent moving bursts between layers growing an unbounded union.
  const quota=l===this.layers[0]?28:l===this.layers[1]?4:l===this.layers[2]?32:32;
  if(l.used>=quota)return false;
  this.used++;if(!priority)this.ordinary++;
  let q=l.slots[l.used++];
  if(!q){const n=new Node('VfxMaterial');n.layer=l.g.node.layer;l.g.node.addChild(n);const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;const ui=n.getComponent(UITransform)!;q={sprite,ui,key:'',width:0,height:0,alpha:-1};l.slots.push(q);}
  q.sprite.node.active=true;if(q.key!==key||q.sprite.spriteFrame!==frame){q.sprite.spriteFrame=frame;q.key=key;}
  if(q.width!==w||q.height!==h){q.ui.setContentSize(w,h);q.width=w;q.height=h;}
  const a=Math.max(0,Math.min(32,Math.round(alpha*32)));if(q.alpha!==a){q.sprite.color=WHITE[a];q.alpha=a;}
  q.sprite.node.setPosition(x,y);q.sprite.node.angle=angle*180/Math.PI;return true;
 }
 end():void {for(const l of this.layers)for(let i=l.used;i<l.slots.length;i++)l.slots[i].sprite.node.active=false;}
 clear():void {this.begin();this.end();}
 get count():number {return this.used;}
 get allocated():number {let n=0;for(const l of this.layers)n+=l.slots.length;return n;}
 destroy():void {this.disposed=true;for(const l of this.layers){registry.delete(l.g);for(const q of l.slots){q.sprite.spriteFrame=null;q.sprite.node.removeFromParent();q.sprite.node.destroy();}l.slots.length=0;}this.layers.length=0;}
}
