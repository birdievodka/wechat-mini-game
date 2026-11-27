import {Color,Graphics} from 'cc';
import {WeaponId} from './weapons';
import * as brush from './vfx-brush';
import {material,pixel} from './vfx-materials';

export interface WeaponVfxProfile {style:brush.VfxStyle;family:'cloth'|'wood'|'blade'|'spear'|'petals'|'fire'|'gun'|'arrow'|'orbit'|'lightning'|'vortex'|'trap'|'wind'|'rune'|'machine';weight:number;}
/** All 36 weapons use an explicit visual identity; no weapon mechanics are encoded here. */
export const WEAPON_VFX:Record<WeaponId,WeaponVfxProfile>={
 sandal:{style:'gold',family:'cloth',weight:.55},pole:{style:'earth',family:'wood',weight:1},cleaver:{style:'silver',family:'blade',weight:.72},peach:{style:'peach',family:'petals',weight:.8},
 firecracker:{style:'crimson',family:'fire',weight:.65},smg:{style:'gold',family:'gun',weight:.45},shotgun:{style:'gold',family:'gun',weight:.75},rocket:{style:'crimson',family:'fire',weight:1.2},sword:{style:'silver',family:'orbit',weight:.8},thunder:{style:'violet',family:'lightning',weight:.85},gourd:{style:'violet',family:'vortex',weight:.8},
 'twin-swords':{style:'gold',family:'blade',weight:.8},guandao:{style:'jade',family:'blade',weight:1.3},'serpent-spear':{style:'silver',family:'spear',weight:1},halberd:{style:'crimson',family:'blade',weight:1.3},'silver-spear':{style:'silver',family:'spear',weight:.8},qinggang:{style:'silver',family:'blade',weight:.9},yitian:{style:'gold',family:'blade',weight:1},'seven-saber':{style:'violet',family:'blade',weight:.85},'ancient-saber':{style:'gold',family:'blade',weight:1.1},'twin-halberds':{style:'silver',family:'blade',weight:1.15},trident:{style:'gold',family:'spear',weight:.9},
 caltrops:{style:'earth',family:'trap',weight:.5},repeater:{style:'earth',family:'arrow',weight:.55},'phoenix-bow':{style:'crimson',family:'arrow',weight:.85},'heavy-crossbow':{style:'silver',family:'arrow',weight:1},'hand-halberd':{style:'gold',family:'blade',weight:.65},'chain-hook':{style:'silver',family:'blade',weight:.7},'oil-jar':{style:'crimson',family:'fire',weight:.8},'thunder-bomb':{style:'violet',family:'fire',weight:1},'feather-fan':{style:'jade',family:'wind',weight:.7},'taiping-book':{style:'gold',family:'rune',weight:1},'star-lamps':{style:'gold',family:'orbit',weight:.8},bagua:{style:'jade',family:'rune',weight:.8},'wood-ox':{style:'earth',family:'machine',weight:.6},'wood-kite':{style:'gold',family:'machine',weight:.8},
};
const TAU=Math.PI*2;
const lampFlame=new Color('#ffdb79');
export function drawWeaponSlash(ground:Graphics,air:Graphics,id:WeaponId,x:number,y:number,a:number,r:number,span:number,t:number,alpha:number,tier=1):void {
 const {family,style,weight}=WEAPON_VFX[id],w=weight*(1+(tier-1)*.07),c=Math.cos(a),s=Math.sin(a);
 if(family==='spear'){
  const reach=r*(.55+.45*Math.min(1,t*4)),px=x+c*reach,py=y+s*reach;
  brush.stream(air,px,py,a,reach*.77,8*w,style,alpha);
  brush.nib(air,px-c*12,py-s*12,a,36*w,8*w,style,alpha);
  brush.chargeWake(ground,px-c*14,py-s*14,a,reach*.68,11*w,style,alpha);
  if(id!=='silver-spear')for(let side=-1;side<=1;side+=2){
   const offset=(id==='trident'?13:5)*side;
   brush.nib(air,px-c*21-s*offset,py-s*21+c*offset,a+side*.19,24,4,style,alpha);
  }
  return;
 }
 brush.sweepEdge(ground,air,x,y,a,r,span,t,style,w,alpha);
 if(id==='twin-halberds'||id==='twin-swords')brush.sweepEdge(ground,air,x,y,a+.22,r*.74,span*.85,t,'gold',.61,alpha*.82);
 if(id==='halberd'||id==='guandao'||id==='ancient-saber'){
  const tip=a-span*.5+span*Math.min(1,t*2.7+.1),layer=Math.sin(tip)>0?ground:air;
  brush.nib(layer,x+Math.cos(tip)*r*.94,y+Math.sin(tip)*r*.94,tip+Math.PI/2,29*w,7*w,style,alpha);
 }
 if(id==='qinggang'||id==='yitian'||id==='seven-saber'){
  const lead=a-span*.5+span*Math.min(1,t*2.7+.1),mid=lead-.37;
  const layer=Math.sin(mid)>0?ground:air;
  if(id==='qinggang')brush.crescent(layer,x,y,r*.96,mid,.72,2.5,'silver',alpha,2);
  if(id==='yitian')brush.nib(layer,x+Math.cos(lead)*r*.93,y+Math.sin(lead)*r*.93,lead+1.3,33,5,'gold',alpha);
  if(id==='seven-saber')for(let j=0;j<3;j++){
   const at=lead-j*.17,rad=r*(.92-.03*j);
   brush.nib(layer,x+Math.cos(at)*rad,y+Math.sin(at)*rad,at+1.57,12,3,'violet',alpha);
  }
 }
 if(id==='pole'){
  const at=a-span*.5+span*Math.min(1,t*2.7+.1);
  for(let i=0;i<3;i++)brush.nib(air,x+Math.cos(at-i*.14)*r*.87,y+Math.sin(at-i*.14)*r*.87,at+1.1,13,3,'earth',alpha*.87);
 }
}

