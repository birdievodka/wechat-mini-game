/** 移动向量限长，避免斜向移动快于直线。 */
export function movement(x: number, y: number): { x: number; y: number } {
  const length = Math.sqrt(x * x + y * y);
  const divisor = Math.max(1, length);
  return { x: x / divisor, y: y / divisor };
}

/** Enemy body overlapping the visible melee sector, including blade/range edges. */
export function sectorHitsCircle(dx:number,dy:number,radius:number,angle:number,arcDegrees:number,bodyRadius:number):boolean {
  const d=Math.hypot(dx,dy);if(d>radius+bodyRadius)return false;if(d<=bodyRadius)return true;
  const delta=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)));
  const half=arcDegrees*Math.PI/360;if(delta<=half)return true;
  const cosine=Math.cos(delta-half),along=Math.max(0,Math.min(radius,d*cosine));
  return d*d+along*along-2*d*along*cosine<=bodyRadius*bodyRadius+1e-8;
}
/** 连续挥击线段与敌人圆相交，避免低帧率穿过目标而漏判。 */
export function sweptHit(ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, radius: number): boolean {
  const dx = bx - ax, dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / length));
  return (ax + t * dx - cx) ** 2 + (ay + t * dy - cy) ** 2 <= radius * radius;
}

/** 线段进入椭圆的最早时刻；无交点返回 null，支持相对运动检测。 */
export function sweepEllipseTime(ax: number, ay: number, bx: number, by: number,
  rx: number, ry: number): number | null {
  const x = ax / rx, y = ay / ry, dx = (bx - ax) / rx, dy = (by - ay) / ry;
  const c = x * x + y * y - 1;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a < 1e-12) return null;
  const b = 2 * (x * dx + y * dy), discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
