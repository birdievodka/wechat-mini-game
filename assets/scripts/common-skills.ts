import {GENERIC_SKILLS,GenericSkill} from './chronicles-data';
export const DEFAULT_SKILL='G01';
export const COMMON_SKILLS=[...GENERIC_SKILLS].sort((a,b)=>a.powerRank-b.powerRank);
export function commonSkillFor(id:string):GenericSkill{return GENERIC_SKILLS.find(s=>s.id===id)||GENERIC_SKILLS[0];}
export function availableSkill(id:string):string{const s=GENERIC_SKILLS.find(s=>s.id===id);return s?.unlocked?s.id:DEFAULT_SKILL;}
/** Haste is charge efficiency, never a wall-clock cooldown. Every eligible kill remains one visible point. */
export function skillKillRequirement(id:string,efficiency=0):number{const n=commonSkillFor(id).killCharge;return Math.max(Math.ceil(n*.55),Math.ceil(n/(1+Math.max(0,Math.min(1/.55-1,efficiency)))));}
export const skillPowerText=(id:string):string=>'威力 '+['I','II','III','IV','V','VI'][commonSkillFor(id).powerTier-1];
