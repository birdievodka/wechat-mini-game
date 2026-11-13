import {Graphics} from 'cc';
import {effectInk as ink} from './combat-effects';

// Shared immutable outlines. Drawing is synchronous/read-only; no nodes, RNG or timers here.
const TAU=Math.PI*2;
type Shape=readonly number[];
const SHIELD:Shape=[-19,28,19,28,22,0,0,-28,-22,0];
const DIAMOND:Shape=[0,25,-20,4,-13,-21,9,-28,22,2];
const HEX:Shape=[-18,0,-9,16,9,16,18,0,9,-16,-9,-16];
const CLOAK:Shape=[-12,60,-23,51,-46,43,-39,18,-23,23,-20,-4,20,-4,23,23,39,18,46,43,23,51,12,60];
const PAPER_HEAD:Shape=[0,53,-20,34,-15,24,15,24,20,34];
const PAPER_BODY:Shape=[-12,23,12,23,19,1,11,-7,-11,-7,-19,1];
const PAPER_FACE:Shape=[-13,29,13,29,11,16,-11,16];
const PAPER_SLEEVE:Shape=[-4,6,7,10,12,-3,-2,-7];
const ARROW_HEAD:Shape=[20,0,7,6,10,0,7,-6];
const FLAG:Shape=[0,0,60,-6,51,-26,0,-23];
const TIGER:Shape=[-44,-13,-48,20,-40,52,-19,34,0,38,19,34,40,52,48,20,44,-13,23,-32,0,-44,-23,-32];
const ROCK:Shape=[-23,-4,-15,22,5,29,24,7,15,-20,-6,-28];
const BLADE:Shape=[0,0,.3,1,1,0,.3,-1];
const UNIT=Array.from({length:49},(_,i)=>({c:Math.cos(i*TAU/48),s:Math.sin(i*TAU/48)}));

