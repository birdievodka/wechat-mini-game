import type { WeaponId } from './weapons';
import { AUDIO_CUES, SOUND_ASSETS, WEAPON_AUDIO_FAMILIES } from './audio-catalog';

export const SOUND_CUES = AUDIO_CUES;
export type SoundId = keyof typeof SOUND_CUES;
export type SoundEvent = 'attack' | 'hit';
export const GENERATED_SOUNDS = (Object.keys(SOUND_CUES) as SoundId[]).filter((id):id is Exclude<SoundId,'sandal-hit-pcm'> => id !== 'sandal-hit-pcm');
export function weaponSound(weapon: WeaponId, event: SoundEvent): SoundId | undefined {
  if (weapon === 'sandal') return event === 'hit' ? 'sandal-hit-pcm' : undefined;
  const family = WEAPON_AUDIO_FAMILIES[weapon], id = `${family}-${event}` as SoundId;
  return SOUND_CUES[id] ? id : undefined;
}
export const bossSound = (boss:string,index:number):SoundId|undefined => {
  const id = `boss-${boss}-${index+1}` as SoundId;
  return SOUND_CUES[id] ? id : undefined;
};
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
  private voices: { until: number; priority: number; started: number }[];
  constructor(count = SFX_VOICES) { this.voices = Array.from({ length: count }, () => ({ until: 0, priority: -1, started: 0 })); }
  get elapsed(): number { return this.time; }
  update(delta: number): void { if(Number.isFinite(delta)&&delta>=0)this.time+=Math.min(delta,60); }
  reset(): void { this.time = 0; this.nextSwing = this.nextImpact = this.nextSupport = 0; this.next = {}; this.voices.forEach(v => { v.until = 0; v.priority = -1; }); }
  acquire(id: SoundId, priority: number = SOUND_CUES[id].priority, weapon?: SoundEvent | 'finisher'): number | undefined {
    if ((this.next[id] || 0) > this.time) return;
    if (weapon === 'attack' && this.time < this.nextSwing) return;
    if (weapon === 'hit' && this.time < this.nextImpact && this.time < this.nextSupport) return;
    let index = this.voices.findIndex(v => v.until <= this.time);
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
    voice.until=this.time+cue.duration;voice.priority=priority;voice.started=this.time;
    this.next[id] = this.time + cue.gap;
    return index;
  }
}
