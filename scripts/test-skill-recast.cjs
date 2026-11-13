const assert=require('node:assert/strict');
const {newGame,load}=require('./test-campaign.cjs');
const {COMMON_SKILLS}=load('common-skills');
function target(g,x,y,kind='soldier',id){const e=g.spawnNext(kind,id);Object.assign(e,{x,y,born:0,hp:1e6,maxHp:1e6,speed:0,attackCooldown:99,vx:0,vy:0});e.node.setPosition(x,y);return e;}
function step(g,time){for(let i=0;i<Math.round(time*120);i++){g.age+=1/120;g.updateSkill(1/120);}}
function cast(g,id){g.run.skillId=id;g.skillCharge=g.skillRequirement();g.castSkill();}
(async()=>{
 // Eight physical arrows; swept hits rather than damage at launch time.
 const arrow=await newGame();arrow.clearBattle();arrow.px=arrow.py=arrow.heading=0;const far=target(arrow,400,0),behind=target(arrow,-200,0);
 const tokens=new Set(),flight=arrow.commonEffects.flight.bind(arrow.commonEffects);arrow.commonEffects.flight=(token,...args)=>{tokens.add(token);return flight(token,...args);};
 cast(arrow,'G08');step(arrow,.1);assert.equal(far.hp,far.maxHp,'arrows have travel time');step(arrow,1.2);assert.equal(tokens.size,8,'exactly eight arrows launched');assert.equal(arrow.commonSkill.tasks.length,0);assert.equal(arrow.commonEffects.visuals.length,0);assert.ok(far.hp<far.maxHp);assert.ok((far.maxHp-far.hp)<=4*Math.ceil(arrow.run.weapons.reduce((n,w)=>n+load('campaign').weaponDps(arrow.run,w),0)*.22),'same enemy at most four arrows');
 arrow.clearBattle();const moving=target(arrow,250,0);cast(arrow,'G08');step(arrow,.05);moving.y=200;step(arrow,.1);assert.equal(moving.hp,moving.maxHp,'old line cannot hurt a target that moved away');arrow.onDestroy();
 // Haste changes release cadence only, expires exactly after five simulated seconds.
 const haste=await newGame();haste.clearBattle();const original=haste.stats.damage;cast(haste,'G07');assert.equal(haste.commonSkill.hasteMultiplier,5);assert.equal(haste.commonSkill.damageMultiplier,1);assert.equal(haste.stats.damage,original);step(haste,4.9);assert.equal(haste.commonSkill.hasteMultiplier,5);step(haste,.2);assert.equal(haste.commonSkill.hasteMultiplier,1);haste.onDestroy();
 // Verify actual release cadence for ranged, magic and melee through the live weapon loop.
 for(const id of ['sandal','pole','smg','peach']){
  const medians=[];
  for(const boosted of [false,true]){
   const g=await newGame();g.clearBattle();g.run.weapons=[{id,tier:1,uid:1}];g.refreshStats();g.syncWeapons();g.px=g.py=0;g.cooldown=0;g.testMode=true;g.spawnClock=99999;g.animalClock=g.treeClock=99999;g.hurtPlayer=()=>{};g.updateEnemy=()=>{};
   const e=target(g,id==='pole'?100:180,0);e.hp=e.maxHp=1e9;
   if(boosted)cast(g,'G07');const attacks=[],w=g.weapons[0];w.strikes=0;
   for(let i=0;i<4.8*120;i++){const before=w.strikes;g.simulate(1/120);if(w.strikes>before)attacks.push(g.age);}
   const intervals=attacks.slice(1).map((v,i)=>v-attacks[i]).sort((a,b)=>a-b);assert.ok(intervals.length>=3,id+' actually attacks');medians.push(intervals[Math.floor(intervals.length/2)]);
   assert.ok(g.projectiles.length<=160);g.onDestroy();
  }
  assert.ok(Math.abs(medians[1]-medians[0]/5)<=1/120+1e-6,id+' real attack interval is one fifth within one simulation step');
 }
 // Fivefold mixed-weapon burst with 80 enemies retains every shared pool limit.
 const rapid=await newGame();rapid.clearBattle();rapid.testMode=true;rapid.spawnClock=rapid.animalClock=rapid.treeClock=99999;rapid.hurtPlayer=()=>{};
 rapid.run.weapons=['smg','shotgun','rocket','pole','peach','sword'].map((id,i)=>({id,tier:4,uid:i+1}));rapid.refreshStats();rapid.syncWeapons();rapid.px=rapid.py=0;
 for(let i=0;i<80;i++){const e=target(rapid,Math.cos(i)*180,Math.sin(i)*180);e.hp=e.maxHp=1e9;}
 cast(rapid,'G07');
 for(let i=0;i<7*60;i++){rapid.update(1/60);assert.ok(rapid.projectiles.length<=160);assert.ok(rapid.enemyShots.length<=80);assert.ok(rapid.commonEffects.visuals.length<=32);assert.ok(rapid.combatFx.particles.active<=280);}
 assert.equal(rapid.commonSkill.hasteMultiplier,1);rapid.clearBattle();assert.ok(rapid.projectiles.every(p=>!p.node.active));rapid.onDestroy();
 // A 480x80 world-space horizontal fireline, four bounded damage beats.
 const fire=await newGame();fire.clearBattle();fire.px=fire.py=0;const fIn=target(fire,239,39),fX=target(fire,241,0),fY=target(fire,0,41);
 cast(fire,'G10');cast(fire,'G10');assert.equal(fire.commonSkill.tasks.filter(t=>t.id==='G10').length,1,'same fireline replaces previous rather than stacking geometry');step(fire,.1);assert.equal(fIn.hp,fIn.maxHp);step(fire,3.1);assert.ok(fIn.hp<fIn.maxHp);assert.equal(fX.hp,fX.maxHp);assert.equal(fY.hp,fY.maxHp);assert.equal(fire.commonSkill.tasks.length,0);assert.equal(fire.commonEffects.visuals.length,0);fire.onDestroy();
 // Four rain impacts, fixed at the cast location, radius 400; no pre-impact damage.
 const rain=await newGame();rain.clearBattle();rain.px=rain.py=0;const rIn=target(rain,399,0),rOut=target(rain,401,0);const power=rain.run.weapons.reduce((n,w)=>n+load('campaign').weaponDps(rain.run,w),0);
 cast(rain,'G22');rain.px=700;step(rain,.15);assert.equal(rIn.hp,rIn.maxHp);step(rain,1.3);assert.equal(rIn.maxHp-rIn.hp,4*Math.round(power*.22));assert.equal(rOut.hp,rOut.maxHp);rain.onDestroy();
 // Three finite defensive charges. Sword contact damage survives exhausted wards.
 const guard=await newGame();guard.clearBattle();guard.px=guard.py=0;const near=target(guard,120,0);cast(guard,'G25');step(guard,.2);assert.ok(near.hp<near.maxHp,'rotating swords actually hit');
 for(let i=0;i<3;i++){guard.protectionTime=guard.hurtTime=0;guard.hurtPlayer(100,0,1);assert.equal(guard.playerHp,5);assert.equal(guard.commonSkill.shield,2-i);step(guard,.2);}
 guard.protectionTime=guard.hurtTime=0;guard.hurtPlayer(100,0,1);assert.equal(guard.playerHp,4,'no permanent invulnerability');assert.ok(guard.commonSkill.guard);step(guard,6);assert.equal(guard.commonSkill.guard,undefined);assert.equal(guard.commonSkill.shield,0);
 cast(guard,'G25');assert.equal(guard.commonSkill.interceptShot(200,24,0,24,'E12'),true);assert.equal(guard.commonSkill.shield,2);assert.equal(guard.commonSkill.interceptShot(200,24,0,24,'E12'),false,'grace avoids consuming every ward in a single frame');guard.clearBattle();assert.equal(guard.commonSkill.interceptShot(200,24,0,24),false);guard.onDestroy();
 // Full five-second stun applies to every archetype, cavalry and bosses without erasing hazards.
 const stun=await newGame();stun.clearBattle();stun.px=stun.py=0;
 const units=load('chronicles').CHRONICLE_ENEMIES.map((d,i)=>target(stun,80+i%8*30,-100+Math.floor(i/8)*30,d.kind,d.id));
 const boss=target(stun,250,0,'chief'),outside=target(stun,401,0),born=target(stun,200,0);born.born=.5;
 stun.fireEnemyShot(units[0],0,200);const shots=stun.enemyShots.filter(s=>s.remaining>0).length;
 cast(stun,'G26');assert.equal(stun.enemyShots.filter(s=>s.remaining>0).length,shots,'existing arrows remain');assert.ok(!outside.stunUntil);assert.ok(!born.stunUntil);
 for(const e of [...units,boss]){const before=JSON.stringify([e.x,e.y,e.attack,e.attackCooldown,e.bossAge,e.bossTimers]);stun.updateEnemy(e,.2);assert.equal(JSON.stringify([e.x,e.y,e.attack,e.attackCooldown,e.bossAge,e.bossTimers]),before,'all AI pauses during stun');}
 assert.equal(boss.stunUntil,stun.age+5);step(stun,4.9);assert.equal(stun.commonSkill.marks.length,41);step(stun,.2);assert.equal(stun.commonSkill.marks.length,0);boss.speed=100;stun.updateEnemy(boss,.1);assert.ok(boss.bossAge>0,'Boss resumes AI');
 cast(stun,'G26');stun.commonSkill.reset();assert.equal(boss.stunUntil,0,'reset releases owned control');assert.equal(stun.commonEffects.targets.length,0);stun.onDestroy();
 // Repeated free casts against an 80-enemy mixed scene remain bounded and clear fully.
 const stress=await newGame();stress.clearBattle();stress.px=stress.py=0;for(let i=0;i<80;i++)target(stress,Math.cos(i)*180,Math.sin(i)*180);
 for(let tick=0;tick<1200;tick++){if(tick%20===0)cast(stress,COMMON_SKILLS[Math.floor(tick/20)%COMMON_SKILLS.length].id);step(stress,1/120);assert.ok(stress.commonSkill.tasks.length<=36);assert.ok(stress.commonEffects.visuals.length<=32);assert.ok(stress.commonSkill.marks.length<=80);assert.ok(stress.combatFx.particles.active<=280);}
 stress.clearBattle();assert.equal(stress.commonSkill.tasks.length,0);assert.equal(stress.commonEffects.visuals.length,0);assert.equal(stress.commonSkill.marks.length,0);stress.onDestroy();
 console.log('通过：8支实体箭/飞行命中、5秒五倍攻速、水平480×80火线、400半径四轮箭雨、3次格挡/剑阵接触伤害、40兵种与Boss眩晕5秒/恢复/保留旧弹幕、80敌连放预算与清场');
})().catch(e=>{console.error(e);process.exitCode=1;});
