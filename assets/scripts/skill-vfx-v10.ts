import {firePlume} from './vfx-brush';
import {materialImage,pixel} from './vfx-materials';
import {Color, Graphics} from 'cc';
import {THUNDER_COUNT,SKY_VOLLEY_SIZE,FIRE_HALF_WIDTH,GUARD_SWORDS,GUARD_WARDS,GUARD_ANGULAR_SPEED,RAIN_VOLLEYS,RAIN_FIRST_IMPACT,RAIN_INTERVAL,isHeavyStar} from './common-skills';
import {effectInk} from './combat-effects';
import {drawSkillArrow, drawSkillContact, drawStunMark, vfxLine} from './skill-vfx-art';

export {drawSkillContact, drawStunMark};
const TAU = Math.PI * 2;
const clamp = (n:number) => Math.max(0, Math.min(1,n));

// Deep water and storm shadow need cooler values than the shared jade weapon palette.
const DEEP=19, BLUE=20, SURF=21, STORM=22;
const washes = ['#164870','#247fa4','#87f2eb','#39285a'].map(hex =>
 Array.from({length:33},(_,step)=>{const color=new Color(hex);color.a=Math.round(step*255/32);return color;}));
function ink(tone:number,alpha:number):Color {
 return tone<DEEP?effectInk(tone,alpha):washes[tone-DEEP][Math.round(clamp(alpha)*32)];
}

// Two concentric circular Béziers form one painted sector. Heights and angles belong to
// the visual only. The combat runtime still determines the exact footprint and impact.
function band(g:Graphics,x:number,y:number,outer:number,inner:number,from:number,span:number,tone:number,f:number):void {
 if(outer<1||inner>=outer||f<.025)return;
 const c=Math.cos(from),s=Math.sin(from),end=from+span,C=Math.cos(end),S=Math.sin(end),k=4/3*Math.tan(span/4);
 g.fillColor=ink(tone,f);g.moveTo(x+outer*c,y+outer*s);
 g.bezierCurveTo(x+outer*(c-k*s),y+outer*(s+k*c),x+outer*(C+k*S),y+outer*(S-k*C),x+outer*C,y+outer*S);
 g.lineTo(x+inner*C,y+inner*S);
 g.bezierCurveTo(x+inner*(C+k*S),y+inner*(S-k*C),x+inner*(c-k*s),y+inner*(s+k*c),x+inner*c,y+inner*s);
 g.close();g.fill();
}

function glint(g:Graphics,x:number,y:number,size:number,tone:number,f:number):void {
 if(size<1||f<.025)return;
 g.fillColor=ink(tone,f);g.moveTo(x,y+size);g.lineTo(x+size*.2,y+size*.21);
 g.lineTo(x+size*.72,y);g.lineTo(x+size*.2,y-size*.16);g.lineTo(x,y-size);
 g.lineTo(x-size*.16,y-size*.19);g.lineTo(x-size*.72,y);g.lineTo(x-size*.16,y+size*.18);g.close();g.fill();
}

// A tapered brush stroke in world space. Bend and belly are measured in game units.
// The two sides meet at both tips; a moving silhouette stays legible on the grass.
function stroke(g:Graphics,x:number,y:number,tx:number,ty:number,bend:number,belly:number,tone:number,alpha:number):void {
 const dx=tx-x, dy=ty-y, len=Math.hypot(dx,dy);
 if(len<1 || belly<=0 || alpha<.025)return;
 const nx=-dy/len, ny=dx/len, back=bend*.65;
 g.fillColor=ink(tone,alpha);g.moveTo(x,y);
 g.bezierCurveTo(x+dx*.28+nx*back,y+dy*.28+ny*back,x+dx*.72+nx*(bend+belly),y+dy*.72+ny*(bend+belly),tx,ty);
 g.bezierCurveTo(x+dx*.72+nx*(bend-belly),y+dy*.72+ny*(bend-belly),x+dx*.28+nx*(back-belly*.36),y+dy*.28+ny*(back-belly*.36),x,y);
 g.close();g.fill();
}
function facet(g:Graphics,x:number,y:number,tx:number,ty:number,bend:number,width:number,body:number,edge:number,f:number):void {
 stroke(g,x,y,tx,ty,bend,width,body,f);
 stroke(g,x+(tx-x)*.14,y+(ty-y)*.14,tx,ty,bend+width*.24,width*.33,edge,f);
}
function ellipse(g:Graphics,x:number,y:number,rx:number,ry:number,tone:number,f:number):void {
 if(rx<.1||ry<.1||f<.025)return;
 g.fillColor=ink(tone,f);g.ellipse(x,y,rx,ry);g.fill();
}
// A short segment of a wavefront. The chord bows toward the real circular boundary.
function crest(g:Graphics,x:number,y:number,r:number,a:number,span:number,width:number,body:number,edge:number,f:number):void {
 if(r<1)return;
 const x0=x+Math.cos(a-span*.5)*r,y0=y+Math.sin(a-span*.5)*r;
 const x1=x+Math.cos(a+span*.5)*r,y1=y+Math.sin(a+span*.5)*r;
 facet(g,x0,y0,x1,y1,-r*(1-Math.cos(span*.5))*1.4,width,body,edge,f);
}

