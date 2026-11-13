import {Color,Graphics} from 'cc';
import {LvbuState,LVBU_ACTIONS} from './lvbu-boss';

// Cached ink and shared ribbon buffers; no per-Boss Graphics or frame allocations.
const palette=['#89421e','#d65b13','#ff9519','#ffca32','#fff4cf','#ad8450','#dfc08b','#586b39'];
const ink=palette.map(hex=>Array.from({length:33},(_,i)=>{const c=new Color(hex);c.a=Math.round(i*255/32);return c;}));
const color=(tone:number,alpha=1)=>ink[tone][Math.max(0,Math.min(32,Math.round(alpha*32)))];
const count=36,outerX=new Float32Array(count+1),outerY=new Float32Array(count+1),innerX=new Float32Array(count+1),innerY=new Float32Array(count+1);
const samples=Array.from({length:count+1},(_,i)=>({t:i/count,width:Math.sin(i/count*Math.PI)**.7}));

function blade(ground:Graphics,air:Graphics,x:number,y:number,head:number,start:number,r:number,width:number,tone:number,alpha:number):void {
 for(let i=0;i<=count;i++){
  const p=samples[i],a=start+(head-start)*p.t,c=Math.cos(a),s=Math.sin(a),inside=r-width*p.width;
  outerX[i]=x+c*r;outerY[i]=y+s*r;innerX[i]=x+c*inside;innerY[i]=y+s*inside;
 }
 for(let layer=0;layer<2;layer++){
  const g=layer?air:ground;g.fillColor=color(tone,alpha);let first=-1;
  for(let i=0;i<count;i++){
   const visible=((outerY[i]+outerY[i+1])*.5<y)===(layer===1);
   if(visible&&first<0)first=i;
   if(first>=0&&(!visible||i===count-1)){
    const end=visible?i+1:i;g.moveTo(outerX[first],outerY[first]);
    for(let j=first+1;j<=end;j++)g.lineTo(outerX[j],outerY[j]);
    for(let j=end;j>=first;j--)g.lineTo(innerX[j],innerY[j]);g.close();g.fill();first=-1;
   }
  }
 }
}
function wedge(g:Graphics,x:number,y:number,a:number,length:number,width:number,tone:number,alpha=1):void {
 const c=Math.cos(a),s=Math.sin(a);g.fillColor=color(tone,alpha);
 g.moveTo(x-c*length*.22,y-s*length*.22);g.lineTo(x+c*length*.18-s*width,y+s*length*.18+c*width);
 g.lineTo(x+c*length,y+s*length);g.lineTo(x+c*length*.18+s*width,y+s*length*.18-c*width);g.close();g.fill();
}
function clod(g:Graphics,x:number,y:number,r:number,alpha:number):void {
 g.fillColor=color(0,alpha*.65);g.moveTo(x-r,y);g.lineTo(x-r*.6,y+r*.7);g.lineTo(x+r*.5,y+r);g.lineTo(x+r,y-r*.2);g.close();g.fill();
 g.fillColor=color(5,alpha);g.moveTo(x-r*.8,y+r*.08);g.lineTo(x-r*.4,y+r*.7);g.lineTo(x+r*.5,y+r*.85);g.lineTo(x+r*.55,y);g.close();g.fill();
}
function hoofDust(g:Graphics,x:number,y:number,a:number,clock:number,strength:number,alpha:number):void {
 const c=Math.cos(a),s=Math.sin(a);
 for(let i=0;i<7;i++){
  const t=(clock*3+i*.143)%1,side=i%2?1:-1,along=15+t*75*strength,across=side*(13+t*19);
  const px=x-c*along-s*across,py=y-s*along+c*across-8;
  g.fillColor=color(5,alpha*(1-t)*.6);g.ellipse(px,py,8+t*11,4+t*6);g.fill();
  g.fillColor=color(6,alpha*(1-t)*.82);g.ellipse(px-2,py+3,6+t*10,4+t*5);g.fill();
 }
}
export function drawLvbuEffects(ground:Graphics,air:Graphics,x:number,y:number,a:number,s:LvbuState):void {
 ground.fillColor=color(0,.18);ground.ellipse(x,y-7,53,15);ground.fill();
 if(s.phase==='windup'){
  const p=Math.min(1,s.time/s.windup),c=Math.cos(a),d=Math.sin(a),tipX=x+c*122,tipY=y+70+d*122;
  // Local blade glint and hoof scuffs communicate the locked direction, no path box.
  hoofDust(ground,x,y,a,s.time,.3,.3+p*.5);
  for(let i=0;i<3;i++){
   const b=a+(i-1)*.65,l=(8+p*10)*(i===1?1:.7);wedge(air,tipX+Math.cos(b)*13,tipY+Math.sin(b)*13,b,l,2,3,p*.9);
  }
  if(s.index===1){
   const r=LVBU_ACTIONS[1].range!,arc=LVBU_ACTIONS[1].arc!*Math.PI/180;
   // Short low-contrast edge strokes, not an opaque fan covering the arena.
   ground.strokeColor=color(1,.3+p*.5);ground.lineWidth=2.5;
   for(let i=0;i<18;i++){const b=a-arc/2+arc*i/18;ground.moveTo(x+Math.cos(b)*r,y+42+Math.sin(b)*r);ground.lineTo(x+Math.cos(b+.065)*r,y+42+Math.sin(b+.065)*r);ground.lineTo(x+Math.cos(b+.13)*r,y+42+Math.sin(b+.13)*r);ground.stroke();}
   // Exact endpoints keep the rear 60-degree gap readable, including near map edges.
   for(let i=0;i<2;i++){const b=a+(i?1:-1)*arc/2,c=Math.cos(b),d=Math.sin(b);ground.moveTo(x+c*(r-10),y+42+d*(r-10));ground.lineTo(x+c*(r+1),y+42+d*(r+1));ground.stroke();}
  }
 }
 if(s.phase==='dash'){
  const c=Math.cos(a),d=Math.sin(a),pulse=.9+.1*Math.sin(s.time*40),px=x+c*78,py=y+42+d*78;
  wedge(air,px,py,a,62,25,0,.96);wedge(air,px+3*c,py+3*d,a,57,20,1,1);
  wedge(air,px+7*c,py+7*d,a,49,14,3,pulse);wedge(air,px+12*c,py+12*d,a,40,7,4,pulse);
  for(let i=0;i<3;i++){
   const side=(i-1)*20,bx=x-c*(32+i*8)-d*side,by=y+43-d*(32+i*8)+c*side;
   wedge(air,bx,by,a+Math.PI,40+i*11,2+i*.4,i===1?3:1,.55);
  }
  hoofDust(ground,x,y,a,s.time,1,1);
  for(let i=0;i<s.trailCount;i++){
   ground.strokeColor=color(5,(3-i)*.16);ground.lineWidth=3-i*.5;ground.moveTo(s.trailX[i]-c*9,s.trailY[i]-d*9-6);ground.lineTo(s.trailX[i]+c*9,s.trailY[i]+d*9-6);ground.stroke();
  }
 }
 if(s.phase==='sweep'||s.phase==='recover'&&s.index===1&&s.time<.2){
  const duration=LVBU_ACTIONS[1].duration!,t=s.phase==='sweep'?s.time/duration:1,fade=s.phase==='sweep'?1:1-s.time/.2;
  const arc=LVBU_ACTIONS[1].arc!*Math.PI/180,head=a-arc/2+arc*t,start=a-arc/2,radius=LVBU_ACTIONS[1].range!;
  if(head-start>.05){
   const trailStart=Math.max(start,head-2.3);
   if(head-start>.18)blade(ground,air,x,y+42,head-.18,Math.max(start,trailStart-.18),radius*.88,radius*.14,1,fade*.22);
   if(head-start>.08)blade(ground,air,x,y+42,head-.08,Math.max(start,trailStart-.08),radius*.94,radius*.2,2,fade*.4);
   blade(ground,air,x,y+42,head,start,radius,radius*.35,0,fade*.95);
   blade(ground,air,x,y+42,head-.014,start,radius-2,radius*.325,1,fade);
   blade(ground,air,x,y+42,head-.025,start,radius-3,radius*.27,2,fade);
   blade(ground,air,x,y+42,head-.038,start,radius-4,radius*.16,3,fade);
   blade(ground,air,x,y+42,head-.045,start,radius-4,radius*.025,4,fade);
   // At the forward pass, a narrow flare joins the physical halberd to its released blade.
   // It is decoration inside the sweep and cannot add a second damage segment.
   const forward=Math.abs(Math.atan2(Math.sin(head-a),Math.cos(head-a)));
   if(forward<.62){
    const power=(1-forward/.62)*fade,c=Math.cos(a),d=Math.sin(a),px=x+c*119,py=y+42+d*119;
    wedge(air,px,py,a,radius-121,11,2,power*.8);wedge(air,px+5*c,py+5*d,a,radius-130,4,4,power*.8);
   }
   for(let i=0;i<5;i++){const b=head-.25-i*.31,g=Math.sin(b)<0?air:ground;wedge(g,x+Math.cos(b)*radius*.87,y+42+Math.sin(b)*radius*.87,b+Math.PI/2,12+i*2,2,i%2?3:4,fade*.85);}
  }
 }
 if(s.brakeLife>0&&s.index!==1){
  const t=1-s.brakeLife/.6,alpha=(1-t),power=s.index===2&&s.leg===2?1.3:1,b=s.brakeAngle;
  hoofDust(ground,s.brakeX,s.brakeY,b,t*.25,power,alpha);
  ground.strokeColor=color(0,alpha*.35);ground.lineWidth=2;
  for(let i=0;i<3;i++){const side=(i-1)*16,px=s.brakeX-Math.sin(b)*side,py=s.brakeY+Math.cos(b)*side-8;ground.moveTo(px-Math.cos(b)*35,py-Math.sin(b)*35);ground.lineTo(px+Math.cos(b)*20,py+Math.sin(b)*20);ground.stroke();}
  for(let i=0;i<5;i++){const angle=b+(i-2)*.45,travel=(18+t*35)*power;clod(ground,s.brakeX+Math.cos(angle)*travel,s.brakeY+Math.sin(angle)*travel+Math.sin(t*Math.PI)*18,4+i%3,alpha);}
 }
 if(s.contactLife>0){
  const t=1-s.contactLife/.22,fade=1-t;
  for(let i=0;i<7;i++){const b=s.contactAngle+(i-3)*.61;wedge(air,s.contactX,s.contactY,b,(i===3?39:22)*(1+.3*t),i===3?7:4,2,fade);wedge(air,s.contactX,s.contactY,b,(i===3?31:15)*(1+.3*t),i===3?3:2,4,fade);}
 }
}
