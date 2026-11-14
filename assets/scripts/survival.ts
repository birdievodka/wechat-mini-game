import {signatureEffectText} from './hero-growth';
import {chapterFor,chapterInflation} from './chronicles';
import {EXTRA_WEAPONS} from './extra-weapons';
import { PASSIVE_ITEMS, eligiblePassive, passivePreview, passiveBonuses } from './passive-items';
import { Run, heroMaxHearts, ITEMS, randomSample, weaponStatsFor, WARMUP_GOLD_BUDGET } from './campaign';
import { WEAPONS, WEAPON_LIMIT, Tier, weaponFor, weaponOffer, parseWeaponOffer, TIER_NAMES, weaponEffectText } from './weapons';

export const SURVIVAL_VERSION = 'stage-v9.2.1-training-hit';
export const SUPPLY_SECONDS = 30;
export const MAJOR_SECONDS = 90;
export const BOSS_EVERY_WAVES=3;
export const EARLY_SECOND_WEAPON_CHANCE=.8;
export const bossDue=(wavesCleared:number):boolean=>wavesCleared>0&&wavesCleared%BOSS_EVERY_WAVES===0;
export function unlockedWeapons(seconds:number,run?:Run){if(run?.challenge)return WEAPONS.filter(w=>run.unlockedWeaponIds?.includes(w.id));return WEAPONS.filter(w=>(!EXTRA_WEAPONS.some(e=>e.id===w.id)||!!run&&(w.id===run.starter||EXTRA_WEAPONS.find(e=>e.id===w.id)!.unlock<run.chapter))&&!(['sword','thunder'].indexOf(w.id)>=0&&seconds<30)&&!(['rocket','gourd'].indexOf(w.id)>=0&&seconds<60));}
export const clockText = (seconds: number): string => `${Math.floor(seconds / 60) < 10 ? '0' : ''}${Math.floor(seconds / 60)}:${('0' + Math.floor(seconds % 60)).slice(-2)}`;
export const spawnBudget = (seconds: number): number => Math.min(7.5, 2.5 * 1.16 ** (seconds / 60));
export const enemyCost = (kind: string): number => kind === 'chief' ? 20 : kind === 'cavalry' ? 2.5 : kind === 'spearman' ? 1.25 : 1;
export const basePrice = (run: Run): number => Math.round(28 * chapterInflation(run.chapter));
export interface Augment { id: string; name: string; desc: string; icon: string; needs?: string[]; }
export const AUGMENTS: Augment[] = [
  { id: 'ricochet', name: '鞋来！', desc: '草鞋命中后弹射两次\n弹射伤害为原伤害60%', icon: 'range', needs: ['sandal'] },
  { id: 'pole-mastery', name: '一担挑天下', desc: '扁担横扫角度+25°\n击退强度+30%', icon: 'range', needs: ['pole'] },
  { id: 'chain-peach', name: '桃园连环炸', desc: '桃花枝击杀追加桃花爆炸\n造成该次伤害60%，不连锁', icon: 'area', needs: ['peach'] },
  { id: 'all-in', name: '俺全都要', desc: '装满六武器时\n伤害+25% · 攻速+15%', icon: 'power' },
  { id: 'specialist', name: '祖传独门绝活', desc: '同名武器达到3把\n该武器伤害+30%、击退+20%', icon: 'power' },
  { id: 'last-heart', name: '最后一口气', desc: '仅剩一颗心时\n伤害+35% · 移速+12%', icon: 'crit' },
  { id: 'big-bang', name: '桃园放大器', desc: '爆炸半径+30%\n范围武器伤害+20%', icon: 'area', needs: ['peach', 'firecracker', 'rocket','oil-jar','thunder-bomb','bagua'] },
  { id: 'drummer', name: '战鼓擂起来', desc: '所有武器攻速+40%\n攻击速度加法叠加', icon: 'haste' },
  { id: 'rich', name: '财神上身', desc: '金币收入+30%\n吸钱范围+60', icon: 'coin' },
];
export interface SupplyCard { id: string; title: string; desc: string; price: number; tag: string; icon: string; weapon?: { id: typeof WEAPONS[number]['id']; tier: Tier }; from?: Tier; major: boolean; }
export function supplyCard(run: Run, id: string): SupplyCard {
  const w = parseWeaponOffer(id), upgrade = id.startsWith('u:') ? run.weapons.find(w => w.uid === Number(id.split(':')[1])) : undefined;
  if(id.startsWith('u:')&&!upgrade&&run.purchasedOffers.indexOf(id)>=0)return {id,title:'武器升阶',desc:'该升阶已购买',price:run.offerPrices[id],tag:'已购入',icon:'power',major:false};
  if (w || upgrade) {
    const weapon = w || { id: upgrade!.id, tier: Number(id.split(':')[2]) as Tier }, stats = weaponStatsFor(run, {...weapon,signature:upgrade?.signature}), d = weaponFor(weapon.id);
    // 升阶卡的 from 是本件当前品级，商店据此展示“旧 → 新”而不是只有目标品级。
    const next = Number(id.split(':')[2]), from = upgrade && next > 1 && next <= 4 ? (next - 1) as Tier : undefined;
    return { id, title: upgrade ? `${d.name} · ${upgrade.signature?'本命':''}升阶` : d.name, desc: `伤害 ${Math.round(stats.damage * 10) / 10} · ${stats.interval.toFixed(2)}秒\n${upgrade?.signature&&(run.growth||0)>0?signatureEffectText(run.heroId,run.growth||0):weaponEffectText(weapon.id,stats)}`, price: run.offerPrices[id] ?? 28, tag: TIER_NAMES[weapon.tier - 1], icon: 'power', weapon, from, major: false };
  }
  if (id === 'r:power' || id === 'r:speed') return { id, title: id === 'r:power' ? '磨刀不误工' : '小步快跑', desc: id === 'r:power' ? '增加基础武器伤害\n可重复购买，收益递减' : '增加移动速度\n可重复购买，收益递减', price: run.offerPrices[id] ?? 12, tag: '基础修炼', icon: id === 'r:power' ? 'power' : 'speed', major: false };
  const aug = AUGMENTS.find(a => id === 'a:' + a.id), item = ITEMS.find(i => i.id === id);
  return { id, title: aug?.name || item?.name || '', desc: aug?.desc || (item && item.id !== 'bun' ? passivePreview(run.inventory, id) : item?.desc) || '', price: run.offerPrices[id] ?? 0,
    tag: aug ? '天命强化 · 本局唯一' : id === 'bun' ? '恢复 · 消耗品' : '道具 · 自动生效', icon: aug?.icon || ({ insole: 'speed', blossom: 'area', headband: 'haste', pot: 'power', purse: 'coin', book: 'xp', chili: 'power', bun: 'hp', drum: 'haste', cape: 'range', jade: 'crit', butcher: 'power', reach: 'range', powder: 'area', wood: 'power', focus: 'power', training: 'power' } as Record<string, string>)[id] || 'power', major: !!aug };
}
const owns = (run: Run, ids: string[]): boolean => run.weapons.some(w => (ids.indexOf(w.id) >= 0));
export function eligibleItem(run: Run, id: string): boolean {
  if (id === 'bun') return run.hearts < heroMaxHearts(run) && run.survivalSeconds - run.lastHealAt >= 60;
  if(run.challenge&&!run.unlockedPassiveIds?.includes(id))return false;
  if (id === 'D15' && !(run.inventory.D04 || run.augments.indexOf('ricochet')>=0)) return false;
  return PASSIVE_ITEMS.some(i => i.id === id) && eligiblePassive(id,run.weapons);
}
// The discount only applies to the first refresh of each supply visit.
export const refreshPrice = (run: Run): number => run.challenge ? Math.max(1,Math.min(20,5+3*run.rerolls)-(run.rerolls===0?Math.max(0,5-passiveBonuses(run.inventory).refresh):0)) : run.rerolls === 0 ? passiveBonuses(run.inventory).refresh : 5 + 3 * run.rerolls;
export function supplyWeaponPrice(run: Run, id: string, tier: Tier): number {
  const d = weaponFor(id as typeof WEAPONS[number]['id']);
  if(run.challenge)return Math.max(1,Math.round(Math.max(20,d.price)*[1,1.6,2.5,4][tier-1]*(1-passiveBonuses(run.inventory).discount)));
  return Math.max(1,Math.round(basePrice(run) * (d.starter||id===run.starter ? 1 : d.price / 28) * [1,1.6,2.5,4][tier-1] * (1-passiveBonuses(run.inventory).discount)));
}
export function upgradeOffer(w: {uid:number;tier:Tier}): string { return `u:${w.uid}:${w.tier+1}`; }
export function repairSupply(run: Run): void {
  run.offers = run.offers.map(id => {
    if (run.purchasedOffers.indexOf(id) >= 0) return id;
    if (!id.startsWith('u:')) return id;
    const [,uid,tier] = id.split(':'), w = run.weapons.find(w=>w.uid===Number(uid));
    if (w && Number(tier) === w.tier+1 && w.tier<4) return id;
    const replacement = ['A01','A02','C01'].find(v=>run.offers.indexOf(v)<0) || 'A01';
    run.offerPrices[replacement]=Math.min(12,basePrice(run));return replacement;
  });
}
export function rollSupply(run: Run, random = Math.random): void {
  if(run.challenge){rollStageSupply(run,random);return;}
  const price = basePrice(run), cards: string[] = [], prices: Record<string, number> = {};
  const add = (id: string, cost: number): void => { if (!(cards.indexOf(id) >= 0)) { cards.push(id); prices[id] = cost; } };
  const addWeapon=():void=>{
    const seconds=run.survivalSeconds;const distributions=[[.7,.3,0,0],[.35,.55,.1,0],[.15,.55,.28,.02],[.05,.35,.5,.1],[0,.2,.55,.25],[0,.1,.5,.4]];let roll=random(),tier:Tier=1;if(run.chapter===1)tier=seconds<30?1:random()<(seconds<60?.25:.5)?2:1;else{const chance=distributions[chapterFor(run.chapter).volume-1];for(let i=0;i<4;i++){roll-=chance[i];if(roll<=0){tier=(i+1) as Tier;break;}}}
    const purchases=unlockedWeapons(seconds,run).filter(def=>run.supplyMode!=='departure'||supplyWeaponPrice(run,def.id,1)<=WARMUP_GOLD_BUDGET).map(def=>({id:weaponOffer(def.id,tier),weapon:def.id,tier}));
    const upgrades=run.weapons.filter(w=>w.tier<4).map(w=>({id:upgradeOffer(w),weapon:w.id,tier:(w.tier+1) as Tier}));
    const candidates=(run.weapons.length===WEAPON_LIMIT?[...upgrades,...purchases]:purchases).filter(c=>cards.indexOf(c.id)<0);
    const matching=candidates.filter(c=>c.id.startsWith('u:')||owns(run,[c.weapon]));
    const ownedCategories=run.weapons.map(w=>weaponFor(w.id).category),sameFamily=candidates.filter(c=>ownedCategories.indexOf(weaponFor(c.weapon).category)>=0),newPool=candidates.filter(c=>EXTRA_WEAPONS.some(d=>d.id===c.weapon&&d.unlock===run.chapter-1)),r=random();const pool=r<.4&&matching.length?matching:r<.75&&sameFamily.length?sameFamily:r<.95&&newPool.length?newPool:candidates,choice=pool[Math.floor(random()*pool.length)];
    if(choice)add(choice.id,supplyWeaponPrice(run,choice.weapon,choice.tier));
  };
  if (run.supplyMode === 'departure') {
    const def=run.rerolls===0?weaponFor(run.starter):randomSample(WEAPONS.filter(w=>w.starter),1,random)[0];
    add(weaponOffer(def.id,1),supplyWeaponPrice(run,def.id,1));
  } else if (run.supplyMode === 'major') {
    const eligible = AUGMENTS.filter(a => !(run.augments.indexOf(a.id) >= 0) && (!a.needs || owns(run, a.needs)) && (a.id !== 'all-in' || run.weapons.length >= 4) && (a.id !== 'specialist' || run.weapons.some(w => run.weapons.filter(v => v.id === w.id).length >= 2)));
    randomSample(eligible, 3, random).forEach(a => add('a:' + a.id, Math.round(price * (a.id === 'last-heart' || a.id === 'rich' ? 1.5 : 2))));
  }
  if (run.supplyMode === 'normal' || cards.length < 3) {
    if(run.supplyMode==='normal')addWeapon();
    if(run.supplyMode!=='major'&&cards.length<2&&(run.supplyMode==='departure'||random()<(chapterFor(run.chapter).volume===1?EARLY_SECOND_WEAPON_CHANCE:.5)))addWeapon();
    const pool = ITEMS.filter(i => i.id !== 'training' && eligibleItem(run, i.id));
    if (run.hearts <= 2 && eligibleItem(run, 'bun') && cards.length < 3) add('bun', Math.round(price * 1.8));
    for (const item of randomSample(pool, pool.length, random)) {
      if (cards.length >= 3) break;
      add(item.id, Math.round(price * (item.id === 'bun' ? 1.8 * (1-passiveBonuses(run.inventory).healDiscount) : (PASSIVE_ITEMS.find(v=>v.id===item.id)?.price || 1))));
    }
    if (cards.length < 3) {
      for (const id of ['A01', 'A02', 'C01']) { if (cards.length >= 3) break; add(id, price); }
    }
  }
  // An affordable attack choice prevents a low-income run from entering an economic dead end.
  if (!cards.some(id => prices[id] <= run.gold)) {
    const id = 'A01'; if (cards.indexOf(id) < 0) cards[2] = id; prices[id] = Math.min(price, Math.max(1, Math.min(12, run.gold)));
  }
  run.offers = cards.slice(0, 3); run.offerPrices = prices; run.locked = []; run.purchasedOffers = [];
}
export function canBuySupply(run: Run, id: string): boolean {
  if (run.purchasedOffers.indexOf(id) >= 0 || !(run.offers.indexOf(id) >= 0) || run.offerPrices[id] === undefined || run.gold < run.offerPrices[id] && !(parseWeaponOffer(id) && run.weapons.length === 6 && run.weapons.some(w=>run.gold+Math.floor((w.invested||15)*passiveBonuses(run.inventory).refund)>=run.offerPrices[id]))) return false;
  const w = parseWeaponOffer(id);
  if(w&&run.challenge&&!run.unlockedWeaponIds?.includes(w.id))return false;
  if (w) return run.weapons.length < WEAPON_LIMIT || run.weapons.length === WEAPON_LIMIT;
  if (id === 'r:power' || id === 'r:speed') return true;
  if (id.startsWith('u:')) return run.weapons.some(w => w.uid === Number(id.split(':')[1]) && w.tier < 4 && Number(id.split(':')[2]) === w.tier + 1);
  if (id.startsWith('a:')) return AUGMENTS.some(a => id === 'a:' + a.id && !(run.augments.indexOf(a.id) >= 0) && (!a.needs || owns(run, a.needs)));
  return ITEMS.some(i => i.id === id && eligibleItem(run, id));
}
export function buySupply(run: Run, id: string, replaceUid?: number): boolean {
  if (!canBuySupply(run, id)) return false;
  const w = parseWeaponOffer(id), cost = run.offerPrices[id];
  if (w) {
    if (run.weapons.length >= WEAPON_LIMIT) {
      const old = run.weapons.find(v=>v.uid===replaceUid); if (!old) return false;
      const refund = Math.floor((old.invested ?? 15) * passiveBonuses(run.inventory).refund);
      if (run.gold + refund < cost) return false;
      run.gold += refund; run.weapons = run.weapons.filter(v=>v.uid!==replaceUid);
    }
    run.weapons.push({ ...w, invested: cost, uid: run.nextWeaponUid++ });
  }
  else if (id.startsWith('u:')) { const target = run.weapons.find(w => w.uid === Number(id.split(':')[1]))!; target.tier = (target.tier + 1) as Tier; target.invested = (target.invested ?? 15) + cost; }
  else if (id.startsWith('a:')) run.augments.push(id.slice(2));
  else if (id === 'r:power' || id === 'r:speed') run.inventory[id] = (run.inventory[id] || 0) + 1;
  else if (id === 'bun') { run.hearts = Math.min(heroMaxHearts(run), run.hearts + 1); run.lastHealAt = run.survivalSeconds; }
  else { run.inventory[id] = (run.inventory[id] || 0) + 1; run.acquired = [...run.acquired.filter(v => v !== id), id]; }
  run.gold -= cost; run.spent += cost; run.purchasedOffers.push(id); return true;
}
export function rerollSupply(run: Run, random = Math.random): boolean {
  if (run.gold < refreshPrice(run)) return false;
  const price = refreshPrice(run); run.gold -= price; run.spent += price; run.rerolls++; rollSupply(run, random); return true;
}

