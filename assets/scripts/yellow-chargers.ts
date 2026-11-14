import {sweepEllipseTime} from './combat-math';
export const YELLOW_CHARGERS={count:3,hp:2400,chaseSpeed:200,triggerRange:450,windup:.70,dashSpeed:760,dashSeconds:.48,recovery:1.10,cooldown:2.4} as const;
export interface YellowChargeState {phase:'hunt'|'windup'|'dash'|'recover';time:number;cooldown:number;angle:number;hit:boolean;index:number;released:boolean;contact:boolean;trailClock:number;trailX:number[];trailY:number[];}
export interface ChargerActor {x:number;y:number;attack:number;attackAngle:number;hp:number;}
export const createYellowCharge=(index:number):YellowChargeState=>({phase:'hunt',time:0,cooldown:.3+index*.9,angle:0,hit:false,index,released:false,contact:false,trailClock:0,trailX:[0,0],trailY:[0,0]});
/** Explicit lock, finite phase consumption and swept contact. Rendering cannot cause damage. */
export function updateYellowCharge(e:ChargerActor,s:YellowChargeState,dt:number,tx:number,ty:number,hw:number,hh:number,mayBegin:boolean):void {
 s.released=false;s.contact=false;if(e.hp<=0)return;
 const r=YELLOW_CHARGERS;
 if(s.phase==='hunt'){
  e.attack=-1;s.cooldown=Math.max(0,s.cooldown-dt);const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy);
  if(s.cooldown<=0&&mayBegin&&d<=r.triggerRange){s.angle=Math.atan2(dy,dx);e.attackAngle=s.angle;s.phase='windup';s.time=0;s.hit=false;e.attack=0;return;}
  if(d>85){const travel=Math.min(d-85,r.chaseSpeed*dt);e.x+=dx/d*travel;e.y+=dy/d*travel;e.attackAngle=Math.atan2(dy,dx);}return;
 }
 let left=dt;for(let guard=0;left>1e-8&&guard<5;guard++){
  const length=s.phase==='windup'?r.windup:s.phase==='dash'?r.dashSeconds:r.recovery,t=Math.min(left,length-s.time);
  if(s.phase==='dash'){
   const x=e.x,y=e.y;e.x=Math.max(-hw+40,Math.min(hw-40,x+Math.cos(s.angle)*r.dashSpeed*t));e.y=Math.max(-hh+50,Math.min(hh-85,y+Math.sin(s.angle)*r.dashSpeed*t));
   if(!s.hit&&sweepEllipseTime(x-tx,y-ty,e.x-tx,e.y-ty,38,32)!==null){s.hit=true;s.contact=true;}
   s.trailClock+=t;if(s.trailClock>=.045){s.trailClock=0;s.trailX[1]=s.trailX[0];s.trailY[1]=s.trailY[0];s.trailX[0]=x;s.trailY[0]=y;}
  }
  s.time+=t;left-=t;e.attack=(s.phase==='windup'?0:s.phase==='dash'?r.windup:r.windup+r.dashSeconds)+s.time;
  if(s.time+1e-8<length)break;s.time=0;
  if(s.phase==='windup'){s.phase='dash';s.released=true;s.trailX.fill(e.x);s.trailY.fill(e.y);s.trailClock=0;}
  else if(s.phase==='dash')s.phase='recover';
  else{s.phase='hunt';s.cooldown=r.cooldown+s.index*.18;e.attack=-1;break;}
 }
}
