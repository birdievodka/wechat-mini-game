import {CHRONICLE_ENEMIES} from './chronicles';
import {CHAPTERS} from './chronicles';
import {WEAPONS,migratedWeaponId} from './weapons';
import {COMMON_SKILLS} from './common-skills';
import {growthClears,signatureId} from './hero-growth';
import {INITIAL_CONTENT,STAGES,STARTER_WEAPONS,VISIBLE_HERO_IDS,HERO_WEAPON_REWARDS,LEGACY_WEAPON_REWARDS,stageRewardWeapons} from './stage-data';
export const PROFILE_KEY='taoyuan-stage-profile-v8';
export interface ClearRecord {seconds:number;kills:number;hearts:number;clears:number;}
export interface StageProfile {version:2;legacyWeapons:string[];pendingWeapons:string[];heroes:Record<string,Record<string,ClearRecord>>;discovered:{enemies:string[];weapons:string[];skills:string[]};preferences:Record<string,{stage:number;weapon:string;skill:string}>;}
export interface ProfileStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export type ContentKind='weapons'|'passives'|'skills';
export const visibleHero=(id:string)=>VISIBLE_HERO_IDS.some(h=>h===id);
export function newProfile():StageProfile{return {version:2,legacyWeapons:[],pendingWeapons:[],heroes:{},discovered:{enemies:[],weapons:[...INITIAL_CONTENT.weapons],skills:[...INITIAL_CONTENT.skills]},preferences:{}};}
const profileBackup=PROFILE_KEY+'-backup';
function storedProfile(storage:ProfileStorage,key:string) {
 try {
  const text=storage.getItem(key);
  if(!text||text.length>131072)return;
  const data=JSON.parse(text);
  if((data?.version!==1&&data?.version!==2)||!data.heroes||typeof data.heroes!=='object')return;
  const revision=data.revision??0;
  if(Number.isSafeInteger(revision)&&revision>=0)return {data,revision,text};
 }catch(_){/* The other slot may still be readable. */}
}
export function readProfile(storage:ProfileStorage):StageProfile {
 const main=storedProfile(storage,PROFILE_KEY),backup=storedProfile(storage,profileBackup);
 const raw=(backup&&(!main||backup.revision>main.revision)?backup:main)?.data;
 const p=newProfile();if(!raw)return p;try{
 for(const hero of ['liubei','guanyu','zhangfei','zhaoyun','kongming']){const records:Record<string,ClearRecord>={};for(const stage of STAGES){const r=raw.heroes?.[hero]?.[stage.id];if(!r)break;if(![r.seconds,r.kills,r.hearts,r.clears].every(Number.isFinite)||r.seconds<=0||r.kills<0||r.hearts<0||r.hearts>(hero==='zhangfei'?12:11)||r.clears<1)break;records[stage.id]={seconds:r.seconds,kills:Math.floor(r.kills),hearts:Math.floor(r.hearts),clears:Math.floor(r.clears)};}p.heroes[hero]=records;
}
 const validWeapons=new Set<string>(WEAPONS.map(w=>w.id));
 const migrateList=(value:unknown):string[]=>Array.isArray(value)
   ? Array.from(new Set(value.filter((id):id is string=>typeof id==='string').map(migratedWeaponId).filter(id=>validWeapons.has(id)))) : [];
 const earnedLegacy=raw.version===1
   ? LEGACY_WEAPON_REWARDS.reduce<string[]>((all,ids,i)=>Object.values(p.heroes).some(h=>!!h[STAGES[i].id])?all.concat(ids):all,[])
   : raw.legacyWeapons;
 p.legacyWeapons=migrateList(earnedLegacy);
 for(const hero of ['liubei','guanyu','zhangfei','zhaoyun','kongming']){const pref=raw.preferences?.[hero];if(pref)p.preferences[hero]={stage:Math.max(1,Math.min(highestStage(p,hero),Math.floor(pref.stage)||1)),weapon:STARTER_WEAPONS.some(w=>w===pref.weapon)?pref.weapon:hero==='guanyu'?'pole':hero==='zhangfei'?'cleaver':'sandal',skill:unlocked(p,'skills').includes(pref.skill)?pref.skill:'G01'};}
 p.pendingWeapons=migrateList(raw.pendingWeapons).filter(id=>unlocked(p,'weapons').includes(id));
 const known={enemies:new Set([...CHRONICLE_ENEMIES.map(e=>e.id),...CHAPTERS.map(c=>'boss-'+c.bossId)]),weapons:new Set(WEAPONS.map(w=>w.id)),skills:new Set(COMMON_SKILLS.map(s=>s.id))};
 for(const kind of ['enemies','weapons','skills'] as const){const ids=kind==='weapons'?migrateList(raw.discovered?.weapons):raw.discovered?.[kind];if(Array.isArray(ids))p.discovered[kind]=Array.from(new Set([...p.discovered[kind],...ids.filter((v:unknown)=>typeof v==='string'&&known[kind].has(v as never))]));}
 }catch(_){/* A bad or legacy run never manufactures stage clears. */}return p;
}
export function saveProfile(storage:ProfileStorage,p:StageProfile,mirror=false):boolean {
 try {
  const main=storedProfile(storage,PROFILE_KEY),backup=storedProfile(storage,profileBackup);
  const latest=backup&&(!main||backup.revision>main.revision)?backup:main;
  if(!mirror&&latest&&latest.text===JSON.stringify({...p,revision:latest.revision}))return true;
  const revision=(latest?.revision??0)+1;
  const text=JSON.stringify({...p,revision});
  const writeMain=!main||!!backup&&backup.revision>=main.revision;
  storage.setItem(writeMain?PROFILE_KEY:profileBackup,text);
  // A first clear or an explicit reset must survive losing either slot.
  if(mirror||(!main&&!backup))storage.setItem(writeMain?profileBackup:PROFILE_KEY,text);
  return true;
 }catch(error){console.warn('关卡进度保存失败',error);return false;}
}
export const highestStage=(p:StageProfile,hero:string):number=>{let n=1;for(const s of STAGES){if(!p.heroes[hero]?.[s.id])break;n=Math.min(6,n+1);}return n;};
export function unlocked(p:StageProfile,kind:ContentKind):string[]{
 const ids:string[]=[...INITIAL_CONTENT[kind]];
 if(kind==='weapons'){
  ids.push(...(p.legacyWeapons||[]));
  for(const s of STAGES){if(VISIBLE_HERO_IDS.some(h=>!!p.heroes[h]?.[s.id]))ids.push(...s.firstClear.weapons);for(const h of VISIBLE_HERO_IDS)if(p.heroes[h]?.[s.id])ids.push(HERO_WEAPON_REWARDS[h][Number(s.id.slice(1))-1]);}
  for(const h of VISIBLE_HERO_IDS)if(growthClears(p,h)>0)ids.push(signatureId(h,1));
 }else for(const s of STAGES)if(Object.values(p.heroes).some(h=>!!h[s.id]))ids.push(...s.firstClear[kind]);
 return Array.from(new Set(ids));
}
export function pendingStageWeapons(p:StageProfile,hero:string,stage:number):string[]{const owned=unlocked(p,'weapons');return stageRewardWeapons(stage,hero).filter(id=>!owned.includes(id));}
export function canChallenge(p:StageProfile,hero:string,stage:number,weapon:string,skill:string):boolean{return visibleHero(hero)&&Number.isInteger(stage)&&stage>=1&&stage<=highestStage(p,hero)&&STARTER_WEAPONS.some(w=>w===weapon)&&unlocked(p,'skills').includes(skill);}
export interface StageReward {stage:number;firstHeroClear:boolean;nextUnlocked:boolean;weapons:string[];passives:string[];skills:string[];growthBefore?:number;growthAfter?:number;publicWeapons?:string[];heroWeapons?:string[];signatureWeapons?:string[];petUnlocked?:string;}
export function recordClear(p:StageProfile,hero:string,stage:number,seconds:number,kills:number,hearts:number):StageReward|undefined {
 if(!visibleHero(hero)||!Number.isInteger(stage)||stage<1||stage>highestStage(p,hero)||stage>6||!Number.isFinite(seconds)||seconds<=0)return;
 const growthBefore=growthClears(p,hero);const before={weapons:unlocked(p,'weapons'),passives:unlocked(p,'passives'),skills:unlocked(p,'skills')};const s=STAGES[stage-1],old=p.heroes[hero]?.[s.id];p.heroes[hero]||={};p.heroes[hero][s.id]={seconds:Math.min(old?.seconds||Infinity,seconds),kills:Math.max(old?.kills||0,kills),hearts:Math.max(old?.hearts||0,hearts),clears:(old?.clears||0)+1};
 const reward:StageReward={stage,firstHeroClear:!old,nextUnlocked:!old&&stage<6,weapons:[],passives:[],skills:[],growthBefore,growthAfter:growthClears(p,hero)};for(const k of ['weapons','passives','skills'] as const)reward[k]=unlocked(p,k).filter(id=>!before[k].includes(id));
 reward.publicWeapons=reward.weapons.filter(id=>s.firstClear.weapons.some(w=>w===id));reward.heroWeapons=reward.weapons.filter(id=>id===HERO_WEAPON_REWARDS[hero]?.[stage-1]);reward.signatureWeapons=reward.weapons.filter(id=>id===signatureId(hero,1));if(!old&&stage===5)reward.petUnlocked=hero;
 p.pendingWeapons=Array.from(new Set([...p.pendingWeapons,...reward.weapons]));
 if(!old)discover(p,'weapons',signatureId(hero,growthClears(p,hero)));
 for(const id of reward.weapons)discover(p,'weapons',id);for(const id of reward.skills)discover(p,'skills',id);return reward;
}
export function discover(p:StageProfile,kind:keyof StageProfile['discovered'],id:string):boolean{if(p.discovered[kind].includes(id))return false;p.discovered[kind].push(id);return true;}
export const isKnown=(p:StageProfile,kind:keyof StageProfile['discovered'],id:string)=>p.discovered[kind].includes(id);
