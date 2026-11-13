import {DEFAULT_SKILL,availableSkill,skillKillRequirement} from './common-skills';
import {Run,createRun,HEROES} from './campaign';
import {CHAPTERS} from './chronicles';
import {WEAPONS} from './weapons';
export interface SavePoint {run:Run;x:number;y:number;skill:number;remaining:number;kills:number;nextSupply:number;}
export interface ChronicleSave {schema:4;phase:'shop'|'battle';point:SavePoint;entry:SavePoint;}
export const SAVE_KEY='taoyuan-chronicle-v7';
export function validSave(raw:unknown):raw is ChronicleSave{
 const s=raw as ChronicleSave;if(!s||s.schema!==4||!s.point||!s.entry||['shop','battle'].indexOf(s.phase)<0)return false;
 return [s.point,s.entry].every(p=>{const r=p.run;return r&&HEROES.some(h=>h.id===r.heroId)&&Number.isFinite(r.chapter)&&r.chapter>=1&&r.chapter<=CHAPTERS.length&&Number.isFinite(r.gold)&&r.gold>=0&&Number.isFinite(r.hearts)&&r.hearts>=1&&r.hearts<=5&&r.weapons.length>=1&&r.weapons.length<=6&&new Set(r.weapons.map(w=>w.uid)).size===r.weapons.length&&r.weapons.every(w=>WEAPONS.some(d=>d.id===w.id)&&[1,2,3,4].indexOf(w.tier)>=0)&&[p.x,p.y,p.skill,p.remaining,p.kills,p.nextSupply,r.elapsed,r.survivalSeconds].every(Number.isFinite);});
}
export function readSave(storage:{getItem(k:string):string|null}):ChronicleSave|undefined{try{const raw=JSON.parse(storage.getItem(SAVE_KEY)||'null');if(!validSave(raw))return;for(const p of [raw.point,raw.entry]){if(!p.run.skillId||availableSkill(p.run.skillId)!==p.run.skillId){p.run.skillId=DEFAULT_SKILL;p.run.skillHealChapter=0;p.skill=skillKillRequirement(DEFAULT_SKILL);}else{p.run.skillId=availableSkill(p.run.skillId);p.skill=Math.max(0,Math.floor(p.skill));p.run.skillHealChapter=p.run.skillHealChapter||0;}}return raw;}catch(_){return;}}
export const copyPoint=(p:SavePoint):SavePoint=>JSON.parse(JSON.stringify(p));