export function drawFlight(g:Graphics,x:number,y:number,a:number,f:number,heavy=false):void {
 const c=Math.cos(a),s=Math.sin(a),length=heavy?162:105;
 facet(g,x-c*length,y-s*length,x-c*6,y-s*6,6,heavy?19:10,heavy?7:1,0,f*.85);
 stroke(g,x-c*85-s*7,y-s*85+c*7,x-c*27,y-s*27,5,2,0,f*.6);
 if(!pixel(g,heavy?'arrowGold':'arrowRed',x+22*c,y+22*s,heavy?112:76,a,f,0,1))drawSkillArrow(g,x,y,a,f,heavy?1.60:1.12);
}

export function drawBow(ground:Graphics,air:Graphics,x:number,y:number,a:number,age:number,life:number):void {
 const c=Math.cos(a),s=Math.sin(a),xx=x+c*46,yy=y+25+s*46;
 const f=Math.min(1,age/.035,(life-age)/.12);
 const phase=clamp((age%.095)/.095),draw=age<.68?Math.sin(phase*Math.PI*.5):0;
 const reach=39+draw*5,notch=7+draw*19;
 for(let side=-1;side<=1;side+=2){
  const tipX=xx-s*side*reach,tipY=yy+c*side*reach;
  facet(air,tipX,tipY,xx+c*17,yy+s*17,side*17,9,14,1,f);
  vfxLine(air,tipX,tipY,xx-c*notch,yy-s*notch,0,f*.9,1.8);
 }
 ellipse(ground,x,y-2,30,8,8,f*.13);
}

export function drawDash(ground:Graphics,air:Graphics,x:number,y:number,tx:number,ty:number,a:number,age:number,life:number):void {
 const c=Math.cos(a),s=Math.sin(a),f=clamp((life-age)/.23),len=Math.hypot(tx-x,ty-y);
 if(len<1)return;
 for(let side=-1;side<=1;side+=2){
  const nx=-s*side,ny=c*side;
  facet(ground,x+nx*24,y+ny*24,tx+nx*12,ty+ny*12,side*18,14,12,9,f*.82);
  stroke(ground,x+nx*36,y+ny*36,tx-c*14+nx*21,ty-s*14+ny*21,side*13,3,0,f*.75);
 }
 // A single forward spear point opens the wake. Its position follows the actual dash endpoint.
 facet(air,tx-c*50,ty+23-s*50,tx+c*48,ty+23+s*48,-5,18,9,0,f);
 if(f>.2)pixel(air,'thrust',tx-c*31,ty+23-s*31,94,a,f*.7,age/.43,1);
}

export function drawBattleHaste(ground:Graphics,air:Graphics,x:number,y:number,age:number,f:number):void {
 const lift=clamp(age/.13),flutter=Math.sin(age*17),xx=x-55,yy=y+30;
 const height=59*lift,top=yy+height;
 pixel(ground,'charge',x-16,y+11,133,0,f*.58,(age*6)%1);
 // Swallowtail battle standard: the two free ends flutter independently behind the shoulder.
 vfxLine(ground,xx,yy-16,xx+3,top+5,14,f,3);
 ground.fillColor=ink(16,f);ground.moveTo(xx+2,top+1);
 ground.bezierCurveTo(xx-19,top+6,xx-23,top-10,xx-55,top+flutter*5);
 ground.lineTo(xx-41,top-13+flutter*4);ground.lineTo(xx-57,top-25+flutter*3);
 ground.bezierCurveTo(xx-27,top-31,xx-20,top-13,xx+2,top-23);ground.close();ground.fill();
 facet(ground,xx+2,top-8,xx-41,top+6+flutter*6,-11,15,17,1,f);
 stroke(ground,xx+2,top-19,xx-50,top-8-flutter*6,-7,12,16,f*.95);
 for(let side=-1;side<=1;side+=2){
  const p=(age*1.65+(side+1)*.21)%1;
  stroke(air,x+side*29,y+7,x+side*(38+7*p),y+28+38*p,side*12,8*(1-p),7,f*(1-p));
 }
}
export function drawHasteStrike(g:Graphics,x:number,y:number,a:number,age:number,life:number):void {
 const t=clamp(age/life),c=Math.cos(a),s=Math.sin(a);
 facet(g,x-c*23,y-s*23,x+c*(25+32*t),y+s*(25+32*t),-14,14,17,1,1-t);
}

