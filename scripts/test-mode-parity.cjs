const assert = require('node:assert/strict');
const { newGame, load, useDevelopmentHost, setFixtureSeed } = require('./test-campaign.cjs');
const { createStageRun } = load('campaign');
const { newProfile, recordClear } = load('stage-progress');
const { WEAPONS, starterFor } = load('weapons');
const { COMMON_SKILLS } = load('common-skills');
const { CHRONICLE_ENEMIES, CHAPTERS } = load('chronicles');
const { stageEnemyHp, stageBossHp } = load('stage-data');
const { endlessDifficulty } = load('endless');

async function enter(mode, hero) {
  const g = await newGame(hero);
  g.showMainMenu();
  g.profile = newProfile();
  for (let stage = 1; stage <= 6; stage++) recordClear(g.profile, hero, stage, 210, 100, 5);
  g.selectedStage = 6;
  const starter = starterFor(hero);
  if (mode === 'stage') {
    g.run = createStageRun(g.profile, hero, 6, starter, 'G22');
    g.restart(false);
  } else if (mode === 'endless') {
    g.startEndless(hero, 'G22', starter);
  } else {
    g.startTraining(hero, 'G22');
    g.setTrainingForm(hero, 6);
    g.trainingPanel.hide();
  }
  assert.equal(g.phase, 'battle');
  assert.equal(g.run.growth, 6);
  return g;
}

// Compare the scheduler and actual damage/control on a fixed target layout.
function castOnTargets(g, skill) {
  g.clearBattle(true);
  g.run.skillId = skill;
  g.commonSkill.reset();
  g.age = g.px = g.py = g.heading = g.resumeCountdown = 0;
  g.skillCharge = g.skillRequirement();
  const targets = [45, 85, 160].map(x => {
    const e = g.spawnNext('soldier', 'E01');
    Object.assign(e, { x, y: 0, hp: 100000, maxHp: 100000, born: 0 });
    return e;
  });
  g.castSkill();
  assert.equal(g.skillCharge, g.trainingMode ? 15 : 0, skill);
  const tasks = g.commonSkill.tasks.map(t => [t.kind,t.delay,t.power,t.sky?.length]);
  const haste = g.commonSkill.hasteRate;
  const blocked = g.commonSkill.block();
  for (let i = 0; i < 360; i++) {
    g.age += 1 / 60;
    g.commonSkill.update(1 / 60);
  }
  return { tasks, blocked, haste, x: g.px, y: g.py, targets: targets.map(e => [100000-e.hp,e.stunUntil,e.slowUntil]) };
}

// Fire against the same stationary targets. Reset only the fixture RNG so crits
// and spread cannot hide or manufacture a difference between modes.
function attackWith(g, id, tier) {
  g.clearBattle(true);
  g.run.weapons = [{uid:1,id,tier}];
  g.px = g.py = g.age = g.heading = g.playerVx = g.playerVy = 0;
  g.spawnClock = g.animalClock = g.treeClock = Infinity;
  g.cooldown = g.peachBurstCooldown = 0;
  g.pet.clear();
  const targets = [52,112,190].map(x=>{
    const e=g.spawnNext('soldier','E01');
    Object.assign(e,{x,y:0,speed:0,hp:100000,maxHp:100000,born:0,stunUntil:1000});
    e.node.setPosition(x,0);
    return e;
  });
  g.syncWeapons();
  g.refreshStats();
  const weapon=g.weapons[0];
  weapon.strikes=0;
  weapon.cooldown=0;
  weapon.time=weapon.duration;
  setFixtureSeed(20261124);
  for(let frame=0;frame<120;frame++)g.simulate(1/120);
  return { stats:{...weapon.stats}, strikes:weapon.strikes,
    damage:targets.map(e=>100000-e.hp), projectiles:g.projectiles.filter(p=>p.remaining>0).map(p=>p.weaponId),
    fields:g.friendlyFields.map(f=>[f.id,f.radius,f.damage]), orbit:weapon.orbitBlades?.length||0 };
}

