const assert=require('node:assert/strict');
const {load,cc,GameBootstrap,finishStartup,click,storage}=require('./test-campaign.cjs');
const M=load('yellow-chargers'),{drawYellowCharge}=load('yellow-charge-effects');
const actor=()=>({x:0,y:0,hp:2400,attack:-1,attackAngle:0});
const a=actor(),s=M.createYellowCharge(0);
M.updateYellowCharge(a,s,.31,300,0,800,450,true);assert.equal(s.phase,'windup');const angle=s.angle;
M.updateYellowCharge(a,s,.69,0,300,800,450,true);assert.equal(s.phase,'windup');assert.equal(a.x,0);assert.equal(s.angle,angle,'蓄力后不追踪转向');
M.updateYellowCharge(a,s,.01,0,300,800,450,true);assert.equal(s.phase,'dash');assert.equal(s.released,true);
M.updateYellowCharge(a,s,.48,200,0,800,450,true);assert.ok(Math.abs(a.x-364.8)<.001);assert.equal(a.y,0);assert.equal(s.contact,true,'高速扫掠不能穿过玩家不命中');assert.equal(s.phase,'recover');
M.updateYellowCharge(a,s,.5,200,0,800,450,true);assert.equal(s.contact,false,'一轮冲锋只命中一次');assert.equal(s.phase,'recover');
M.updateYellowCharge(a,s,.61,200,0,800,450,true);assert.equal(s.phase,'hunt');assert.ok(s.cooldown>2,'留出反击窗口');
const held=M.createYellowCharge(1),b=actor();M.updateYellowCharge(b,held,10,250,0,800,450,false);assert.equal(held.phase,'hunt','其他精英蓄力/冲锋期间等待');
const g=new cc.Graphics(),before=JSON.stringify(s);for(const phase of['windup','dash','recover']){s.phase=phase;for(let i=0;i<10;i++)drawYellowCharge(g,10,20,s);}assert.equal(s.time,.0); // draw never advances clocks
console.log('通过：冲锋锁向/.7秒预警/760速度/连续碰撞/单次伤害/1.1秒收招/轮流释放/表现只读');
(async()=>{storage.clear();const game=new GameBootstrap();await game.start();finishStartup(game);click(game.screens.root,'StartHero');assert.equal(game.phase,'battle');assert.equal(game.run.offers.length,0);assert.equal(game.run.stageWave,1);game.clearBattle();game.run.stageWave=3;game.run.miniSpawned=true;game.spawnStageBoss(true);let trio=game.enemies.filter(e=>e.hp>0&&e.miniCharge);assert.equal(trio.length,3);assert.equal(trio.reduce((n,e)=>n+e.hp,0),7200);game.spawnStageBoss(true);assert.equal(game.enemies.filter(e=>e.hp>0&&e.miniCharge).length,3,'重复入口不增生');
 game.playerHp=2;game.skillCharge=0;game.remaining=52;game.run.waveTime=8;game.resumeCountdown=0;game.spawnClock=999;game.cooldown=999;const goldBefore=game.coinTotal;
 for(let i=0;i<3;i++){game.hitEnemy(trio[i],0,1e9,0,'pole',false,true);assert.equal(game.run.miniDefeated,i===2);assert.equal(game.playerHp,i===2?3:2);assert.equal(game.skillCharge,0);if(i<2){assert.equal(game.stageBoundary(),false);game.drawProgress();assert.match(game.bossLabel.string,new RegExp((2-i)+'/3'));}}
 game.dropCoin(game.px,game.py,7);game.update(1/120);assert.equal(game.phase,'shop','8秒击败三将立即结束，不等待60秒');assert.ok(game.remaining>51);assert.equal(game.coinTotal,goldBefore+25+7,'固定赏金25另加地面金币');assert.equal(game.run.offers.length,4);assert.equal(game.stageBoundary(),false);assert.equal(game.coinTotal,goldBefore+25+7,'结算幂等');
 const echoEnemy=trio[2];echoEnemy.hp=100;echoEnemy.born=0;echoEnemy.miniCharge.phase='dash';game.drawEnemy(echoEnemy,true);assert.equal(echoEnemy.chargeGhosts.length,2);echoEnemy.hp=0;echoEnemy.dead=0;trio[0].dead=trio[1].dead=1;const lvbu=game.spawnNext('chief',undefined,2);assert.equal(lvbu,echoEnemy);game.drawEnemy(lvbu,true);assert.notEqual(lvbu.lvbuGhosts,lvbu.chargeGhosts);assert.equal(lvbu.lvbuGhosts[0].node.getComponent(cc.UITransform).width,300,'吕布残影不复用小精英的78px尺寸');lvbu.hp=0;assert.equal(game.stageBoundary(),false);assert.equal(game.phase,'shop');game.onDestroy();console.log('通过：开局直接战斗/三将总7200HP/不重复召唤/8秒三将全灭立即过波/固定25币加回收金币不重复/一次回血与赏金/精英不计充能');
})().catch(e=>{console.error(e);process.exitCode=1;});
