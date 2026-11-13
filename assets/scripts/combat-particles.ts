/** Bounded visual simulation. Own RNG: effects never change combat/loot randomness. */
export const FX_LIMITS = { particles: 280, normalParticles: 200, stamps: 36, normalStamps: 28, emissionsPerSecond: 360, burstTokens: 72 };
export type ParticleShape = 'spark' | 'petal' | 'bean' | 'dust' | 'chip' | 'star';
export interface FxParticle {
  x: number; y: number; vx: number; vy: number; life: number; duration: number;
  size: number; angle: number; spin: number; gravity: number; drag: number;
  tone: number; shape: ParticleShape; priority: number;
}
export class CombatParticles {
  readonly slots: FxParticle[] = Array.from({ length: FX_LIMITS.particles }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, duration: 1, size: 1, angle: 0, spin: 0,
    gravity: 0, drag: 0, tone: 0, shape: 'spark', priority: 0,
  }));
  trailsEnabled=true;
  trimTrails():void {this.trailsEnabled=false;for(const p of this.slots)if(p.priority===0)p.life=0;}
  private seed = 73129;
  private tokens = FX_LIMITS.burstTokens;
  private cursor = 0;
  random(): number { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  get active(): number { let n = 0; for (const p of this.slots) if (p.life > 0) n++; return n; }
  emit(x: number, y: number, angle: number, speed: number, duration: number, size: number, tone: number,
    shape: ParticleShape = 'spark', priority = 1, gravity = -70, drag = 2): boolean {
    if(priority===0&&!this.trailsEnabled)return false;
    if (priority < 2 && this.tokens < 1) return false;
    const limit = priority >= 2 ? FX_LIMITS.particles : FX_LIMITS.normalParticles;
    let target: FxParticle | undefined;
    for (let i = 0; i < limit; i++) {
      const index = (this.cursor + i) % limit;
      if (this.slots[index].life <= 0) { target = this.slots[index]; this.cursor = index + 1; break; }
    }
    // A skill can displace an ordinary trail, never another skill's live particles.
    if (!target && priority >= 2) target = this.slots.find(p => p.priority < priority);
    if (!target) return false;
    if (priority < 2) this.tokens--;
    Object.assign(target, { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: duration, duration, size, angle, spin: (this.random() - .5) * 9, tone, shape, priority, gravity, drag });
    return true;
  }
  update(dt: number): void {
    this.tokens = Math.min(FX_LIMITS.burstTokens, this.tokens + dt * FX_LIMITS.emissionsPerSecond);
    for (const p of this.slots) {
      if (p.life <= 0 || dt <= 0) continue;
      const step = Math.min(p.life, dt); p.life = Math.max(0, p.life - step);
      p.vy += p.gravity * step; const drag = Math.exp(-p.drag * step); p.vx *= drag; p.vy *= drag;
      p.x += p.vx * step; p.y += p.vy * step; p.angle += p.spin * step;
    }
  }
  clear(): void { for (const p of this.slots) p.life = 0; this.tokens = FX_LIMITS.burstTokens; }
}
