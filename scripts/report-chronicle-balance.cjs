// Seeded shop/kill-rate model: no claimed human win rate. Uses real prices, eligibility, transactions and DPS.
const fs=require('fs');const {load}=require('./test-campaign.cjs');const c=load('chronicles'),r=load('campaign'),s=load('survival'),w=load('weapons'),p=load('passive-items');
let seed=104729;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const dps=run=>run.weapons.reduce((n,q)=>n+r.weaponDps(run,q),0);
function shop(run){let purchases=0;const combine=()=>{for(let j=0;j<6;j++){let done=false;for(const q of [...run.weapons])if(r.combineWeapon(run,q.uid)){done=true;break;}if(!done)break;}};combine();
 for(let visit=0;visit<3;visit++){if(visit){if(run.gold<s.refreshPrice(run)+20)break;s.rerollSupply(run,random);}else s.rollSupply(run,random);
  for(let n=0;n<3;n++){let best,score=-Infinity;for(const id of run.offers){if(!s.canBuySupply(run,id))continue;const old=JSON.stringify(run),before=dps(run);let replacement;if(id.startsWith('w:')&&run.weapons.length>=6)replacement=run.weapons.slice().sort((a,b)=>r.weaponDps(run,a)-r.weaponDps(run,b))[0].uid;const copy=JSON.parse(old);if(!s.buySupply(copy,id,replacement))continue;const gain=dps(copy)-before,weapon=w.parseWeaponOffer(id),candidate=(gain+(weapon&&run.weapons.length<6?14:0)+(id==='bun'&&run.hearts<=2?40:0))/Math.max(1,run.offerPrices[id]);if(candidate>score){score=candidate;best={id,replacement};}}
   if(!best||score<=.005)break;if(s.buySupply(run,best.id,best.replacement)){purchases++;combine();s.repairSupply(run);} }
 }return purchases;}
function income(chapter,stage,killRate,seconds=30,boss=false){let budget=seconds*c.chapterThreat(chapter,stage,boss),gold=0;while(budget>1){const id=c.pickChapterEnemy(chapter,stage,boss,{},random),d=c.archetypeFor(id);budget-=d.cost;if(random()<killRate)gold+=d.coins;}return gold;}
const results=[];for(let i=0;i<150;i++){
 const hero=r.HEROES[i%5],run=r.createRun(hero.id);run.gold=28;run.supplyMode='departure';shop(run);
 const grant=base=>{const mult=1+p.passiveBonuses(run.inventory).income+(run.augments.includes('rich')?.3:0);run.gold+=Math.floor(base*mult);};
 for(let chapter=1;chapter<=c.CHAPTERS.length;chapter++){
  run.chapter=chapter;
  // Later zero segments spawn about nine regular arrivals; no second departure store.
  if(chapter>1){let gold=0;for(let n=0;n<9;n++){const id=c.pickChapterEnemy(chapter,0,false,{},random);if(random()<.65)gold+=c.archetypeFor(id).coins;}grant(gold);}
  for(let stage=1;stage<=3;stage++){grant(income(chapter,stage,.65));const stipend=r.statsFor(run).stipend+run.economyRemainder,paid=Math.floor(stipend);run.economyRemainder=stipend-paid;run.gold+=Math.round(12*Math.sqrt(c.chapterInflation(chapter)))+paid;run.survivalSeconds+=30;run.supplyMode='normal';run.rerolls=0;shop(run);}
  const power=dps(run)*.65,ttk=c.chapterFor(chapter).bossHp/power;
  results.push({seed:i,hero:hero.id,chapter,power,ttk,gold:run.gold,tiers:run.weapons.map(q=>q.tier)});
  grant(Math.round(35*c.chapterInflation(chapter))+income(chapter,3,.65,Math.min(90,ttk),true));run.survivalSeconds+=ttk;
  if(chapter<c.CHAPTERS.length){run.chapter=chapter+1;run.supplyMode='normal';run.rerolls=0;shop(run);}
 }
}

const percentile=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];const byChapter=c.CHAPTERS.map(ch=>{const a=results.filter(r=>r.chapter===ch.id);return {chapter:ch.id,boss:ch.boss,effectiveDpsMedian:Math.round(percentile(a.map(r=>r.power),.5)),bossSecondsP10:+percentile(a.map(r=>r.ttk),.1).toFixed(1),bossSecondsMedian:+percentile(a.map(r=>r.ttk),.5).toFixed(1),bossSecondsP90:+percentile(a.map(r=>r.ttk),.9).toFixed(1)};});
const report={version:s.SURVIVAL_VERSION,kind:'shop-output model, not combat survival or iOS performance',runs:150,killRate:.65,hitEfficiency:.65,policy:'all shops use normal shelf (including pre-Boss toggle), at most two rerolls; real transactions, next-chapter prices/unlocks, income passives, free merges, highest output gain per coin',limitations:'no incoming damage or survival simulation; 65% kill/hit assumptions; independent budget draws approximate alive/charge caps; later warmup models nine arrivals; Boss reinforcement income capped at 90s; no skill burst in DPS; does not model Boss summon costs or target diversion',byChapter};fs.writeFileSync(process.argv[2]||'docs/chronicle-balance.json',JSON.stringify(report,null,2)+'\n');console.table(byChapter);
