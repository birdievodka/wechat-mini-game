import {Graphics} from 'cc';
import {effectInk} from './combat-effects';
import {CombatParticles} from './combat-particles';
import {commonSkillFor} from './common-skills';
import {drawGoldenSweep,drawSweepContact} from './sweep-effects';
interface Visual {id:string;kind:string;x:number;y:number;angle:number;radius:number;age:number;life:number;tx:number;ty:number;}
const TAU=Math.PI*2;
function line(g:Graphics,x:number,y:number,tx:number,ty:number,tone:number,alpha:number,width:number){g.strokeColor=effectInk(tone,alpha);g.lineWidth=width;g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();}
function ring(g:Graphics,x:number,y:number,r:number,tone:number,alpha:number,width:number){g.strokeColor=effectInk(tone,alpha);g.lineWidth=width;g.circle(x,y,r);g.stroke();}
function polygon(g:Graphics,x:number,y:number,r:number,sides:number,a:number,tone:number,alpha:number,width:number){g.strokeColor=effectInk(tone,alpha);g.lineWidth=width;for(let i=0;i<=sides;i++){const b=a+i*TAU/sides,px=x+Math.cos(b)*r,py=y+Math.sin(b)*r;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.stroke();}
function arrow(g:Graphics,x:number,y:number,a:number,size:number,tone:number,alpha:number){const c=Math.cos(a),s=Math.sin(a);line(g,x-c*size,y-s*size,x+c*size,y+s*size,tone,alpha,2.5);g.fillColor=effectInk(tone,alpha);g.moveTo(x+c*size*1.4,y+s*size*1.4);g.lineTo(x+c*size*.4-s*size*.35,y+s*size*.4+c*size*.35);g.lineTo(x+c*size*.4+s*size*.35,y+s*size*.4-c*size*.35);g.close();g.fill();}
/** At most 32 shared-layer visuals. No skill creates an independent Graphics or an unbounded emitter. */
export class CommonSkillEffects {
 private visuals:Visual[]=[];
 constructor(private particles:CombatParticles){}
 play(id:string,kind:string,x:number,y:number,angle:number,radius:number,life=.6,tx=x,ty=y):void {
  if(this.visuals.length>=32)this.visuals.shift();this.visuals.push({id,kind,x,y,angle,radius,life,age:0,tx,ty});
  if(kind==='sweep'||kind==='sweep-hit'){
   const contact=kind==='sweep-hit',count=contact?6:14;
   for(let i=0;i<count;i++){
    const a=contact?angle+(this.particles.random()-.5)*1.5:i*TAU/count,at=contact?0:radius*(.82+this.particles.random()*.14);
    this.particles.emit(x+Math.cos(a)*at,y+Math.sin(a)*at,contact?a:a-Math.PI/2,contact?95+this.particles.random()*110:50+this.particles.random()*70,.12+this.particles.random()*.16,contact?3+i%2:2.5+i%3,i%4===0?3:i%3===0?0:1,i%4===0?'chip':'spark',2,-90,3);
   }return;
  }
  const tone=kind==='fire'?7:kind==='lightning'?10:kind==='water'?9:kind==='heal'?5:kind==='dash'?9:1;
  const count=kind==='arrow'?2:kind==='shield-hit'?8:kind==='meteor'?18:12;
  for(let i=0;i<count;i++){const a=this.particles.random()*TAU;this.particles.emit(x,y+16,a,70+this.particles.random()*150,.2+this.particles.random()*.25,3+this.particles.random()*2,tone,kind==='heal'?'petal':'spark',2,-60,1.5);}
 }
 update(dt:number):void{let n=0;for(const v of this.visuals){v.age+=dt;if(v.age<v.life)this.visuals[n++]=v;}this.visuals.length=n;}
 clear():void{this.visuals.length=0;}
 stop(kind:string):void{for(const v of this.visuals)if(v.kind===kind)v.age=v.life;}
 draw(ground:Graphics,air:Graphics,cx:number,cy:number,hw:number,hh:number,px:number,py:number):void {
  for(const v of this.visuals){const d=commonSkillFor(v.id),t=v.age/v.life,fade=1-t,ease=1-(1-t)**3;
   const follow=['shield','cleanse','barrier','damage-buff','haste-buff','speed-buff','heal','catch','summon'].indexOf(v.kind)>=0;
   const x=follow?px:v.x,y=follow?py:v.y,r=v.radius;
   if(Math.abs(x-cx)>hw+r+400||Math.abs(y-cy)>hh+r+400)continue;
   if(v.kind==='arrow'||v.kind==='backstab'||v.kind==='retreat'){
    const a=v.angle,c=Math.cos(a),s=Math.sin(a),length=v.kind==='arrow'?Math.hypot(v.tx-x,v.ty-y):r,progress=Math.min(1,t*3),tone=v.kind==='retreat'?10:1;
    line(air,x,y+24,x+c*length*progress,y+24+s*length*progress,tone,fade*.18,20);line(air,x,y+24,x+c*length*progress,y+24+s*length*progress,0,fade*.8,3);
    arrow(air,x+c*length*progress,y+24+s*length*progress,a,v.kind==='arrow'?15:26,tone,fade);
   }else if(v.kind==='dash'){
    const c=Math.cos(v.angle),s=Math.sin(v.angle),length=r*ease;
    for(const side of [-1,1]){const ox=-s*side*33,oy=c*side*33;line(ground,x+ox,y+oy,x+c*length+ox,y+s*length+oy,9,fade*.35,12);line(air,x+ox,y+oy+22,x+c*length+ox,y+s*length+oy+22,0,fade*.8,2);}
    arrow(air,x+c*length,y+s*length+24,v.angle,35,9,fade);
   }else if(v.kind==='sweep'){
    drawGoldenSweep(ground,air,x,y,v.angle,r,v.age,v.life);
   }else if(v.kind==='sweep-hit'){
    drawSweepContact(ground,air,x,y,v.angle,r,v.age,v.life);
   }else if(v.kind==='shield'||v.kind==='cleanse'||v.kind==='barrier'||v.kind==='shield-hit'){
    const tone=v.kind==='cleanse'?4:v.kind==='barrier'?3:9,rad=v.kind==='shield-hit'?r*(1+ease*.3):r;
    polygon(ground,x,y,rad,v.kind==='barrier'?8:6,.2+t*.4,tone,fade*.3,8);polygon(air,x,y+24,rad*.8,v.kind==='barrier'?8:6,-.2+t*.2,0,fade*.75,2.5);
    for(let i=0;i<6;i++){const a=i*TAU/6;line(air,x+Math.cos(a)*rad*.7,y+24+Math.sin(a)*rad*.7,x+Math.cos(a)*rad*.92,y+24+Math.sin(a)*rad*.92,1,fade*.8,5);}
    if(v.kind==='shield')for(const side of [-1,1]){const ox=x+side*rad*.65,oy=y+28;air.fillColor=effectInk(9,fade*.45);air.strokeColor=effectInk(1,fade*.95);air.lineWidth=3;air.moveTo(ox-16,oy+29);air.lineTo(ox+16,oy+29);air.lineTo(ox+20,oy+2);air.lineTo(ox,oy-24);air.lineTo(ox-20,oy+2);air.close();air.fill();air.stroke();line(air,ox,oy-10,ox,oy+18,0,fade*.9,3);line(air,ox-10,oy+7,ox+10,oy+7,0,fade*.9,3);}

   }else if(v.kind==='water'){
    const rr=r*Math.min(1,v.age/.55);ground.fillColor=effectInk(9,fade*.12);ground.circle(x,y,rr);ground.fill();ring(ground,x,y,rr,9,fade*.65,15);ring(air,x,y+12,rr,0,fade*.8,3);
    for(let i=0;i<14;i++){const a=i*TAU/14+t*.15,ox=x+Math.cos(a)*rr,oy=y+12+Math.sin(a)*rr;air.strokeColor=effectInk(0,fade*.8);air.lineWidth=2;air.arc(ox,oy,9+Math.sin(i+t*8)*3,a,a+2.5,false);air.stroke();}
   }else if(v.kind==='fire'){
    ring(ground,x,y,r,7,fade*.45,3);ground.fillColor=effectInk(7,fade*.13);ground.circle(x,y,r);ground.fill();
    for(let i=0;i<7;i++){const a=i*TAU/7,ox=x+Math.cos(a)*r*.5,oy=y+Math.sin(a)*r*.4,h=(45+Math.sin(i*3+t*12)*15)*fade;
     air.fillColor=effectInk(i%2?1:7,fade*.8);air.moveTo(ox-15,oy);air.bezierCurveTo(ox-30,oy+h*.4,ox+13,oy+h*.7,ox,oy+h);air.bezierCurveTo(ox+35,oy+h*.5,ox+22,oy+h*.2,ox+15,oy);air.close();air.fill();line(air,ox,oy+5,ox+4,oy+h*.65,0,fade*.65,3);}
   }else if(v.kind==='lightning'||v.kind==='meteor'||v.kind==='meteor-fall'){
    const meteor=v.kind!=='lightning',tone=meteor?1:10;ring(ground,x,y,r,tone,fade*.45,3);polygon(ground,x,y,r*.7,meteor?5:6,t,tone,fade*.5,2);
    if(meteor){
     if(v.kind==='meteor-fall'){
      const progress=t*t,ox=x-160*(1-progress),oy=y+25+300*(1-progress),size=24;
      air.fillColor=effectInk(7,.35);air.moveTo(ox-18,oy-5);air.lineTo(ox-86,oy+155);air.lineTo(ox+14,oy+12);air.close();air.fill();line(air,ox-58,oy+110,ox,oy,1,.95,12);line(air,ox-42,oy+80,ox,oy,0,.95,4);
      air.fillColor=effectInk(10,.95);air.strokeColor=effectInk(1,1);air.lineWidth=3;for(let i=0;i<7;i++){const a=i*TAU/7+t*2,rr=size*(i%2?.8:1);if(!i)air.moveTo(ox+Math.cos(a)*rr,oy+Math.sin(a)*rr);else air.lineTo(ox+Math.cos(a)*rr,oy+Math.sin(a)*rr);}air.close();air.fill();air.stroke();line(air,ox-8,oy+12,ox+9,oy-10,0,.9,4);
     }else{
      const rr=r*(.6+.4*ease);ground.fillColor=effectInk(10,fade*.15);ground.circle(x,y,rr);ground.fill();ring(air,x,y+10,rr,1,fade*.85,7);polygon(air,x,y+10,rr*.75,5,-Math.PI/2,10,fade*.85,3);
      air.fillColor=effectInk(1,fade*.9);for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=rr*(i%2?.22:.68),px=x+Math.cos(a)*rad,py=y+10+Math.sin(a)*rad;if(!i)air.moveTo(px,py);else air.lineTo(px,py);}air.close();air.fill();for(let i=0;i<5;i++){const a=i*TAU/5;line(air,x+Math.cos(a)*rr*.45,y+10+Math.sin(a)*rr*.45,x+Math.cos(a)*rr*.9,y+10+Math.sin(a)*rr*.9,0,fade*.95,3);}
     }
    }
    else {for(let layer=0;layer<3;layer++){air.strokeColor=effectInk(layer===2?0:10,fade*(layer===0?.3:layer===1?.8:1));air.lineWidth=layer===0?34:layer===1?15:5;for(let i=0;i<9;i++){const ox=x+Math.sin(i*8+Math.floor(v.age*25))*18*(i&&i<8?1:0),oy=y+(8-i)*44;if(!i)air.moveTo(ox,oy);else air.lineTo(ox,oy);}air.stroke();}for(const side of [-1,1]){line(air,x,y+180,x+side*65,y+225,10,fade*.9,4);line(air,x+side*8,y+90,x+side*46,y+55,0,fade*.8,3);}
     ring(air,x,y+12,r*.75,10,fade*.7,6);for(let i=0;i<8;i++){const a=i*TAU/8+t*.8,inner=r*.2,outer=r*(i%2?.6:.9);line(air,x+Math.cos(a)*inner,y+12+Math.sin(a)*inner,x+Math.cos(a)*outer,y+12+Math.sin(a)*outer,0,fade*.9,i%2?2:4);}
}
   }else if(v.kind==='gates'){
    polygon(ground,x,y,r,8,t*.12,3,fade*.4,3);polygon(ground,x,y,r*.65,8,-t*.2,1,fade*.55,2);
    for(let i=0;i<8;i++){const a=i*TAU/8,ox=x+Math.cos(a)*r,oy=y+Math.sin(a)*r;line(air,ox-8,oy-16,ox-8,oy+22,1,fade*.7,4);line(air,ox+8,oy-16,ox+8,oy+22,1,fade*.7,4);line(air,ox-12,oy+20,ox+12,oy+20,4,fade*.85,4);}
   }else if(v.kind==='roar'){
    const arc=100*Math.PI/180,rr=r*ease;
    for(let j=0;j<3;j++){air.strokeColor=effectInk(j===0?1:0,fade*(.8-j*.18));air.lineWidth=6-j*2;air.arc(x,y+24,rr*(1-j*.14),v.angle-arc/2,v.angle+arc/2,false);air.stroke();}
    const hx=x+Math.cos(v.angle)*rr*.55,hy=y+48+Math.sin(v.angle)*rr*.55;air.fillColor=effectInk(14,fade*.55);air.moveTo(hx-39,hy+10);air.lineTo(hx-36,hy+55);air.lineTo(hx-12,hy+35);air.lineTo(hx+12,hy+35);air.lineTo(hx+36,hy+55);air.lineTo(hx+39,hy+10);air.close();air.fill();for(const side of [-1,1])line(air,hx+side*27,hy+22,hx+side*8,hy+16,0,fade,4);air.fillColor=effectInk(0,fade);air.ellipse(hx,hy-1,11,17);air.fill();
   }else if(v.kind==='decoy'||v.kind==='escape'){
    const tone=v.kind==='decoy'?7:10;ground.fillColor=effectInk(tone,fade*.15);ground.ellipse(x,y,30,10);ground.fill();air.strokeColor=effectInk(1,fade*.75);air.lineWidth=3;air.fillColor=effectInk(tone,fade*.35);air.roundRect(x-20,y+12,40,46,7);air.fill();air.stroke();air.circle(x,y+73,20);air.fill();air.stroke();line(air,x-34,y+38,x+34,y+38,1,fade*.8,4);line(air,x-14,y+12,x-20,y-4,1,fade*.8,4);line(air,x+14,y+12,x+20,y-4,1,fade*.8,4);
   }else if(v.kind==='catch'){
    ring(ground,x,y,r,9,fade*.2,3);air.fillColor=effectInk(2,fade*.8);air.strokeColor=effectInk(14,fade*.85);air.lineWidth=3;air.moveTo(x-70,y-8);air.bezierCurveTo(x-45,y-42,x+45,y-42,x+70,y-8);air.lineTo(x+55,y+2);air.lineTo(x-55,y+2);air.close();air.fill();air.stroke();line(air,x-80,y,x-80,y+115,1,fade*.9,4);
    air.fillColor=effectInk(0,fade*.65);air.moveTo(x-80,y+106);air.lineTo(x-80,y+25);air.lineTo(x-15,y+33);air.close();air.fill();for(let j=0;j<5;j++)line(air,x-72+j*10,y+28,x-72+j*10,y+88-j*9,1,fade*.65,2);
    for(let i=0;i<4;i++){const ox=x-42+i*28,oy=y+5+Math.sin(v.age*4+i)*3;arrow(air,ox,oy,Math.PI/2+.2,15,1,fade*.85);}
   }else if(v.kind==='summon'){
    for(let i=0;i<3;i++){const a=i*TAU/3+t*.7,ox=x+Math.cos(a)*90,oy=y+20+Math.sin(a)*55;air.fillColor=effectInk(0,fade*.9);air.strokeColor=effectInk(1,fade*.75);air.lineWidth=2;air.moveTo(ox,oy+46);air.lineTo(ox-18,oy+17);air.lineTo(ox+18,oy+17);air.close();air.fill();air.stroke();air.rect(ox-10,oy-4,20,22);air.fill();air.stroke();arrow(air,ox+20,oy+14,Math.sin(t*12+i),14,1,fade);}
   }else if(v.kind==='song'){
    ring(ground,x,y,r,10,fade*.25,2);for(let i=0;i<4;i++){const a=i*TAU/4,ox=x+Math.cos(a)*r*.8,oy=y+Math.sin(a)*r*.8;line(air,ox,oy-25,ox,oy+60,1,fade*.7,3);air.fillColor=effectInk(10,fade*.65);air.moveTo(ox,oy+60);air.lineTo(ox+38,oy+52);air.lineTo(ox+28,oy+25);air.lineTo(ox,oy+32);air.close();air.fill();for(let j=0;j<3;j++){const p=(t*3+j/3)%1;ring(air,ox+(x-ox)*p,oy+(y-oy)*p+40,3+3*p,0,fade*.7,2);}}
   }else if(v.kind==='heal'){
    for(let i=0;i<7;i++){const a=i*TAU/7,ox=x+Math.cos(a)*r*.6,oy=y+20+Math.sin(a)*r*.3+ease*35;air.fillColor=effectInk(i%2?5:4,fade*.7);air.ellipse(ox,oy,8,18);air.fill();}line(air,x-16,y+65,x+16,y+65,0,fade*.9,7);line(air,x,y+49,x,y+81,0,fade*.9,7);
   }else{
    const tone=v.kind==='speed-buff'?3:v.kind==='damage-buff'?7:1;ring(ground,x,y,r*.6,tone,fade*.18,3);
    for(let i=0;i<3;i++){const ox=x-27+i*27,oy=y+108+Math.sin(t*TAU+i)*5;arrow(air,ox,oy,Math.PI/2,12,tone,fade*.85);}if(v.kind!=='speed-buff'){air.fillColor=effectInk(tone,fade*.75);air.moveTo(x-22,y+138);air.lineTo(x+27,y+130);air.lineTo(x+18,y+106);air.lineTo(x-22,y+113);air.close();air.fill();}
   }
  }
 }
}
