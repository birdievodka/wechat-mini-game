/** Hero-local permanent rewards derived from valid consecutive stage clears. No engine or RNG. */
export interface GrowthProfile {heroes:Record<string,Record<string,unknown>>;}
export const GROWTH_HEROES=['liubei','guanyu','zhangfei'] as const;
export const growthClears=(p:GrowthProfile,id:string):number=>{if(!GROWTH_HEROES.some(h=>h===id))return 0;let n=0;while(n<6&&p.heroes[id]?.['S0'+(n+1)])n++;return n;};
export const signatureId=(id:string,n:number):string=>n>0?id==='guanyu'?'guandao':id==='zhangfei'?'serpent-spear':'twin-swords':id==='guanyu'?'pole':id==='zhangfei'?'cleaver':'sandal';
export const growthTitle=(id:string,n:number):string=>n>=5?(id==='guanyu'?'少年武圣':id==='zhangfei'?'燕人小霸王':'仁德小英雄'):n>=3?(id==='guanyu'?'青龙三连斩':id==='zhangfei'?'震地三连':'双剑三连'):n>=2?(id==='guanyu'?'赤兔骑将':id==='zhangfei'?'黑猪骑将':'白马骑将'):n>=1?(id==='guanyu'?'青龙刀少年':id==='zhangfei'?'蛇矛少年':'双剑少年'):id==='guanyu'?'扁担少年':id==='zhangfei'?'杀猪少年':'草鞋少年';
export const dashName=(id:string)=>id==='guanyu'?'赤兔冲刺':id==='zhangfei'?'猪突猛进':'踏云闪';
export function growthRewardText(id:string,stage:number):string{return '最大生命 +1心'+(stage===1?' · 本命进阶':stage===2?' · 获得坐骑 / 移速+30%':stage===3?' · 本命三连解锁':stage===4?' · '+dashName(id)+'解锁':stage===5?' · 最终形象解锁':' · 桃园留名');}
export const DASH={cooldown:6,duration:{liubei:.22,guanyu:.25,zhangfei:.30},distance:{liubei:240,guanyu:200,zhangfei:160}};
export interface MountDash {remaining:number;cooldown:number;angle:number;hit:Set<unknown>;}
export const newMountDash=():MountDash=>({remaining:0,cooldown:0,angle:0,hit:new Set()});
export function beginMountDash(s:MountDash,id:string,n:number,angle:number):boolean {if(n<4||s.cooldown>0||s.remaining>0)return false;s.remaining=DASH.duration[id as keyof typeof DASH.duration]||.25;s.cooldown=DASH.cooldown;s.angle=angle;s.hit.clear();return true;}
export function stepMountDash(s:MountDash,id:string,dt:number):number{const t=Math.min(dt,s.remaining);s.remaining=Math.max(0,s.remaining-dt);s.cooldown=Math.max(0,s.cooldown-dt);return t*(DASH.distance[id as keyof typeof DASH.distance]||200)/(DASH.duration[id as keyof typeof DASH.duration]||.25);}

/** The marked weapon replaces quality extra-hit patterns; ordinary shop copies retain theirs. */
export function signatureEffectText(id:string,n:number):string {return n>=3?(id==='guanyu'?'横斩 → 反斩 → 青龙重斩\n第三击1.5倍 · 扇内各命中一次':id==='zhangfei'?'快刺 → 回扫 → 震地\n第三击1.5倍 · 近身范围伤害':'左斩 → 右斩 → 交叉剑气\n第三击1.5倍 · 最多穿透3人'):id==='guanyu'?'本命宽幅横扫 · 范围内各命中一次':id==='zhangfei'?'本命快速突刺 · 沿枪尖命中':'双剑轮流斩击 · 合计占1武器位';}