// World-aligned scorch footprint, with vertical flames at anchors along that footprint.
export function drawFireLine(ground:Graphics,air:Graphics,x:number,y:number,half:number,angle:number,age:number,life:number):void {
 const c=Math.cos(angle),s=Math.sin(angle),reach=half*clamp(age/.15),fade=clamp((life-age)/.4);
 const beat=age<.15?0:1-clamp(((age-.15)%.75)/.30);
 if(reach<1)return;
 for(let layer=0;layer<2;layer++){
  ground.fillColor=ink(layer===0?16:17,fade*(layer===0?.26:.20));
  for(let i=0;i<=16;i++){
   const side=i<9?1:-1,u=(i<9?i:16-i)/8,dist=(2*u-1)*reach;
   const w=FIRE_HALF_WIDTH*side*(layer===0?.92:.51)*(.75+.17*Math.sin(i*3.74));
   const xx=x+c*dist-s*w,yy=y+s*dist+c*w;
   if(i===0)ground.moveTo(xx,yy);else ground.lineTo(xx,yy);
  }
  ground.close();ground.fill();
 }
 for(let i=0;i<8;i++){
  const at=((i+.5)/4-1)*half,u=clamp((reach-Math.abs(at)+8)/31);
  if(u===0)continue;
  const across=(i%3-1)*14,xx=x+c*at-s*across,yy=y+s*at+c*across;
  const phase=age*(6+i*.23)+i*2.53,h=u*(63+19*Math.sin(phase)+38*beat+(i%2)*14),w=(24+i%3*4)*u;
  firePlume(ground,xx,yy,w,h,phase,ink(17,fade*.92));
  firePlume(ground,xx+2,yy,w*.73,h*.79,phase+.25,ink(7,fade));
  firePlume(air,xx+3,yy,w*.40,h*.54,phase+.45,ink(1,fade*.88));
  if((i&1)===0)pixel(ground,beat>.38?'whorl':'flame',xx,yy,65+23*beat,0,fade*(.50+.32*beat),(phase*.21)%1);
  const a=(age*1.3+i*.37)%1;
  glint(air,xx+9+a*24,yy+h+a*28,3.5+3*beat,0,fade*(1-a));
 }
}
export function drawFireBeat(g:Graphics,x:number,y:number,half:number,angle:number,age:number,life:number):void {
 const c=Math.cos(angle),s=Math.sin(angle),t=clamp(age/life),f=1-t;
 for(let i=0;i<7;i++){
  const at=((i+.5)/3.5-1)*half,j=i%3-1;
  const xx=x+c*at-s*j*17,yy=y+s*at+c*j*17;
  const side=i%2?-1:1,reach=27+t*42;
  facet(g,xx,yy,xx+side*reach*.52,yy+reach,side*16,12*f,17,0,f);
 }
}

// Draw a continuous water sheet with ragged banks. A fixed polar table closes the seam
// exactly; the two boundaries undulate independently and turn transparent toward shore.
const tidePoints=Array.from({length:49},(_,i)=>{
 const a=(i%48)*TAU/48;
 return {c:Math.cos(a),s:Math.sin(a),ripple:Math.sin(3*a+.45),eddy:Math.cos(5*a)};
});
function wash(g:Graphics,x:number,y:number,r:number,age:number,fade:number):void {
 const beat=Math.sin(age*10),surge=Math.cos(age*7);
 for(let layer=0;layer<2;layer++){
  g.fillColor=ink(layer===0?DEEP:BLUE,fade*(layer===0?.27:.40));
  let ox=0,oy=0,ix=0,iy=0;
  for(let i=0;i<tidePoints.length;i++){
   const p=tidePoints[i],ridge=.06*p.ripple+.045*surge*p.eddy;
   const high=r*(layer===0?.94+ridge*.23:.88+ridge);
   const low=r*(layer===0?.34+ridge+beat*p.ripple*.075:.60+ridge+beat*p.eddy*.08);
   const ax=x+p.c*high,ay=y+p.s*high,bx=x+p.c*low,by=y+p.s*low;
   if(i>0){g.moveTo(ox,oy);g.lineTo(ax,ay);g.lineTo(bx,by);g.lineTo(ix,iy);g.close();}
   ox=ax;oy=ay;ix=bx;iy=by;
  }
  g.fill();
 }
}