async function measure(mode, hero) {
  const g = await enter(mode, hero);
  try {
    const signature = g.run.weapons[0];
    if (mode === 'training') {
      g.equipTrainingWeapon(signature.id, 4, 0);
      assert.equal(g.run.weapons[0].uid, signature.uid);
      assert.ok(g.run.weapons[0].signature, 'changing grade preserves signature strikes');
      g.equipTrainingWeapon(signature.id, 4, 1);
      assert.ok(!g.run.weapons[1].signature, 'a duplicate weapon does not gain a second signature');
      g.selectedStage = 2;
      assert.equal(g.pet.host.hero().stage, 2);
      g.selectedStage = 6;
    }
    g.run.weapons = [{...signature,tier:4}];
    g.syncWeapons();
    g.refreshStats();
    const heroStats = {...g.stats};
    const skills = COMMON_SKILLS.map(s => castOnTargets(g, s.id));
    g.clearBattle(true);
    const weapons = [];
    for (const w of WEAPONS) for (let tier = 1; tier <= 4; tier++) {
      weapons.push(attackWith(g,w.id,tier));
    }
    const enemies = [];
    for (const d of CHRONICLE_ENEMIES) {
      g.clearBattle(true);
      const e = g.spawnNext(d.kind, d.id);
      const hp = mode === 'endless' ? Math.round(d.hp * endlessDifficulty(0).hp) : stageEnemyHp(d.hp,6,1);
      assert.equal(e.maxHp,hp,d.id);
      assert.equal(e.speed,d.speed*(mode==='endless'?1:1.03),d.id);
      Object.assign(e, {x:30,y:0,born:0,attackCooldown:0,speed:0});
      g.px = g.py = g.age = g.hurtTime = g.protectionTime = 0;
      g.playerHp = g.stats.maxHp;
      setFixtureSeed(1234);
      const trace = [];
      for (let frame=0; frame<360; frame++) {
        g.age += 1/120;
        g.updateEnemy(e,1/120);
        if (frame%20===0) trace.push([e.attack,e.fired,e.chargeHit,g.hurtTime>0]);
      }
      enemies.push({ id:e.archetype,kind:e.kind,damage:e.damage,birth:e.bornTotal,rig:!!e.npcRig,trace,
        shots:g.enemyShots.filter(s=>s.remaining>0).map(s=>s.style),zones:g.enemyZones.map(z=>[z.shape,z.radius,z.delay]) });
    }
    const bosses = [];
    for (const chapter of CHAPTERS) {
      for (let move = 0; move < 3; move++) {
        g.clearBattle(true);
        const e = g.spawnNext('chief', undefined, chapter.id);
        if (mode === 'training') assert.equal(e.maxHp, stageBossHp(e.bossSkin));
        Object.assign(e, {x:-120,y:0,born:0,hp:e.maxHp*.4});
        g.px = g.py = 0;
        if (e.lvbu) load('lvbu-boss').startLvbuMove(e,e.lvbu,move,0);
        else assert.ok(g.bossBattle.start(e,move,0), chapter.bossId + ' move ' + move);
        const hazards = g.bossBattle.hazards.filter(h=>h.active).map(h=>
          [h.kind,h.radius,h.width,h.delay,h.duration,h.speed,h.distance]);
        const units = g.enemies.filter(a=>a.hp>0&&a.bossUnit).map(a=>
          [a.bossUnit.kind,a.maxHp,a.bossUnit.delay,a.bossUnit.life]);
        bosses.push([e.bossSkin,e.speed,e.bossMove.name,e.bossMove.windup,e.bossMove.duration,hazards,units]);
      }
    }
    return JSON.parse(JSON.stringify({heroStats,skills,weapons,enemies,bosses}));
  } finally { g.onDestroy(); }
}
async function checkGrowth(hero) {
  const stage = await enter('stage', hero);
  const arena = await enter('training', hero);
  const starter = starterFor(hero);
  try {
    stage.profile = newProfile();
    for (let growth = 0; growth <= 6; growth++) {
      if (growth > 0) recordClear(stage.profile, hero, growth, 210, 100, 5);
      stage.run = createStageRun(stage.profile, hero, 1, starter, 'G01');
      stage.restart(false);
      arena.setTrainingForm(hero, growth);
      assert.equal(stage.run.growth, arena.run.growth);
      assert.deepEqual({...stage.stats}, {...arena.stats});
      assert.equal(stage.run.weapons[0].id, arena.run.weapons[0].id);
      assert.equal(stage.pet.active, arena.pet.active);
      for (const g of [stage, arena]) {
        const torso = growth>=5 ? 'growth-torso-'+hero : 'hero-'+hero+'-torso';
        assert.ok(g.artFrames[torso]);
        assert.equal(g.body.spriteFrame,g.artFrames[torso]);
        assert.equal(g.headOpen,g.artFrames['hero-'+hero+'-open']);
        assert.equal(g.avatar.spriteFrame,g.artFrames['hero-select-'+hero]);
      }
    }
  } finally { stage.onDestroy(); arena.onDestroy(); }
}

(async()=>{
  useDevelopmentHost();
  for(const hero of ['liubei','guanyu','zhangfei']){
    await checkGrowth(hero);
    const stage=await measure('stage',hero);
    for(const mode of ['endless','training']){
      const result=await measure(mode,hero);
      for(const key of Object.keys(stage))assert.deepEqual(result[key],stage[key],hero+' '+mode+' '+key);
    }
  }
  console.log('通过：三模式同成长三英雄、33武器四品级实际攻击、12技能施放与目标反馈、40兵种、7首领21招与召唤物对照');
})().catch(error=>{console.error(error);process.exitCode=1});
