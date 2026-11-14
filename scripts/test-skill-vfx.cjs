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
 assert.deepEqual(JSON.parse(JSON.stringify(COMMON_SKILLS.find(s=>s.id==='G03'))),{...baseline.sweep,killCharge:15},'G03的数值与机制保持既定A版基线');
 for(const [path,sha] of Object.entries(baseline.renderers))assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path)).digest('hex'),sha,path+' mechanism/renderer unchanged');
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
 const particles=new CombatParticles(),effects=new CommonSkillEffects(particles);const e={x:100,y:0,hp:1000,kind:'soldier',born:0};const host={x:0,y:0,angle:0,age:0,enemies:()=>[e],move(){},protect(){},clearSlow(){},hit(){},canHeal:()=>false,heal(){},sound(){}};const runtime=new CommonSkillRuntime(host,effects);runtime.cast('G01',100);assert.equal(runtime.hit(e,'G01',100,runtime.group('G01'),0),true,'acceptance gate does not change original eligibility/target return semantics');runtime.update(.01);assert.ok(!effects.visuals.some(v=>v.kind==='contact'),'rejected damage never fabricates contact');
 console.log('通过：12技能真实绘制与G03 A版基线不变、全部实际几何/有限坐标、绘制只读/视觉RNG/伤害不变、暂停与清池/姿态复位/屏外裁剪、32复用槽、拒绝命中无火花');
})().catch(e=>{console.error(e);process.exitCode=1;});
