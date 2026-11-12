const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
const cache = {};
function load(name) {
  if (cache[name]) return cache[name]; const exports = cache[name] = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`assets/scripts/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText, { exports, require: id => load(id.replace('./', '')), Math }); return exports;
}
const r = load('campaign'), w = load('weapons');
let seed = 42; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
for (const hero of r.HEROES) for (const starter of w.WEAPONS.filter(v => v.starter)) {
  const run = r.createRun(hero.id, starter.id);
  assert.equal(run.weapons.length, 1); assert.equal(run.weapons[0].id, starter.id); assert.equal(run.weapons[0].tier, 1);
  let last;
  for (let tier = 1; tier <= 4; tier++) {
    const current = r.weaponStatsFor(run, { id: starter.id, tier });
    assert.ok(current.damage > 0 && current.interval > 0);
    if (last) { assert.ok(current.damage > last.damage); assert.ok(current.interval < last.interval); assert.ok(current.range > last.range); }
    last = current;
  }
}
assert.equal(r.weaponStatsFor(r.createRun('guanyu'), { id: 'pole', tier: 1 }).damage, 35.2);
assert.equal(r.weaponStatsFor(r.createRun('zhangfei', 'cleaver'), { id: 'cleaver', tier: 1 }).damage, 19.8);
console.log('通过：9种人物/初始武器组合、品质单调成长、人物分类属性与武器解耦');
const run = r.createRun('liubei'); run.gold = 9999;
const buy = (id, tier) => { const key = w.weaponOffer(id, tier); run.offers = [key]; run.offerPrices = {}; return r.buyItem(run, key); };
assert.ok(buy('sandal', 1)); assert.equal(run.weapons.length, 2, 'buying a duplicate before full capacity does not force a merge');
const goldBeforeMerge = run.gold; assert.ok(r.combineWeapon(run, 1)); assert.equal(run.gold, goldBeforeMerge); assert.equal(run.weapons.length, 1); assert.equal(run.weapons[0].tier, 2);
assert.equal(r.combineWeapon(run, 1), false); assert.equal(r.recycleWeapon(run, 1), false, 'cannot recycle the last weapon');
for (const id of ['pole', 'peach', 'cleaver', 'smg', 'firecracker']) assert.ok(buy(id, 1));
assert.equal(run.weapons.length, 6);
let before = JSON.stringify(run); run.offers = ['w:sandal:1']; run.offerPrices = {}; before = JSON.stringify(run);
assert.equal(r.buyItem(run, 'w:sandal:1'), false); assert.equal(JSON.stringify(run), before, 'full mismatched tier is a no-op');
assert.ok(buy('pole', 1)); assert.equal(run.weapons.length, 6); assert.equal(run.weapons.find(v => v.id === 'pole').tier, 2);
assert.ok(buy('pole', 2)); assert.ok(buy('pole', 3)); assert.equal(run.weapons.find(v => v.id === 'pole').tier, 4);
run.offers = ['w:pole:4']; before = JSON.stringify(run); assert.equal(r.buyItem(run, 'w:pole:4'), false); assert.equal(JSON.stringify(run), before);
const recycled = run.weapons.find(v => v.id === 'smg'), refund = r.recycleValue(run, recycled.uid), gold = run.gold;
assert.ok(r.recycleWeapon(run, recycled.uid)); assert.equal(run.gold, gold + refund); assert.equal(run.weapons.length, 5);
assert.equal(r.recycleWeapon(run, recycled.uid), false, 'same transaction cannot refund twice');
const duplicate = w.weaponOffer('smg', 1); run.offers = [duplicate]; assert.ok(r.buyItem(run, duplicate)); before = run.gold; assert.equal(r.buyItem(run, duplicate), false); assert.equal(run.gold, before);
console.log('通过：六槽上限、空位不强制合成、免费合成、满槽自动合成、不跨阶/不超红、回收退款/最后一件保护、重复购买不扣款');
for (let wave = 1; wave <= 8; wave++) for (let iteration = 0; iteration < 120; iteration++) {
  const shop = r.createRun('liubei'); shop.wave = wave; r.rollShop(shop, random);
  assert.equal(shop.offers.length, 4); assert.equal(new Set(shop.offers).size, 4);
  const weapons = shop.offers.map(w.parseWeaponOffer).filter(Boolean);
  if (wave <= 2) assert.ok(weapons.length >= 2); else if (wave <= 5) assert.ok(weapons.length >= 1);
  if (wave === 1) assert.ok(weapons.every(v => v.tier === 1));
  if (wave < 3) assert.ok(weapons.every(v => v.tier < 3));
  if (wave < 5) assert.ok(weapons.every(v => v.tier < 4));
}
const shop = r.createRun('liubei'); shop.gold = 9999; r.rollShop(shop, random);
const locked = shop.offers[2], price = r.offerPrice(shop, locked); assert.ok(r.toggleOfferLock(shop, locked));
assert.ok(r.rerollShop(shop, random)); assert.equal(shop.offers[2], locked, 'a locked offer retains its exact slot'); assert.equal(r.offerPrice(shop, locked), price);
shop.wave = 5; shop.rerolls = 0; r.rollShop(shop, random); assert.equal(shop.offers[2], locked, 'a locked offer retains its exact slot'); assert.equal(r.offerPrice(shop, locked), price, 'locked prices survive wave inflation');
for (const key of shop.offers) if (!shop.locked.includes(key)) r.toggleOfferLock(shop, key);
before = JSON.stringify(shop); assert.equal(r.rerollShop(shop), false); assert.equal(JSON.stringify(shop), before, 'all locked cannot charge a reroll');
assert.ok(r.buyItem(shop, locked)); assert.ok(!shop.locked.includes(locked)); assert.ok(!shop.offers.includes(locked));
const sets = r.createRun('liubei', 'cleaver'); sets.weapons.push({ id: 'pole', tier: 4, uid: 2 }); assert.equal(r.totalBonus(sets).melee, 1, 'quality does not multiply set count');
assert.ok(r.availableUpgrades(sets).some(v => v.key === 'melee')); assert.ok(!r.availableUpgrades(sets).some(v => v.key === 'magic'));
sets.weapons.push({ id: 'peach', tier: 1, uid: 3 }); assert.ok(r.availableUpgrades(sets).some(v => v.key === 'area'));
console.log('通过：960轮商店武器保底/品质解锁/无重复、锁定跨刷新跨关保价、全锁免扣款、购买解锁、套装计数与升级筛选');

const balances=r.createRun('liubei');const unbuffed=r.weaponStatsFor(balances,{id:'smg',tier:1});balances.bonus.ranged=10;const buffed=r.weaponStatsFor(balances,{id:'smg',tier:1});assert.ok(buffed.damage-unbuffed.damage<=2.01,'flat category damage scales by firing frequency');
balances.bonus.ranged=0;balances.inventory={A02:1,D10:1,F05:1};assert.ok(Math.abs(r.weaponStatsFor(balances,{id:'smg',tier:1}).interval-.16/1.45)<1e-9,'attack-speed sources add instead of multiplying');
for(const seconds of [0,60,180,300,600]){
  const kinds={soldier:0,spearman:0,cavalry:0};for(let i=0;i<10000;i++)kinds[r.enemyKind(2,()=>i/10000,seconds)]++;
  assert.ok(kinds.spearman>=2500&&kinds.cavalry>=1000);if(seconds>=180)assert.ok(kinds.spearman+kinds.cavalry>=6500);
  assert.ok(r.enemyStats('cavalry',2,seconds).hp>=r.enemyStats('soldier',2,seconds).hp*4);
  assert.ok(r.enemyStats('chief',2,seconds).hp>r.enemyStats('cavalry',2,seconds).hp*25);
}
assert.equal(r.enemyKind(1,()=>0,600),'soldier');assert.equal(r.enemyStats('soldier',1,600).hp,6);
const formation=r.createRun('liubei');formation.inventory.D05=99;formation.inventory.D08=10;const blades=r.weaponStatsFor(formation,{id:'sword',tier:1});assert.equal(blades.shotCount,6);assert.equal(blades.homing,0);assert.equal(blades.split,0);assert.ok(blades.orbitSpeed<=10.5);
console.log('通过：机关枪固定加成按攻频折算/攻速加法、弓骑比例逐步增加、骑兵四倍步兵生命/首领耐久、热身独立、剑阵数量/转速边界');

for(const def of w.WEAPONS){
 const baseline=r.createRun('liubei',def.id);let previous=0;
 for(let tier=1;tier<=4;tier++){
  const dps=r.weaponDps(baseline,{id:def.id,tier}),s=r.weaponStatsFor(baseline,{id:def.id,tier});
  assert.ok(Number.isFinite(dps)&&dps>previous,'every quality must improve sustained damage without relying on multi-target estimates');previous=dps;
  assert.ok(s.shotCount<=8&&(s.chainTargets||0)<=8&&(s.pulses||0)<=9,'bounded projectile/target/pulse growth');
 }
}
assert.equal(w.starterFor('guanyu'),'pole');assert.equal(w.starterFor('zhangfei'),'cleaver');assert.equal(w.weaponFor('peach').starter,false);
for(let i=0;i<500;i++){
 const run=r.createRun('guanyu');run.supplyMode='normal';run.survivalSeconds=i;run.supplyCount=Math.floor(i/30);load('survival').rollSupply(run,random);
 for(const id of run.offers)assert.ok(!/beans|rollingpin|bean-rain/.test(id),'retired weapons and augment never return to shop');
}
console.log('通过：11武器全部四品级持续伤害单调成长/弹数目标段数有界、三英雄默认武器和桃花商店定位、500轮货架排除绿豆/擀面杖/豆雨');

const survival=load('survival');let twoWeapons=0;
for(let i=0;i<1000;i++){
 const run=r.createRun('liubei');run.supplyMode='normal';run.survivalSeconds=[0,30,60][i%3];run.gold=10000;survival.rollSupply(run,random);
 const weapons=run.offers.filter(id=>w.parseWeaponOffer(id)||id.startsWith('u:'));assert.ok(weapons.length>=1);if(weapons.length===2)twoWeapons++;
}
assert.ok(twoWeapons>730&&twoWeapons<870,'second early weapon is offered about 80% of the time');
for(let i=0;i<100;i++){const run=r.createRun('zhangfei');run.gold=40;survival.rollSupply(run,random);assert.equal(run.offers.filter(w.parseWeaponOffer).length,2);}
assert.ok(!survival.unlockedWeapons(0).some(w=>w.id==='sword'||w.id==='rocket'));assert.ok(survival.unlockedWeapons(30).some(w=>w.id==='sword'));assert.equal(survival.unlockedWeapons(60).length,11);
assert.equal(survival.bossDue(2),false);assert.equal(survival.bossDue(3),true);assert.equal(survival.bossDue(6),true);
console.log('通过：首个商店保证2武器、1000轮前期第二武器概率约80%、30/60秒解锁覆盖全11种、每3波首领节奏');
