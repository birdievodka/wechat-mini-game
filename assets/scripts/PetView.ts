import {Color,Graphics,Node,Sprite,SpriteFrame,UITransform} from 'cc';
import {PetRuntime,petFrameKey,petAvailable} from './pets';
import * as brush from './vfx-brush';
import {material} from './vfx-materials';
const palette=['#573a24','#a96935','#f2b35e','#fff0b5','#3a9866','#91df8b','#e38a32'].map(hex=>Array.from({length:17},(_,i)=>{const c=new Color(hex);c.a=i*255/16;return c;}));
const color=(i:number,a=1)=>palette[i][Math.max(0,Math.min(16,Math.round(a*16)))];
/** One Sprite, same atlas for idle/blink/trot/attack. No private Graphics/model. */
export class PetView {
 readonly sprite:Sprite;
 constructor(parent:Node,private frames:Record<string,SpriteFrame>){const n=new Node('HeroPet');n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(72,72);n.getComponent(UITransform)!.setAnchorPoint(.5,.08);this.sprite=n.addComponent(Sprite);this.sprite.sizeMode=Sprite.SizeMode.CUSTOM;n.active=false;}
 show(id:string,active:boolean,x:number,y:number,time:number,moving=false,gait=0,attackAge=-1,facing=1):void {
  const blink=time%3.4>3.22,pose=attackAge>=0?4:moving?(gait<.5?2:3):blink?1:0,frame=this.frames[petFrameKey(id,pose)],n=this.sprite.node;n.active=active&&!!frame;if(!n.active){this.sprite.spriteFrame=null;return;}
  if(this.sprite.spriteFrame!==frame)this.sprite.spriteFrame=frame;const jump=id==='zhangfei'&&attackAge>=.16&&attackAge<.42?Math.sin((attackAge-.16)/.26*Math.PI)*35:0,bob=id==='guanyu'?5+Math.sin(time*4)*2:moving?Math.abs(Math.sin(gait*Math.PI*2))*3:Math.sin(time*2)*.6;
  n.setPosition(x,y+bob+jump);n.setScale(facing*(1+Math.sin(time*2)*.008),1-Math.sin(time*2)*.008,1);n.angle=attackAge>=0?facing*(id==='guanyu'?-6:3)*Math.sin(Math.min(1,attackAge/.48)*Math.PI):Math.sin(time*1.3)*1.2;
 }
 showcase(id:string,growth:number,time:number,cry=false){this.show(id,petAvailable(id,growth),-75,-20,cry?3.3:time);}
 draw(s:PetRuntime){this.show(s.id,s.active,s.x,s.y,s.time,s.moving,s.gait,s.attackAge,s.facing);}
 clear(){this.sprite.node.active=false;this.sprite.spriteFrame=null;}
}
/** Pure shared-layer visuals, independent of attack/target decisions. */
export function drawPetEffects(ground:Graphics,air:Graphics,s:PetRuntime):void {
 if(!s.active)return;ground.fillColor=color(0,.16);ground.ellipse(s.x,s.y,22,6);ground.fill();
 for(const shot of s.shots)if(shot.active){brush.stream(air,shot.x,shot.y,shot.angle,28,4,'gold',.75);const c=Math.cos(shot.angle),n=Math.sin(shot.angle);air.strokeColor=color(2,.65);air.lineWidth=2;air.moveTo(shot.x-c*24,shot.y-n*24);air.lineTo(shot.x,shot.y);air.stroke();air.fillColor=color(1);air.strokeColor=color(0);air.lineWidth=1.5;air.ellipse(shot.x,shot.y,7,4.5);air.fill();air.stroke();air.strokeColor=color(2);air.moveTo(shot.x-3,shot.y);air.lineTo(shot.x+3,shot.y+1);air.stroke();}
 const t=s.effectAge;if(t>.3)return;const f=1-t/.3,x=s.effectX,y=s.effectY+20;
 if(s.id==='guanyu'){
  brush.blade(ground,air,x,y,s.effectAngle,165,140*Math.PI/180,t/.3,f,'jade',.8);material(air,'wave',x+Math.cos(s.effectAngle)*85,y+Math.sin(s.effectAngle)*85,115,85,s.effectAngle-Math.PI/2,f*.7);
 }else if(s.id==='zhangfei'){
  brush.shock(ground,air,x,s.effectY,70,t/.3,'crimson');brush.contact(air,x,y,s.effectAngle,28,t/.3,'gold');material(air,'stone',x,y,70,55,0,f*.6);
 }else brush.contact(air,x,y,s.effectAngle,20,t/.3,'gold');
}
