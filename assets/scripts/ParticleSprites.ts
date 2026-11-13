import {Color,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {CombatParticles,FX_LIMITS,ParticleShape} from './combat-particles';

const CELL=32,RADIUS=10;
const SHAPES:ParticleShape[]=['spark','petal','bean','dust','chip','star'];
const STAR=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,r=i%2?.24:1;return [Math.cos(a)*r,Math.sin(a)*r];});
function bezier(a:number,b:number,c:number,d:number,t:number):number{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;}
const PETAL:number[][]=[];
for(let i=0;i<=16;i++){const t=i/16;PETAL.push([bezier(-1,0,1.5,1,t),bezier(0,1,1,0,t)]);}
for(let i=1;i<=16;i++){const t=i/16;PETAL.push([bezier(1,1.5,0,-1,t),bezier(0,-1,-1,0,t)]);}
function insidePolygon(x:number,y:number,points:number[][]):boolean{
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;
}
/** Same procedural silhouettes as the Graphics particles. One 24KiB mask, built once, no image download. */
export function particleMasks():Uint8Array{
  const width=CELL*3,data=new Uint8Array(width*CELL*2*4);
  for(let tile=0;tile<SHAPES.length;tile++)for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++){
    let coverage=0;for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){
      const u=(x+(sx+.5)/4-CELL/2)/RADIUS,v=(CELL/2-y-(sy+.5)/4)/RADIUS;
      const hit=tile===0?Math.abs(u)<=1&&Math.abs(v)<=.2:tile===1?insidePolygon(u,v,PETAL):tile===2||tile===3?u*u+v*v<=1:insidePolygon(u,v,STAR);
      if(hit)coverage++;
    }
    const offset=(((Math.floor(tile/3)*CELL+y)*width)+(tile%3*CELL+x))*4;
    data[offset]=data[offset+1]=data[offset+2]=255;data[offset+3]=Math.round(coverage/16*255);
  }return data;
}
interface Slot {sprite:Sprite;color?:Color;frame?:SpriteFrame;}
/** Shared-texture quads replace per-frame path tessellation. Particle physics and budgets stay in CombatParticles. */
export class ParticleSprites {
  private texture:Texture2D;
  private frames:Record<string,SpriteFrame>={};
  private slots:(Slot|undefined)[]=Array(FX_LIMITS.particles);
  constructor(private parent:Node,private colorFor:(tone:number,alpha:number)=>Color){
    this.texture=new Texture2D();this.texture.reset({width:CELL*3,height:CELL*2});this.texture.uploadData(particleMasks());
    for(let i=0;i<SHAPES.length;i++){const f=new SpriteFrame();f.texture=this.texture;f.rect=new Rect(i%3*CELL,Math.floor(i/3)*CELL,CELL,CELL);this.frames[SHAPES[i]]=f;}
  }
  draw(pool:CombatParticles,cx:number,cy:number,hw:number,hh:number):void{
    for(let i=0;i<pool.slots.length;i++){
      const p=pool.slots[i];let slot=this.slots[i];
      if(p.life<=0||Math.abs(p.x-cx)>=hw+80||Math.abs(p.y-cy)>=hh+80){if(slot)slot.sprite.node.active=false;continue;}
      if(!slot){const n=new Node('FxParticle'+i);n.layer=this.parent.layer;this.parent.addChild(n);const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;n.getComponent(UITransform)!.setContentSize(CELL,CELL);slot=this.slots[i]={sprite};}
      const sprite=slot.sprite,n=sprite.node,frame=this.frames[p.shape],fade=Math.min(1,p.life/p.duration*1.6),size=p.size*(.45+.55*p.life/p.duration);
      n.active=true;if(slot.frame!==frame){sprite.spriteFrame=frame;slot.frame=frame;}
      let x=p.x,y=p.y,sx=size/RADIUS,sy=sx,angle=p.angle,alpha=fade*.88;
      if(p.shape==='spark'){
        const speed=Math.hypot(p.vx,p.vy),length=Math.min(17,3+speed*.035),width=Math.max(1,size*.6);
        angle=Math.atan2(p.vy,p.vx);x-=Math.cos(angle)*length*.5;y-=Math.sin(angle)*length*.5;sx=length/20;sy=width/4;alpha=fade;
      }else if(p.shape==='star'){sx*=1.5;sy*=1.5;alpha=fade;}
      else if(p.shape==='petal'||p.shape==='chip')alpha=fade;
      else if(p.shape==='dust'){sx*=1.4;alpha=fade*.22;angle=0;}
      else if(p.shape==='bean'){sy*=.7;angle=0;}
      n.setPosition(x,y);n.setScale(sx,sy,1);n.angle=angle*180/Math.PI;
      const color=this.colorFor(p.tone,alpha);if(slot.color!==color){sprite.color=color;slot.color=color;}
    }
  }
  clear():void {for(const slot of this.slots)if(slot)slot.sprite.node.active=false;}
  destroy():void {for(const slot of this.slots)if(slot){slot.sprite.spriteFrame=null;slot.sprite.node.removeFromParent();slot.sprite.node.destroy();}for(const key of Object.keys(this.frames))this.frames[key].destroy();this.texture.destroy();this.slots.length=0;}
}
