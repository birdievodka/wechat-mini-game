export type IdleHero = 'liubei' | 'guanyu' | 'zhangfei' | 'zhaoyun' | 'kongming';
export interface HeroIdlePose { headAngle:number; headX:number; headY:number; bodyAngle:number; breath:number; handBob:number; eyesClosed:boolean; }
const pulse=(time:number,start:number,duration:number):number=>time>=start&&time<start+duration?Math.sin((time-start)/duration*Math.PI):0;
/** Cosmetic deterministic clock: never consume combat RNG or change facing, hitboxes, movement or aim. */
export function heroIdlePose(hero:IdleHero,time:number,walkBlend:number,hurt=false):HeroIdlePose {
  const offset=hero==='liubei'?0:hero==='guanyu'?1.17:2.43;
  const clock=Math.max(0,time)+offset,cycle=Math.floor(clock/7.4),phase=clock%7.4;
  const idle=1-Math.max(0,Math.min(1,walkBlend));
  const breath=Math.sin(clock*(hero==='guanyu'?1.85:2.3));
  const first=1.9+Math.sin(cycle*2.17+offset)*.28;
  const blink=phase>=first&&phase<first+.13;
  const double=hero==='liubei'&&cycle%2===0&&phase>=first+.32&&phase<first+.43;
  let angle=Math.sin(clock*.95)*1.1,look=0,lift=0;
  if(hero==='liubei'){
    const scan=pulse(phase,3.6,1.65);look=scan*Math.sin((phase-3.6)*4.5);angle+=look*3.4;
  }else if(hero==='guanyu'){
    const nod=pulse(phase,3.4,1.45);angle-=nod*3.8;lift=-nod*1.6;
  }else if(hero==='kongming'){angle+=Math.sin(clock*1.4)*2.2;lift=Math.sin(clock*2)*.7;
  }else if(hero==='zhaoyun'){angle+=pulse(phase,3.2,1.1)*-3;
  }else{
    const laugh=pulse(phase,3.1,1.25);angle+=laugh*Math.sin((phase-3.1)*15)*2.8;lift=Math.abs(Math.sin((phase-3.1)*10))*laugh*1.2;
  }
  const calm=hurt?.25:1;
  return {headAngle:angle*idle*calm,headX:look*1.25*idle,headY:(breath*.8+lift)*idle,
    bodyAngle:Math.sin(clock*.95)*.65*idle,breath:breath*.012*idle,
    handBob:breath*1.45*idle,eyesClosed:!hurt&&(blink||double)};
}
