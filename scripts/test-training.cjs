const assert=require('node:assert/strict');
const {newGame,click,load,storage,cc}=require('./test-campaign.cjs');
const {CHAPTERS,CHRONICLE_ENEMIES,BOSS_ACTIONS}=load('chronicles'),{WEAPONS}=load('weapons'),{COMMON_SKILLS}=load('common-skills');
const find=(n,name)=>n.name===name?n:n.children.map(c=>find(c,name)).find(Boolean);
const advance=(g,t)=>{for(let i=0;i<Math.ceil(t*60);i++)g.update(1/60);};
const progress=()=>JSON.stringify([...storage].filter(([k])=>k!=='taoyuan-runtime-health').sort());
(async()=>{
 const g=await newGame();g.run.gold=123;g.saveCheckpoint('battle');g.showMainMenu();const saved=progress();
 click(g.screens.root,'zhaoyun');click(g.screens.root,'HeroSkillSelect');click(g.screens.root,'SkillChoice-G03');click(g.screens.root,'ConfirmSkill');click(g.screens.root,'演武场');
 assert.equal(g.trainingMode,true);assert.equal(g.testMode,true);assert.equal(g.phase,'battle');assert.equal(g.trainingPanel.root.active,true);assert.equal(g.run.heroId,'zhaoyun');assert.equal(g.run.skillId,'G03');assert.equal(g.playerHp,5);assert.match(g.healthText.string,/∞/);assert.equal(g.trainingAlive(),0);assert.equal(progress(),saved,'进入演武场不覆盖正式存档');
 const panel=g.trainingPanel,at=[g.px,g.py,g.age];g.keys.add(cc.KeyCode.ARROW_RIGHT);advance(g,2);g.castSkill();assert.deepEqual([g.px,g.py,g.age],at,'配置面板冻结移动和模拟');assert.equal(g.skillCharge,g.skillRequirement());
 g.onBackground();g.onForeground();assert.equal(g.paused,false);assert.equal(g.menu.active,false);assert.equal(panel.root.active,true);
 click(panel.root,'TrainingCount-5');click(panel.root,'TrainingSpawn');assert.equal(g.trainingAlive(),5);assert.ok(g.enemies.filter(e=>e.hp>0).every(e=>e.archetype==='E01'&&e.born>0));
 click(panel.root,'TrainingTab-1');click(panel.root,'TrainingChoice-1-2');click(panel.root,'TrainingCount-1');click(panel.root,'TrainingSpawn');click(panel.root,'TrainingChoice-1-7');click(panel.root,'TrainingSpawn');
 const lvbu=g.enemies.find(e=>e.hp>0&&e.encounterChapter===2),simayi=g.enemies.find(e=>e.hp>0&&e.encounterChapter===7);assert.equal(lvbu.bossSkin,'lvbu');assert.equal(simayi.bossSkin,'simayi');assert.equal(lvbu.maxHp,CHAPTERS[1].bossHp);assert.equal(simayi.maxHp,CHAPTERS[6].bossHp);assert.equal(g.run.chapter,1,'混合首领不改全局章节');
 for(const [e,index]of [[lvbu,1],[simayi,6]]){e.born=0;e.x=g.px-100;e.y=g.py;e.attack=-1;e.bossTimers=[0,0,0];g.updateChronicleBoss(e,1/60,100,0);assert.equal(e.bossMove,BOSS_ACTIONS[index][0],'每名首领使用自己的动作表');}
 click(panel.root,'TrainingTab-2');click(panel.root,'TrainingTier-4');click(panel.root,'TrainingChoice-2-sandal');click(panel.root,'TrainingEquip');assert.equal(g.run.weapons[0].id,'sandal');assert.equal(g.run.weapons[0].tier,4);assert.equal(g.weapons[0].equipped.id,'sandal');
 click(panel.root,'TrainingSlot-1');click(panel.root,'TrainingEquip');assert.equal(g.run.weapons.length,2);click(panel.root,'TrainingUnequip');assert.equal(g.run.weapons.length,1);assert.ok(find(panel.root,'TrainingUnequip'));
 for(const w of WEAPONS)for(const tier of [1,2,3,4]){g.equipTrainingWeapon(w.id,tier,0);assert.equal(g.run.weapons[0].id,w.id);assert.equal(g.weapons[0].equipped.tier,tier);}
 for(let i=1;i<6;i++)g.equipTrainingWeapon('sword',4,i);assert.equal(g.run.weapons.length,6);assert.equal(new Set(g.run.weapons.map(w=>w.uid)).size,6);
 const weapons=JSON.stringify(g.run.weapons);for(const args of [['none',1,0],['sword',5,0],['sword',1,6],['sword',1,NaN]])g.equipTrainingWeapon(...args);assert.equal(JSON.stringify(g.run.weapons),weapons,'非法武器/品级/槽位无副作用');
 const host=panel.host;for(const skill of COMMON_SKILLS){host.skill(skill.id);assert.equal(g.run.skillId,skill.id);assert.equal(g.skillCharge,g.skillRequirement());}
 // Every real skill accepts consecutive casts with no kills, time or manual recharge.
 click(panel.root,'TrainingResume');const target=g.spawnNext('soldier','E01');target.born=0;target.hp=target.maxHp=1e9;
 const cast=g.commonSkill.cast;let accepted=0;g.commonSkill.cast=function(...args){const ok=cast.apply(this,args);if(ok)accepted++;return ok;};
 for(const skill of COMMON_SKILLS){host.skill(skill.id);target.x=g.px+80;target.y=g.py;target.node.setPosition(target.x,target.y);const before=accepted;g.skillCharge=0;g.castSkill();g.castSkill();assert.equal(accepted-before,2,skill.name+'无需充能可连放');assert.equal(g.skillCharge,g.skillRequirement());assert.match(g.skillLabel.string,/无冷却/);assert.ok(g.commonSkill.tasks.length<=36);assert.ok(g.commonEffects.visuals.length<=32);}
 g.openTrainingPanel();const blocked=accepted;g.castSkill();assert.equal(accepted,blocked,'面板仍禁止施法');
 host.skill('G03');click(panel.root,'TrainingResume');g.castSkill();assert.equal(g.skillCharge,g.skillRequirement(),'演武技能释放后仍就绪');assert.equal(g.playerHp,5);g.paused=true;g.menu.active=true;g.openTrainingPanel();assert.equal(g.paused,false,'从暂停进入配置后可正常继续');assert.equal(g.menu.active,false);click(panel.root,'TrainingRefill');assert.equal(g.skillCharge,g.skillRequirement());assert.equal(g.commonSkill.tasks.length,0,'重置按钮清除旧任务与效果');
 click(panel.root,'TrainingClear');assert.equal(g.trainingAlive(),0);assert.equal(g.enemyShots.filter(s=>s.remaining>0).length,0);assert.equal(g.enemyZones.length,0);assert.equal(g.run.weapons.length,6);click(panel.root,'TrainingResume');
 for(let i=0;i<100;i++){g.hurtTime=0;g.protectionTime=0;g.hurtPlayer(0,0,999);}assert.equal(g.playerHp,5,'任何来袭伤害不减生命');assert.equal(g.hurtTime,0,'无永久受击闪烁');
 advance(g,65);assert.equal(g.phase,'battle');assert.equal(g.trainingAlive(),0,'不随机出兵或中立物');assert.equal(g.run.elapsed,0);assert.equal(g.run.survivalSeconds,0);assert.equal(g.enemies.filter(e=>e.hp>0).length,0);assert.equal(progress(),saved,'长期演武不写正式记录');
 g.openTrainingPanel();for(const d of CHRONICLE_ENEMIES){g.addTrainingEnemies(d.id,1,false);assert.ok(g.enemies.some(e=>e.hp>0&&e.archetype===d.id));}assert.equal(g.trainingAlive(),40);g.addTrainingEnemies('1',80,true);assert.equal(g.trainingAlive(),80);g.addTrainingEnemies('E01',1,false);assert.equal(g.trainingAlive(),80,'混合敌军总上限80');
 for(const chapter of CHAPTERS){host.clear();g.addTrainingEnemies(String(chapter.id),1,true);const e=g.enemies.find(e=>e.hp>0);assert.equal(e.bossSkin,chapter.bossId);assert.equal(e.maxHp,chapter.bossHp);e.born=0;e.x=g.px-100;e.y=g.py;e.bossTimers=[0,0,0];g.updateChronicleBoss(e,1/60,100,0);assert.equal(e.bossMove,BOSS_ACTIONS[chapter.id-1][0]);}
 host.clear();g.addTrainingEnemies('7',1,true);const boss=g.enemies.find(e=>e.hp>0);boss.born=0;g.hitEnemy(boss,0,1e9,0,'sandal',false,true);assert.equal(g.run.chapter,1);assert.equal(g.victoryPending,false);assert.equal(g.phase,'battle','击败Boss不推进正式关卡');
 assert.equal(progress(),saved);click(panel.root,'TrainingExit');assert.equal(g.trainingMode,false);assert.equal(g.testMode,false);assert.equal(g.phase,'menu');assert.equal(progress(),saved,'退出保留原正式快照和最好成绩');
 click(g.screens.root,'StartHero');assert.equal(g.trainingMode,false);assert.equal(g.testMode,false);assert.equal(g.run.chapter,1);assert.equal(g.run.weapons.length,1);assert.equal(g.stats.maxHp,5);assert.equal(g.healthText.string,'');assert.equal(g.trainingButton.node.parent.active,false);g.hurtTime=0;g.protectionTime=0;g.hurtPlayer(50,0);assert.equal(g.playerHp,4,'正式闯关恢复正常受伤');
 g.run.skillId='G03';g.skillCharge=g.skillRequirement();g.castSkill();assert.equal(g.skillCharge,0,'正式技能仍消耗充能');const tasks=g.commonSkill.tasks.length;g.castSkill();assert.equal(g.commonSkill.tasks.length,tasks,'正式未充能不能连放');assert.ok(!g.skillLabel.string.includes('无冷却'),'切回正式HUD恢复充能提示');
 console.log('通过：演武入口/配置冻结、40兵和7场Boss配置/混合独立技能、36武器四阶六槽/12技能、无限生命/12技能无冷却连放/效果重置/清场、80上限、正式存档隔离与退出恢复');
})().catch(e=>{console.error(e);process.exitCode=1;});
