import {growthClears,signatureId} from './hero-growth';
import {INITIAL_CONTENT,STAGES,STARTER_WEAPONS,VISIBLE_HERO_IDS} from './stage-data';
export const PROFILE_KEY='taoyuan-stage-profile-v8';
export interface ClearRecord {seconds:number;kills:number;hearts:number;clears:number;}
export interface StageProfile {version:1;pendingWeapons:string[];heroes:Record<string,Record<string,ClearRecord>>;discovered:{enemies:string[];weapons:string[];skills:string[]};preferences:Record<string,{stage:number;weapon:string;skill:string}>;}
export interface ProfileStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export type ContentKind='weapons'|'passives'|'skills';
export const visibleHero=(id:string)=>VISIBLE_HERO_IDS.some(h=>h===id);
export function newProfile():StageProfile{return {version:1,pendingWeapons:[],heroes:{},discovered:{enemies:[],weapons:[...INITIAL_CONTENT.weapons],skills:[...INITIAL_CONTENT.skills]},preferences:{}};}
export function readProfile(storage:ProfileStorage):StageProfile {
 const p=newProfile();try{const raw=JSON.parse(storage.getItem(PROFILE_KEY)||'null');if(raw?.version!==1)return p;
 for(const hero of ['liubei','guanyu','zhangfei','zhaoyun','kongming']){const records:Record<string,ClearRecord>={};for(const stage of STAGES){const r=raw.heroes?.[hero]?.[stage.id];if(!r)break;if(![r.seconds,r.kills,r.hearts,r.clears].every(Number.isFinite)||r.seconds<=0||r.kills<0||r.hearts<0||r.hearts>(hero==='zhangfei'?12:11)||r.clears<1)break;records[stage.id]={seconds:r.seconds,kills:Math.floor(r.kills),hearts:Math.floor(r.hearts),clears:Math.floor(r.clears)};}p.heroes[hero]=records;
}
 for(const hero of ['liubei','guanyu','zhangfei','zhaoyun','kongming']){const pref=raw.preferences?.[hero];if(pref)p.preferences[hero]={stage:Math.max(1,Math.min(highestStage(p,hero),Math.floor(pref.stage)||1)),weapon:STARTER_WEAPONS.some(w=>w===pref.weapon)?pref.weapon:hero==='guanyu'?'pole':hero==='zhangfei'?'cleaver':'sandal',skill:unlocked(p,'skills').includes(pref.skill)?pref.skill:'G01'};}
 p.pendingWeapons=Array.isArray(raw.pendingWeapons)?raw.pendingWeapons.filter((id:unknown)=>typeof id==='string'&&unlocked(p,'weapons').includes(id)):[];
 for(const kind of ['enemies','weapons','skills'] as const){const ids=raw.discovered?.[kind];if(Array.isArray(ids))p.discovered[kind]=Array.from(new Set([...p.discovered[kind],...ids.filter((v:unknown)=>typeof v==='string'&&v.length<60)]));}
 }catch(_){/* A bad or legacy run never manufactures stage clears. */}return p;
}
export function saveProfile(storage:ProfileStorage,p:StageProfile):boolean{try{storage.setItem(PROFILE_KEY,JSON.stringify(p));return true;}catch(error){console.warn('关卡进度保存失败',error);return false;}}
export const highestStage=(p:StageProfile,hero:string):number=>{let n=1;for(const s of STAGES){if(!p.heroes[hero]?.[s.id])break;n=Math.min(6,n+1);}return n;};
export function unlocked(p:StageProfile,kind:ContentKind):string[]{const ids:string[]=[...INITIAL_CONTENT[kind]];for(const s of STAGES)if(Object.values(p.heroes).some(h=>!!h[s.id]))ids.push(...s.firstClear[kind]);return Array.from(new Set(ids));}
export function canChallenge(p:StageProfile,hero:string,stage:number,weapon:string,skill:string):boolean{return visibleHero(hero)&&Number.isInteger(stage)&&stage>=1&&stage<=highestStage(p,hero)&&STARTER_WEAPONS.some(w=>w===weapon)&&unlocked(p,'skills').includes(skill);}
export interface StageReward {stage:number;firstHeroClear:boolean;nextUnlocked:boolean;weapons:string[];passives:string[];skills:string[];growthBefore?:number;growthAfter?:number;}
export function recordClear(p:StageProfile,hero:string,stage:number,seconds:number,kills:number,hearts:number):StageReward|undefined {
 if(!visibleHero(hero)||!Number.isInteger(stage)||stage<1||stage>highestStage(p,hero)||stage>6||!Number.isFinite(seconds)||seconds<=0)return;
 const growthBefore=growthClears(p,hero);const before={weapons:unlocked(p,'weapons'),passives:unlocked(p,'passives'),skills:unlocked(p,'skills')};const s=STAGES[stage-1],old=p.heroes[hero]?.[s.id];p.heroes[hero]||={};p.heroes[hero][s.id]={seconds:Math.min(old?.seconds||Infinity,seconds),kills:Math.max(old?.kills||0,kills),hearts:Math.max(old?.hearts||0,hearts),clears:(old?.clears||0)+1};
 const reward:StageReward={stage,firstHeroClear:!old,nextUnlocked:!old&&stage<6,weapons:[],passives:[],skills:[],growthBefore,growthAfter:growthClears(p,hero)};for(const k of ['weapons','passives','skills'] as const)reward[k]=unlocked(p,k).filter(id=>!before[k].includes(id));
 p.pendingWeapons=Array.from(new Set([...p.pendingWeapons,...reward.weapons]));
 if(!old)discover(p,'weapons',signatureId(hero,growthClears(p,hero)));
 for(const id of reward.weapons)discover(p,'weapons',id);for(const id of reward.skills)discover(p,'skills',id);return reward;
}
export function discover(p:StageProfile,kind:keyof StageProfile['discovered'],id:string):boolean{if(p.discovered[kind].includes(id))return false;p.discovered[kind].push(id);return true;}
export const isKnown=(p:StageProfile,kind:keyof StageProfile['discovered'],id:string)=>p.discovered[kind].includes(id);
