/** AudioSource-compatible port; keeping the music clock independent makes lifecycle testable. */
export interface MusicSource {
  loop: boolean; volume: number; currentTime: number;
  play(): void; pause(): void; stop(): void;
}

export const MUSIC_SECONDS = 60;
export const MUSIC_VOLUME = .26;

export class BattleMusic {
  private source?: MusicSource;
  private running = false;
  private paused = false;
  private unlocked = false;
  private enabled = true;
  private playing = false;
  private elapsed = 0;
  private fade = 0;

  attach(source: MusicSource): void {
    this.source?.stop(); this.source = source; source.loop = true; source.volume = 0;
    this.playing = false; this.sync();
  }
  unlock(): void { this.unlocked = true; this.sync(); }
  setEnabled(enabled: boolean): void { this.enabled = enabled; this.sync(); }
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
    this.elapsed = 0; this.fade = 0;
    if (this.source) this.source.volume = 0;
  }
  update(delta: number): void {
    if (!this.running || this.paused) return;
    this.elapsed = (this.elapsed + Math.max(0, delta)) % MUSIC_SECONDS;
    if (this.playing && this.source) {
      this.fade = Math.min(1, this.fade + Math.max(0, delta) / .45);
      this.source.volume = MUSIC_VOLUME * this.fade;
    }
  }
  private sync(): void {
    if (!this.source) return;
    const play = this.running && !this.paused && this.enabled && this.unlocked;
    if (play && !this.playing) {
      // Late download, unmute and resume all join the current round's musical phrase.
      this.source.currentTime = this.elapsed; this.source.volume = 0; this.fade = 0;
      this.source.play(); this.playing = true;
    } else if (!play && this.playing) {
      this.source.pause(); this.source.volume = 0; this.playing = false;
    }
  }
}
