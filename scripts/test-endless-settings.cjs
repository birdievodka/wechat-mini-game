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
 g.remaining=0;assert.equal(g.stageBoundary(),true);assert.equal(g.run.endlessTier,1);assert.equal(g.run.offers.length,4);
 const gold=g.run.gold;assert.equal(g.stageBoundary(),false);assert.equal(g.run.gold,gold);
 const time=g.run.elapsed;g.update(.08);assert.equal(g.run.elapsed,time);
 click(g.screens.root,'SupplySkip');assert.equal(g.phase,'battle');assert.equal(g.remaining,30);
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
 for(const version of ['release','trial',undefined]){
  cc.wechatHost={getAccountInfoSync:()=>({miniProgram:{envVersion:version}})};
  g.showMainMenu();assert.equal(find(g.screens.root,'演武场'),undefined);click(g.screens.root,'设置');click(g.screens.root,'ProgressSetting');assert.equal(find(g.screens.root,'ResetProgress'),undefined);click(g.screens.root,'SettingsClose');
 }
 cc.wechatHost={getAccountInfoSync:()=>{throw Error('unavailable')}};assert.equal(g.developmentToolsEnabled(),false);
 for(const version of ['develop']){cc.wechatHost={getAccountInfoSync:()=>({miniProgram:{envVersion:version}})};assert.equal(g.developmentToolsEnabled(),true);}
 g.showMainMenu();click(g.screens.root,'演武场');assert.equal(g.trainingMode,true);assert.ok(g.trainingPanel.root.active);g.showMainMenu();click(g.screens.root,'设置');click(g.screens.root,'MusicSetting');assert.equal(g.musicMuted,true);assert.equal(storage.get('taoyuan-music-muted'),'true');
 click(g.screens.root,'SoundSetting');assert.equal(g.muted,true);click(g.screens.root,'ProgressSetting');click(g.screens.root,'ResetProgress');assert.equal(JSON.stringify(g.profile.heroes),before);
 click(g.screens.root,'CancelReset');assert.equal(JSON.stringify(g.profile.heroes),before);
 click(g.screens.root,'ResetProgress');
 const setItem=cc.sys.localStorage.setItem;
 cc.sys.localStorage.setItem=()=>{throw Error('test storage failure')};
 try{click(g.screens.root,'ConfirmReset');assert.equal(JSON.stringify(g.profile.heroes),before);assert.ok(find(g.screens.root,'ConfirmReset'));}
 finally{cc.sys.localStorage.setItem=setItem;}
 click(g.screens.root,'ConfirmReset');assert.equal(g.phase,'menu');assert.equal(E.endlessUnlocked(g.profile,'liubei'),false);assert.equal(Object.keys(P.readProfile(cc.sys.localStorage).heroes.liubei).length,0);assert.equal(g.musicMuted,true);
 for(let i=0;i<100;i++){const d=E.endlessDifficulty(i),next=E.endlessDifficulty(i+1);assert.ok(Math.abs(next.pressure/d.pressure-1.2)<1e-9);assert.ok(d.count<=72);}
 cc.wechatHost=originalHost;g.onDestroy();console.log('通过：英雄独立无尽资格、30秒升级购物/暂停冻结、Boss保留增压/双Boss上限/击杀不通关、死亡重开、音频设置/清档二次确认与持久化');
})().catch(e=>{console.error(e);process.exit(1)});
