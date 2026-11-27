import {Graphics} from 'cc';
import {pixel} from './vfx-materials';
import * as b from './vfx-brush';

// A single contact beat drives the grip, blade trail and the existing damage window.
export const SIGNATURE_CONTACT = .35;
const readyAt = .19;
const clamp01 = (v:number):number => Math.min(1,Math.max(0,v));
const ease = (v:number):number => v*v*(3-2*v);
export function signatureDrive(t:number):number {
 if(t<readyAt)return -ease(t/readyAt)*.42;
 if(t<SIGNATURE_CONTACT)return -.42+1.42*ease((t-readyAt)/(SIGNATURE_CONTACT-readyAt));
 return 1-ease(clamp01((t-.43)/.52));
}

export interface SignatureGrip {x:number;y:number;angle:number;offX:number;offY:number;offAngle:number;}

/** The angles point along the blade/shaft. Wrist positions are in hero-local units. */
export function poseSignatureGrip(out:SignatureGrip,id:string,t:number,a:number,turn:number,side:number,
 idleX:number,idleY:number,offIdleY:number,axisY:number):void {
 const twin=id==='liubei',spear=id==='zhangfei';
 const load=ease(clamp01(t/.12)),returning=ease(clamp01((t-(spear?.49:.59))/(spear?.51:.41)));
 const mix=load*(1-returning),drive=signatureDrive(t),c=Math.cos(a),s=Math.sin(a);
 const snap=ease(clamp01((t-readyAt)/(.52-readyAt)));
 const mainReach=(twin?31:spear?29:26)+(twin?29:spear?43:23)*drive;
 const mainAcross=twin?turn*(24-8*snap):0;
 const offReach=twin?27+21*drive:mainReach-(spear?29:26);
 const offAcross=twin?-turn*(25-8*snap):0;
 out.x=idleX*(1-mix)+(c*mainReach-s*mainAcross)*mix;
 out.y=idleY*(1-mix)+(axisY+s*mainReach+c*mainAcross)*mix;
 // Both polearm fists stay on the rotated shaft.
 const sweep=spear?0:turn*((twin?1.20:1.45)-(twin?2.36:2.72)*snap);
 const mainAngle=a+sweep,offAngle=a-turn*(1.32-2.25*snap);
 out.offX=twin?-idleX*(1-mix)+(c*offReach-s*offAcross)*mix:
  out.x-Math.cos(mainAngle)*(spear?29:26)*mix-idleX*2*(1-mix);
 out.offY=twin?offIdleY*(1-mix)+(axisY+s*offReach+c*offAcross)*mix:
  out.y-Math.sin(mainAngle)*(spear?29:26)*mix+(offIdleY-idleY)*(1-mix);
 const idleAngle=Math.PI/2-side*Math.PI/15,offIdleAngle=Math.PI/2+side*Math.PI/15;
 out.angle=mainAngle+Math.atan2(Math.sin(idleAngle-mainAngle),Math.cos(idleAngle-mainAngle))*(1-mix);
 out.offAngle=offAngle+Math.atan2(Math.sin(offIdleAngle-offAngle),Math.cos(offIdleAngle-offAngle))*(1-mix);
}

export function drawSignatureEdge(g:Graphics,id:string,t:number,x:number,y:number,a:number,turn:number,offhand:boolean):void {
 const fade=clamp01((t-readyAt)/.14)*(1-ease(clamp01((t-.47)/.30)))*(offhand?.77:1);
 if(fade<.025)return;
 const jade=id==='guanyu',style=jade?'jade':'gold',r=jade?63:47;
 const span=(jade?.99:.78)*clamp01((t-readyAt)/.13),mid=a+turn*span*.40;
 b.crescent(g,x,y,r,mid,span,jade?16:10,style,fade*.94);
 b.crescent(g,x,y,r+1,mid,span*.88,jade?5:3,style,fade,2);
 if(jade||!offhand)pixel(g,'slash',x+Math.cos(a)*r,y+Math.sin(a)*r,jade?48:34,a+turn*Math.PI/2,fade*.64,t,1);
}

export function drawSignatureJab(g:Graphics,t:number,x:number,y:number,a:number,range:number):void {
 const fade=1-ease(clamp01((t-.39)/.29));
 if(t<SIGNATURE_CONTACT||fade<.025)return;
 const c=Math.cos(a),s=Math.sin(a),reach=range*(.93+.07*clamp01((t-SIGNATURE_CONTACT)/.1));
 const tx=x+c*reach,ty=y+s*reach;
 b.stream(g,tx,ty,a,reach*.58,13,'crimson',fade*.86);
 b.stream(g,tx-c*4,ty-s*4,a,reach*.47,5,'silver',fade);
 pixel(g,'thrust',x+c*reach*.46,y+s*reach*.46,reach*.47,a,fade*.76,t,1);
}

export function drawGrowthAttack(g:Graphics,id:string,phase:number,t:number,a:number,_range:number,lift:number,x=0,y=0,back:Graphics=g):void {
 if(id!=='guanyu'||phase!==2||t<SIGNATURE_CONTACT||t>.96)return;
 const p=(t-SIGNATURE_CONTACT)/.61,span=Math.PI*Math.min(1,.16+p*4.2);
 const f=Math.min(1,p*7)*(1-Math.min(1,p*.88)),cy=y+20+lift*.25;
 const center=a-Math.PI*.5+span*.5;
 b.crescent(back,x,cy,166,center,span*.97,19,'jade',f*.46);
 b.crescent(g,x,cy,200,center,span,35,'jade',f*.91,0);
 b.crescent(g,x,cy,198,center+.018,span*.97,26,'jade',f,1);
 b.crescent(g,x,cy,200,center+.021,span*.96,7,'jade',f,2);
 const tip=a-Math.PI*.5+span;
 pixel(g,'slash',x+Math.cos(tip)*141,cy+Math.sin(tip)*141,95,tip,f*.53,p,1);
}
export function drawSignatureFlight(g:Graphics,form:'wave'|'thrust',x:number,y:number,a:number,travel:number):void {
 const c=Math.cos(a),s=Math.sin(a);
 if(form==='wave'){
  b.crescent(g,x-c*48,y-s*48,49,a,2.36,17,'gold',.97);
  b.crescent(g,x-c*45,y-s*45,47,a,2.26,7,'silver',.97,2);
  for(let i=-1;i<=1;i+=2)b.stream(g,x-c*17-s*i*24,y-s*17+c*i*24,a,56,4,'gold',.65);
 }else{
  const length=Math.min(145,45+travel*.55);
  b.stream(g,x,y,a,travel+25,11,'crimson',.51);
  b.stream(g,x,y,a,travel+22,5,'gold',.66);
  b.stream(g,x,y,a,length,20,'crimson',.83);
  b.stream(g,x,y,a,length*.85,11,'silver',.98);
  pixel(g,'thrust',x-c*length,y-s*length,length,a,.86,travel/390,1);
  for(let i=-1;i<=1;i+=2)b.stream(g,x-c*19-s*i*15,y-s*19+c*i*15,a,length*.65,3,'gold',.82);
 }
}
export function drawMountDash(g:Graphics,id:string,x:number,y:number,a:number,remaining:number):void {if(remaining>0)b.mount(g,id,x,y,a,remaining,1);}
