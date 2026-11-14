const assert=require('node:assert/strict');
const {newGame,load,cc,click}=require('./test-campaign.cjs'),C=load('campaign'),P=load('stage-progress'),D=load('stage-data'),A=load('chronicles');
const find=(n,name)=>n.name===name?n:n.children.map(c=>find(c,name)).find(Boolean),all=n=>[n,...n.children.flatMap(all)];
(async()=>{
 const g=await newGame();g.clearBattle();
 // Twelve hearts remain in one row, within the widened card; pause follows its edge.
 for(const hero of ['liubei','guanyu','zhangfei'])for(let n=0;n<=6;n++){
  g.run=C.createRun(hero);g.run.growth=n;g.playerHp=C.heroMaxHearts(g.run);const points=[],old=g.playerBar.moveTo;g.playerBar.moveTo=(x,y)=>points.push({x,y});g.drawPlayerHealth();g.playerBar.moveTo=old;
  assert.equal(points.length,C.heroMaxHearts(g.run));assert.equal(new Set(points.map(p=>p.y)).size,1,'爱心不换行');assert.ok(points.every(p=>p.x+16<g.statusWidth));assert.equal(g.coinLabel.node.position.y,-88);assert.equal(g.pauseLabel.node.parent.position.x,-g.halfWidth+32+g.statusWidth+40);
 }
 // First clear for this hero still shows all concrete rewards when another hero unlocked them.
 for(const shared of [false,true]){
  g.clearBattle();g.profile=P.newProfile();if(shared)P.recordClear(g.profile,'zhangfei',1,200,50,5);
  g.run=C.createStageRun(g.profile,'liubei',1,'sandal','G03');g.playerHp=5;g.run.elapsed=196;g.kills=323;g.endStage(true);
  assert.ok(find(g.screens.root,'ClearLandscape'));assert.ok(find(g.screens.root,'ClearHeartReward').getComponent(cc.Label).string.includes('5 → 6'));
  for(const kind of ['weapons','passives','skills'])for(const id of D.STAGES[0].firstClear[kind])assert.ok(find(g.screens.root,'Reward-'+id),'已共享也展示实际图标');
  assert.equal(all(g.screens.root).filter(n=>n.name==='RewardNew').length,shared?0:14);
  click(g.screens.root,'Reward-peach');assert.ok(find(g.screens.root,'RewardDetails'));click(g.screens.root,'RewardDetailsClose');
  click(g.screens.root,'StageClearNext');assert.equal(g.phase,'menu');
 }
 g.profile=P.newProfile();P.recordClear(g.profile,'liubei',1,200,100,5);g.run=C.createStageRun(g.profile,'liubei',1,'sandal','G03');g.playerHp=6;g.run.elapsed=196;g.endStage(true);assert.ok(!find(g.screens.root,'ClearHeartReward').getComponent(cc.Label).string.includes('→'));assert.equal(all(g.screens.root).filter(n=>n.name==='RewardNew').length,0);assert.ok(find(g.screens.root,'ClearGrowthFeature').getComponent(cc.Label).string.includes('重复'));
 // Locked telegraph and the real shorter halberd hit, rather than just changing its description.
 const setup=(id,px,py)=>{g.clearBattle();g.run=C.createRun('liubei');g.run.wave=2;g.phase='battle';g.playerHp=5;g.hurtTime=g.protectionTime=0;g.px=px;g.py=py;const d=A.archetypeFor(id),e=g.spawnNext(d.kind,id);Object.assign(e,{born:0,x:0,y:0,attack:0,attackAngle:0,attackCooldown:999,vx:0,vy:0,speed:0,fired:false,hp:1e6});return e;};
 for(const [x,y,hit]of [[100,0,true],[140,0,false],[20,95,false],[-50,0,false]]){const e=setup('E08',x,y);g.updateChronicleEnemy(e,.79);assert.equal(g.playerHp,5);g.updateChronicleEnemy(e,.02);assert.equal(g.playerHp,hit?4:5);g.hurtTime=0;g.updateChronicleEnemy(e,.2);assert.equal(g.playerHp,hit?4:5);}
 const e=setup('E08',100,0);g.updateChronicleEnemy(e,.3);g.px=170;g.updateChronicleEnemy(e,.52);assert.equal(g.playerHp,5,'诱导抬手后后撤可脱离');assert.equal(e.attackAngle,0);assert.equal(e.x,0,'抬手/横扫不追踪');g.updateChronicleEnemy(e,.45);assert.ok(e.attack>=0,'给收招留时间');g.updateChronicleEnemy(e,.06);assert.equal(e.attack,-1);assert.ok(e.attackCooldown>=1.4);
 const knife=setup('E02',200,0);g.updateChronicleEnemy(knife,A.archetypeFor('E02').windup+.01);assert.equal(knife.x,18,'短刀前跨不再额外跳35');
 assert.equal(A.archetypeFor('E03').range,105);assert.equal(A.archetypeFor('E07').range,95);
 // Officer uses shorter, narrower, slower locked triple thrust with time to punish.
 g.clearBattle();g.run=C.createRun('liubei');g.run.challenge=true;g.run.chapter=3;g.phase='battle';g.px=140;g.py=0;g.playerHp=5;g.hurtTime=g.protectionTime=0;const mini=g.spawnNext('soldier','E08');Object.assign(mini,{born:0,x:0,y:0,miniBoss:true,attack:-1,miniTime:0,miniPhase:0,vx:0,vy:0});g.updateChronicleEnemy(mini,0);assert.equal(g.enemyZones.length,3);assert.ok(g.enemyZones.every(z=>z.length===150&&z.radius===18));g.px=200;g.updateEnemyZones(1);assert.equal(g.playerHp,5,'连刺锁定后走出射程不受伤');
 // Real spawner: archers appear from wave 1; total cost/count limits remain intact.
 for(let stage=1;stage<=6;stage++)for(let wave=1;wave<=5;wave++)assert.ok(D.STAGE_WAVE_ROSTERS[stage-1][wave-1].every(id=>D.stageFor(stage).roster.includes(id)));
 let shots=0;for(let i=0;i<10000;i++)if(D.pickStageUnit(['E01','E11'],(i+.5)/10000)==='E11')shots++;assert.ok(shots>5900&&shots<6100);
 g.clearBattle();g.run.challenge=true;g.run.chapter=1;g.run.stageWave=1;for(let i=0;i<160;i++)g.spawnStageEnemy();const live=g.enemies.filter(e=>e.hp>0);assert.ok(live.some(e=>e.archetype==='E11'));assert.ok(live.length<=26);assert.ok(live.reduce((v,e)=>v+A.archetypeFor(e.archetype).cost,0)<=22);
 g.onDestroy();console.log('通过：5–12心单行/状态卡与暂停避让/首通共享两态具体奖励/新标差集/成长+心/戟兵真实缩距锁向收招可拉扯/短刀前跨/窄距三连刺/首波弓兵与6关30波预算');
})().catch(e=>{console.error(e);process.exitCode=1;});
