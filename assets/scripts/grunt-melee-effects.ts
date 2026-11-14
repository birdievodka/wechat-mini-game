import {Graphics} from 'cc';
import {effectInk} from './combat-effects';
import {GRUNT_MELEE} from './grunt-melee';
/** Read-only shared-layer accents; no per-enemy Graphics, particles, RNG or damage. */
export function drawGruntAttack(g:Graphics,x:number,y:number,attack:number,angle:number,range:number):void {
  if(attack<0)return;
  if(attack<GRUNT_MELEE.windup){
    const p=attack/GRUNT_MELEE.windup;if(p<.18)return;
    const cx=x+Math.cos(angle)*12,cy=y+72;
    g.strokeColor=effectInk(1,.35+p*.6);g.lineWidth=2;
    for(let i=0;i<3;i++){const a=.75+i*.8,c=Math.cos(a),s=Math.sin(a);g.moveTo(cx+c*9,cy+s*9);g.lineTo(cx+c*(12+5*p),cy+s*(12+5*p));}g.stroke();
  }else if(attack<GRUNT_MELEE.windup+GRUNT_MELEE.strike){
    const p=(attack-GRUNT_MELEE.windup)/GRUNT_MELEE.strike,fade=1-p,r=range*.8;
    for(let layer=0;layer<2;layer++){
      g.strokeColor=effectInk(layer?0:2,fade*(layer?.9:.65));g.lineWidth=layer?2:5;
      for(let i=0;i<=8;i++){const a=angle-.8+i*.16,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.stroke();
    }
  }
}
