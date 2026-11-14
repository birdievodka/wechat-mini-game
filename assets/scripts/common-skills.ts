import {GENERIC_SKILLS,GenericSkill} from './chronicles-data';
export const DEFAULT_SKILL='G01';
export const COMMON_SKILLS=[...GENERIC_SKILLS].sort((a,b)=>a.powerRank-b.powerRank);
export function commonSkillFor(id:string):GenericSkill{return GENERIC_SKILLS.find(s=>s.id===id)||GENERIC_SKILLS[0];}
export function availableSkill(id:string):string{const s=GENERIC_SKILLS.find(s=>s.id===id);return s?.unlocked?s.id:DEFAULT_SKILL;}
/** All skills reset after 15 ordinary kills; efficiency cannot change the requirement. */
export function skillKillRequirement(_id:string,_efficiency=0):number{return 15;}
export const skillPowerText=(id:string):string=>'威力 '+['I','II','III','IV','V','VI'][commonSkillFor(id).powerTier-1];
