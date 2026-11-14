import {Color,Graphics} from 'cc';
import {STAGE_THEMES} from './stage-data';
/** Static edge dressing shares the meadow texture; no new textures or per-frame allocations. */
export function drawStageGround(g:Graphics,stage:number,hw:number,hh:number):void {
 const theme=STAGE_THEMES[stage-1],color=new Color(theme.accent);color.a=130;g.fillColor=color;g.strokeColor=color;
 if(stage===4){g.fillColor=new Color(44,97,132,165);g.rect(-hw,-hh,hw*2,65);g.fill();g.strokeColor=new Color(149,199,205,110);g.lineWidth=2;for(let i=0;i<14;i++){const x=-hw+80+i*(hw*2/14);g.moveTo(x,-hh+25);g.bezierCurveTo(x+12,-hh+34,x+35,-hh+12,x+52,-hh+22);}g.stroke();}
 for(let i=0;i<8;i++){const x=-hw+70+i*(hw*2-140)/7,y=i%2?hh-80:-hh+90;
  if(stage===1||stage===2||stage===3){g.strokeColor=new Color('#866b45');g.lineWidth=3;g.moveTo(x,y-19);g.lineTo(x,y+31);g.stroke();g.fillColor=color;g.moveTo(x,y+31);g.lineTo(x+28,y+24);g.lineTo(x+21,y+8);g.lineTo(x,y+12);g.close();g.fill();if(stage===3){g.fillColor=new Color(70,98,91,85);g.ellipse(x+8,y-20,29,8);g.fill();}}
  else if(stage===5){g.fillColor=new Color(39,112,62,140);for(let k=0;k<4;k++){g.ellipse(x+(k-1.5)*10,y+Math.sin(k)*8,14,5);g.fill();}}
  else if(stage===6){g.strokeColor=new Color(191,190,226,125);g.lineWidth=1.5;g.moveTo(x-18,y);g.lineTo(x+18,y);g.moveTo(x,y-18);g.lineTo(x,y+18);g.moveTo(x-10,y-10);g.lineTo(x+10,y+10);g.stroke();g.fillColor=new Color(210,204,233,120);g.circle(x,y,3);g.fill();}
 }
}