export function vfxLine(g:Graphics,x:number,y:number,tx:number,ty:number,tone:number,alpha:number,width:number):void{
 g.strokeColor=ink(tone,alpha);g.lineWidth=width;g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();
}
function poly(g:Graphics,p:Shape,x:number,y:number,sx:number,sy:number,a:number,tone:number,alpha:number,outline=-1):void{
 const c=Math.cos(a),s=Math.sin(a);g.fillColor=ink(tone,alpha);
 for(let i=0;i<p.length;i+=2){const u=p[i]*sx,v=p[i+1]*sy,px=x+u*c-v*s,py=y+u*s+v*c;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.close();g.fill();
 if(outline>=0){g.strokeColor=ink(outline,alpha);g.lineWidth=2;g.stroke();}
}
function disk(g:Graphics,x:number,y:number,rx:number,ry:number,tone:number,alpha:number):void{g.fillColor=ink(tone,alpha);g.ellipse(x,y,rx,ry);g.fill();}
function outline(g:Graphics,x:number,y:number,r:number,tone:number,alpha:number,width:number):void{g.strokeColor=ink(tone,alpha);g.lineWidth=width;g.circle(x,y,r);g.stroke();}
function petal(g:Graphics,x:number,y:number,r:number,a:number,tone:number,alpha:number):void{
 const c=Math.cos(a),s=Math.sin(a);g.fillColor=ink(tone,alpha);g.moveTo(x-c*r,y-s*r);
 g.bezierCurveTo(x-s*r*.8,y+c*r*.8,x+c*r-s*r*.6,y+s*r+c*r*.6,x+c*r,y+s*r);
 g.bezierCurveTo(x+c*r+s*r*.6,y+s*r-c*r*.6,x+s*r*.8,y-c*r*.8,x-c*r,y-s*r);g.fill();
}
function ribbon(g:Graphics,x:number,y:number,r:number,start:number,span:number,width:number,tone:number,alpha:number):void{
 const steps=Math.max(10,Math.ceil(Math.abs(span)*18));g.fillColor=ink(tone,alpha);
 for(let i=0;i<=steps;i++){const a=start+span*i/steps,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}
 for(let i=steps;i>=0;i--){const a=start+span*i/steps,rr=r-width*Math.sin(i/steps*Math.PI);g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.close();g.fill();
}
export function drawSkillContact(g:Graphics,x:number,y:number,a:number,age:number,life:number,tone:number):void{
 const f=Math.max(0,1-age/life);
 for(let i=0;i<3;i++){const angle=a+(i-1)*.65,length=(i===1?23:15)*(.65+.35*Math.min(1,age*25));poly(g,BLADE,x,y,length,length*.22,angle,tone,f);poly(g,BLADE,x,y,length*.72,length*.11,angle,0,f);}
}
export function drawSkillArrow(g:Graphics,x:number,y:number,a:number,alpha:number,scale=1):void{
 const c=Math.cos(a),s=Math.sin(a);vfxLine(g,x-c*18*scale,y-s*18*scale,x+c*12*scale,y+s*12*scale,14,alpha,3*scale);
 poly(g,ARROW_HEAD,x,y,scale,scale,a,0,alpha,8);
 for(let j=-1;j<=1;j+=2)vfxLine(g,x-c*17*scale,y-s*17*scale,x-c*25*scale-s*j*5*scale,y-s*25*scale+c*j*5*scale,15,alpha,4*scale);
}
export function drawThrust(g:Graphics,x:number,y:number,a:number,length:number,age:number,life:number,retreat:boolean):void{
 const t=Math.min(1,age/life),f=(1-t)**1.1,c=Math.cos(a),s=Math.sin(a),l=length*(.8+.2*Math.min(1,t*8));
 poly(g,BLADE,x,y+24,l,retreat?22:14,a,12,f*.55);poly(g,BLADE,x,y+24,l*.98,retreat?14:9,a,9,f*.9);poly(g,BLADE,x,y+24,l*.97,retreat?6:4,a,0,f);
 for(let j=-1;j<=1;j+=2)vfxLine(g,x-c*12-s*j*15,y+24-s*12+c*j*15,x+c*l*.6-s*j*12,y+24+s*l*.6+c*j*12,9,f*.35,2);
}
export function drawDash(ground:Graphics,air:Graphics,x:number,y:number,tx:number,ty:number,a:number,age:number,life:number,retreat:boolean):void{
 const f=Math.max(0,1-age/life),c=Math.cos(a),s=Math.sin(a),length=Math.hypot(tx-x,ty-y);
 for(let side=-1;side<=1;side+=2){const ox=-s*side*25,oy=c*side*25;
  vfxLine(ground,x+ox,y+oy,tx+ox,ty+oy,retreat?12:9,f*.35,8);vfxLine(air,x+ox,y+oy+8,tx+ox,ty+oy+8,0,f*.65,2);
 }
 if(!retreat&&length>1){poly(air,BLADE,tx-c*42,ty+18-s*42,60,24,a,12,f*.7);poly(air,BLADE,tx-c*40,ty+18-s*40,57,17,a,9,f);poly(air,BLADE,tx-c*36,ty+18-s*36,51,5,a,0,f);}
 for(let i=0;i<3;i++)disk(ground,x-c*i*12,y-s*i*12,5+i*2,3,8,f*.35);
}
export function drawCloudFeet(ground:Graphics,x:number,y:number,age:number,f:number,moving:boolean,a:number):void{
 const c=Math.cos(a),s=Math.sin(a);
 for(let side=-1;side<=1;side+=2){const u=side*34,wave=Math.sin(age*13+side)*4,ox=x+u,oy=y-24+wave;
  disk(ground,ox,oy,15,6,9,f*.55);disk(ground,ox-5,oy+4,7,6,0,f*.8);disk(ground,ox+5,oy+5,6,7,4,f*.8);
  if(moving)vfxLine(ground,ox-c*10,oy-s*10,ox-c*55,oy-s*55,9,f*.45,4);
 }
}
export function drawShield(g:Graphics,x:number,y:number,age:number,f:number,count:number,copper:boolean):void{
 const scale=.65+.35*Math.min(1,age/.08);
 for(let i=0;i<count;i++){const ox=x+(copper?46:count===1?57:(i?57:-57)),oy=y+23+Math.sin(age*4+i)*2;
  poly(g,SHIELD,ox,oy,scale,scale,0,copper?2:9,f*.86,14);poly(g,SHIELD,ox,oy,scale*.78,scale*.8,0,copper?14:12,f*.55);
  vfxLine(g,ox-8,oy-10,ox+7,oy+16,0,f*.8,2);
 }
}
export function drawCleanse(ground:Graphics,air:Graphics,x:number,y:number,age:number,f:number):void{
 const bloom=Math.min(1,age/.12);
 for(let i=0;i<6;i++){const a=i*TAU/6,px=x+Math.cos(a)*50*bloom,py=y+Math.sin(a)*35*bloom;
  petal(Math.sin(a)>0?ground:air,px,py+3,18,a+Math.PI/2,4,f*.58);petal(ground,px,py,13,a,0,f*.6);
 }
 petal(air,x+38,y+25,13,Math.PI/2,9,f*.95);petal(air,x+37,y+27,7,Math.PI/2,0,f*.75);
 for(let i=0;i<4;i++)disk(ground,x+(i-1.5)*30*(1+age),y-12,4,2,8,f*Math.max(0,1-age/.25));
}
function trigrams(g:Graphics,x:number,y:number,r:number,age:number,f:number):void{
 for(let i=0;i<8;i++){const a=i*TAU/8,c=Math.cos(a),s=Math.sin(a),u=x+c*r*.75,v=y+s*r*.75;
  for(let j=0;j<3;j++){const rr=j*5;if((i+j)%3===0){vfxLine(g,u-s*12+c*rr,v+c*12+s*rr,u-s*3+c*rr,v+c*3+s*rr,4,f,2);vfxLine(g,u+s*3+c*rr,v-c*3+s*rr,u+s*12+c*rr,v-c*12+s*rr,4,f,2);}else vfxLine(g,u-s*12+c*rr,v+c*12+s*rr,u+s*12+c*rr,v-c*12+s*rr,4,f,2);}
 }
}
export function drawBarrier(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,f:number):void{
 trigrams(ground,x,y,r,age,f*.65);outline(ground,x,y,r,3,f*.22,3);
 for(let i=0;i<8;i++){const p=UNIT[i*6],ox=x+p.c*r*.75,oy=y+p.s*r*.75,g=p.s>0?ground:air;poly(g,HEX,ox,oy,1.1,1.1,0,3,f*.45,1);poly(g,HEX,ox,oy,.75,.75,0,4,f*.3);}
}
export function drawCloak(ground:Graphics,air:Graphics,x:number,y:number,age:number,f:number):void{
 disk(ground,x,y,33,8,8,f*.22);poly(air,CLOAK,x,y,1,1+Math.sin(age*3)*.025,0,0,f*.88,14);
 vfxLine(air,x,y+46,x-5,y+4,2,f*.7,2);poly(air,DIAMOND,x,y+57,.33,.33,.35,1,f,14);
}
export function drawDecoy(ground:Graphics,air:Graphics,x:number,y:number,age:number,f:number):void{
 const bounce=Math.sin(age*8)*2;disk(ground,x,y,28,7,8,f*.2);disk(air,x,y+28+bounce,25,23,2,f*.85);disk(air,x,y+34+bounce,21,20,0,f);
 vfxLine(air,x-10,y+38+bounce,x-4,y+37+bounce,14,f,2);vfxLine(air,x+4,y+37+bounce,x+10,y+38+bounce,14,f,2);
 air.strokeColor=ink(14,f);air.lineWidth=2;air.arc(x,y+32+bounce,8,Math.PI,TAU,false);air.stroke();
 vfxLine(air,x-22,y+16,x+22,y+16,15,f,4);const remaining=Math.max(0,1-age/3);vfxLine(air,x-18,y+12,x-18+36*remaining,y+12,1,f,3);
}
export function drawFlag(g:Graphics,x:number,y:number,age:number,f:number,tone:number,scale=1):void{
 vfxLine(g,x,y,x,y+65*scale,14,f*.8,3);poly(g,FLAG,x,y+65*scale,scale,scale,Math.sin(age*5)*.06,tone,f*.8,1);
 vfxLine(g,x+6*scale,y+56*scale,x+38*scale,y+52*scale,0,f*.45,2);
}
export function drawHaste(ground:Graphics,air:Graphics,x:number,y:number,age:number,f:number):void{
 if(age<.3){const k=age/.3;disk(ground,x-44-k*15,y-8,16*(1-k),9*(1-k),2,f);for(let i=0;i<3;i++)poly(ground,DIAMOND,x-44+(i-1)*k*25,y-8+k*9,.22,.22,i,14,(1-k)*f);}
 for(let i=0;i<3;i++){const a=age*10+i*TAU/3;vfxLine(air,x+Math.cos(a)*55,y+20+Math.sin(a)*24,x+Math.cos(a+.35)*64,y+20+Math.sin(a+.35)*27,1,f*.7,3);}
}
export function drawPaper(g:Graphics,x:number,y:number,a:number,shot:number,f:number):void{
 const kick=Math.max(0,1-shot/.15)*6;
 poly(g,PAPER_BODY,x,y,1,1,0,0,f,14);poly(g,PAPER_FACE,x,y,1,1,0,0,f,14);poly(g,PAPER_HEAD,x,y,1,1,0,0,f,14);
 vfxLine(g,x,y+51,x,y+28,2,f*.75,2);vfxLine(g,x-17,y+33,x,y+28,2,f*.6,1.5);vfxLine(g,x+17,y+33,x,y+28,2,f*.6,1.5);
 vfxLine(g,x-8,y+24,x-3,y+22,14,f,2);vfxLine(g,x+3,y+22,x+8,y+24,14,f,2);
 vfxLine(g,x-9,y-5,x-11,y-14,14,f,4);vfxLine(g,x+9,y-5,x+11,y-14,14,f,4);
 vfxLine(g,x-15,y+2,x+15,y+2,2,f,3);vfxLine(g,x,y+19,x,y-6,2,f*.65,1.5);
 poly(g,PAPER_SLEEVE,x-15,y+14,1,1,.4,0,f,14);poly(g,PAPER_SLEEVE,x+15,y+14,-1,1,-.4,0,f,14);
 const c=Math.cos(a),s=Math.sin(a),xx=x-c*kick,yy=y+18-s*kick;
 vfxLine(g,xx-c*17,yy-s*17,xx+c*29,yy+s*29,14,f,5);vfxLine(g,xx-c*17,yy-s*17,xx+c*29,yy+s*29,2,f,3);
 vfxLine(g,xx+c*17-s*12,yy+s*17+c*12,xx+c*26,yy+s*26,14,f,2);vfxLine(g,xx+c*26,yy+s*26,xx+c*17+s*12,yy+s*17-c*12,14,f,2);
 vfxLine(g,xx+c*17-s*12,yy+s*17+c*12,xx+c*17+s*12,yy+s*17-c*12,1,f,1);
}
export function drawBoat(ground:Graphics,air:Graphics,x:number,y:number,age:number,f:number,count:number):void{
 const yy=y-18;ground.fillColor=ink(2,f*.83);ground.strokeColor=ink(14,f);ground.lineWidth=3;
 ground.moveTo(x-76,yy+7);ground.bezierCurveTo(x-60,yy-27,x+50,yy-28,x+75,yy+7);ground.lineTo(x+53,yy+13);ground.lineTo(x-53,yy+13);ground.close();ground.fill();ground.stroke();
 vfxLine(ground,x-65,yy+3,x+66,yy+3,1,f*.7,2);vfxLine(ground,x-68,yy+4,x-68,yy+98,14,f,3);
 ground.fillColor=ink(0,f*.78);ground.moveTo(x-64,yy+93);ground.lineTo(x-64,yy+23);ground.lineTo(x-16,yy+32);ground.close();ground.fill();
 for(let i=0;i<5;i++)vfxLine(air,x+27+i*7,y-5,x+18+i*7,y+21,2,f*.8,3);
 for(let i=0;i<count;i++)drawSkillArrow(air,x+24+i*12,y+15,Math.PI/2+.23,f,.65);
}
export function drawFire(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number,paper:boolean):void{
 const t=age/life,f=Math.max(0,1-t),rise=.65+.35*Math.min(1,t*7);
 if(paper){
  disk(ground,x,y,r*.62,r*.42,8,f*.16);
  for(let i=0;i<12;i++){const a=i*TAU/12,rr=r*(.18+.7*t),ox=x+Math.cos(a)*rr,oy=y+Math.sin(a)*rr+18*f;poly(air,DIAMOND,ox,oy,.25+.1*(i%2),.2,a+t,i%3?0:2,f,14);}
  for(let i=0;i<5;i++){const a=i*TAU/5;vfxLine(air,x+Math.cos(a)*r*.24,y+Math.sin(a)*r*.24,x+Math.cos(a)*r*(.4+.3*t),y+Math.sin(a)*r*(.4+.3*t),1,f*.55,3);}
  return;
 }
 disk(ground,x,y,r*.85,r*.55,7,f*.14);outline(ground,x,y,r,7,f*.4,2);
 for(let i=0;i<5;i++){const a=i*TAU/5,ox=x+Math.cos(a)*r*.48,oy=y+Math.sin(a)*r*.38,g=Math.sin(a)>0?ground:air,h=(paper?45:70)*rise*f*(.85+(i%2)*.3),w=paper?17:23;
  for(let layer=0;layer<2;layer++){const ww=layer?w*.45:w;g.fillColor=ink(layer?0:7,f*(layer?.85:.9));g.moveTo(ox-ww,oy);g.bezierCurveTo(ox-ww*1.6,oy+h*.4,ox+ww*.6,oy+h*.65,ox,oy+h);g.bezierCurveTo(ox+ww*1.8,oy+h*.4,ox+ww,oy+h*.1,ox+ww,oy);g.close();g.fill();}
 }
 if(paper)for(let i=0;i<6;i++){const a=i*TAU/6,rr=r*(.3+.6*t);poly(air,DIAMOND,x+Math.cos(a)*rr,y+Math.sin(a)*rr+20,.3,.25,a,0,f,2);}
}
export function drawWave(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number):void{
 const rr=r*Math.min(1,age/.55),f=Math.max(0,1-Math.max(0,age-.3)/(life-.3));disk(ground,x,y,rr,rr,9,f*.06);
 for(let i=0;i<12;i++){const a=(i+.5)*TAU/12,g=Math.sin(a)>0?ground:air,c=Math.cos(a),s=Math.sin(a),cx=x+c*Math.max(0,rr-13),cy=y+s*Math.max(0,rr-13);
  // Scalloped blue body and rounded foam lobes: a rolling crest, never a blade or hard circle.
  ribbon(g,x,y,rr-2,a-.27,.54,48,12,f*.68);ribbon(g,x,y,rr-8,a-.27,.54,36,9,f*.82);
  for(let j=0;j<4;j++){const b=a+(j-1.5)*.085,bc=Math.cos(b),bs=Math.sin(b),at=Math.max(0,rr-11-j%2*3);disk(g,x+bc*at,y+bs*at,8+j%2*2,7+j%2*2,0,f*.9);}
  g.strokeColor=ink(0,f*.95);g.lineWidth=5;g.arc(cx,cy,13,a-1.5,a+1.5,false);g.stroke();
  g.strokeColor=ink(9,f*.92);g.lineWidth=5;g.arc(cx-c*9,cy-s*9,10,a-1.3,a+1.5,false);g.stroke();
  ribbon(g,x,y,Math.max(2,rr-26),a-.16,.31,8,0,f*.52);
 }

}
export function drawGates(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,f:number):void{
 const rise=Math.min(1,age/.08);
 for(let i=0;i<8;i++){const p=UNIT[i*6],q=UNIT[(i+1)*6],ox=x+p.c*r,oy=y+p.s*r,g=p.s>0?ground:air;
  vfxLine(ground,ox,oy,x+q.c*r,y+q.s*r,2,f*.6,4);vfxLine(ground,ox,oy,x+q.c*r,y+q.s*r,1,f*.6,1);
  g.fillColor=ink(2,f*.8);g.strokeColor=ink(14,f*.8);g.lineWidth=2;g.rect(ox-16,oy-8,9,40*rise);g.rect(ox+7,oy-8,9,40*rise);g.rect(ox-20,oy+29*rise,40,8);g.fill();g.stroke();
  vfxLine(g,ox-11,oy,ox-11,oy+28*rise,0,f*.8,2);vfxLine(g,ox+12,oy,ox+12,oy+28*rise,1,f*.9,2);
 }
}
export function drawRoar(ground:Graphics,air:Graphics,x:number,y:number,a:number,r:number,age:number,life:number):void{
 const t=age/life,f=(1-t)**1.2,c=Math.cos(a),s=Math.sin(a),rr=r*(.5+.5*Math.min(1,t*5));
 for(let j=0;j<3;j++)for(let k=0;k<5;k++)ribbon(air,x,y+24,rr*(1-j*.16),a-.86+k*.35,.26,14-j*3,j?0:1,f*(.8-j*.18));
 const hx=x+c*rr*.4,hy=y+24+s*rr*.4;poly(air,TIGER,hx,hy,.78,.72,a-Math.PI/2,1,f*.72,14);
 for(let side=-1;side<=1;side+=2){vfxLine(air,hx+side*25,hy+18,hx+side*9,hy+12,14,f,5);vfxLine(air,hx+side*28,hy-1,hx+side*20,hy-11,14,f,3);}
 disk(air,hx,hy-18,11,14,14,f*.8);vfxLine(air,hx-7,hy-11,hx-3,hy-21,0,f,3);vfxLine(air,hx+7,hy-11,hx+3,hy-21,0,f,3);
}
export function drawLightning(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number):void{
 const f=Math.max(0,1-age/life);outline(ground,x,y,r,10,f*.45,3);
 for(let layer=0;layer<3;layer++){air.strokeColor=ink(layer===2?0:layer===1?10:13,f*(layer===0?.4:1));air.lineWidth=layer===0?22:layer===1?11:4;
  for(let i=0;i<8;i++){const px=x+(i&&i<7?Math.sin(i*9+Math.floor(age*28))*15:0),py=y+(7-i)*35;if(!i)air.moveTo(px,py);else air.lineTo(px,py);}air.stroke();}
 for(let i=0;i<4;i++){const a=i*TAU/4;vfxLine(ground,x,y,x+Math.cos(a)*r*.75,y+Math.sin(a)*r*.75,11,f*.8,3);}
 for(let side=-1;side<=1;side+=2){vfxLine(air,x,y+120,x+side*38,y+156,10,f,4);vfxLine(air,x+side*38,y+156,x+side*50,y+187,0,f*.8,2);}
}
export function drawMeteor(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number,falling:boolean):void{
 const t=age/life,f=Math.max(0,1-t);
 if(falling){const left=1-t*t,ox=x-140*left,oy=y+300*left;
  vfxLine(air,ox-45,oy+110,ox,oy,7,.65,18);vfxLine(air,ox-32,oy+80,ox,oy,1,.95,10);vfxLine(air,ox-19,oy+45,ox,oy,0,.95,3);
  poly(air,ROCK,ox,oy,.85,.95,-.3,13,1,10);poly(air,DIAMOND,ox+4,oy+1,.45,.8,-.2,10,1);outline(ground,x,y,r,1,.18,2);
 }else{disk(ground,x,y,r*.8,r*.6,8,f*.18);outline(ground,x,y,r*(.7+.3*t),1,f*.6,5);
  for(let i=0;i<7;i++){const p=UNIT[Math.floor(i*48/7)],rr=r*(.35+.5*t);disk(p.s>0?ground:air,x+p.c*rr,y+p.s*rr,14*(1-t)+3,7*(1-t)+2,8,f*.55);poly(air,ROCK,x+p.c*rr*.7,y+p.s*rr*.7+20*f,.2,.2,i,10,f,14);}
 }
}
export function drawHeal(ground:Graphics,air:Graphics,x:number,y:number,age:number,life:number):void{
 const t=age/life,f=Math.sin(Math.PI*Math.min(1,t)),xx=x+65,yy=y+6+t*10;
 petal(air,xx-12,yy-12,15,.3,3,f*.8);petal(air,xx+12,yy-12,15,2.8,4,f*.8);
 air.fillColor=ink(5,f);air.moveTo(xx,yy-10);air.bezierCurveTo(xx-27,yy+6,xx-8,yy+24,xx,yy+13);air.bezierCurveTo(xx+8,yy+24,xx+27,yy+6,xx,yy-10);air.fill();
 for(let i=0;i<5;i++){const a=i*TAU/5,rr=65*(1-t);petal(air,x+Math.cos(a)*rr,y+20+Math.sin(a)*rr*.4,5,a+t,6,f*.65);}
}
export function drawSong(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,f:number):void{
 for(let i=0;i<4;i++){const p=UNIT[i*12],ox=x+p.c*r*.8,oy=y+p.s*r*.8;drawFlag(p.s>0?ground:air,ox,oy,age,f,13,.6);
  const t=(age*1.8+i*.17)%1,u=ox+(x-ox)*t,v=oy+(y-oy)*t;
  vfxLine(ground,u-10,v,u-3,v+7,11,f*.6,3);vfxLine(ground,u-3,v+7,u+4,v-5,10,f*.65,3);vfxLine(ground,u+4,v-5,u+11,v+1,11,f*.6,3);
 }
}
export function drawTargetFlag(g:Graphics,x:number,y:number,age:number,f:number):void{drawFlag(g,x+29,y+40,age,f,13,.22);}
