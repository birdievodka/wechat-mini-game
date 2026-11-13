import {Graphics} from 'cc';
import {effectInk as ink} from './combat-effects';

// Hand-shaped solid silhouettes, cached palette and shared contours. Pure drawing; no gameplay/RNG.
const TAU=Math.PI*2;
type Shape=readonly number[];
const EDGE:Shape=[0,0,.27,.75,.82,.32,1,0,.82,-.32,.27,-.75];
const ARROW:Shape=[24,0,9,8,12,2,-23,2,-23,-2,12,-2,9,-8];
const FEATHER:Shape=[-18,0,-28,8,-22,9,-12,1,-22,-9,-28,-8];
const SWORD:Shape=[-28,-3,-16,-3,-16,-9,-11,-9,-11,-5,21,-5,37,0,21,5,-11,5,-11,9,-16,9,-16,3,-28,3];
const ROCK:Shape=[-24,-4,-16,21,4,28,24,8,17,-19,-5,-27];
const FLAG:Shape=[0,0,72,-8,61,-22,70,-39,0,-31];
const STAR:Shape=[0,15,4,5,14,5,7,-2,10,-13,0,-7,-10,-13,-7,-2,-14,5,-4,5];
const UNIT=Array.from({length:65},(_,i)=>({c:Math.cos(i*TAU/64),s:Math.sin(i*TAU/64)}));
const EX=new Float32Array(65),EY=new Float32Array(65),IX=new Float32Array(65),IY=new Float32Array(65);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function poly(g:Graphics,p:Shape,x:number,y:number,sx:number,sy:number,a:number,tone:number,alpha:number,stroke=-1):void{
 if(alpha<=0)return;const c=Math.cos(a),s=Math.sin(a);g.fillColor=ink(tone,alpha);
 for(let i=0;i<p.length;i+=2){const u=p[i]*sx,v=p[i+1]*sy,px=x+u*c-v*s,py=y+u*s+v*c;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.close();g.fill();
 if(stroke>=0){g.strokeColor=ink(stroke,alpha);g.lineWidth=2;g.stroke();}
}
function disk(g:Graphics,x:number,y:number,rx:number,ry:number,tone:number,f:number):void{if(rx<=0||ry<=0||f<=0)return;g.fillColor=ink(tone,f);g.ellipse(x,y,rx,ry);g.fill();}
export function vfxLine(g:Graphics,x:number,y:number,tx:number,ty:number,tone:number,alpha:number,width:number):void{
 if(alpha<=0)return;g.strokeColor=ink(tone,alpha);g.lineWidth=width;g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();
}
/** Filled tapered ribbon, optionally split across the exact same seam in world depth. */
function ribbon(g:Graphics,x:number,y:number,r:number,start:number,span:number,width:number,tone:number,f:number,half=0):void{
 if(r<=1||f<=0)return;const steps=24;
 for(let i=0;i<=steps;i++){const a=start+span*i/steps,c=Math.cos(a),s=Math.sin(a),w=width*Math.pow(Math.sin(i/steps*Math.PI),.65);EX[i]=x+c*r;EY[i]=y+s*r;IX[i]=x+c*(r-w);IY[i]=y+s*(r-w);}
 g.fillColor=ink(tone,f);
 if(!half){
  g.moveTo(EX[0],EY[0]);for(let i=1;i<=steps;i++)g.lineTo(EX[i],EY[i]);for(let i=steps;i>=0;i--)g.lineTo(IX[i],IY[i]);g.close();g.fill();
 }else for(let i=0;i<steps;i++){
  if(((EY[i]+EY[i+1])*.5>y?1:-1)!==half)continue;
  g.moveTo(EX[i],EY[i]);g.lineTo(EX[i+1],EY[i+1]);g.lineTo(IX[i+1],IY[i+1]);g.lineTo(IX[i],IY[i]);g.close();g.fill();
 }
}
function shock(ground:Graphics,air:Graphics,x:number,y:number,r:number,t:number,f:number,tone:number,width:number):void{
 for(let i=0;i<8;i++){const a=i*TAU/8+t*.35,g=Math.sin(a+.3)>0?ground:air;ribbon(g,x,y,r,a,.65,width,tone,f);ribbon(g,x,y,r-3,a+.04,.5,width*.3,0,f*.65);}
}
export function drawSkillContact(g:Graphics,x:number,y:number,a:number,age:number,life:number,tone:number):void{
 const t=clamp(age/life),f=(1-t)**1.4;
 for(let i=0;i<3;i++){const at=a+(i-1)*.72,l=(i===1?31:20)*(.7+.3*clamp(t*6));poly(g,EDGE,x,y,l,l*.28,at,tone,f);poly(g,EDGE,x,y,l*.73,l*.1,at,0,f);}
}
export function drawSkillArrow(g:Graphics,x:number,y:number,a:number,f:number,s=1):void{
 poly(g,ARROW,x,y,s,s,a,1,f,14);poly(g,FEATHER,x,y,s,s,a,15,f,14);
 vfxLine(g,x-Math.cos(a)*15*s,y-Math.sin(a)*15*s,x+Math.cos(a)*17*s,y+Math.sin(a)*17*s,0,f*.9,1.5*s);
}
export function drawFlight(g:Graphics,x:number,y:number,a:number,f:number):void{
 const c=Math.cos(a),s=Math.sin(a);
 poly(g,EDGE,x-c*18,y-s*18,-90,10,a,1,f*.24);poly(g,EDGE,x-c*20,y-s*20,-66,4,a,0,f*.65);
 drawSkillArrow(g,x-c*24,y-s*24,a,f,1.15);
}
export function drawBow(ground:Graphics,air:Graphics,x:number,y:number,a:number,age:number,life:number):void{
 const f=Math.min(1,age/.04,Math.max(0,(life-age)/.15)),kick=(age%.095)/.095,c=Math.cos(a),s=Math.sin(a),ox=x+c*48,oy=y+25+s*48;
 // A real curved bow silhouette made from two offset stroked beziers.
 for(let layer=0;layer<3;layer++){
  const g=air;g.strokeColor=ink(layer===0?14:layer===1?1:0,f);g.lineWidth=layer===0?10:layer===1?7:2;
  g.moveTo(ox-s*38,oy+c*38);g.bezierCurveTo(ox+c*34-s*25,oy+s*34+c*25,ox+c*34+s*25,oy+s*34-c*25,ox+s*38,oy-c*38);g.stroke();
 }
 const back=9+kick*12;vfxLine(air,ox-s*38,oy+c*38,ox-c*back,oy-s*back,0,f*.8,1.5);vfxLine(air,ox+s*38,oy-c*38,ox-c*back,oy-s*back,0,f*.8,1.5);
 disk(ground,x,y,35,10,8,f*.15);
}
export function drawDash(ground:Graphics,air:Graphics,x:number,y:number,tx:number,ty:number,a:number,age:number,life:number):void{
 const f=clamp((life-age)/.22),c=Math.cos(a),s=Math.sin(a),length=Math.hypot(tx-x,ty-y);
 for(let side=-1;side<=1;side+=2){const ox=-s*side*28,oy=c*side*28;
  poly(ground,EDGE,tx+ox,ty+oy,-Math.max(1,length),15,a,12,f*.36);poly(ground,EDGE,tx+ox,ty+oy,-Math.max(1,length)*.95,7,a,9,f*.58);
  vfxLine(air,x+ox,y+oy+18,tx+ox,ty+oy+18,0,f*.55,2);
 }
 if(length>1){poly(air,EDGE,tx-c*46,ty+24-s*46,104,44,a,12,f,14);poly(air,EDGE,tx-c*42,ty+24-s*42,96,31,a,9,f);poly(air,EDGE,tx-c*35,ty+24-s*35,85,12,a,0,f);}
 for(let i=0;i<6;i++){const q=i/6,px=x+(tx-x)*q,py=y+(ty-y)*q;disk(ground,px-s*(i%2?29:-29),py+c*(i%2?29:-29),11*(1-q)+3,6,8,f*.28);}
}
export function drawBattleHaste(ground:Graphics,air:Graphics,x:number,y:number,age:number,f:number):void{
 if(age<.42){const k=clamp(age/.08),ff=clamp((.42-age)/.16);vfxLine(ground,x-55,y+16,x-55,y+105*k,14,ff,5);poly(ground,FLAG,x-55,y+105*k,1,1,Math.sin(age*20)*.06,15,ff,14);vfxLine(ground,x-48,y+92*k,x+1,y+85*k,1,ff,3);}
 for(let side=-1;side<=1;side+=2){const xx=x+side*36;
  for(let j=0;j<2;j++){const p=(age*2+j*.5)%1,h=25+32*p,w=(1-p)*13;poly(air,EDGE,xx,y+9, w,h,Math.PI/2,15,f*.5*(1-p));poly(air,EDGE,xx,y+9,w*.4,h*.85,Math.PI/2,1,f*.7*(1-p));}
 }
 for(let i=0;i<4;i++)ribbon(ground,x,y-4,46+i%2*3,age*4+i*TAU/4,.65,8,15,f*.35);
}
export function drawHasteStrike(g:Graphics,x:number,y:number,a:number,age:number,life:number):void{
 const f=1-clamp(age/life);poly(g,EDGE,x,y,-52,14,a,15,f*.5);poly(g,EDGE,x,y,-38,5,a,1,f*.85);
}
function flame(g:Graphics,x:number,y:number,w:number,h:number,phase:number,tone:number,f:number):void{
 const sway=Math.sin(phase)*w*.4;g.fillColor=ink(tone,f);g.moveTo(x-w,y);
 g.bezierCurveTo(x-w*1.7,y+h*.3,x+w*.4+sway,y+h*.72,x+sway,y+h);
 g.bezierCurveTo(x+w*1.2,y+h*.65,x+w*1.5,y+h*.22,x+w,y);g.close();g.fill();
}
export function drawFireLine(ground:Graphics,air:Graphics,x:number,y:number,half:number,age:number,life:number):void{
 const f=Math.min(1,Math.max(0,(life-age)/.3)),grow=clamp(age/.15),visible=half*grow;
 for(let i=0;i<15;i++){const u=-half+half*2*i/14;if(Math.abs(u)>visible+1)continue;disk(ground,x+u,y+Math.sin(i*2.1)*8,25+(i%3)*4,28+(i%2)*5,16,f*.28);}
 vfxLine(ground,x-visible,y-31,x+visible,y-31,15,f*.42,4);vfxLine(ground,x-visible,y+31,x+visible,y+31,7,f*.38,4);
 for(let row=0;row<2;row++)for(let i=0;i<13;i++){
  const u=-half+half*2*i/12;if(Math.abs(u)>visible+1)continue;const yy=y+(row?20:-20)+Math.sin(i*2.7+row)*9,g=row?ground:air,p=age*13+i*2.1+row,h=(45+Math.sin(p)*10+(i%3)*11)*(row===0&&Math.abs(u)<70?.5:1);
  const xx=x+u+(row?13:0)+Math.sin(i*1.9)*5,w=22+(i%3)*3;
  flame(g,xx,yy,w,h,p,16,f*.95);flame(g,xx+1,yy+1,w*.85,h*.95,p+.2,17,f);flame(g,xx+2,yy+2,w*.64,h*.82,p+.3,7,f);flame(g,xx+3,yy+3,w*.34,h*.61,p+.4,1,f);flame(g,xx+3,yy+4,w*.13,h*.3,p+.4,0,f*.85);
 }
}
export function drawWave(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number):void{
 const rr=r*clamp(age/.55),f=clamp((life-age)/.25);if(rr<2)return;
 disk(ground,x,y,rr,rr,9,f*.055);
 for(let i=0;i<10;i++){
  const a=i*TAU/10,g=Math.sin(a+.25)>0?ground:air;
  ribbon(g,x,y,rr,a,.57,58,12,f*.85);ribbon(g,x,y,rr-3,a+.015,.54,39,9,f*.95);ribbon(g,x,y,Math.max(1,rr-30),a+.1,.4,13,0,f*.55);
  for(let j=0;j<3;j++){const b=a+.08+j*.17,c=Math.cos(b),s=Math.sin(b),ox=x+c*(rr-8),oy=y+s*(rr-8);
   disk(g,ox,oy,10,9,0,f*.95);g.strokeColor=ink(0,f);g.lineWidth=5;g.arc(ox-c*10,oy-s*10,15,b-1.5,b+1.4,false);g.stroke();
  }
 }
 for(let i=0;i<4;i++)ribbon(ground,x,y,rr*.65,age+i*TAU/4,.7,3,0,f*.22);
}
export function drawGates(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,f:number):void{
 for(let i=0;i<8;i++){
  const p=UNIT[i*8],q=UNIT[(i+1)*8],ox=x+p.c*r,oy=y+p.s*r,g=p.s>0?ground:air,k=clamp((age-i*.025)/.1),bounce=1+Math.sin(k*Math.PI)*.12;
  vfxLine(ground,ox,oy,x+q.c*r,y+q.s*r,2,f*.55,5);vfxLine(ground,ox,oy,x+q.c*r,y+q.s*r,1,f*.8,1.5);
  if(k<=0)continue;const h=47*k*bounce;
  g.fillColor=ink(14,f);g.roundRect(ox-22,oy-7,44,h+10,6);g.fill();g.fillColor=ink(1,f);g.roundRect(ox-18,oy-4,36,h+4,4);g.fill();
  g.fillColor=ink(2,f);g.rect(ox-12,oy,24,h-5);g.fill();
  vfxLine(g,ox-15,oy+h-4,ox+15,oy+h-4,0,f,3);vfxLine(g,ox-8,oy+h*.65,ox+8,oy+h*.65,1,f,3);vfxLine(g,ox-8,oy+h*.65,ox-8,oy+h*.2,1,f,3);vfxLine(g,ox+8,oy+h*.65,ox+8,oy+h*.2,1,f,3);
  disk(ground,ox,oy-3,26,9,8,f*.18*(1-k));
 }
 for(let i=0;i<8;i++){const p=UNIT[i*8];vfxLine(ground,x+p.c*r*.28,y+p.s*r*.28,x+p.c*r*.55,y+p.s*r*.55,2,f*.3,2);}
}
export function drawLockHit(g:Graphics,x:number,y:number,age:number,life:number):void{
 const t=clamp(age/life),f=1-t;
 for(let side=-1;side<=1;side+=2)for(let i=0;i<3;i++){const xx=x+side*(35*(1-t)+i*7),yy=y-24+i*3;g.strokeColor=ink(1,f);g.lineWidth=4;g.ellipse(xx,yy,6,4);g.stroke();}
 drawSkillContact(g,x,y,Math.PI/2,age,life,1);
}
export function drawLightning(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number,pre=false):void{
 if(pre){const f=clamp(age/life);poly(ground,STAR,x,y,r*.6*f,r*.6*f,-.3,10,.13+f*.2);return;}
 const t=clamp(age/life),flash=clamp(1-age/.2),f=1-t;
 for(let layer=0;layer<3;layer++){
  air.fillColor=ink(layer===0?13:layer===1?10:0,layer===0?flash*.45:flash);const width=layer===0?34:layer===1?18:6;
  for(let side=-1;side<=1;side+=2){for(let j=0;j<9;j++){const i=side<0?j:8-j,xx=x+Math.sin(i*7+Math.floor(age*22))*18+side*width*(.4+.6*(i%2)),yy=y+280-i*35;if(!j&&side<0)air.moveTo(xx,yy);else air.lineTo(xx,yy);} }
  air.close();air.fill();
 }
 for(let i=0;i<5;i++){const a=i*TAU/5,u=UNIT[Math.round(i*64/5)];vfxLine(ground,x,y,x+u.c*r*.65,y+u.s*r*.65,13,f*.6,4);vfxLine(ground,x+u.c*r*.65,y+u.s*r*.65,x+Math.cos(a+.3)*r,y+Math.sin(a+.3)*r,10,f*.8,2);}
 shock(ground,air,x,y,r*(.4+.6*clamp(age/.2)),t,f*.7,10,13);
 for(let side=-1;side<=1;side+=2){vfxLine(air,x,y+130,x+side*40,y+163,10,flash,6);vfxLine(air,x+side*40,y+163,x+side*53,y+210,0,flash,3);}
}
export function drawMeteor(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number,falling:boolean):void{
 const t=clamp(age/life),f=1-t;
 if(falling){
  const left=1-t*t,ox=x-155*left,oy=y+340*left,a=-1.15;
  poly(air,EDGE,ox,oy,-155,38,a,13,.5);poly(air,EDGE,ox,oy,-125,26,a,7,.8);poly(air,EDGE,ox,oy,-95,13,a,1,1);poly(air,ROCK,ox,oy,1.15,1.15,-.3,14,1,13);poly(air,ROCK,ox+3,oy+5,.7,.7,-.3,10,1);vfxLine(air,ox-10,oy+4,ox+4,oy+15,0,.9,3);
  for(let i=0;i<5;i++){const a=i*TAU/5+.3,c=Math.cos(a),s=Math.sin(a),at=r*(1-.5*t);poly(ground,EDGE,x+c*at,y+s*at,14,4,a+Math.PI,1,.25+t*.3);}
 }else{
  disk(ground,x,y,r*.8,r*.6,8,f*.25);shock(ground,air,x,y,r*(.45+.55*clamp(t*3)),t,f*.9,1,27*(1-t));
  for(let i=0;i<7;i++){const a=i*TAU/7,rr=r*(.25+.6*t),ox=x+Math.cos(a)*rr,oy=y+Math.sin(a)*rr,g=Math.sin(a)>0?ground:air;
   poly(g,ROCK,ox,oy+Math.sin(t*Math.PI)*32,.18*(1-t)+.05,.18*(1-t)+.05,a+t*2,14,f,13);disk(ground,ox,oy,12*f+2,7*f+1,8,f*.25);
  }
 }
}
export function drawRain(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number):void{
 const f=clamp((life-age)/.22);if(f<=0)return;
 for(let i=0;i<6;i++)ribbon(ground,x,y,r,i*TAU/6,.48,3,1,f*.25);
 // Four impacts at .22 + wave*.25; every decorative flight lands on that exact simulation beat.
 for(let wave=0;wave<4;wave++){
  const t=(age-wave*.25)/.22;if(t<0||t>1.65)continue;
  for(let i=0;i<36;i++){
   const a=i*2.399963+wave*.8,rr=r*Math.sqrt((i+.5)/36)*.94,xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr;
   if(t<1){const h=(1-t)*230;disk(ground,xx,yy,7,3,8,f*.2*t);drawSkillArrow(air,xx-h*.28,yy+h+22,-1.3,f,.9);}
   else{const ff=f*clamp((1.65-t)/.65);drawSkillArrow(ground,xx,yy+18,-1.3,ff,.72);if(t<1.35){vfxLine(ground,xx-9,yy-2,xx-14,yy+5,2,ff*.6,2);vfxLine(ground,xx+7,yy-2,xx+12,yy+5,2,ff*.6,2);}}
  }
 }
}
function sword(g:Graphics,x:number,y:number,a:number,f:number,scale=1):void{
 poly(g,SWORD,x,y,scale,scale,a,9,f,14);vfxLine(g,x-Math.cos(a)*9*scale,y-Math.sin(a)*9*scale,x+Math.cos(a)*30*scale,y+Math.sin(a)*30*scale,0,f,2.5*scale);
 const c=Math.cos(a),s=Math.sin(a);vfxLine(g,x-c*14+s*8,y-s*14-c*8,x-c*14-s*8,y-s*14+c*8,1,f,4*scale);
}
export function drawGuard(ground:Graphics,air:Graphics,x:number,y:number,r:number,a:number,age:number,f:number,count:number):void{
 const angle=a+age*4,grow=clamp(age/.1);
 for(let i=0;i<4;i++){
  const at=angle+i*TAU/4,c=Math.cos(at),s=Math.sin(at),g=s>0?ground:air,ox=x+c*r*grow,oy=y+s*r*grow;
  ribbon(g,x,y,r*grow,at-.65,.6,11,9,f*.35);ribbon(g,x,y,r*grow,at-.4,.35,4,0,f*.7);
  sword(g,ox,oy+20,at+Math.PI/2,f,1.15);
 }
 for(let i=0;i<3;i++){const at=-Math.PI/2+(i-1)*.25;poly(ground,STAR,x+Math.cos(at)*(r+12),y+Math.sin(at)*(r+12),.45,.45,0,i<count?1:8,f*(i<count?.9:.35));}
}
export function drawStun(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number):void{
 const t=clamp(age/life),rr=r*clamp(age/.16),f=(1-t)**1.2;
 shock(ground,air,x,y,rr,t,f,1,34*(1-t));
 for(let i=0;i<6;i++){const a=i*TAU/6;poly(ground,EDGE,x+Math.cos(a)*rr*.9,y+Math.sin(a)*rr*.9,22,5,a,0,f*.65);}
}
export function drawStunMark(g:Graphics,x:number,y:number,age:number,f:number):void{
 g.strokeColor=ink(2,f*.65);g.lineWidth=2;g.ellipse(x,y+95,21,6);g.stroke();
 for(let i=0;i<3;i++){const a=age*5+i*TAU/3;poly(g,STAR,x+Math.cos(a)*21,y+95+Math.sin(a)*6,.48,.48,a*.3,1,f,14);}
}
/** Startup-baked menu icons; same solid warm-edged shapes as battle, no raster bundle added. */
export function drawSkillIcon(g:Graphics,index:number):void{
 if(index===24){g.strokeColor=ink(9,.8);g.lineWidth=4;g.ellipse(0,22,34,24);g.stroke();for(let i=0;i<3;i++){const a=i*TAU/3,xx=Math.cos(a)*22,yy=22+Math.sin(a)*22;sword(g,xx,yy,a+Math.PI/2,1,.9);}poly(g,STAR,0,22,.55,.55,0,1,1,14);}
 else{g.fillColor=ink(2);g.roundRect(-21,2,42,35,8);g.fill();g.strokeColor=ink(14);g.lineWidth=3;g.stroke();g.fillColor=ink(1);g.ellipse(0,37,21,9);g.fill();g.stroke();vfxLine(g,-16,29,-5,9,0,.8,3);vfxLine(g,-5,9,5,29,0,.8,3);vfxLine(g,5,29,16,9,0,.8,3);for(let i=0;i<3;i++)poly(g,STAR,(i-1)*27,63+(i%2)*9,.55,.55,(i-1)*.2,1,1,14);vfxLine(g,-30,43,-41,53,1,1,4);vfxLine(g,30,43,41,53,1,1,4);}
}
