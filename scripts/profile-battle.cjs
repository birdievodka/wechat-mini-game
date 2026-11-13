// Deterministic CPU/drawing-command pressure fixture. Not GPU FPS or phone gameplay.
const {performance}=require('node:perf_hooks'),fs=require('node:fs');
const {newGame,Graphics,Node,load}=require('./test-campaign.cjs');
async function run(){
 const report={scope:'Node/Cocos stub CPU fixture; drawing calls counted, no GPU or iOS FPS claim',scenarios:[]};
 for(const [name,ids]of [['six-swords',Array(6).fill('sword')],['six-guns',Array(6).fill('smg')],['mixed',['rocket','shotgun','sword','peach','thunder','gourd']],['chronicle-mixed',['halberd','repeater','oil-jar','bagua','star-lamps','wood-ox']]]){
  const g=await newGame();g.clearBattle();g.run.wave=2;g.nextSupply=Infinity;g.spawnClock=99999;g.hurtPlayer=()=>{};g.run.chapter=name==='chronicle-mixed'?17:1;
  g.run.weapons=ids.map((id,i)=>({id,tier:4,uid:i+1}));g.run.inventory={A02:4,D05:3,D09:3,D10:3};g.refreshStats();g.syncWeapons();
  for(let i=0;i<80;i++){const d=load('chronicles').CHRONICLE_ENEMIES[i%40];const e=name==='chronicle-mixed'?g.spawnNext(i===0?'chief':d.kind,i===0?undefined:d.id):g.spawnNext(i===0?'chief':i%5===0?'cavalry':i%4===0?'spearman':'soldier');const a=i*2.39996,rad=100+(i%8)*27;e.x=Math.cos(a)*rad;e.y=Math.sin(a)*rad;e.hp=e.maxHp=1e9;e.born=0;e.node.setPosition(e.x,e.y);}
  for(let i=0;i<100;i++)g.dropCoin(600+i%10*10,180+Math.floor(i/10)*10);
  const calls={clear:0,fill:0,stroke:0,reorder:0};const originals={};
  for(const key of ['clear','fill','stroke']){originals[key]=Graphics.prototype[key];Graphics.prototype[key]=function(...args){calls[key]++;return originals[key].apply(this,args);};}
  originals.reorder=Node.prototype.setSiblingIndex;Node.prototype.setSiblingIndex=function(...args){calls.reorder++;return originals.reorder.apply(this,args);};
  const times=[];let peakProjectiles=0;
  try{for(let f=0;f<480;f++){if(f%120===0){g.skillCharge=999;g.castSkill();}const t=performance.now();g.update(1/60);if(f>=120)times.push(performance.now()-t);peakProjectiles=Math.max(peakProjectiles,g.projectiles.filter(p=>p.remaining>0).length);}}
  finally{for(const key of ['clear','fill','stroke'])Graphics.prototype[key]=originals[key];Node.prototype.setSiblingIndex=originals.reorder;}
  times.sort((a,b)=>a-b);const row={name,frames:480,medianMs:+times[Math.floor(times.length*.5)].toFixed(3),p95Ms:+times[Math.floor(times.length*.95)].toFixed(3),calls,peakProjectiles,enemyNodes:g.enemies.length,coinNodes:g.coins.length};report.scenarios.push(row);console.log(row);g.onDestroy();
 }
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
