const assert=require('node:assert/strict');
const fs=require('node:fs');
const {newGame,load,Graphics}=require('./test-campaign.cjs');
const {COMMON_SKILLS}=load('common-skills');
const {CommonSkillRuntime}=load('CommonSkillRuntime');
const {CommonSkillEffects}=load('CommonSkillEffects');
const {CombatParticles}=load('combat-particles');
function target(g,x,y){const e=g.spawnNext('soldier');Object.assign(e,{x,y,born:0,hp:1e6,maxHp:1e6,speed:0,attackCooldown:999,vx:0,vy:0});e.node.setPosition(x,y);return e;}
function step(g,t){for(let i=0;i<Math.ceil(t*120);i++){g.age+=1/120;g.updateSkill(1/120);g.combatFx.update(1/120);}}
function recorder(){const g=new Graphics(),commands=[];for(const name of ['moveTo','lineTo','bezierCurveTo','ellipse','circle','arc','rect','roundRect'])g[name]=(...a)=>{assert.ok(a.every(x=>typeof x!=='number'||Number.isFinite(x)),name+' finite geometry');commands.push([name,...a]);};g.fill=()=>commands.push(['fill']);g.stroke=()=>commands.push(['stroke']);return {g,commands};}
(async()=>{
 // This is a baseline-preservation test for this redesign, not a moving Git HEAD constraint.
 const baseline=JSON.parse(fs.readFileSync('scripts/fixtures/skill-vfx-baseline.json','utf8'));
 for(const [path,sha] of Object.entries(baseline))assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path)).digest('hex'),sha,path+' mechanism/renderer unchanged');
 for(const skill of COMMON_SKILLS){
  const g=await newGame();g.clearBattle();g.run.skillId=skill.id;g.playerHp=skill.kind==='heal'?4:5;g.px=g.py=g.heading=0;g.skillCharge=g.skillRequirement();
  for(let i=0;i<20;i++)target(g,(i%5-2)*55,(Math.floor(i/5)-1.5)*65);
  g.castSkill();step(g,skill.kind==='backstab'?.06:skill.kind==='retreat'?.3:skill.kind==='meteor'?.4:.14);
  const snap=JSON.stringify(g.commonEffects.visuals),hp=g.enemies.map(e=>e.hp),rng=g.combatFx.particles.seed,particles=g.combatFx.particles.active,poseTime=g.commonSkill.poseTime;
  const a=recorder(),b=recorder();for(let i=0;i<4;i++)g.commonEffects.draw(a.g,b.g,0,0,667,375,g.px,g.py);
  assert.ok(a.commands.length+b.commands.length>0,skill.name+' actual geometry');assert.equal(JSON.stringify(g.commonEffects.visuals),snap,'draw read-only');assert.deepEqual(g.enemies.map(e=>e.hp),hp);assert.equal(g.combatFx.particles.seed,rng);assert.equal(g.combatFx.particles.active,particles);assert.equal(g.commonSkill.poseTime,poseTime);
  const off=recorder();g.commonEffects.draw(off.g,off.g,1e6,1e6,667,375,g.px,g.py);assert.equal(off.commands.length,0,'offscreen produces no geometry');
  g.paused=true;const ages=g.commonEffects.visuals.map(v=>v.age);g.update(2);assert.deepEqual(g.commonEffects.visuals.map(v=>v.age),ages);g.paused=false;
  const pool=g.commonEffects.pool;assert.equal(pool.length,32);const slots=[...pool];g.clearBattle();assert.equal(g.commonEffects.visuals.length,0);assert.equal(g.commonSkill.castPose.body,0);assert.equal(g.commonEffects.targets.length,0);
  for(let i=0;i<200;i++)g.commonEffects.play('G08','arrow',0,0,0,80,.3,80,0);assert.equal(g.commonEffects.visuals.length,32);assert.ok(g.commonEffects.pool.every((v,i)=>v===slots[i]),'pool identities never grow');g.onDestroy();
 }
 const shield=await newGame();shield.clearBattle();shield.run.skillId='G04';shield.skillCharge=999;shield.castSkill();assert.equal(shield.commonEffects.visuals.find(v=>v.kind==='shield').count,2);shield.commonSkill.block();assert.equal(shield.commonEffects.visuals.find(v=>v.kind==='shield').count,1);shield.commonSkill.block();assert.ok(!shield.commonEffects.visuals.some(v=>v.kind==='shield'));shield.onDestroy();
 const haste=await newGame();haste.clearBattle();haste.run.skillId='G09';haste.skillCharge=999;haste.castSkill();assert.equal(haste.commonEffects.visuals.find(v=>v.kind==='shield').count,1);step(haste,3.1);assert.ok(!haste.commonEffects.visuals.some(v=>v.kind==='shield'));assert.equal(haste.commonSkill.hasteMultiplier,1.2);haste.onDestroy();
 const boat=await newGame();boat.clearBattle();boat.run.skillId='G11';boat.skillCharge=999;target(boat,80,0);target(boat,90,60);target(boat,95,-60);boat.castSkill();const sail=boat.commonEffects.visuals.find(v=>v.kind==='catch');assert.equal(sail.count,0);for(let i=0;i<3;i++){assert.ok(boat.commonSkill.interceptShot(-160,24,0,24,'E12'));assert.equal(sail.count,i+1);}let returned=0;const play=boat.commonEffects.play.bind(boat.commonEffects);boat.commonEffects.play=(id,kind,...a)=>{if(kind==='arrow')returned++;return play(id,kind,...a);};step(boat,2.5);assert.equal(returned,3,'returns exactly the three intercepted arrows');boat.onDestroy();
 const particles=new CombatParticles(),effects=new CommonSkillEffects(particles);const e={x:100,y:0,hp:1000,kind:'soldier',born:0};const host={x:0,y:0,angle:0,age:0,enemies:()=>[e],move(){},protect(){},clearSlow(){},hit(){},canHeal:()=>false,heal(){},sound(){}};const runtime=new CommonSkillRuntime(host,effects);runtime.cast('G02',100);assert.equal(runtime.hit(e,'G02',100,runtime.group('G02'),0),true,'acceptance gate does not change original eligibility/target return semantics');runtime.update(.01);assert.ok(!effects.visuals.some(v=>v.kind==='contact'),'rejected damage never fabricates contact');
 const speed=await newGame();speed.clearBattle();speed.run.skillId='G15';speed.skillCharge=999;speed.castSkill();step(speed,.2);assert.equal(speed.commonEffects.visuals.find(v=>v.kind==='speed-buff').moving,false);speed.px+=8;step(speed,1/120);assert.equal(speed.commonEffects.visuals.find(v=>v.kind==='speed-buff').moving,true);speed.onDestroy();
 const paper=await newGame();paper.clearBattle();paper.run.skillId='G14';paper.skillCharge=999;target(paper,150,0);paper.castSkill();step(paper,.24);const orig=paper.commonEffects.visuals.find(v=>v.kind==='summon');assert.ok(orig.paperShots[0]<.1,'actual shot animates its paper soldier');paper.px=200;assert.equal(orig.x,0,'paper visual retains cast position matching actual task origins');paper.onDestroy();
 console.log('通过：23项与G03机制定义不变、全部实际几何/有限坐标、绘制只读/视觉RNG/伤害不变、暂停与清池/姿态复位/屏外裁剪、32复用槽、双盾2→1→0、单甲3秒/急速6秒、收箭0→3/等量回射、拒绝命中无火花、静止无疾跑轨迹、纸兵出手与真实源点一致');
})().catch(e=>{console.error(e);process.exitCode=1;});