export function drawWave(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number):void {
 const rr=r*clamp(age/.55),fade=clamp((life-age)/.25),w=Math.min(33,rr*.16);
 // Wide trailing water, then seven unequal breakers which shear across the front.
 const wake=clamp((age-.05)/.32);
 if(rr<2)return;
 wash(ground,x,y,rr,age,fade);
 if(age<.32)pixel(ground,'splash',x,y,120,0,fade*.74,age/.32);
 for(let i=0;i<7;i++){
  const drift=i*TAU/7+.21*wake;
  const inner=rr*(.48+.07*Math.sin(i*2.1+age*5));
  crest(ground,x,y,inner,drift+.24,.87,w*.62,BLUE,SURF,fade*.55);
  for(let j=0;j<2;j++){
   const a0=drift-.34+j*.21,a1=a0+.63,from=rr*(.85-j*.05),to=inner*(1.05+j*.15);
   stroke(ground,x+Math.cos(a0)*from,y+Math.sin(a0)*from,x+Math.cos(a1)*to,y+Math.sin(a1)*to,-rr*.18,3+j*2,SURF,fade*.72);
  }
  crest(ground,x,y,rr*.64,drift-.34,.85,w*.42,BLUE,SURF,fade*.65);
  const a=i*TAU/7+.06*Math.sin(age*7+i),c=Math.cos(a),s=Math.sin(a),g=s>0?ground:air;
  crest(g,x,y,rr*.91,a-.05,.91,w,DEEP,BLUE,fade*.82);
  crest(g,x,y,rr,a,.83,w*.85,SURF,0,fade);
  if(i%2===0)pixel(g,'wave',x+c*rr*.93,y+s*rr*.93,w*3,0,fade*.82,(age*3+i*.1)%1);
  // The lip curls back into its own wake. Only the rim carries foam.
  const xx=x+c*rr,yy=y+s*rr,scale=Math.min(1,rr/110)*(1.07+.32*Math.sin(i*2.3+age*7));
  const spray=clamp((age-.05)/.42);
  for(let j=0;j<3;j++){
   const tangent=(j-1)*14,radial=(8+j*7)*spray;
   const px=xx+c*radial-s*tangent,py=yy+s*radial+c*tangent+25*Math.sin(spray*Math.PI);
   stroke(g,px-c*9,py-s*9,px+c*(7+j*2),py+s*(7+j*2),3,3+j,SURF,fade*.8);
  }
  const sprayBeat=(age*2.6+i*.37)%1;
  ellipse(g,xx+c*14-s*28,yy+s*14+c*28+19*sprayBeat,4.5*(1-sprayBeat),3.2,0,fade);
  curl(g,xx,yy,-s*scale,c*scale,c*scale,s*scale,fade);
  ellipse(g,xx+(c*19-s*22)*scale,yy+(s*19+c*22)*scale,4*scale,3*scale,0,fade*.86);
 }
}

// A breaking lip in the local tangent/radial basis, curling inward to leave a hollow.
function curl(g:Graphics,x:number,y:number,tx:number,ty:number,nx:number,ny:number,f:number):void {
 g.fillColor=ink(SURF,f);g.moveTo(x-47*tx-16*nx,y-47*ty-16*ny);
 g.bezierCurveTo(x-20*tx-12*nx,y-20*ty-12*ny,x-23*tx+33*nx,y-23*ty+33*ny,x+3*tx+32*nx,y+3*ty+32*ny);
 g.bezierCurveTo(x+22*tx+34*nx,y+22*ty+34*ny,x+27*tx+13*nx,y+27*ty+13*ny,x+10*tx+10*nx,y+10*ty+10*ny);
 g.bezierCurveTo(x+13*tx+23*nx,y+13*ty+23*ny,x-2*tx+23*nx,y-2*ty+23*ny,x+2*tx+8*nx,y+2*ty+8*ny);
 g.bezierCurveTo(x+5*tx-13*nx,y+5*ty-13*ny,x-18*tx-22*nx,y-18*ty-22*ny,x-47*tx-16*nx,y-47*ty-16*ny);g.close();g.fill();
 facet(g,x-23*tx+7*nx,y-23*ty+7*ny,x+19*tx+22*nx,y+19*ty+22*ny,16,7,0,0,f);
}

export function drawGates(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,f:number):void {
 pixel(ground,'rune',x,y,r*1.42,0,f*.52,(age*3)%1);
 for(let i=0;i<8;i++){
  const a=i*TAU/8,c=Math.cos(a),s=Math.sin(a),xx=x+c*r,yy=y+s*r;
  const next=a+TAU/8,k=clamp((age-i*.022)/.13);
  if(k<=0)continue;
  const g=s>0?ground:air,h=48*k,top=yy+h;
  const tx=x+Math.cos(next)*r,ty=y+Math.sin(next)*r;
  // Lacquer and gilded inlay form a complete octagonal seal below the eight gates.
  const light=.5+.5*Math.cos(age*4-a);
  band(ground,x,y,r*.84,r*.75,a,TAU/8-.018,12,f*.67);
  band(ground,x,y,r*.85,r*.838,a,TAU/8-.026,1,f*.9);
  const inner=a+Math.PI*.75;
  const rune=(age*.69+i/8)%1;
  const sx=x+c*r*.75,sy=y+s*r*.75,ex=x+Math.cos(inner)*r*.75,ey=y+Math.sin(inner)*r*.75;
  glint(ground,sx+(ex-sx)*rune,sy+(ey-sy)*rune,6,1,f*.9);
  vfxLine(ground,x+c*r*.75,y+s*r*.75,x+Math.cos(inner)*r*.75,y+Math.sin(inner)*r*.75,2,f*.55,3);
  const p=(age*.8+i/8)%1;
  glint(ground,xx+(tx-xx)*p,yy+(ty-yy)*p,5+5*light,0,f*.9);
  facet(g,xx-9,yy,xx-9,yy+72*k,-8,18,12,9,f*.45*light);
  facet(ground,xx,yy,xx+(tx-xx)*k,yy+(ty-yy)*k,5,4,2,1,f*.82);
  for(let side=-1;side<=1;side+=2){
   const post=xx+side*14;
   vfxLine(g,post,yy,post,top,14,f,5);
   vfxLine(g,post,yy+2,post,top,1,f,2);
   facet(g,xx,top-2,xx+side*28,top+10*k,side*-7,9*k,12,1,f);
  }
  g.fillColor=ink(12,f*.93);g.moveTo(xx-12,top);g.lineTo(xx+12,top);
  g.lineTo(xx+12,yy+9*k);g.lineTo(xx,yy+1);g.lineTo(xx-12,yy+9*k);g.close();g.fill();
  // Eight distinct trigrams under the eaves; the open gaps remain visible.
  for(let row=0;row<3;row++){
   const ybar=yy+(11+row*8)*k;
   if(i&(1<<row)){
    vfxLine(g,xx-9,ybar,xx-2,ybar,1,f,3);vfxLine(g,xx+2,ybar,xx+9,ybar,1,f,3);
   }else vfxLine(g,xx-9,ybar,xx+9,ybar,1,f,3);
  }
 }
}
export function drawLockHit(g:Graphics,x:number,y:number,age:number,life:number):void {
 const t=clamp(age/life),f=1-t;
 for(let side=-1;side<=1;side+=2){
  const xx=x+side*(28-20*Math.sin(t*Math.PI));
  facet(g,xx-side*6,y-16,xx,y+16,side*15,8,2,1,f);
 }
}

