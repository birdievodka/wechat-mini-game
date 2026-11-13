import { CHAPTERS, CHRONICLE_ENEMIES, ChronicleEnemy } from './chronicles-data';
import {LVBU_ACTIONS} from './lvbu-boss';
import {REFORGED_ACTIONS} from './boss-roster';
export { CHAPTERS, CHRONICLE_ENEMIES, GENERIC_SKILLS } from './chronicles-data';
export const chapterFor=(chapter=1)=>CHAPTERS[Math.max(0,Math.min(CHAPTERS.length-1,chapter-1))];
export const archetypeFor=(id:string):ChronicleEnemy=>CHRONICLE_ENEMIES.find(e=>e.id===id)||CHRONICLE_ENEMIES[0];
export const chapterInflation=(chapter:number)=>Math.min(5,1.13**(Math.min(7,chapter)-1));
export const chapterThreat=(chapter:number,stage:number,boss=false)=>Math.min(7.5,2.5+.65*(Math.min(7,chapter)-1))*(boss?.85:stage===0?.45:[.9,1,1.1][Math.min(2,stage-1)]);
export function scaledEnemy(id:string,chapter:number,stage:number,boss=false){const d=archetypeFor(id),warm=chapter===1&&stage===0&&id==='E01';return {hp:warm?6:Math.round(d.hp*(chapterFor(chapter).referenceDps/152.05)**.95*(boss?1.1:stage===2?1.04:stage>=3?1.08:1)),speed:warm?86:d.speed*(1+Math.min(.006*(chapter-1),.12)),coins:d.coins,damage:1};}
export function chapterRoster(chapter:number,stage:number):string[]{const ids=chapterFor(chapter).roster;if(chapter===1)return stage===0?['E01']:ids.slice(0,stage+1);return stage===0?[ids[0]]:ids.slice(0,Math.min(8,2+stage*2));}
export function pickChapterEnemy(chapter:number,stage:number,boss:boolean,counts:Record<string,number>,random=Math.random):string|undefined{
 const all=chapterFor(chapter).roster,base=[24,18,12,10,10,10,8,8];const ids=chapterRoster(chapter,boss?3:stage).filter(id=>{const n=Number(id.slice(1));if(n>=35&&n<=38)return Object.keys(counts).filter(k=>Number(k.slice(1))>=35&&Number(k.slice(1))<=38).reduce((s,k)=>s+counts[k],0)<2;if(n===24)return !counts.E24;if(n===25)return !counts.E25;if(n===39&&chapter===1)return !counts.E39;return true;});
 if(!ids.length)return;const weights=ids.map(id=>stage===0?(id===all[0]?80:20):base[all.indexOf(id)]||10),total=weights.reduce((a,b)=>a+b,0);let r=random()*total;for(let i=0;i<ids.length;i++){r-=weights[i];if(r<=0)return ids[i];}return ids[ids.length-1];
}
export type BossActionKind='sector'|'charge'|'zones'|'ring'|'shots'|'summon'|'flag'|'clone'|'lines'|'waves'|'teleport'|'moving'|'enrage';
export interface BossAction {name:string;kind:BossActionKind;cd:number;windup:number;range?:number;arc?:number;radius?:number;count?:number;speed?:number;duration?:number;gap?:number;units?:string[];delay?:number;description?:string;}
export const BOSS_ACTIONS:BossAction[][]=CHAPTERS.map(ch=>ch.bossId==='lvbu'?LVBU_ACTIONS:REFORGED_ACTIONS[ch.bossId]);
