/** AudioSource-compatible port; keeping the music clock independent makes lifecycle testable. */
export interface MusicSource {
  loop: boolean; volume: number; currentTime: number;
  readonly playing?: boolean;
  play(): void; pause(): void; stop(): void;
}

export const MUSIC_SECONDS = 60;
export const MUSIC_VOLUME = .26;
const menu = {id:'brass-oath', title:'桃园举旗', seconds:32, volume:.65};
const battle = {id:'brass-rally', title:'全军出击', seconds:3840/152, volume:.60};
export const MUSIC_SCENES = {menu, battle, boss:battle};

export class BattleMusic {
  private source?: MusicSource;
  private running = false;
  private paused = false;
  private adPlaying = false;
  private interrupted = false;
  private unlocked = false;
  private gesture = false;
  private enabled = true;
  private playing = false;
  private elapsed = 0;
  private fade = 0;
  private seconds = MUSIC_SECONDS;
  private volume = MUSIC_VOLUME;
  private duckTime = 0;
  private duckAmount = 0;

  configure(seconds = MUSIC_SECONDS, volume = MUSIC_VOLUME): void { this.seconds = seconds; this.volume = volume; }
  detach(): void {
    const source = this.source; this.source = undefined; this.playing = false;
    source?.stop();
  }
  duck(amount = .5, seconds = .35): void { this.duckAmount = Math.max(this.duckAmount, amount); this.duckTime = Math.max(this.duckTime, seconds); }

  attach(source: MusicSource): void {
    this.source?.stop(); this.source = source; source.loop = true; source.volume = 0;
    this.playing = false; this.sync();
  }
  /** Native mini-game hosts may play on entry. Browser autoplay stays gesture gated. */
  tryAutoplay(): void { this.unlocked = true; this.sync(); }
  unlock(): void {
    // A host can silently reject an early play without throwing. Retry once on
    // the first real gesture, but never restart an already audible track.
    if(!this.gesture&&this.playing&&this.source?.playing===false)this.playing=false;
    this.gesture=true;this.unlocked = true; this.sync();
  }
  setEnabled(enabled: boolean): void { this.enabled = enabled; this.sync(); }
  setAdPlaying(playing: boolean): void { this.adPlaying = playing; this.sync(); }
  setInterrupted(interrupted: boolean): void { this.interrupted = interrupted; this.sync(); }
  begin(): void {
    this.stop(); this.running = true; this.paused = false; this.sync();
  }
  pause(): void {
    this.paused = true;
    // Some hosts resume an interrupted native player on foregrounding. Enforce pause again.
    if (!this.playing) this.source?.pause();
    this.sync();
  }
  resume(): void { this.paused = false; this.sync(); }
  stop(): void {
    this.source?.stop(); this.running = false; this.playing = false;
    this.elapsed = 0; this.fade = 0; this.duckTime = this.duckAmount = 0;
    if (this.source) this.source.volume = 0;
  }
  update(delta: number): void {
    if(!Number.isFinite(delta)||delta<0)return;
    if (!this.running || this.paused || this.adPlaying || this.interrupted) return;
    this.elapsed = (this.elapsed + Math.max(0, delta)) % this.seconds;
    if (this.playing && this.source) {
      this.fade = Math.min(1, this.fade + Math.max(0, delta) / .45);
      this.duckTime = Math.max(0, this.duckTime - Math.max(0, delta));
      if (!this.duckTime) this.duckAmount = 0;
      this.source.volume = this.volume * this.fade * (1 - this.duckAmount * Math.min(1, this.duckTime / .22));
    }
  }
  private sync(): void {
    const source = this.source;
    if (!source) return;
    const play = this.running && !this.paused && !this.adPlaying && !this.interrupted && this.enabled && this.unlocked;
    if (play && !this.playing) {
      // Late download, unmute and resume all join the current round's musical phrase.
      source.currentTime = this.elapsed; source.volume = 0; this.fade = 0;
      // A synchronous native error may detach this source during play().
      this.playing = true;
      try { source.play(); } catch (_) { if (this.source === source) this.playing = false; }
    } else if (!play && this.playing) {
      this.playing = false; source.pause(); source.volume = 0;
    }
  }
}
