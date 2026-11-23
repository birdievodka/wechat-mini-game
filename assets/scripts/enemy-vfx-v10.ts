import {Graphics} from 'cc';
import {enemyActionSpec} from './enemy-actions';
import * as b from './vfx-brush';
import {material} from './vfx-materials';
// Repeated arrow draws use constant keys; no per-frame RegExp/slice/string construction.
const SPECS:Record<string,ReturnType<typeof enemyActionSpec>>={};
for(let i=1;i<=40;i++){const id='E'+('0'+i).slice(-2);SPECS[id]=enemyActionSpec(id);}
export function drawNpcAttack(g:Graphics,id:string,x:number,y:number,time:number,a:number,windup:number,range:number):void {
 if(time<0)return;const spec=SPECS[id]||SPECS.E01,kind=spec.kind,p=time/windup,c=Math.cos(a),s=Math.sin(a),h=spec.mounted?76:52;
 if(time<windup){
  if(p<.3)return;
  if(kind==='cast'||kind==='support'){
   const style=id==='E10'?'jade':id==='E40'?'violet':'gold';for(let i=0;i<3;i++){const at=i*Math.PI*2/3+time*2;b.stream(g,x+Math.cos(at)*17,y+h+Math.sin(at)*12,at+Math.PI/2,12,2,style,p*.65);}
  }else {for(let i=0;i<2;i++){const at=a+(i?1:-1)*.7;b.stream(g,x+c*17,y+h,at,8+7*p,1.8,'gold',p*.8);}}
  return;
 }
 const t=(time-windup)/.18,f=Math.max(0,1-t);
 if(kind==='charge'){
  if(time-windup>.55)return;b.mount(g,id==='E21'?'zhangfei':id==='E20'?'liubei':'guanyu',x,y-8,a,time,.6);return;
 }
 if(f<=0)return;
 if(kind==='slash'||kind==='heavy'){
  const span=(id==='E08'?100:id==='E02'?110:120)*Math.PI/180;
  b.blade(g,g,x,y,a,range,span,t,f,kind==='heavy'?'earth':id==='E08'?'crimson':'gold',kind==='heavy'?.8:.5);
 }else if(kind==='thrust')b.stream(g,x+c*range,y+s*range,a,range,8,'silver',f);
 else if(kind==='support'){
  material(g,id==='E10'?'heal':'guard',x,y+38,44,48,0,f*.7);
 }else if(kind==='cast'){
  material(g,id==='E40'?'ink':'impact',x+c*20,y+h,42,42,a,f*.8);b.stream(g,x+c*23,y+h+s*23,a,24,5,id==='E40'?'violet':'gold',f*.7);
 }else b.stream(g,x+c*36,y+h+s*36,a,kind==='gun'||kind==='machine'?38:20,kind==='gun'?7:3,kind==='gun'||kind==='machine'?'crimson':'gold',f);
}
export function drawEnemyFlight(g:Graphics,id:string,x:number,y:number,a:number):void {
 const spec=SPECS[id]||SPECS.E11,kind=spec.kind;
 if(id==='E28'){b.stream(g,x,y,a,33,3,'jade',.6);return;}
 if(kind==='machine'){b.stream(g,x,y,a,60,7,id==='E37'?'crimson':'earth',.8);return;}
 if(kind==='gun')b.stream(g,x,y,a,42,3,'crimson',.8);
 else if(kind==='throw')b.stream(g,x,y,a,29,4,id==='E29'?'crimson':'silver',.65);
 else b.stream(g,x,y,a,id==='E14'?48:30,id==='E14'?4:2,'gold',.65);
}
interface Zone {x:number;y:number;radius:number;age:number;delay:number;fired:boolean;shape?:string;innerRadius?:number;angle?:number;arc?:number;length?:number;duration?:number;theme?:string;fake?:boolean;}
/** Exact danger geometry stays under actors; release is a material, never an opaque fan/rectangle. */
export function drawEnemyZone(ground:Graphics,air:Graphics,z:Zone):void {
 const {x,y,radius:r}=z,a=z.angle||0,warning=z.age<z.delay,p=b.clampVfx(z.age/z.delay),elapsed=z.age-z.delay,duration=z.duration||.55,t=b.clampVfx(elapsed/duration),f=1-t;
 if(z.shape==='line'){
  const half=(z.length||260)/2,c=Math.cos(a),s=Math.sin(a);
  if(warning){for(let i=-1;i<=1;i+=2)b.stroke(ground,x-c*half-s*r*i,y-s*half+c*r*i,x+c*half-s*r*i,y+s*half+c*r*i,2,'crimson',.25+p*.6);}
  else {b.stream(air,x+c*half,y+s*half,a,half*2,r*.65,'silver',f);material(air,'silver',x,y,r*3,half*1.4,a-Math.PI/2,f*.6,1);}return;
 }
 if(z.shape==='sector'){
  const span=(z.arc||120)*Math.PI/180;
  if(warning){for(let i=0;i<12;i++){const at=a-span*.5+span*i/12,c=Math.cos(at),s=Math.sin(at);b.stroke(ground,x+c*(r-4),y+s*(r-4),x+Math.cos(at+span/24)*r,y+Math.sin(at+span/24)*r,2,'crimson',.3+p*.55);}}
  else if(z.theme==='fire'){for(let i=0;i<4;i++){const at=a-span*.35+span*.7*i/3;b.flame(ground,air,x+Math.cos(at)*r*.65,y+Math.sin(at)*r*.65,r*.26,z.age+i,f,true);}}
  else b.blade(ground,air,x,y,a,r,span,t,f,'crimson',1);
  return;
 }
 if(z.shape==='ring'){
  const start=a+(z.arc||0)*Math.PI/360,span=Math.PI*2-(z.arc||0)*Math.PI/180;
  for(let i=0;i<12;i++){const at=start+span*i/12; if(warning)b.stroke(ground,x+Math.cos(at)*r,y+Math.sin(at)*r,x+Math.cos(at+span/24)*r,y+Math.sin(at+span/24)*r,2,'crimson',.3+p*.6);else b.blade(ground,air,x,y,at+span/24,r,span/16,t,f,'violet',.8);}return;
 }
 if(warning){b.warning(ground,x,y,r,p,z.fake?'earth':'crimson');if(z.theme==='mini-quake')material(air,'stone',x,y+80*(1-p),r,r,0,p*.5,1);return;}
 if(z.theme==='mini-quake')b.groundStrike(ground,air,x,y,r,t,'earth',a);
 else if(z.theme==='fire')b.flame(ground,air,x,y,r,z.age,f,true);
 else {b.shock(ground,air,x,y,r,t,'earth');material(air,'stone',x,y,r*1.7,r*1.2,0,f*.75,1);b.dust(ground,x,y,r,t,.7);}
}
export function drawBirthDust(g:Graphics,x:number,y:number,p:number):void {if(p<.2)return;b.dust(g,x,y,25+15*p,p,.75);}
export function drawEliteAttack(g:Graphics,stage:number,x:number,y:number,a:number,time:number,phase:number):void {
 if(time<0)return;
 if(stage===4||stage===5&&phase%2===1){if(time>=.9&&time<1.62){const c=Math.cos(a),s=Math.sin(a);b.stream(g,x+c*38,y+45+s*38,a,stage===5?125:95,stage===5?28:17,stage===5?'gold':'crimson',.9);b.crescent(g,x-c*23,y-s*23,22+18*((time*5)%1),a+Math.PI,.95,6,'earth',.72);}return;}
 if(stage===3){for(let i=0;i<3;i++){const t=(time-.85-i*.5)/.2;if(t>=0&&t<=1){const d=104+41*Math.min(1,t*4);b.nib(g,x+Math.cos(a)*d,y+Math.sin(a)*d,a,51,9,'silver',1-t);}}}
}
