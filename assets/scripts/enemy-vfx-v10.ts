import {Graphics,Sprite,SpriteFrame,UITransform} from 'cc';
import {enemyActionSpec} from './enemy-actions';
import * as b from './vfx-brush';
import {material,pixel,PixelMotif} from './vfx-materials';
import {PIXEL_MOTIFS} from './pixelfx-layout';
// Repeated arrow draws use constant keys; no per-frame RegExp/slice/string construction.
const SPECS:Record<string,ReturnType<typeof enemyActionSpec>>={};
for(let i=1;i<=40;i++){const id='E'+('0'+i).slice(-2);SPECS[id]=enemyActionSpec(id);}
const ARROWS:Readonly<Record<string,PixelMotif>>={E11:'arrowWhite',E12:'arrowBlue',E13:'arrowPurple',E14:'arrowGold',E22:'arrowGreen',E23:'arrowRed',E35:'arrowGold',repeater:'arrowBlue','phoenix-bow':'arrowRed','heavy-crossbow':'arrowGold','wood-ox':'arrowGold'};
export const courierSpear=(id:string):boolean=>id==='E15'||id==='E16';
export function applyArrowArt(sprite:Sprite,id:string,frames:Readonly<Record<string,SpriteFrame>>,vertical=false):void {
 sprite.node.angle=0;
 const theme=ARROWS[id];if(!theme)return;
 const [name,,ox,oy,ratio]=PIXEL_MOTIFS[theme],frame=frames[name];
 if(!frame)return;
 const w=id==='E14'||id==='E35'||id==='heavy-crossbow'?76:60,h=w*ratio;
 sprite.spriteFrame=frame;
 sprite.node.getComponent(UITransform)!.setContentSize(w,h);
 const x=w*(.5-ox)+20,y=h*(oy-.5);
 sprite.node.setPosition(vertical?-y:x,vertical?x:y);
 sprite.node.angle=vertical?90:0;
}
export function drawNpcAttack(g:Graphics,id:string,x:number,y:number,time:number,a:number,windup:number,range:number,heavyGrunt=false):void {
 if(time<0)return;const spec=SPECS[id]||SPECS.E01,kind=spec.kind,p=time/windup,c=Math.cos(a),s=Math.sin(a),h=spec.mounted?76:52;
 if(time<windup){
  if(p<.3)return;
  if(kind==='cast'||kind==='support'){
   const style=id==='E10'?'jade':id==='E40'?'violet':'gold';for(let i=0;i<3;i++){const at=i*Math.PI*2/3+time*2;b.stream(g,x+Math.cos(at)*17,y+h+Math.sin(at)*12,at+Math.PI/2,12,2,style,p*.65);}
  }else {for(let i=0;i<2;i++){const at=a+(i?1:-1)*.7;b.stream(g,x+c*17,y+h,at,8+7*p,1.8,'gold',p*.8);}}
  return;
 }
 const t=(time-windup)/.24,f=Math.max(0,1-t);
 if(kind==='charge'){
  if(time-windup>.9)return;
  const phase=(time*3.8)%1;
  pixel(g,id==='E24'?'claw':id==='E21'?'spirit':'dirt',x-c*22,y-s*22,66,0,.66,phase);
  b.mount(g,id==='E21'?'zhangfei':id==='E20'?'liubei':'guanyu',x,y-8,a,time,.6);return;
 }
 if(f<=0)return;
 if(kind==='slash'||kind==='heavy'){
  const span=(id==='E08'?100:id==='E02'?110:120)*Math.PI/180;
  const reach=range*(.50+.27*Math.min(1,t*2));
  const xx=x+c*reach,yy=y+s*reach+20;
  pixel(g,heavyGrunt||kind==='heavy'?'dirt':id==='E27'?'leaf':'slash',xx,yy,kind==='heavy'?80:60,a,f*.88,t);
  if(id==='E05')b.blade(g,g,x,y+12,a,range*.82,span*.87,t,f,'silver',.45);
  b.blade(g,g,x,y,a,range,span,t,f,kind==='heavy'?'earth':id==='E08'?'crimson':'gold',kind==='heavy'?.8:.5);
 }else if(kind==='thrust'){b.stream(g,x+c*range,y+s*range,a,range,8,'silver',f);pixel(g,'thrust',x+c*range*.26,y+s*range*.26+12,range*.8,a,f*.87,t);}
 else if(kind==='support'){
  pixel(g,id==='E10'?'heal':'charge',x,y+26,91,0,f*.8,t);
 }else if(kind==='cast'){
  pixel(g,id==='E40'?'purpleRune':id==='E30'?'flame':'burst',x+c*20,y+h,58,0,f*.83,t);b.stream(g,x+c*23,y+h+s*23,a,24,5,id==='E40'?'violet':'gold',f*.7);
 }else b.stream(g,x+c*36,y+h+s*36,a,kind==='gun'||kind==='machine'?38:20,kind==='gun'?7:3,kind==='gun'||kind==='machine'?'crimson':'gold',f);
}
export function drawEnemyFlight(g:Graphics,id:string,x:number,y:number,a:number):void {
 const spec=SPECS[id]||SPECS.E11,kind=spec.kind;
 if(courierSpear(id)){
  const c=Math.cos(a),s=Math.sin(a),shade=id==='E16'?'jade':'silver';
  b.stroke(g,x-c*36,y-s*36,x+c*12,y+s*12,3.8,'earth',.98);
  b.stroke(g,x-c*34-s,y-s*34+c,x+c*11-s,y+s*11+c,1.2,'gold',.86);
  b.nib(g,x+c*12,y+s*12,a,24,4.5,shade,.98);
  b.stream(g,x+c*6,y+s*6,a,28,4,id==='E16'?'gold':'crimson',.82);
  return;
 }
 if(id==='E28'){b.stream(g,x,y,a,33,3,'jade',.6);return;}
 if(kind==='machine'){b.stream(g,x,y,a,60,7,id==='E37'?'crimson':'earth',.8);return;}
 if(kind==='gun')b.stream(g,x,y,a,42,3,'crimson',.8);
 else if(kind==='throw')b.stream(g,x,y,a,29,4,id==='E29'?'crimson':'silver',.65);
 else b.stream(g,x,y,a,id==='E14'?48:30,id==='E14'?4:2,'gold',.65);
}
interface Zone {source?:{archetype?:string;x:number;y:number};x:number;y:number;radius:number;age:number;delay:number;fired:boolean;shape?:string;innerRadius?:number;angle?:number;arc?:number;length?:number;duration?:number;theme?:string;fake?:boolean;}
/** Exact danger geometry stays under actors; release is a material, never an opaque fan/rectangle. */
export function drawEnemyZone(ground:Graphics,air:Graphics,z:Zone):void {
 const {x,y,radius:r}=z,a=z.angle||0,warning=z.age<z.delay,p=b.clampVfx(z.age/z.delay),elapsed=z.age-z.delay,duration=z.duration||.55,t=b.clampVfx(elapsed/duration),f=1-t;
 const id=z.source?.archetype;
 if(id==='E40'){
  const lane=z.theme==='chess-white',style=lane?'silver':'violet';
  if(warning){
   b.warning(ground,x,y,r,p,style);
   pixel(ground,lane?'rune':'purpleRune',x,y,r*1.65,0,p*.83,p);
   const lift=(1-p*p)*120;
   b.nib(air,x,y+lift+23,0,28,12,style,.97);
  }else{
   b.groundStrike(ground,air,x,y,r,t,style);
   pixel(air,lane?'burst':'spirit',x,y,96,0,f,t,1);
  }
  return;
 }
 if(z.shape==='line'){
  const half=(z.length||260)/2,c=Math.cos(a),s=Math.sin(a);
  if(warning){for(let i=-1;i<=1;i+=2)b.stroke(ground,x-c*half-s*r*i,y-s*half+c*r*i,x+c*half-s*r*i,y+s*half+c*r*i,2,'crimson',.25+p*.6);}
  else {b.stream(air,x+c*half,y+s*half,a,half*2,r*.65,'silver',f);material(air,'silver',x,y,r*3,half*1.4,a-Math.PI/2,f*.6,1);}return;
 }
 if(z.shape==='sector'){
  const span=(z.arc||120)*Math.PI/180;
  if(warning){for(let i=0;i<12;i++){const at=a-span*.5+span*i/12,c=Math.cos(at),s=Math.sin(at);b.stroke(ground,x+c*(r-4),y+s*(r-4),x+Math.cos(at+span/24)*r,y+Math.sin(at+span/24)*r,2,'crimson',.3+p*.55);}}
  else if(z.theme==='fire'){for(let i=0;i<4;i++){const at=a-span*.35+span*.7*i/3,px=x+Math.cos(at)*r*.65,py=y+Math.sin(at)*r*.65;b.flame(ground,air,px,py,r*.26,z.age+i,f,true);if(i%2===0)pixel(air,'flame',px,py,95,0,f,t,1);}}
  else b.blade(ground,air,x,y,a,r,span,t,f,'crimson',1);
  return;
 }
 if(z.shape==='ring'){
  const start=a+(z.arc||0)*Math.PI/360,span=Math.PI*2-(z.arc||0)*Math.PI/180;
  for(let i=0;i<12;i++){const at=start+span*i/12; if(warning)b.stroke(ground,x+Math.cos(at)*r,y+Math.sin(at)*r,x+Math.cos(at+span/24)*r,y+Math.sin(at+span/24)*r,2,'crimson',.3+p*.6);else b.blade(ground,air,x,y,at+span/24,r,span/16,t,f,'violet',.8);}return;
 }
 if(warning){
  b.warning(ground,x,y,r,p,z.fake?'earth':'crimson');
  if(id==='E29'||id==='E33'||id==='E36'||id==='E37'||id==='E38'){
   const from=z.source!,u=Math.max(0,(p-.22)/.78),q=1-u;
   const xx=x+(from.x-x)*q,yy=y+(from.y-y)*q+Math.sin(u*Math.PI)*125+q*35;
   const oil=id==='E29'||id==='E38',tone=oil?'crimson':id==='E37'?'violet':'earth';
   if(u>0){b.nib(air,xx,yy,3*u,oil?32:44,oil?15:19,tone,.9);b.stream(air,xx,yy,.18,60,6,tone,.52);}
  }
 if(z.theme==='mini-quake')material(air,'stone',x,y+80*(1-p),r,r,0,p*.5,1);return;}
 if(z.theme==='mini-quake')b.groundStrike(ground,air,x,y,r,t,'earth',a);
 else if(z.theme==='fire'){
  if(id==='E33'||id==='E34'||id==='E36'||id==='E37')b.groundStrike(ground,air,x,y,r,t,id==='E36'?'earth':'crimson',a);
  else b.flame(ground,air,x,y,r,z.age,f,true);
  pixel(air,id==='E36'?'dirt':id==='E33'||id==='E34'||id==='E37'?'smoke':'whorl',x,y,r*1.70,0,f,t,1);
 }
 else {b.shock(ground,air,x,y,r,t,'earth');material(air,'stone',x,y,r*1.7,r*1.2,0,f*.75,1);b.dust(ground,x,y,r,t,.7);}
}
export function drawBirthDust(g:Graphics,x:number,y:number,p:number):void {if(p<.2)return;b.dust(g,x,y,25+15*p,p,.75);}
export function drawEliteAttack(g:Graphics,stage:number,x:number,y:number,a:number,time:number,phase:number):void {
 if(time<0)return;
 if(stage===4||stage===5&&phase%2===1){if(time>=.9&&time<1.62){const c=Math.cos(a),s=Math.sin(a);b.stream(g,x+c*38,y+45+s*38,a,stage===5?125:95,stage===5?28:17,stage===5?'gold':'crimson',.9);b.crescent(g,x-c*23,y-s*23,22+18*((time*5)%1),a+Math.PI,.95,6,'earth',.72);}return;}
 if(stage===3){for(let i=0;i<3;i++){const t=(time-.85-i*.5)/.2;if(t>=0&&t<=1){const d=104+41*Math.min(1,t*4);b.nib(g,x+Math.cos(a)*d,y+Math.sin(a)*d,a,51,9,'silver',1-t);}}}
}