export function drawWeaponHit(g:Graphics,id:WeaponId,x:number,y:number,a:number,r:number,t:number):void {
 const {family,style,weight}=WEAPON_VFX[id],f=1-t,c=Math.cos(a),s=Math.sin(a);
 if(id==='sandal'){
  const heelX=x-c*r*.49,heelY=y-s*r*.49;
  brush.current(g,heelX,heelY,x+c*r*.77,y+s*r*.77,r*.18,r*.55*f,'gold',f,0);
  for(let i=-1;i<=1;i++){
   const at=r*i*.29;
   brush.stroke(g,x+c*(at-3)-s*4,y+s*(at-3)+c*4,x+c*(at+3)+s*4,y+s*(at+3)-c*4,2,'gold',f,2);
  }
 }else if(family==='wood'||family==='trap'){
  // A blunt hit compresses across the object before the short fibres splinter forward.
  brush.nib(g,x,y,a+Math.PI/2,1.7*r*f,5*f,style,f);
  for(let i=-1;i<=1;i++){const b=a+i*.8;brush.nib(g,x+Math.cos(b)*r*t,y+Math.sin(b)*r*t,b,16*f,3*f,style,f);}
 }else if(family==='blade'||family==='spear'||family==='orbit'){
  const b=family==='spear'?a:a+.78;
  brush.nib(g,x,y,b,r*(2+weight)*f,(4+weight*2)*f,style,f);
  brush.nib(g,x+c*r*t-s*5,y+s*r*t+c*5,b+1.35,r*f,3*f,'gold',f);
 }else if(family==='petals')brush.petals(g,x,y,r*.85,t,.8);
 else{
  const n=family==='gun'?2:3;
  for(let i=0;i<n;i++){const b=a+(i-(n-1)*.5)*.94;
   brush.nib(g,x+Math.cos(b)*r*t,y+Math.sin(b)*r*t,b,r*(1.3+weight)*f,4*f,style,f);}
 }
 // Tiny contact grain, entirely optional when the shared material pool is full.
 const key=family==='wood'||family==='cloth'||family==='trap'?'dirt':family==='wind'?'feather':family==='petals'?'petals':'hit';
 if(!pixel(g,key,x,y,r*(key==='dirt'?1.9:2.3),a,f*.80,t))material(g,'impact',x,y,r*1.14,r*.78,a,f*.57);
}

