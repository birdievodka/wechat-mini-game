import { WeaponId, weaponFor } from './weapons';

export const SOUND_CUES = {
  'sandal-hit-pcm': { volume: .48, duration: .5, gap: .055, priority: 1 },
  'beans-attack': { volume: .18, duration: .10, gap: .10, priority: 0 },
  'beans-hit': { volume: .38, duration: .085, gap: .055, priority: 1 },
  'peach-attack': { volume: .20, duration: .18, gap: .12, priority: 0 },
  'peach-hit': { volume: .35, duration: .26, gap: .09, priority: 1 },
  'cleaver-attack': { volume: .18, duration: .07, gap: .10, priority: 0 },
  'cleaver-hit': { volume: .46, duration: .15, gap: .07, priority: 1 },
  'rollingpin-attack': { volume: .16, duration: .08, gap: .12, priority: 0 },
  'rollingpin-hit': { volume: .48, duration: .20, gap: .09, priority: 1 },
  'firecracker-attack': { volume: .16, duration: .14, gap: .16, priority: 0 },
  'firecracker-hit': { volume: .46, duration: .33, gap: .12, priority: 1 },
} as const;
export type SoundId = keyof typeof SOUND_CUES;
export type SoundEvent = 'attack' | 'hit';
export const GENERATED_SOUNDS = (Object.keys(SOUND_CUES) as SoundId[]).filter(id => id !== 'sandal-hit-pcm');
const WEAPON_SOUNDS: Partial<Record<WeaponId, { attack?: SoundId; hit: SoundId }>> = {
  sandal: { hit: 'sandal-hit-pcm' }, // Deliberately no shoe whoosh, per the approved sound direction.
  pole: { attack: 'rollingpin-attack', hit: 'rollingpin-hit' },
  peach: { attack: 'peach-attack', hit: 'peach-hit' },
  cleaver: { attack: 'cleaver-attack', hit: 'cleaver-hit' },
  firecracker: { attack: 'firecracker-attack', hit: 'firecracker-hit' },
  smg: { attack: 'beans-attack', hit: 'beans-hit' },
  shotgun: { attack: 'cleaver-hit', hit: 'rollingpin-hit' },
  rocket: { attack: 'firecracker-attack', hit: 'firecracker-hit' },
  sword: { attack: 'peach-attack', hit: 'cleaver-attack' },
  thunder: { attack: 'peach-attack', hit: 'firecracker-hit' },
  gourd: { attack: 'rollingpin-attack', hit: 'peach-hit' },
};
export const weaponSound = (weapon: WeaponId, event: SoundEvent): SoundId | undefined => (WEAPON_SOUNDS[weapon] || (weaponFor(weapon).category==='melee'?WEAPON_SOUNDS.cleaver:weaponFor(weapon).category==='magic'?WEAPON_SOUNDS.peach:WEAPON_SOUNDS.smg))?.[event];
export const SFX_VOICES = 6;

/** Per-cue rate limits preserve distinct weapons; release sounds cannot cut off impacts. */
export class SoundGate {
  private time = 0;
  private next: Partial<Record<SoundId, number>> = {};
  private voices: { until: number; priority: number; started: number }[];
  constructor(count = SFX_VOICES) { this.voices = Array.from({ length: count }, () => ({ until: 0, priority: -1, started: 0 })); }
  update(delta: number): void { this.time += Math.max(0, delta); }
  reset(): void { this.time = 0; this.next = {}; this.voices.forEach(v => { v.until = 0; v.priority = -1; }); }
  acquire(id: SoundId, priority: number = SOUND_CUES[id].priority): number | undefined {
    if ((this.next[id] || 0) > this.time) return;
    let index = this.voices.findIndex(v => v.until <= this.time);
    if (index < 0) {
      index = this.voices.reduce((best, v, i, all) => v.priority < all[best].priority || (v.priority === all[best].priority && v.started < all[best].started) ? i : best, 0);
      if (this.voices[index].priority > priority) return;
    }
    const cue = SOUND_CUES[id];
    this.voices[index] = { until: this.time + cue.duration, priority, started: this.time };
    this.next[id] = this.time + cue.gap;
    return index;
  }
}
