import { PASSIVE_ITEMS, passiveBonuses, amount } from './passive-items';
import { WEAPONS, WEAPON_LIMIT, WeaponId, EquippedWeapon, Tier, WeaponStats, weaponFor, starterFor, calculateWeapon, weaponOffer, parseWeaponOffer, weaponPrice, rollWeaponTier } from './weapons';
/** Pure campaign rules. All percentages are additive fractions (0.10 = +10%). */
export type HeroId = 'liubei' | 'guanyu' | 'zhangfei';
export type EnemyKind = 'soldier' | 'spearman' | 'cavalry' | 'chief';
export type Phase = 'loading' | 'menu' | 'battle' | 'upgrade' | 'shop' | 'victory' | 'defeat';
export interface Bonus { hp: number; power: number; melee: number; ranged: number; magic: number; damage: number; haste: number; speed: number; armor: number; crit: number; range: number; regen: number; pickup: number; xp: number; stipend: number; area: number; }
export interface Hero { id: HeroId; name: string; title: string; desc: string; hp: number; speed: number; color: string; }
export const HEROES: Hero[] = [
  { id: 'liubei', name: '刘备', title: '仁义老大', desc: '拾取范围 +15%\n武器击退 +20%\n所有武器皆可上手', hp: 5, speed: 235, color: '#73904b' },
  { id: 'guanyu', name: '关羽', title: '扁担武圣', desc: '近战伤害 +10%\n近战距离 +15%\n推荐扁担 / 杀猪尖刀', hp: 5, speed: 230, color: '#3c854d' },
  { id: 'zhangfei', name: '张飞', title: '莽撞屠夫', desc: '近战伤害 +10%\n爆炸半径 +15%\n推荐杀猪尖刀 / 桃花', hp: 5, speed: 225, color: '#824277' },
];
export interface Item { id: string; name: string; price: number; desc: string; bonus: Partial<Bonus>; slot: 'head' | 'waist' | 'back' | 'feet'; }
export const ITEMS: Item[] = [...PASSIVE_ITEMS, { id: 'bun', name: '热乎肉包', price: 50, desc: '立即恢复一颗心\n每60秒限购一次', bonus: {}, slot: 'waist' }];
export interface Run { wavesCleared:number; bossEncounter:boolean; survivalSeconds: number; supplyCount: number; supplyMode: 'departure' | 'normal' | 'major'; purchasedOffers: string[]; lastHealAt: number; hearts: number; augments: string[]; economyRemainder: number; weapons: EquippedWeapon[]; starter: WeaponId; nextWeaponUid: number; locked: string[]; offerPrices: Record<string, number>; heroId: HeroId; wave: number; gold: number; level: number; xp: number; pending: number; bonus: Bonus; inventory: Record<string, number>; acquired: string[]; rerolls: number; offers: string[]; spent: number; }
export interface Stats { maxHp: number; damage: number; interval: number; speed: number; armor: number; crit: number; range: number; regen: number; pickup: number; xp: number; stipend: number; area: number; }
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
export const emptyBonus = (): Bonus => ({ hp: 0, power: 0, melee: 0, ranged: 0, magic: 0, damage: 0, haste: 0, speed: 0, armor: 0, crit: 0, range: 0, regen: 0, pickup: 0, xp: 0, stipend: 0, area: 0 });
export function createRun(heroId: HeroId, starter: WeaponId = starterFor(heroId)): Run { return { wavesCleared:0,bossEncounter:false,survivalSeconds: 0, supplyCount: 0, supplyMode: 'departure', purchasedOffers: [], lastHealAt: -60, hearts: 5, augments: [], economyRemainder: 0, weapons: [{ uid: 1, id: starter, tier: 1, invested: 15 }], starter, nextWeaponUid: 2, locked: [], offerPrices: {}, heroId, wave: 1, gold: 0, level: 1, xp: 0, pending: 0, bonus: emptyBonus(), inventory: {}, acquired: [], rerolls: 0, offers: [], spent: 0 }; }
export const heroFor = (run: Run): Hero => HEROES.find(h => h.id === run.heroId)!;
export function totalBonus(run: Run): Bonus {
  const b = { ...run.bonus };
  const p = passiveBonuses(run.inventory);
  b.damage += p.damage; b.haste += p.haste; b.crit += p.crit; b.power += p.power; b.speed += p.speed; b.pickup += p.pickup; b.stipend += p.stipend; b.area += p.area;
  b.damage += (run.level - 1) * .03;
  b.damage += .06 * Math.log2(1 + (run.inventory.training || 0));
  if ((run.augments.indexOf('all-in') >= 0) && run.weapons.length === 6) { b.damage += .25; b.haste += .15; }
  if ((run.augments.indexOf('last-heart') >= 0) && run.hearts === 1) { b.damage += .35; b.speed += .12; }
  if ((run.augments.indexOf('drummer') >= 0)) b.haste += .4;
  if ((run.augments.indexOf('rich') >= 0)) b.pickup += 60;
  b.power += 2 * Math.log2(1 + (run.inventory['r:power'] || 0));
  b.speed += .02 * Math.log2(1 + (run.inventory['r:speed'] || 0));
  if (run.heroId === 'zhangfei') b.area += .15;
  for (const category of ['melee', 'ranged', 'magic'] as const) b[category] += Math.floor(run.weapons.filter(w => weaponFor(w.id).category === category).length / 2);
  return b;
}
export const weaponStatsFor = (run: Run, weapon: Pick<EquippedWeapon, 'id' | 'tier'>): WeaponStats => {
  const bonus=totalBonus(run),s = calculateWeapon(weapon, bonus, run.heroId), category = weaponFor(weapon.id).category;
  if (run.heroId === 'liubei') s.knockback *= 1.2;
  if (run.heroId === 'guanyu' && category === 'melee') { s.damage *= 1.1; s.range *= 1.15; }
  if (run.heroId === 'zhangfei' && category === 'melee') s.damage *= 1.1;
  const p = passiveBonuses(run.inventory);
  if(category==='ranged') {
    const crit=s.crit+p.rangedCrit;
    s.damage=(s.damage+p.rangedPower*Math.max(.15,Math.min(1.5,weaponFor(weapon.id).interval/.8))/(weapon.id==='shotgun'?5:1))*(1+p.rangedDamage+Math.max(0,crit-.8)*.5);
    s.crit=Math.min(.8,crit);s.critMultiplier+=p.rangedCritDamage;s.knockback*=p.rangedKnockback;
  }
  if (weapon.id === 'sandal') { s.damage *= 1 + p.sandal; const extra=run.augments.indexOf('ricochet')>=0?2:0;const bounce=(s.bounce||0)+p.bounce+extra;s.bounce=Math.min(3,bounce);s.damage*=1+Math.max(0,bounce-3)*.1; }
  if (weapon.id === 'sandal') { s.damage*=1+p.sandalBoost;s.speed*=p.sandalSpeed; }
  if (weapon.id === 'peach') { s.damage *= 1 + p.peach; s.speed *= 1+amount(run.inventory,'F03',.1); }
  if (weapon.id === 'smg') { s.speed *= 1+amount(run.inventory,'F05',.1); }
  if (weapon.id === 'sword') { s.damage *= 1 + p.sword; const blades=(s.shotCount||3)+p.split;s.shotCount=Math.min(6,blades);s.damage*=1+Math.max(0,blades-6)*.06; }
  if (weapon.id === 'rocket') { s.damage*=1+p.rocketDamage;s.speed*=p.rocketSpeed; }
  if (weapon.id === 'shotgun') { s.damage*=1+p.shotgunDamage;s.range*=p.shotgunRange; }
  if (weapon.id === 'smg') { s.pierce+=p.smgPierce;s.damage*=1+p.smgPierceDamage; }
  s.knockback *= p.knockback;
  if (category === 'melee') { s.range *= p.meleeRange; s.arc = Math.min(220, s.arc + p.arc); }
  else { s.range *= p.rangedRange; s.speed *= p.shotSpeed; s.pierce += s.area > 0 ? 0 : p.pierce; }
  s.critMultiplier += p.critDamage; s.bounceFactor = weapon.id==='sandal'?p.bounceFactor:Math.min(1,.6+Math.max(0,(run.inventory.D04||0)-3)*.05); s.split = weapon.id === 'sword' ? p.split : 0; s.splitFactor = p.splitFactor;
  s.pierceFactor = Math.min(1,(.7+Math.max(0,(run.inventory.D03||0)-3)*.05+p.pierceDamage)+(category==='melee'?0:p.pierceRetention)); s.splashFactor = p.splash; s.spread = ['smg','shotgun'].indexOf(weapon.id)>=0?p.spread:1;
  const extraHaste=(category==='ranged'?p.rangedHaste:0)+(weapon.id==='pole'?p.poleHaste:weapon.id==='smg'?p.smgHaste:0);
  s.interval=weaponFor(weapon.id).interval*[1,.96,.92,.88][weapon.tier-1]/(1+Math.max(-.4,bonus.haste+extraHaste));
  s.interval=Math.max(weapon.id==='smg'?.06:.08,s.interval);
  if(weapon.id==='thunder')s.chainTargets=Math.min(8,(s.chainTargets||3)+p.thunderTargets);
  if(weapon.id==='pole'&&run.augments.indexOf('pole-mastery')>=0){s.arc=Math.min(220,s.arc+25);s.knockback*=1.3;}
  if(weapon.id==='sword'){s.range=Math.min(250,s.range);s.orbitSpeed=Math.min(10.5,4.2*Math.sqrt(.5/s.interval)*s.speed/580*p.homing);s.homing=0;s.split=0;}
  if ((run.augments.indexOf('specialist') >= 0) && run.weapons.filter(w => w.id === weapon.id).length >= 3) { s.damage *= 1.3; s.knockback *= 1.2; }
  if ((run.augments.indexOf('big-bang') >= 0) && s.area > 0) { s.area *= 1.3; s.damage *= 1.2; }
  return s;
};
/** Per-target sustained ceiling; crowd damage and skill bursts are separate budgets. */
export function weaponDps(run:Run,weapon:Pick<EquippedWeapon,'id'|'tier'>):number {
  const s=weaponStatsFor(run,weapon),hits=weapon.id==='shotgun'?4:weapon.id==='gourd'?(s.pulses||6):1;
  return s.damage/s.interval*hits*(1+s.crit*(s.critMultiplier-1));
}
export function statsFor(run: Run): Stats {
  const h = heroFor(run), b = totalBonus(run), w = weaponStatsFor(run, run.weapons[0]);
  return { maxHp: 5, damage: w.damage,
    interval: w.interval, speed: h.speed * (1 + clamp(b.speed, -.25, .5)), armor: 0, crit: clamp(.05 + b.crit, 0, .8),
    range: w.range, regen: 0, pickup: clamp((240 + b.pickup) * (run.heroId === 'liubei' ? 1.15 : 1), 240, 360), xp: clamp(b.xp, 0, .75), stipend: b.stipend, area: w.area };
}
export const xpNeeded = (level: number): number => 10 + 5 * (level - 1);
export function gainXp(run: Run, base: number): number {
  if (run.level >= 30) { run.xp += base; const coins = Math.floor(run.xp / 10); run.gold += coins; run.xp -= coins * 10; return 0; }
  run.xp += base * (1 + statsFor(run).xp); let gained = 0;
  while (run.level < 30 && run.xp + 1e-8 >= xpNeeded(run.level)) { run.xp -= xpNeeded(run.level); run.level++; gained++; }
  run.pending = 0; run.xp = Math.max(0, run.xp); return gained;
}
// Same armor curve and regeneration-point units as Brotato; round only at impact.
export const regenPerSecond = (points: number): number => points > 0 ? (points + 1.25) / 11.25 : 0;
export const damageTaken = (raw: number, armor: number): number => {
  const a = clamp(armor, -15, 30), multiplier = a >= 0 ? 15 / (15 + a) : 2 - 15 / (15 - a);
  return Math.max(1, Math.round(raw * multiplier));
};
export const priceFor = (item: Item, wave: number): number => Math.ceil(item.price * (1 + .08 * (wave - 1)) - 1e-8);
export const rerollPrice = (run: Run): number => 3 + 2 * run.rerolls;
export function randomSample<T>(list: T[], count: number, random = Math.random): T[] {
  const pool = [...list], result: T[] = [];
  while (pool.length && result.length < count) result.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return result;
}
export function offerPrice(run: Run, id: string): number {
  if (run.offerPrices[id] !== undefined) return run.offerPrices[id];
  const w = parseWeaponOffer(id), item = ITEMS.find(v => v.id === id);
  return w ? weaponPrice(w.id, w.tier, run.wave) : item ? priceFor(item, run.wave) : 0;
}
export function rollShop(run: Run, random = Math.random): void {
  const kept = run.offers.filter(id => id && (run.locked.indexOf(id) >= 0));
  const prices: Record<string, number> = {}; for (const id of kept) prices[id] = offerPrice(run, id);
  const offers = Array.from({ length: 4 }, (_, i) => kept.indexOf(run.offers[i]) >= 0 ? run.offers[i] : '');
  const guarantee = run.wave <= 2 ? 2 : run.wave <= 5 ? 1 : 0;
  for (let slot = 0; slot < 4; slot++) {
    if (offers[slot]) continue;
    const wantWeapon = offers.filter(id => parseWeaponOffer(id)).length < guarantee || random() < .45;
    const items = ITEMS.filter(i => (run.inventory[i.id] || 0) < 3 && offers.indexOf(i.id) < 0);
    let id: string;
    if (wantWeapon || !items.length) {
      const tier = rollWeaponTier(run.wave, random), owned = [...new Set(run.weapons.map(w => w.id))];
      const eligible = WEAPONS.filter(w => offers.indexOf(weaponOffer(w.id, tier)) < 0);
      const matching = eligible.filter(w => owned.indexOf(w.id) >= 0);
      const pool = matching.length && random() < .5 ? matching : eligible;
      id = weaponOffer(pool[Math.floor(random() * pool.length)].id, tier);
    } else id = items[Math.floor(random() * items.length)].id;
    offers[slot] = id;
    const w = parseWeaponOffer(id); prices[id] = w ? weaponPrice(w.id, w.tier, run.wave) : priceFor(ITEMS.find(v => v.id === id)!, run.wave);
  }
  run.offers = offers; run.offerPrices = prices; run.locked = kept;
}
export function matchingWeapon(run: Run, id: WeaponId, tier: Tier, except = -1): EquippedWeapon | undefined {
  return tier < 4 ? run.weapons.find(w => w.id === id && w.tier === tier && w.uid !== except) : undefined;
}
export function canBuyOffer(run: Run, id: string): boolean {
  if (!id || run.offers.indexOf(id) < 0 || run.gold < offerPrice(run, id)) return false;
  const w = parseWeaponOffer(id);
  return w ? run.weapons.length < WEAPON_LIMIT || !!matchingWeapon(run, w.id, w.tier) : ITEMS.some(i => i.id === id) && (run.inventory[id] || 0) < 3;
}
export function buyItem(run: Run, id: string): boolean {
  if (!canBuyOffer(run, id)) return false;
  const price = offerPrice(run, id), weapon = parseWeaponOffer(id);
  if (weapon) {
    if (run.weapons.length >= WEAPON_LIMIT) matchingWeapon(run, weapon.id, weapon.tier)!.tier = (weapon.tier + 1) as Tier;
    else run.weapons.push({ ...weapon, invested: price, uid: run.nextWeaponUid++ });
  } else {
    run.inventory[id] = (run.inventory[id] || 0) + 1;
    run.acquired = run.acquired.filter(i => i !== id); run.acquired.push(id);
  }
  run.gold -= price; run.spent += price; run.offers[run.offers.indexOf(id)] = '';
  run.locked = run.locked.filter(v => v !== id); delete run.offerPrices[id]; return true;
}
export function combineWeapon(run: Run, uid: number): boolean {
  const w = run.weapons.find(v => v.uid === uid); if (!w) return false;
  const match = matchingWeapon(run, w.id, w.tier, uid); if (!match) return false;
  w.invested = (w.invested || 0) + (match.invested || 0); w.tier = (w.tier + 1) as Tier; run.weapons = run.weapons.filter(v => v.uid !== match.uid); return true;
}
export function recycleValue(run: Run, uid: number): number {
  const w = run.weapons.find(v => v.uid === uid); return w ? Math.floor((w.invested || 15) * passiveBonuses(run.inventory).refund) : 0;
}
export function recycleWeapon(run: Run, uid: number): boolean {
  if (run.weapons.length <= 1 || !run.weapons.some(w => w.uid === uid)) return false;
  run.gold += recycleValue(run, uid); run.weapons = run.weapons.filter(w => w.uid !== uid); return true;
}
export function toggleOfferLock(run: Run, id: string): boolean {
  if (!id || run.offers.indexOf(id) < 0) return false;
  run.locked = (run.locked.indexOf(id) >= 0) ? run.locked.filter(v => v !== id) : [...run.locked, id]; return true;
}
export function rerollShop(run: Run, random = Math.random): boolean {
  const price = rerollPrice(run); if (run.gold < price || run.offers.filter(id => id && (run.locked.indexOf(id) >= 0)).length >= 4) return false;
  run.gold -= price; run.spent += price; run.rerolls++; rollShop(run, random); return true;
}
export interface Upgrade { key: keyof Bonus; name: string; amount: number; cap: number; desc: string; }
const UPGRADES: Upgrade[] = [
  { key: 'hp', name: '壮胆', amount: 3, cap: 100, desc: '生命上限' },
  { key: 'melee', name: '刀工', amount: 1, cap: 30, desc: '近战伤害' },
  { key: 'ranged', name: '准头', amount: 1, cap: 30, desc: '远程伤害' },
  { key: 'magic', name: '道行', amount: 1, cap: 30, desc: '法术伤害' },
  { key: 'power', name: '巧劲', amount: 1, cap: 30, desc: '武器伤害' },
  { key: 'damage', name: '手劲', amount: .05, cap: 2, desc: '伤害' },
  { key: 'haste', name: '手速', amount: .05, cap: 1.5, desc: '攻速' },
  { key: 'speed', name: '脚底抹油', amount: .03, cap: .5, desc: '移速' },
  { key: 'armor', name: '皮糙肉厚', amount: 1, cap: 30, desc: '护甲' },
  { key: 'crit', name: '眼疾手快', amount: .03, cap: .6, desc: '暴击' },
  { key: 'range', name: '伸长胳膊', amount: 15, cap: 240, desc: '射程' },
  { key: 'regen', name: '调息', amount: 2, cap: 20, desc: '生命再生' },
  { key: 'pickup', name: '招财手', amount: 25, cap: 240, desc: '拾取范围' },
  { key: 'area', name: '火力开花', amount: .15, cap: .8, desc: '爆炸范围' },
];
export function availableUpgrades(run: Run): Upgrade[] {
  const b = totalBonus(run), h = heroFor(run);
  const base: Partial<Bonus> = { hp: h.hp + run.level - 1, crit: .05, range: 0, pickup: 90 };
  // Resolve queued rewards in earned order, so hoarded levels do not all become high-tier.
  const earnedLevel = run.level - Math.max(0, run.pending - 1);
  const tier = earnedLevel >= 10 ? 2 : earnedLevel >= 5 ? 1 : 0;
  const tiers: Partial<Record<keyof Bonus, number[]>> = { hp: [3, 6, 9], power: [1, 2, 3], damage: [.05, .08, .12], haste: [.05, .1, .15], speed: [.03, .06, .09], armor: [1, 2, 3], crit: [.03, .05, .07], range: [15, 30, 45], regen: [2, 3, 4] };
  return UPGRADES.filter(u => (u.key !== 'area' || run.weapons.some(w => weaponFor(w.id).area > 0)) && (!(['melee', 'ranged', 'magic'].indexOf(u.key) >= 0) || run.weapons.some(w => weaponFor(w.id).category === u.key))).map(u => ({ ...u,
    amount: Math.min(tiers[u.key]?.[tier] ?? u.amount, u.cap - (b[u.key] + (base[u.key] || 0))) })).filter(u => u.amount > .00001);
}
export function chooseUpgrade(run: Run, key: keyof Bonus): boolean {
  const u = availableUpgrades(run).find(v => v.key === key); if (!u || run.pending <= 0) return false;
  run.bonus[u.key] += u.amount; run.pending--; return true;
}
export function upgradeText(u: Upgrade): string { return `${u.desc} +${['damage', 'haste', 'speed', 'crit', 'area'].indexOf(u.key) >= 0 ? Math.round(u.amount * 100) + '%' : Number(u.amount.toFixed(2))}`; }
export const WAVE_NAMES = ['桃园热身', '黄巾三波'];
export const WAVE_SECONDS = 20;
export const waveRule = (wave: number): { interval: number; cap: number; initial: number } => ({ interval: wave === 1 ? 1.6 : 1 / 1.4, cap: wave === 1 ? 12 : 80, initial: wave === 1 ? 3 : 8 });
export function enemyKind(wave: number, random = Math.random, seconds = 0): EnemyKind {
  if (wave === 1) return 'soldier';
  const r = random(), cavalry = Math.min(.30,.10+seconds/900), spear = Math.min(.40,.25+seconds/1800);
  return r < cavalry ? 'cavalry' : r < cavalry + spear ? 'spearman' : 'soldier';
}
export function enemyStats(kind: EnemyKind, wave: number, seconds = 0): { hp: number; speed: number; damage: number; xp: number; coins: number } {
  const m = Math.max(0, seconds) / 60, scale = wave === 1 ? 1 : 1.28 ** Math.min(m, 8) * 1.35 ** Math.max(0, m - 8);
  const b = kind === 'chief' ? [4200, 62, 20, 32] : kind === 'cavalry' ? [110, 118, 4, 4] : kind === 'spearman' ? [22, 94, 2, 2] : [wave === 1 ? 6 : 24, wave === 1 ? 86 : 108, 1, 1];
  return { hp: Math.round(b[0] * scale), speed: Math.min(kind === 'chief' ? 70 : 130, b[1] * (1 + Math.min(m, 10) * .025)), damage: 1, xp: b[2], coins: b[3] };
}
export const stipendFor = (run: Run): number => run.wave === 1 ? 30 : 12;
export const waveOutcome = (wave: number, seconds: number, hp: number, chiefDead: boolean): 'battle' | 'clear' | 'victory' | 'defeat' => hp <= 0 ? 'defeat' : wave === 1 && seconds <= 0 ? 'clear' : 'battle';