/** Stage shelves keep four sold slots and enforce the shared content whitelist before weighting. */
export function rollStageSupply(run:Run,random=Math.random):void {
 const cards:string[]=[],prices:Record<string,number>={};const wave=run.supplyMode==='departure'?0:Math.min(4,run.stageWave||1);
 const distribution=[[1,0,0,0],[.7,.3,0,0],[.4,.5,.1,0],[.2,.55,.25,0],[.1,.5,.35,.05]][wave];
 const add=(id:string,price:number)=>{if(cards.includes(id))return false;cards.push(id);prices[id]=Math.max(1,Math.round(price));return true;};
 const tier=():Tier=>{let r=random();for(let i=0;i<4;i++){r-=distribution[i];if(r<=0)return (i+1) as Tier;}return 1;};
 const weapon=()=>{
  const t=tier(),owned=run.weapons.map(w=>w.id),categories=run.weapons.map(w=>weaponFor(w.id).category);
  const pool=unlockedWeapons(0,run).filter(w=>!cards.includes(weaponOffer(w.id,t))),matching=pool.filter(w=>owned.includes(w.id)),family=pool.filter(w=>categories.includes(w.category));
  const fresh=pool.filter(w=>run.newWeaponIds?.includes(w.id)&&categories.includes(w.category));
  const r=random(),choices=wave>0&&cards.length===1&&fresh.length?fresh:r<.5&&matching.length?matching:r<.8&&family.length?family:pool;
  const d=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
  const up=run.weapons.filter(w=>w.tier<4&&!cards.includes(upgradeOffer(w)));
  if(up.length&&wave>0&&(random()<.35||wave===4&&cards.length===0)){const w=up[Math.floor(random()*up.length)];add(upgradeOffer(w),supplyWeaponPrice(run,w.id,(w.tier+1) as Tier)-supplyWeaponPrice(run,w.id,w.tier));}
  else if(d)add(weaponOffer(d.id,t),supplyWeaponPrice(run,d.id,t));
 };
 if(wave===0){add(weaponOffer(run.starter,1),run.rerolls===0?Math.min(28,supplyWeaponPrice(run,run.starter,1)):supplyWeaponPrice(run,run.starter,1));const pool=WEAPONS.filter(w=>['sandal','pole','cleaver'].includes(w.id)&&w.id!==run.starter);const w=pool[Math.floor(random()*pool.length)];add(weaponOffer(w.id,1),Math.min(28,supplyWeaponPrice(run,w.id,1)));}
 else {weapon();weapon();}
 const eligible=ITEMS.filter(i=>i.id!=='bun'&&eligibleItem(run,i.id));
 if(wave===3){const pool=AUGMENTS.filter(a=>!run.augments.includes(a.id)&&(!a.needs||owns(run,a.needs))&&(a.id!=='all-in'||run.weapons.length>=4)&&(a.id!=='specialist'||run.weapons.some(w=>run.weapons.filter(v=>v.id===w.id).length>=2)));const a=pool[Math.floor(random()*pool.length)];if(a)add('a:'+a.id,48);}
 if(run.hearts<heroMaxHearts(run)&&(run.hearts<=2||(run.healMisses||0)>=2)&&eligibleItem(run,'bun'))add('bun',28);
 for(const item of randomSample(eligible,eligible.length,random)){if(cards.length>=4)break;add(item.id,Math.max(12,Math.min(32,Math.round(item.price*16))));}
 // Initial pool always contains three affordable general passives; fallback never unlocks new content.
 for(const id of ['A01','A02','C01']){if(cards.length>=4)break;if(eligibleItem(run,id))add(id,12);}
 if(!cards.some(id=>prices[id]<=run.gold)&&run.gold>0){const slot=cards.length-1;cards[slot]='A01';prices.A01=Math.min(12,run.gold);}
 run.offers=cards.slice(0,4);run.offerPrices=prices;run.locked=[];run.purchasedOffers=[];
}
