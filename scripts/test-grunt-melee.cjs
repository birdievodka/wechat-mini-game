const assert=require('node:assert/strict');
const {newGame,load,cc}=require('./test-campaign.cjs');
const {sampleGruntPose,GRUNT_MELEE}=load('grunt-melee'),{drawGruntAttack}=load('grunt-melee-effects');
const {archetypeFor}=load('chronicles');
(async()=>{
 const g=await newGame();g.clearBattle();g.cooldown=g.spawnClock=999;g.protectionTime=0;g.run.stageWave=1;
 const e=g.spawnNext('soldier','E01');Object.assign(e,{born:0,x:0,y:0,attack:-1,attackCooldown:0,hp:100000,maxHp:100000,speed:0});
 assert.equal(archetypeFor('E01').windup,GRUNT_MELEE.windup);
 // Real simulation contact path: overlap during anticipation must not hurt.
 const hp=g.playerHp;g.simulate(.1);assert.equal(g.playerHp,hp);assert.ok(e.attack>=0&&e.attack<GRUNT_MELEE.windup);assert.equal(e.art.spriteFrame,g.soldierFrames[e.weaponKind][6]);
 g.simulate(.2);assert.equal(g.playerHp,hp);g.simulate(.18);assert.equal(g.playerHp,hp-1,'抬手到0.48秒才扣一心');g.simulate(.1);assert.equal(g.playerHp,hp-1);assert.equal(e.art.spriteFrame,g.soldierFrames[e.weaponKind][7]);
 // Four headings and both actual weapon variants: distinct carry, raised, strike and recovered frames.
 for(let weapon=0;weapon<2;weapon++)for(let direction=0;direction<4;direction++){
  const angle=[-Math.PI/2,0,Math.PI/2,Math.PI][direction],row=direction===3?1:direction;e.weaponKind=weapon;e.direction=direction;e.attackAngle=angle;e.walk=0;e.moving=false;
  for(const [time,col]of [[-1,0],[.24,2],[.49,3],[.76,0]]){e.attack=time;g.drawEnemy(e);assert.equal(e.art.spriteFrame,g.soldierFrames[weapon][row*4+col]);assert.equal(Math.sign(e.art.node.scale.x),direction===3?-1:1);}
 }
 // Release is locked to the original heading: sidestep/retreat avoid the real hit.
 for(const [px,py]of [[-55,0],[0,95],[95,0]]){
  e.x=e.y=0;e.vx=e.vy=0;e.attack=0;e.attackAngle=0;e.attackCooldown=0;e.fired=false;g.px=55;g.py=0;g.updateChronicleEnemy(e,.2);g.px=px;g.py=py;g.hurtTime=0;const before=g.playerHp;g.updateChronicleEnemy(e,.3);assert.equal(g.playerHp,before,'侧移/绕背/超距不命中');assert.equal(e.attackAngle,0);assert.equal(e.direction,1);
 }
 e.attack=0;e.fired=false;e.attackAngle=0;e.x=e.y=0;e.vx=e.vy=0;g.px=55;g.py=0;g.hurtTime=0;const before=g.playerHp;g.updateChronicleEnemy(e,.49);assert.equal(g.playerHp,before-1);g.hurtTime=0;g.updateChronicleEnemy(e,.12);assert.equal(g.playerHp,before-1,'同次挥击只判一次');g.updateChronicleEnemy(e,.2);assert.equal(e.attack,-1);assert.ok(e.attackCooldown>0);
 // Draw calls do not advance combat; pose/output slot is reused and no new per-unit nodes exist.
 e.attack=.25;e.hp=1000;e.born=0;const state=[e.attack,e.hp,g.playerHp],count=e.node.children.length,pose=e.gruntPose;
 const fx=new cc.Graphics();for(let i=0;i<100;i++){g.drawEnemy(e);drawGruntAttack(fx,e.x,e.y,e.attack,e.attackAngle,70);}assert.deepEqual([e.attack,e.hp,g.playerHp],state);assert.equal(e.gruntPose,pose);assert.equal(e.node.children.length,count);
 g.paused=true;g.update(.2);assert.equal(e.attack,.25);g.paused=false;e.stunUntil=g.age+5;g.updateEnemy(e,.2);assert.equal(e.attack,.25);e.stunUntil=0;
 // Switching a pooled rig to E01 and back leaves one visible body, no stale pose or extra hands.
 e.hp=0;e.dead=0;const soldier=g.spawnNext('soldier','E02');soldier.born=0;g.drawEnemy(soldier);assert.equal(soldier.art.enabled,false);soldier.hp=0;soldier.dead=0;const again=g.spawnNext('soldier','E01');again.born=0;again.attack=-1;g.drawEnemy(again);assert.equal(again.art.enabled,true);assert.ok((again.npcRig?.parts||again.rigParts||[]).every(s=>!s.node.active));assert.equal(again.art.node.angle,0);
 g.clearBattle();g.px=g.py=0;g.playerHp=5;g.hurtTime=g.protectionTime=0;const other=g.spawnNext('soldier','E02');Object.assign(other,{born:0,x:0,y:0,speed:0,attackCooldown:999});g.simulate(.01);assert.equal(g.playerHp,5,'全部正式兵种只在出招时伤害');g.onDestroy();
 console.log('通过：黄巾农兵镰刀/锄头四向抬手与挥击/0.48秒后单次伤害/接触不偷扣血/锁向侧移与绕背/收招回正/暂停眩晕/表现只读/跨兵种复用');
})().catch(e=>{console.error(e);process.exitCode=1;});
