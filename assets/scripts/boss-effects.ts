import {Color,Graphics,Node,Sprite,SpriteFrame,UITransform,Layers} from 'cc';
import {BossActor,BossHazard} from './boss-battle';
import {drawLightningSpell} from './enemy-spell-effects';

const shades=['#773e2b','#b46430','#f19b24','#ffd346','#fff4d0','#f15424','#b82a31','#713ba5','#b78ae7','#eee8ff','#283657','#9eb4e0','#b38a52','#e0ba7b'];
const colors=shades.map(hex=>Array.from({length:33},(_,i)=>{const c=new Color(hex);c.a=Math.round(i*255/32);return c;}));
const ink=(tone:number,a=1)=>colors[tone][Math.max(0,Math.min(32,Math.round(a*32)))];
const BOLT_POINTS=[[-18,250],[36,166],[6,167],[25,107],[1,111],[0,0],[-25,126],[-8,121],[-34,187],[-2,181]];
function thunderBody(air:Graphics,x:number,y:number,t:number):void {const fade=Math.max(0,1-t/.27);if(fade<=0)return;
 for(let layer=0;layer<3;layer++){air.fillColor=ink(layer===0?1:layer===1?3:4,fade);const scale=layer===0?1.08:layer===1?.84:.3;for(let i=0;i<BOLT_POINTS.length;i++){const p=BOLT_POINTS[i];if(!i)air.moveTo(x+p[0]*scale,y+p[1]);else air.lineTo(x+p[0]*scale,y+p[1]);}air.close();air.fill();}
 for(let side=-1;side<=1;side+=2){line(air,x+side*62,y+190,x+side*29,y+130,2,12,fade);line(air,x+side*29,y+130,x+side*41,y+133,3,9,fade);line(air,x+side*41,y+133,x,y+18,3,8,fade);line(air,x+side*41,y+133,x,y+18,4,3,fade);}
}
function line(g:Graphics,x:number,y:number,tx:number,ty:number,tone:number,width:number,alpha=1):void {g.strokeColor=ink(tone,alpha);g.lineWidth=width;g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();}
function diamond(g:Graphics,x:number,y:number,a:number,len:number,width:number,tone:number,alpha=1):void {const c=Math.cos(a),s=Math.sin(a);g.fillColor=ink(tone,alpha);g.moveTo(x-c*len*.2,y-s*len*.2);g.lineTo(x-s*width,y+c*width);g.lineTo(x+c*len,y+s*len);g.lineTo(x+s*width,y-c*width);g.close();g.fill();}
function dust(g:Graphics,x:number,y:number,r:number,clock:number,alpha:number):void {for(let i=0;i<8;i++){const a=i*Math.PI/4,t=(clock+i*.13)%1,d=r*(.6+t*.4);g.fillColor=ink(12,alpha*(1-t)*.6);g.ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d*.45,7+t*11,4+t*6);g.fill();}}
function boundary(g:Graphics,x:number,y:number,r:number,p:number,tone:number):void {g.fillColor=ink(tone,.07+p*.05);g.circle(x,y,r);g.fill();g.strokeColor=ink(tone,.65+p*.3);g.lineWidth=2.5;g.circle(x,y,r);g.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6;line(g,x+Math.cos(a)*(r-8),y+Math.sin(a)*(r-8),x+Math.cos(a)*r,y+Math.sin(a)*r,4,2,.3+p*.5);}diamond(g,x,y,Math.PI/2,9+12*p,3,tone);}
function impact(g:Graphics,x:number,y:number,r:number,t:number,tone:number):void {
 const fade=Math.max(0,1-t);for(let i=0;i<10;i++){const a=i*Math.PI/5,d=r*(.36+t*.65);diamond(g,x+Math.cos(a)*d,y+Math.sin(a)*d*.65+Math.sin(t*Math.PI)*20,a,12+8*(i%3),4,tone,fade);}
 g.strokeColor=ink(0,fade*.6);g.lineWidth=2;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;g.moveTo(x+Math.cos(a)*r*.16,y+Math.sin(a)*r*.16);g.lineTo(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65);g.lineTo(x+Math.cos(a+.14)*r*.83,y+Math.sin(a+.14)*r*.83);g.stroke();}
 dust(g,x,y,r,t,fade);
}
function fire(g:Graphics,x:number,y:number,r:number,t:number,alpha:number):void {
 g.fillColor=ink(0,alpha*.65);g.ellipse(x,y,r,r*.66);g.fill();g.fillColor=ink(6,alpha*.75);g.ellipse(x,y,r*.86,r*.55);g.fill();
 for(let i=0;i<8;i++){const a=i*2.4,d=(i%3)*r*.22,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.5,pulse=.75+Math.sin(t*13+i*2)*.23,h=36+22*pulse;
  g.fillColor=ink(5,alpha);g.moveTo(px-15,py);g.bezierCurveTo(px-29,py+18,px+9,py+h*.65,px-4,py+h);g.bezierCurveTo(px+25,py+h*.6,px+26,py+9,px+15,py);g.close();g.fill();
  g.fillColor=ink(3,alpha);g.moveTo(px-8,py);g.bezierCurveTo(px-14,py+10,px+10,py+h*.35,px+4,py+h*.65);g.bezierCurveTo(px+16,py+20,px+15,py+5,px+8,py);g.close();g.fill();
 }
}
interface Slot {sprite:Sprite;transform:UITransform;key:string;width:number;height:number;}
/** A bounded shared sprite pool plus the existing two Graphics layers, no per-effect Graphics. */
export class BossEffects {
 private slots:Slot[]=[];private used=0;
 constructor(private parent:Node,private frames:Record<string,SpriteFrame>){}
 private sprite(key:string,x:number,y:number,w:number,h:number,angle=0,alpha=1):void {
  const frame=this.frames[key];if(!frame||this.used>=86)return;let slot=this.slots[this.used++];
  if(!slot){const n=new Node('BossMaterial');n.layer=Layers.Enum.UI_2D;this.parent.addChild(n);const sp=n.addComponent(Sprite);sp.sizeMode=Sprite.SizeMode.CUSTOM;const transform=n.getComponent(UITransform)!;slot={sprite:sp,transform,key:'',width:0,height:0};this.slots.push(slot);}
  const sp=slot.sprite;sp.node.active=true;if(slot.key!==key){sp.spriteFrame=frame;slot.key=key;}if(slot.width!==w||slot.height!==h){slot.transform.setContentSize(w,h);slot.width=w;slot.height=h;}
  sp.node.setPosition(x,y);sp.node.angle=angle;
  sp.color=WHITE[Math.max(0,Math.min(32,Math.round(alpha*32)))];
 }
 draw(ground:Graphics,air:Graphics,hazards:readonly BossHazard[],actors:readonly BossActor[],cameraX:number,cameraY:number,halfWidth:number,halfHeight:number):void {
  this.used=0;
  for(const h of hazards){if(!h.active||Math.abs(h.x-cameraX)>halfWidth+360||Math.abs(h.y-cameraY)>halfHeight+360)continue;
   const elapsed=h.age-h.delay,warning=elapsed<0,p=Math.max(0,Math.min(1,h.age/Math.max(.001,h.delay))),t=Math.max(0,elapsed),fade=warning?1:Math.max(0,Math.min(1,(h.duration-t)/.2));
   if(h.kind==='lightning'){drawLightningSpell(ground,air,{x:h.x,y:h.y,radius:h.radius,age:h.age,delay:h.delay,fired:!warning});if(!warning)thunderBody(air,h.x,h.y,t);continue;}
   if(h.kind==='chain'&&h.nodes){const a=h.nodes[0],b=h.nodes[1];if(warning){line(ground,a.x,a.y+26,b.x,b.y+26,2,2,.3+p*.6);for(let i=0;i<2;i++)diamond(air,(i?a:b).x,(i?a:b).y+48,h.age*3,12+p*10,3,3);}
    else for(let layer=0;layer<3;layer++){air.strokeColor=ink(layer===0?2:layer===1?3:4,fade);air.lineWidth=layer===0?13:layer===1?7:2.5;for(let i=0;i<=14;i++){const f=i/14,bend=i===0||i===14?0:Math.sin(i*2.3+Math.floor(t*35))*(layer===0?10:7),x=a.x+(b.x-a.x)*f,y=a.y+26+(b.y-a.y)*f+bend;if(i===0)air.moveTo(x,y);else air.lineTo(x,y);}air.stroke();}continue;
   }
   if(['seal','wine','stone','meteor'].indexOf(h.kind)>=0){
    const violet=h.kind==='stone'||h.kind==='meteor';if(warning){boundary(ground,h.x,h.y,h.radius,p,violet?7:1);const lift=h.kind==='wine'?90*Math.sin(Math.min(1,h.age/(h.delay-.45))*Math.PI)+30:(1-p)*150+(h.kind==='seal'?85:40),size=h.kind==='seal'?190:h.kind==='wine'?65:90;
     if(violet){ground.strokeColor=ink(7,.3);ground.lineWidth=1.5;for(let i=-1;i<=1;i++){line(ground,h.x-100,h.y+i*90,h.x+100,h.y+i*90,7,1,.3);line(ground,h.x+i*90,h.y-100,h.x+i*90,h.y+100,7,1,.3);}}
     const key=h.kind==='seal'?0:h.kind==='wine'?2:h.kind==='meteor'?6:h.lane%2?5:4;
     if(h.kind==='wine'&&h.age>=h.delay-.45){ground.fillColor=ink(6,.7);ground.ellipse(h.x,h.y,h.radius*.8,h.radius*.5);ground.fill();for(let i=0;i<5;i++)diamond(ground,h.x+Math.cos(i*2.4)*45,h.y+Math.sin(i*2.4)*24,i,10,4,1,.8);}
     else this.sprite('boss-prop-'+key,h.x,h.y+lift,size,size,h.kind==='wine'?p*190:0,.5+p*.5);
     ground.fillColor=ink(0,.15+p*.2);ground.ellipse(h.x,h.y,size*.35*(.3+p*.7),size*.1);ground.fill();
     if(h.kind==='meteor')for(let i=0;i<3;i++)diamond(air,h.x-15+i*12,h.y+lift+30,Math.PI/2,30+p*30,7,i===1?3:7,.85);
    }else if(h.kind==='wine'){fire(air,h.x,h.y,h.radius,t,fade);if(t<.3)impact(ground,h.x,h.y,h.radius,t/.3,5);}
    else {if(h.kind==='seal')this.sprite('boss-prop-0',h.x,h.y+85-8*Math.sin(Math.min(1,t/.12)*Math.PI),190,190,0,fade);else if(h.kind==='stone')this.sprite('boss-prop-'+(h.lane%2?5:4),h.x,h.y+24,90,90,Math.sin(t*18)*5,fade);else this.sprite('boss-prop-6',h.x,h.y+24,90,90,0,fade);impact(ground,h.x,h.y,h.radius,Math.min(1,t/h.duration),violet?8:3);if(t<.2){const radius=h.radius*(.5+t*2);ground.strokeColor=ink(violet?8:3,(1-t/.2)*.9);ground.lineWidth=14*(1-t/.2);ground.circle(h.x,h.y,radius);ground.stroke();}}
   }else if(!warning){
    const a=h.angle,c=Math.cos(a),s=Math.sin(a),angle=a*180/Math.PI;
    if(h.kind==='coin'){this.sprite('boss-prop-1',h.x,h.y,78,78*(.75+.2*Math.sin(h.distance/27)),Math.sin(h.distance/30)*14,fade);dust(ground,h.x,h.y-27,25,h.age*2,.45*fade);for(let i=0;i<3;i++)diamond(air,h.x-c*(20+i*16),h.y-s*(20+i*16)-10,a+Math.PI,12,2,5,.5*fade);}
    else if(h.kind==='dragon'){const key=(h.lane<0?12:14)+Math.floor(h.age*7)%2;this.sprite('boss-prop-'+key,h.x-c*105,h.y-s*105,360,180,angle,fade);for(let i=0;i<4;i++){const back=145+i*28;diamond(air,h.x-c*back-s*Math.sin(t*8+i)*8,h.y-s*back+c*Math.sin(t*8+i)*8,a+Math.PI,30,4,h.lane<0?8:9,fade*.5);}}
    else if(h.kind==='blade'){
     // Substantial silver crescent with ink-blue back, not a glowing line/sector.
     for(let layer=0;layer<3;layer++){air.fillColor=ink(layer===0?10:layer===1?11:9,fade);const radius=58-layer*3,width=25-layer*7;for(let i=0;i<=24;i++){const b=a-Math.PI/2+Math.PI*i/24,x=h.x+Math.cos(b)*radius,y=h.y+Math.sin(b)*radius;if(i===0)air.moveTo(x,y);else air.lineTo(x,y);}for(let i=24;i>=0;i--){const b=a-Math.PI/2+Math.PI*i/24,r=radius-width*Math.sin(Math.PI*i/24);air.lineTo(h.x+Math.cos(b)*r,h.y+Math.sin(b)*r);}air.close();air.fill();}for(let i=0;i<3;i++)line(air,h.x-c*(10+i*17)-s*18,h.y-s*(10+i*17)+c*18,h.x-c*(23+i*17)-s*18,h.y-s*(23+i*17)+c*18,11,3,fade*.45);
    }else {const len=h.kind==='bolt'?72:44,w=h.kind==='bolt'?11:6;line(air,h.x-c*len*.5,h.y-s*len*.5,h.x+c*len*.2,h.y+s*len*.2,0,h.kind==='bolt'?7:3,fade);diamond(air,h.x+c*len*.2,h.y+s*len*.2,a,len*.35,w,9,fade);for(let i=-1;i<=1;i+=2)line(air,h.x-c*len*.5,h.y-s*len*.5,h.x-c*len*.68-s*i*6,h.y-s*len*.68+c*i*6,6,3,fade);}
   }
   if(h.contactLife>0)for(let i=0;i<7;i++)diamond(air,h.contactX,h.contactY,i*Math.PI*2/7,20+i%3*7,3,4,h.contactLife/.22);
  }
  for(const e of actors){if(e.hp<=0||Math.abs(e.x-cameraX)>halfWidth+220||Math.abs(e.y-cameraY)>halfHeight+220)continue;
   const u=e.bossUnit,s=e.bossState;
   if(u){ground.fillColor=ink(0,.16);ground.ellipse(e.x,e.y-4,u.kind==='elephant'?50:27,9);ground.fill();
    if(u.phase==='ready'||u.phase==='windup'){for(let i=0;i<2;i++)diamond(air,e.x+(i?18:-18),e.y+(u.kind==='elephant'?115:78),Math.PI/2+(i?.4:-.4),12,2,3,.7);}
    if(['boar','wolf','elephant','rider'].indexOf(u.kind)>=0&&(u.phase==='attack'||u.phase==='approach'))dust(ground,e.x-Math.cos(u.angle)*20,e.y-8,u.kind==='elephant'?45:25,u.gait*2,.65);
    if(u.kind==='sigil'){const p=Math.min(1,u.age/u.delay);for(let i=0;i<3;i++){const a=u.age*2+i*Math.PI*2/3;diamond(air,e.x+Math.cos(a)*30,e.y+40+Math.sin(a)*24,a+Math.PI/2,8+p*7,2,3,.8);}}
    if(u.kind==='cart'&&u.phase==='windup'){line(air,e.x-18,e.y+37,e.x+22,e.y+37,3,2,.4+.4*Math.sin(u.attackAge*8));}
   }else if(s){ground.fillColor=ink(0,.17);ground.ellipse(e.x,e.y-5,39,11);ground.fill();
    if(s.phase==='windup'){for(let i=0;i<3;i++){const a=e.attackAngle+(i-1)*.45;diamond(air,e.x+Math.cos(a)*45,e.y+95+Math.sin(a)*28,a,10+s.time*9,2,e.bossSkin==='simayi'?8:3,.8);}}
   }
  }
  for(let i=this.used;i<this.slots.length;i++)this.slots[i].sprite.node.active=false;
 }
 clear():void {for(const s of this.slots)s.sprite.node.active=false;}
 appendDepth(nodes:Node[]):void {for(const s of this.slots)if(s.sprite.node.active)nodes.push(s.sprite.node);}
 destroy():void {for(const s of this.slots)s.sprite.node.destroy();this.slots.length=0;}
}
const WHITE=Array.from({length:33},(_,i)=>new Color(255,255,255,Math.round(i*255/32)));
