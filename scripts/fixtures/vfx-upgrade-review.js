// Engineering only. Isolated browser menu guard, no save writes, full restore/watchdog.
function installVfxUpgradeReview(){
 const c=globalThis.__qaCC,g=globalThis.__qaGame;if(!g?.ready||g.phase!=='menu')return {skipped:true};
 const old={};for(const k of ['run','update','phase','px','py','age','heading','facing','cameraX','cameraY','testMode','trainingMode','skillCharge','remaining','kills','hits','paused','hurtTime','protectionTime','cooldown','spawnClock','resumeCountdown','playerVx','playerVy'])old[k]=g[k];
 const profile=JSON.stringify(g.profile),storage=JSON.stringify(Object.keys(c.sys.localStorage).sort().map(k=>[k,c.sys.localStorage.getItem(k)]));let closed=false,timer;
 function restore(){if(closed)return;closed=true;clearTimeout(timer);g.clearBattle();Object.assign(g,old);g.presentSubstep=true;g.showMainMenu();g.run=old.run;g.syncWeapons();return {phase:g.phase,profileUnchanged:profile===JSON.stringify(g.profile),storageUnchanged:storage===JSON.stringify(Object.keys(c.sys.localStorage).sort().map(k=>[k,c.sys.localStorage.getItem(k)]))};}
 function begin(hero='liubei',growth=0){if(closed)throw Error('closed');clearTimeout(timer);timer=setTimeout(restore,120000);g.clearBattle();g.run=JSON.parse(JSON.stringify(old.run));Object.assign(g.run,{chapter:1,stageWave:1,challenge:true,heroId:hero,growth,weapons:[{id:'sandal',tier:1,uid:700,invested:0}],hearts:5});Object.assign(g,{phase:'battle',update:function(){},testMode:true,trainingMode:false,paused:false,resumeCountdown:0,hurtTime:0,protectionTime:999,px:0,py:0,cameraX:0,cameraY:0,age:0,heading:0,facing:1,cooldown:0,spawnClock:999,presentSubstep:true});g.setBattleVisible(true);g.screens.hide();g.applyHeroPresentation();g.syncWeapons();g.hero.setPosition(0,0);g.animateWalk(0,0,0,0,0);g.rebuildMeadow();g.world.setPosition(0,0);g.battlefield.setPosition(0,0);g.terrain.setPosition(0,0);}
 function enemy(id='E01',x=100,y=0){const n=Number(id.slice(1)),e=g.spawnNext(n>=19&&n<=25?'cavalry':'soldier',id);Object.assign(e,{x,y,born:0,hp:1e6,maxHp:1e6,speed:0,attackCooldown:999,attack:-1,vx:0,vy:0});e.node.setPosition(x,y);g.drawEnemy(e);return e;}
 function paint(){g.hero.setPosition(g.px,g.py);g.drawPlayerHealth();g.drawProgress();g.updateEffects(0);return {version:g.buildVersion,quads:g.vfxMaterials.count,allocated:g.vfxMaterials.allocated,enemies:g.enemies.filter(e=>e.hp>0).length,bufferBytes:c.director.root.device.memoryStatus.bufferSize,textureBytes:c.director.root.device.memoryStatus.textureSize};}
 function weapon(id,tier=4,time=0){begin();g.run.weapons=[{id,tier,uid:701,invested:0}];g.refreshStats();g.syncWeapons();time=time||(g.weapons[0].stats.arc>0?.15:.3);for(let i=0;i<5;i++)enemy('E01',95+i*48,(i%3-1)*45);for(let i=0;i<Math.ceil(time*120);i++)g.simulate(1/120);return {id,tier,time,...paint()};}
 function npc(id){
  begin();
  const slot=Number(id.slice(1));
  const e=enemy(id,slot<=8||slot===26||slot===27?-51:-75,0);g.protectionTime=999;e.attackCooldown=0;
  const zone=[29,30,33,34,36,37,38,39,40].includes(Number(id.slice(1)));
  let seen=-1;
  for(let i=0;i<345;i++){
   const dt=1/120;g.age+=dt;
   if(e.hp>0)g.updateEnemy(e,dt);
   g.updateEnemyShots(dt);g.updateEnemyZones(dt);g.combatFx.update(dt);
   if(seen<0&&(zone?g.enemyZones.some(z=>z.fired)||e.hp<=0:e.fired||e.chargeHit))seen=g.age;
   if(seen>=0&&g.age-seen>.07)break;
  }
  if(seen<0)throw Error(id+' did not release in the fixture');
  return {id,time:g.age,release:seen,shots:g.enemyShots.filter(shot=>shot.remaining>0).length,zones:g.enemyZones.filter(z=>z.fired).length,...paint()};
 }
 function mini(stage,time,phase=0){begin();g.run.chapter=stage;g.run.stageWave=3;g.cooldown=999;g.spawnStageBoss(true);for(const e of g.enemies)if(e.hp>0){e.x=-145;e.y=0;e.born=0;e.miniTime=0;e.miniPhase=phase;e.node.setPosition(e.x,e.y);}for(let i=0;i<Math.ceil(time*120);i++)g.simulate(1/120);return {stage,time,phase,...paint()};}
 function feedback(kind){begin();g.combatFx.feedback(kind,0,30,0);g.combatFx.update(.07);return {kind,...paint()};}
 function birth(){begin();const e=enemy('E01',80,0);e.born=.3;e.bornTotal=.9;g.updateEnemy(e,0);return {kind:'birth',...paint()};}
 function guard(){begin();g.run.skillId='G25';g.skillCharge=15;g.castSkill();g.updateSkill(.1);g.commonSkill.block(40,20);return {kind:'guard',...paint()};}
 function peach(){begin();g.run.augments=['chain-peach'];const e=enemy('E01',80,0);enemy('E01',125,20);enemy('E01',120,-30);e.hp=1;g.hitEnemy(e,0,50,30,'peach',false);g.combatFx.update(.07);return {kind:'peach-chain',...paint()};}
 function stressStart(orbit=false,reported=false){
  begin(reported?'zhangfei':'liubei');g.run.chapter=6;g.run.skillId=orbit?'G25':'G22';
  const ranged=['repeater','phoenix-bow','heavy-crossbow','oil-jar','taiping-book','thunder-bomb'];
  const ids=reported?['phoenix-bow','qinggang','phoenix-bow','sword','wood-ox','heavy-crossbow']:orbit?Array(6).fill('sword'):ranged;
  g.run.weapons=ids.map((id,i)=>({id,tier:4,uid:800+i,invested:0}));
  g.refreshStats();g.syncWeapons();g.protectionTime=9999;g.spawnClock=9999;
  for(let i=0;i<78;i++){
   const e=enemy('E'+String(i%40+1).padStart(2,'0'),Math.cos(i*2.399)*180,Math.sin(i*2.399)*160);
   e.speed=35;e.attackCooldown=i*.02;
  }
  for(const [ch,x,y] of [[5,-315,-78],[7,315,93]]){
   const e=g.spawnNext('chief',undefined,ch);
   Object.assign(e,{x,y,born:0,hp:1e7,maxHp:2.1e7,speed:30,attackCooldown:0});
   e.node.setPosition(x,y);
  }
  return paint();
 }
 function stressStep(frames=120){
  clearTimeout(timer);timer=setTimeout(restore,120000);
  const peak={shots:0,enemyShots:0,particles:0,visuals:0,areas:0,quads:0,allocated:0};
  const simulation=[],geometry=[];let renderMs=0,renders=0;
  for(let i=0;i<frames;i++){
   const start=performance.now();
   g.presentSubstep=false;g.simulate(1/120);g.presentSubstep=true;g.simulate(1/120);
   if(i%450===0){g.skillCharge=15;g.castSkill();}
   simulation.push(performance.now()-start);
   let shots=0,enemyShots=g.bossBattle.shotCount;
   for(const s of g.projectiles)if(s.remaining>0)shots++;
   for(const s of g.enemyShots)if(s.remaining>0)enemyShots++;
   peak.shots=Math.max(peak.shots,shots+g.pet.shotCount);
   peak.enemyShots=Math.max(peak.enemyShots,enemyShots);
   peak.particles=Math.max(peak.particles,g.combatFx.particles.active);
   peak.visuals=Math.max(peak.visuals,g.commonEffects.activeCount);
   peak.areas=Math.max(peak.areas,g.enemyZones.length+g.bossBattle.areaCount);
   if(i%15===0){
    const paintStart=performance.now();g.updateEffects(1/4);geometry.push(performance.now()-paintStart);
    peak.quads=Math.max(peak.quads,g.vfxMaterials.count);
    peak.allocated=Math.max(peak.allocated,g.vfxMaterials.allocated);
   }
   if(i%120===0){const t=performance.now();c.director.tick(0);c.director.tick(0);renderMs+=performance.now()-t;renders++;}
  }
  const p95=values=>values.sort((a,b)=>a-b)[Math.floor(values.length*.95)];
  return {seconds:g.age,peak,simulationP95:p95(simulation),geometryP95:p95(geometry),renderMean:renderMs/renders,...paint()};
 }
 function growth(id,phase=2){
  begin(id,1);
  const weapon=id==='liubei'?'twin-swords':id==='guanyu'?'guandao':'serpent-spear';
  g.run.weapons=[{id:weapon,tier:1,uid:702,signature:true,invested:0}];g.refreshStats();g.syncWeapons();
  for(const [x,y] of [[103,0],[189,-18],[262,12],[352,0],[156,82],[-98,-45]])enemy('E01',x,y);
  const w=g.weapons[0];
  Object.assign(w,{angle:0,time:.09,duration:.3,strikes:phase+1,strikeStarted:false,damage:100});
  g.updateWeapon(w,.071);
  g.updateProjectiles(id==='liubei'?.16:.067);
  return {id,phase,shots:g.projectiles.filter(shot=>shot.remaining>0).length,damageTargets:g.enemies.filter(e=>e.hp>0&&e.hp<e.maxHp).length,...paint()};
 }
 function mount(id){begin(id,4);g.mountDash.remaining=.15;g.mountDash.angle=0;return {id,...paint()};}
 function pet(id){begin(id,5);g.pet.configure(id,5);g.pet.cooldown=0;enemy('E01',45,-18);for(let i=0;i<(id==='zhangfei'?60:32);i++){g.age+=1/120;g.combatFx.update(1/120);g.pet.update(1/120);}return {id,...paint()};}
 globalThis.vfxUpgradeReview={weapon,npc,feedback,growth,mount,pet,mini,birth,guard,peach,stressStart,stressStep,restore};timer=setTimeout(restore,120000);return {ready:true};
}
