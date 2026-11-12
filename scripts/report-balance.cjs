// Reproducible design model: stationary, in-range single-target DPS ceilings.
// This does not claim to simulate aiming, travel, crowd damage or player survival.
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const cache={};
function load(name){
  if(cache[name])return cache[name];const exports=cache[name]={};
  const code=ts.transpileModule(fs.readFileSync(`assets/scripts/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
  vm.runInNewContext(code,{exports,require:id=>load(id.replace('./','')),Math});return exports;
}
const rules=load('campaign'),weapons=load('weapons'),supply=load('survival'),round=n=>Number(n.toFixed(2));
const profiles=[
  {name:'开局一武器',seconds:0,ids:['sandal'],tier:1,level:1,items:{}},
  {name:'第1波后3武器',seconds:30,ids:['sandal','pole','smg'],tier:1,level:3,items:{A01:1,A02:1,D09:1}},
  {name:'张角前6武器',seconds:90,ids:['sandal','pole','smg','shotgun','sword','peach'],tier:2,level:7,items:{A01:2,A02:2,D09:1,D10:1,D11:1,F05:1}},
  {name:'张角前6枪专精',seconds:90,ids:Array(6).fill('smg'),tier:2,level:7,items:{A01:3,A02:3,D09:3,D10:3,D11:2,F05:2,A05:3}},
];
console.log(JSON.stringify({
  version:supply.SURVIVAL_VERSION,
  assumptions:'白/蓝品质，无技能、弹射或多目标收益；霰弹最多4颗同时命中，桃花每轮同敌最多1次，葫芦按各品质段数，剑阵按命中冷却上限。实际输出受走位、分散索敌、穿透及命中率影响。',
  baseWeapons:weapons.WEAPONS.map(w=>{const run=rules.createRun('liubei');return {id:w.id,name:w.name,dps:round(rules.weaponDps(run,{id:w.id,tier:1})),role:w.desc};}),
  evolution:weapons.WEAPONS.map(w=>({id:w.id,name:w.name,tiers:[1,2,3,4].map(tier=>{const run=rules.createRun('liubei',w.id),stats=rules.weaponStatsFor(run,{id:w.id,tier});return {tier,...stats,singleTargetDpsCeiling:round(rules.weaponDps(run,{id:w.id,tier})),effect:weapons.weaponEffectText(w.id,stats)};})})),
  enemyCurve:[0,30,60,90,120,180].map(seconds=>{
    const m=seconds/60,cavalry=Math.min(.3,.1+seconds/900),archer=Math.min(.4,.25+seconds/1800);
    return {seconds,footHp:rules.enemyStats('soldier',2,seconds).hp,archerHp:rules.enemyStats('spearman',2,seconds).hp,cavalryHp:rules.enemyStats('cavalry',2,seconds).hp,bossHp:rules.enemyStats('chief',2,seconds).hp,archerPercent:round(archer*100),cavalryPercent:round(cavalry*100),spawnBudget:round(supply.spawnBudget(seconds))};
  }),
  builds:profiles.map(p=>{
    const run=rules.createRun('liubei');run.level=p.level;run.inventory=p.items;run.weapons=p.ids.map((id,i)=>({id,tier:p.tier,uid:i+1}));
    const dps=run.weapons.reduce((total,w)=>total+rules.weaponDps(run,w),0),bossHp=rules.enemyStats('chief',2,p.seconds).hp;
    return {name:p.name,seconds:p.seconds,gear:run.weapons,items:p.items,dps:round(dps),cavalryFocusSeconds:round(rules.enemyStats('cavalry',2,p.seconds).hp/dps),bossHp,bossFocusSeconds:round(bossHp/dps)};
  }),
},null,2));