const BOLT_X=[-28,4,-16,13,-6,0],BOLT_Y=[1,.75,.70,.45,.40,0];
export function drawLightning(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number,pre=false,lane=0,secondary=false):void {
 if(pre&&!secondary)pixel(air,'cloud',x,y+148,r*1.65,0,Math.min(1,age/.09)*.74,age/life,1);
 else if(!pre&&!secondary&&age<.25)pixel(air,'lightning',x,y,r*1.90,0,(1-age/.25)*.79,age/.25,1);

 const t=clamp(age/life);
 // Spread the sources across the same storm front as the original four clouds.
 const offset=(lane/(THUNDER_COUNT-1)-.5)*144,h=221+r*.82+((lane+1)%3)*16;
 const cloudX=x+offset;

 const cloud=pre?clamp(t*1.8):1-clamp(age/.31);
 if(!secondary&&cloud>.02){
  const yy=y+h,w=(62+13*Math.sin(cloud*2))*cloud;
  air.fillColor=ink(STORM,cloud*.80);air.moveTo(cloudX-w*1.55,yy-2);
  air.bezierCurveTo(cloudX-w*1.0,yy+7,cloudX-w*.79,yy+39*cloud,cloudX-w*.38,yy+23*cloud);
  air.bezierCurveTo(cloudX-w*.29,yy+49*cloud,cloudX+w*.34,yy+47*cloud,cloudX+w*.52,yy+23*cloud);
  air.bezierCurveTo(cloudX+w*.85,yy+32*cloud,cloudX+w,yy+3,cloudX+w*1.5,yy+6);
  air.bezierCurveTo(cloudX+w*.93,yy-15*cloud,cloudX+w*.51,yy-4,cloudX+w*.24,yy-13*cloud);
  air.bezierCurveTo(cloudX-w*.16,yy-28*cloud,cloudX-w*.6,yy+3,cloudX-w*1.55,yy-2);air.close();air.fill();
  facet(air,cloudX-w*1.07,yy+3,cloudX+w*.62,yy+6,21*cloud,10*cloud,13,10,cloud);
  stroke(air,cloudX-w*.63,yy-4,cloudX+w*1.1,yy+2,-9*cloud,4,11,cloud*.70);
 }
 if(pre){
  for(let i=0;i<(secondary?1:3);i++)crest(ground,x,y,r*(.67-.31*t),i*TAU/3+t*.5,.90,5,10,11,.42+t*.5);
  return;
 }
 const flash=1-clamp(age/.28),after=1-t;
 const corona=1-clamp(age/.19);
 if(secondary){
  if(flash>0)for(let i=1;i<BOLT_X.length;i++){
   const mirror=lane%2===0?1:-1;
   const ax=x+BOLT_X[i-1]*mirror+offset*BOLT_Y[i-1],ay=y+BOLT_Y[i-1]*h;
   const bx=x+BOLT_X[i]*mirror+offset*BOLT_Y[i],by=y+BOLT_Y[i]*h;
   vfxLine(air,ax,ay,bx,by,10,flash,7);
   vfxLine(air,ax,ay,bx,by,0,flash,2);
  }
  glint(air,x,y+5,19*corona,0,corona);
  band(ground,x,y,r*(.27+.55*t),r*(.23+.55*t),lane,2.3,11,after*.8);
  return;
 }
 ellipse(ground,x,y,r*(.42+.46*t),r*(.33+.42*t),10,corona*.27);
 for(let side=-1;side<=1;side+=2){
  const shoulder=cloudX+side*40,knee=x+offset*.69+side*34;
  facet(air,shoulder,y+h*.95,knee,y+h*.69,side*4,9,10,11,flash*.92);
  vfxLine(air,knee,y+h*.69,knee+side*13,y+h*.70,11,flash,3);
  facet(air,knee+side*13,y+h*.70,x+offset*.45+13*(lane%2===0?1:-1),y+h*.45,side*-7,7,10,11,flash);
 }
 glint(air,x,y+7,30*corona,0,corona);
 for(let i=1;i<BOLT_X.length;i++){
  const mirror=lane%2===0?1:-1;
  const x0=x+BOLT_X[i-1]*mirror+offset*BOLT_Y[i-1],y0=y+BOLT_Y[i-1]*h;
  const x1=x+BOLT_X[i]*mirror+offset*BOLT_Y[i],y1=y+BOLT_Y[i]*h;
  vfxLine(air,x0,y0,x1,y1,13,flash*.65,12);
  facet(air,x0,y0,x1,y1,2,14,10,0,flash);
  vfxLine(air,x0,y0,x1,y1,0,flash,2.4);
 }
 for(let side=-1;side<=1;side+=2){
  facet(air,x+5,y+h*.5,x+side*44,y+h*.69,side*-6,6,10,11,flash*.85);
  stroke(air,x+side*44,y+h*.69,x+side*57,y+h*.87,side*6,4,11,flash*.7);
 }
 for(let i=0;i<5;i++){
  const a=i*TAU/5+.6,rr=r*(.35+.60*clamp(age/.18));
  const c=Math.cos(a),s=Math.sin(a),midX=x+c*rr*.5-s*7,midY=y+s*rr*.5+c*7;
  vfxLine(ground,x,y,midX,midY,13,after,5);
  facet(ground,midX,midY,x+c*rr,y+s*rr,(i%2?1:-1)*9,7,13,11,after);
  stroke(ground,midX,midY,x+(c*.82-s*.24)*rr,y+(s*.82+c*.24)*rr,-4,4,10,after);
  band(ground,x,y,rr,rr*.88,a,.65,10,corona*.74);
 }
}