export function drawWeaponMuzzle(g:Graphics,id:WeaponId,x:number,y:number,a:number,t:number):void {
 const {family,style,weight}=WEAPON_VFX[id],f=1-t,c=Math.cos(a),s=Math.sin(a);
 if(family==='gun'||id==='rocket'){
  const len=(id==='shotgun'?49:id==='rocket'?38:26)*f;
  if(id==='shotgun'){
   const wave=13+26*t;
   brush.crescent(g,x,y,wave,a,1.20,7*f,'earth',f);
   brush.crescent(g,x,y,wave-1,a,1.06,2*f,'gold',f);
  }
  brush.nib(g,x+c*10,y+s*10,a,len,9*weight,style,f);
  for(let side=-1;side<=1;side+=2)brush.nib(g,x+c*7-s*side*4,y+s*7+c*side*4,a+side*.64,len*.58,3,style,f);
 }else if(family==='arrow'||family==='machine'){
  const arm=id==='heavy-crossbow'?22:15,notch=15*(1-t)*(1-t);
  for(let side=-1;side<=1;side+=2){
   const xx=x-s*side*arm,yy=y+c*side*arm;
   brush.current(g,xx,yy,x+c*12,y+s*12,-side*7,4,style,f);
   brush.stroke(g,xx,yy,x-c*notch,y-s*notch,1.6,'gold',f);
  }
  for(let side=-1;side<=1;side+=2)brush.stroke(g,x-c*7-s*side*(8+5*f),y-s*7+c*side*(8+5*f),x+c*8,y+s*8,2,style,f);
 }else if(family==='rune'||family==='vortex'||family==='wind'||family==='petals'){
  for(let i=0;i<3;i++)brush.crescent(g,x,y,11+8*t,a+i*TAU/3+t,.99,4*f,style,f);
 }else brush.nib(g,x,y,a,19*f,4*f,style,f);
}

export function drawWeaponFlight(g:Graphics,id:WeaponId,x:number,y:number,a:number,tier=1):void {
 if(id==='sandal')return; // The rotating shoe sprite is the projectile.
 const {family,style}=WEAPON_VFX[id],c=Math.cos(a),s=Math.sin(a),k=1+(tier-1)*.07;
 const px=x-c*8,py=y-s*8;
 if(id==='chain-hook'){
  for(let i=1;i<=3;i++){
   const d=11*i,xx=x-c*d,yy=y-s*d,bulge=(i%2?4.8:2.4);
   for(let side=-1;side<=1;side+=2)brush.current(g,xx-c*6,yy-s*6,xx+c*6,yy+s*6,side*bulge,1.8,'silver',.95);
  }
 }else if(family==='petals'||family==='wind'){
  const r=family==='wind'?30:16;
  for(let side=-1;side<=1;side+=2){
   const tipX=x-c*r*1.7-s*side*r*.63,tipY=y-s*r*1.7+c*side*r*.63;
   brush.current(g,x,y,tipX,tipY,side*r*.75,r*.27,style,.86);
  }
  for(let side=-1;side<=1;side+=2){
   brush.crescent(g,px-s*side*r,py+c*side*r,r*k,a-side*1.8,1.14,side>0?4:2.3,style,.86);
  }
 }else if(family==='arrow'||family==='gun'||family==='machine'){
  const len=id==='heavy-crossbow'?46:id==='shotgun'?17:29;
  brush.nib(g,px-c*8,py-s*8,a,len*k,id==='heavy-crossbow'?4.6:2.7,style,.86);
  if(id==='phoenix-bow'||id==='wood-kite')for(let side=-1;side<=1;side+=2)
   brush.nib(g,px-s*side*6,py+c*side*6,a-side*.45,25*k,4,style,.85);
 }else if(id==='rocket'||id==='firecracker'||id==='oil-jar'||id==='thunder-bomb'){
  const len=id==='rocket'?56:24;
  if(id==='rocket'){
   brush.current(g,x-c*4,y-s*4,x-c*74,y-s*74,5,12,'crimson',.9);
   brush.current(g,x-c*5,y-s*5,x-c*55,y-s*55,4,6,'gold',.95);
  }
  brush.nib(g,px-c*len*.32,py-s*len*.32,a,len*k,id==='rocket'?10:4,style,.94);
  brush.nib(g,px-c*len*.84,py-s*len*.84,a,len*.33,2.5,'gold',.76);
 }else if(family==='blade'||family==='spear'){
  brush.crescent(g,px,py,19*k,a,1.21,6,style,.86);
  brush.nib(g,px-c*14,py-s*14,a,28,3,style,.7);
 }else brush.nib(g,px,py,a,24*k,3,style,.8);
}

