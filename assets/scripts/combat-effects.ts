import { Color, Graphics } from 'cc';
import { CombatParticles, FX_LIMITS, ParticleShape } from './combat-particles';
import { WeaponId, weaponFor } from './weapons';
import { HeroId } from './campaign';

// Warm paper highlights, jade wood, peach ink, fire and cyan steel. No fullscreen flash.
const RGB = [[255,247,213],[247,194,83],[179,126,60],[74,187,102],[222,250,159],
  [243,133,187],[255,220,234],[255,126,53],[144,115,93],[105,224,211],[190,143,244],[242,229,255],
  [34,109,70],[103,56,143],[135,88,32],[188,62,112]];
const COLORS = RGB.map(c => Array.from({ length: 33 }, (_, i) => new Color(c[0],c[1],c[2],Math.round(i/32*255))));
export const effectInk = (tone: number, alpha = 1): Color => COLORS[tone][Math.max(0,Math.min(32,Math.round(alpha*32)))];
const ink=effectInk;
const TAU = Math.PI * 2;
const PALETTE: Record<string, number> = { sandal:1, pole:2, peach:5, cleaver:0,
  firecracker:7, smg:1, shotgun:1, rocket:7, sword:9, thunder:10, gourd:10,'twin-swords':0,guandao:3,'serpent-spear':9,halberd:15,'silver-spear':9,qinggang:9,yitian:1,'seven-saber':10,'ancient-saber':2,'twin-halberds':0,trident:1,caltrops:8,repeater:2,'phoenix-bow':1,'heavy-crossbow':0,'hand-halberd':1,'chain-hook':8,'oil-jar':7,'thunder-bomb':7,'feather-fan':4,'taiping-book':1,'star-lamps':1,bagua:3,'wood-ox':2,'wood-kite':2 };
