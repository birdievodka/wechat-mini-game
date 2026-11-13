const assert=require('node:assert/strict');
const {newGame,GameBootstrap,finishStartup,click,load,storage,Graphics,Node}=require('./test-campaign.cjs');
const {COMMON_SKILLS,skillKillRequirement}=load('common-skills');
const walk=n=>[n,...n.children.flatMap(walk)];
function enemy(g,x,y,kind='soldier'){const e=g.spawnNext(kind);Object.assign(e,{x,y,born:0,hp:1000000,maxHp:1000000,attackCooldown:999,speed:0,vx:0,vy:0});e.art.node.setPosition(0,0);e.node.setPosition(x,y);e.previousHitX=x;e.previousHitY=y+34;return e;}
function step(g,seconds){for(let i=0;i<Math.ceil(seconds*120);i++){g.age+=1/120;g.updateSkill(1/120);}}
(async()=>{
 assert.equal(COMMON_SKILLS.length,12);assert.equal(new Set(COMMON_SKILLS.map(s=>s.kind)).size,12);for(let i=0;i<COMMON_SKILLS.length;i++){const s=COMMON_SKILLS[i];assert.equal(s.powerRank,i+1);assert.equal(s.unlocked,true);assert.ok(s.killCharge>s.maxTargets||!s.factor);assert.equal(s.powerTier,Math.ceil(s.powerRank/2));assert.ok(skillKillRequirement(s.id,999)>=Math.ceil(s.killCharge*.55));}
 const removed=['G15','G02','G16','G04','G09','G11','G13','G17','G21','G24','G06','G14','G23','G05'];
 assert.deepEqual([...COMMON_SKILLS.map(s=>s.id)],['G08','G01','G03','G18','G10','G12','G20','G07','G25','G26','G19','G22']);
 const {availableSkill}=load('common-skills'),{createRun}=load('campaign'),{cc,Label}=require('./test-campaign.cjs');
 const deleted=await newGame();deleted.clearBattle();
 for(const id of removed){assert.equal(availableSkill(id),'G01');assert.equal(createRun('liubei','sandal',id).skillId,'G01');assert.equal(deleted.commonSkill.cast(id,100),false,id+' cannot be cast');}
 assert.equal(deleted.commonSkill.tasks.length,0);assert.equal(deleted.commonEffects.visuals.length,0);
 const snapshot=deleted.savePoint();
 for(const id of removed){const saved={schema:4,phase:'battle',point:JSON.parse(JSON.stringify(snapshot)),entry:JSON.parse(JSON.stringify(snapshot))};for(const p of [saved.point,saved.entry]){p.run.skillId=id;p.skill=54;}storage.set('taoyuan-chronicle-v7',JSON.stringify(saved));const migrated=load('chronicle-save').readSave(cc.sys.localStorage);for(const p of [migrated.point,migrated.entry]){assert.equal(p.run.skillId,'G01');assert.equal(p.skill,skillKillRequirement('G01'));}}
 deleted.onDestroy();
 const choices=new (load('SkillSelectView').SkillSelectView)(new Node('Menu'),{},'G15',()=>{},()=>{});
 assert.equal(walk(choices.root).filter(n=>n.name.startsWith('SkillChoice-')).length,12);
 assert.equal(choices.selected,'G01');click(choices.root,'SkillNext');assert.equal(walk(choices.root).filter(n=>n.name.startsWith('SkillChoice-')).length,12);click(choices.root,'SkillNext');assert.equal(choices.page,0);
 const codex=new (load('CodexView').CodexView)(new Node('Menu'),{},()=>{});click(codex.root,'Codex-技能');
 for(let i=0;i<COMMON_SKILLS.length;i++){if(i===12)click(codex.root,'Codex-›');const d=COMMON_SKILLS[i];click(codex.root,'CodexEntry-skill-'+d.icon);assert.ok(walk(codex.root).some(n=>n.getComponent(Label)?.string===d.effect),d.name+' icon and details stay aligned');assert.ok(!walk(codex.root).some(n=>removed.some(id=>n.name==='SkillChoice-'+id)));}
 const charges={G01:16,G03:22,G07:30,G08:20,G10:38,G12:40,G18:46,G19:52,G20:58,G22:56,G25:44,G26:50};for(const s of COMMON_SKILLS)assert.equal(s.killCharge,charges[s.id],'reordering never changes charge cost');
 const signatures=new Set();
 for(const s of COMMON_SKILLS){
  const g=await newGame('liubei');g.clearBattle();g.run.skillId=s.id;g.run.skillHealChapter=0;g.playerHp=s.kind==='heal'?4:5;g.px=g.py=g.heading=0;g.skillCharge=g.skillRequirement();
  const enemies=Array.from({length:20},(_,i)=>enemy(g,(i%5-2)*65,(Math.floor(i/5)-1.5)*50));
  g.castSkill();assert.equal(g.skillCharge,0,s.name+' consumes charge');const state=g.commonSkill;
  if(s.kind==='battle-haste'){assert.equal(state.hasteMultiplier,5);assert.equal(state.damageMultiplier,1);}
  let fills=0,strokes=0;const a=new Graphics(),b=new Graphics();a.fill=b.fill=()=>fills++;a.stroke=b.stroke=()=>strokes++;
  for(let frame=0;frame<60;frame++){g.age+=1/120;g.updateSkill(1/120);g.commonEffects.draw(a,b,0,0,667,375,g.px,g.py);}
  assert.ok(fills+strokes>0,s.name+' has a visible signature');signatures.add(s.kind+':'+fills+':'+strokes);
  step(g,6);
  if(s.factor>0&&!['battle-haste'].includes(s.kind))assert.ok(enemies.some(e=>e.hp<e.maxHp),s.name+' causes actual skill damage');
  if(s.kind==='heal')assert.equal(g.playerHp,5);assert.equal(g.skillCharge,0,'waiting does not recharge');assert.equal(state.tasks.length,0,s.name+' delayed tasks expire');assert.equal(g.commonEffects.visuals.length,0,s.name+' effect expires');g.onDestroy();
 }
 assert.equal(signatures.size,12);
 // G03 visual redesign must not widen its circle, hit twice or invent impacts.
 const sweep=await newGame();sweep.clearBattle();sweep.run.skillId='G03';sweep.px=sweep.py=sweep.heading=0;sweep.skillCharge=sweep.skillRequirement();
 const inside=enemy(sweep,249,0),outside=enemy(sweep,251,0),neutral=enemy(sweep,120,40),born=enemy(sweep,120,-40);neutral.animal='tree';born.born=.5;
 sweep.castSkill();step(sweep,1/120);const hp=inside.hp;
 assert.ok(hp<inside.maxHp);assert.equal(outside.hp,outside.maxHp);assert.equal(neutral.hp,neutral.maxHp);assert.equal(born.hp,born.maxHp);
 assert.equal(sweep.commonEffects.visuals.filter(v=>v.kind==='sweep-hit').length,1,'only real eligible hit creates a contact wedge');
 assert.ok(Math.abs(inside.vx-300)<.01,'unchanged outward knockback');assert.ok(Math.abs(sweep.commonSkill.sweepPose)>0);
 step(sweep,.1);assert.equal(inside.hp,hp,'ribbon layers never damage twice');
 const before=sweep.combatFx.particles.active,remaining=sweep.commonEffects.visuals.map(v=>v.age);
 const frame=new Graphics();let paths=0;frame.moveTo=frame.lineTo=(x,y)=>{assert.ok(Number.isFinite(x)&&Number.isFinite(y));paths++;};
 for(let i=0;i<8;i++)sweep.commonEffects.draw(frame,frame,0,0,667,375,0,0);
 assert.ok(paths>200,'filled blade geometry is drawn');assert.equal(sweep.combatFx.particles.active,before,'drawing does not emit particles');assert.deepEqual(sweep.commonEffects.visuals.map(v=>v.age),remaining,'drawing does not advance time');
 step(sweep,.31);assert.equal(inside.hp,hp);assert.equal(sweep.commonEffects.visuals.length,0);assert.equal(sweep.commonSkill.sweepPose,0,'pose and blade finish in 0.4 seconds');
 sweep.clearBattle();sweep.skillCharge=sweep.skillRequirement();sweep.castSkill();step(sweep,.01);assert.equal(sweep.commonEffects.visuals.filter(v=>v.kind==='sweep-hit').length,0,'empty cast does not fabricate contacts');sweep.onDestroy();
 const capped=await newGame();capped.clearBattle();capped.run.skillId='G03';capped.px=capped.py=0;capped.skillCharge=capped.skillRequirement();
 const crowd=Array.from({length:15},(_,i)=>enemy(capped,Math.cos(i)*180,Math.sin(i)*180));capped.castSkill();step(capped,.01);
 assert.equal(crowd.filter(e=>e.hp<e.maxHp).length,10,'G03 retains its ten-target cap');assert.equal(capped.commonEffects.visuals.filter(v=>v.kind==='sweep-hit').length,10);assert.ok(capped.combatFx.particles.active<=280);capped.onDestroy();
 const meteor=await newGame();meteor.clearBattle();meteor.run.skillId='G20';meteor.skillCharge=meteor.skillRequirement();const falling=enemy(meteor,150,0);meteor.castSkill();step(meteor,.3);assert.equal(falling.hp,falling.maxHp,'meteor cannot damage before visible landing');step(meteor,.07);assert.ok(falling.hp<falling.maxHp,'meteor applies damage at landing');meteor.onDestroy();
 const charged=await newGame();charged.clearBattle();charged.run.skillId='G03';charged.skillCharge=0;
 const unit=enemy(charged,90,0);unit.hp=1;charged.hitEnemy(unit,0,100,0,'sandal',false,true);assert.equal(charged.skillCharge,1,'skill kills count once');charged.hitEnemy(unit,0,100);assert.equal(charged.skillCharge,1);
 const boss=enemy(charged,90,0,'chief');boss.hp=1;charged.hitEnemy(boss,0,100);assert.equal(charged.skillCharge,1,'Boss not a minion charge');
 const object=enemy(charged,90,0);object.object='flag';object.hp=1;charged.hitEnemy(object,0,100);assert.equal(charged.skillCharge,1,'summoned objects cannot farm recharge');
 const tree=charged.spawnAnimal('pig');tree.animal='tree';tree.born=0;tree.hp=1;charged.hitEnemy(tree,0,100);assert.equal(charged.skillCharge,1,'neutral tree does not recharge');
 charged.skillCharge=charged.skillRequirement();for(let i=0;i<30;i++){const e=enemy(charged,90,0);e.hp=1;charged.hitEnemy(e,0,100);}assert.equal(charged.skillCharge,charged.skillRequirement(),'only one cast can be stored');
 const ui=new GameBootstrap();await ui.start();finishStartup(ui);click(ui.screens.root,'HeroSkillSelect');assert.ok(walk(ui.screens.root).some(n=>n.name==='SkillSelection'));click(ui.screens.root,'SkillChoice-G03');click(ui.screens.root,'ConfirmSkill');click(ui.screens.root,'kongming');storage.delete('taoyuan-chronicle-v7');click(ui.screens.root,'StartHero');assert.equal(ui.run.skillId,'G03','changing hero preserves chosen skill');assert.equal(ui.skillCharge,ui.skillRequirement());
 ui.skillCharge=7;const point=ui.savePoint();ui.writeSave('battle',point);const restored=load('chronicle-save').readSave(cc.sys.localStorage);assert.equal(restored.point.skill,7);assert.equal(restored.point.run.skillId,'G03');const old=JSON.parse(storage.get('taoyuan-chronicle-v7'));for(const p of [old.point,old.entry]){delete p.run.skillId;delete p.run.skillHealChapter;p.skill=28;}storage.set('taoyuan-chronicle-v7',JSON.stringify(old));const migrated=load('chronicle-save').readSave(cc.sys.localStorage);assert.equal(migrated.point.run.skillId,'G01');assert.equal(migrated.point.skill,skillKillRequirement('G01'));
 console.log('通过：12技能全部开放/综合强度与六档分级/充能独立于排序、实际机制/特效/延迟任务、暂停无时间充能、击杀过滤/上限、英雄与技能独立选择');
})().catch(e=>{console.error(e);process.exitCode=1;});
