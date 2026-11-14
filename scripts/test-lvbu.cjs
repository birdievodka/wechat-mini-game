const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const {load,newGame,click,cc}=require('./test-campaign.cjs');
const {LVBU_ACTIONS,createLvbuState,startLvbuMove,updateLvbu,lvbuFrame,lvbuBusy,LVBU_EVENT}=load('lvbu-boss');
const {BOSS_ACTIONS,CHAPTERS}=load('chronicles');
const actor=()=>({x:-300,y:0,hp:1000,maxHp:1000,speed:100,attack:-1,attackAngle:0,bossTimers:[0,0,0],bossNext:0});
const step=(e,s,dt=.01,tx=0,ty=0,hw=1000,hh=600)=>updateLvbu(e,s,dt,tx,ty,hw,hh);
const run=(e,s,seconds,tx=0,ty=0)=>{let hits=0,releases=0;for(let t=0;t<seconds-1e-8;t+=.01){step(e,s,Math.min(.01,seconds-t),tx,ty);hits+=s.requestHit?1:0;releases+=s.events&LVBU_EVENT.release?1:0;}return {hits,releases};};
(async()=>{
 assert.equal(BOSS_ACTIONS[1],LVBU_ACTIONS);assert.equal(CHAPTERS.filter(c=>c.bossId==='lvbu').length,1);
 assert.equal(CHAPTERS[1].bossSpeed,220);
 const trot=actor(),ts=createLvbuState();trot.x=-650;trot.speed=220;trot.bossTimers=[999,999,999];let transitions=0,last=-1;
 for(let i=0;i<120;i++){step(trot,ts,1/120);const frame=lvbuFrame(ts,i,true);assert.ok(frame>=12&&frame<=15,'普通追赶只用独立小跑帧');if(frame!==last){if(last>=0)transitions++;last=frame;}}
 assert.ok(trot.x>-460&&trot.x<-445,'一秒追赶约196单位，包含自然起步');assert.ok(transitions>=4&&transitions<=7,'一步周期稳定，不以15Hz切整身冲锋姿势');
 const at=trot.x;run(trot,ts,.5);assert.ok(Math.abs(trot.x-at-110)<.5,'稳定追赶速度220');
 const easing=actor(),easeState=createLvbuState();easing.x=-180;easing.speed=220;easing.bossTimers=[999,999,999];easeState.moveSpeed=220;easeState.chasing=true;let braking=false;
 for(let i=0;i<60;i++){step(easing,easeState,1/120);if(easing.x>-170&&easing.x<-156){assert.ok(easeState.moveSpeed<220,'接近停步点之前已开始制动');braking=true;}}
 assert.ok(braking);assert.ok(Math.abs(easing.x+155)<.01);
 run(trot,ts,3);assert.ok(Math.abs(trot.x+155)<.01);const settled=trot.x;
 for(let i=0;i<120;i++){step(trot,ts,1/120,10*Math.sin(i*.1),0);assert.equal(trot.x,settled,'接近玩家后的小幅距离变化不反复走停');assert.equal(lvbuFrame(ts,Math.random()*100,true),12,'残余物理移动不抖动腿部动画');}
 const turn=actor(),turnState=createLvbuState();turn.x=0;turn.bossTimers=[999,999,999];
 for(let i=0;i<90;i++){step(turn,turnState,1/120,Math.sin(i)*10,1000);assert.equal(turnState.facing,1,'近乎垂直追赶不左右抽搐');assert.equal(turnState.back,true);assert.ok(lvbuFrame(turnState,0,true)>=16);}
 console.log('通过：220/230常速、加减速、独立四步小跑/步频上限、追赶停步滞回、四向稳定面向');
 const e=actor(),s=createLvbuState();startLvbuMove(e,s,0,0);
 assert.equal(run(e,s,.89).hits,0);assert.equal(e.x,-300,'蓄势不位移');assert.equal(s.phase,'windup');
 step(e,s,.01,300,150);assert.equal(e.attackAngle,0,'锁向后不追尾');
 const damage=run(e,s,.7,0,0);assert.equal(damage.hits,1,'连续冲锋最多一次命中');assert.equal(s.phase,'recover');assert.ok(Math.abs(e.x-180)<.01,'480单位冲程');assert.ok(e.attack>0);
 run(e,s,1.06,0,0);assert.equal(s.phase,'idle');assert.equal(e.attack,-1);assert.ok(e.bossTimers.every(t=>t>.5),'收招之后仍有安全间隔');
 const lateral=actor(),ls=createLvbuState();startLvbuMove(lateral,ls,0,0);assert.equal(run(lateral,ls,1.6,0,100).hits,0,'侧闪出冲锋宽度安全');
 const slow=actor(),ss=createLvbuState();startLvbuMove(slow,ss,0,0);step(slow,ss,1.6,0,0);assert.equal(ss.requestHit,true,'慢帧跨前摇和冲程仍连续命中');assert.ok(Math.abs(slow.x-180)<.01);
 const edge=actor(),es=createLvbuState();edge.x=380;startLvbuMove(edge,es,0,0);step(edge,es,1.6,999,0,500,600);assert.equal(edge.x,435);assert.equal(es.phase,'recover','撞地图边缘提前勒马');
 assert.equal(LVBU_ACTIONS[1].range,300);assert.equal(LVBU_ACTIONS[1].windup,1);
 for(const [x,y,expected]of [[150,12,1],[-285,12,0],[285,12,1],[317,12,1],[320,12,0],[0,292,1],[0,-268,1]]){
  const a=actor(),b=createLvbuState();a.x=0;startLvbuMove(a,b,1,0);assert.equal(run(a,b,.99,x,y).hits,0,'扩大扫击的整段1秒预告无伤');
  assert.equal(run(a,b,.44,x,y).hits,expected,`300半径实刃/后方60度缺口/身体边界 ${x},${y}`);
 }
 const upwards=actor(),upState=createLvbuState();upwards.x=0;startLvbuMove(upwards,upState,1,Math.PI/2);assert.equal(run(upwards,upState,1.44,0,297).hits,1,'向上横扫同样覆盖新增范围');
 const {drawLvbuEffects}=load('lvbu-effects'),points=[],graphic=()=>({moveTo:(x,y)=>points.push([x,y]),lineTo:(x,y)=>points.push([x,y]),ellipse(){},close(){},fill(){},stroke(){}});
 const visual=createLvbuState();Object.assign(visual,{phase:'sweep',index:1,time:.4});const snapshot=JSON.stringify(visual);drawLvbuEffects(graphic(),graphic(),0,-42,0,visual);
 assert.equal(JSON.stringify(visual),snapshot,'扩大刀光只读模拟状态');assert.ok(points.every(([x,y])=>Math.hypot(x,y)<=300.01),'刀光装饰不超出新增外缘');
 assert.ok(Math.max(...points.map(p=>p[0]))>299&&Math.max(...points.map(p=>p[1]))>299&&Math.min(...points.map(p=>p[1]))<-299,'实际绘制的宽厚弧面覆盖300范围');
 points.length=0;Object.assign(visual,{phase:'windup',time:.9,windup:1});drawLvbuEffects(graphic(),graphic(),0,-42,0,visual);
 const edgePoints=points.filter(([x,y])=>Math.hypot(x,y)>285);assert.ok(edgePoints.length>40);assert.ok(edgePoints.every(([x,y])=>Math.abs(Math.atan2(y,x))<=Math.PI*5/6+.001),'新增预告外缘与后方60度缺口一致');
 const chain=actor(),cs=createLvbuState();chain.hp=400;startLvbuMove(chain,cs,2,0);let releases=0,windups=0;const angles=[];
 for(let f=0;f<850&&cs.phase!=='idle';f++){
  const old=cs.phase,tx=cs.leg===0?0:cs.leg===1?-100:200,ty=cs.leg===0?0:cs.leg===1?200:-150;
  step(chain,cs,.01,tx,ty);if(cs.events&LVBU_EVENT.release){releases++;angles.push(chain.attackAngle);}if(old==='recover'&&cs.phase==='windup'){windups++;assert.equal(cs.windup,.65);}
 }
 assert.equal(releases,3);assert.equal(windups,2);assert.equal(new Set(angles.map(a=>a.toFixed(2))).size,3,'每段重新瞄准而非无预告折返');
 const full=actor(),fs0=createLvbuState();full.bossTimers=[99,99,0];step(full,fs0);assert.equal(fs0.phase,'idle','半血前第三招关闭');full.hp=499;step(full,fs0);assert.equal(fs0.index,2);assert.equal(fs0.phase,'windup');
 const denied=actor(),ds=createLvbuState();updateLvbu(denied,ds,.01,0,0,1000,600,false);assert.equal(ds.phase,'idle','全场危险预算满时不出手');
 console.log('通过：吕布三招前摇/锁向/480冲程/侧闪/CCD/边界勒马/300度回旋实刃与安全区/三次重新蓄势/半血门槛');

 const g=await newGame();g.clearBattle();g.px=0;g.py=0;g.spawnClock=999;g.cooldown=999;
 const boss=g.spawnNext('chief',undefined,2);Object.assign(boss,{x:-300,y:0,born:0,bornTotal:1.5});boss.node.setPosition(boss.x,boss.y);
 g.updateChronicleBoss(boss,.01,300,0);assert.equal(boss.lvbu.phase,'windup');const state=JSON.stringify(boss.lvbu),hp=g.playerHp,save=JSON.stringify(g.run);
 for(let i=0;i<5;i++){g.drawEnemy(boss);g.drawEnemyZones();}assert.equal(JSON.stringify(boss.lvbu),state,'绘制不推进生命周期');assert.equal(boss.lvbuGhosts.length,2);assert.equal(g.playerHp,hp);assert.equal(JSON.stringify(g.run),save);
 g.paused=true;g.update(2);assert.equal(JSON.stringify(boss.lvbu),state,'暂停冻结技能');g.paused=false;
 boss.stunUntil=g.age+5;g.updateEnemy(boss,.5);assert.equal(JSON.stringify(boss.lvbu),state,'5秒眩晕不被重制免疫');boss.stunUntil=0;
 g.hurtTime=g.protectionTime=0;for(let i=0;i<170;i++){g.age+=.01;g.updateEnemy(boss,.01);}assert.equal(g.playerHp,hp-1,'真实受伤入口每招一心');assert.ok(boss.lvbu.contactLife>=0);
 assert.ok(boss.art.spriteFrame===g.artFrames['lvbu-action-'+lvbuFrame(boss.lvbu,boss.walk,boss.moving)]);
 for(const facing of [1,-1])for(const back of [false,true]){boss.lvbu.facing=facing;boss.lvbu.back=back;g.drawEnemy(boss);assert.equal(Math.sign(boss.art.node.scale.x),facing);assert.ok(boss.art.spriteFrame===g.artFrames['lvbu-action-'+lvbuFrame(boss.lvbu,boss.walk,boss.moving)]);}
 g.hitEnemy(boss,0,1e9,0,'sandal',false,true);assert.equal(boss.lvbu,undefined);assert.ok(boss.lvbuGhosts.every(sp=>!sp.node.active));boss.dead=0;
 const reused=g.spawnNext('soldier','E01');assert.equal(reused,boss);assert.equal(reused.lvbu,undefined);assert.ok(reused.lvbuGhosts.every(sp=>!sp.node.active));assert.equal(reused.art.enabled,true,'复用回E01完整农具动作');assert.equal(reused.art.spriteFrame,g.soldierFrames[reused.weaponKind][0]);assert.equal(reused.art.node.getComponent(cc.UITransform).width,78,'清掉吕布300px展示尺寸');
 for(let i=0;i<5;i++){g.clearBattle();const same=g.spawnNext('chief',undefined,2);assert.equal(same.art.node.getComponent(cc.UITransform).width,300,'连续复用吕布出生时不能退回145尺寸');assert.equal(same.lvbuGhosts.length,2);}
 g.clearBattle();const big=g.spawnNext('chief',undefined,2);Object.assign(big,{x:0,y:0,born:0,previousHitX:0,previousHitY:88});big.art.node.setPosition(0,0);
 const before=big.hp;g.launchProjectile(-150,168,0,g.run.weapons[0],{...g.weapons[0].stats,speed:1000,range:400},50);g.updateProjectiles(.3);assert.ok(big.hp<before,'放大骑将头身区域仍能被飞鞋命中');
 const outside=big.hp;big.previousHitX=0;big.previousHitY=88;g.launchProjectile(-150,235,0,g.run.weapons[0],{...g.weapons[0].stats,speed:1000,range:400},50);g.updateProjectiles(.3);assert.equal(big.hp,outside,'头盔羽毛上方掠过不算命中');
 g.showMainMenu();click(g.screens.root,'演武场');click(g.trainingPanel.root,'TrainingResume');g.clearBattle();g.px=0;g.py=0;
 for(let i=0;i<80;i++){const b=g.spawnNext('chief',undefined,2);b.born=0;b.x=-250+(i%8)*60;b.y=-150+Math.floor(i/8)*30;b.hp=b.maxHp*.4;}
 let peak=0;for(let f=0;f<300;f++){g.age+=1/60;for(const b of g.enemies)if(b.hp>0)g.updateEnemy(b,1/60);if(f%15===0)g.updateEffects(0);const busy=g.enemies.filter(b=>b.hp>0&&lvbuBusy(b.lvbu)).length;peak=Math.max(peak,busy);assert.ok(busy<=4);assert.ok(busy+g.enemyZones.length<=6);}
 assert.equal(peak,4);assert.ok(g.enemies.every(b=>!b.lvbuGhosts||b.lvbuGhosts.length===2));g.clearBattle();assert.ok(g.enemies.every(b=>!b.lvbu));assert.equal(g.enemyZones.length,0);
 console.log('通过：真实接入/受伤一心/暂停眩晕冻结/正背镜像/死亡与跨兵种复用/清场、80吕布全场最多4个主攻击、绘制只读');

 const m=JSON.parse(fs.readFileSync('art/runtime-lvbu/manifest.json'));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(m.dest)).digest('hex'),m.sha256);assert.equal(m.cells.length,20);
 for(const source of m.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source.path)).digest('hex'),source.sha256);
 const {data,info}=await sharp(m.dest).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,768);assert.equal(info.height,960);const hashes=new Set(),upper=[];
 for(let i=0;i<20;i++){
  const {data:p,info:f}=await sharp(m.dest).extract({left:i%4*192,top:Math.floor(i/4)*192,width:192,height:192}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let visible=0;
  let ax=0,ay=0,weight=0;for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const a=p[(y*f.width+x)*4+3];if(a>8)visible++;if(x===0||x===191||y===0||y===191)assert.ok(a<8,'动作不能跨格裁切');if(y<110){ax+=x*a;ay+=y*a;weight+=a;}}assert.ok(visible>3500);hashes.add(crypto.createHash('sha256').update(p).digest('hex'));if(i>=12)upper.push([ax/weight,ay/weight]);
 }
 for(let r=0;r<2;r++)for(let axis=0;axis<2;axis++){const v=upper.slice(r*4,r*4+4).map(p=>p[axis]);assert.ok(Math.max(...v)-Math.min(...v)<2,'四步循环头部/马鞍锚点稳定');}
 // Approved scarlet has low grayscale luma; HSV value distinguishes it from black shading.
 let value=0,dark=0,saturation=0,scarlet=0,visible=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>160){const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b);value+=max;dark+=max<75?1:0;saturation+=max?(max-min)/max:0;scarlet+=r>180&&g<100&&b<100&&Math.abs(g-b)<35?1:0;visible++;}
 assert.ok(value/visible>160&&dark/visible<.16,'保留明亮色值，不回退为厚重黑块');
 assert.ok(saturation/visible>.72&&scarlet/visible>.1,'鲜红/亮金/赤橙高饱和配色已进入运行图集');
 assert.equal(hashes.size,20);assert.equal(data[3],0,'真实透明背景');assert.ok(m.bytes<240000);
 console.log('通过：20帧真实透明/正背小跑上身稳定/鲜红亮金高饱和配色/768×960图集/哈希与包成本');
})().catch(e=>{console.error(e);process.exitCode=1;});
