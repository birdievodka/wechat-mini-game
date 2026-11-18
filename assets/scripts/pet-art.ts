import {SpriteFrame} from 'cc';
import {ensureSheets,cancelArtGroups} from './deferred-art';
import {releaseArtTexture} from './asset-scope';
import {PET_HEROES,petFrameKey} from './pets';
const keys=Array.from({length:15},(_,i)=>petFrameKey(PET_HEROES[i%3],Math.floor(i/3)));
export const petArtReady=(frames:Record<string,SpriteFrame>)=>keys.every(k=>!!frames[k]);
export function ensurePetArt(frames:Record<string,SpriteFrame>,alive:()=>boolean,done:(error?:Error)=>void):void {ensureSheets('pets',[{name:'pets',columns:4,rows:4,keys}],frames,alive,done);}
export function releasePetArt(frames:Record<string,SpriteFrame>):void {cancelArtGroups(frames,n=>n==='pets');const textures=new Set<SpriteFrame['texture']>();for(const k of keys){const f=frames[k];if(f){textures.add(f.texture);delete frames[k];f.destroy();}}for(const t of textures)releaseArtTexture(frames,t);}
