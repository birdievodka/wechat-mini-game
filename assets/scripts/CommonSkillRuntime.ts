import type {Enemy} from './GameBootstrap';
import {sweepEllipseTime} from './combat-math';
import {commonSkillFor} from './common-skills';
import {CommonSkillEffects} from './CommonSkillEffects';
import {WeaponId} from './weapons';
interface Host {
 readonly x:number;readonly y:number;readonly angle:number;readonly age:number;
 enemies():Enemy[];move(dx:number,dy:number):void;protect(seconds:number):void;clearSlow():void;
 hit(e:Enemy,angle:number,damage:number,knockback:number,style:WeaponId):void;
 canHeal():boolean;heal():void;sound(style:WeaponId):void;impact?():void;
}
interface Group {hits:Map<Enemy,number>;maxTargets:number;maxHits:number;}
interface Task {id:string;kind:string;x:number;y:number;angle:number;delay:number;life:number;age:number;power:number;group:Group;index:number;token:number;}
export const SKILL_BODY_SIZE=80;
export const SKILL_TASK_LIMIT=36;
/** Simulation owns every impact. Visual eviction and offscreen culling never alter combat. */
export class CommonSkillRuntime {
 private tasks:Task[]=[];private serial=0;
 private dash?:{id:string;life:number;duration:number;angle:number;distance:number;power:number;group:Group};
 private guard?:{life:number;power:number;group:Group;next:Map<Enemy,number>;previousX:number;previousY:number};
 private shield=0;private shieldTime=0;private blockGrace=0;
 private hasteTime=0;private hasteRate=1;private sweepTime=0;
 private poseTime=0;private poseDuration=.3;private poseKind='';
 private marks:{e:Enemy;until:number;life:number}[]=[];
 private readonly pose={body:0,head:0,bob:0,hand:0,squash:0};
 constructor(private h:Host,readonly effects:CommonSkillEffects){}
 get castPose(){
  if(this.poseTime<=0){this.pose.body=this.pose.head=this.pose.bob=this.pose.hand=this.pose.squash=0;return this.pose;}
  const f=Math.sin(Math.PI*(1-this.poseTime/this.poseDuration)),k=this.poseKind;
  this.pose.body=f*(k==='dash'?-10:k==='precision'?-5:k==='battle-haste'?-6:k==='stun'?-7:4);
  this.pose.head=-this.pose.body*.4;this.pose.bob=-f*(k==='stun'?4:2);this.pose.hand=f*(k==='stun'?5:3);this.pose.squash=f*.035;return this.pose;
 }
 get dashing():boolean{return !!this.dash;}
 get sweepPose():number{if(this.sweepTime<=0)return 0;const t=1-this.sweepTime/.4;return t<.12?-t/.12*.25:Math.sin((t-.12)/.88*Math.PI)*Math.pow(1-t,.4);}
 get damageMultiplier():number{return 1;}
 get hasteMultiplier():number{return this.hasteTime>0?this.hasteRate:1;}
 speedFor(current:number,_base:number):number{return current;}
 private eligible(e:Enemy):boolean{return e.hp>0&&!e.animal&&(e.born||0)<=0;}
 private group(id:string):Group{const d=commonSkillFor(id);return {hits:new Map(),maxTargets:d.maxTargets,maxHits:d.maxHits};}
 private hit(e:Enemy,id:string,power:number,group:Group,angle:number,knockback=100):boolean {
  const d=commonSkillFor(id),count=group.hits.get(e)||0;
  if(!this.eligible(e)||count>=group.maxHits||!count&&group.hits.size>=group.maxTargets)return false;
  group.hits.set(e,count+1);
  const style:WeaponId=d.kind==='sweep'?'cleaver':d.kind==='fire-line'?'firecracker':d.kind==='lightning'||d.kind==='meteor'?'thunder':d.kind==='water'||d.kind==='gates'?'feather-fan':d.kind==='sword-guard'?'sword':'silver-spear';
  const before=e.hp;this.h.hit(e,angle,Math.max(1,Math.round(power*d.factor)),knockback,style);
  if(e.hp<before){
   if(d.kind==='sweep'){this.effects.play(id,'sweep-hit',e.x,e.y+34,angle,30,.19);if(group.hits.size===1)this.h.impact?.();}
   else{this.effects.play(id,d.kind==='gates'?'lock-hit':'contact',e.x,e.y+34,angle,24,.2);this.h.sound(style);}
  }
  return true;
 }
 private queue(id:string,kind:string,x:number,y:number,angle:number,delay:number,life:number,power:number,group:Group,index=0):void{
  if(this.tasks.length>=SKILL_TASK_LIMIT)return;
  this.tasks.push({id,kind,x,y,angle,delay,life,age:0,power,group,index,token:++this.serial});
 }
 private nearest(group?:Group,range=Infinity,x=this.h.x,y=this.h.y):Enemy|undefined{
  let nearest:Enemy|undefined,distance=range*range;
  for(const e of this.h.enemies()){
   if(!this.eligible(e)||group&&(group.hits.get(e)||0)>=group.maxHits||group&&!group.hits.has(e)&&group.hits.size>=group.maxTargets)continue;
   const d=(e.x-x)**2+(e.y-y)**2;if(d<distance){distance=d;nearest=e;}
  }return nearest;
 }
 cast(id:string,power:number):boolean {
  const d=commonSkillFor(id),h=this.h,kind=d.kind,x=h.x,y=h.y,angle=h.angle;
  if(d.id!==id||!d.unlocked||kind==='precision'&&!this.nearest(undefined,d.radius))return false;
  const group=this.group(id);
  // Persistent fields replace their prior cast, including in the no-cooldown training mode.
  // This bounds fire/rain geometry independently of how fast the player taps the button.
  if(['fire-line','rain','gates','water'].indexOf(kind)>=0){
   let kept=0;for(const task of this.tasks)if(task.id!==id)this.tasks[kept++]=task;this.tasks.length=kept;this.effects.stop(kind);
  }
  if(kind!=='sweep'){this.poseKind=kind;this.poseTime=this.poseDuration=kind==='dash'?d.seconds+.12:kind==='precision'?.8:.32;}
  if(kind==='dash'){
   this.effects.stop('dash');this.dash={id,life:d.seconds,duration:d.seconds,angle,distance:d.radius,power,group};
   h.protect(.25);this.effects.play(id,'dash',x,y,angle,d.radius,d.seconds+.25);
  }else if(kind==='sweep'){
   this.sweepTime=.4;this.queue(id,'sweep',x,y,angle,0,.01,power,group);
  }else if(kind==='battle-haste'){
   this.hasteTime=d.seconds;this.hasteRate=1+d.factor;this.effects.stop(kind);this.effects.play(id,kind,x,y,angle,d.radius,d.seconds);
  }else if(kind==='precision'){
   this.effects.stop('bow');this.effects.play(id,'bow',x,y,angle,d.radius,.9);
   for(let i=0;i<8;i++)this.queue(id,'precision-shot',x,y,angle,i*.095,.01,power,group,i);
  }else if(kind==='fire-line'){
   this.queue(id,kind,x,y,0,0,d.seconds,power,group);this.effects.play(id,kind,x,y,0,d.radius,d.seconds);
  }else if(kind==='water'||kind==='gates'){
   this.queue(id,kind,x,y,0,0,d.seconds,power,group);this.effects.play(id,kind,x,y,0,d.radius,kind==='water'?.8:d.seconds);
  }else if(kind==='rain'){
   this.effects.play(id,kind,x,y,0,d.radius,d.seconds);
   for(let i=0;i<4;i++)this.queue(id,'area',x,y,0,.22+i*.25,.01,power,group,i);
  }else if(kind==='sword-guard'){
   this.guard={life:d.seconds,power,group,next:new Map(),previousX:x,previousY:y};this.shield=3;this.shieldTime=d.seconds;this.blockGrace=0;
   this.effects.stop(kind);this.effects.play(id,kind,x,y,h.age*4,d.radius,d.seconds);this.effects.setCount(kind,3);
  }else if(kind==='stun'){
   for(const e of h.enemies())if(this.eligible(e)&&!e.object&&(e.x-x)**2+(e.y-y)**2<=d.radius*d.radius){
    const until=h.age+d.seconds;e.stunUntil=Math.max(e.stunUntil||0,until);e.moving=false;e.vx=e.vy=0;
    const mark=this.marks.find(m=>m.e===e);if(mark){mark.until=e.stunUntil;mark.life=d.seconds;}else if(this.marks.length<80)this.marks.push({e,until:e.stunUntil,life:d.seconds});
   }
   this.effects.markTargets(this.marks);this.effects.play(id,kind,x,y,0,d.radius,.55);
  }else if(kind==='lightning'||kind==='meteor'){
   const count=kind==='lightning'?4:5,targets=this.h.enemies().filter(e=>this.eligible(e)).sort((a,b)=>(a.x-x)**2+(a.y-y)**2-((b.x-x)**2+(b.y-y)**2));
   for(let i=0;i<count;i++){
    const e=targets[i%Math.max(1,targets.length)],a=angle+(i-(count-1)/2)*.45,r=170+i*18,tx=e?e.x:x+Math.cos(a)*r,ty=e?e.y:y+Math.sin(a)*r;
    const delay=i*(kind==='meteor'?.28:.3),pre=kind==='meteor'?.35:.12;
    this.queue(id,'pre',tx,ty,0,delay,.01,power,group,i);this.queue(id,'area',tx,ty,0,delay+pre,.01,power,group,i);
   }
  }
  h.sound(kind==='fire-line'?'firecracker':kind==='lightning'||kind==='meteor'?'thunder':kind==='stun'?'pole':'silver-spear');return true;
 }
 block(x=this.h.x+45,y=this.h.y+24):boolean{
  if(!this.shield||this.shieldTime<=0||this.blockGrace>0)return false;
  this.shield--;this.blockGrace=.18;this.effects.setCount('sword-guard',this.shield);this.h.protect(.18);
  this.effects.play('G25','guard-hit',x,y,Math.atan2(y-this.h.y,x-this.h.x),30,.22);this.h.sound('cleaver');return true;
 }
 interceptShot(x:number,y:number,tx:number,ty:number,_style?:string):boolean{
  if(!this.shield||this.blockGrace>0)return false;
  const t=sweepEllipseTime(x-this.h.x,y-this.h.y-24,tx-this.h.x,ty-this.h.y-24,120,120);
  return t!==null&&this.block(x+(tx-x)*t,y+(ty-y)*t);
 }
 enemyUpdated(_e:Enemy,_previousAttack:number):void{}
 private area(task:Task,range:number):void{
  const d=commonSkillFor(task.id);
  for(const e of this.h.enemies()){
   if(!this.eligible(e))continue;const dx=e.x-task.x,dy=e.y-task.y;
   if(dx*dx+dy*dy>range*range)continue;
   if(this.hit(e,task.id,task.power,task.group,Math.atan2(dy,dx),task.kind==='sweep'?300:d.kind==='water'?150:100)&&['water','gates'].indexOf(d.kind)>=0){
    e.slowUntil=this.h.age+2;e.slowFactor=e.kind==='chief'?.1:d.kind==='water'?.3:.25;
   }
  }
 }
 private flight(task:Task,dt:number):void{
  const distance=Math.min(task.life,1400*dt),nx=task.x+Math.cos(task.angle)*distance,ny=task.y+Math.sin(task.angle)*distance;
  let target:Enemy|undefined,first=2;
  for(const e of this.h.enemies()){
   if(!this.eligible(e)||(task.group.hits.get(e)||0)>=task.group.maxHits||!task.group.hits.has(e)&&task.group.hits.size>=task.group.maxTargets)continue;
   const t=sweepEllipseTime(task.x-e.x,task.y-e.y,nx-e.x,ny-e.y,19,19);
   if(t!==null&&t<first){first=t;target=e;}
  }
  if(target){task.x+=(nx-task.x)*first;task.y+=(ny-task.y)*first;this.hit(target,task.id,task.power,task.group,task.angle,45);task.life=-1;}
  else{task.x=nx;task.y=ny;task.life-=distance;}
  this.effects.flight(task.token,task.x,task.y,task.angle,task.life>0);
 }
 private updateGuard(dt:number):void{
  const guard=this.guard;if(!guard)return;guard.life-=dt;
  if(guard.life<=0){this.guard=undefined;this.shield=0;this.effects.stop('sword-guard');return;}
  const radius=commonSkillFor('G25').radius,a=this.h.age*4;
  for(const e of this.h.enemies()){
   if(!this.eligible(e)||(guard.next.get(e)||0)>this.h.age)continue;
   let touched=false;
   for(let i=0;i<4;i++){
    const at=a+i*Math.PI/2,previous=at-dt*4;
    if(sweepEllipseTime(guard.previousX+Math.cos(previous)*radius-e.x,guard.previousY+Math.sin(previous)*radius-e.y,this.h.x+Math.cos(at)*radius-e.x,this.h.y+Math.sin(at)*radius-e.y,30,30)!==null){touched=true;break;}
   }
   if(touched&&this.hit(e,'G25',guard.power,guard.group,Math.atan2(e.y-this.h.y,e.x-this.h.x),70))guard.next.set(e,this.h.age+.45);
  }guard.previousX=this.h.x;guard.previousY=this.h.y;
 }
 update(dt:number):void{
  if(dt<=0)return;
  this.sweepTime=Math.max(0,this.sweepTime-dt);this.poseTime=Math.max(0,this.poseTime-dt);this.hasteTime=Math.max(0,this.hasteTime-dt);
  this.shieldTime=Math.max(0,this.shieldTime-dt);this.blockGrace=Math.max(0,this.blockGrace-dt);this.effects.update(dt);this.effects.track(this.h.x,this.h.y,this.h.angle,dt);
  let n=0;for(const mark of this.marks){mark.life=Math.max(0,mark.until-this.h.age);if(mark.life>0&&mark.e.hp>0&&(mark.e.stunUntil||0)>=mark.until)this.marks[n++]=mark;}this.marks.length=n;
  this.updateGuard(dt);
  const dash=this.dash;if(dash){
   const step=Math.min(Math.max(0,dash.life),dt),x=this.h.x,y=this.h.y;dash.life-=dt;
   this.h.move(Math.cos(dash.angle)*dash.distance/dash.duration*step,Math.sin(dash.angle)*dash.distance/dash.duration*step);
   for(const e of this.h.enemies())if(this.eligible(e)&&sweepEllipseTime(x-e.x,y-e.y,this.h.x-e.x,this.h.y-e.y,50,50)!==null)this.hit(e,dash.id,dash.power,dash.group,dash.angle,150);
   this.effects.endpoint(dash.id,this.h.x,this.h.y);if(dash.life<=0)this.dash=undefined;
  }
  for(const task of this.tasks){
   const previousDelay=task.delay;task.delay-=dt;if(task.delay>0)continue;
   const activeDt=previousDelay>0?Math.min(dt,-task.delay):dt;task.age+=activeDt;const d=commonSkillFor(task.id);
   if(task.kind==='precision-shot'){
    const target=this.nearest(task.group,d.radius);task.x=this.h.x;task.y=this.h.y;task.angle=target?Math.atan2(target.y-task.y,target.x-task.x):this.h.angle;
    this.effects.aimBow(task.angle);task.kind='flight';task.life=d.radius;this.flight(task,activeDt);continue;
   }
   if(task.kind==='flight'){this.flight(task,activeDt);continue;}
   if(task.kind==='pre'){this.effects.play(task.id,d.kind==='meteor'?'meteor-fall':'lightning-pre',task.x,task.y,0,d.radius,d.kind==='meteor'?.35:.12);task.life=-1;continue;}
   if(task.kind==='fire-line'){
    while(task.index<4&&task.age>=.15+task.index*.75){for(const e of this.h.enemies())if(this.eligible(e)&&Math.abs(e.x-task.x)<=d.radius&&Math.abs(e.y-task.y)<=40)this.hit(e,task.id,task.power,task.group,e.y>=task.y?Math.PI/2:-Math.PI/2,30);task.index++;}
    if(task.age<task.life)continue;
   }else if(task.kind==='water'||task.kind==='gates'){
    this.area(task,task.kind==='water'?d.radius*Math.min(1,task.age/d.seconds):d.radius);if(task.age<task.life)continue;
   }else{
    this.area(task,d.radius);
    if(d.kind!=='rain')this.effects.play(task.id,d.kind,task.x,task.y,task.angle,d.radius,d.kind==='sweep'?.4:.6);
   }
   task.life=-1;
  }
  let kept=0;for(const task of this.tasks)if(task.life>0)this.tasks[kept++]=task;this.tasks.length=kept;
 }
 reset():void{
  for(const mark of this.marks)if((mark.e.stunUntil||0)<=mark.until)mark.e.stunUntil=0;
  this.tasks.length=0;this.marks.length=0;this.poseTime=0;this.dash=undefined;this.guard=undefined;
  this.shield=this.shieldTime=this.blockGrace=this.hasteTime=this.sweepTime=0;this.hasteRate=1;this.effects.clear();
 }
}
