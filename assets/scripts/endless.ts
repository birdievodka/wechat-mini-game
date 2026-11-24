import {Run,createStageRun,HeroId} from './campaign';
import {StageProfile} from './stage-progress';
import {growthClears} from './hero-growth';
import {WeaponId} from './weapons';

export const endlessUnlocked = (profile:StageProfile, hero:string):boolean => growthClears(profile,hero) >= 6;
export function endlessDifficulty(tier:number) {
 // At tier 13 the spawn density is saturated. Later shops add a fixed amount of health pressure.
 const round=Math.max(0,tier), saturation=13;
 const pressure = Math.pow(1.2, Math.min(round,saturation)) * (1 + .2*Math.max(0,round-saturation));
 const density = Math.min(3, Math.sqrt(pressure));
 return {pressure,density,hp:pressure/density,count:Math.min(72,Math.floor(24*density)),cost:28*density,interval:1/density};
}
export function createEndlessRun(profile:StageProfile,hero:HeroId,starter:WeaponId,skill:string):Run|undefined {
 if(!endlessUnlocked(profile,hero))return;
 const run=createStageRun(profile,hero,1,starter,skill);
 if(run){run.endless=true;run.endlessTier=0;}
 return run;
}
