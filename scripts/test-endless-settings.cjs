const assert=require('node:assert/strict');
const {GameBootstrap,finishStartup,click,load,storage,cc}=require('./test-campaign.cjs');
const P=load('stage-progress'),C=load('campaign'),E=load('endless');
const find=(n,name)=>n.name===name?n:n.children.map(c=>find(c,name)).find(Boolean);
(async()=>{
 storage.clear();const g=new GameBootstrap();await g.start();finishStartup(g);
 g.profile=P.newProfile();g.showMainMenu();click(g.screens.root,'无尽模式');
 assert.equal(g.phase,'menu');assert.ok(find(g.screens.root,'SettingsPanel'));click(g.screens.root,'SettingsClose');
 for(let i=1;i<=6;i++)P.recordClear(g.profile,'liubei',i,200,100,5);
 assert.equal(E.endlessUnlocked(g.profile,'liubei'),true);assert.equal(E.endlessUnlocked(g.profile,'guanyu'),false);
 assert.equal(E.createEndlessRun(g.profile,'guanyu','pole','G01'),undefined);
 const before=JSON.stringify(g.profile.heroes);g.showMainMenu();click(g.screens.root,'无尽模式');
 assert.equal(g.phase,'battle');assert.equal(g.run.endless,true);assert.equal(g.remaining,30);assert.equal(g.run.growth,6);
 const elapsed=g.run.elapsed;g.paused=true;g.update(.08);assert.equal(g.run.elapsed,elapsed);g.paused=false;
 g.update(.08);assert.ok(g.run.elapsed>elapsed);
 const savePoint=g.savePoint;let snapshots=0;
 g.savePoint=function(){snapshots++;return savePoint.call(this);};
 g.remaining=0;assert.equal(g.stageBoundary(),true);assert.equal(g.run.endlessTier,1);assert.equal(g.run.offers.length,4);
 const gold=g.run.gold;assert.equal(g.stageBoundary(),false);assert.equal(g.run.gold,gold);
 const time=g.run.elapsed;g.update(.08);assert.equal(g.run.elapsed,time);
 click(g.screens.root,'SupplySkip');assert.equal(g.phase,'battle');assert.equal(g.remaining,30);
 assert.equal(snapshots,0,'formal endless supply does not clone a legacy checkpoint');g.savePoint=savePoint;
 const boss=g.enemies.find(e=>e.hp>0&&e.kind==='chief');assert.ok(boss);boss.hp=boss.maxHp*.4;
 const hp=boss.hp;g.remaining=0;g.stageBoundary();assert.ok(Math.abs(boss.hp/hp-1.2)<1e-9);
 click(g.screens.root,'SupplySkip');assert.equal(g.enemies.filter(e=>e.hp>0&&e.kind==='chief').length,2);
 for(let i=0;i<4;i++){g.remaining=0;g.stageBoundary();click(g.screens.root,'SupplySkip');}
 assert.equal(g.run.endlessTier,6);assert.equal(g.enemies.filter(e=>e.hp>0&&e.kind==='chief').length,2);
 for(const e of g.enemies.filter(e=>e.hp>0&&e.kind==='chief'))g.hitEnemy(e,0,1e9,0,'sandal',false,true);
 assert.equal(g.finishVictory(),false);assert.equal(g.phase,'battle');assert.equal(JSON.stringify(g.profile.heroes),before);
 g.endRun(false);assert.equal(g.phase,'defeat');click(g.screens.root,'ResultRetry');assert.equal(g.run.endless,true);assert.equal(g.run.endlessTier,0);assert.equal(g.run.weapons.length,1);
 g.showMainMenu();
 const originalHost=cc.wechatHost;
 for(const info of [
   ()=>({miniProgram:{envVersion:'release'}}),()=>({miniProgram:{envVersion:'trial'}}),
   ()=>({miniProgram:{envVersion:'unknown'}}),()=>({}),undefined,()=>{throw Error('unavailable')}
 ]){
  cc.wechatHost={getAccountInfoSync:info};
  assert.equal(g.developmentToolsEnabled(),false);
  g.showMainMenu();
  assert.equal(find(g.screens.root,'演武场'),undefined);
  g.startTraining('liubei','G01');g.restart(true);g.openCampReview();g.openEnemyReview('impact');
  assert.equal(g.phase,'menu');assert.equal(g.testMode,false);assert.equal(g.trainingMode,false);assert.equal(g.trainingButton,undefined);
  click(g.screens.root,'设置');
  for(const name of ['MusicSetting','SoundSetting','ProgressSetting'])assert.ok(find(g.screens.root,name));
  for(const name of ['DiagnosticsSetting','CopyDiagnostics','MusicAuditions','ResetProgress'])assert.equal(find(g.screens.root,name),undefined);
  click(g.screens.root,'ProgressSetting');assert.equal(find(g.screens.root,'ResetProgress'),undefined);click(g.screens.root,'SettingsClose');
 }
 for(const version of ['develop']){cc.wechatHost={getAccountInfoSync:()=>({miniProgram:{envVersion:version}})};assert.equal(g.developmentToolsEnabled(),true);}
 g.showMainMenu();click(g.screens.root,'演武场');assert.equal(g.trainingMode,true);assert.ok(g.trainingPanel.root.active);g.showMainMenu();click(g.screens.root,'设置');click(g.screens.root,'MusicSetting');assert.equal(g.musicMuted,true);assert.equal(storage.get('taoyuan-music-muted'),'true');
 click(g.screens.root,'DiagnosticsSetting');assert.ok(find(g.screens.root,'CopyDiagnostics'));click(g.screens.root,'DiagnosticsBack');
 click(g.screens.root,'MusicAuditions');click(g.screens.root,'Listen-brass-oath');
 assert.equal(g.musicPath,'brass-oath');assert.ok(g.musicSource.playing);assert.equal(g.musicMuted,true);
 click(g.screens.root,'Listen-brass-oath');assert.equal(g.musicSource.playing,false);
 click(g.screens.root,'Listen-brass-rally');assert.equal(g.musicPath,'brass-rally');
 click(g.screens.root,'MusicRoomBack');assert.equal(g.musicPath,'brass-oath');assert.equal(g.musicSource.playing,false);
 g.selectMusic('battle');const bossPlays=g.musicSource.plays;g.selectMusic('boss');assert.equal(g.musicPath,'brass-rally');assert.equal(g.musicSource.plays,bossPlays);g.selectMusic('menu');
 click(g.screens.root,'SoundSetting');assert.equal(g.muted,true);click(g.screens.root,'ProgressSetting');click(g.screens.root,'ResetProgress');assert.equal(JSON.stringify(g.profile.heroes),before);
 click(g.screens.root,'CancelReset');assert.equal(JSON.stringify(g.profile.heroes),before);
 click(g.screens.root,'ResetProgress');
 const setItem=cc.sys.localStorage.setItem;
 cc.sys.localStorage.setItem=()=>{throw Error('test storage failure')};
 try{click(g.screens.root,'ConfirmReset');assert.equal(JSON.stringify(g.profile.heroes),before);assert.ok(find(g.screens.root,'ConfirmReset'));}
 finally{cc.sys.localStorage.setItem=setItem;}
 click(g.screens.root,'ConfirmReset');assert.equal(g.phase,'menu');assert.equal(E.endlessUnlocked(g.profile,'liubei'),false);assert.equal(Object.keys(P.readProfile(cc.sys.localStorage).heroes.liubei).length,0);assert.equal(g.musicMuted,true);
 for(let i=0;i<100;i++){const d=E.endlessDifficulty(i),next=E.endlessDifficulty(i+1);if(i<13)assert.ok(Math.abs(next.pressure/d.pressure-1.2)<1e-9);else assert.ok(Math.abs(next.pressure-d.pressure-.2*E.endlessDifficulty(13).pressure)<1e-7);assert.ok(d.count<=72);}
 cc.wechatHost=originalHost;g.onDestroy();console.log('通过：英雄独立无尽资格、30秒升级购物/暂停冻结、Boss保留增压/双Boss上限/击杀不通关、死亡重开、音频设置/清档二次确认与持久化');
})().catch(e=>{console.error(e);process.exit(1)});