export function drawMeteor(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number,falling:boolean,index=0,secondary=false):void {
 const t=clamp(age/life),finalStar=isHeavyStar(Math.floor(index/SKY_VOLLEY_SIZE));
 if(!falling&&(!secondary||finalStar))pixel(air,finalStar?'goldMeteor':'meteor',x,y,finalStar?185:135,0,(1-t)*.84,t,1);
 if(falling){
  const travel=1-t*t,dx=145*(.72+.16*((index*3)%5)),dy=295+Math.floor(index/SKY_VOLLEY_SIZE)*8;
  const xx=x-dx*travel,yy=y+dy*travel,lean=dx/dy;
  const reticle=r*(.52-.29*t);
  if(secondary)ellipse(ground,x,y,reticle,reticle*.59,10,.24+.20*t);
  else for(let i=0;i<5;i++){
   const a=i*TAU/5+t*.4,next=a+2*TAU/5;
   const ax=x+Math.cos(a)*reticle,ay=y+Math.sin(a)*reticle*.59;
   vfxLine(ground,ax,ay,x+Math.cos(next)*reticle,y+Math.sin(next)*reticle*.59,1,.24+.27*t,1.4);
   glint(ground,ax,ay,2+1.5*t,0,.73);
  }
  // The two tapered tails follow the actual descent tangent and grow with the fall speed.
  const length=76+49*t,tailX=xx-length*lean,tailY=yy+length;
  facet(air,tailX,tailY,xx,yy+2,6,finalStar?22:13,finalStar?7:13,finalStar?0:10,.88);
  stroke(air,tailX+4,tailY-16,xx+5,yy+3,-3,5,1,.96);
  for(let j=0;j<(secondary?0:2);j++){
   const at=length*(.53+.55*j),flutter=Math.sin(t*8+index+j)*5;
   glint(air,xx-at*lean+flutter,yy+at,5-j,11,.82-j*.17);
  }
  ellipse(ground,x,y,7+13*t,3+5*t,18,.16+.28*t);
  // Three interlocking faces keep the mid-sized stone readable against bright grass.
  air.fillColor=ink(STORM,1);air.moveTo(xx-16,yy+6);air.lineTo(xx-8,yy+19);
  air.lineTo(xx+6,yy+16);air.lineTo(xx+16,yy+2);air.lineTo(xx+6,yy-19);
  air.lineTo(xx-10,yy-11);air.close();air.fill();
  air.fillColor=ink(finalStar?7:10,1);air.moveTo(xx-13,yy+6);air.lineTo(xx-6,yy+16);
  air.lineTo(xx+5,yy+13);air.lineTo(xx+2,yy-3);air.lineTo(xx-8,yy-8);air.close();air.fill();
  air.fillColor=ink(1,1);air.moveTo(xx+5,yy+13);air.lineTo(xx+13,yy+2);
  air.lineTo(xx+5,yy-14);air.lineTo(xx+2,yy-3);air.close();air.fill();
  glint(air,xx+5,yy+3,finalStar?11:8,0,.96);
  return;
 }
 const f=1-t,rr=r*(.18+.80*(1-(1-t)**3));
 const flash=1-clamp(age/.26),wave=1-clamp(age/.48);
 const crater=r*(.17+.18*clamp(age/.18));
 ellipse(ground,x,y,crater,crater*.60,18,f*.62);
 if(secondary){
  band(ground,x,y,rr,rr-5*wave,index,.95*Math.PI,7,wave*.9);
  band(air,x,y,rr,rr-3*wave,index+Math.PI,.93*Math.PI,1,wave);
  facet(air,x-4,y+4,x-12,y+36*(1+.5*t),4,10*flash,7,0,flash);
  glint(air,x,y+6,25*flash,0,flash);
  return;
 }
 ellipse(ground,x,y,crater*.76,crater*.39,7,f*.50);
 // The near lip and the ejected chips sit above the sprites, even on an occupied mark.
 for(let i=0;i<6;i++){
  const a=i*TAU/6+index*.64,c=Math.cos(a),s=Math.sin(a);
  const layer=s<0?air:ground;
  band(layer,x,y,rr,rr-7*wave,a,.79,7,wave*.94);
  band(layer,x,y,rr,rr-2.5*wave,a,.71,0,wave);
  const rim=r*(.23+.46*clamp(age/.26));
  crest(layer,x,y,rim,a+.27,.53,5*flash,1,0,flash);
  const at=r*(.12+.54*t),hop=Math.sin(Math.PI*t)*(23+i%3*9);
  const px=x+c*at,py=y+s*at;
  facet(air,px-3*f,py+hop-2*f,px+6*f,py+hop+8*f,-2,7*f,13,1,f);
  if(i%2===0){
   const reach=(finalStar?72:58)*(1-flash*.30);
   facet(air,x+c*4,y+3,x+c*reach,y+10+Math.abs(s)*reach,3,14*flash,7,0,flash);
  }
 }
 glint(air,x,y+9,(finalStar?44:34)*flash,0,flash);
 if(finalStar){
  const size=rr*.53;
  for(let j=0;j<5;j++){
   const a=j*TAU/5-.35,end=a+TAU*2/5,px=x+Math.cos(a)*size,py=y+Math.sin(a)*size*.78;
   vfxLine(ground,px,py,x+Math.cos(end)*size,y+Math.sin(end)*size*.78,1,f*.82,1.6);
   glint(air,px,py,4*f,0,f);
  }
 }
}

