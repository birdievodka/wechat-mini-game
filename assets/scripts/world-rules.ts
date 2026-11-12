export const WORLD = { width: 2001, height: 1125, halfWidth: 1000.5, halfHeight: 562.5 };
export function resizeWorld(viewWidth:number,viewHeight:number):void {
  WORLD.width=viewWidth*1.5;WORLD.height=viewHeight*1.5;WORLD.halfWidth=WORLD.width/2;WORLD.halfHeight=WORLD.height/2;
}
const clamp = (n: number, a: number, b: number): number => Math.max(a, Math.min(b, n));
export function spawnPoint(px: number, py: number, kind: string, random = Math.random, heading = 0): { x: number; y: number } {
  const minimum = kind === 'chief' ? 550 : kind === 'cavalry' ? 420 : 260;
  for (let i = 0; i < 16; i++) {
    const group = random(), angle = group < .25 ? heading + (random() - .5) * 1.8 : random() * Math.PI * 2;
    const radius = minimum + random() * (group < .25 ? 700 : 600);
    const x = group > .85 ? (random() * 2 - 1) * (WORLD.halfWidth - 70) : clamp(px + Math.cos(angle) * radius, -WORLD.halfWidth + 70, WORLD.halfWidth - 70);
    const y = group > .85 ? (random() * 2 - 1) * (WORLD.halfHeight - 70) : clamp(py + Math.sin(angle) * radius, -WORLD.halfHeight + 70, WORLD.halfHeight - 70);
    if (Math.hypot(x - px, y - py) >= minimum) return { x, y };
  }
  return { x: px > 0 ? -WORLD.halfWidth + 100 : WORLD.halfWidth - 100, y: clamp(py, -WORLD.halfHeight + 100, WORLD.halfHeight - 100) };
}
/** A stable elliptical formation leaves the face clear; no extra anatomical arms. */
export function orbitAnchor(index: number, count: number, age: number): { x: number; y: number; behind: boolean } {
  const angle = Math.PI / 6 + index * Math.PI * 2 / count + Math.sin(age * .35) * .08;
  return { x: Math.cos(angle) * 94, y: 35 + Math.sin(angle) * 76 + Math.sin(age * 2 + index) * 3, behind: Math.sin(angle) > .35 };
}
export function cameraTarget(px: number, py: number, hw: number, hh: number): { x: number; y: number } {
  return { x: clamp(px, -Math.max(0, WORLD.halfWidth - hw), Math.max(0, WORLD.halfWidth - hw)), y: clamp(py, -Math.max(0, WORLD.halfHeight - hh), Math.max(0, WORLD.halfHeight - hh)) };
}
export const HERO_SKILLS = {
  liubei: { name: '以德服人', cooldown: 30, range: 240, factor: .8, color: '#f5c95b' },
  guanyu: { name: '横扫千军', cooldown: 26, range: 520, factor: 1.4, color: '#8bdb67' },
  zhangfei: { name: '桃园狮吼', cooldown: 32, range: 260, factor: 1.1, color: '#d791e9' },
};
