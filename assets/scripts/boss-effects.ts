import {Color,Graphics,Node,Sprite,SpriteFrame,UITransform,Layers} from 'cc';
import {BossActor,BossHazard,bossBeastCharging} from './boss-battle';
import {bossPropKeys} from './chronicle-art';
import {drawLightningSpell} from './enemy-spell-effects';
import {drawSkillArrow} from './skill-vfx-art';
import * as brush from './vfx-brush';
import {material,pixel} from './vfx-materials';

const shades=['#773e2b','#b46430','#f19b24','#ffd346','#fff4d0','#f15424','#b82a31','#713ba5','#b78ae7','#eee8ff','#283657','#9eb4e0','#b38a52','#e0ba7b'];
const colors=shades.map(hex=>Array.from({length:33},(_,i)=>{const c=new Color(hex);c.a=Math.round(i*255/32);return c;}));
const ink=(tone:number,a=1)=>colors[tone][Math.max(0,Math.min(32,Math.round(a*32)))];
const DIPPER=[[-96,36],[-66,20],[-28,23],[3,7],[39,30],[66,71],[23,70]];
const RAIN_POINTS=[[-.55,-.25],[.45,-.4],[-.12,.2],[.55,.25],[-.4,.45],[.03,-.55],[0,0]];
function line(g:Graphics,x:number,y:number,tx:number,ty:number,tone:number,width:number,alpha=1):void {g.strokeColor=ink(tone,alpha);g.lineWidth=width;g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();}
function diamond(g:Graphics,x:number,y:number,a:number,len:number,width:number,tone:number,alpha=1):void {const c=Math.cos(a),s=Math.sin(a);g.fillColor=ink(tone,alpha);g.moveTo(x-c*len*.2,y-s*len*.2);g.lineTo(x-s*width,y+c*width);g.lineTo(x+c*len,y+s*len);g.lineTo(x+s*width,y-c*width);g.close();g.fill();}
function dust(g:Graphics,x:number,y:number,r:number,clock:number,alpha:number):void {for(let i=0;i<8;i++){const a=i*Math.PI/4,t=(clock+i*.13)%1,d=r*(.6+t*.4);g.fillColor=ink(12,alpha*(1-t)*.6);g.ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d*.45,7+t*11,4+t*6);g.fill();}}
function boundary(g:Graphics,x:number,y:number,r:number,p:number,tone:number):void {brush.warning(g,x,y,r,p,tone===7?'violet':'crimson');}

function firePool(ground:Graphics,air:Graphics,x:number,y:number,r:number,t:number,f:number):void {
 brush.fireCrown(ground,air,x,y,r,t,f);
 pixel(ground,'fireRing',x,y,r*2,0,f*.77,(t*3)%1,1);
 pixel(air,'whorl',x,y,r*.98,0,f*.86,(t*4)%1,1);
 // A low ember rim remains visible behind the taller rolling flames.
 for(let i=0;i<4;i++)brush.crescent(ground,x,y,r*.96,i*Math.PI*.5+t*.24,1.02,3,'gold',f*.74);
}

/** The charge stays around the animal. Each species has a recognisable moving silhouette. */
function beastWake(ground:Graphics,air:Graphics,e:BossActor):void {
 const u=e.bossUnit!,a=u.angle,c=Math.cos(a),s=Math.sin(a);
 const height=u.kind==='elephant'?55:35,px=e.x+c*28,py=e.y+height+s*28;
 pixel(ground,u.kind==='wolf'?'claw':'dirt',e.x-c*35,e.y-s*35,94,0,.69,(u.gait*2)%1);
 const length=Math.min(1,u.attackAge/.22)*(u.kind==='elephant'?132:u.kind==='wolf'?97:82);
 brush.chargeWake(ground,e.x,e.y+9,a,length,u.kind==='elephant'?38:23,u.kind==='wolf'?'jade':'earth',.87);
 if(u.kind==='elephant'){
  const step=(u.gait*2)%1;
  for(let side=-1;side<=1;side+=2){
   brush.crescent(ground,e.x-s*side*27,e.y+c*side*19,12+27*step,a+side*1.5,1.15,6*(1-step),'earth',1-step);
   brush.nib(air,px-s*side*24,py+c*side*24,a+side*.21,44,8,'gold',.95);
  }
 }else if(u.kind==='wolf'){
  for(let i=-1;i<=1;i++)brush.nib(air,px-s*i*10,py+c*i*10,a+i*.09,51-Math.abs(i)*9,4,'jade',.92);
 }else{
  for(let side=-1;side<=1;side+=2)brush.crescent(air,px,py,32,a+side*.63,1.18,9,'crimson',.98);
 }
}