export function drawWeaponBurst(ground:Graphics,air:Graphics,id:WeaponId,x:number,y:number,r:number,t:number):void {
 const {style}=WEAPON_VFX[id],f=1-t;
 if(id==='peach'){
  pixel(air,'petals',x,y,r*1.8,0,f*.86,t);
  brush.petals(air,x,y,r,t,.82);
  for(let i=0;i<5;i++)brush.crescent(ground,x,y,r*(.28+.67*t),i*TAU/5+t,.75,7*f,'peach',f);
 }else if(id==='star-lamps'){
  for(let i=0;i<7;i++){
   const a=i*TAU/7,next=a+TAU*3/7,rad=r*(.69+.22*t),px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad;
   brush.stroke(ground,px,py,x+Math.cos(next)*rad,y+Math.sin(next)*rad,2,'gold',f*.63);
   const q=Math.min(1,t*1.65),tx=x+Math.cos(next)*rad,ty=y+Math.sin(next)*rad;
   brush.nib(ground,px+(tx-px)*q,py+(ty-py)*q,next,12*f,4*f,'gold',f);
   brush.firePlume(air,px,py,5*f,22*f,t*8+i,lampFlame);
  }
 }else{
  if(id==='rocket'||id==='firecracker'||id==='oil-jar'){
   const bloom=Math.min(1,t*6+.18);
   brush.fireCrown(ground,air,x,y,r*(.48+.50*bloom),t*1.9,bloom*f);
   pixel(air,id==='oil-jar'?'flame':'smoke',x,y,r*1.7,0,f*.88,t);
   for(let side=-1;side<=1;side+=2)brush.crescent(ground,x,y,r*(.22+.72*(1-f*f)),side*1.48,1.15,8*f,'earth',f);
   return;
  }
  if(id==='taiping-book'){
   pixel(ground,'rune',x,y,r*1.6,0,f*.84,t);
   pixel(air,'burst',x,y,r*1.4,0,f,t);
   const rad=r*(.72+.22*t);
   for(let i=0;i<4;i++){
    const a=Math.PI*.25+i*Math.PI*.5,c=Math.cos(a),s=Math.sin(a);
    brush.current(ground,x+c*rad,y+s*rad,x-s*rad,y+c*rad,0,4*f,'gold',f);
   }
   const height=42*f;
   brush.current(air,x-9,y+height,x+10,y+height*.6,-2,7*f,'gold',f);
   brush.current(air,x+10,y+height*.6,x-7,y,4,6*f,'gold',f,2);
   return;
  }
  brush.groundStrike(ground,air,x,y,r,t,style);
  if(id==='thunder'||id==='thunder-bomb'){
   const flash=Math.max(0,1-2.8*t);
   pixel(air,id==='thunder'?'lightning':'smoke',x,y,r*1.86,0,flash,t);
   if(flash>0)for(let i=0;i<3;i++){
    const offset=(i-1)*13,shift=i%2?-9:9;
    brush.stroke(air,x+offset+shift,y+64+10*i,x+offset-shift,y+34,4,style,flash);
    brush.stroke(air,x+offset-shift,y+34,x,y,2.5,style,flash,2);
   }
  }
 }
}

export function drawWeaponField(ground:Graphics,air:Graphics,id:WeaponId,x:number,y:number,r:number,life:number,next:number,clock:number):void {
 const f=Math.min(1,life/.2);
 if(id==='oil-jar'){
  brush.fireCrown(ground,air,x,y,r,clock,f);
  pixel(air,'whorl',x,y,r*.73,0,f*.73,(clock*3)%1);
 }else if(id==='caltrops'){
  for(let i=0;i<4;i++){const a=i*2.399,d=r*Math.sqrt((i+.5)/4)*.72,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
   for(let j=0;j<3;j++)brush.nib(ground,px,py,a+j*TAU/3,15,3,'silver',f);}
 }else if(id==='taiping-book'){
  if(next<=0||next>.25)return;
  const p=1-Math.min(1,next/.25);
  for(let i=0;i<4;i++)brush.crescent(ground,x,y,r*(.9-.55*p),i*TAU/4+p,.91,4,'gold',f);
  brush.nib(air,x,y+40*(1-p),-1.57,22,7,'gold',f);
 }else{
  pixel(ground,'rune',x,y,r*1.7,0,f*.73,(clock*2)%1);
  for(let i=0;i<8;i++){const a=i*TAU/8,c=Math.cos(a),s=Math.sin(a);
   const xx=x+c*r*.82,yy=y+s*r*.82;
   const b=a+TAU/8,q=(clock*.8+i/8)%1,tx=x+Math.cos(b)*r*.82,ty=y+Math.sin(b)*r*.82;
   brush.stroke(ground,xx,yy,tx,ty,2,'jade',f*.60);
   brush.nib(ground,xx+(tx-xx)*q,yy+(ty-yy)*q,b+1.18,9,3,'gold',f);
   brush.crescent(ground,x,y,r*.94,a,.63,3,'jade',f*.8);
   for(let j=-1;j<=1;j++){const px=xx+c*j*4,py=yy+s*j*4;
    brush.stroke(ground,px-s*7,py+c*7,px+s*7,py-c*7,2.4,'jade',f,j===0?2:1);}
  }
 }
}
