const assert=require('node:assert/strict');
const {newGame,load,Graphics,Node,cc,storage}=require('./test-campaign.cjs');
(async()=>{
 const {CanvasDrawing}=load('BattleSpriteAtlas');const ctx={path:[['rect',0,0,128,128]],beginPath(){this.path=[];},save(){},restore(){},translate(){},scale(){},moveTo(){},arc(){this.path.push(['arc']);},fill(){this.filled=[...this.path];}};const canvasArt=new CanvasDrawing(ctx);canvasArt.circle(0,0,11);canvasArt.fill();assert.deepEqual(ctx.filled,[['arc']],'atlas clipping rectangle must never leak into filled coin geometry');
 const {drawHeroFist}=load('hero-arms');const fist=new Graphics();let redraws=0;fist.clear=()=>redraws++;
 drawHeroFist(fist,'liubei',1,true);for(let i=0;i<1000;i++)drawHeroFist(fist,'liubei',1,true);assert.equal(redraws,1);
 drawHeroFist(fist,'guanyu',1,true);drawHeroFist(fist,'guanyu',-1,true);drawHeroFist(fist,'guanyu',-1,false);assert.equal(redraws,4,'hero/facing/grip changes redraw');
 const {ParticleSprites,particleMasks}=load('ParticleSprites'),{CombatEffects,effectInk}=load('combat-effects');
 const mask=particleMasks();assert.equal(mask.length,96*64*4);assert.ok(mask.some((v,i)=>i%4===3&&v>0&&v<255),'antialiased silhouettes');
 for(let tile=0;tile<6;tile++){let opaque=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++){const a=mask[((Math.floor(tile/3)*32+y)*96+tile%3*32+x)*4+3];if(a)opaque++;if(!x||!y||x===31||y===31)assert.equal(a,0,'atlas gutters prevent adjacent particle bleed');}assert.ok(opaque>20,'all six shapes retain visible coverage');}
 const particleRoot=new Node('ParticleFixture'),renderer=new ParticleSprites(particleRoot,effectInk),visual=new CombatEffects();
 const shapes=['spark','petal','bean','dust','chip','star'];for(let i=0;i<280;i++)visual.particles.emit(0,0,i,80,1,4,i%16,shapes[i%6],2);
 assert.equal(visual.particles.active,280);renderer.draw(visual.particles,0,0,667,375);assert.equal(particleRoot.children.length,280);assert.equal(particleRoot.children.filter(n=>n.active).length,280,'every visible live particle still renders');
 const quads=[...particleRoot.children],upload=renderer.texture.data;let paths=0;const vector=new Graphics();vector.fill=vector.stroke=()=>paths++;visual.draw(vector,vector,0,0,667,375,true);assert.equal(paths,0,'sprite path does not tessellate particle geometry');
 for(let frame=0;frame<240;frame++)renderer.draw(visual.particles,0,0,667,375);assert.equal(renderer.texture.data,upload,'texture uploaded once');assert.deepEqual(particleRoot.children,quads,'no particle-node churn');
 renderer.draw(visual.particles,99999,99999,667,375);assert.ok(quads.every(n=>!n.active),'offscreen particles are culled without changing physics');assert.equal(visual.particles.active,280);renderer.draw(visual.particles,0,0,667,375);renderer.clear();assert.ok(quads.every(n=>!n.active),'clear removes stale particles immediately');renderer.destroy();assert.equal(particleRoot.children.length,0);assert.equal(renderer.texture.destroyed,true,'GPU mask released');
 const g=await newGame();g.clearBattle();
 for(let i=0;i<10000;i++)g.dropCoin(500+i%10,200+Math.floor(i/10)%10);
 assert.equal(g.coins.length,128,'loot has a hard node budget');assert.equal(g.coins.reduce((n,c)=>n+c.value,0),10000);
 g.collectAllCoins();assert.equal(g.coinTotal,10000);g.collectAllCoins();assert.equal(g.coinTotal,10000,'collection is idempotent');
 for(let i=0;i<2000;i++)g.dropCoin(0,0);g.updateCoins(1);assert.equal(g.coinTotal,12000,'stacked pickup preserves every coin');
 const worldCount=g.world.children.length;
 for(let cycle=0;cycle<12;cycle++){g.clearBattle();for(let i=0;i<500;i++)g.dropCoin(500,200);g.collectAllCoins();}
 assert.equal(g.world.children.length,worldCount,'restarts/loot bursts do not add nodes');
 const damage=g.spawnNext('soldier');assert.equal(damage.text.cacheMode,cc.Label.CacheMode.CHAR);assert.equal(damage.text.node.getComponent(cc.UITransform).width,112);
 g.clearBattle();g.run.wave=2;g.nextSupply=Infinity;g.spawnClock=99999;g.hurtPlayer=()=>{};g.run.skillId='G22';g.run.weapons=Array.from({length:6},(_,i)=>({id:'sword',tier:4,uid:i+1}));g.refreshStats();g.syncWeapons();
 for(let i=0;i<80;i++){const e=g.spawnNext(i===0?'chief':i%3?'soldier':'spearman');e.born=0;e.hp=e.maxHp=1e9;e.x=Math.cos(i)*220;e.y=Math.sin(i)*220;e.node.setPosition(e.x,e.y);}
 g.update(1/60);let clears=0;const clear=Graphics.prototype.clear;Graphics.prototype.clear=function(){clears++;return clear.call(this);};
 try{g.update(.08);}finally{Graphics.prototype.clear=clear;}
 assert.ok(clears<40,'slow frame must not rebuild the same visible Graphics in every physics substep');
 const previous=g.weapons[0].orbitPrevious,point=previous[0];g.update(1/60);assert.equal(g.weapons[0].orbitPrevious,previous);assert.equal(previous[0],point,'orbit CCD points are reused');
 const count=g.world.children.length;
 for(let frame=0;frame<3600;frame++){if(frame%180===0){g.skillCharge=999;g.castSkill();}g.update(1/60);assert.equal(g.phase,'battle');assert.ok(g.combatFx.particles.active<=280);assert.ok(g.commonSkill.tasks.length<=36);assert.ok(g.commonEffects.visuals.length<=32);}
 assert.ok(g.enemies.length<=84);assert.ok(g.enemyShots.length<=80);assert.ok(g.hearts.length<=4);assert.ok(g.world.children.length<=count+88,'one-minute dense fixture stays within enemy-arrow/neutral budgets');
 g.clearBattle();g.run.weapons=[{id:'shotgun',tier:4,uid:1}];g.refreshStats();g.syncWeapons();const w=g.weapons[0];
 for(let cycle=0;cycle<12;cycle++){
  for(let i=0;i<500;i++)g.launchProjectile(-600,300,0,w.equipped,w.stats,5);
  assert.equal(g.projectiles.length,160,'projectile saturation has a fixed pool');
  for(let i=0;i<180;i++)g.updateProjectiles(1/120);
 }
 assert.equal(g.projectiles.length,160);g.clearBattle();assert.ok(g.projectiles.every(p=>!p.node.active));
 // Exercise the shared-atlas branch without a browser canvas: supply deterministic raster-frame fixtures.
 const cached=await newGame();cached.clearBattle();const atlas=cached.battleSprites;atlas.texture=new cc.Texture2D();
 for(const id of load('weapons').WEAPONS.map(w=>'weapon-'+w.id).concat(['coin','coin-shadow','birth-ring','birth-dot','enemy-arrow','enemy-bullet','enemy-poison','enemy-knife','enemy-axe','enemy-coin']))atlas.cells[id]={frame:new cc.SpriteFrame(),width:32,height:32,x:0,y:0};
 const cw=cached.weapons[0];let projectileSprite;
 for(const id of ['sandal','smg','peach','rocket','sandal','smg']){for(const p of cached.projectiles)p.remaining=0;cached.launchProjectile(0,34,0,{id,tier:1,uid:1},cw.stats,20);const p=cached.projectiles[0];assert.ok(p.atlasArt);assert.ok(!p.node.getComponent(Graphics),'cached projectile owns no Graphics mesh');if(projectileSprite)assert.equal(p.atlasArt,projectileSprite,'weapon switches reuse one quad');projectileSprite=p.atlasArt;}assert.equal(cached.projectiles.length,1);
 const victim=cached.spawnNext('soldier');victim.x=70;victim.y=0;victim.born=0;victim.hp=victim.maxHp=100;victim.vx=victim.vy=0;victim.art.node.setPosition(0,0);victim.previousHitX=70;victim.previousHitY=34;const p=cached.projectiles[0];p.remaining=500;p.weaponId='smg';p.x=0;p.y=34;p.angle=0;p.stats={...cw.stats,speed:700,pierce:1,area:0};p.damage=20;p.hit.clear();cached.updateProjectiles(.12);assert.ok(victim.hp<100,'sprite projectile retains swept collision damage');
 cached.dropCoin(400,0);assert.ok(!cached.coins[0].node.getComponent(Graphics));assert.ok(!cached.coins[0].art.getComponent(Graphics),'coin/shadow are shared sprites');
 victim.born=.5;victim.bornTotal=.9;let birthPaths=0;victim.warning.clear=()=>birthPaths++;cached.updateEnemy(victim,0);assert.equal(victim.birthSprites.length,6);assert.equal(birthPaths,0,'birth effect does not allocate a per-enemy mesh');
 victim.archetype='E12';cached.fireEnemyShot(victim,0,300);const arrow=cached.enemyShots[0].atlasArt;cached.enemyShots[0].remaining=0;victim.archetype='E31';cached.fireEnemyShot(victim,0,600);assert.equal(cached.enemyShots[0].atlasArt,arrow,'arrow/bullet styles reuse the quad');assert.ok(!cached.enemyShots[0].node.getComponent(Graphics));cached.clearBattle();assert.equal(victim.birthRig.active,false);assert.ok(cached.projectiles.every(p=>!p.node.active));cached.onDestroy();
 // New long-campaign pressure combines ground fields, follower shots, auras and Boss warnings.
 const mix=await newGame('kongming');mix.clearBattle();mix.run.chapter=17;mix.run.wave=2;mix.nextSupply=Infinity;mix.spawnClock=99999;mix.hurtPlayer=()=>{};mix.run.skillId='G20';
 mix.run.weapons=['halberd','repeater','oil-jar','bagua','star-lamps','wood-ox'].map((id,i)=>({id,tier:4,uid:i+1}));mix.refreshStats();mix.syncWeapons();
 for(let i=0;i<80;i++){const d=load('chronicles').CHRONICLE_ENEMIES[i%40],e=mix.spawnNext(i===0?'chief':d.kind,i===0?undefined:d.id);e.born=0;e.hp=e.maxHp=1e9;e.x=Math.cos(i)*220;e.y=Math.sin(i)*220;e.node.setPosition(e.x,e.y);}
 for(let i=0;i<1800;i++){if(i%180===0){mix.skillCharge=999;mix.castSkill();}mix.update(1/60);assert.equal(mix.phase,'battle');assert.ok(mix.enemyZones.length<=6);assert.ok(mix.friendlyFields.length<=40);assert.ok(mix.pendingEnemyShots.length<=24);assert.ok(mix.pendingShots.length<=36);assert.ok(mix.projectiles.length<=160);assert.ok(mix.combatFx.particles.active<=280);assert.ok(mix.commonSkill.tasks.length<=36);assert.ok(mix.commonEffects.visuals.length<=32);}
 mix.onDestroy();
 const {RuntimeHealth,HEALTH_KEY}=load('runtime-health');const events={},removed={};
 const host={};for(const name of ['MemoryWarning','Error','UnhandledRejection']){host['on'+name]=fn=>events[name]=fn;host['off'+name]=fn=>removed[name]=fn;}
 let warnings=0;const recorder=new RuntimeHealth(host,cc.sys.localStorage,'fixture',()=>({phase:'battle',enemies:80}),()=>warnings++);
 for(let i=0;i<20;i++)events.MemoryWarning({level:i});events.Error(new Error('fixture error'));events.UnhandledRejection({reason:new Error('fixture rejection')});
 recorder.frame(15);const health=JSON.parse(storage.get(HEALTH_KEY));assert.equal(warnings,20);assert.equal(health.events.length,8);assert.equal(health.events[6].detail,'fixture error');assert.equal(health.events[7].detail,'fixture rejection');assert.equal(health.snapshot.enemies,80);assert.ok(storage.get(HEALTH_KEY).length<5000);
 recorder.destroy();for(const name of Object.keys(events))assert.equal(removed[name],events[name],'detach exact host listener');
 const pool=g.combatFx.particles;pool.emit(0,0,0,1,1,1,0,'spark',0);pool.emit(0,0,0,1,1,1,0,'spark',2);pool.trimTrails();
 assert.ok(pool.slots.some(p=>p.life>0&&p.priority===2));assert.ok(!pool.slots.some(p=>p.life>0&&p.priority===0));assert.equal(pool.emit(0,0,0,1,1,1,0,'spark',0),false);assert.equal(pool.emit(0,0,0,1,1,1,0,'spark',2),true);
 g.onDestroy();console.log('通过：280粒子同纹理四边形/六种抗锯齿形状/零重复上传/裁剪与清理/池不扩容、静态握拳缓存、金币128节点/万元守恒/吸附/复用、伤害字CHAR、小帧重复绘制预算、六剑阵80敌持续3600帧、160弹体饱和12轮、40兵种/六新武器/司马懿1800帧有界、告警/异常限长记录/精确注销/保留核心技能粒子');
})().catch(e=>{console.error(e);process.exitCode=1;});
