import {Graphics} from 'cc';
import {CombatParticles} from './combat-particles';
import {drawGoldenSweep,drawSweepContact} from './sweep-effects';
import * as art from './skill-vfx-art';

interface Visual {
 id:string;kind:string;x:number;y:number;angle:number;radius:number;age:number;life:number;tx:number;ty:number;
 count:number;active:boolean;priority:number;moving:boolean;clock:number;paperAngles:Float32Array;paperShots:Float32Array;
}
export const SKILL_VISUAL_LIMIT=32;
const TAU=Math.PI*2;
const FOLLOW=new Set(['shield','cleanse','barrier','damage-buff','haste-buff','speed-buff','heal','catch']);
const PERSISTENT=new Set(['shield','cleanse','barrier','damage-buff','haste-buff','speed-buff','catch','summon','escape','decoy','gates','song']);
/** Shared bounded pool. Only simulation/events mutate it; draw never emits or advances time. */
export class CommonSkillEffects {
 private pool:Visual[]=Array.from({length:SKILL_VISUAL_LIMIT},()=>({id:'',kind:'',x:0,y:0,angle:0,radius:0,age:0,life:0,tx:0,ty:0,count:0,active:false,priority:0,moving:false,clock:0,paperAngles:new Float32Array(3),paperShots:new Float32Array(3)}));
 private visuals:Visual[]=[];
 private lastX=0;private lastY=0;private positioned=false;
 private targets:readonly {e:{x:number;y:number;hp:number};life:number}[]=[];
 markTargets(targets:readonly {e:{x:number;y:number;hp:number};life:number}[]):void{this.targets=targets;}
 constructor(private particles:CombatParticles){}
 play(id:string,kind:string,x:number,y:number,angle:number,radius:number,life=.6,tx=x,ty=y):void {
  const priority=PERSISTENT.has(kind)?2:kind.endsWith('-hit')||kind==='contact'||kind==='song-mark'?0:1;
  let v=this.pool.find(p=>!p.active);
  if(!v){v=this.visuals.find(p=>p.priority<=priority);if(!v)return;this.remove(v);}
  Object.assign(v,{id,kind,x,y,angle,radius,life,age:0,tx,ty,count:kind==='shield'?(id==='G09'?1:2):0,active:true,priority,moving:false,clock:0});
  v.paperAngles.fill(0);v.paperShots.fill(9);this.visuals.push(v);
  if(kind==='sweep'||kind==='sweep-hit'){
   // Preserve G03's exact emission sequence and geometry.
   const contact=kind==='sweep-hit',count=contact?6:14;
   for(let i=0;i<count;i++){
    const a=contact?angle+(this.particles.random()-.5)*1.5:i*TAU/count,at=contact?0:radius*(.82+this.particles.random()*.14);
    this.particles.emit(x+Math.cos(a)*at,y+Math.sin(a)*at,contact?a:a-Math.PI/2,contact?95+this.particles.random()*110:50+this.particles.random()*70,.12+this.particles.random()*.16,contact?3+i%2:2.5+i%3,i%4===0?3:i%3===0?0:1,i%4===0?'chip':'spark',2,-90,3);
   }return;
  }
  // No generic burst at every cast: emission has a semantic source and a small fixed budget.
  if(kind==='contact'||kind==='shield-hit')this.emit(x,y,angle,kind==='contact'?4:6,id==='G19'||id==='G20'?10:id==='G12'||id==='G16'?9:1,'spark');
  else if(kind==='fire'||kind==='decoy-burst')this.emit(x,y,angle,10,kind==='fire'?7:2,kind==='fire'?'spark':'chip');
  else if(kind==='meteor')this.emit(x,y,angle,14,8,'dust');
  else if(kind==='lightning')this.emit(x,y,angle,7,10,'spark');
  else if(kind==='cleanse')this.emit(x,y-12,angle,5,8,'dust');
  else if(kind==='heal')this.emit(x,y+20,angle,6,5,'petal');
 }
 private emit(x:number,y:number,a:number,count:number,tone:number,shape:'spark'|'dust'|'chip'|'petal'):void{
  for(let i=0;i<count;i++){const angle=shape==='spark'?a+(this.particles.random()-.5)*1.5:i*TAU/count;
   this.particles.emit(x,y,angle,45+this.particles.random()*95,.15+this.particles.random()*.16,shape==='dust'?5:3,tone,shape,2,shape==='dust'?-25:-60,3);
  }
 }
 private remove(v:Visual):void{v.active=false;const i=this.visuals.indexOf(v);if(i>=0)this.visuals.splice(i,1);}
 setCount(kind:string,count:number):void{for(const v of this.visuals)if(v.kind===kind)v.count=count;}
 endpoint(id:string,x:number,y:number):void{for(const v of this.visuals)if(v.id===id&&v.kind==='dash'){v.tx=x;v.ty=y;}}
 paperShot(index:number,angle:number):void{for(const v of this.visuals)if(v.kind==='summon'){v.paperAngles[index]=angle;v.paperShots[index]=0;}}
 /** Track physical motion during simulation, never infer it in draw or from decoration. */
 track(x:number,y:number,angle:number,dt:number):void{
  const moving=this.positioned&&Math.hypot(x-this.lastX,y-this.lastY)>Math.max(.001,dt*.5);
  for(const v of this.visuals)if(v.kind==='speed-buff'){
   v.moving=moving;v.angle=angle;v.clock+=dt;
   if(moving&&v.clock>=.08){v.clock=0;this.particles.emit(x,y-15,angle+Math.PI,45,.18,3,9,'dust',0,-10,4);}
  }
  this.lastX=x;this.lastY=y;this.positioned=true;
 }
 update(dt:number):void{
  if(dt<=0)return;let n=0;
  for(const v of this.visuals){v.age+=dt;for(let i=0;i<3;i++)v.paperShots[i]+=dt;
   if(v.age<v.life){this.visuals[n++]=v;continue;}
   v.active=false;
   if(v.kind==='escape'||v.kind==='summon')this.emit(v.x,v.y+20,0,6,0,'chip');
  }
  this.visuals.length=n;
 }
 clear():void{for(const v of this.visuals)v.active=false;this.visuals.length=0;this.positioned=false;this.targets=[];}
 stop(kind:string):void{for(let i=this.visuals.length-1;i>=0;i--)if(this.visuals[i].kind===kind)this.remove(this.visuals[i]);}
 draw(ground:Graphics,air:Graphics,cx:number,cy:number,hw:number,hh:number,px:number,py:number):void {
  for(const v of this.visuals){
   if(v.age>=v.life)continue;
   const t=v.age/v.life,f=PERSISTENT.has(v.kind)?Math.min(1,(v.life-v.age)/.22):Math.max(0,1-t);
   const x=FOLLOW.has(v.kind)?px:v.x,y=FOLLOW.has(v.kind)?py:v.y,r=v.radius;
   if(Math.abs(x-cx)>hw+r+400||Math.abs(y-cy)>hh+r+400)continue;
   if(v.kind==='sweep')drawGoldenSweep(ground,air,x,y,v.angle,r,v.age,v.life);
   else if(v.kind==='sweep-hit')drawSweepContact(ground,air,x,y,v.angle,r,v.age,v.life);
   else if(v.kind==='contact'||v.kind==='shield-hit')art.drawSkillContact(air,x,y,v.angle,v.age,v.life,v.id==='G19'||v.id==='G20'?10:v.id==='G12'||v.id==='G16'?9:1);
   else if(v.kind==='arrow'){
    const length=Math.hypot(v.tx-x,v.ty-y),c=Math.cos(v.angle),s=Math.sin(v.angle);
    // Immediate line damage retains a full-length streak; arrow movement is decoration only.
    art.vfxLine(air,x,y+20,x+c*length,y+20+s*length,1,f*.45,2);
    const progress=Math.min(1,t*3),ax=x+c*length*progress,ay=y+20+s*length*progress;
    art.drawSkillArrow(air,ax,ay,v.angle,f,v.id==='G22'?1.05:.85);
   }else if(v.kind==='backstab'||v.kind==='retreat')art.drawThrust(air,x,y,v.angle,r,v.age,v.life,v.kind==='retreat');
   else if(v.kind==='dash')art.drawDash(ground,air,x,y,v.tx,v.ty,v.angle,v.age,v.life,v.id==='G21');
   else if(v.kind==='speed-buff')art.drawCloudFeet(ground,x,y,v.age,f,v.moving,v.angle);
   else if(v.kind==='shield')art.drawShield(air,x,y,v.age,f,v.count,v.id==='G09');
   else if(v.kind==='cleanse')art.drawCleanse(ground,air,x,y,v.age,f);
   else if(v.kind==='barrier')art.drawBarrier(ground,air,x,y,r,v.age,f);
   else if(v.kind==='escape')art.drawCloak(ground,air,x,y,v.age,f);
   else if(v.kind==='decoy')art.drawDecoy(ground,air,x-85,y-15,v.age,f);
   else if(v.kind==='decoy-burst'||v.kind==='fire')art.drawFire(ground,air,x,y,r,v.age,v.life,v.kind==='decoy-burst');
   else if(v.kind==='damage-buff'){
    art.drawFlag(ground,x-91,y+45,v.age,f,15,.8);for(let side=-1;side<=1;side+=2)art.vfxLine(air,x+side*47,y+10,x+side*52,y+28,1,f*.55,2);
   }else if(v.kind==='haste-buff')art.drawHaste(ground,air,x,y,v.age,f);
   else if(v.kind==='summon'){
    // These are the actual task origins, fixed to cast position (not rotating around a moving hero).
    for(let i=0;i<3;i++){const a=i*TAU/3,ox=x+Math.cos(a)*90,oy=y+Math.sin(a)*55;art.drawPaper(Math.sin(a)>0?ground:air,ox,oy,v.paperAngles[i],v.paperShots[i],f);}
   }else if(v.kind==='catch')art.drawBoat(ground,air,x,y,v.age,f,v.count);
   else if(v.kind==='water')art.drawWave(ground,air,x,y,r,v.age,v.life);
   else if(v.kind==='gates')art.drawGates(ground,air,x,y,r,v.age,f);
   else if(v.kind==='roar')art.drawRoar(ground,air,x,y,v.angle,r,v.age,v.life);
   else if(v.kind==='lightning')art.drawLightning(ground,air,x,y,r,v.age,v.life);
   else if(v.kind==='meteor'||v.kind==='meteor-fall')art.drawMeteor(ground,air,x,y,r,v.age,v.life,v.kind==='meteor-fall');
   else if(v.kind==='heal')art.drawHeal(ground,air,x,y,v.age,v.life);
   else if(v.kind==='song')art.drawSong(ground,air,x,y,r,v.age,f);
   else if(v.kind==='song-mark')art.drawTargetFlag(air,x,y,v.age,f);
  }
  for(const mark of this.targets)if(mark.e.hp>0&&mark.life>0&&Math.abs(mark.e.x-cx)<hw+80&&Math.abs(mark.e.y-cy)<hh+100)art.drawTargetFlag(air,mark.e.x,mark.e.y,3-mark.life,Math.min(1,mark.life/.2));
 }
}