/** Local tells stay near hands, hooves or grimoire; the hazard owns its ground warning. */
function castTell(g:Graphics,e:BossActor):void {
 const s=e.bossState!,p=Math.min(1,s.time/Math.max(.01,e.bossMove?.windup||1)),a=e.attackAngle;
 const c=Math.cos(a),d=Math.sin(a),x=e.x+c*48,y=e.y+66+d*23,alpha=.43+.54*p;
 switch(e.bossSkin){
 case 'zhangjiao':
  for(let i=0;i<3;i++){
   const b=i*Math.PI*2/3+p*1.3,dist=28-13*p;
   brush.nib(g,x+Math.cos(b)*dist,y+Math.sin(b)*dist,b+.8,17,5,'gold',alpha);
  }break;
 case 'dongzhuo':
  for(let i=0;i<4;i++)brush.crescent(g,x,y,15+6*p,i*Math.PI/2+p*.4,1.05,5,'gold',alpha);
  brush.nib(g,x,y,a,17,8,'crimson',alpha);break;
 case 'yuanshao':
  for(let i=-1;i<=1;i++)brush.nib(g,x-c*12-d*i*10,y-d*12+c*i*10,a+i*.16,16+12*p,3,'gold',alpha);
  break;
 case 'caocao':
  brush.nib(g,x,y,a+.67,36+17*p,6,'silver',alpha);
  brush.nib(g,x-c*19,y-d*19,a+.91,24,4,'violet',alpha*.8);break;
 case 'menghuo':
  for(let i=0;i<3;i++)brush.crescent(g,e.x,e.y+8,18+20*p,a+(i-1)*1.6,1.02,7,'earth',alpha);
  break;
 case 'simayi':
  pixel(g,'purpleRune',e.x,e.y+28,115,0,alpha*.93,p,1);
  pixel(g,s.index===2?'spirit':'charge',x,y,86,0,alpha*.86,p,1);
  for(let i=-1;i<=1;i++){
   const shift=i*(24-10*p);
   g.fillColor=ink(i===0?10:9,alpha);g.ellipse(x+shift,y+7*Math.sin(s.time*5+i),7,6);g.fill();
   brush.nib(g,x+shift-2,y+3+7*Math.sin(s.time*5+i),.65,6,2,'violet',alpha);
  }break;
 }
}

