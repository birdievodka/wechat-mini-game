import {GENERIC_SKILLS,GenericSkill} from './chronicles-data';
export const SKY_VOLLEY_SIZE=3;
export const FIRE_HALF_WIDTH=48;
export const DASH_HALF_WIDTH=60;
export const GUARD_SWORDS=6;
export const GUARD_ANGULAR_SPEED=5.2;
export const GUARD_WARDS=4;
export const PRECISION_ARROWS=8;
export const RAIN_VOLLEYS=4;
export const RAIN_FIRST_IMPACT=.22;
export const RAIN_INTERVAL=.25;
export const isHeavyStar=(volley:number):boolean=>volley===METEOR_COUNT/SKY_VOLLEY_SIZE-1;
export const THUNDER_COUNT=12;
export const METEOR_COUNT=27;
export interface SkyPoint {x:number;y:number;}
export const DEFAULT_SKILL='G01';
export const COMMON_SKILLS=[...GENERIC_SKILLS].sort((a,b)=>a.powerRank-b.powerRank);
export function commonSkillFor(id:string):GenericSkill{return GENERIC_SKILLS.find(s=>s.id===id)||GENERIC_SKILLS[0];}
export function availableSkill(id:string):string{const s=GENERIC_SKILLS.find(s=>s.id===id);return s?.unlocked?s.id:DEFAULT_SKILL;}
/** All skills reset after 15 ordinary kills; efficiency cannot change the requirement. */
export function skillKillRequirement(_id:string,_efficiency=0):number{return 15;}
export const skillPowerText=(id:string):string=>'威力 '+['I','II','III','IV','V','VI'][commonSkillFor(id).powerTier-1];