const RAIN_WAVES=Array.from({length:RAIN_VOLLEYS},(_,wave)=>{
 const heavy=wave===RAIN_VOLLEYS-1,slope=wave%2===0?.44:-.44;
 return {heavy,slope,angle:Math.atan2(-1,slope),impact:RAIN_FIRST_IMPACT+wave*RAIN_INTERVAL,
  arrows:Array.from({length:heavy?28:18},(_,i)=>{
   const angle=i*2.399963+wave*.75,radius=.19+.74*((i*.438+wave*.23)%1);
   return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,height:168+(i%4)*18,spark:i%3===0};
  })};
});

export function drawRain(ground:Graphics,air:Graphics,x:number,y:number,r:number,a:number,age:number,life:number):void {
 if(age<.20){
  drawBow(ground,air,x,y,a,age,.20);
  const swell=clamp(age/.18),fade=(1-swell)*.55;
  for(let i=0;i<4;i++)band(ground,x,y,r*swell,r*swell-3,a+i*TAU/4,.66,1,fade);
 }
 const fade=clamp((life-age)/.14);
 for(const wave of RAIN_WAVES){
  const {heavy,slope,angle,impact,arrows}=wave;
  const since=age-impact;
  if(since< -RAIN_FIRST_IMPACT||since>=.32)continue;
  if(since<0){
   const fall=1+since/RAIN_FIRST_IMPACT,alpha=Math.min(1,fall/.19)*fade;
   const width=heavy?116:82,tail=heavy?96:61;
   for(const arrow of arrows){
    const height=arrow.height*(1-fall*fall),ax=x+arrow.x*r-slope*height,ay=y+arrow.y*r+height;
    const plume=heavy?1:0;
    stroke(air,ax-tail*slope,ay+tail,ax,ay,0,heavy?6:2.5,plume,alpha*.65);
    if(!pixel(air,heavy?'arrowGold':'arrowWhite',ax,ay,width,angle,alpha,0,Number(heavy))){
     const dx=Math.cos(angle),dy=Math.sin(angle);
     vfxLine(air,ax-dx*width,ay-dy*width,ax,ay,plume,alpha,heavy?5:3);
     facet(air,ax-dx*width,ay-dy*width,ax-dx*(width-18),ay-dy*(width-18),0,heavy?8:5,plume,0,alpha);
    }
   }
   continue;
  }
  const time=since/.32,embers=(1-time)*fade,flash=clamp(1-since/.10)*fade;
  for(const arrow of arrows){
   if(!arrow.spark)continue;
   const xx=x+arrow.x*r,yy=y+arrow.y*r;
   vfxLine(ground,xx,yy,xx-slope*23,yy+23,heavy?1:8,embers,heavy?3:1.6);
   ellipse(ground,xx,yy,7+time*10,2+time*4,2,embers*.52);
   glint(air,xx,yy+4,(heavy?16:8)*flash,0,flash);
   for(let side=-1;side<=1;side+=2){
    const spread=7+time*(heavy?29:21),rise=5+Math.sin(Math.PI*time)*(heavy?28:17);
    const sx=xx+side*spread,sy=yy+rise;
    stroke(air,sx-side*8,sy-6,sx,sy,0,heavy?3:1.8,heavy?1:0,embers);
    if(heavy)glint(air,sx,sy+5,3.8*embers,1,embers);
   }
  }
  const rim=r*(.19+time*.77);
  for(let i=0;i<6;i++)band(ground,x,y,rim,rim-(heavy?5:2),i*TAU/6+wave.angle,.39,1,embers*(heavy?.52:.30));
 }
}