type Point = [number, number];
type Kind = 'burst' | 'slash' | 'muzzle' | 'bolt' | 'suction' | 'vortex' | 'hero' | 'hit';
interface Stamp { kind: Kind; id: WeaponId | HeroId; x:number; y:number; tx:number; ty:number; angle:number; radius:number; arc:number; age:number; duration:number; priority:number; seed:number; }
function line(g:Graphics,points:Point[],tone:number,alpha:number,width:number):void {
  g.strokeColor=ink(tone,alpha);g.lineWidth=width;g.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.stroke();
}
function ring(g:Graphics,x:number,y:number,r:number,tone:number,alpha:number,width:number):void {
  g.strokeColor=ink(tone,alpha);g.lineWidth=width;g.circle(x,y,r);g.stroke();
}
function star(g:Graphics,x:number,y:number,r:number,angle:number,tone:number,alpha:number):void {
  g.fillColor=ink(tone,alpha);
  for(let i=0;i<8;i++){const a=angle+i*Math.PI/4,d=i%2?r*.24:r,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.close();g.fill();
}
function petal(g:Graphics,x:number,y:number,r:number,a:number,tone:number,alpha:number):void {
  const c=Math.cos(a),s=Math.sin(a);g.fillColor=ink(tone,alpha);
  g.moveTo(x-c*r,y-s*r);g.bezierCurveTo(x-s*r,y+c*r,x+c*r*1.5-s*r,y+s*r*1.5+c*r,x+c*r,y+s*r);
  g.bezierCurveTo(x+c*r*1.5+s*r,y+s*r*1.5-c*r,x+s*r,y-c*r,x-c*r,y-s*r);g.fill();
}
function shoe(g:Graphics,x:number,y:number,a:number,scale:number,alpha:number):void {
  const c=Math.cos(a)*scale,s=Math.sin(a)*scale,p=(u:number,v:number):Point=>[x+u*c-v*s,y+u*s+v*c];
  g.fillColor=ink(1,alpha*.9);g.strokeColor=ink(14,alpha*.55);g.lineWidth=1.5*scale;g.moveTo(...p(-10,-18));g.bezierCurveTo(...p(-21,7),...p(-10,33),...p(0,34));g.bezierCurveTo(...p(18,33),...p(18,2),...p(8,-18));g.close();g.fill();g.stroke();
  for(let i=0;i<4;i++)line(g,[p(-8,-9+i*9),p(9,-9+i*9)],14,alpha*.4,scale);
  line(g,[p(-10,13),p(0,2),p(10,13)],0,alpha,2.5*scale);line(g,[p(0,2),p(0,-13)],2,alpha,2*scale);
}
/** Rigid blade follows a short tapered crescent, never a full glowing hoop. Hero-local coordinates. */
const SWORD_LAYERS=[[11,.13,.5,9],[5,.55,.3,9],[1.8,.95,.19,0]].map(([width,alpha,extent,tone])=>({width,alpha,tone,points:Array.from({length:10},(_,i)=>{const a=-extent+i*extent/9;return [Math.cos(a),Math.sin(a)];})}));
export function drawSwordTrail(g:Graphics,angle:number,radius:number,tier:number):void {
  const c=Math.cos(angle),s=Math.sin(angle);
  for(const layer of SWORD_LAYERS){g.lineWidth=layer.width;g.strokeColor=ink(layer.tone,layer.alpha);
    for(let i=0;i<layer.points.length;i++){const p=layer.points[i],x=(c*p[0]-s*p[1])*radius,y=35+(s*p[0]+c*p[1])*radius;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();
  }
  star(g,c*radius,35+s*radius,5+tier,angle,0,.9);
  for(let i=0;i<2;i++){const a=angle-.19-i*.13;star(g,Math.cos(a)*(radius-7),35+Math.sin(a)*(radius-7),3-i,angle,9,.55-i*.15);}
}
/** Bounded world-space physics; complex stamps use shared Graphics, particles can use retained sprite quads. */
export class CombatEffects {
  readonly particles = new CombatParticles();
  readonly stamps: Stamp[] = Array.from({length:FX_LIMITS.stamps},()=>({kind:'hit',id:'sandal',x:0,y:0,tx:0,ty:0,angle:0,radius:0,arc:0,age:1,duration:0,priority:0,seed:0}));
  private stamp(kind:Kind,id:Stamp['id'],x:number,y:number,angle:number,radius:number,duration:number,priority=1,tx=0,ty=0,arc=0):void {
    const limit=priority>=2?FX_LIMITS.stamps:FX_LIMITS.normalStamps;
    let slot:Stamp|undefined,oldest=-1;
    for(let i=0;i<limit;i++){const candidate=this.stamps[i];if(candidate.age>=candidate.duration){slot=candidate;break;}
      if(candidate.priority<=priority&&candidate.age/candidate.duration>oldest){oldest=candidate.age/candidate.duration;slot=candidate;}}
    if(slot)Object.assign(slot,{kind,id,x,y,angle,radius,duration,priority,tx,ty,arc,age:0,seed:this.particles.random()*TAU});
  }
  private spray(x:number,y:number,count:number,tone:number,shape:ParticleShape,angle:number,spread:number,speed:number,size:number,priority=1):void {
    for(let i=0;i<count;i++){const a=angle+(this.particles.random()-.5)*spread;
      this.particles.emit(x,y,a,speed*(.4+this.particles.random()*.6),.18+this.particles.random()*.3,size*(.65+this.particles.random()*.5),tone,shape,priority,shape==='dust'?20:-100,shape==='dust'?3:1.8);}
  }
  update(dt:number):void {this.particles.update(dt);for(const s of this.stamps)s.age=Math.min(s.duration,s.age+dt);}
  clear():void {this.particles.clear();for(const s of this.stamps)s.age=s.duration;}
  hit(id:WeaponId,x:number,y:number,angle:number,kill:boolean):void {
    const tone=PALETTE[id]??(weaponFor(id).category==='melee'?9:weaponFor(id).category==='magic'?10:1);
    this.stamp('hit',id,x,y,angle,kill?25:17,.17);
    this.spray(x,y,kill?7:id==='smg'||id==='gourd'?2:4,tone,id==='peach'?'petal':id==='pole'?'chip':'spark',angle,2.5,kill?160:115,3.5);
  }
  muzzle(id:WeaponId,x:number,y:number,angle:number):void {
    if(id==='gourd'){this.stamp('vortex',id,x,y,angle,38,.6);return;}
    this.stamp('muzzle',id,x,y,angle,id==='shotgun'?48:id==='rocket'?38:24,id==='shotgun'?.13:.1);
    if(id==='smg'||id==='shotgun')this.spray(x,y,id==='shotgun'?3:1,1,'chip',angle-Math.PI/2,.6,85,3);
    else if(id==='peach'||id==='firecracker')this.spray(x,y,3,(PALETTE[id]??9),id==='peach'?'petal':'spark',angle,1.4,80,3);
  }
  slash(id:WeaponId,x:number,y:number,angle:number,radius:number,arc:number):void {
    this.stamp('slash',id,x,y,angle,radius,.23,1,0,0,arc*Math.PI/180);
    const tip=angle+.2;this.spray(x+Math.cos(tip)*radius*.8,y+Math.sin(tip)*radius*.8,5,(PALETTE[id]??9),id==='pole'?'dust':'spark',tip,1.4,100,4);
  }
  burst(id:WeaponId,x:number,y:number,radius:number,skill=false):void {
    this.stamp('burst',id,x,y,0,radius,id==='peach'?.5:.42,skill?2:1);
    this.spray(x,y,id==='peach'?15:id==='rocket'?20:14,(PALETTE[id]??9),id==='peach'?'petal':'spark',0,TAU,radius*3,5,skill?2:1);
    if(id!=='peach')this.spray(x,y,5,8,'dust',Math.PI/2,TAU,radius*1.1,11,skill?2:1);
  }
  beam(id:'thunder'|'gourd',x:number,y:number,tx:number,ty:number):void {
    this.stamp(id==='thunder'?'bolt':'suction',id,x,y,0,0,id==='thunder'?.23:.16,1,tx,ty);
    if(id==='thunder'){this.spray(tx,ty,5,10,'star',0,TAU,85,4);this.stamp('hit',id,tx,ty,0,25,.22);}
    else this.spray(x,y,1,10,'star',Math.atan2(ty-y,tx-x),.3,150,3);
  }
  trail(id:WeaponId,x:number,y:number,angle:number):void {
    if(id==='rocket'){this.particles.emit(x,y,angle+Math.PI,75,.28,7,8,'dust',0,20,1);this.particles.emit(x,y,angle+Math.PI,65,.12,4,7,'spark',0,0,0);}
    else if(id==='peach')this.particles.emit(x,y,angle+Math.PI,35,.3,4,5,'petal',0,10,1);
    else if(id==='firecracker')this.particles.emit(x,y,angle+Math.PI,45,.2,3,1,'spark',0,-80,2);
    else if(id==='sandal')this.particles.emit(x,y,angle+Math.PI,35,.16,2.5,1,'spark',0,-35,1);
  }
  hero(id:HeroId,x:number,y:number,angle:number,radius:number):void {
    this.stamp('hero',id,x,y,angle,radius,id==='guanyu'?.72:.8,3);
    const tone=id==='zhaoyun'?9:id==='kongming'?3:id==='liubei'?1:id==='guanyu'?3:5;
    this.spray(x,y+25,id==='guanyu'?55:64,tone,id==='guanyu'?'chip':id==='zhangfei'?'petal':'spark',id==='guanyu'?angle:0,id==='guanyu'?1.25:TAU,radius*2,5,2);
    this.spray(x,y+20,12,0,'star',0,TAU,160,4,2);
  }
  draw(ground:Graphics,air:Graphics,cx:number,cy:number,hw:number,hh:number,particlesAsSprites=false):void {
    const visible=(x:number,y:number,r=80):boolean=>Math.abs(x-cx)<hw+r&&Math.abs(y-cy)<hh+r;
    for(const s of this.stamps){
      if(s.age>=s.duration)continue;
      const beam=s.kind==='bolt'||s.kind==='suction';
      if(beam?visible((s.x+s.tx)/2,(s.y+s.ty)/2,Math.hypot(s.tx-s.x,s.ty-s.y)/2+48):visible(s.x,s.y,s.radius+120))this.drawStamp(ground,air,s);
    }
    if(particlesAsSprites)return;
    for(const p of this.particles.slots){
      if(p.life<=0||!visible(p.x,p.y))continue;
      const fade=Math.min(1,p.life/p.duration*1.6),size=p.size*(.45+.55*p.life/p.duration);
      air.fillColor=ink(p.tone,fade*.88);
      if(p.shape==='spark'){
        const speed=Math.hypot(p.vx,p.vy),length=Math.min(17,3+speed*.035),angle=Math.atan2(p.vy,p.vx);
        line(air,[[p.x,p.y],[p.x-Math.cos(angle)*length,p.y-Math.sin(angle)*length]],p.tone,fade,Math.max(1,size*.6));
      }else if(p.shape==='petal')petal(air,p.x,p.y,size,p.angle,p.tone,fade);
      else if(p.shape==='star')star(air,p.x,p.y,size*1.5,p.angle,p.tone,fade);
      else if(p.shape==='dust'){air.fillColor=ink(p.tone,fade*.22);air.ellipse(p.x,p.y,size*1.4,size);air.fill();}
      else if(p.shape==='bean'){air.ellipse(p.x,p.y,size,size*.7);air.fill();}
      else {star(air,p.x,p.y,size,p.angle,p.tone,fade);}
    }
  }
  flight(g:Graphics,id:WeaponId,x:number,y:number,angle:number):void {
    const c=Math.cos(angle),s=Math.sin(angle),tone=PALETTE[id]??9;
    const length=id==='smg'?38:id==='shotgun'?23:id==='rocket'?38:24;
    line(g,[[x-c*length,y-s*length],[x,y]],tone,.25,id==='rocket'?13:id==='peach'?9:6);
    line(g,[[x-c*length*.7,y-s*length*.7],[x,y]],id==='peach'?6:0,.8,id==='smg'?2:id==='rocket'?5:2.5);
    if(id==='rocket')star(g,x-c*16,y-s*16,8,angle,1,.95);
    if(id==='peach')star(g,x,y,10,angle,6,.8);
  }
  private drawStamp(ground:Graphics,g:Graphics,s:Stamp):void {
    const t=s.age/s.duration,fade=1-t,ease=1-(1-t)**3,tone=PALETTE[s.id as WeaponId]??1;
    const {x,y,radius:r}=s;
    if(s.kind==='hero'){this.drawHero(ground,g,s,t,fade,ease);return;}
    if(s.kind==='hit'){
      star(g,x,y,r*(.55+.55*ease),s.angle,tone,fade*.8);star(g,x,y,r*.48,s.angle,0,fade);
    }else if(s.kind==='muzzle'){
      const c=Math.cos(s.angle),d=Math.sin(s.angle),size=r*(1-t*.6);
      const cone:Point[]=[[x,y],[x+c*size-d*size*.18,y+d*size+c*size*.18],[x+c*size*.7,y+d*size*.7],[x+c*size+d*size*.24,y+d*size-c*size*.24],[x,y]];
      line(g,cone,tone,fade*.8,5);star(g,x+c*12,y+d*12,size*.4,s.angle,0,fade);
    }else if(s.kind==='slash'){
      const width=s.id==='pole'?17:12,start=s.angle-s.arc*.5,end=start+s.arc;
      // A tapered filled crescent instead of a thin soft line.
      g.fillColor=ink(s.id==='pole'?1:tone,fade*.45);
      for(let i=0;i<=20;i++){const a=start+(end-start)*i/20,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}
      for(let i=20;i>=0;i--){const a=start+(end-start)*i/20,inner=r-width*Math.sin(i/20*Math.PI),px=x+Math.cos(a)*inner,py=y+Math.sin(a)*inner;g.lineTo(px,py);}g.close();g.fill();
      const points:Point[]=[];for(let i=0;i<=16;i++){const a=start+s.arc*i/16;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}line(g,points,0,fade,3);
      star(g,x+Math.cos(s.angle)*r,y+Math.sin(s.angle)*r,12*fade,s.angle,0,fade);
    }else if(s.kind==='burst'){
      const rr=r*(.3+.7*ease);
      ground.fillColor=ink(tone,fade*.13);ground.circle(x,y,rr);ground.fill();
      ring(ground,x,y,rr,tone,fade*.8,3+fade*3);ring(ground,x,y,rr*.8,0,fade*.5,2);
      if(s.id==='star-lamps'){for(let i=0;i<7;i++){const a=i*TAU/7+s.age;star(ground,x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.8,8,s.age,1,fade);}}
      else if(s.id==='peach')for(let i=0;i<5;i++){const a=i*TAU/5;petal(ground,x+Math.cos(a)*rr*.48,y+Math.sin(a)*rr*.48,rr*.27,a,5,fade*.34);}
      else {
        // A brief jagged fire silhouette breaks into sparks, rather than looking like a target reticle.
        const flame=Math.max(0,1-t*2.3),size=r*(.35+ease*.3);
        if(flame>0){g.fillColor=ink(7,flame*.65);g.moveTo(x+size,y);
          for(let i=1;i<24;i++){const a=i*TAU/24,at=size*(i%2?.48:1);g.lineTo(x+Math.cos(a)*at,y+Math.sin(a)*at);}g.close();g.fill();
          star(g,x,y,size*.7,s.seed,1,flame*.9);}
        for(let i=0;i<7;i++){const a=i*TAU/7+s.seed,at=r*(.25+ease*.48);star(g,x+Math.cos(a)*at,y+Math.sin(a)*at,(12+i%3*4)*fade,a,7,fade*.7);}
      }
      star(g,x,y,Math.min(40,r*.42)*Math.max(0,1-t*2.6),s.seed,0,Math.max(0,1-t*2.6));
    }else if(s.kind==='bolt'){
      const dx=s.tx-x,dy=s.ty-y,length=Math.hypot(dx,dy)||1,points:Point[]=[];
      for(let i=0;i<=9;i++){const offset=i===0||i===9?0:Math.sin(i*7.13+s.seed)*13;points.push([x+dx*i/9-dy/length*offset,y+dy*i/9+dx/length*offset]);}
      line(g,points,10,fade*.2,14);line(g,points,10,fade,5);line(g,points,11,fade,2);
      const mid=points[5];line(g,[mid,[mid[0]+18,mid[1]+23],[mid[0]+8,mid[1]+24]],10,fade*.7,2);
    }else if(s.kind==='vortex'){
      for(let j=0;j<3;j++){
        const points:Point[]=[];for(let i=0;i<=24;i++){const p=i/24,a=p*TAU*1.4+t*9+j*TAU/3,dist=r*(.18+p*.82);points.push([x+Math.cos(a)*dist,y+Math.sin(a)*dist*.65]);}
        line(g,points,10,fade*.22,7);line(g,points,j===0?11:10,fade*.85,2.5);
        const tip=points[24];star(g,tip[0],tip[1],5,0,11,fade);
      }
    }else if(s.kind==='suction'){
      const dx=s.tx-x,dy=s.ty-y,points:Point[]=[];
      for(let i=0;i<=12;i++){const p=i/12,a=s.seed+p*TAU+t*5,envelope=Math.sin(p*Math.PI)*12;points.push([x+dx*p+Math.cos(a)*envelope,y+dy*p+Math.sin(a)*envelope]);}
      line(g,points,10,fade*.6,3);const p=points[Math.min(12,Math.floor(t*12))];star(g,p[0],p[1],5,0,11,fade);
    }
  }
  private drawHero(ground:Graphics,g:Graphics,s:Stamp,t:number,fade:number,ease:number):void {
    const {x,y,radius:r}=s,alpha=Math.min(1,fade*1.5),rr=r*(.25+.75*ease);
    if(s.id==='zhaoyun'){
      const c=Math.cos(s.angle),d=Math.sin(s.angle);for(let j=-1;j<=1;j++){const u=r*ease,v=j*18;line(g,[[x-d*v,y+c*v],[x+c*u-d*v,y+d*u+c*v]],9,alpha*.35,13);line(g,[[x-d*v,y+c*v],[x+c*u-d*v,y+d*u+c*v]],0,alpha,3);const tx=x+c*u-d*v,ty=y+d*u+c*v;star(g,tx,ty,15-j*2,s.angle,9,alpha);line(g,[[tx-c*26-d*12,ty-d*26+c*12],[tx,ty],[tx-c*26+d*12,ty-d*26-c*12]],0,alpha,3);}return;
    }else if(s.id==='kongming'){
      const reach=r*(.2+.8*ease);for(let j=-2;j<=2;j++){const a=s.angle+j*.22,points:Point[]=[];for(let i=0;i<=18;i++){const u=i/18,side=Math.sin(u*Math.PI*2+t*5+j)*12*u;points.push([x+Math.cos(a)*reach*u-Math.sin(a)*side,y+Math.sin(a)*reach*u+Math.cos(a)*side]);}line(g,points,3,alpha*.2,16);line(g,points,4,alpha*.8,4);const tip=points[18];petal(g,tip[0],tip[1],17,a,0,alpha*.8);}return;
    }else if(s.id==='guanyu'){
      // A coiling jade dragon grows along the actual fan, clear ivory cutting edge.
      const c=Math.cos(s.angle),d=Math.sin(s.angle),at=(u:number,v:number):Point=>[x+c*u-d*v,y+32+d*u+c*v];
      const reach=r*(.3+.7*ease),width=reach*.58;
      ground.fillColor=ink(3,fade*.1);ground.moveTo(...at(0,0));
      for(let i=0;i<=24;i++){const a=-.655+i*1.31/24;ground.lineTo(...at(Math.cos(a)*reach,Math.sin(a)*reach));}ground.close();ground.fill();
      for(let strand=0;strand<3;strand++){
        const points:Point[]=[];for(let i=0;i<=24;i++){const p=i/24,v=Math.sin(p*TAU*1.15-t*5+strand*.7)*width*(.12+strand*.035)*p;points.push(at(p*reach,v));}
        line(g,points,12,alpha*.22,25-strand*4);line(g,points,3,alpha*.8,14-strand*3);line(g,points,strand===0?4:3,alpha,4-strand*.7);
      }
      const edge:Point[]=[];for(let i=0;i<=24;i++){const a=-.655+i*1.31/24;edge.push(at(Math.cos(a)*reach,Math.sin(a)*reach));}line(g,edge,4,fade*.8,4);
      // Two horns, whiskers and bright eyes give the leading shockwave a dragon silhouette.
      const head=at(reach*.9,0);g.fillColor=ink(3,alpha*.9);g.strokeColor=ink(12,alpha*.7);g.lineWidth=2.5;g.ellipse(head[0],head[1],38,23);g.fill();g.stroke();
      for(const side of [-1,1]){line(g,[at(reach*.87,side*14),at(reach*.79,side*48),at(reach*.9,side*34)],4,alpha,4);line(g,[at(reach*.94,side*9),at(reach*.99,side*33),at(reach*.86,side*38)],12,alpha*.8,2.5);const eye=at(reach*.93,side*9);star(g,eye[0],eye[1],6,s.angle,0,alpha);}
      line(g,[at(reach*.95,-5),at(reach*.97,0),at(reach*.95,5)],12,alpha,3);
      for(let i=0;i<17;i++){const a=-.6+i*.075,p=at(Math.cos(a)*reach*(.6+(i%3)*.1),Math.sin(a)*reach);petal(g,p[0],p[1],5,s.angle,4,fade*.8);}
    }else if(s.id==='liubei'){
      ground.fillColor=ink(1,fade*.07);ground.circle(x,y,rr);ground.fill();
      for(let j=0;j<2;j++)ring(ground,x,y,r*Math.min(1,.2+ease*.8-j*.12),j?0:1,alpha*(j?.45:.75),j?2:5);
      for(let i=0;i<8;i++){
        const a=i*TAU/8+s.seed*.1,dist=rr*.76;shoe(g,x+Math.cos(a)*dist,y+25+Math.sin(a)*dist,a-Math.PI/2,.65+fade*.45,alpha*.8);
        const end=r*.96;line(ground,[[x+Math.cos(a)*rr*.52,y+Math.sin(a)*rr*.52],[x+Math.cos(a)*end,y+Math.sin(a)*end]],1,fade*.55,2);
      }
      // The face stays clear; the large comic sole stamp sits above and fades quickly.
      if(t<.52)shoe(g,x,y+116,Math.sin(t*8)*.18,1.3,(1-t/.52)*.85);
      for(let i=0;i<10;i++){const a=i*TAU/10;star(g,x+Math.cos(a)*rr,y+25+Math.sin(a)*rr,7*fade,a,0,fade);}
    }else{
      // A peach-ink roar: jagged mane, brow/eyes and mouth, followed by petal shockwaves.
      for(let j=0;j<3;j++){const rad=r*Math.max(.05,ease-j*.14);ring(ground,x,y,rad,j===1?13:5,alpha*(.75-j*.12),j===0?8:3);}
      for(let i=0;i<12;i++){const a=i*TAU/12+t*.5,dist=rr*.85;petal(g,x+Math.cos(a)*dist,y+28+Math.sin(a)*dist,10+fade*5,a,5,fade*.8);}
      const size=63*(.75+Math.sin(Math.min(1,t*2)*Math.PI)*.25),my=y+123;
      if(t<.7){const f=Math.min(1,(.7-t)*3);g.fillColor=ink(13,f*.42);g.strokeColor=ink(5,f*.75);g.lineWidth=2;
        for(let i=0;i<24;i++){const a=i*TAU/24,rad=size*(i%2?1:1.35);const px=x+Math.cos(a)*rad,py=my+Math.sin(a)*rad;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.close();g.fill();g.stroke();
        line(g,[[x-size*.7,my+size*.3],[x-size*.22,my+size*.17],[x-size*.38,my+size*.02]],6,f,5);
        line(g,[[x+size*.7,my+size*.3],[x+size*.22,my+size*.17],[x+size*.38,my+size*.02]],6,f,5);
        g.fillColor=ink(13,f*.9);g.ellipse(x,my-size*.25,size*.28,size*.38);g.fill();g.strokeColor=ink(6,f);g.lineWidth=3;g.ellipse(x,my-size*.25,size*.28,size*.38);g.stroke();
        for(const side of [-1,1])line(g,[[x+side*size*.12,my],[x+side*size*.16,my-size*.2]],0,f,3);
        for(const side of [-1,1]){line(g,[[x+side*size*.74,my+size*.04],[x+side*size*.52,my-size*.12],[x+side*size*.42,my-size*.48]],6,f*.8,3);star(g,x+side*size*.4,my+size*.1,5,0,0,f);}
      }
    }
  }
}
