/** First readable melee sample: E01 only. Times share the actual damage clock. */
export const GRUNT_MELEE={windup:.48,strike:.12,recovery:.30} as const;
export interface GruntPose {cell:number;x:number;y:number;angle:number;sx:number;sy:number;}
export function sampleGruntPose(out:GruntPose,direction:number,walk:number,moving:boolean,attack:number,aim:number):GruntPose {
  const row=direction===3?1:direction,face=direction===3?-1:1,c=Math.cos(aim),s=Math.sin(aim);
  out.cell=row*4+(moving?Math.floor(walk)%2:0);out.x=0;out.y=moving?Math.abs(Math.sin(walk*Math.PI))*1.4:0;out.angle=moving?Math.sin(walk*Math.PI)*1.8:0;out.sx=face;out.sy=1;
  if(attack<0)return out;
  if(attack<GRUNT_MELEE.windup){
    const p=Math.max(0,attack/GRUNT_MELEE.windup),brace=Math.sin(p*Math.PI*.5);
    out.cell=row*4+(p<.18?0:2);out.x=-c*4*brace;out.y=-s*3*brace;out.angle=c*7*brace;out.sx=face*(1+.035*brace);out.sy=1-.035*brace;
  }else if(attack<GRUNT_MELEE.windup+GRUNT_MELEE.strike){
    const p=(attack-GRUNT_MELEE.windup)/GRUNT_MELEE.strike,lunge=7+Math.sin(p*Math.PI)*3;
    out.cell=row*4+3;out.x=c*lunge;out.y=s*lunge;out.angle=-c*(12-3*p);out.sx=face*1.035;out.sy=.965;
  }else{
    const p=Math.min(1,(attack-GRUNT_MELEE.windup-GRUNT_MELEE.strike)/(GRUNT_MELEE.recovery-GRUNT_MELEE.strike)),ease=(1-p)*(1-p);
    out.cell=row*4+(p<.3?3:0);out.x=c*7*ease;out.y=s*7*ease;out.angle=-c*9*ease;out.sx=face*(1+.035*ease);out.sy=1-.035*ease;
  }
  return out;
}
