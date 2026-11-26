const assert=require('node:assert/strict');
const {load,Node,cc,newGame,useDevelopmentHost}=require('./test-campaign.cjs');
const {BattleNumber}=load('BattleNumber');
(async()=>{
 const glyphs=Array.from({length:13},(_,i)=>({frame:{id:i,destroy(){this.destroyed=true}},advance:i===10?7:12,width:14,height:23,left:.5}));
 const root=new Node('Feedback'),number=new BattleNumber(root,{numberGlyphs:glyphs},new cc.Color('#b64e2a'));
 number.node.setPosition(80,90);number.node.setScale(1.4,1.4,1);number.string='-123';
 assert.equal(number.node.children.length,0,'multiple damage writes must defer their visual work like Label');number.flush();
 assert.equal(number.node.children.length,4);assert.equal(number.node.children.filter(n=>n.active).length,4);assert.equal(number.string,'-123');
 const nodes=[...number.node.children];number.string='';number.flush();assert.ok(nodes.every(n=>!n.active));number.string='-9';number.flush();assert.equal(number.node.children.length,4);assert.equal(nodes.filter(n=>n.active).length,2);
 assert.equal(number.node.position.x,80);assert.equal(number.node.position.y,90,'existing animation root is untouched');
 for(let i=0;i<1000;i++)number.string='-'+(10000+i);assert.equal(number.node.children.length,4,'same-frame burst does not repeatedly rebuild');number.flush();assert.equal(number.node.children.length,6,'repeated hits reuse glyph nodes');
 number.string='-123456789012345678901234567890';number.flush();assert.equal(number.node.children.length,24,'bad visual input cannot grow unboundedly');
 const g=await newGame('zhangfei');g.battleSprites.numberGlyphs.push(...glyphs);const e=g.createEnemy(g.enemies.length);g.enemies.push(e);e.kind='soldier';e.archetype='E01';g.spawnEnemy(e,0);e.hp=e.maxHp=100;e.born=0;e.x=100;e.y=0;
 const before=g.hits;g.hitEnemy(e,0,10,0,'oil-jar',false,true);assert.equal(e.hp,90);assert.equal(g.hits,before+1);assert.equal(e.text.string,'-10');assert.ok(e.text instanceof BattleNumber,'real hit path uses shared numeric quads');
 assert.equal(e.text.node.children.length,0);g.battlefield.activeInHierarchy=true;g.lateUpdate();assert.equal(e.text.node.children.length,3,'component flushes pending numbers once at frame end');
 e.feedback=.001;g.updateEnemy(e,.01);g.lateUpdate();assert.equal(e.text.string,'');assert.ok(e.text.node.children.every(n=>!n.active));const boss=g.spawnNext('chief',undefined,2);
 function watch(label){
   let value=label.string,writes=0;
   Object.defineProperty(label,'string',{configurable:true,get:()=>value,set:next=>{value=next;writes++;}});
   return ()=>writes;
 }
 const goldWrites=watch(g.coinLabel),pickupWrites=watch(g.pickupText),gold=g.coinTotal;
 g.dropCoin(g.px,g.py,1);g.dropCoin(g.px,g.py,2);
 for(let i=0;i<120;i++)g.updateCoins(1/120);
 assert.equal(g.coinTotal,gold+3);assert.equal(goldWrites(),1);
 assert.equal(pickupWrites(),2,'one popup write for a simultaneous pickup and one for expiry');
 const hudWrites=watch(g.hud),titleWrites=watch(g.bossLabel);
 boss.hp=5234;boss.maxHp=6150;
 for(const mode of ['stage','endless','training','legacy','test']){
   g.run.challenge=mode==='stage';g.run.endless=mode==='endless';g.trainingMode=mode==='training';g.testMode=mode==='test';
   g.run.stageWave=1;g.remaining=41;g.drawProgress();
   assert.equal(g.bossHealthNumber.string,boss.hp+'/6150',mode);
   const written=hudWrites(),names=titleWrites(),nodes=g.bossHealthNumber.node.children.slice();
   for(let i=0;i<120;i++){boss.hp--;g.drawProgress();}
   assert.equal(hudWrites(),written,mode+' stable HUD');
   assert.equal(titleWrites(),names,mode+' stable boss name');
   assert.deepEqual(g.bossHealthNumber.node.children,nodes,mode+' reuses digits');
   assert.equal(g.bossHealthNumber.string,boss.hp+'/6150');
   if(mode==='training'){const before=g.trainingAlive();e.hp=0;g.drawProgress();assert.equal(g.hud.string,'演武场 · 敌军 '+(before-1));}
   if(mode==='stage'){
     g.remaining--;g.drawProgress();assert.match(g.hud.string,/40s$/);
     g.run.stageWave=3;g.drawProgress();assert.match(g.hud.string,/击败小首领/);
     const writes=hudWrites();g.remaining--;g.drawProgress();assert.equal(hudWrites(),writes);
     boss.miniBoss=true;boss.miniCharge={};g.drawProgress();assert.match(g.bossLabel.string,/1\/3/);
     boss.miniBoss=false;boss.miniCharge=undefined;g.drawProgress();assert.doesNotMatch(g.bossLabel.string,/1\/3/);
   }
 }
 g.testMode=false;g.run.challenge=true;g.run.stageWave=1;g.drawProgress();
 const header=g.hud.string;g.resumeCountdown=.01;g.update(.02);assert.equal(g.hud.string,'开打！');g.drawProgress();assert.equal(g.hud.string,header);
 const frames=g.battleSprites.numberGlyphs.splice(0);g.drawProgress();
 assert.equal(g.bossHealthNumber.node.active,false);assert.ok(g.bossLabel.string.endsWith(boss.hp+'/6150'));
 g.battleSprites.numberGlyphs.push(...frames);g.drawProgress();assert.equal(g.bossHealthNumber.node.active,true);
 boss.hp=0;g.drawProgress();assert.equal(g.bossHealthNumber.node.active,false);assert.equal(g.bossLabel.string,'');
 const {BattleHudText}=load('BattleHudText');
 const originalHeader=g.hud, originalSkill=g.skillLabel;
 let measures=0;
 const canvas={
   getContext(){return {measureText(text){measures++;return {width:text===' '?6:25};},fillText(){},
     getImageData:()=>({data:new Uint8Array(canvas.width*canvas.height*4)})};},
 };
 cc.testDocument={createElement:()=>canvas};
 try{g.installBattleHudGlyphs('Arial');}finally{delete cc.testDocument;}
 assert.ok(g.hud instanceof BattleHudText);assert.equal(canvas.width,0,'bake releases the offscreen canvas');
 assert.ok(measures>100&&measures<=192,'finite glyph inventory');
 const baked=measures, oldHeaderText=originalHeader.string, oldSkillText=originalSkill.string;
 for(let seconds=44;seconds>=0;seconds--){
   g.remaining=seconds;
   g.run.skillId='G07';g.skillCharge=seconds%16;g.drawProgress();
   assert.match(g.hud.string,new RegExp(seconds+'s$'));
   assert.equal(originalHeader.enabled,false);assert.equal(originalSkill.enabled,false);
 }
 assert.equal(measures,baked,'clock and charge change without any new Canvas text measurement');
 assert.equal(originalHeader.string,oldHeaderText);assert.equal(originalSkill.string,oldSkillText);
 assert.ok(g.hud.node.children.some(n=>n.active&&n.getComponent(cc.Sprite)?.spriteFrame));
 const cachedChildren=g.hud.node.children.slice();
 g.hud.string='新字形';assert.equal(originalHeader.enabled,true);assert.equal(originalHeader.string,'新字形');
 assert.ok(cachedChildren.every(node=>!node.active));
 g.hud.string='开打！';assert.equal(originalHeader.enabled,false);assert.deepEqual(g.hud.node.children,cachedChildren);
 g.onDestroy();assert.ok(glyphs.every(g=>g.frame.destroyed));
 const previousHost=cc.wechatHost;
 useDevelopmentHost();
 const wechat=await newGame();
 try{
   assert.equal(wechat.hurtText,undefined);
   assert.ok(wechat.enemies.every(enemy=>enemy.text===undefined));
   const soldier=wechat.spawnNext('soldier','E01');
   Object.assign(soldier,{hp:100,maxHp:100,born:0});
   wechat.hitEnemy(soldier,0,10,40,'oil-jar',false,true);
   assert.equal(soldier.hp,90);assert.ok(soldier.flash>0);assert.ok(soldier.vx>0);
   assert.equal(soldier.text,undefined);
   wechat.updateEnemy(soldier,.01);wechat.lateUpdate();
   const hearts=wechat.playerHp;
   wechat.protectionTime=0;
   assert.equal(wechat.hurtPlayer(wechat.px-20,wechat.py),true);
   assert.equal(wechat.playerHp,hearts-1);assert.equal(wechat.heroTint,'#ff8479');assert.ok(wechat.playerVx>0);
   const boss=wechat.spawnNext('chief',undefined,2);
   Object.assign(boss,{hp:500,maxHp:800});
   assert.equal(boss.text,undefined);
   wechat.battleSprites.numberGlyphs.push(...glyphs.map(glyph=>({...glyph,frame:{destroy(){}}})));
   wechat.drawProgress();assert.equal(wechat.bossHealthNumber.string,'500/800');
   const gold=wechat.coinTotal;
   wechat.dropCoin(wechat.px,wechat.py,2);
   for(let i=0;i<40;i++)wechat.updateCoins(1/120);
   assert.equal(wechat.coinLabel.string,String(gold+2));assert.equal(wechat.pickupText.string,'+2');
   assert.equal(JSON.parse(wechat.health.report()).snapshot.damageTextBackend,'off');
 }finally{wechat.onDestroy();cc.wechatHost=previousHost;}
 const {NativeMusic}=load('native-music');const callbacks={},messages=[];let blankStops=0,blankPauses=0,plays=0,created=0;
 const context={src:'',volume:0,loop:false,autoplay:false,stop(){if(!this.src)blankStops++},pause(){if(!this.src)blankPauses++},play(){plays++},seek(){},destroy(){}};
 for(const name of ['Play','Pause','Stop','Error','Canplay']){context['on'+name]=fn=>callbacks[name]=fn;context['off'+name]=()=>delete callbacks[name];}
 const music=NativeMusic.create({createInnerAudioContext(){created++;return context}},m=>messages.push(m));
 music.stop();music.pause();music.play();assert.equal(blankStops,0);assert.equal(blankPauses,0);assert.equal(plays,0,'never send an unassigned music player a command');
 music.src='wxfile://music';assert.equal(blankStops,0,'first src assignment must not stop an empty native decoder');music.play();callbacks.Error();assert.match(messages[0],/op=play/);assert.match(messages[0],/empty host error/);assert.equal(music.diagnostic.errors,1);
 music.src='wxfile://retry';music.play();callbacks.Error({errCode:10004,errMsg:'decoder'});assert.equal(created,1);music.destroy();
 console.log('通过：共享数字命中接入/清空/复用/根动画不变/24字硬界/伤害不变，原生音乐首曲零空音源命令与错误阶段；短夹具，无真机长测');
})().catch(e=>{console.error(e);process.exitCode=1});
