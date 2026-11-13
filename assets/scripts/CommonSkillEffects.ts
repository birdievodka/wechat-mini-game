import {Graphics} from 'cc';
import {CombatParticles} from './combat-particles';
import {drawGoldenSweep,drawSweepContact} from './sweep-effects';
import * as art from './skill-vfx-art';
interface Visual {
 id:string;kind:string;x:number;y:number;angle:number;radius:number;age:number;life:number;tx:number;ty:number;
 count:number;active:boolean;priority:number;token:number;
}
export const SKILL_VISUAL_LIMIT=32;
const TAU=Math.PI*2;
const FOLLOW=new Set(['battle-haste','bow','sword-guard']);
const PERSISTENT=new Set(['battle-haste','bow','sword-guard','gates','fire-line','rain']);
/** One fixed pool and two shared layers; draw only reads simulation-owned state. */
export class CommonSkillEffects {
 private pool:Visual[]=Array.from({length:SKILL_VISUAL_LIMIT},()=>({id:'',kind:'',x:0,y:0,angle:0,radius:0,age:0,life:0,tx:0,ty:0,count:0,active:false,priority:0,token:0}));
 private visuals:Visual[]=[];
 private targets:readonly {e:{x:number;y:number;hp:number;kind?:string};life:number}[]=[];
 private clock=0;
 markTargets(targets:readonly {e:{x:number;y:number;hp:number};life:number}[]):void{this.targets=targets;}
 constructor(private particles:CombatParticles){}
 play(id:string,kind:string,x:number,y:number,angle:number,radius:number,life=.6,tx=x,ty=y):Visual|undefined {
  const priority=PERSISTENT.has(kind)?2:kind.endsWith('-hit')||kind==='contact'||kind==='haste-strike'?0:1;
  let v=this.pool.find(p=>!p.active);
  if(!v){v=this.visuals.find(p=>p.priority<=priority);if(!v)return;this.remove(v);}
  Object.assign(v,{id,kind,x,y,angle,radius,life,age:0,tx,ty,count:0,active:true,priority,token:0});this.visuals.push(v);
  if(kind==='sweep'||kind==='sweep-hit'){
   // G03: exact accepted A-version emission sequence and original draw functions.
   const contact=kind==='sweep-hit',count=contact?6:14;
   for(let i=0;i<count;i++){
    const a=contact?angle+(this.particles.random()-.5)*1.5:i*TAU/count,at=contact?0:radius*(.82+this.particles.random()*.14);
    this.particles.emit(x+Math.cos(a)*at,y+Math.sin(a)*at,contact?a:a-Math.PI/2,contact?95+this.particles.random()*110:50+this.particles.random()*70,.12+this.particles.random()*.16,contact?3+i%2:2.5+i%3,i%4===0?3:i%3===0?0:1,i%4===0?'chip':'spark',2,-90,3);
   }return v;
  }
  if(kind==='contact'||kind==='guard-hit'||kind==='lock-hit')this.emit(x,y,angle,kind==='contact'?4:6,id==='G19'||id==='G20'?10:id==='G12'||id==='G25'?9:1,'spark');
  else if(kind==='meteor')this.emit(x,y,angle,14,8,'dust');
  else if(kind==='lightning')this.emit(x,y,angle,7,10,'spark');
  return v;
 }
 private emit(x:number,y:number,a:number,count:number,tone:number,shape:'spark'|'dust'|'chip'):void{
  for(let i=0;i<count;i++){const angle=shape==='spark'?a+(this.particles.random()-.5)*1.5:i*TAU/count;
   this.particles.emit(x,y,angle,45+this.particles.random()*95,.15+this.particles.random()*.16,shape==='dust'?5:3,tone,shape,2,shape==='dust'?-25:-60,3);
  }
 }
 private remove(v:Visual):void{v.active=false;const i=this.visuals.indexOf(v);if(i>=0)this.visuals.splice(i,1);}
 setCount(kind:string,count:number):void{for(const v of this.visuals)if(v.kind===kind)v.count=count;}
 endpoint(id:string,x:number,y:number):void{for(const v of this.visuals)if(v.id===id&&v.kind==='dash'){v.tx=x;v.ty=y;}}
 flight(token:number,x:number,y:number,angle:number,alive:boolean):void{
  let v=this.visuals.find(v=>v.kind==='flight'&&v.token===token);
  if(!alive){if(v)this.remove(v);return;}
  if(!v){v=this.play('G08','flight',x,y,angle,100,.6);if(!v)return;v.token=token;}
  v.x=x;v.y=y;v.angle=angle;
 }
 /** Haste accents only accompany real weapon releases, at most one accent per 70ms. */
 weaponStrike(x:number,y:number,angle:number):void{
  if(this.clock<.07||!this.visuals.some(v=>v.kind==='battle-haste'))return;
  this.clock=0;this.play('G07','haste-strike',x,y,angle,60,.13);
 }
 aimBow(angle:number):void{for(const v of this.visuals)if(v.kind==='bow')v.angle=angle;}
 track(_x:number,_y:number,_angle:number,_dt:number):void{}
 update(dt:number):void{
  if(dt<=0)return;this.clock+=dt;let n=0;
  for(const v of this.visuals){v.age+=dt;if(v.age<v.life){this.visuals[n++]=v;continue;}v.active=false;}
  this.visuals.length=n;
 }
 clear():void{for(const v of this.visuals)v.active=false;this.visuals.length=0;this.targets=[];this.clock=0;}
 stop(kind:string):void{for(let i=this.visuals.length-1;i>=0;i--)if(this.visuals[i].kind===kind)this.remove(this.visuals[i]);}
 draw(ground:Graphics,air:Graphics,cx:number,cy:number,hw:number,hh:number,px:number,py:number):void {
  for(const v of this.visuals){
   if(v.age>=v.life)continue;
   const f=PERSISTENT.has(v.kind)?Math.min(1,(v.life-v.age)/.22):Math.max(0,1-v.age/v.life);
   const x=FOLLOW.has(v.kind)?px:v.x,y=FOLLOW.has(v.kind)?py:v.y,r=v.radius;
   if(Math.abs(x-cx)>hw+r+400||Math.abs(y-cy)>hh+r+400)continue;
   if(v.kind==='sweep')drawGoldenSweep(ground,air,x,y,v.angle,r,v.age,v.life);
   else if(v.kind==='sweep-hit')drawSweepContact(ground,air,x,y,v.angle,r,v.age,v.life);
   else if(v.kind==='contact'||v.kind==='guard-hit')art.drawSkillContact(air,x,y,v.angle,v.age,v.life,v.id==='G19'||v.id==='G20'?10:v.id==='G12'||v.id==='G25'?9:1);
   else if(v.kind==='lock-hit')art.drawLockHit(air,x,y,v.age,v.life);
   else if(v.kind==='flight'||v.kind==='arrow')art.drawFlight(air,x,y+24,v.angle,f);
   else if(v.kind==='bow')art.drawBow(ground,air,x,y,v.angle,v.age,v.life);
   else if(v.kind==='dash')art.drawDash(ground,air,x,y,v.tx,v.ty,v.angle,v.age,v.life);
   else if(v.kind==='battle-haste')art.drawBattleHaste(ground,air,x,y,v.age,f);
   else if(v.kind==='haste-strike')art.drawHasteStrike(air,x,y,v.angle,v.age,v.life);
   else if(v.kind==='fire-line')art.drawFireLine(ground,air,x,y,r,v.age,v.life);
   else if(v.kind==='water')art.drawWave(ground,air,x,y,r,v.age,v.life);
   else if(v.kind==='gates')art.drawGates(ground,air,x,y,r,v.age,f);
   else if(v.kind==='lightning'||v.kind==='lightning-pre')art.drawLightning(ground,air,x,y,r,v.age,v.life,v.kind==='lightning-pre');
   else if(v.kind==='meteor'||v.kind==='meteor-fall')art.drawMeteor(ground,air,x,y,r,v.age,v.life,v.kind==='meteor-fall');
   else if(v.kind==='rain')art.drawRain(ground,air,x,y,r,v.age,v.life);
   else if(v.kind==='sword-guard')art.drawGuard(ground,air,x,y,r,v.angle,v.age,f,v.count);
   else if(v.kind==='stun')art.drawStun(ground,air,x,y,r,v.age,v.life);
  }
  for(const mark of this.targets)if(mark.e.hp>0&&mark.life>0&&Math.abs(mark.e.x-cx)<hw+80&&Math.abs(mark.e.y-cy)<hh+150)art.drawStunMark(air,mark.e.x,mark.e.y+(mark.e.kind==='chief'?45:0),5-mark.life,Math.min(1,mark.life/.2));
 }
}
