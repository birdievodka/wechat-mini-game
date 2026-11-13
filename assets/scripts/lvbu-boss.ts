import type {BossAction} from './chronicles';
import {sectorHitsCircle,sweepEllipseTime} from './combat-math';

export const LVBU_ACTIONS:BossAction[]=[
 {name:'赤兔破军',kind:'charge',cd:7.2,windup:.9,range:480,duration:.7,count:1,description:'刨地0.9秒 · 锁向冲480\n侧闪可躲 · 撞边提前勒马'},
 {name:'画戟回旋',kind:'sector',cd:5.2,windup:1,range:300,arc:300,duration:.42,count:1,description:'抬戟1秒 · 半径300/300°\n实体刃轨伤害 · 身后留缺口'},
 {name:'无双三连冲',kind:'charge',cd:13,windup:.9,range:420,duration:.62,count:3,delay:.65,description:'半血开启 · 三次独立冲420\n首次蓄0.9秒 · 折返各蓄0.65秒'},
];
export const LVBU_EVENT={release:1,brake:2};
export interface LvbuActor {
 x:number;y:number;hp:number;maxHp?:number;speed:number;attack:number;attackAngle:number;
 bossTimers?:number[];bossNext?:number;bossMove?:BossAction;fired?:boolean;
}
export interface LvbuState {
 gait:number;moveSpeed:number;trotBlend:number;chasing:boolean;
 phase:'idle'|'windup'|'dash'|'sweep'|'recover';time:number;index:number;leg:number;windup:number;
 events:number;requestHit:boolean;hit:boolean;travel:number;facing:number;back:boolean;
 brakeX:number;brakeY:number;brakeAngle:number;brakeLife:number;
 contactX:number;contactY:number;contactAngle:number;contactLife:number;
 trailX:Float32Array;trailY:Float32Array;trailCount:number;trailClock:number;
}
export function createLvbuState():LvbuState {
 return {phase:'idle',time:0,index:0,leg:0,windup:.9,events:0,requestHit:false,hit:false,travel:0,facing:1,back:false,gait:0,moveSpeed:0,trotBlend:0,chasing:false,
 brakeX:0,brakeY:0,brakeAngle:0,brakeLife:0,contactX:0,contactY:0,contactAngle:0,contactLife:0,
 trailX:new Float32Array(3),trailY:new Float32Array(3),trailCount:0,trailClock:0};
}
/** Public for deterministic frame review; production starts use the same path. */
export function startLvbuMove(e:LvbuActor,s:LvbuState,index:number,angle:number):void {
 s.index=index;s.leg=0;s.windup=LVBU_ACTIONS[index].windup;s.phase='windup';s.time=0;s.hit=false;s.travel=0;s.trailCount=0;s.moveSpeed=0;s.trotBlend=0;s.chasing=false;
 e.bossMove=LVBU_ACTIONS[index];e.bossNext=(index+1)%(e.hp<(e.maxHp||e.hp)*.5?3:2);
 e.bossTimers![index]=LVBU_ACTIONS[index].cd;e.attack=0;e.fired=false;lock(e,s,angle,true);
}
function lock(e:LvbuActor,s:LvbuState,angle:number,attack=false):void {
 e.attackAngle=angle;const x=Math.cos(angle),y=Math.sin(angle);
 if(x>(attack?.06:.18))s.facing=1;else if(x<-(attack?.06:.18))s.facing=-1;
 if(attack)s.back=y>.42;else if(y>.58)s.back=true;else if(y<.3)s.back=false;
}
function brake(e:LvbuActor,s:LvbuState):void {
 s.phase='recover';s.time=0;s.brakeX=e.x;s.brakeY=e.y;s.brakeAngle=e.attackAngle;s.brakeLife=.6;s.events|=LVBU_EVENT.brake;
}
export function lvbuBusy(s?:LvbuState):boolean{return !!s&&s.phase!=='idle';}

