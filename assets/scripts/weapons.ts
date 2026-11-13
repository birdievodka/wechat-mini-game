import { EXTRA_WEAPONS, EXTRA_EVOLUTION, isExtraWeapon, extraEffectText, extraHitFactor } from './extra-weapons';
export type WeaponId = 'sandal' | 'pole' | 'peach' | 'cleaver' | 'firecracker' | 'smg' | 'shotgun' | 'rocket' | 'sword' | 'thunder' | 'gourd' | 'twin-swords' | 'guandao' | 'serpent-spear' | 'halberd' | 'silver-spear' | 'qinggang' | 'yitian' | 'seven-saber' | 'ancient-saber' | 'twin-halberds' | 'trident' | 'caltrops' | 'repeater' | 'phoenix-bow' | 'heavy-crossbow' | 'hand-halberd' | 'chain-hook' | 'oil-jar' | 'thunder-bomb' | 'feather-fan' | 'taiping-book' | 'star-lamps' | 'bagua' | 'wood-ox' | 'wood-kite';
export type WeaponClass = 'melee' | 'ranged' | 'magic';
export type Tier = 1 | 2 | 3 | 4;
export interface EquippedWeapon { uid: number; id: WeaponId; tier: Tier; invested?: number; }
export interface WeaponDefinition { id: WeaponId; name: string; category: WeaponClass; starter: boolean; damage: number; interval: number; range: number; speed: number; knockback: number; area: number; pierce: number; crit: number; critMultiplier: number; arc: number; price: number; desc: string; }
export const WEAPON_LIMIT = 6;
export const TIER_NAMES = ['普通 I', '精良 II', '稀有 III', '传说 IV'];
export const TIER_COLORS = ['#c5c5ad', '#519ec9', '#a46bc2', '#d45a48'];
export const CLASS_NAMES = { melee: '近战', ranged: '远程', magic: '法术' };
export const WEAPONS: WeaponDefinition[] = [
  { id: 'sandal', name: '草鞋', category: 'ranged', starter: true, damage: 16, interval: .6, range: 360, speed: 480, knockback: 290, area: 0, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 12, desc: '飞鞋打脸 · 强力击退' },
  { id: 'pole', name: '扁担', category: 'melee', starter: true, damage: 32, interval: .9, range: 165, speed: 0, knockback: 300, area: 0, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 140, price: 14, desc: '长担横扫 · 重击退敌' },
  { id: 'peach', name: '桃花枝', category: 'magic', starter: false, damage: 26, interval: 1, range: 360, speed: 380, knockback: 180, area: 55, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 16, desc: '桃枝施法 · 单瓣升阶三瓣扇射' },
  { id: 'cleaver', name: '杀猪尖刀', category: 'melee', starter: true, damage: 18, interval: .42, range: 135, speed: 0, knockback: 180, area: 0, pierce: 0, crit: .15, critMultiplier: 2, arc: 90, price: 12, desc: '尖刀快斩 · 双倍暴击' },
  { id: 'firecracker', name: '爆竹', category: 'magic', starter: false, damage: 42, interval: 1.45, range: 390, speed: 340, knockback: 260, area: 100, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 18, desc: '炸响一片 · 大范围爆破' },
  { id: 'smg', name: '桃园突突枪', category: 'ranged', starter: false, damage: 5, interval: .16, range: 400, speed: 1050, knockback: 12, area: 0, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 39, desc: '快速点射 · 轻击退' },
  { id: 'shotgun', name: '村口霰弹枪', category: 'ranged', starter: false, damage: 8, interval: .9, range: 300, speed: 820, knockback: 160, area: 0, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 39, desc: '五发散弹 · 近身破围' },
  { id: 'rocket', name: '二踢脚火箭筒', category: 'ranged', starter: false, damage: 78, interval: 2, range: 500, speed: 420, knockback: 330, area: 125, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 45, desc: '大范围爆炸 · 慢速重击' },
  { id: 'sword', name: '青莲飞剑', category: 'magic', starter: false, damage: 16, interval: .5, range: 150, speed: 580, knockback: 100, area: 0, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 42, desc: '三剑环身 · 旋转接触伤害' },
  { id: 'thunder', name: '五雷符', category: 'magic', starter: false, damage: 46, interval: 1.25, range: 390, speed: 0, knockback: 130, area: 0, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 42, desc: '连锁落雷 · 跳跃三人' },
  { id: 'gourd', name: '吞天葫芦', category: 'magic', starter: false, damage: 5, interval: 1.6, range: 240, speed: 0, knockback: 0, area: 0, pierce: 0, crit: .05, critMultiplier: 1.5, arc: 0, price: 42, desc: '六段吸风 · 轻聚怪' },
];
WEAPONS.push(...EXTRA_WEAPONS);
export const weaponFor = (id: WeaponId): WeaponDefinition => WEAPONS.find(w => w.id === id)!;
export const starterFor = (hero: string): WeaponId => hero === 'zhaoyun' ? 'silver-spear' : hero === 'kongming' ? 'feather-fan' : hero === 'guanyu' ? 'pole' : hero === 'zhangfei' ? 'cleaver' : 'sandal';
export const weaponOffer = (id: WeaponId, tier: Tier): string => `w:${id}:${tier}`;
export function parseWeaponOffer(value: string): { id: WeaponId; tier: Tier } | undefined {
  const parts = value.split(':'), tier = Number(parts[2]);
  return parts.length === 3 && parts[0] === 'w' && WEAPONS.some(w => w.id === parts[1]) && [1, 2, 3, 4].indexOf(tier) >= 0 ? { id: parts[1] as WeaponId, tier: tier as Tier } : undefined;
}
export const weaponPrice = (id: WeaponId, tier: Tier, wave: number): number => Math.ceil(weaponFor(id).price * [1, 1.8, 3.2, 5.5][tier - 1] * (1 + .08 * (wave - 1)) - 1e-8);
export interface WeaponModifiers { power: number; melee: number; ranged: number; magic: number; damage: number; haste: number; range: number; area: number; crit: number; }
export interface WeaponStats { quality?:Tier; damage: number; interval: number; range: number; speed: number; knockback: number; area: number; pierce: number; crit: number; critMultiplier: number; arc: number; shotCount?: number; bounce?: number; bounceFactor?: number; split?: number; splitFactor?: number; pierceFactor?: number; homing?: number; orbitSpeed?: number; splashFactor?: number; spread?: number; chainTargets?:number; pulses?:number; targets?:number; }
type Four = [number,number,number,number];
export interface Evolution { shots?:Four; bounce?:Four; pierce?:Four; arc?:Four; crit?:Four; area?:Four; speed?:Four; knockback?:Four; chain?:Four; pulses?:Four; targets?:Four; }
/** I/II/III/IV patterns. Growth changes coverage, not unlimited repeated damage to one target. */
export const WEAPON_EVOLUTION = {
  sandal:{bounce:[0,1,2,3]},
  pole:{arc:[140,160,180,200],knockback:[1,1.1,1.2,1.35]},
  peach:{shots:[1,3,3,3],area:[55,60,75,90],speed:[1,1.08,1.16,1.25]},
  cleaver:{arc:[90,110,130,150],crit:[0,.03,.06,.1]},
  firecracker:{area:[100,115,130,150]},
  smg:{pierce:[0,1,1,2],speed:[1,1,1.12,1.2]},
  shotgun:{shots:[5,6,7,8]},
  rocket:{area:[125,145,165,185],speed:[1,1.08,1.18,1.3]},
  sword:{shots:[3,4,5,6]},
  thunder:{chain:[3,4,5,6]},
  gourd:{pulses:[6,7,8,9],targets:[6,6,7,8]},
  ...(EXTRA_EVOLUTION as Record<string,Evolution>),
};
const clamp = (n: number, low: number, high: number): number => Math.max(low, Math.min(high, n));
export function calculateWeapon(w: Pick<EquippedWeapon, 'id' | 'tier'>, b: WeaponModifiers, hero: string): WeaponStats {
  const d = weaponFor(w.id), q = w.tier - 1;
  const coefficient=Math.max(.15,Math.min(1.5,d.interval/.8))/(w.id==='shotgun'?5:w.id==='gourd'?6:isExtraWeapon(w.id)?extraHitFactor(w.id,w.tier):1);
  const e:Evolution=(WEAPON_EVOLUTION as Record<WeaponId,Evolution>)[w.id];
  return { damage: Math.max(1, (d.damage * [1, 1.35, 1.8, 2.4][q] + (Math.max(0, b.power) + clamp(b[d.category], 0, 30))*coefficient) * (1 + Math.max(-.75, b.damage))),
    interval: d.interval * [1, .96, .92, .88][q] / (1 + Math.max(-.4, b.haste)),
    range: w.id==='star-lamps'?[160,175,190,210][q]:clamp(d.range + q * 10 + b.range * (d.category === 'melee' ? .5 : 1), d.category === 'melee' ? 70 : w.id==='sword'?100:180, d.category === 'melee' ? 280 : 800),
    quality:w.tier, speed: d.speed*(e.speed?.[q]||1), knockback: d.knockback*(e.knockback?.[q]||1), area: d.area ? (e.area?.[q]||d.area) * (1 + clamp(b.area, 0, .8)) : 0,
    pierce: e.pierce?.[q]??d.pierce, crit: clamp(d.crit + (e.crit?.[q]||0) + b.crit, 0, .8), critMultiplier: d.critMultiplier, arc: e.arc?.[q]??d.arc,
    shotCount:e.shots?.[q]||1,bounce:e.bounce?.[q]||0,chainTargets:e.chain?.[q],pulses:e.pulses?.[q],targets:e.targets?.[q] };
}
export function weaponEffectText(id:WeaponId,s:WeaponStats):string {
  if(isExtraWeapon(id))return extraEffectText(id,s);
  if(id==='sandal')return `投掷1只草鞋 · 弹射${s.bounce||0}次`;
  if(id==='pole')return `${Math.round(s.arc)}°长担横扫 · 强击退`;
  if(id==='peach')return `${s.shotCount}片桃花${s.shotCount!>1?'扇射':''} · 爆散${Math.round(s.area)}\n同轮对同一敌人最多命中1次`;
  if(id==='cleaver')return `${Math.round(s.arc)}°尖刀快斩 · 暴击${Math.round(s.crit*100)}%`;
  if(id==='firecracker'||id==='rocket')return `单发${id==='rocket'?'火箭':'爆竹'} · 爆炸半径${Math.round(s.area)}`;
  if(id==='smg')return `快速点射 · 穿透${s.pierce}人`;
  if(id==='shotgun')return `${s.shotCount}发扇形散弹\n同轮对同一敌人最多命中4颗`;
  if(id==='sword')return `${s.shotCount}剑常驻环绕 · 接触切割`;
  if(id==='thunder')return `连锁落雷 · 最多${s.chainTargets}个目标`;
  return `${s.pulses}段吸风 · 每段最多${s.targets}个目标`;
}
export function rollWeaponTier(wave: number, random = Math.random): Tier {
  const chances = [[1, 0, 0, 0], [.85, .15, 0, 0], [.7, .28, .02, 0], [.55, .38, .07, 0], [.4, .45, .14, .01], [.3, .45, .22, .03], [.2, .45, .28, .07]][Math.min(6, Math.max(0, wave - 1))];
  let v = random(); for (let i = 0; i < 4; i++) { v -= chances[i]; if (v < 0) return (i + 1) as Tier; } return 4;
}
