import {sweepEllipseTime} from './combat-math';
import {REFORGED_ACTIONS,BOSS_UNIT_LIMIT,BOSS_BEAST_LIMIT,BOSS_UNIT_HP} from './boss-roster';
import type {BossAction} from './chronicles';

export type BossUnitKind='sigil'|'bowman'|'cart'|'decoy'|'rider'|'boar'|'wolf'|'elephant';
export type HazardKind='lightning'|'chain'|'seal'|'wine'|'coin'|'blade'|'arrow'|'bolt'|'stone'|'meteor'|'dragon'|'rain'|'sword-field';
export interface ReforgedState {phase:'idle'|'windup'|'cast'|'recover';time:number;index:number;gait:number;blend:number;moveSpeed:number;facing:number;back:boolean;originX:number;originY:number;sideX:number;sideY:number;serial:number;}
export interface BossUnit {kind:BossUnitKind;owner:BossActor;age:number;delay:number;life:number;angle:number;originX:number;originY:number;targetX:number;targetY:number;lane:number;round:number;burst:number;attackAge:number;locked:boolean;hit:boolean;phase:'ready'|'approach'|'windup'|'attack'|'recover';gait:number;}
export interface BossActor {x:number;y:number;hp:number;maxHp?:number;speed:number;attack:number;attackAngle:number;archetype?:string;bossSkin?:string;bossTimers?:number[];bossNext?:number;bossMove?:BossAction;stunUntil?:number;born?:number;bossState?:ReforgedState;bossUnit?:BossUnit;miniBoss?:boolean;miniPhase?:number;}
export interface BossHazard {active:boolean;kind:HazardKind;source:BossActor;age:number;delay:number;duration:number;radius:number;width:number;x:number;y:number;originX:number;originY:number;angle:number;speed:number;distance:number;lane:number;hit:boolean;nextHit:number;contactLife:number;contactX:number;contactY:number;nodes?:BossActor[];lockAt?:number;locationLocked?:boolean;}
export interface BossHost {
 now():number;target():{x:number;y:number};bounds():{halfWidth:number;halfHeight:number};
 viewport?():{left:number;right:number;bottom:number;top:number};
 actors():BossActor[];normalZones():number;normalShots():number;otherBusy():number;referenceDps(e:BossActor):number;
 spawn(kind:BossUnitKind,owner:BossActor,x:number,y:number,hp:number):BossActor|undefined;
 hit(x:number,y:number):boolean;intercept(x:number,y:number,tx:number,ty:number,kind:string):boolean;
 release(e:BossActor,a:BossAction):void;impact(kind:HazardKind,x:number,y:number):void;
}
const area=(kind:HazardKind)=>['lightning','chain','seal','wine','stone','meteor','rain','sword-field'].indexOf(kind)>=0;
const beast=(kind:BossUnitKind)=>['boar','wolf','elephant'].indexOf(kind)>=0;
export const bossBeastCharging=(e:BossActor):boolean=>!!e.bossUnit&&beast(e.bossUnit.kind)&&e.bossUnit.phase==='attack';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export const createBossState=():ReforgedState=>({phase:'idle',time:0,index:0,gait:0,blend:0,moveSpeed:0,facing:1,back:false,originX:0,originY:0,sideX:0,sideY:0,serial:0});
export function bossFrame(s:ReforgedState,id?:string):number {const base=s.back?8:0,wide=id==='dongzhuo'?s.index===2:s.index===1;return base+(s.phase==='idle'?(s.blend>.05?1+Math.floor(s.gait*4)%4:0):s.phase==='windup'?5:s.phase==='recover'?(s.time<.18?(wide?7:6):s.time<.45?5:0):wide?7:6);}

