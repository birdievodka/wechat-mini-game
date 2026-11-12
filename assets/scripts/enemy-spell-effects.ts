import { Color, Graphics } from 'cc';

export const LIGHTNING_AFTERGLOW = .55;
interface LightningVisual { x: number; y: number; radius: number; age: number; delay: number; fired: boolean; }
type Point = [number, number];
const TAU = Math.PI * 2;
const gold = (alpha: number): Color => new Color(255, 194, 65, Math.round(alpha));
const cream = (alpha: number): Color => new Color(255, 248, 207, Math.round(alpha));
const red = (alpha: number): Color => new Color(174, 63, 32, Math.round(alpha));

function line(g: Graphics, points: Point[], color: Color, width: number): void {
  g.strokeColor = color; g.lineWidth = width;
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
  g.stroke();
}
function ring(g: Graphics, x: number, y: number, radius: number, color: Color, width: number): void {
  g.strokeColor = color; g.lineWidth = width; g.circle(x, y, radius); g.stroke();
}
function polygon(g: Graphics, x: number, y: number, radius: number, rotation: number, color: Color, width: number): void {
  g.strokeColor = color; g.lineWidth = width;
  for (let i = 0; i <= 8; i++) {
    const angle = rotation + i * TAU / 8, px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.stroke();
}
function talisman(g: Graphics, x: number, y: number, angle: number, scale: number, alpha: number): void {
  const c = Math.cos(angle) * scale, s = Math.sin(angle) * scale;
  const p = (u: number, v: number): Point => [x + u * c - v * s, y + u * s + v * c];
  const corners = [p(-5, -10), p(5, -10), p(5, 10), p(-5, 10)];
  g.fillColor = gold(alpha); g.strokeColor = red(alpha * .8); g.lineWidth = 1;
  g.moveTo(...corners[0]); for (let i = 1; i < 4; i++) g.lineTo(...corners[i]); g.close(); g.fill(); g.stroke();
  // A small red seal/glyph stays legible at gameplay scale.
  line(g, [p(-2.5, 6), p(2.5, 6), p(0, 6), p(0, -6), p(-2.5, -3), p(2.5, 0), p(-2.5, 2)], red(alpha), 1.5);
}

/** Local casting aura, attached to the caster. No area or targeting indicators. */
export function drawTaoistCast(g: Graphics, age: number, progress: number): void {
  const energy = Math.sin(Math.min(1, progress) * Math.PI * .8);
  g.strokeColor = gold(80 + energy * 100); g.lineWidth = 3;
  g.ellipse(0, 5, 38 + energy * 5, 13); g.stroke();
  for (let i = 0; i < 3; i++) {
    const a = age * 2.5 + i * TAU / 3;
    talisman(g, Math.cos(a) * 52, 58 + Math.sin(a) * 34 + progress * 14, a * .25, .8, 170 + energy * 70);
  }
}

/** Two shared Graphics layers: the fixed danger boundary under actors, lightning above. */
export function drawLightningSpell(ground: Graphics, air: Graphics, z: LightningVisual): void {
  const { x, y, radius: r } = z;
  if (!z.fired) {
    const p = Math.min(1, z.age / z.delay), rotation = z.age * .7;
    const pulse = .5 + .5 * Math.sin(p * Math.PI * 6);
    ground.fillColor = new Color(189, 66, 24, Math.round(22 + p * 30)); ground.circle(x, y, r); ground.fill();
    // The outside edge never expands or rotates: this is the actual damage radius.
    ring(ground, x, y, r, red(230), 3.5);
    ring(ground, x, y, r - 5, gold(130 + p * 100), 2);
    polygon(ground, x, y, r * .73, rotation, gold(160 + p * 80), 2);
    polygon(ground, x, y, r * .56, -rotation, red(130 + p * 50), 1.5);
    // Eight rotating trigram seals, contained inside the danger boundary.
    ground.strokeColor = gold(180 + p * 60); ground.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = rotation + i * TAU / 8, nx = Math.cos(a), ny = Math.sin(a), tx = -ny, ty = nx;
      for (let row = 0; row < 3; row++) {
        const d = r * .79 - row * 4, cx = x + nx * d, cy = y + ny * d;
        if (i & (1 << row)) {
          ground.moveTo(cx - tx * 5, cy - ty * 5); ground.lineTo(cx + tx * 5, cy + ty * 5);
        } else {
          ground.moveTo(cx - tx * 5, cy - ty * 5); ground.lineTo(cx - tx * 1.5, cy - ty * 1.5);
          ground.moveTo(cx + tx * 1.5, cy + ty * 1.5); ground.lineTo(cx + tx * 5, cy + ty * 5);
        }
      }
    }
    ground.stroke();
    // Clockwise progress lights up the inside rim without changing the hit area.
    ground.strokeColor = cream(220); ground.lineWidth = 3;
    const segments = Math.max(1, Math.ceil(p * 40));
    for (let i = 0; i <= segments; i++) {
      const a = Math.PI / 2 - p * TAU * i / segments;
      const px = x + Math.cos(a) * (r - 10), py = y + Math.sin(a) * (r - 10);
      if (!i) ground.moveTo(px, py); else ground.lineTo(px, py);
    }
    ground.stroke();
    ring(ground, x, y, 12 + pulse * 3, gold(160 + p * 90), 2);
    line(ground, [[x - 7, y], [x + 7, y]], cream(230), 2);
    line(ground, [[x, y - 7], [x, y + 7]], cream(230), 2);
    for (let i = 0; i < 4; i++) {
      const a = -rotation * 1.4 + i * TAU / 4, d = r * (.52 - p * .12);
      talisman(air, x + Math.cos(a) * d, y + Math.sin(a) * d + 12 + p * 12, Math.sin(a) * .3, .75 + p * .15, 150 + p * 90);
    }
    // Inward sparks give the final windup a gathering-energy motion.
    air.fillColor = cream(140 + p * 100);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + rotation, t = (z.age * 1.6 + i * .17) % 1, d = r * (.85 - t * .65);
      air.circle(x + Math.cos(a) * d, y + Math.sin(a) * d + t * 18, 1.3 + p); air.fill();
    }
    return;
  }

  const t = Math.max(0, z.age - z.delay), progress = Math.min(1, t / LIGHTNING_AFTERGLOW), fade = 1 - progress;
  const flash = Math.max(0, 1 - t / .2), boltAlpha = Math.max(0, 1 - t / .36);
  ground.fillColor = gold(flash * 105); ground.circle(x, y, r); ground.fill();
  ring(ground, x, y, r, red(fade * 170), 2);
  ring(ground, x, y, r * (.35 + .65 * Math.min(1, t / .24)), gold(fade * 230), 3 + flash * 3);
  polygon(ground, x, y, r * .73, z.delay * .7, gold(fade * 180), 2);
  // Short branching ground arcs break up the impact, all inside the original circle.
  for (let i = 0; i < 7; i++) {
    const a = i * TAU / 7 + .2, c = Math.cos(a), s = Math.sin(a), d = r * (.6 + (i % 3) * .1);
    const points: Point[] = [[x + c * 10, y + s * 10], [x + c * d * .4 - s * 9, y + s * d * .4 + c * 9], [x + c * d * .65 + s * 5, y + s * d * .65 - c * 5], [x + c * d, y + s * d]];
    line(ground, points, gold(fade * 200), 3); line(ground, points, cream(fade * 220), 1);
  }
  if (boltAlpha > 0) {
    const height = 245, sway = Math.sin((z.x + z.y) * .13) * 9;
    const bolt: Point[] = [[x - 19 + sway, y + height], [x + 17, y + height * .76], [x - 10, y + height * .77], [x + 13, y + height * .53], [x - 16, y + height * .4], [x + 6, y + height * .41], [x, y + 4]];
    line(air, bolt, gold(boltAlpha * 36), 24);
    line(air, bolt, new Color(255, 153, 36, Math.round(boltAlpha * 130)), 12);
    line(air, bolt, gold(boltAlpha * 250), 7);
    line(air, bolt, cream(boltAlpha * 255), 3);
    for (const side of [-1, 1]) {
      const branch: Point[] = [[x + side * 58, y + height * .74], [x + side * 30, y + height * .58], [x + side * 43, y + height * .59], [x + side * 8, y + height * .32], [x, y + 4]];
      line(air, branch, gold(boltAlpha * 80), 9); line(air, branch, cream(boltAlpha * 220), 2);
    }
    // A small white-hot star anchors the bolt at the point of impact.
    const size = 12 + flash * 16;
    air.fillColor = cream(boltAlpha * 230);
    air.moveTo(x, y + size); air.lineTo(x + 5, y + 5); air.lineTo(x + size, y);
    air.lineTo(x + 5, y - 5); air.lineTo(x, y - size); air.lineTo(x - 5, y - 5);
    air.lineTo(x - size, y); air.lineTo(x - 5, y + 5); air.close(); air.fill();
  }
  // Fixed, small particle count; deterministic motion also freezes correctly on pause.
  for (let i = 0; i < 10; i++) {
    const a = i * TAU / 10 + .14, d = 14 + progress * r * (.45 + (i % 3) * .12);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + Math.sin(progress * Math.PI) * (17 + i % 4 * 6);
    if (i % 3 === 0) talisman(air, px, py, a + progress * 3, .6 * fade + .2, fade * 220);
    else {
      line(air, [[px, py], [px - Math.cos(a) * (5 + flash * 5), py - Math.sin(a) * (5 + flash * 5)]], gold(fade * 240), 2.5);
      air.fillColor = cream(fade * 240); air.circle(px, py, 1.8 * fade); air.fill();
    }
  }
}
