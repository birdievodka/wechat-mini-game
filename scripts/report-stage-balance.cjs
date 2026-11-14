// Fixed-income shopping model: ignores survival, aim and player skill; never a win-rate claim.
const {load}=require('./test-campaign.cjs'),fs=require('fs');const C=load('campaign'),S=load('survival'),P=load('stage-progress'),D=load('stage-data');

const report={scope:'1080 historical fixed-income shopping routes; wave3 actual income now depends on miniBoss kill time; not an estimate of v8.2 actual income or win rate; 60% weapon DPS utilization, excludes skill bursts',stages:[]};
for(let stage=1;stage<=6;stage++){
 const profile=P.newProfile();for(const h of D.VISIBLE_HERO_IDS)for(let i=1;i<stage;i++)P.recordClear(profile,h,i,260,100,5);
 const rows=[];for(const hero of D.VISIBLE_HERO_IDS)for(const starter of D.STARTER_WEAPONS)for(let seed=1;seed<=20;seed++){
  let n=seed;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};const r=C.createStageRun(profile,hero,stage,starter,'G01');
  for(let wave=1;wave<=4;wave++){
   if(wave)r.gold+=D.stageFor(stage).targetWaveIncome[wave-1];r.stageWave=wave||1;r.supplyMode=wave===3?'major':'normal';S.rollSupply(r,random);
   // Greedily evaluate real transactions; do not pretend random shelves always give the ideal loadout.
   for(let purchase=0;purchase<4;purchase++){
    const before=r.weapons.reduce((s,w)=>s+C.weaponDps(r,w),0);let best,score=0;
    for(const id of r.offers){if(!S.canBuySupply(r,id)||r.gold<r.offerPrices[id])continue;const candidate=JSON.parse(JSON.stringify(r));if(!S.buySupply(candidate,id))continue;const dps=candidate.weapons.reduce((s,w)=>s+C.weaponDps(candidate,w),0),gain=(dps-before)/r.offerPrices[id];if(gain>score){score=gain;best=id;}}
    if(!best)break;S.buySupply(r,best);
   }
  }
  const dps=r.weapons.reduce((s,w)=>s+C.weaponDps(r,w),0);rows.push({hero,starter,seed,weapons:r.weapons.length,gold:r.gold,dps:+dps.toFixed(1),estimatedBossSeconds:+(D.stageFor(stage).bossHp/(dps*.6)).toFixed(1)});
 }
 const sorted=rows.map(r=>r.estimatedBossSeconds).sort((a,b)=>a-b),pick=q=>sorted[Math.floor((sorted.length-1)*q)];report.stages.push({stage,name:D.stageFor(stage).name,routes:rows.length,bossSeconds:{p10:pick(.1),median:pick(.5),p90:pick(.9)},meanWeapons:+(rows.reduce((s,r)=>s+r.weapons,0)/rows.length).toFixed(2)});
}
fs.writeFileSync('docs/stage-challenge-v8/数值模型.json',JSON.stringify(report,null,2)+'\n');console.log(report.stages);
