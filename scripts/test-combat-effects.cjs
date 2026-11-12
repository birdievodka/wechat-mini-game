const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
class Color { constructor(...args){this.rgba=args;} }
const cache={};
const visualMath=Object.create(Math);visualMath.random=()=>{throw Error('特效不能消耗战斗随机数');};
function load(name){
  if(cache[name])return cache[name];const exports=cache[name]={};
  const source=ts.transpileModule(fs.readFileSync('assets/scripts/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText;
  vm.runInNewContext(source,{exports,require:id=>id==='cc'?{Color}:load(id.replace('./','')),Math:visualMath});return exports;
}
const {CombatParticles,FX_LIMITS}=load('combat-particles'),{CombatEffects,drawSwordTrail}=load('combat-effects'),{WEAPONS}=load('weapons');
const pool=new CombatParticles(),identities=[...pool.slots];
for(let i=0;i<1000;i++)pool.emit(10,20,0,100,.3,4,1);
assert.equal(pool.active,FX_LIMITS.burstTokens,'普通粒子限频，不能每弹无限喷发');
for(let i=0;i<1000;i++)pool.emit(10,20,Math.PI/2,100,.5,5,5,'petal',2);
assert.equal(pool.active,FX_LIMITS.particles,'高优先级可以使用预留空间，但不能扩容');
assert.ok(pool.slots.slice(FX_LIMITS.normalParticles).some(p=>p.priority>=2&&p.life>0));
const positions=JSON.stringify(pool.slots);pool.update(0);assert.equal(JSON.stringify(pool.slots),positions);
pool.update(.1);assert.ok(pool.slots.some(p=>p.life>0&&p.y>20));pool.update(2);assert.equal(pool.active,0,'粒子自然回收');
for(let i=0;i<pool.slots.length;i++)assert.equal(pool.slots[i],identities[i],'复用原始槽位');
pool.clear();assert.equal(pool.active,0);
console.log('通过：普通发射预算/技能预留、固定280槽、不推进时冻结、运动/寿命回收与对象复用');

function drawing(){
  const calls=[];const g={calls};
  for(const name of ['clear','moveTo','lineTo','bezierCurveTo','close','fill','stroke','ellipse','circle'])g[name]=(...args)=>{
    for(const value of args)assert.ok(Number.isFinite(value),name+' must draw finite coordinates');
    calls.push([name,...args]);
  };return g;
}
for(const weapon of WEAPONS){
  const fx=new CombatEffects(),ground=drawing(),air=drawing();
  fx.hit(weapon.id,150,40,.3,false);fx.muzzle(weapon.id,0,20,.3);
  if(weapon.category==='melee')fx.slash(weapon.id,0,20,.3,weapon.range,weapon.arc);
  if(weapon.area)fx.burst(weapon.id,150,40,weapon.area);
  if(weapon.id==='thunder'||weapon.id==='gourd')fx.beam(weapon.id,0,20,150,40);
  fx.update(.055);fx.draw(ground,air,0,0,667,375);
  if(weapon.id==='sword')drawSwordTrail(air,.3,150,2);
  else if(weapon.category!=='melee')fx.flight(air,weapon.id,100,40,.3);
  assert.ok(air.calls.length>10,weapon.id+' has visible effects');
  const active=fx.particles.active,stamps=JSON.stringify(fx.stamps);fx.draw(drawing(),drawing(),0,0,667,375);
  assert.equal(fx.particles.active,active);assert.equal(JSON.stringify(fx.stamps),stamps,'绘制不能推进时间');
  const off=drawing();fx.draw(drawing(),off,99999,99999,667,375);assert.equal(off.calls.length,0,'屏幕外粒子不绘制');
  fx.clear();assert.equal(fx.particles.active,0);assert.ok(fx.stamps.every(s=>s.age>=s.duration));
}
const signatures=[];
for(const hero of ['liubei','guanyu','zhangfei']){
  const fx=new CombatEffects();fx.hero(hero,0,0,Math.PI/4,hero==='guanyu'?520:260);fx.update(.12);
  const ground=drawing(),air=drawing();fx.draw(ground,air,0,0,667,375);
  assert.ok(ground.calls.some(c=>c[0]==='stroke'||c[0]==='fill')&&air.calls.some(c=>c[0]==='fill'),'技能有地面和空中表现');signatures.push(JSON.stringify([ground.calls,air.calls]));
  // Even when six guns are busy, ordinary stamps cannot overwrite the hero cast.
  for(let i=0;i<500;i++)fx.muzzle('smg',0,0,0);
  assert.ok(fx.stamps.some(s=>s.kind==='hero'&&s.age<s.duration&&s.id===hero));
  fx.update(2);assert.equal(fx.particles.active,0);assert.ok(fx.stamps.every(s=>s.age>=s.duration));
}
assert.equal(new Set(signatures).size,3,'三位英雄技能不能只换颜色');
const crossing=new CombatEffects(),edge=drawing();crossing.beam('thunder',900,0,600,0);crossing.draw(drawing(),edge,0,0,667,375);
assert.ok(edge.calls.length>0,'雷链源点屏外、终点屏内时仍显示进入屏幕的电弧');
console.log('通过：11武器出手/飞行/命中与三英雄独立技能绘制、屏外裁剪、暂停只读绘制、技能不被枪火覆盖、结束清理');
