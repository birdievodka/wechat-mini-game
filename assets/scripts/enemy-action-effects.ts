import {Graphics} from 'cc';
import {enemyActionSpec} from './enemy-actions';
import {effectInk} from './combat-effects';
/** Shared layer, bounded by the visible 80-actor roster. No timer, RNG, damage or nodes. */
export function drawEnemyAction(g:Graphics,id:string,x:number,y:number,t:number,a:number,w:number,range:number):void {
 if(t<0)return;const kind=enemyActionSpec(id).kind,wind=t<w,p=wind?t/w:(t-w)/.14;
 if(wind){if(p<.18||kind==='charge')return;const h=enemyActionSpec(id).mounted?85:64;g.strokeColor=effectInk(1,.35+.55*p);g.lineWidth=2;
  if(kind==='cast'||kind==='support'){const r=6+5*p;g.circle(x,y+h,r);g.moveTo(x-r-3,y+h);g.lineTo(x+r+3,y+h);g.moveTo(x,y+h-r-3);g.lineTo(x,y+h+r+3);}
  else {for(let i=0;i<3;i++){const b=.5+i*.8,c=Math.cos(b),s=Math.sin(b);g.moveTo(x+c*8,y+h+s*8);g.lineTo(x+c*(11+6*p),y+h+s*(11+6*p));}}g.stroke();return;
 }
 if(p>1||kind==='charge'||kind==='support'||kind==='cast')return;
 const fade=1-p,c=Math.cos(a),s=Math.sin(a);g.strokeColor=effectInk(2,fade*.65);g.lineWidth=kind==='heavy'?6:4;
 if(kind==='thrust'){g.moveTo(x+c*22,y+s*22+18);g.lineTo(x+c*Math.min(range,110),y+s*Math.min(range,110)+18);}
 else if(kind==='slash'||kind==='heavy'){const r=id==='E08'?range:Math.min(range*.9,110),span=id==='E08'?100*Math.PI/180:1.6;for(let i=0;i<=8;i++){const b=a-span/2+i*span/8,px=x+Math.cos(b)*r,py=y+Math.sin(b)*r+12;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}}
 else {const h=enemyActionSpec(id).mounted?70:40,xx=x+c*34,yy=y+h+s*34;g.moveTo(xx-c*5,yy-s*5);g.lineTo(xx+c*10,yy+s*10);g.moveTo(xx-s*5,yy+c*5);g.lineTo(xx+s*5,yy-c*5);}g.stroke();
}
