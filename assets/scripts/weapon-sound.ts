import type { WeaponId } from './weapons';
import { AUDIO_CUES, SOUND_ASSETS, WEAPON_AUDIO_FAMILIES } from './audio-catalog';

export const SOUND_CUES = AUDIO_CUES;
export type SoundId = keyof typeof SOUND_CUES;
export type SoundEvent = 'attack' | 'hit';
export const GENERATED_SOUNDS = (Object.keys(SOUND_CUES) as SoundId[]).filter((id):id is Exclude<SoundId,'sandal-hit-pcm'> => id !== 'sandal-hit-pcm');
// Resolve catalog keys once, outside the attack and multi-target hit paths.
const weaponCues: Record<string, Partial<Record<SoundEvent, SoundId>>> = Object.create(null);
for (const [weapon, family] of Object.entries(WEAPON_AUDIO_FAMILIES)) {
  const cues: Partial<Record<SoundEvent, SoundId>> = {};
  for (const event of ['attack', 'hit'] as const) {
    const id = `${family}-${event}` as SoundId;
    if (SOUND_CUES[id]) cues[event] = id;
  }
  weaponCues[weapon] = cues;
}
weaponCues.sandal = { hit: 'sandal-hit-pcm' };
export function weaponSound(weapon: WeaponId, event: SoundEvent): SoundId | undefined {
  return weaponCues[weapon]?.[event];
}
const bossCues=new Map<string,SoundId[]>();
const skillCues=new Map<string,SoundId>();
for(const id of GENERATED_SOUNDS){
  if(id.startsWith('skill-'))skillCues.set(id.slice(6),id);
  const match=/^boss-([a-z]+)-([1-3])$/.exec(id);
  if(!match)continue;
  let moves=bossCues.get(match[1]);
  if(!moves){moves=[];bossCues.set(match[1],moves);}
  moves[Number(match[2])-1]=id;
}
export const bossSound=(boss:string,index:number):SoundId|undefined=>bossCues.get(boss)?.[index];
export const skillSound=(id:string):SoundId|undefined=>skillCues.get(id);
export function enemySound(id?:string):SoundId {
  const n=Number(id?.slice(1)||0);
  return n>=35&&n<=38?'siege':n>=39?'thunder-attack':n>=28&&n<=34?'gun-attack':n>=11&&n<=18||n===22||n===23?'enemy-bow':'melee-commit';
}
export const soundAsset=(id:Exclude<SoundId,'sandal-hit-pcm'>)=>SOUND_ASSETS[id];
export const SFX_VOICES = 6;

/** Per-cue rate limits preserve distinct weapons; release sounds cannot cut off impacts. */
export class SoundGate {
  private time = 0;
  private nextSwing = 0;
  private nextImpact = 0;
  private nextSupport = 0;
  private next: Partial<Record<SoundId, number>> = {};
  private voices: { until: number; priority: number; started: number; source?:string }[];
  constructor(count = SFX_VOICES) { this.voices = Array.from({ length: count }, () => ({ until: 0, priority: -1, started: 0 })); }
  get elapsed(): number { return this.time; }
  update(delta: number): void { if(Number.isFinite(delta)&&delta>=0)this.time+=Math.min(delta,60); }
  reset(): void { this.time = 0; this.nextSwing = this.nextImpact = this.nextSupport = 0; this.next = {}; this.voices.forEach(v => { v.until = 0; v.priority = -1; }); }
  acquire(id: SoundId, priority: number = SOUND_CUES[id].priority, weapon?: SoundEvent | 'finisher', source?:string): number | undefined {
    if ((this.next[id] || 0) > this.time) return;
    if (weapon === 'attack' && this.time < this.nextSwing) return;
    if (weapon === 'hit' && this.time < this.nextImpact && this.time < this.nextSupport) return;
    let index = -1, oldestIdle = Infinity;
    for(let i=0;i<this.voices.length;i++){
      const voice=this.voices[i];
      if(voice.until>this.time)continue;
      if(!source || voice.source===source){index=i;break;}
      // Among idle players, keep recently used native decoders available for their next cue.
      const lastUse=voice.source?voice.started:-Infinity;
      if(lastUse<oldestIdle){index=i;oldestIdle=lastUse;}
    }
    if (index < 0) {
      index = this.voices.reduce((best, v, i, all) => v.priority < all[best].priority || (v.priority === all[best].priority && v.started < all[best].started) ? i : best, 0);
      if (this.voices[index].priority > priority) return;
    }
    const cue = SOUND_CUES[id];
    if (weapon === 'attack') this.nextSwing = this.time + .115;
    if (weapon === 'hit' || weapon === 'finisher') {
      if (this.time >= this.nextImpact || weapon === 'finisher') this.nextImpact = this.time + .14;
      else this.nextSupport = this.nextImpact;
    }
    const voice=this.voices[index];
    voice.until=this.time+cue.duration;voice.priority=priority;voice.started=this.time;voice.source=source;
    this.next[id] = this.time + cue.gap;
    return index;
  }
}
