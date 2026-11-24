const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const {load,newGame,cc}=require('./test-campaign.cjs'),{BossBattle,createBossState,bossFrame}=load('boss-battle'),{CHAPTERS,BOSS_ACTIONS,CHRONICLE_ENEMIES,chapterRoster}=load('chronicles'),{REFORGED_ACTIONS}=load('boss-roster');
function fixture(id,index=0){
 const ch=CHAPTERS.find(c=>c.bossId===id),boss={x:-250,y:0,hp:ch.bossHp*.45,maxHp:ch.bossHp,speed:ch.bossSpeed,attack:-1,attackAngle:0,bossSkin:id,bossTimers:[999,999,999],bossState:createBossState()},actors=[boss],state={time:0,x:0,y:0,hits:0,normalZones:0,normalShots:0,otherBusy:0,blocked:false,events:[]};
 const host={now:()=>state.time,target:()=>({x:state.x,y:state.y}),bounds:()=>({halfWidth:1000,halfHeight:600}),actors:()=>actors,normalZones:()=>state.normalZones,normalShots:()=>state.normalShots,otherBusy:()=>state.otherBusy,referenceDps:()=>ch.referenceDps,
  spawn:(kind,owner,x,y,hp)=>{const e={x,y,hp,maxHp:hp,speed:0,attack:-1,attackAngle:0};actors.push(e);return e;},hit:()=>{state.hits++;return true;},intercept:()=>state.blocked,release:(_,a)=>state.events.push(['release',a.name,state.time]),impact:kind=>state.events.push([kind,state.time])};
 const battle=new BossBattle(host);assert.ok(battle.start(boss,index,0));boss.bossTimers=[999,999,999];
 const advance=seconds=>{for(let time=0;time<seconds-1e-9;time+=.01){const dt=Math.min(.01,seconds-time);state.time+=dt;battle.updateBoss(boss,dt);for(const e of actors)if(e.hp>0&&e.bossUnit)battle.updateUnit(e,dt);battle.update(dt);}};
 return {ch,boss,actors,state,battle,advance};
}
(async()=>{
 assert.equal(CHAPTERS.map(c=>c.bossId).join(','),'zhangjiao,lvbu,dongzhuo,yuanshao,caocao,menghuo,simayi');assert.equal(BOSS_ACTIONS.length,7);const winePose=createBossState();Object.assign(winePose,{phase:'cast',index:1});assert.equal(bossFrame(winePose,'dongzhuo'),6,'滚钱不用抛酒坛姿态');winePose.index=2;assert.equal(bossFrame(winePose,'dongzhuo'),7,'酒池才用抛坛姿态');
 const first={};for(let c=1;c<=7;c++)for(let s=0;s<=3;s++)for(const id of chapterRoster(c,s))first[id]??=c;for(const d of CHRONICLE_ENEMIES)assert.equal(first[d.id],d.first);
 for(const [id,actions]of Object.entries(REFORGED_ACTIONS))for(let index=0;index<3;index++){
  const f=fixture(id,index);f.advance(actions[index].windup-.02);assert.equal(f.state.hits,0,id+' '+actions[index].name+' 蓄势无伤');assert.equal(f.state.events.filter(e=>e[0]==='release').length,0);f.advance(.04);assert.equal(f.state.events.filter(e=>e[0]==='release').length,1);assert.ok(f.battle.areaCount<=6);assert.ok(f.actors.length<=13);
 }
 const lightning=fixture('zhangjiao');lightning.advance(.86);assert.equal(lightning.state.hits,1);lightning.advance(.4);assert.equal(lightning.state.hits,1,'雷光余电不多扣血');
 const dodge=fixture('dongzhuo');dodge.state.x=200;dodge.advance(1.4);assert.equal(dodge.state.hits,0,'离开固定金印落点可躲');
 const seal=fixture('dongzhuo');seal.state.x=134;seal.advance(1.11);assert.equal(seal.state.hits,1,'印玺范围内');const outside=fixture('dongzhuo');outside.state.x=136;outside.advance(1.11);assert.equal(outside.state.hits,0,'印玺范围外');
 const coins=fixture('dongzhuo',1);coins.advance(3);assert.equal(coins.state.hits,0,'滚钱中央通道安全');
 const wine=fixture('dongzhuo',2);wine.state.x=90;wine.advance(1.94);assert.equal(wine.state.hits,0,'先落酒后点燃');wine.advance(.02);assert.equal(wine.state.hits,1);wine.advance(1);assert.equal(wine.state.hits,1,'火池不逐帧扣心');wine.advance(.3);assert.equal(wine.state.hits,2,'火池节拍1.2秒');
 const prison=fixture('zhangjiao',2),sigils=prison.actors.filter(e=>e.bossUnit);assert.equal(sigils.length,3);assert.equal(sigils[0].hp,84);sigils[0].hp=0;prison.advance(.01);assert.equal(prison.battle.hazards.filter(h=>h.active).length,1,'拆一雷符切断相邻两链');
 const lateChain=fixture('zhangjiao',2);lateChain.state.x=900;lateChain.state.y=500;lateChain.advance(1.96);const activeChain=lateChain.battle.hazards.find(h=>h.kind==='chain');lateChain.state.x=(activeChain.nodes[0].x+activeChain.nodes[1].x)/2;lateChain.state.y=(activeChain.nodes[0].y+activeChain.nodes[1].y)/2-4;lateChain.advance(.02);assert.equal(lateChain.state.hits,1,'雷链放出后进入实际电索仍会命中');lateChain.advance(.2);assert.equal(lateChain.state.hits,1,'同条雷链不逐帧命中');
 const bows=fixture('yuanshao',2);bows.advance(1.79);assert.equal(bows.state.events.filter(e=>e[0]==='arrow').length,0);bows.advance(.03);assert.equal(bows.state.events.filter(e=>e[0]==='arrow').length,4);bows.advance(2.7);assert.equal(bows.state.events.filter(e=>e[0]==='arrow').length,12,'三轮实体箭墙');
 const carts=fixture('yuanshao',1);assert.equal(carts.actors.filter(e=>e.bossUnit).length,2);assert.equal(carts.actors[1].hp,1950);carts.actors[1].hp=0;carts.advance(6);assert.equal(carts.state.events.filter(e=>e[0]==='bolt').length,6,'拆车阻止该车后续射击');
 const decoys=fixture('caocao',1);decoys.advance(1.46);assert.ok(Math.hypot(decoys.boss.x+250,decoys.boss.y)>119);assert.equal(decoys.actors.filter(e=>e.hp>0&&e.bossUnit?.kind==='decoy').length,2);assert.equal(decoys.boss.hp,decoys.ch.bossHp*.45,'换影不回血');decoys.advance(4.2);assert.equal(decoys.actors.filter(e=>e.hp>0&&e.bossUnit).length,0);
 const blades=fixture('caocao');blades.advance(3);assert.ok(blades.state.hits>=1,'银锋真实飞行命中');const shield=fixture('caocao');shield.state.blocked=true;shield.advance(3);assert.equal(shield.state.hits,0,'防御技能可挡敌方刃波');
 const boars=fixture('menghuo');assert.equal(boars.actors.filter(e=>e.bossUnit).length,4);assert.equal(boars.actors[1].hp,1500);boars.advance(.99);assert.ok(boars.actors.slice(1).every(e=>e.bossUnit.phase==='ready'));boars.advance(.7);assert.ok(boars.actors.slice(1).some(e=>e.x!==e.bossUnit.originX),'战猪真正移动');
 const wolves=fixture('menghuo',1);wolves.advance(1.85);const wolf=wolves.actors[1],locked=wolf.bossUnit.angle;wolves.state.y=300;wolves.advance(.4);assert.equal(wolf.bossUnit.angle,locked,'狼扑前锁向不追尾');assert.equal(wolf.bossUnit.phase,'windup');wolves.advance(.4);assert.equal(wolf.bossUnit.phase,'attack');
 const elephants=fixture('menghuo',2);assert.equal(elephants.actors[1].hp,3000);elephants.advance(2.1);assert.equal(elephants.actors[1].bossUnit.phase,'attack');assert.equal(elephants.actors[2].bossUnit.phase,'ready','第二象晚1.5秒，不同时封路');
 const dragons=fixture('simayi',1);dragons.advance(4);assert.equal(dragons.state.hits,0,'双龙中心通道确实安全');assert.equal(dragons.battle.hazards.filter(h=>h.active).length,2);const meteor=fixture('simayi',2);meteor.state.y=-180;meteor.advance(.89);assert.equal(meteor.state.hits,0);meteor.advance(.03);assert.equal(meteor.state.hits,1);assert.equal(meteor.battle.areaCount,3);
 console.log('通过：七Boss/21招、18新招蓄势无伤、落点/火池/缺口、雷符可拆、三轮箭墙/弩车、纸影/飞刃、三类兽群/阴阳双龙/星石');
 const g=await newGame();g.clearBattle();g.spawnClock=999;g.hurtPlayer=()=>{};g.px=g.py=0;
 for(const ch of CHAPTERS.filter(c=>c.bossId!=='lvbu')){
  g.clearBattle();const e=g.spawnNext('chief',undefined,ch.id);Object.assign(e,{born:0,x:-250,y:0,hp:e.maxHp*.45});g.updateChronicleBoss(e,.01,250,0);assert.equal(e.bossState.phase,'windup');assert.ok(e.art.spriteFrame);const state=JSON.stringify(e.bossState),ages=g.bossBattle.hazards.map(h=>h.age);e.stunUntil=g.age+5;g.updateEnemy(e,.5);g.bossBattle.update(.5);assert.equal(JSON.stringify(e.bossState),state);assert.deepEqual(g.bossBattle.hazards.map(h=>h.age),ages,'原5秒眩晕冻结施法与附属任务');e.stunUntil=0;
  g.paused=true;g.update(.5);assert.equal(JSON.stringify(e.bossState),state);g.paused=false;g.drawEnemy(e);g.drawEnemyZones();g.drawEnemyZones();assert.equal(JSON.stringify(e.bossState),state,'画两次不推进伤害');assert.deepEqual(g.bossBattle.hazards.map(h=>h.age),ages);
  for(const facing of [-1,1])for(const back of [false,true]){e.bossState.facing=facing;e.bossState.back=back;g.drawEnemy(e);assert.equal(Math.sign(e.art.node.scale.x),facing);assert.equal(e.art.spriteFrame,g.artFrames['boss-'+ch.bossId+'-action-'+bossFrame(e.bossState,e.bossSkin)]);}
  g.hitEnemy(e,0,1e9,0,'sandal',false,true);assert.equal(g.bossBattle.hazards.filter(h=>h.active).length,0);assert.equal(e.bossState,undefined);assert.equal(g.enemies.filter(e=>e.hp>0&&e.bossUnit).length,0);
 }
 g.clearBattle();const owner=g.spawnNext('chief',undefined,6);Object.assign(owner,{born:0,x:-250,y:0});g.bossBattle.start(owner,0,0);const summon=g.enemies.find(e=>e.bossUnit),kills=g.kills,charge=g.skillCharge;g.hitEnemy(summon,0,1e9,0,'sandal',false,true);assert.equal(g.kills,kills);assert.equal(g.skillCharge,charge);assert.equal(g.coins.filter(c=>c.active).length,0,'召唤物不刷经济或充能');
 g.clearBattle();const full=g.spawnNext('chief',undefined,1);Object.assign(full,{x:-250,y:0,born:0});full.bossTimers=[999,999,0];g.updateChronicleBoss(full,.01,250,0);assert.equal(full.bossState.phase,'idle','半血前第三招关闭');full.hp=full.maxHp*.49;g.updateChronicleBoss(full,.01,250,0);assert.equal(full.bossState.index,2);
 g.clearBattle();for(let i=0;i<80;i++){const e=g.spawnNext('chief',undefined,i%7+1);Object.assign(e,{x:-250+(i%5)*80,y:Math.floor(i/5)*3,born:0,hp:e.maxHp*.45});}
 for(let frame=0;frame<1200;frame++){g.age+=1/60;for(const e of g.enemies)if(e.hp>0)g.updateEnemy(e,1/60);g.bossBattle.update(1/60);g.updateEnemyZones(1/60);g.updateEnemyShots(1/60);assert.ok(g.bossBattle.areaCount+g.enemyZones.length<=6);assert.ok(g.bossBattle.shotCount+g.enemyShots.filter(s=>s.remaining>0).length<=80);assert.ok(g.enemies.filter(e=>e.hp>0).length<=80);const busy=g.enemies.filter(e=>e.hp>0&&(e.bossState&&e.bossState.phase!=='idle'||e.lvbu&&e.lvbu.phase!=='idle')).length;assert.ok(busy<=4,'演武混合首领共享4主招预算');}
 assert.ok(g.bossBattle.hazards.length<=86);g.drawEnemyZones();assert.ok(g.bossEffects.slots.length<=86);g.clearBattle();assert.ok(g.bossEffects.slots.every(s=>!s.sprite.node.active));
 const paperGame=await newGame();paperGame.clearBattle();const paperBoss=paperGame.spawnNext('chief',undefined,5);paperBoss.born=0;paperGame.bossBattle.start(paperBoss,1,0);for(const e of paperGame.enemies.filter(e=>e.bossUnit?.kind==='decoy')){paperGame.drawEnemy(e);assert.equal(e.art.color.value,240,'纸影首次显示必须应用纸色，不能继承复用前白色');}
 const base=await newGame();base.clearBattle();const b=base.spawnNext('chief',undefined,4);b.born=0;const machine=base.spawnNext('spearman','E35');machine.born=0;assert.equal(base.bossBattle.canStart(b,1),true);base.bossBattle.start(b,1,0);assert.equal(base.enemies.filter(e=>e.hp>0&&(e.bossUnit?.kind==='cart'||e.archetype==='E35')).length,2,'普通器械与Boss弩车共享2台预算');
 console.log('通过：真实组件接入/四向切帧/五秒眩晕与暂停/绘制只读/击杀清理/无额外充能金币/80混合Boss1200帧及全局池上限');
 const manifest=JSON.parse(fs.readFileSync('art/runtime-bosses/manifest.json'));
 assert.equal(manifest.atlases.length,8);
 assert.ok(manifest.rgbaMiB<=52,'全部图集总量，按关加载');
 const {BOSS_LAYOUTS}=load('boss-prop-layout');
 for(const atlas of manifest.atlases){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(atlas.dest)).digest('hex'),atlas.sha256);
  const {data,info}=await sharp(atlas.dest).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,atlas.width);assert.equal(info.height,atlas.height);
  assert.equal((await sharp(atlas.dest).metadata()).isPalette,false,'保留原色与轮廓半透明像素');
  for(const cell of atlas.cells){
   const [ox,oy,w,h]=cell.packed, [,,ow,oh]=cell.rect;
   const name=atlas.dest.split('/').pop().slice(0,-4);
   assert.deepEqual(Array.from(BOSS_LAYOUTS[name][cell.index]),[...cell.packed,ow,oh,cell.content[0]-2,cell.content[1]-2]);
   assert.deepEqual([ow,oh],require('./boss-density.cjs').frameSize(name,cell.index));
   assert.ok(info.width<=2048&&info.height<=2048);
   for(const prev of atlas.cells.slice(0,cell.index)){
    const [x,y,pw,ph]=prev.packed;
    assert.ok(ox+w<=x||x+pw<=ox||oy+h<=y||y+ph<=oy,'独立采样边界');
   }
   assert.ok(ox>=0&&oy>=0&&ox+w<=info.width&&oy+h<=info.height);
   let visible=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const alpha=data[((oy+y)*info.width+ox+x)*4+3];
    if(x<2||y<2||x>=w-2||y>=h-2)assert.equal(alpha,0,'透明留边 '+atlas.dest+':'+cell.index);
    if(alpha>100)visible++;
   }
   assert.ok(visible>400,'运行素材非空 '+atlas.dest+':'+cell.index);
  }
  if(atlas.dest.includes('-actions')){
   const cells=atlas.cells;
   assert.ok(Math.abs(cells[0].content[3]-cells[8].content[3])<=1,'转背不能缩小身体');
   for(const group of [[0,1,2,3,4],[8,9,10,11,12]])for(const i of group){
    assert.ok(Math.abs(cells[i].anchor[0]-cells[group[0]].anchor[0])<1.1);
    assert.ok(Math.abs(cells[i].anchor[1]-cells[group[0]].anchor[1])<1.1);
   }
  }
 }
 console.log('通过：六首领96帧、24战兽帧、16技能帧的原色、透明留边、动作注册与纹理预算');
})().catch(e=>{console.error(e);process.exitCode=1;});
