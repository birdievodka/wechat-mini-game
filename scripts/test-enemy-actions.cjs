const assert=require('node:assert/strict'),fs=require('node:fs'),sharp=require('sharp'),crypto=require('node:crypto');
const {newGame,load,cc}=require('./test-campaign.cjs');
const A=load('enemy-actions'),{CHRONICLE_ENEMIES}=load('chronicles'),{bossFrame,createBossState}=load('boss-battle');
(async()=>{
 const g=await newGame();g.clearBattle();g.cooldown=g.spawnClock=999;g.protectionTime=0;g.hurtTime=0;g.playerHp=5;g.weapons.forEach(w=>w.cooldown=999);
 for(const d of CHRONICLE_ENEMIES){
  g.clearBattle();const e=g.spawnNext(d.kind,d.id);Object.assign(e,{x:-30,y:0,born:0,hp:1e6,maxHp:1e6,attack:-1,attackCooldown:999,speed:0,vx:0,vy:0});g.px=g.py=0;g.playerHp=5;g.protectionTime=g.hurtTime=0;g.simulate(.01);assert.equal(g.playerHp,5,d.id+'接触不越过起手扣血');
  const spec=A.enemyActionSpec(d.id),p=A.createActionPose();
  for(let dir=0;dir<4;dir++)for(const t of [-1,0,d.windup*.5,d.windup-.01,d.windup+.01,d.windup+.2,d.windup+.5]){
   const angle=[-Math.PI/2,0,Math.PI/2,Math.PI][dir];const state=[e.x,e.y,e.hp,e.attack,g.playerHp];A.sampleEnemyAction(p,spec,t,d.windup,angle,78,1,true);assert.ok(Object.values(p).every(Number.isFinite),d.id+'姿态有限');if(t>=0&&t<d.windup){assert.equal(p.release,0);assert.equal(p.phase,1);}
   Object.assign(e,{direction:dir,attack:t,attackAngle:angle,moving:true});g.drawEnemy(e);assert.equal(Math.sign(e.art.node.scale.x),dir===3?-1:1);assert.equal(e.attack,t);assert.deepEqual([e.x,e.y,e.hp,g.playerHp],[state[0],state[1],state[2],state[4]]);
  }
  if(d.id!=='E01'){assert.ok(e.npcRig);const parts=e.npcRig.parts,count=e.art.node.children.length,pose=e.npcRig.pose;for(let i=0;i<30;i++)g.drawEnemy(e);assert.equal(e.npcRig.parts,parts);assert.equal(e.npcRig.pose,pose);assert.equal(e.art.node.children.length,count);assert.ok(parts.every(s=>!s.node.getComponent(cc.Graphics)),'动作不新增逐兵Graphics');}
  // Freeze the actual attack clock through stun and pause.
  e.attack=.1;e.stunUntil=g.age+3;g.updateEnemy(e,.2);assert.equal(e.attack,.1);e.stunUntil=0;g.paused=true;g.update(.2);assert.equal(e.attack,.1);g.paused=false;
 }
 const ready=A.sampleEnemyAction(A.createActionPose(),A.enemyActionSpec('E02'),-1,.44,0,78,0,false),settled=A.sampleEnemyAction(A.createActionPose(),A.enemyActionSpec('E02'),.44+.3,.44,0,78,0,false);assert.ok(Math.abs(ready.weaponAngle-settled.weaponAngle)<.001,'收招连续回到握持角，不突然横刀变竖刀');
 // Actual melee hit: held windup, lock direction, one release, and sidestep escape.
 for(const id of ['E02','E03','E04','E05','E08','E26','E27'])for(const escape of [false,true]){
  g.clearBattle();const d=CHRONICLE_ENEMIES.find(d=>d.id===id),e=g.spawnNext(d.kind,id);Object.assign(e,{born:0,x:-40,y:0,hp:1e6,attack:0,attackAngle:0,attackCooldown:999,speed:0,vx:0,vy:0,fired:false});g.px=0;g.py=0;g.playerHp=5;g.protectionTime=g.hurtTime=0;
  g.updateChronicleEnemy(e,d.windup-.02);assert.equal(g.playerHp,5);if(escape)g.py=180;g.updateChronicleEnemy(e,.025);assert.equal(g.playerHp,escape?5:4,id+'伤害对应出手');g.hurtTime=0;g.updateChronicleEnemy(e,.08);assert.equal(g.playerHp,escape?5:4,id+'一次释放只伤一次');assert.equal(e.attackAngle,0);assert.equal(e.direction,1);
 }
 // Projectile emission starts at the exact same raised-weapon boundary.
 for(const id of ['E11','E12','E13','E14','E15','E16','E17','E18','E22','E23','E28','E31','E32','E35']){
  g.clearBattle();const d=CHRONICLE_ENEMIES.find(d=>d.id===id),e=g.spawnNext(d.kind,id);Object.assign(e,{born:0,x:-200,y:0,hp:1e6,attack:0,attackAngle:0,attackCooldown:999,speed:0,vx:0,vy:0,fired:false});g.px=g.py=0;g.updateChronicleEnemy(e,d.windup-.005);assert.equal(g.enemyShots.filter(s=>s.remaining>0).length,0,id+'不早放');g.updateChronicleEnemy(e,.01);assert.ok(g.enemyShots.some(s=>s.remaining>0),id+'按时放弹');
 }
 // All seven bosses also cannot cause invisible body-contact damage during a held idle.
 for(let chapter=1;chapter<=7;chapter++){g.clearBattle();const e=g.spawnNext('chief',undefined,chapter);Object.assign(e,{born:0,x:0,y:0,hp:1e6,maxHp:1e6,attack:-1,attackCooldown:999,bossTimers:[999,999,999],speed:0});g.px=g.py=0;g.playerHp=5;g.protectionTime=g.hurtTime=0;g.simulate(.01);assert.equal(g.playerHp,5,'首领贴身不偷扣血 '+chapter);}
 // Boss recovery returns to neutral before movement resumes, every direction.
 for(const back of [false,true])for(const id of ['zhangjiao','dongzhuo','yuanshao','caocao','menghuo','simayi']){
  const s=createBossState();s.back=back;s.phase='windup';assert.equal(bossFrame(s,id),(back?8:0)+5);s.phase='recover';s.time=.7;assert.equal(bossFrame(s,id),back?8:0);
 }
 g.clearBattle();for(let i=0;i<80;i++){const d=CHRONICLE_ENEMIES[i%40],e=g.spawnNext(d.kind,d.id);Object.assign(e,{born:0,hp:1e6,attack:d.windup*.7});g.drawEnemy(e,true);}const counts=g.enemies.map(e=>e.node.children.length);for(let j=0;j<10;j++)g.enemies.forEach(e=>g.drawEnemy(e,true));assert.deepEqual(g.enemies.map(e=>e.node.children.length),counts);assert.equal(g.enemies.filter(e=>e.hp>0).length,80);g.onDestroy();
 const m=JSON.parse(fs.readFileSync('art/runtime-enemy-actions/manifest.json'));let bytes=0,decoded=0;for(const a of Object.values(m.atlases)){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(a.file)).digest('hex'),a.sha256);const {data,info}=await sharp(a.file).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,480);assert.equal(info.height,1248);decoded+=info.width*info.height*4;bytes+=a.bytes;for(let i=0;i<60;i++){let visible=0;for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(data[((Math.floor(i/5)*96+y)*480+i%5*96+x)*4+3]>32)visible++;assert.ok(visible>30,'身体/立绘/武器格非空 '+i);}}
 assert.ok(bytes<1024*1024);assert.ok(decoded<10*1024*1024);assert.equal(m.gearBounds.length,43);console.log('通过：40兵×4向×7阶段/动作只读与复用/近战抬手单次释放与绕背/14远程准时放弹/全兵无偷接触伤害/暂停眩晕/6Boss收招/80兵无新增Graphics/模块化图集<1MiB');
})().catch(e=>{console.error(e);process.exitCode=1;});
