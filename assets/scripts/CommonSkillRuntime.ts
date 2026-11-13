import type {Enemy} from './GameBootstrap';
import {sweepEllipseTime,sectorHitsCircle} from './combat-math';
import {commonSkillFor} from './common-skills';
import {CommonSkillEffects} from './CommonSkillEffects';
import {WeaponId} from './weapons';
interface Host {
 readonly x:number;readonly y:number;readonly angle:number;readonly age:number;
 enemies():Enemy[];move(dx:number,dy:number):void;protect(seconds:number):void;clearSlow():void;
 hit(e:Enemy,angle:number,damage:number,knockback:number,style:WeaponId):void;
 canHeal():boolean;heal():void;sound(style:WeaponId):void;
 impact?():void;
}
interface Group {hits:Map<Enemy,number>;maxTargets:number;maxHits:number;}
interface Task {id:string;kind:string;x:number;y:number;angle:number;delay:number;life:number;age:number;power:number;group:Group;index:number;}
interface Decoy {x:number;y:number;life:number;}
export class CommonSkillRuntime {
 private tasks:Task[]=[];private decoy?:Decoy;
 private dash?:{id:string;life:number;duration:number;angle:number;distance:number;power:number;group:Group;retreat:boolean};
 private shield=0;private shieldTime=0;private shieldKind='';
 private damageTime=0;private hasteTime=0;private speedTime=0;
 private catchTime=0;private caught=0;private catchPower=0;
 private sweepTime=0;
 private poseTime=0;private poseDuration=.3;private poseKind='';private shieldId='G04';
 private marks:{e:Enemy;life:number}[]=[];
 private readonly pose={body:0,head:0,bob:0,hand:0,squash:0};
 get castPose(){if(this.poseTime<=0){this.pose.body=this.pose.head=this.pose.bob=this.pose.hand=this.pose.squash=0;return this.pose;}const f=Math.sin(Math.PI*(1-this.poseTime/this.poseDuration)),k=this.poseKind;
  this.pose.body=f*(k==='backstab'?-9:k==='retreat'?7:k==='dash'?-7:k==='roar'?-5:3);
  this.pose.head=-this.pose.body*.4;this.pose.bob=-f*(k==='roar'?3:1.3);this.pose.hand=f*2;this.pose.squash=f*.025;return this.pose;}
 constructor(private h:Host,readonly effects:CommonSkillEffects){}
 get dashing():boolean{return !!this.dash;}
 get sweepPose():number{if(this.sweepTime<=0)return 0;const t=1-this.sweepTime/.4;return t<.12?-t/.12*.25:Math.sin((t-.12)/.88*Math.PI)*Math.pow(1-t,.4);}
 get damageMultiplier():number{return this.damageTime>0?1.25:1;}
 get hasteMultiplier():number{return this.hasteTime>0?1.2:1;}
 speedFor(current:number,base:number):number{return this.speedTime>0?Math.min(base*2.2,current+base*.3):current;}
 private eligible(e:Enemy):boolean{return e.hp>0&&!e.animal&&(e.born||0)<=0;}
 private group(id:string):Group{const d=commonSkillFor(id);return {hits:new Map(),maxTargets:d.maxTargets,maxHits:d.maxHits};}
 private hit(e:Enemy,id:string,power:number,group:Group,angle:number,knockback=100):boolean {
  const d=commonSkillFor(id),count=group.hits.get(e)||0;if(!this.eligible(e)||count>=group.maxHits||!count&&group.hits.size>=group.maxTargets)return false;
  group.hits.set(e,count+1);const style:WeaponId=d.kind==='sweep'?'cleaver':d.kind==='fire'?'firecracker':d.kind==='lightning'||d.kind==='meteor'?'thunder':d.kind==='water'||d.kind==='gates'||d.kind==='song'?'feather-fan':d.kind==='roar'?'pole':'silver-spear';
  const before=e.hp;this.h.hit(e,angle,Math.max(1,Math.round(power*d.factor)),knockback,style);
  // Keep original eligibility/target/line-control return semantics; only contact is acceptance-gated.
  if(e.hp<before){
   if(d.kind==='sweep'){this.effects.play(id,'sweep-hit',e.x,e.y+34,angle,30,.19);if(group.hits.size===1)this.h.impact?.();}
   else this.effects.play(id,'contact',e.x,e.y+34,angle,24,.18);
  }
  return true;
 }
 private queue(id:string,kind:string,x:number,y:number,angle:number,delay:number,life:number,power:number,group:Group,index=0):void{
  if(this.tasks.length>=36)return;this.tasks.push({id,kind,x,y,angle,delay,life,age:0,power,group,index});
 }
 private nearest(group?:Group,range=Infinity,x=this.h.x,y=this.h.y):Enemy|undefined{
  let nearest:Enemy|undefined,distance=range*range;for(const e of this.h.enemies()){
   if(!this.eligible(e)||group&&(group.hits.get(e)||0)>=group.maxHits||group&&!group.hits.has(e)&&group.hits.size>=group.maxTargets)continue;
   const dx=e.x-x,dy=e.y-y,d=dx*dx+dy*dy;if(d<distance){distance=d;nearest=e;}
  }return nearest;
 }
 private aim():number{const e=this.nearest(undefined,700);return e?Math.atan2(e.y-this.h.y,e.x-this.h.x):this.h.angle;}
 cast(id:string,power:number):boolean {
  const d=commonSkillFor(id),h=this.h,kind=d.kind,group=this.group(id),x=h.x,y=h.y,angle=h.angle;
  if(!d.unlocked||kind==='heal'&&!h.canHeal())return false;
  if(kind==='precision'&&!this.nearest(undefined,d.radius))return false;
  if(kind!=='sweep'){this.poseKind=kind;this.poseTime=this.poseDuration=(kind==='dash'||kind==='retreat')?d.seconds+.12:.3;}
  if(kind==='dash'||kind==='retreat'){
   const retreat=kind==='retreat';this.dash={id,life:d.seconds,duration:d.seconds,angle:retreat?angle+Math.PI:angle,distance:retreat?200:d.radius,power,group,retreat};h.protect(retreat?.2:.25);this.effects.play(id,'dash',x,y,this.dash.angle,this.dash.distance,d.seconds+.25);
  }else if(kind==='backstab')this.queue(id,'line',x,y,angle+Math.PI,0,.01,power,group);
  else if(kind==='sweep'||kind==='roar'||kind==='song'){
   if(kind==='sweep')this.sweepTime=.4;
   this.queue(id,kind,x,y,kind==='roar'?this.aim():angle,0,.01,power,group);
  }else if(kind==='shield'||kind==='cleanse'||kind==='barrier'){
   this.shield=kind==='shield'?2:1;this.shieldTime=d.seconds;this.shieldKind=kind;this.shieldId=id;if(kind!=='shield')h.clearSlow();this.effects.play(id,kind,x,y,0,d.radius,d.seconds);
  }else if(kind==='escape'||kind==='decoy'){
   this.decoy={x,y,life:d.seconds};this.effects.play(id,kind,x,y,0,d.radius,d.seconds);if(kind==='escape'){h.protect(.2);h.move(Math.cos(angle)*d.radius,Math.sin(angle)*d.radius);}else this.queue(id,'area',x,y,0,d.seconds,.01,power,group);
  }else if(kind==='damage-buff'||kind==='haste-buff'||kind==='speed-buff'){
   if(kind==='damage-buff')this.damageTime=d.seconds;else if(kind==='haste-buff'){this.hasteTime=d.seconds;this.shield=1;this.shieldTime=3;this.shieldKind='shield';this.shieldId=id;this.effects.play(id,'shield',x,y,0,95,3);}else this.speedTime=d.seconds;
   this.effects.play(id,kind,x,y,0,d.radius,d.seconds);
  }else if(kind==='heal'){h.heal();this.effects.play(id,kind,x,y,0,d.radius,d.seconds);}
  else if(kind==='precision'||kind==='volley'){
   const count=kind==='precision'?3:12,a=this.aim();for(let i=0;i<count;i++)this.queue(id,'arrow',x,y,a+(kind==='volley'?(i-5.5)/11*Math.PI*2/3:0),i*(kind==='precision'?.12:.035),.01,power,group,i);
  }else if(kind==='catch'){this.catchTime=d.seconds;this.caught=0;this.catchPower=power;this.effects.play(id,kind,x,y,0,d.radius,d.seconds);}
  else if(kind==='summon'){this.effects.play(id,kind,x,y,0,d.radius,d.seconds);for(let tick=0;tick<4;tick++)for(let i=0;i<3;i++)this.queue(id,'paper',x,y,0,.2+tick*.7+i*.06,.01,power,group,i);}
  else if(kind==='water'||kind==='gates'){this.queue(id,kind,x,y,0,0,d.seconds,power,group);this.effects.play(id,kind,x,y,0,d.radius,kind==='water'?.8:d.seconds);}
  else if(kind==='fire'||kind==='lightning'||kind==='meteor'){
   const count=kind==='fire'?3:kind==='lightning'?4:5,targets=this.h.enemies().filter(e=>this.eligible(e)).sort((a,b)=>(a.x-x)**2+(a.y-y)**2-((b.x-x)**2+(b.y-y)**2));
   for(let i=0;i<count;i++){const e=targets[i%Math.max(1,targets.length)],a=angle+(i-(count-1)/2)*.45,r=170+i*18;const tx=e?e.x:x+Math.cos(a)*r,ty=e?e.y:y+Math.sin(a)*r;if(kind==='meteor'){this.queue(id,'meteor-pre',tx,ty,0,i*.28,.01,power,group,i);this.queue(id,'area',tx,ty,0,i*.28+.35,.01,power,group,i);}else this.queue(id,'area',tx,ty,0,i*(kind==='fire'?.4:.3),.01,power,group,i);}
  }
  h.sound(kind==='fire'||kind==='decoy'?'firecracker':kind==='lightning'||kind==='meteor'?'thunder':kind==='roar'?'pole':kind==='heal'?'peach':'silver-spear');return true;
 }
 /** The decoy only redirects ordinary foot troops; Bosses, cavalry and archers keep their normal aim. */
 decoyFor(e:Enemy):Decoy|undefined{return this.decoy&&e.kind==='soldier'&&!e.animal&&!e.object&&(e.x-this.decoy.x)**2+(e.y-this.decoy.y)**2<420*420?this.decoy:undefined;}
 block():boolean{if(!this.shield||this.shieldTime<=0)return false;this.shield--;this.effects.setCount(this.shieldKind,this.shield);if(!this.shield){this.shieldTime=0;this.effects.stop(this.shieldKind);}this.h.protect(.18);this.effects.play(this.shieldId,'shield-hit',this.h.x+45,this.h.y+24,0,25,.2);this.h.sound('cleaver');return true;}
 interceptShot(x:number,y:number,tx:number,ty:number,style?:string):boolean{
  if(this.catchTime<=0||this.caught>=4||style&&!/^E/.test(style))return false;
  if(sweepEllipseTime(x-this.h.x,y-this.h.y,tx-this.h.x,ty-this.h.y,130,130)===null)return false;
  this.caught++;this.effects.setCount('catch',this.caught);this.effects.play('G11','shield-hit',tx,ty,0,25,.2);return true;
 }
 enemyUpdated(e:Enemy,previousAttack:number):void {
  if(e.nextCycleUntil&&e.nextCycleUntil>=this.h.age&&previousAttack>=0&&e.attack<0){e.attackCooldown*=e.kind==='chief'?1.1:1.2;e.nextCycleUntil=0;}
 }
 private area(task:Task,range:number):void{
  const d=commonSkillFor(task.id);for(const e of this.h.enemies()){
   if(!this.eligible(e))continue;const dx=e.x-task.x,dy=e.y-task.y;if(dx*dx+dy*dy>range*range)continue;
   if(this.hit(e,task.id,task.power,task.group,Math.atan2(dy,dx),task.kind==='sweep'?300:d.kind==='water'?150:100)){
    if(d.kind==='water'||d.kind==='gates'){e.slowUntil=this.h.age+2;e.slowFactor=e.kind==='chief'?.1:d.kind==='water'?.3:.25;}
    if(d.kind==='song'){e.nextCycleUntil=this.h.age+3;if(this.marks.length<18)this.marks.push({e,life:3});}
   }
  }
 }
 private line(task:Task,arrow=false):void {
  const d=commonSkillFor(task.id),h=this.h;let x=task.x,y=task.y,a=task.angle;
  if(arrow){x=h.x;y=h.y;}
  if(task.kind==='paper'){const b=task.index*Math.PI*2/3;x+=Math.cos(b)*90;y+=Math.sin(b)*55;}
  if(arrow&&(d.kind==='precision'||d.kind==='catch'||task.kind==='paper')){const target=this.nearest(task.group,d.radius,x,y);if(!target)return;a=Math.atan2(target.y-y,target.x-x);}
  const c=Math.cos(a),s=Math.sin(a),range=d.radius,width=arrow?15:d.kind==='backstab'?35:40;
  const hits=this.h.enemies().filter(e=>this.eligible(e)&&sectorHitsCircle(e.x-x,e.y-y,range,a,180,0)).map(e=>({e,along:(e.x-x)*c+(e.y-y)*s,across:Math.abs(-(e.x-x)*s+(e.y-y)*c)})).filter(p=>p.along>=0&&p.along<=range&&p.across<=width).sort((a,b)=>a.along-b.along);
  let n=0,reach=range;for(const hit of hits){if(this.hit(hit.e,task.id,task.power,task.group,a,arrow?45:160)){reach=hit.along;n++;if(arrow&&n>=(d.kind==='volley'?3:1))break;}}
  if(task.kind==='paper')this.effects.paperShot(task.index,a);
  this.effects.play(task.id,arrow?'arrow':d.kind,x,y,a,range,arrow?.25:.35,x+c*(arrow?reach:range),y+s*(arrow?reach:range));
 }
 update(dt:number):void {
  this.sweepTime=Math.max(0,this.sweepTime-dt);this.poseTime=Math.max(0,this.poseTime-dt);
  this.effects.update(dt);this.effects.track(this.h.x,this.h.y,this.h.angle,dt);this.damageTime=Math.max(0,this.damageTime-dt);this.hasteTime=Math.max(0,this.hasteTime-dt);this.speedTime=Math.max(0,this.speedTime-dt);this.shieldTime=Math.max(0,this.shieldTime-dt);if(!this.shieldTime)this.shield=0;
  let markCount=0;for(const mark of this.marks){mark.life-=dt;if(mark.life<=0||mark.e.hp<=0)continue;this.marks[markCount++]=mark;}this.marks.length=markCount;
  if(this.shieldKind==='barrier'&&this.shieldTime>0)for(const e of this.h.enemies())if(this.eligible(e)&&(e.x-this.h.x)**2+(e.y-this.h.y)**2<150*150){e.slowUntil=this.h.age+.15;e.slowFactor=e.kind==='chief'?.1:.25;}
  if(this.decoy){this.decoy.life-=dt;if(this.decoy.life<=0)this.decoy=undefined;}
  if(this.catchTime>0){this.catchTime=Math.max(0,this.catchTime-dt);if(!this.catchTime&&this.caught){const group=this.group('G11');for(let i=0;i<this.caught;i++)this.queue('G11','arrow',this.h.x,this.h.y,this.h.angle,i*.08,.01,this.catchPower,group,i);this.caught=0;}}
  const dash=this.dash;if(dash){const step=Math.min(Math.max(0,dash.life),dt),x=this.h.x,y=this.h.y;dash.life-=dt;this.h.move(Math.cos(dash.angle)*dash.distance/dash.duration*step,Math.sin(dash.angle)*dash.distance/dash.duration*step);
   if(!dash.retreat)for(const e of this.h.enemies())if(this.eligible(e)&&sweepEllipseTime(x-e.x,y-e.y,this.h.x-e.x,this.h.y-e.y,50,50)!==null)this.hit(e,dash.id,dash.power,dash.group,dash.angle,150);
   this.effects.endpoint(dash.id,this.h.x,this.h.y);
   if(dash.life<=0){if(dash.retreat)this.queue(dash.id,'line',this.h.x,this.h.y,dash.angle+Math.PI,0,.01,dash.power,dash.group);this.dash=undefined;}
  }
  for(let index=0;index<this.tasks.length;index++){const task=this.tasks[index];task.delay-=dt;if(task.delay>0)continue;const d=commonSkillFor(task.id);task.age+=dt;
   if(task.kind==='meteor-pre'){this.effects.play(task.id,'meteor-fall',task.x,task.y,0,d.radius,.35);task.life=-1;continue;}
   if(task.kind==='water'||task.kind==='gates'){this.area(task,task.kind==='water'?d.radius*Math.min(1,task.age/d.seconds):d.radius);if(task.age<task.life)continue;}
   else if(task.kind==='line'||task.kind==='arrow'||task.kind==='paper')this.line(task,task.kind!=='line');
   else if(task.kind==='roar'){
    for(const e of this.h.enemies())if(this.eligible(e)&&sectorHitsCircle(e.x-task.x,e.y-task.y,d.radius,task.angle,100,0)&&this.hit(e,task.id,task.power,task.group,task.angle,220)&&e.kind!=='chief'){e.stagger=Math.max(e.stagger||0,.15);}
    this.effects.play(task.id,'roar',task.x,task.y,task.angle,d.radius,.6);
   }else {this.area(task,d.radius);this.effects.play(task.id,d.kind==='decoy'?'decoy-burst':d.kind,task.x,task.y,task.angle,d.radius,d.kind==='sweep'?.4:d.kind==='song'?3:d.kind==='fire'?.7:.6);}
   task.life=-1;
  }
  let kept=0;for(const task of this.tasks)if(task.life>=0)this.tasks[kept++]=task;this.tasks.length=kept;
  this.effects.markTargets(this.marks);
 }
 reset():void{this.tasks.length=0;this.marks.length=0;this.poseTime=0;this.decoy=undefined;this.dash=undefined;this.shield=this.shieldTime=this.damageTime=this.hasteTime=this.speedTime=this.catchTime=this.caught=this.sweepTime=0;this.effects.clear();}
}
