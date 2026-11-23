import {Graphics} from 'cc';
import * as b from './vfx-brush';
/** One signature slot. Three release phases still resolve in GameBootstrap, never in the renderer. */
export function drawGrowthAttack(g:Graphics,id:string,phase:number,t:number,a:number,r:number,lift:number,offsetX=0,offsetY=0):void {
 if(t<.15||t>.94)return;const p=(t-.15)/.79,f=Math.sin(p*Math.PI),x=offsetX,y=offsetY+20+lift*.25,c=Math.cos(a),s=Math.sin(a);
 if(id==='liubei'&&phase===2){
  const xx=x+c*r*.65,yy=y+s*r*.65,len=r*.95;
  for(let i=-1;i<=1;i+=2)b.stream(g,xx+Math.cos(a+i*.65)*len*.5,yy+Math.sin(a+i*.65)*len*.5,a+i*.65,len,12,'gold',f);
  b.nib(g,xx,yy,a+.72,45,7,'gold',f);
 }else if(id==='guanyu'){
  b.sweepEdge(g,g,x,y,a+(phase===1?-.25:.25),r*(phase===2?1.15:1),Math.min(220,phase===2?190:140)*Math.PI/180,p,'jade',phase===2?1.3:.8,f);
  if(phase===2)b.nib(g,x+c*r*.85,y+s*r*.85,a,57,14,'jade',f);
 }else if(id==='zhangfei'){
  if(phase===2){b.groundStrike(g,g,x+c*45,y+s*45,125,p,'crimson',a);}
  else if(phase===0)b.stream(g,x+c*r,y+s*r,a,r,12,'silver',f);
  else b.sweepEdge(g,g,x,y,a,r,120*Math.PI/180,p,'silver',1,f);
 }else b.sweepEdge(g,g,x,y,a+(phase?-.3:.3),r,1.6,p,'gold',.8,f);
}
export function drawMountDash(g:Graphics,id:string,x:number,y:number,a:number,remaining:number):void {if(remaining>0)b.mount(g,id,x,y,a,remaining,1);}
