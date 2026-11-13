import {Graphics} from 'cc';
import {effectInk} from './combat-effects';

// Fixed, shared ribbon samples: no per-frame coordinate arrays or extra Graphics.
const STEPS=48,TAU=Math.PI*2;
const ARC=Array.from({length:STEPS+1},(_,i)=>{
 const t=i/STEPS,a=(t-1)*5.05;
 return {c:Math.cos(a),s:Math.sin(a),width:Math.pow(Math.sin(t*Math.PI),.72)*(.3+.7*t)*(.95+.05*Math.sin(i*2.9)),edge:1+Math.sin(i*2.7)*.002};
});
const ox=new Float32Array(STEPS+1),oy=new Float32Array(STEPS+1),ix=new Float32Array(STEPS+1),iy=new Float32Array(STEPS+1);

/** A filled, tapered blade, split behind/in front of actors rather than a bright hoop. */
function ribbon(ground:Graphics,air:Graphics,x:number,y:number,angle:number,r:number,width:number,tone:number,alpha:number):void {
 const c=Math.cos(angle),s=Math.sin(angle);
 for(let i=0;i<=STEPS;i++){
  const p=ARC[i],dx=p.c*c-p.s*s,dy=p.s*c+p.c*s,outer=r*p.edge,inner=outer-width*p.width;
  ox[i]=x+dx*outer;oy[i]=y+dy*outer;ix[i]=x+dx*inner;iy[i]=y+dy*inner;
 }
 for(let layer=0;layer<2;layer++){
  // Same alpha at the layer seam: depth changes, but the blade has no hard join.
  const g=layer?air:ground;g.fillColor=effectInk(tone,alpha);let start=-1;
  for(let i=0;i<STEPS;i++){
   const visible=((oy[i]+oy[i+1])*.5<y)===(layer===1);
   if(visible&&start<0)start=i;
   if(start>=0&&(!visible||i===STEPS-1)){
    const end=visible?i+1:i;g.moveTo(ox[start],oy[start]);
    for(let j=start+1;j<=end;j++)g.lineTo(ox[j],oy[j]);
    for(let j=end;j>=start;j--)g.lineTo(ix[j],iy[j]);g.close();g.fill();start=-1;
   }
  }
 }
}
function streak(g:Graphics,x:number,y:number,a:number,r:number,length:number,width:number,tone:number,alpha:number):void {
 g.fillColor=effectInk(tone,alpha);const end=a+length;
 g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
 g.bezierCurveTo(x+Math.cos(a+length*.35)*(r-width),y+Math.sin(a+length*.35)*(r-width),x+Math.cos(end)*(r-width*.6),y+Math.sin(end)*(r-width*.6),x+Math.cos(end)*r,y+Math.sin(end)*r);
 g.bezierCurveTo(x+Math.cos(a+length*.65)*(r+width*.16),y+Math.sin(a+length*.65)*(r+width*.16),x+Math.cos(a+length*.2)*(r+width*.12),y+Math.sin(a+length*.2)*(r+width*.12),x+Math.cos(a)*r,y+Math.sin(a)*r);g.fill();
}

export function drawGoldenSweep(ground:Graphics,air:Graphics,x:number,y:number,heading:number,r:number,age:number,life:number):void {
 const t=Math.min(1,age/life),rise=.3+.7*Math.min(1,age/.045),fade=Math.pow(Math.max(0,1-Math.max(0,age-.13)/(life-.13)),1.15);
 const power=rise*fade,turn=heading+.85-TAU*(1-Math.pow(1-t,1.35)),radius=r*(.97+.03*Math.min(1,age/.05));
 // Two broken, lower-opacity afterimages beneath the solid moving blade.
 ribbon(ground,air,x,y,turn+.55,radius*.77,r*.07,1,power*.36);
 ribbon(ground,air,x,y,turn+.28,radius*.87,r*.1,1,power*.62);
 // Ochre underside, amber blade body, wide ivory bevel, then a fine bright edge.
 ribbon(ground,air,x,y,turn,radius,r*.34*rise,2,power*.6);
 ribbon(ground,air,x,y,turn-.025,radius*.992,r*.3*rise,1,power*.98);
 ribbon(ground,air,x,y,turn-.038,radius*.988,r*.095*rise,0,power*.98);
 ribbon(ground,air,x,y,turn-.045,radius*.994,r*.009,0,power);
 // Dry streaks are short shapes with clear gaps, never a second damage ring.
 for(let i=0;i<11;i++){
  const a=turn-.35-i*.43,at=radius*(.7+(i%3)*.075),g=Math.sin(a)<0?air:ground;
  streak(g,x,y,a,at,.14+(i%3)*.065,3.5+i%2*2,i%3?1:0,power*(i%3?.85:.95));
 }
 // Ground scuffs stay beneath characters; no opaque fill across the attack area.
 for(let i=0;i<5;i++)streak(ground,x,y,turn+i*1.26,radius*.7,.22,4,2,power*.2);
}

/** Compact gold-white contact wedges; called only after a real target was hit. */
export function drawSweepContact(ground:Graphics,air:Graphics,x:number,y:number,angle:number,r:number,age:number,life:number):void {
 const t=age/life,fade=Math.pow(1-t,1.3),growth=.6+.4*Math.min(1,t*4);
 for(let i=0;i<3;i++){
  const a=angle+(i-1)*.62,c=Math.cos(a),s=Math.sin(a),length=r*growth*(i===1?1:.7),width=length*.22;
  for(let layer=0;layer<2;layer++){
   const size=layer?.65:1;air.fillColor=effectInk(layer?0:1,fade);air.moveTo(x-c*4,y-s*4);
   air.lineTo(x+c*length*.25-s*width*size,y+s*length*.25+c*width*size);
   air.lineTo(x+c*length*size,y+s*length*size);
   air.lineTo(x+c*length*.25+s*width*size,y+s*length*.25-c*width*size);air.close();air.fill();
  }
 }
 ground.fillColor=effectInk(2,fade*.2);ground.ellipse(x,y-27,10+12*t,4+2*t);ground.fill();
}
