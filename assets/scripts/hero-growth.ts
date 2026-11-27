import {petName} from './pets';
/** Hero-local permanent rewards derived from valid consecutive stage clears. No engine or RNG. */
export interface GrowthProfile {heroes:Record<string,Record<string,unknown>>;}
export const GROWTH_HEROES=['liubei','guanyu','zhangfei'] as const;
export const growthClears=(p:GrowthProfile,id:string):number=>{if(!GROWTH_HEROES.some(h=>h===id))return 0;let n=0;while(n<6&&p.heroes[id]?.['S0'+(n+1)])n++;return n;};
export const signatureId=(id:string,n:number):string=>n>0?id==='guanyu'?'guandao':id==='zhangfei'?'serpent-spear':'twin-swords':id==='guanyu'?'pole':id==='zhangfei'?'cleaver':'sandal';
export const growthTitle=(id:string,n:number):string=>n>=5?(id==='guanyu'?'少年武圣':id==='zhangfei'?'燕人小霸王':'仁德小英雄'):n>=3?(id==='guanyu'?'青龙三连斩':id==='zhangfei'?'蛇矛三连':'双剑三连'):n>=2?(id==='guanyu'?'赤兔骑将':id==='zhangfei'?'黑猪骑将':'白马骑将'):n>=1?(id==='guanyu'?'青龙刀少年':id==='zhangfei'?'蛇矛少年':'双剑少年'):id==='guanyu'?'扁担少年':id==='zhangfei'?'杀猪少年':'草鞋少年';
export const dashName=(id:string)=>id==='guanyu'?'赤兔冲刺':id==='zhangfei'?'猪突猛进':'踏云闪';
export function growthRewardText(id:string,stage:number):string{return (stage<=2?'最大生命 +1心 · ':'')+(stage===1?'本命兵器与第三击':stage===2?'获得坐骑 / 移速+30%':stage===3?'本命第三击伤害 ×1.5':stage===4?dashName(id)+'解锁':stage===5?'短甲进阶 · '+petName(id)+'加入':'桃园留名');}
export const DASH={cooldown:6,duration:{liubei:.28,guanyu:.28,zhangfei:.32},distance:{liubei:420,guanyu:420,zhangfei:360}};
export interface MountDash {remaining:number;cooldown:number;angle:number;hit:Set<unknown>;}
export const newMountDash=():MountDash=>({remaining:0,cooldown:0,angle:0,hit:new Set()});
export function beginMountDash(s:MountDash,id:string,n:number,angle:number):boolean {if(n<4||s.cooldown>0||s.remaining>0)return false;s.remaining=DASH.duration[id as keyof typeof DASH.duration]||.25;s.cooldown=DASH.cooldown;s.angle=angle;s.hit.clear();return true;}
export function stepMountDash(s:MountDash,id:string,dt:number):number{const t=Math.min(dt,s.remaining);s.remaining=Math.max(0,s.remaining-dt);s.cooldown=Math.max(0,s.cooldown-dt);return t*(DASH.distance[id as keyof typeof DASH.distance]||200)/(DASH.duration[id as keyof typeof DASH.duration]||.25);}

/** The marked weapon replaces quality extra-hit patterns; ordinary shop copies retain theirs. */
export function signatureEffectText(id:string,n:number):string {
 const move=id==='guanyu'?'青龙半圆斩 · 半径200':id==='zhangfei'?'同轴长刺 · 长390':'向前金白剑气 · 最多穿透3敌';
 return '每三次出手触发'+move+(n>=3?'\n第三击伤害 ×1.5':'');
}