export function drawGuard(ground:Graphics,air:Graphics,x:number,y:number,r:number,a:number,age:number,f:number,count:number):void {
 ellipse(ground,x,y+8,r,r*.77,9,f*.10);
 for(let i=0;i<GUARD_SWORDS;i++){
  const at=a+age*GUARD_ANGULAR_SPEED+i*TAU/GUARD_SWORDS,c=Math.cos(at),s=Math.sin(at),xx=x+c*r,yy=y+s*r+17,g=s>0?ground:air;
  crest(g,x,y+17,r,at-.35,.58,12,9,0,f*.74);
  // Tangent-facing, diamond-ground sword and brass crossguard at its true orbit.
  if(!materialImage(g,'weapon-sword',xx,yy,67,67,at+Math.PI/4,f,1)){
   facet(g,xx+s*16,yy-c*16,xx-s*40,yy+c*40,0,12,9,0,f);
   vfxLine(g,xx+c*9+s*12,yy+s*9-c*12,xx-c*9+s*12,yy-s*9-c*12,1,f,4);
   vfxLine(g,xx+s*23,yy-c*23,xx+s*13,yy-c*13,14,f,4);
  }
 }
 for(let i=0;i<GUARD_WARDS;i++){
  const at=i*TAU/GUARD_WARDS+age*.30;
  glint(ground,x+Math.cos(at)*56,y+Math.sin(at)*35-7,8,i<count?21:8,i<count?f:f*.32);
 }
}

export function drawStun(ground:Graphics,air:Graphics,x:number,y:number,r:number,age:number,life:number):void {
 const t=clamp(age/life),f=1-t,rr=r*clamp(age/.16);
 for(let i=0;i<8;i++){
  const a=i*TAU/8,g=Math.sin(a)>0?ground:air;
  // A second, slower pressure wave crosses the field as the outer drumbeat breaks up.
  const echo=r*clamp((age-.065)/.28);
  const dust=clamp(age/.28),bx=x+Math.cos(a)*rr*.87,by=y+Math.sin(a)*rr*.87;
  stroke(ground,bx-10,by,bx+11,by+18*Math.sin(Math.PI*dust),5,6,2,f*(1-dust));
  band(ground,x,y,rr,rr*(.82+.10*t),a-.31,.64,2,f*.40);
  crest(ground,x,y,echo,a+.11,.68,13*f,1,0,f*.87);
  const streak=r*(.18+.60*clamp(age/.25)),c=Math.cos(a),s=Math.sin(a);
  stroke(ground,x+c*streak*.62,y+s*streak*.62,x+c*streak,y+s*streak,-12,7*f,1,f*.61);
  crest(g,x,y,rr,a,.65,24*f,2,1,f);
  crest(g,x,y,rr*.86,a+.07,.43,8*f,1,0,f*.77);
 }
 // Brief drum strike at the caster's feet; the target stars persist for the real stun.
 const strike=1-clamp(age/.25);
 const drumX=x-46,drumY=y+4;
 if(strike>0){
  ground.fillColor=ink(16,strike);ground.roundRect(drumX-25,drumY-14,50,25,6);ground.fill();
  ellipse(ground,drumX,drumY+10,27,10,14,strike);
  ellipse(ground,drumX,drumY+12,24,8,1,strike);
  for(let i=-1;i<=1;i++)vfxLine(ground,drumX+12*i-3,drumY+5,drumX+12*i+3,drumY-9,1,strike,2);
  facet(air,drumX-30,y+46,drumX-5,drumY+12,4,5,2,0,strike);
  facet(air,drumX+35,y+53,drumX+8,drumY+14,-3,5,2,0,strike);
 }
}