/** Simulation and real collisions only. All rendering is a read-only consumer. */
export class BossBattle {
 readonly hazards:BossHazard[]=[];
 constructor(private host:BossHost){}
 get areaCount():number {let n=0;for(const h of this.hazards)if(h.active&&area(h.kind))n++;return n;}
 get shotCount():number {let n=0;for(const h of this.hazards)if(h.active&&!area(h.kind))n++;return n;}
 private unitCount(kind?:BossUnitKind):number {let n=0;for(const e of this.host.actors())if(e.hp>0&&e.bossUnit&&(!kind||e.bossUnit.kind===kind))n++;return n;}
 private point(x:number,y:number,pad=65,visible=true):{x:number;y:number}{const b=this.host.bounds(),v=visible?this.host.viewport?.():undefined;return {x:clamp(x,Math.max(-b.halfWidth+pad,v?v.left+pad:-Infinity),Math.min(b.halfWidth-pad,v?v.right-pad:Infinity)),y:clamp(y,Math.max(-b.halfHeight+pad,v?v.bottom+pad:-Infinity),Math.min(b.halfHeight-pad,v?v.top-pad:Infinity))};}
 private add(source:BossActor,kind:HazardKind,x:number,y:number,delay:number,duration:number,options:Partial<BossHazard>={}):BossHazard|undefined {
  if(area(kind)?this.areaCount+this.host.normalZones()+this.host.otherBusy()>=6:this.shotCount+this.host.normalShots()>=80)return;
  let h=this.hazards.find(v=>!v.active);if(!h){if(this.hazards.length>=86)return;h={} as BossHazard;this.hazards.push(h);}
  Object.assign(h,{active:true,source,kind,x,y,originX:x,originY:y,age:0,delay,duration,radius:75,width:18,angle:0,speed:0,distance:0,lane:0,hit:false,nextHit:0,contactLife:0,contactX:0,contactY:0,nodes:undefined,lockAt:undefined,locationLocked:undefined},options);return h;
 }
 private unit(source:BossActor,kind:BossUnitKind,x:number,y:number,delay:number,life:number,angle:number,lane=0):BossActor|undefined {
  if(this.unitCount()>=BOSS_UNIT_LIMIT||this.host.actors().filter(e=>e.hp>0).length>=80)return;
  if(kind==='cart'&&this.machineCount()>=2)return;
  if(beast(kind)&&this.host.actors().filter(e=>e.hp>0&&e.bossUnit&&beast(e.bossUnit.kind)).length>=BOSS_BEAST_LIMIT)return;
  const p=this.point(x,y,beast(kind)?60:110,!beast(kind)),e=this.host.spawn(kind,source,p.x,p.y,Math.round(this.host.referenceDps(source)*BOSS_UNIT_HP[kind]));if(!e)return;
  const target=this.host.target(),lockedAngle=kind==='rider'||kind==='elephant'?Math.atan2(target.y-p.y,target.x-p.x):angle;e.bossUnit={kind,owner:source,age:0,delay,life,angle:lockedAngle,originX:p.x,originY:p.y,targetX:target.x,targetY:target.y,lane,round:0,burst:0,attackAge:0,locked:false,hit:false,phase:'ready',gait:0};return e;
 }
 canStart(e:BossActor,index:number):boolean {
  const id=e.bossSkin!,unitNeeds=id==='zhangjiao'&&index===2?3:id==='yuanshao'?(index===1?Math.max(0,2-this.machineCount()):4):id==='caocao'&&index>0?2:id==='menghuo'?(index===0?4:index===1?3:2):0;
  const zones=id==='zhangjiao'?(index===0?1:3):id==='dongzhuo'?(index===0?1:index===2?3:0):id==='yuanshao'?(index===1?1:index===2?3:0):id==='caocao'&&index>0?1:id==='simayi'&&index!==1?3:0;
  let busy=this.host.otherBusy();for(const a of this.host.actors())if(a!==e&&a.hp>0&&a.bossState?.phase!=='idle'&&a.bossState)busy++;
  if(busy>=4||this.areaCount+this.host.normalZones()+this.host.otherBusy()+zones>6||this.unitCount()+unitNeeds>BOSS_UNIT_LIMIT)return false;
  if(this.host.actors().filter(a=>a.hp>0).length+unitNeeds>80)return false;
  if(id==='menghuo'){const alive=this.host.actors().filter(a=>a.hp>0&&a.bossUnit&&beast(a.bossUnit.kind));if(alive.length+unitNeeds>6||new Set(alive.map(a=>a.bossUnit!.kind)).size>=2)return false;}
  return true;
 }
 private machineCount():number {let n=0;for(const e of this.host.actors())if(e.hp>0&&(e.bossUnit?.kind==='cart'||Number(e.archetype?.slice(1))>=35&&Number(e.archetype?.slice(1))<=38))n++;return n;}
 start(e:BossActor,index:number,angle:number):boolean {
  if(!this.canStart(e,index))return false;
  const s=e.bossState||(e.bossState=createBossState()),a=REFORGED_ACTIONS[e.bossSkin!][index],t=this.host.target(),dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
  Object.assign(s,{phase:'windup',time:0,index,moveSpeed:0,blend:0,originX:e.x,originY:e.y,sideX:0,sideY:0,serial:s.serial+1});e.attack=0;e.attackAngle=angle;e.bossMove=a;e.bossTimers![index]=a.cd;e.bossNext=(index+1)%(e.hp<(e.maxHp||e.hp)*.5?3:2);this.face(s,angle);
  const scatter=(radius:number,step:number,kind:HazardKind,duration=.55)=>{for(let i=0;i<3;i++){const p=this.point(Math.round(t.x/80)*80+nx*(i-1)*180,Math.round(t.y/80)*80+ny*(i-1)*180,Math.max(50,radius));this.add(e,kind,p.x,p.y,a.windup+i*step,duration,{radius,lane:i});}};
  if(e.bossSkin==='zhangjiao'){
   if(index===0){const p=this.point(t.x,t.y);this.add(e,'lightning',p.x,p.y,a.windup,.55,{radius:76});}
   else if(index===1)scatter(70,.45,'lightning');
   else {const nodes:BossActor[]=[];for(let i=0;i<3;i++){const b=angle+Math.PI/6+i*Math.PI*2/3,p=this.point(t.x+Math.cos(b)*220,t.y+Math.sin(b)*220);const unit=this.unit(e,'sigil',p.x,p.y,a.windup,7,angle);if(unit)nodes.push(unit);}if(nodes.length===3)for(let i=0;i<3;i++)this.add(e,'chain',nodes[i].x,nodes[i].y,a.windup+.9+i*1.5,.45,{nodes:[nodes[i],nodes[(i+1)%3]],radius:14});}
  }else if(e.bossSkin==='dongzhuo'){
   if(index===0){const p=this.point(t.x,t.y,135);this.add(e,'seal',p.x,p.y,a.windup,.65,{radius:135});}
   else if(index===1)for(let i=0;i<4;i++){const side=[-210,-120,120,210][i],p=this.point(e.x+nx*side,e.y+ny*side);this.add(e,'coin',p.x,p.y+30,a.windup+i*.2,2.8,{radius:28,width:28,angle,speed:230,lane:i});}
   else for(let i=0;i<3;i++){const p=this.point(t.x+nx*(i-1)*210+dx*(i===1?90:-45),t.y+ny*(i-1)*210+dy*(i===1?90:-45),80);this.add(e,'wine',p.x,p.y,a.windup+i*.45+.45,2,{radius:78,lane:i});}
  }else if(e.bossSkin==='yuanshao'){
   if(index!==1){const shotAngle=angle+(s.serial%2?.22:-.22),c=Math.cos(shotAngle),d=Math.sin(shotAngle);for(let i=0;i<4;i++){const lane=[-170,-90,90,170][i],p=this.point(e.x-d*lane-c*20,e.y+c*lane-d*20,110);this.unit(e,'bowman',p.x,p.y,a.windup,index===2?5.5:4.2,shotAngle,lane);}
    if(index===0)for(let i=0;i<5;i++)this.add(e,'arrow',e.x+dx*42,e.y+30+dy*42,a.windup+i*.06,2.6,{angle:angle+(i-2)*.12,speed:340,width:9,radius:9});
    else for(let i=0;i<3;i++){const p=this.point(t.x+nx*(i-1)*155,t.y+ny*(i-1)*155,100);this.add(e,'rain',p.x,p.y,a.windup+.7+i*.55,.4,{radius:92,lane:i});}
   }else {for(let i=0;i<2;i++)this.unit(e,'cart',e.x+nx*(i?160:-160),e.y+ny*(i?160:-160),a.windup+i*.65,8.5,angle,i);const p=this.point(t.x,t.y,100);this.add(e,'rain',p.x,p.y,a.windup+.45,.4,{radius:94});}
  }else if(e.bossSkin==='caocao'){
   if(index===0)for(let i=0;i<5;i++)this.add(e,'blade',e.x+dx*50,e.y+30+dy*50,a.windup+(i===0?0:i<3?.5:1),2.4,{angle:angle+[0,-.32,.32,-.16,.16][i],speed:340,width:44,radius:44,lane:i});
   else if(index===1){const sign=s.serial%2?1:-1,p=this.point(e.x+nx*160*sign,e.y+ny*160*sign);s.sideX=p.x-e.x;s.sideY=p.y-e.y;for(let i=0;i<2;i++)this.unit(e,'decoy',e.x+nx*(i?130:-130),e.y+ny*(i?130:-130),a.windup,5.5,angle,i);const target=this.point(t.x,t.y,145);this.add(e,'sword-field',target.x,target.y,a.windup+.8,.45,{radius:145});}
   else {for(let i=0;i<2;i++){const b=angle+(i?Math.PI:.1),p=this.point(t.x-Math.cos(b)*460,t.y-Math.sin(b)*460);this.unit(e,'rider',p.x,p.y,a.windup+i*1.3,5,b,i);}for(let i=0;i<3;i++)this.add(e,'blade',e.x+dx*50,e.y+30+dy*50,a.windup+.7+i*.9,2.4,{angle:angle+(i-1)*.18,speed:340,width:40,radius:40});const p=this.point(t.x,t.y,160);this.add(e,'sword-field',p.x,p.y,a.windup+2.3,.45,{radius:160});}
  }else if(e.bossSkin==='menghuo'){
   const kind:BossUnitKind=index===0?'boar':index===1?'wolf':'elephant',count=index===0?4:index===1?3:2;
   for(let i=0;i<count;i++){const lane=(i-(count-1)/2)*(index===0?105:150),b=index===2?angle+(i?-.7:.7):angle,p=this.point(t.x-Math.cos(b)*430-Math.sin(b)*lane,t.y-Math.sin(b)*430+Math.cos(b)*lane,60,false);this.unit(e,kind,p.x,p.y,a.windup+(index===2?i*1.5:0),index===2?6.5:5.2,b,lane);}
  }else if(e.bossSkin==='simayi'){
   if(index===0)scatter(78,.28,'stone');
   else if(index===1)for(let i=0;i<2;i++){const side=i?175:-175,p=this.point(t.x-dx*450+nx*side,t.y-dy*450+ny*side);this.add(e,'dragon',p.x,p.y+30,a.windup,4.2,{angle,speed:260,width:40,radius:40,lane:i?1:-1});}
   else scatter(92,.35,'meteor',.7);
  }
  return true;
 }
 /** Readable E40 mini-boss: each pursuit stone locks before its visible warning. */
 formation(source:BossActor,phase:number):boolean {
  const count=phase%2?3:5;if(this.areaCount+this.host.normalZones()+this.host.otherBusy()+count>6)return false;
  const t=this.host.target();
  if(phase%2)for(let i=0;i<3;i++)this.add(source,'stone',t.x,t.y,.85+i*.7,.4,{radius:76,lane:i,lockAt:i*.7,locationLocked:i===0});
  else for(let i=0;i<5;i++){const x=i===1?-155:i===2?155:0,y=i===3?-155:i===4?155:0,p=this.point(t.x+x,t.y+y,85,false);this.add(source,'stone',p.x,p.y,1,.45,{radius:78,lane:i});}
  return true;
 }
 private face(s:ReforgedState,a:number):void {const x=Math.cos(a),y=Math.sin(a);if(x>.18)s.facing=1;else if(x<-.18)s.facing=-1;if(y>.58)s.back=true;else if(y<.3)s.back=false;}
 updateBoss(e:BossActor,dt:number):void {
  const s=e.bossState||(e.bossState=createBossState()),actions=REFORGED_ACTIONS[e.bossSkin!],t=this.host.target(),dx=t.x-e.x,dy=t.y-e.y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  for(let i=0;i<3;i++)e.bossTimers![i]=Math.max(0,e.bossTimers![i]-dt);
  if(s.phase==='idle'){
   const count=e.hp<(e.maxHp||e.hp)*.5?3:2;let started=false;
   if(d<=650)for(let i=0;i<count;i++){const index=((e.bossNext||0)+i)%count;if(e.bossTimers![index]<=0&&this.start(e,index,angle)){started=true;break;}}
   if(!started){const target=d>270?e.speed:d<240?0:s.moveSpeed;s.moveSpeed+=clamp(target-s.moveSpeed,-800*dt,700*dt);const travel=Math.min(Math.max(0,d-235),s.moveSpeed*dt);if(travel>0&&d>0){e.x+=dx/d*travel;e.y+=dy/d*travel;s.gait=(s.gait+travel/80)%1;this.face(s,angle);}s.blend+=clamp((travel>dt*15?1:0)-s.blend,-dt*8,dt*8);}
   return;
  }
  const a=actions[s.index];s.time+=dt;e.attack=(s.phase==='windup'?0:a.windup)+s.time;
  if(s.phase==='windup'&&s.time>=a.windup){s.phase='cast';s.time-=a.windup;this.host.release(e,a);}
  if(s.phase==='cast'){
   if(e.bossSkin==='caocao'&&s.index===1){const f=Math.min(1,s.time/.45);e.x=s.originX+s.sideX*f;e.y=s.originY+s.sideY*f;}
   const hold=e.bossSkin==='caocao'?(s.index===0?1.15:s.index===2?3:.65):e.bossSkin==='yuanshao'&&s.index===2?3.8:.65;
   if(s.time>=hold){s.phase='recover';s.time-=hold;}
  }else if(s.phase==='recover'&&s.time>=.95){s.phase='idle';s.time=0;e.attack=-1;for(let i=0;i<3;i++)e.bossTimers![i]=Math.max(.7,e.bossTimers![i]);}
 }
 updateUnit(e:BossActor,dt:number):void {
  const u=e.bossUnit!;if(u.owner.hp<=0){e.hp=0;return;}if((u.owner.stunUntil||0)>this.host.now()&&!bossBeastCharging(e))return;
  u.age+=dt;const t=this.host.target(),oldX=e.x,oldY=e.y,elapsed=u.age-u.delay;
  if(elapsed<0){u.phase='ready';return;}if(u.age>=u.life){e.hp=0;return;}
  if(u.kind==='sigil'){u.phase='ready';return;}
  if(u.kind==='decoy'){
   u.phase=elapsed<.95?'windup':elapsed<1.3?'attack':'recover';u.attackAge=elapsed;
   if(elapsed<.55)u.angle=Math.atan2(t.y-e.y,t.x-e.x);
   if(elapsed>=.95&&!u.locked){u.locked=true;this.add(u.owner,'blade',e.x+Math.cos(u.angle)*35,e.y+30+Math.sin(u.angle)*35,0,2.3,{angle:u.angle,speed:320,width:34,radius:34});this.host.impact('blade',e.x,e.y);}
   return;
  }
  if(u.kind==='bowman'){
   const rounds=u.owner.bossMove?.name==='万军齐射'?3:2,round=Math.floor(elapsed/1.3),local=elapsed%1.3;
   u.phase=local<.7?'windup':'attack';u.attackAge=local;
   // Flags turn each new volley; the travelling gap changes direction without hiding archers offscreen.
   if(round>u.round)u.locked=false;const shotAngle=u.angle+(round===1?.25:round===2?-.25:0);
   if(local>=.7&&round<rounds&&!u.locked){u.locked=true;u.round=round;this.add(u.owner,'arrow',e.x+Math.cos(shotAngle)*25,e.y+30+Math.sin(shotAngle)*25,0,2.7,{angle:shotAngle,speed:340,width:9,radius:9});this.host.impact('arrow',e.x,e.y);}
   return;
  }
  if(u.kind==='cart'){
   const round=Math.floor(elapsed/2.5),local=elapsed%2.5;u.phase=local<1?'windup':local<1.5?'attack':'recover';u.attackAge=local;
   if(round>u.round){u.locked=false;u.round=round;u.burst=0;}
   if(!u.locked&&local<1)u.angle=Math.atan2(t.y-e.y,t.x-e.x);
   if(local>=1&&!u.locked)u.locked=true;
   const count=local<1?0:Math.min(3,1+Math.floor((local-1)/.18));while(u.locked&&u.burst<count){u.burst++;this.add(u.owner,'bolt',e.x+Math.cos(u.angle)*40,e.y+30+Math.sin(u.angle)*40,0,2.8,{angle:u.angle,speed:360,width:15,radius:15});this.host.impact('bolt',e.x,e.y);}
   return;
  }
  let speed=u.kind==='boar'?520:u.kind==='wolf'?660:u.kind==='elephant'?380:520,active=true;
  if(u.kind==='wolf'){
   if(elapsed<.65){u.phase='approach';const p=elapsed/.65,side=u.lane<0?-1:1;e.x=u.originX+Math.cos(u.angle)*110*p-Math.sin(u.angle)*side*Math.sin(p*Math.PI)*60;e.y=u.originY+Math.sin(u.angle)*110*p+Math.cos(u.angle)*side*Math.sin(p*Math.PI)*60;active=false;}
   else if(elapsed<1.4){u.phase='windup';if(!u.locked){u.angle=Math.atan2(t.y-e.y,t.x-e.x);u.locked=true;}active=false;}
   else if(elapsed<2.2){u.phase='attack';u.attackAge=elapsed-1.4;}else{u.phase='recover';active=false;}
  }else if(u.kind==='boar'||u.kind==='elephant'){
   const wind=u.kind==='boar'?.55:.8,duration=u.kind==='boar'?1.25:1.45;
   u.phase=elapsed<wind?'windup':elapsed<wind+duration?'attack':'recover';u.attackAge=Math.max(0,elapsed-wind);active=u.phase==='attack';
  }else{u.phase=elapsed<1.8?'attack':'recover';u.attackAge=elapsed;active=elapsed<1.8;}
  if(active){e.x+=Math.cos(u.angle)*speed*dt;e.y+=Math.sin(u.angle)*speed*dt;const p=this.point(e.x,e.y,40,false);if(p.x!==e.x||p.y!==e.y){e.x=p.x;e.y=p.y;u.phase='recover';u.age=u.life-.45;}
   const rx=u.kind==='elephant'?65:u.kind==='boar'?38:32,ry=u.kind==='elephant'?47:27;
   const height=u.kind==='elephant'?55:u.kind==='rider'?65:35;
   if(!u.hit&&sweepEllipseTime(oldX-t.x,oldY+height-t.y-30,e.x-t.x,e.y+height-t.y-30,rx+18,ry+18)!==null){u.hit=true;this.host.hit(e.x,e.y);}
  }
  u.gait=(u.gait+Math.hypot(e.x-oldX,e.y-oldY)/100)%1;
 }
 update(dt:number):void {
  const t=this.host.target();for(const h of this.hazards){if(!h.active)continue;if(h.source.hp<=0||h.nodes?.some(n=>n.hp<=0)){h.active=false;continue;}if((h.source.stunUntil||0)>this.host.now())continue;
   const old=h.age;h.age+=dt;h.contactLife=Math.max(0,h.contactLife-dt);if(h.lockAt!==undefined&&!h.locationLocked&&h.age>=h.lockAt){const p=this.point(t.x,t.y,h.radius,false);h.x=h.originX=p.x;h.y=h.originY=p.y;h.locationLocked=true;}if(h.age<h.delay)continue;
   const end=h.delay+h.duration;if(old>=end){h.active=false;continue;}
   const elapsed=Math.min(h.age,end)-h.delay,step=Math.max(0,Math.min(h.age,end)-Math.max(old,h.delay));
   if(!area(h.kind)){
    const x=h.x,y=h.y,c=Math.cos(h.angle),s=Math.sin(h.angle);h.distance+=h.speed*step;
    const bend=h.kind==='dragon'?Math.sin(h.distance/160)*22*h.lane:0;h.x=h.originX+c*h.distance-s*bend;h.y=h.originY+s*h.distance+c*bend;
    const tail=h.kind==='dragon'?240:0;let collide=false;
    if(h.kind==='blade'){for(let i=0;i<=6;i++){const b=h.angle-Math.PI/2+Math.PI*i/6,ox=Math.cos(b)*(h.radius+11),oy=Math.sin(b)*(h.radius+11);if(sweepEllipseTime(x+ox-t.x,y+oy-t.y-30,h.x+ox-t.x,h.y+oy-t.y-30,31,35)!==null)collide=true;}}
    else for(let i=0;i<(tail?4:1);i++){const back=tail*i/3;if(sweepEllipseTime(x-c*back-t.x,y-s*back-(t.y+30),h.x-c*back-t.x,h.y-s*back-(t.y+30),h.width+18,h.width+22)!==null)collide=true;}
    if(this.host.intercept(x,y,h.x,h.y,h.kind)){h.active=false;continue;}
    if(!h.hit&&collide){h.hit=true;if(this.host.hit(h.x,h.y-30)){h.contactLife=.2;h.contactX=t.x;h.contactY=t.y+30;}if(h.kind!=='dragon')h.duration=elapsed+.12;}
   }else{
    if(old<h.delay)this.host.impact(h.kind,h.x,h.y);
    const due=h.kind==='wine'?elapsed>=h.nextHit:!h.hit;let hit=false;
    if(h.kind==='chain'&&h.nodes){const a=h.nodes[0],b=h.nodes[1];hit=sweepEllipseTime(a.x-t.x,a.y+26-(t.y+30),b.x-t.x,b.y+26-(t.y+30),h.radius+18,h.radius+22)!==null;}
    else hit=Math.hypot(t.x-h.x,t.y-h.y)<=h.radius;
    if(due){if(h.kind!=='chain'||hit)h.hit=true;h.nextHit=elapsed+1.2;if(hit&&this.host.hit(h.x,h.y)){h.contactLife=.22;h.contactX=t.x;h.contactY=t.y+30;}}
   }
   if(h.age>=h.delay+h.duration)h.active=false;
  }
 }
 cancel(source:BossActor):void {for(const h of this.hazards)if(h.source===source)h.active=false;for(const e of this.host.actors())if(e.bossUnit?.owner===source)e.hp=0;}
 clear():void {for(const h of this.hazards)h.active=false;}
}