/** Simulation only. No node, drawing, RNG, particles or wall-clock side effects. */
export function updateLvbu(e:LvbuActor,s:LvbuState,dt:number,tx:number,ty:number,halfWidth:number,halfHeight:number,canBegin=true):void {
 s.events=0;s.requestHit=false;if(e.hp<=0)return;
 s.contactLife=Math.max(0,s.contactLife-dt);s.brakeLife=Math.max(0,s.brakeLife-dt);
 const timers=e.bossTimers!;for(let i=0;i<3;i++)timers[i]=Math.max(0,timers[i]-dt);
 if(s.phase==='idle'){
  const distance=Math.hypot(tx-e.x,ty-e.y),enabled=e.hp<(e.maxHp||e.hp)*.5?3:2;let choice=-1;
  if(canBegin)for(let j=0;j<enabled;j++){
   const i=((e.bossNext||0)+j)%enabled;
   if(timers[i]<=0&&distance<=(i===1?LVBU_ACTIONS[i].range!+45:650)){choice=i;break;}
  }
  if(choice>=0)startLvbuMove(e,s,choice,Math.atan2(ty-e.y,tx-e.x));
  else{
   // Hysteresis avoids cycling walk/stand around one exact pursuit distance.
   if(distance>195)s.chasing=true;else if(distance<=155)s.chasing=false;
   const before=s.moveSpeed,target=s.chasing?Math.min(e.speed,Math.sqrt(2600*Math.max(0,distance-155))):0;
   s.moveSpeed+=Math.max(-1300*dt,Math.min(1000*dt,target-s.moveSpeed));
   const travel=Math.min(Math.max(0,distance-155),(before+s.moveSpeed)*.5*dt);
   if(travel>0&&distance>0){const angle=Math.atan2(ty-e.y,tx-e.x);e.x+=(tx-e.x)/distance*travel;e.y+=(ty-e.y)/distance*travel;s.gait=(s.gait+travel/140)%1;lock(e,s,angle);}
   else if(distance<=155)s.moveSpeed=0;
   const blend=travel>dt*25?1:0;s.trotBlend+=Math.max(-dt*8,Math.min(dt*8,blend-s.trotBlend));
  }
  return;
 }
 // Consume phase boundaries so slower frames neither skip a telegraph nor tunnel.
 let left=dt;
 for(let guard=0;left>1e-8&&guard<12;guard++){
  const a=LVBU_ACTIONS[s.index];
  const length=s.phase==='windup'?s.windup:s.phase==='dash'||s.phase==='sweep'?a.duration!:s.index===2&&s.leg<2?.28:s.index===1?.95:1.05;
  const step=Math.min(left,Math.max(0,length-s.time)),old=s.time;s.time+=step;left-=step;
  if(s.phase==='dash'&&step>0){
   const x=e.x,y=e.y,c=Math.cos(e.attackAngle),d=Math.sin(e.attackAngle),distance=a.range!/a.duration!*step;
   e.x=Math.max(-halfWidth+65,Math.min(halfWidth-65,x+c*distance));
   e.y=Math.max(-halfHeight+40,Math.min(halfHeight-85,y+d*distance));
   s.travel+=Math.hypot(e.x-x,e.y-y);s.trailClock+=step;
   if(s.trailClock>=.055){s.trailClock%=.055;for(let i=2;i>0;i--){s.trailX[i]=s.trailX[i-1];s.trailY[i]=s.trailY[i-1];}s.trailX[0]=x;s.trailY[0]=y;s.trailCount=Math.min(3,s.trailCount+1);}
   if(!s.hit&&sweepEllipseTime(x+c*55-tx,y+42+d*55-(ty+30),e.x+c*55-tx,e.y+42+d*55-(ty+30),65,48)!==null){s.hit=true;s.requestHit=true;}
   if(Math.hypot(e.x-x,e.y-y)<distance-.01){brake(e,s);continue;}
  }
  if(s.phase==='sweep'&&step>0&&!s.hit){
   const arc=a.arc!*Math.PI/180,start=e.attackAngle-arc/2+arc*old/a.duration!,end=e.attackAngle-arc/2+arc*s.time/a.duration!;
   if(sectorHitsCircle(tx-e.x,ty+30-(e.y+42),a.range!,(start+end)/2,(end-start)*180/Math.PI,18)){s.hit=true;s.requestHit=true;}
  }
  e.attack=s.phase==='windup'?s.time:s.windup+(s.phase==='recover'?a.duration!+s.time:s.time);
  if(s.time<length-1e-8)break;
  if(s.phase==='windup'){
   s.phase=s.index===1?'sweep':'dash';s.time=0;s.hit=false;s.travel=0;s.trailClock=0;s.trailCount=0;e.fired=true;s.events|=LVBU_EVENT.release;
  }else if(s.phase==='dash'||s.phase==='sweep')brake(e,s);
  else if(s.index===2&&s.leg<2){
   s.leg++;s.phase='windup';s.time=0;s.windup=a.delay!;s.hit=false;e.attack=0;e.fired=false;
   lock(e,s,Math.atan2(ty-e.y,tx-e.x),true);
  }else{
   s.phase='idle';s.time=0;s.trailCount=0;e.attack=-1;e.fired=false;
   for(let i=0;i<3;i++)timers[i]=Math.max(.65,timers[i]);break;
  }
 }
}
/** Same frame selection in birth, movement, casts and visual review. */
export function lvbuFrame(s:LvbuState,_walk:number,_moving:boolean):number {
 const base=s.back?6:0;
 if(s.phase==='windup')return base+1;
 if(s.phase==='dash')return base+2+(Math.floor(s.time*13)%2);
 if(s.phase==='sweep')return base+5;
 if(s.phase==='recover'&&s.time<.46)return base+(s.index===1?5:4);
 // Independent four-step trot; the rider/horse barrel remain registered in the atlas.
 return (s.back?16:12)+(s.trotBlend>.05?Math.floor(s.gait*4)%4:0);
}
