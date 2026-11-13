import { CHAPTERS, CHRONICLE_ENEMIES, ChronicleEnemy } from './chronicles-data';
export { CHAPTERS, CHRONICLE_ENEMIES, GENERIC_SKILLS } from './chronicles-data';
export const chapterFor=(chapter=1)=>CHAPTERS[Math.max(0,Math.min(CHAPTERS.length-1,chapter-1))];
export const archetypeFor=(id:string):ChronicleEnemy=>CHRONICLE_ENEMIES.find(e=>e.id===id)||CHRONICLE_ENEMIES[0];
export const chapterInflation=(chapter:number)=>Math.min(5,1.07**(chapter-1));
export const chapterThreat=(chapter:number,stage:number,boss=false)=>Math.min(7.5,2.5+.3125*(chapter-1))*(boss?.85:stage===0?.45:[.9,1,1.1][Math.min(2,stage-1)]);
export function scaledEnemy(id:string,chapter:number,stage:number,boss=false){const d=archetypeFor(id),warm=chapter===1&&stage===0&&id==='E01';return {hp:warm?6:Math.round(d.hp*(chapterFor(chapter).referenceDps/152.05)**.95*(boss?1.1:stage===2?1.04:stage>=3?1.08:1)),speed:warm?86:d.speed*(1+Math.min(.006*(chapter-1),.12)),coins:d.coins,damage:1};}
export function chapterRoster(chapter:number,stage:number):string[]{const ids=chapterFor(chapter).roster;if(chapter===1)return stage===0?['E01']:stage===1?ids.slice(0,2):stage===2?ids.slice(0,3):ids;return stage===0?[ids[0],ids[4]]:stage===1?[...ids.slice(0,3),ids[4]]:stage===2?[...ids.slice(0,3),ids[4],ids[5]]:ids;}
export function pickChapterEnemy(chapter:number,stage:number,boss:boolean,counts:Record<string,number>,random=Math.random):string|undefined{
 const all=chapterFor(chapter).roster,base=[28,22,15,10,15,10];const ids=chapterRoster(chapter,boss?3:stage).filter(id=>{const n=Number(id.slice(1));if(n>=35&&n<=38)return Object.keys(counts).filter(k=>Number(k.slice(1))>=35&&Number(k.slice(1))<=38).reduce((s,k)=>s+counts[k],0)<2;if(n===24)return !counts.E24;if(n===25)return !counts.E25;if(n===39&&chapter===1)return !counts.E39;return true;});
 if(!ids.length)return;const weights=ids.map(id=>stage===0?(id===all[0]?80:20):base[all.indexOf(id)]||10),total=weights.reduce((a,b)=>a+b,0);let r=random()*total;for(let i=0;i<ids.length;i++){r-=weights[i];if(r<=0)return ids[i];}return ids[ids.length-1];
}
export type BossActionKind='sector'|'charge'|'zones'|'ring'|'shots'|'summon'|'flag'|'clone'|'lines'|'waves'|'teleport'|'moving'|'enrage';
export interface BossAction {name:string;kind:BossActionKind;cd:number;windup:number;range?:number;arc?:number;radius?:number;count?:number;speed?:number;duration?:number;gap?:number;units?:string[];delay?:number;}
const a=(name:string,kind:BossActionKind,cd:number,windup:number,extra:Partial<BossAction>={}):BossAction=>({name,kind,cd,windup,...extra});
export const BOSS_ACTIONS:BossAction[][]=[
[a('黄符定雷','zones',2.6,.85,{radius:76,count:1}),a('三才雷阵','zones',6,.85,{radius:70,count:3,delay:.16}),a('雷势增强','enrage',2,.85)],
[a('辕门戟斩','sector',4.2,.75,{range:250,arc:180}),a('赤兔突进','charge',8,.8,{range:420,duration:.65}),a('横扫回马','sector',9,.75,{range:230,arc:120,gap:Math.PI})],
[a('金印砸地','zones',4,.9,{radius:140,count:1,range:0}),a('铜钱四散','ring',6,.8,{count:8,speed:230,gap:0}),a('亲卫号令','summon',10,1,{units:['E04','E04']})],
[a('玉玺震击','zones',4.5,.85,{radius:110,count:1}),a('僭号令旗','flag',10,.9,{count:2}),a('连弩点名','shots',8,1,{count:9,speed:360,arc:75})],
[a('画戟三连','sector',7,.75,{range:250,arc:90,count:3,delay:.55}),a('赤兔折返','charge',9,.65,{range:360,duration:.6,count:2}),a('困兽怒吼','zones',10,1,{radius:210,count:1,range:0})],
[a('四世军威','zones',6,1,{radius:85,count:3}),a('左右旗阵','flag',12,1,{count:2}),a('箭阵缺口','ring',7,.85,{count:8,speed:230,gap:90})],
[a('独目枪挑','sector',4,.65,{range:220,arc:100}),a('踏火突进','charge',8,.8,{range:360,duration:.65}),a('火门追击','zones',9,1,{radius:80,count:3,duration:1.5})],
[a('虎豹合围','summon',10,1,{units:['E21','E21']}),a('倚天令斩','lines',5.5,.9,{range:300,radius:38,count:3}),a('号令变阵','summon',16,1,{units:['E12','E03']})],
[a('东风扇火','sector',5,.9,{range:400,arc:120}),a('借风火环','ring',8,1,{range:200,radius:48,gap:100,count:8,speed:150}),a('连营火点','zones',10,1,{radius:85,count:3,duration:1.5})],
[a('赤壁余焰','sector',7,1,{range:330,arc:90,count:4,delay:1}),a('疑兵青影','clone',12,1,{count:2}),a('丞相退路','shots',6,.9,{count:3,speed:210,arc:80})],
[a('百步穿杨','shots',4,.9,{count:1,speed:560}),a('连珠箭','shots',7,.75,{count:3,speed:420,delay:.25}),a('近身老刀','sector',5,.65,{range:200,arc:140})],
[a('银枪冲刺','charge',6,.75,{range:400,duration:.6}),a('马踏回旋','zones',5,.8,{radius:160,count:1,range:0}),a('西凉双回马','sector',10,.7,{range:300,arc:35,count:2,delay:.7})],
[a('连营火线','lines',6,1,{range:360,radius:38,count:3,duration:1.5}),a('疑阵木桩','flag',12,1,{count:2}),a('借风转火','moving',9,1,{radius:85,count:2,duration:2})],
[a('回旋飞刀','shots',3.8,.6,{count:3,speed:310,arc:65}),a('猎手围身','summon',10,1,{units:['E28','E28']}),a('烈刃跳击','zones',7,1,{radius:100,count:1})],
[a('蛮王拍地','zones',5,.9,{radius:180,count:1,range:0}),a('象阵破围','summon',14,1,{units:['E25']}),a('七擒变招','waves',9,.9,{radius:100,count:3})],
[a('军师点阵','zones',5.5,1,{radius:90,count:2}),a('空阵诱敌','zones',8,1,{radius:90,count:2,gap:1}),a('反间号令','summon',14,1,{units:['E40','E40']})],
[a('星落棋盘','zones',6,1,{radius:85,count:3,delay:.3}),a('阴阳换位','ring',8,1,{count:10,speed:205,gap:100}),a('秋风阵眼','flag',14,1,{count:1})],
];
