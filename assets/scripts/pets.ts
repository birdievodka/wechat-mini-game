import {sectorHitsCircle,sweepEllipseTime} from './combat-math';
export const PET_HEROES=['liubei','guanyu','zhangfei'] as const;
export const petName=(id:string)=>id==='guanyu'?'小青蛟':id==='zhangfei'?'橘虎崽':'桃桃兔';
export const petAvailable=(id:string,growth:number)=>PET_HEROES.some(h=>h===id)&&growth>=5;
const petKeys:Record<string,string[]>={};
for(const id of PET_HEROES)petKeys[id]=Array.from({length:5},(_,i)=>'pet-'+id+'-'+i);
export const petFrameKey=(id:string,pose=0)=>petKeys[id]?.[pose]||'';
export const PET_RULES={liubei:{interval:1.2,damage:42,range:400},guanyu:{interval:1.5,damage:54,range:165},zhangfei:{interval:1.8,damage:60,range:220}};
export const petDamageScale=(stage:number)=>[.4,.5,.65,.8,.9,1][Math.max(0,Math.min(5,stage-1))];
export interface PetTarget {x:number;y:number;hp:number;born?:number;animal?:string;kind?:string;archetype?:string;miniBoss?:boolean;elite?:boolean;object?:string;}
export interface PetShot {active:boolean;x:number;y:number;angle:number;distance:number;hits:Set<PetTarget>;bounce:boolean;}
export interface PetHost {
 hero():{x:number;y:number;speed:number;facing:number;stage:number};enemies():readonly PetTarget[];
 valid(e:PetTarget):boolean;center(e:PetTarget):{x:number;y:number};ranged(e:PetTarget):boolean;
 hit(e:PetTarget,damage:number,angle:number,stun:boolean):boolean;
 onScreen(x:number,y:number):boolean;clamp(x:number,y:number):{x:number;y:number};
 shotRoom():boolean;sound():void;
}
/** Simulation only: no engine objects, timers, hero/weapon modifiers or combat RNG. */
export class PetRuntime {
 active=false;id:typeof PET_HEROES[number]='liubei';x=0;y=0;facing=1;moving=false;time=0;gait=0;
 attackAge=-1;attackAngle=0;effectAge=99;effectX=0;effectY=0;effectAngle=0;
 readonly shots:PetShot[]=Array.from({length:2},()=>({active:false,x:0,y:0,angle:0,distance:0,hits:new Set<PetTarget>(),bounce:false}));
 private cooldown=.6;private scan=0;private target?:PetTarget;private fired=false;private fromX=0;private fromY=0;private landX=0;private landY=0;private stunAt=new WeakMap<PetTarget,number>();
 constructor(private host:PetHost){}
 get shotCount(){return this.shots.reduce((n,s)=>n+Number(s.active),0);}
 configure(id:string,growth:number):void {this.clear();if(!petAvailable(id,growth))return;this.id=id as typeof this.id;this.active=true;const h=this.host.hero();this.x=h.x-h.facing*90;this.y=h.y-18;this.facing=h.facing;}
 clear():void {this.active=false;this.attackAge=-1;this.target=undefined;this.effectAge=99;this.time=0;this.gait=0;this.cooldown=.6;this.scan=0;this.moving=false;this.stunAt=new WeakMap();for(const s of this.shots){s.active=false;s.hits.clear();}}
 private valid(e:PetTarget){return e.hp>0&&!e.animal&&(e.born||0)<=0&&this.host.valid(e);}
 private nearest(x:number,y:number,r:number,exclude?:Set<PetTarget>,preferRanged=false):PetTarget|undefined {
  let best:PetTarget|undefined,score=Infinity;for(const e of this.host.enemies()){if(!this.valid(e)||exclude?.has(e))continue;const d=(e.x-x)**2+(e.y-y)**2;if(d>r*r)continue;const v=d+(preferRanged&&!this.host.ranged(e)?r*r:0);if(v<score){score=v;best=e;}}return best;
 }
 update(dt:number):void {
  if(!this.active||!Number.isFinite(dt)||dt<=0)return;this.time+=dt;this.effectAge+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
  const h=this.host.hero(),anchor=this.host.clamp(h.x-h.facing*90,h.y-18),ax=anchor.x,ay=anchor.y,dx=ax-this.x,dy=ay-this.y,d=Math.hypot(dx,dy),oldX=this.x,oldY=this.y;
  if(this.attackAge<0){
   if(d>320&&!this.host.onScreen(this.x,this.y)){this.x=ax;this.y=ay;}
   else if(d>12){const speed=d>160?720:Math.min(580,h.speed+60),step=Math.min(d-7,speed*dt);this.x+=dx/d*step;this.y+=dy/d*step;}
   this.facing=Math.abs(dx)>10?dx>0?1:-1:h.facing;
  }
  this.moving=Math.hypot(this.x-oldX,this.y-oldY)>dt*15;if(this.moving)this.gait=(this.gait+Math.hypot(this.x-oldX,this.y-oldY)/35)%1;
  this.scan-=dt;if(this.scan<=0&&this.attackAge<0){this.scan=.1;this.target=this.nearest(this.x,this.y,PET_RULES[this.id].range,undefined,this.id==='liubei');}
  if(this.attackAge<0&&this.cooldown<=0&&this.target){const target=this.target;this.attackAge=0;this.fired=false;this.cooldown=PET_RULES[this.id].interval;this.attackAngle=Math.atan2(target.y-this.y,target.x-this.x);this.facing=Math.cos(this.attackAngle)<0?-1:1;this.fromX=this.x;this.fromY=this.y;const p=this.host.clamp(target.x,target.y);this.landX=p.x;this.landY=p.y;}
  if(this.attackAge>=0){
   const previous=this.attackAge;this.attackAge+=dt;
   if(this.id==='zhangfei'&&this.attackAge>=.16){const p=Math.min(1,(this.attackAge-.16)/.26);this.x=this.fromX+(this.landX-this.fromX)*p;this.y=this.fromY+(this.landY-this.fromY)*p;}
   const at=this.id==='zhangfei'?.42:.18;
   if(!this.fired&&previous<at&&this.attackAge>=at){this.fired=true;this.strike();}
   if(this.attackAge>=(this.id==='zhangfei'?.66:.48))this.attackAge=-1;
  }
  for(const shot of this.shots)if(shot.active)this.updateShot(shot,dt);
 }
 private strike():void {
  this.effectX=this.x;this.effectY=this.y;this.effectAngle=this.attackAngle;
  const scale=petDamageScale(this.host.hero().stage);
  if(this.id==='liubei'){
   const target=this.nearest(this.x,this.y,400,undefined,true),shot=this.shots.find(s=>!s.active);if(!target||!shot||!this.host.shotRoom())return;
   const c=this.host.center(target);Object.assign(shot,{active:true,x:this.x+this.facing*15,y:this.y+24,angle:Math.atan2(c.y-this.y-24,c.x-this.x-this.facing*15),distance:0,bounce:false});shot.hits.clear();this.host.sound();return;
  }
  this.effectAge=0;this.host.sound();const candidates=this.host.enemies().filter(e=>this.valid(e)).slice().sort((a,b)=>(a.x-this.x)**2+(a.y-this.y)**2-((b.x-this.x)**2+(b.y-this.y)**2));
  if(this.id==='guanyu'){
   let count=0;for(const e of candidates)if(count<6&&sectorHitsCircle(e.x-this.x,e.y-this.y,165,this.attackAngle,140,18)){if(this.host.hit(e,54*scale,Math.atan2(e.y-this.y,e.x-this.x),false))count++;}
  }else{
   const primary=this.target&&this.valid(this.target)&&Math.hypot(this.target.x-this.x,this.target.y-this.y)<=88?this.target:undefined;let count=0;
   if(primary){const stun=!primary.elite&&!primary.miniBoss&&!primary.object&&primary.kind!=='chief'&&this.time-(this.stunAt.get(primary)??-99)>=3;if(this.host.hit(primary,60*scale,this.attackAngle,stun)){count++;if(stun)this.stunAt.set(primary,this.time);}}
   for(const e of candidates)if(e!==primary&&count<5&&Math.hypot(e.x-this.x,e.y-this.y)<=70){if(this.host.hit(e,24*scale,Math.atan2(e.y-this.y,e.x-this.x),false))count++;}
  }
 }
 private updateShot(s:PetShot,dt:number):void {
  const travel=Math.min(640*dt,400-s.distance),nx=s.x+Math.cos(s.angle)*travel,ny=s.y+Math.sin(s.angle)*travel;let first:PetTarget|undefined,toi=Infinity;
  for(const e of this.host.enemies()){if(!this.valid(e)||s.hits.has(e))continue;const c=this.host.center(e),t=sweepEllipseTime(s.x-c.x,s.y-c.y,nx-c.x,ny-c.y,24,30);if(t!==null&&t<toi){toi=t;first=e;}}
  if(first){s.x+=(nx-s.x)*toi;s.y+=(ny-s.y)*toi;s.hits.add(first);this.host.hit(first,(s.bounce?25:42)*petDamageScale(this.host.hero().stage),s.angle,false);
   this.effectX=s.x;this.effectY=s.y-24;this.effectAngle=s.angle;this.effectAge=0;
   const next=s.bounce?undefined:this.nearest(first.x,first.y,140,s.hits);if(next){s.bounce=true;const c=this.host.center(next);s.angle=Math.atan2(c.y-s.y,c.x-s.x);s.distance=0;}else s.active=false;
  }else{s.x=nx;s.y=ny;s.distance+=travel;if(s.distance>=400)s.active=false;}
 }
}
