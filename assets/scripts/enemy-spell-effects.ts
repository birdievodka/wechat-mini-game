import { Color, Graphics } from 'cc';
import * as brush from './vfx-brush';
import {material,pixel} from './vfx-materials';

export const LIGHTNING_AFTERGLOW = .55;
interface LightningVisual { x: number; y: number; radius: number; age: number; delay: number; fired: boolean; }
type Point = [number, number];
const TAU = Math.PI * 2;
const PALETTE=['#ffc241','#fff8cf','#ae3f20'].map(hex=>Array.from({length:33},(_,i)=>{const c=new Color(hex);c.a=Math.round(i*255/32);return c;}));
const cached=(i:number,a:number)=>PALETTE[i][Math.max(0,Math.min(32,Math.round(a*32/255)))];
const gold=(a:number)=>cached(0,a),cream=(a:number)=>cached(1,a),red=(a:number)=>cached(2,a);

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
    material(air,'lightning',x,y+35,38,80,0,p*.35,1);
    pixel(ground,'rune',x,y,r*1.53,0,.66*p,p,1);
    const pulse = .5 + .5 * Math.sin(p * Math.PI * 6);
    ground.fillColor = red(22+p*30); ground.circle(x, y, r); ground.fill();
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
  if(z.fired&&z.age-z.delay<.29)pixel(air,'lightning',x,y,r*1.75,0,.65*(1-(z.age-z.delay)/.29),(z.age-z.delay)/.29,1);

  const t=Math.max(0,z.age-z.delay),progress=Math.min(1,t/LIGHTNING_AFTERGLOW),fade=1-progress;
  brush.bolt(ground,air,x,y,r,progress,'gold');
  for(let i=0;i<4;i++){const a=i*TAU/4+.14,d=14+progress*r*.7;talisman(air,x+Math.cos(a)*d,y+Math.sin(a)*d+Math.sin(progress*Math.PI)*18,a+progress*3,.6*fade+.2,fade*220);}
}
