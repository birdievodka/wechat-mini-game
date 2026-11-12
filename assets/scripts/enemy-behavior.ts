import { EnemyKind } from './campaign';

export const ARCHER = { windup: .18, recovery: .16, cooldown: .95, speed: 330, range: 430 };
export const CAVALRY = { windup: .45, duration: .62, recovery: .4, cooldown: 2.2, speed: 540, range: 260 };
export const ZHANGJIAO = { windup: .85, recovery: .4, cooldown: 2.6, enragedCooldown: 2, range: 1100, radius: 76, tripleRadius: 70 };

/** Spawn serials grow throughout a run; they must never turn into seconds of waiting. */
export function initialEnemyCooldown(kind: EnemyKind, serial: number): number {
  return (kind === 'chief' ? .8 : kind === 'cavalry' ? .45 : .2) + (serial % 5) * .04;
}
export function enemyDirection(dx: number, dy: number, previous = 0): number {
  if (Math.abs(dx) + Math.abs(dy) < .001) return previous;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
}
export function attackWindup(kind: EnemyKind): number {
  return kind === 'spearman' ? ARCHER.windup : kind === 'cavalry' ? CAVALRY.windup : kind === 'chief' ? ZHANGJIAO.windup : .32;
}
export function enemyAnimationCell(kind: EnemyKind, direction: number, walk: number, moving: boolean, attack: number): number {
  const row = direction === 3 ? 1 : direction;
  let column = moving ? Math.floor(walk) % 2 : 0;
  if (attack >= 0) {
    column = attack < attackWindup(kind) ? 2 : 3;
    if (kind === 'cavalry' && attack >= CAVALRY.windup && attack < CAVALRY.windup + CAVALRY.duration) column = Math.floor(walk) % 2 ? 1 : 3;
  }
  return row * 4 + column;
}
