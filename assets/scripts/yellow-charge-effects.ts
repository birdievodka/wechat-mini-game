import {Color,Graphics} from 'cc';
import {YELLOW_CHARGERS,YellowChargeState} from './yellow-chargers';
const GOLD=new Color(255,218,113,180),DUST=new Color(177,119,58,75),WHITE=new Color(255,244,195,210);
/** Local tell/footwork only: no corridor, range rectangle, clocks, RNG or hit checks. */
export function drawYellowCharge(g:Graphics,x:number,y:number,s:YellowChargeState):void {
 const dx=Math.cos(s.angle),dy=Math.sin(s.angle),nx=-dy,ny=dx;
 if(s.phase==='windup'){
  const p=Math.min(1,s.time/YELLOW_CHARGERS.windup);g.strokeColor=GOLD;g.lineWidth=2;g.ellipse(x,y-3,28+p*7,12+p*3);g.stroke();
  g.strokeColor=WHITE;g.lineWidth=3;for(const side of[-1,1]){const a=x+side*31-dx*10,b=y+13+side*dy*7;g.moveTo(a-dx*6,b-dy*6);g.lineTo(a+dx*5,b+dy*5);g.moveTo(a+nx*5,b+ny*5);g.lineTo(a-nx*5,b-ny*5);}g.stroke();
 }else if(s.phase==='dash'){
  g.fillColor=DUST;for(let i=0;i<4;i++){const d=18+i*15,spread=(i%2?1:-1)*(7+i*3);g.ellipse(x-dx*d+nx*spread,y-dy*d+ny*spread,11-i,5);g.fill();}
  g.strokeColor=GOLD;g.lineWidth=3;for(const side of[-1,1]){g.moveTo(x-dx*70+nx*side*20,y+28-dy*70+ny*side*20);g.lineTo(x-dx*13+nx*side*20,y+28-dy*13+ny*side*20);}g.stroke();
 }else if(s.phase==='recover'&&s.time<.35){g.strokeColor=DUST;g.lineWidth=2;for(let i=0;i<3;i++){const d=16+i*10;g.moveTo(x-dx*d-nx*9,y-dy*d-ny*9);g.lineTo(x-dx*(d+8)+nx*9,y-dy*(d+8)+ny*9);}g.stroke();}
}