interface Slot {sprite:Sprite;transform:UITransform;key:string;width:number;height:number;}
/** A bounded shared sprite pool plus the existing two Graphics layers, no per-effect Graphics. */
export class BossEffects {
 private slots:Slot[]=[];private used=0;
 constructor(private parent:Node,private frames:Record<string,SpriteFrame>){}
 private sprite(key:string,x:number,y:number,w:number,h:number,angle=0,alpha=1):void {
  const frame=this.frames[key];if(!frame||this.used>=86)return;let slot=this.slots[this.used++];
  if(!slot){const n=new Node('BossMaterial');n.layer=Layers.Enum.UI_2D;this.parent.addChild(n);const sp=n.addComponent(Sprite);sp.trim=false;sp.sizeMode=Sprite.SizeMode.CUSTOM;const transform=n.getComponent(UITransform)!;slot={sprite:sp,transform,key:'',width:0,height:0};this.slots.push(slot);}
  const sp=slot.sprite;sp.node.active=true;if(slot.key!==key||sp.spriteFrame!==frame){sp.spriteFrame=frame;slot.key=key;}if(slot.width!==w||slot.height!==h){slot.transform.setContentSize(w,h);slot.width=w;slot.height=h;}
  sp.node.setPosition(x,y);sp.node.angle=angle;
  sp.color=WHITE[Math.max(0,Math.min(32,Math.round(alpha*32)))];
 }
 draw(ground:Graphics,air:Graphics,hazards:readonly BossHazard[],actors:readonly BossActor[],cameraX:number,cameraY:number,halfWidth:number,halfHeight:number):void {
  this.used=0;
  for(const h of hazards){if(!h.active||h.lockAt!==undefined&&h.age<h.lockAt||Math.abs(h.x-cameraX)>halfWidth+360||Math.abs(h.y-cameraY)>halfHeight+360)continue;
   const elapsed=h.age-h.delay,warning=elapsed<0,p=Math.max(0,Math.min(1,h.age/Math.max(.001,h.delay))),t=Math.max(0,elapsed),fade=warning?1:Math.max(0,Math.min(1,(h.duration-t)/.2));
   if(h.contactLife>0){
    const f=Math.min(1,h.contactLife/.22);
    brush.nib(air,h.contactX,h.contactY,h.angle+.71,37*f,7*f,'crimson',f);
    brush.nib(air,h.contactX,h.contactY,h.angle-.68,24*f,4*f,'gold',f);
   }
   if(h.kind==='lightning'){if(warning)pixel(air,'cloud',h.x,h.y+145,h.radius*1.85,0,p*.85,p,1);drawLightningSpell(ground,air,{x:h.x,y:h.y,radius:h.radius,age:h.age,delay:h.delay,fired:!warning});if(!warning&&t<.40)brush.groundStrike(ground,air,h.x,h.y,h.radius,t/.40,'gold',h.lane*.7);continue;}
   if(h.kind==='chain'&&h.nodes){const a=h.nodes[0],b=h.nodes[1];if(warning){line(ground,a.x,a.y+26,b.x,b.y+26,2,2,.3+p*.6);for(let i=0;i<2;i++)diamond(air,(i?a:b).x,(i?a:b).y+48,h.age*3,12+p*10,3,3);}
    else for(let layer=0;layer<3;layer++){air.strokeColor=ink(layer===0?2:layer===1?3:4,fade);air.lineWidth=layer===0?13:layer===1?7:2.5;for(let i=0;i<=14;i++){const f=i/14,bend=i===0||i===14?0:Math.sin(i*2.3+Math.floor(t*35))*(layer===0?10:7),x=a.x+(b.x-a.x)*f,y=a.y+26+(b.y-a.y)*f+bend;if(i===0)air.moveTo(x,y);else air.lineTo(x,y);}air.stroke();}
    if(!warning){
     const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
     const k=.43+.08*Math.sin(t*25);
     pixel(air,'wind',a.x+dx*k,a.y+26+dy*k,len*.38,Math.atan2(dy,dx),fade*.88,t/h.duration,1);
     for(let side=-1;side<=1;side+=2){
      const bx=a.x+dx*k,by=a.y+26+dy*k;
      brush.current(air,bx,by,bx+dx*.12-dy/len*side*22,by+dy*.12+dx/len*side*22,side*5,4,'gold',fade);
     }
     const at=Math.min(1,t/h.duration),px=a.x+(b.x-a.x)*at,py=a.y+26+(b.y-a.y)*at;
     brush.nib(air,px,py,Math.atan2(b.y-a.y,b.x-a.x),31,7,'gold',fade);}
    continue;
   }
   if(h.kind==='rain'){
    if(warning)boundary(ground,h.x,h.y,h.radius,p,2);
    // One volley per real hazard. Rear shafts read as a curtain, front arrows retain their fletching.
    const descent=warning?Math.max(0,1+elapsed/.46):1,lift=188*(1-descent*descent);
    const strength=warning?descent:Math.max(0,1-t/.38),slope=h.lane%2?.43:-.43;
    if(strength>.02){
     const angle=Math.atan2(-1,slope);
     for(let i=0;i<RAIN_POINTS.length;i++){
      const q=RAIN_POINTS[i],xx=h.x+q[0]*h.radius,yy=h.y+q[1]*h.radius;
      const ax=xx-slope*lift,ay=yy+lift;
      if(warning){
       brush.current(ground,ax-60*slope,ay+60,ax,ay,2,4,'gold',strength);
       // Place the rear rank deeper inside the same circle.
       brush.current(ground,h.x+(ax-h.x)*.82-31*slope,h.y+(ay-h.y)*.82+39,h.x+(ax-h.x)*.82,h.y+(ay-h.y)*.82+8,1,2.4,'earth',strength);
      }
      drawSkillArrow(warning?air:ground,ax,ay+9,angle,strength,i%2?.68:.86);
      if(!warning&&i%2===0){
       brush.crescent(ground,xx,yy,7+34*t,angle+.8,1.2,4*strength,'earth',strength);
       pixel(air,'hit',xx,yy,40,angle,strength,t/.38);
      }
     }
    }
    continue;
   }
   if(h.kind==='sword-field'){
    for(let side=0;side<2;side++){
     if(h.sides&&(h.sides[side]?.hp||0)<=0)continue;
     const spin=h.angle+(1-side)*Math.PI;
     if(warning){
      ground.fillColor=ink(6,.065+p*.11);
      ground.moveTo(h.x,h.y);
      for(let i=0;i<=12;i++){
       const a=spin+i*Math.PI/12;ground.lineTo(h.x+Math.cos(a)*h.radius,h.y+Math.sin(a)*h.radius);
      }
      ground.close();ground.fill();
      for(let i=0;i<4;i++){
       const a=spin+i*Math.PI/4+.15;
       brush.crescent(ground,h.x,h.y,h.radius,a,.52,2.8,'crimson',p*.89);
      }
     }else{
      const f=Math.max(0,1-t/.45);
      for(let i=0;i<4;i++){
       const a=spin+(i+.55)*Math.PI/4,r=h.radius*(.63+.17*t),x=h.x+Math.cos(a)*r,y=h.y+Math.sin(a)*r;
       diamond(air,x,y,a+Math.PI,68,11,10,f);diamond(air,x,y,a+Math.PI,59,6,11,f);
       if(i%2===0)pixel(air,'hit',x,y,62,a,f*.88,t/.45,1);
      }
      brush.crescent(ground,h.x,h.y,h.radius*(.3+.7*t/.45),spin+Math.PI/2,3,11*f,'silver',f);
     }
    }
    continue;
   }
   if(h.kind==='seal'||h.kind==='wine'||h.kind==='stone'||h.kind==='meteor'){
    const violet=h.kind==='stone'||h.kind==='meteor';if(warning){boundary(ground,h.x,h.y,h.radius,p,violet?7:1);const lift=h.kind==='wine'?90*Math.sin(Math.min(1,h.age/(h.delay-.45))*Math.PI)+30:(1-p*p)*153+(h.kind==='seal'?62:30),size=h.kind==='seal'?150:h.kind==='wine'?63:h.kind==='stone'?66:57;
     if(violet)pixel(ground,h.lane%2?'rune':'purpleRune',h.x,h.y,h.radius*1.7,0,p*.91,p,1);
     if(h.kind==='meteor')brush.stream(air,h.x,h.y+lift+6,-1.36,65+34*p,13,'violet',.94);
     const key=h.kind==='seal'?0:h.kind==='wine'?2:h.kind==='meteor'?6:h.lane%2?5:4;
     if(h.kind==='stone'){
      const reach=h.radius*.84;
      for(let i=0;i<4;i++){
       const a=Math.PI*i/2,c=Math.cos(a),d=Math.sin(a),inward=reach*(1-p);
       brush.current(ground,h.x+c*reach,h.y+d*reach,h.x+c*inward,h.y+d*inward,0,4+p*2,'violet',p*.9);
      }
      brush.stream(air,h.x,h.y+lift,Math.PI/-2,60+p*55,11,h.lane%2?'silver':'violet',p*.7);}
     if(h.kind==='wine'&&h.age>=h.delay-.45){ground.fillColor=ink(6,.7);ground.ellipse(h.x,h.y,h.radius*.8,h.radius*.5);ground.fill();for(let i=0;i<5;i++)diamond(ground,h.x+Math.cos(i*2.4)*45,h.y+Math.sin(i*2.4)*24,i,10,4,1,.8);}
     else this.sprite(bossPropKeys[key],h.x,h.y+lift,size,size,h.kind==='wine'?p*190:0,.5+p*.5);
     ground.fillColor=ink(0,.15+p*.2);ground.ellipse(h.x,h.y,size*.35*(.3+p*.7),size*.1);ground.fill();
     if(h.kind==='meteor')for(let i=0;i<3;i++)diamond(air,h.x-15+i*12,h.y+lift+30,Math.PI/2,30+p*30,7,i===1?3:7,.85);
    }else if(h.kind==='wine'){firePool(ground,air,h.x,h.y,h.radius,t,fade);if(t<.36){brush.groundStrike(ground,air,h.x,h.y,h.radius,t/.36,'crimson',h.lane);pixel(air,'dirt',h.x,h.y,h.radius*1.9,0,1-t/.36,t/.36,1);}}
    else {if(h.kind==='seal')this.sprite('boss-prop-0',h.x,h.y+58-8*Math.sin(Math.min(1,t/.12)*Math.PI),150,150,0,fade);else if(h.kind==='stone')this.sprite(bossPropKeys[h.lane%2?5:4],h.x,h.y+21,66,66,Math.sin(t*18)*5,fade);else this.sprite('boss-prop-6',h.x,h.y+18,57,57,0,fade);const at=Math.min(1,t/h.duration);
     brush.groundStrike(ground,air,h.x,h.y,h.radius,at,violet?'violet':'gold',h.lane*.54);
     if(h.kind==='meteor')pixel(air,'meteor',h.x,h.y,h.radius*2.2,0,fade,at,1);
     else if(h.kind==='stone'){
      pixel(air,h.lane%2?'burst':'spirit',h.x,h.y,129,0,fade,at,1);
      const beam=1-Math.min(1,t/.30);
      brush.stream(air,h.x,h.y+160,Math.PI/2,159,24*beam,h.lane%2?'jade':'violet',beam*.92);
     }
     if(h.kind==='seal'){
      pixel(air,'dirt',h.x,h.y,h.radius*1.74,0,fade,at,1);
      for(let i=0;i<4;i++){
       const a=Math.PI*.25+i*Math.PI*.5,c=Math.cos(a),d=Math.sin(a),reach=h.radius*(.25+.67*Math.min(1,at*1.6));
       brush.current(ground,h.x+c*23,h.y+d*23,h.x+c*reach,h.y+d*reach,7,9*(1-at),'earth',1-at);
      }
      const edge=h.radius*(.24+.39*at),f=1-at;
      for(let side=-1;side<=1;side+=2){
       line(ground,h.x-edge,h.y+side*edge,h.x+edge,h.y+side*edge,5,3,f);
       line(ground,h.x+side*edge,h.y-edge,h.x+side*edge,h.y+edge,5,3,f);
      }
     }else if(h.kind==='stone'){
      for(let axis=0;axis<4;axis++){const a=axis*Math.PI/2;brush.nib(ground,h.x+Math.cos(a)*h.radius*at,h.y+Math.sin(a)*h.radius*at,a,30,4,'silver',1-at);}
     }
    }
   }else if(warning){
    const c=Math.cos(h.angle),s=Math.sin(h.angle);
    if(h.kind==='dragon')pixel(air,h.lane<0?'portal':'jadePortal',h.x,h.y-28,158,0,p*.94,p,1);
    else if(h.kind==='arrow'||h.kind==='bolt'||h.kind==='blade')diamond(air,h.x+c*32,h.y+s*32,h.angle,18+p*16,h.kind==='blade'?7:4,h.kind==='blade'?11:3,p*.7);
   }else if(!warning){
    const a=h.angle,c=Math.cos(a),s=Math.sin(a),angle=a*180/Math.PI;
    if(h.kind==='coin'){pixel(air,'smoke',h.x-c*22,h.y-s*22,65,0,fade*.69,(t*4)%1);this.sprite('boss-prop-1',h.x,h.y,78,78*(.75+.2*Math.sin(h.distance/27)),Math.sin(h.distance/30)*14,fade);const spin=h.distance/27;brush.crescent(air,h.x,h.y,32,spin,.97,4,'gold',fade);brush.nib(ground,h.x-c*12,h.y-29-s*12,a,29,4,'earth',fade);for(let i=0;i<3;i++)diamond(air,h.x-c*(20+i*16),h.y-s*(20+i*16)-10,a+Math.PI,12,2,5,.5*fade);}
    else if(h.kind==='dragon'){
     pixel(air,h.lane<0?'spirit':'burst',h.x-c*22,h.y-s*22,95,0,fade*.80,(t*5)%1,1);
     if(t<.42)pixel(air,h.lane<0?'portal':'jadePortal',h.originX,h.originY-25,158,0,1-t/.42,t/.42,1);
     const coil=Math.sin(h.distance/52),side=h.lane<0?-1:1;
     brush.current(ground,h.x-c*178,h.y-s*178,h.x-c*60-s*side*16,h.y-s*60+c*side*16,coil*27,13,h.lane<0?'violet':'silver',fade*.86);
     brush.stream(air,h.x,h.y,h.angle,170,22,h.lane<0?'violet':'silver',fade*.8);for(let i=0;i<3;i++){const off=Math.sin(t*8+i)*12,d=40+i*46;brush.crescent(ground,h.x-c*d-s*off,h.y-s*d+c*off,26+i*3,a+1.2+i*.48,.96,5,h.lane<0?'violet':'silver',fade*.86);}const key=(h.lane<0?12:14)+Math.floor(h.age*7)%2;this.sprite(bossPropKeys[key],h.x-c*105,h.y-s*105,360,180,angle,fade);for(let i=0;i<4;i++){const back=145+i*28;diamond(air,h.x-c*back-s*Math.sin(t*8+i)*8,h.y-s*back+c*Math.sin(t*8+i)*8,a+Math.PI,30,4,h.lane<0?8:9,fade*.5);}}
    else if(h.kind==='blade'){
     const rad=h.radius+20;
     for(let side=-1;side<=1;side+=2){
      const sideAngle=a+side*.59;
      brush.crescent(air,h.x,h.y,rad,sideAngle,1.20,20,'silver',fade,0);
      brush.crescent(air,h.x,h.y,rad-1,sideAngle,1.18,14,'silver',fade);
      brush.crescent(air,h.x,h.y,rad,sideAngle,1.12,3,'silver',fade,2);
     }
    }else {
     const bolt=h.kind==='bolt';
     pixel(air,bolt?'arrowGold':h.source.bossMove?.name==='四世箭阵'?'arrowRed':'arrowWhite',h.x+c*17,h.y+s*17,bolt?132:74,a,fade,0,1);
     brush.nib(air,h.x-c*18,h.y-s*18,a,h.kind==='bolt'?62:30,h.kind==='bolt'?8:3,'gold',fade*.88);const len=h.kind==='bolt'?72:44,w=h.kind==='bolt'?11:6;line(air,h.x-c*len*.5,h.y-s*len*.5,h.x+c*len*.2,h.y+s*len*.2,0,h.kind==='bolt'?7:3,fade);diamond(air,h.x+c*len*.2,h.y+s*len*.2,a,len*.35,w,9,fade);for(let i=-1;i<=1;i+=2)line(air,h.x-c*len*.5,h.y-s*len*.5,h.x-c*len*.68-s*i*6,h.y-s*len*.68+c*i*6,6,3,fade);}
   }
  }
  for(const e of actors){if(e.hp<=0||Math.abs(e.x-cameraX)>halfWidth+220||Math.abs(e.y-cameraY)>halfHeight+220)continue;
   const u=e.bossUnit,s=e.bossState;
   if(u){ground.fillColor=ink(0,.16);ground.ellipse(e.x,e.y-4,u.kind==='elephant'?50:27,9);ground.fill();
    if(bossBeastCharging(e)){
     beastWake(ground,air,e);
     const radius=u.kind==='elephant'?85:57,y=e.y+(u.kind==='elephant'?55:35),c=Math.cos(u.angle),s=Math.sin(u.angle);
     air.strokeColor=ink(3,.95);air.lineWidth=4;for(let i=0;i<=16;i++){const a=u.angle-Math.PI*.55+Math.PI*1.1*i/16,x=e.x+Math.cos(a)*radius,py=y+Math.sin(a)*radius*.7;if(i===0)air.moveTo(x,py);else air.lineTo(x,py);}air.stroke();
     for(let i=-1;i<=1;i++)line(air,e.x-c*radius-s*i*18,y-s*radius+c*i*18,e.x-c*(radius+55)-s*i*18,y-s*(radius+55)+c*i*18,3,i===0?4:2,.65);
     diamond(air,e.x,y+radius*.85,Math.PI/2,17,10,3);diamond(air,e.x,y+radius*.85,Math.PI/2,11,5,4);
    }
    if(u.phase==='ready'||u.phase==='windup'){for(let i=0;i<2;i++)diamond(air,e.x+(i?18:-18),e.y+(u.kind==='elephant'?115:78),Math.PI/2+(i?.4:-.4),12,2,3,.7);}
    if(['boar','wolf','elephant','rider'].indexOf(u.kind)>=0&&(u.phase==='attack'||u.phase==='approach'))dust(ground,e.x-Math.cos(u.angle)*20,e.y-8,u.kind==='elephant'?45:25,u.gait*2,.65);
    if(u.kind==='sigil'){const p=Math.min(1,u.age/u.delay);material(air,'impact',e.x,e.y+40,40+20*p,60+15*p,u.age,.55,1);for(let i=0;i<3;i++){const a=u.age*2+i*Math.PI*2/3;diamond(air,e.x+Math.cos(a)*30,e.y+40+Math.sin(a)*24,a+Math.PI/2,8+p*7,2,3,.8);}}
    if(u.kind==='bowman'&&u.phase==='attack'&&u.locked){
     const a=u.angle+(u.round===1?.25:u.round===2?-.25:0);
     brush.nib(air,e.x+Math.cos(a)*29,e.y+30+Math.sin(a)*29,a,30,5,'gold',Math.max(0,1-(u.attackAge-.7)/.18));
    }
    if(u.kind==='decoy'&&u.phase==='windup')pixel(air,'ash',e.x,e.y+26,75,0,.55,u.attackAge);
    if(u.kind==='bowman'&&u.phase==='windup'&&u.age-u.delay<(u.owner.bossMove?.name==='万军齐射'?3:2)*1.3){
     const a=u.angle+(Math.floor((u.age-u.delay)/1.3)===1?.25:Math.floor((u.age-u.delay)/1.3)===2?-.25:0),c=Math.cos(a),s=Math.sin(a),pull=Math.min(1,u.attackAge/.7);
     for(let side=-1;side<=1;side+=2){
      const x=e.x+c*20-s*side*20,y=e.y+30+s*20+c*side*20;
      brush.current(air,x,y,e.x+c*34,e.y+30+s*34,-side*7,4,'earth',.85);
      brush.stroke(air,x,y,e.x+c*(21-16*pull),e.y+30+s*(21-16*pull),1.6,'gold',.95);
     }
    }
    if(u.kind==='decoy'&&u.phase==='windup')brush.crescent(air,e.x,e.y+43,27,u.angle+u.attackAge,1.18,6,'silver',.8);
    if(u.kind==='rider'&&u.phase==='attack')brush.chargeWake(ground,e.x,e.y+10,u.angle,105*Math.min(1,u.attackAge/.18),28,'silver',.84);
    if(u.kind==='rider'&&u.phase==='attack')brush.nib(air,e.x+Math.cos(u.angle)*40,e.y+60+Math.sin(u.angle)*40,u.angle,51,8,'silver',.92);
    if(u.kind==='cart'&&u.phase==='windup'){for(let side=-1;side<=1;side+=2){const c=Math.cos(u.angle),s=Math.sin(u.angle);brush.stroke(air,e.x-s*side*20,e.y+36+c*side*20,e.x-c*18*u.attackAge,e.y+36-s*18*u.attackAge,2,'gold',.8);}}
   }else if(e.miniBoss&&e.archetype==='E40'&&e.attack>=0){
    material(air,'ink',e.x,e.y+75,100,48,e.attack*.4,.55,1);
    for(let i=-1;i<=1;i++){line(ground,e.x-60,e.y+i*36,e.x+60,e.y+i*36,7,1,.4);line(ground,e.x+i*36,e.y-60,e.x+i*36,e.y+60,7,1,.4);}
    for(let i=0;i<3;i++)diamond(air,e.x+(i-1)*28,e.y+82+Math.sin(e.attack*7+i)*5,Math.PI/2,14,7,i%2?9:8,.85);
   }else if(s){ground.fillColor=ink(0,.17);ground.ellipse(e.x,e.y-5,39,11);ground.fill();
    if(s.phase==='windup')castTell(air,e);
    if(e.bossSkin==='simayi'&&s.index===2&&(s.phase==='windup'||s.phase==='cast')){
     const anchor=hazards.find(h=>h.active&&h.source===e&&h.kind==='meteor'&&h.lane===0);
     if(anchor){
      const x=anchor.x-24,y=anchor.y+166;
      const light=Math.min(1,anchor.age/.45)*Math.max(0,1-(anchor.age-anchor.delay)/.6);
      for(let i=0;i<DIPPER.length;i++){
       const [dx,dy]=DIPPER[i],fade=light*Math.min(1,Math.max(0,anchor.age*3-i*.13));
       if(fade<=0)continue;
       if(i>0){const [lx,ly]=DIPPER[i-1];line(air,x+lx,y+ly,x+dx,y+dy,8,1.2,fade*.52);}
       diamond(air,x+dx,y+dy,Math.PI/4,i===3?7:5,3,3,fade);
      }
      brush.crescent(ground,anchor.x,anchor.y,anchor.radius*.83,s.time*2,.54,3,'violet',light*.68);
     }
    }
   }
  }
  for(let i=this.used;i<this.slots.length;i++)this.slots[i].sprite.node.active=false;
 }
 detach(removed:Set<SpriteFrame>):void {
  for(const {sprite} of this.slots)if(sprite.spriteFrame&&removed.has(sprite.spriteFrame)){sprite.node.active=false;sprite.spriteFrame=null;}
 }
 clear():void {for(const s of this.slots)s.sprite.node.active=false;}
 appendDepth(nodes:Node[]):void {for(const s of this.slots)if(s.sprite.node.active)nodes.push(s.sprite.node);}
 destroy():void {for(const s of this.slots)s.sprite.node.destroy();this.slots.length=0;}
}
const WHITE=Array.from({length:33},(_,i)=>new Color(255,255,255,Math.round(i*255/32)));
