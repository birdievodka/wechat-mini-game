const assert=require('node:assert/strict'),fs=require('node:fs');
const {load,cc,newGame,GameBootstrap,finishStartup,click}=require('./test-campaign.cjs');
const {ResourceGate}=load('resource-gate');
const pending=[];let calls=0;const gate=new ResourceGate((id,done)=>{calls++;pending.push(done);});
const results=[];gate.get('same',(e,v)=>results.push([e,v]));gate.get('same',(e,v)=>results.push([e,v]));assert.equal(calls,1);
pending.shift()(null,0);assert.equal(results.length,2);assert.ok(results.every(x=>!x[0]&&x[1]===0));gate.get('same',(e,v)=>assert.equal(v,0));assert.equal(calls,1);
gate.get('failure',(e)=>assert.ok(e));pending.shift()(new Error('offline'));gate.get('failure',()=>{});assert.equal(calls,3);pending.shift()(null,1);
const thrown=new ResourceGate(()=>{throw Error('sync failure')});thrown.get('x',e=>assert.match(e.message,/sync failure/));assert.equal(thrown.has('x'),false);
const {ensureBossArt,bossArtReady,releaseBossArt}=load('chronicle-art'),{forgetGameBundle,stageBosses}=load('game-resources');
const {bossScale}=require('../art/runtime-subpackages/manifest.json');
assert.deepEqual(Array.from(stageBosses(2)),['lvbu','dongzhuo']);
// A hung bundle request must release all waiters and ignore its callback after retry.
{
 const {loadGameBundle}=load('game-resources');
 const original=cc.assetManager.loadBundle,requests=[],timers=new Map(),results=[];
 cc.testTimers={setTimeout:fn=>{const id=Symbol();timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
 cc.assetManager.loadBundle=(_name,cb)=>requests.push(cb);
 const request=()=>loadGameBundle('timeout-fixture',(error,bundle)=>results.push(error?'timeout':bundle));
 try {
  request();request();assert.equal(requests.length,1);
  Array.from(timers.values())[0]();assert.deepEqual(results,['timeout','timeout']);
  request();assert.equal(requests.length,2);requests[0](null,'stale');requests[1](null,'fresh');
  request();assert.deepEqual(results,['timeout','timeout','fresh','fresh']);assert.equal(timers.size,0);
 } finally {delete cc.testTimers;cc.assetManager.loadBundle=original;forgetGameBundle('timeout-fixture');}
}
(async()=>{
 // The menu and first wave do not request the deferred boss subpackages.
 const original=cc.assetManager.loadBundle,requested=[];
 const warn=console.warn;console.warn=()=>{};
 cc.assetManager.loadBundle=(name,cb)=>{requested.push(name);original(name,cb)};
 try{const g=new GameBootstrap();await g.start();finishStartup(g);assert.equal(g.phase,'menu');assert.ok(!requested.some(x=>x.startsWith('boss-')||['arsenal','talismans','orchard','enemies','results','hidden-heroes'].includes(x)));assert.equal(bossArtReady(g.artFrames,'zhangjiao'),false);
  click(g.screens.root,'StartHero');assert.equal(g.phase,'battle');assert.equal(g.resourceBusy,false);
  assert.ok(!requested.some(x=>x.startsWith('boss-')));
  g.run.stageWave=3;g.run.miniDefeated=true;assert.equal(g.stageBoundary(),true);click(g.screens.root,'SupplySkip');
  assert.equal(g.run.stageWave,4);assert.equal(g.resourceBusy,false);assert.equal(g.resourceView,undefined);
  assert.ok(requested.includes('boss-zhangjiao')&&requested.includes('boss-props'));
  g.remaining=0;assert.equal(g.stageBoundary(),true);click(g.screens.root,'SupplySkip');
  assert.equal(g.phase,'battle');assert.equal(g.run.stageWave,5);assert.ok(bossArtReady(g.artFrames,'zhangjiao'));
  assert.equal(g.enemies.filter(e=>e.hp>0&&e.bossSkin==='zhangjiao').length,1);
  g.showMainMenu();assert.equal(g.artFrames['boss-prop-3'],undefined);assert.equal(bossArtReady(g.artFrames,'zhangjiao'),false);assert.ok(g.artFrames['boss-zhangjiao']);
  for(const id of load('chronicle-art').BOSS_ART_IDS){
   const frames={};let loaded=false;
   ensureBossArt(id,frames,()=>true,error=>{assert.ifError(error);loaded=true;});
   assert.ok(loaded&&bossArtReady(frames,id),id+' subpackage');
   const key=load('chronicle-art').bossActionKeys[id][0];
   const layout=id==='lvbu'?load('lvbu-art-layout').LVBU_LAYOUT['lvbu-actions']:load('boss-prop-layout').BOSS_LAYOUTS['boss-'+id+'-actions'];
   assert.equal(frames[key].originalSize.width,layout[0][4]*bossScale);
   const cached=[];
   ensureBossArt(id,frames,()=>false,error=>cached.push(error));
   assert.equal(cached.length,1);assert.ok(cached[0],id+' rejects inactive cached subscriber');
   load('asset-scope').artScope(frames).destroy();
   ensureBossArt(id,frames,()=>true,error=>cached.push(error));
   assert.equal(cached.length,2);assert.ok(cached[1],id+' rejects disposed art scope');
   releaseBossArt(frames);
   assert.deepEqual(Object.keys(frames),[]);
  }
  // The next endless encounter also uses packaged actions, beasts and the fully grown hero's pet.
  const {stageFor}=load('stage-data'),{createEndlessRun}=load('endless');
  g.profile.heroes.liubei={};
  for(let stage=1;stage<=6;stage++)g.profile.heroes.liubei[stageFor(stage).id]={seconds:45,kills:30,hearts:4,clears:1};
  g.run=createEndlessRun(g.profile,'liubei','sandal','G01');assert.ok(g.run);
  g.restart(false);g.remaining=0;assert.equal(g.endlessBoundary(),true);
  g.endlessBossChapter=load('chronicles').CHAPTERS.find(c=>c.bossId==='menghuo').id;
  click(g.screens.root,'SupplySkip');
  assert.equal(g.phase,'battle');assert.equal(g.resourceBusy,false);
  assert.ok(g.enemies.some(e=>e.hp>0&&e.bossSkin==='menghuo'));
  assert.ok(g.artFrames['boss-beast-23']&&load('pet-art').petArtReady(g.artFrames));
  g.showMainMenu();
 }finally{cc.assetManager.loadBundle=original;console.warn=warn;}
 // Atomic multi-atlas loading, failed retries and cancellation cannot leak partial poses.
 forgetGameBundle('boss-menghuo');const jobs=[];
 cc.assetManager.loadBundle=(_name,done)=>done(null,{load:(path,type,cb)=>jobs.push({path,cb})});
 const frames={};let error,completed=0,alive=true;
 try{
  ensureBossArt('menghuo',frames,()=>alive,e=>{error=e;completed++});assert.equal(jobs.length,2);
  jobs.shift().cb(null,{width:768,height:768});assert.equal(Object.keys(frames).length,0);assert.equal(bossArtReady(frames,'menghuo'),false);
  jobs.shift().cb(Error('beasts failed'));assert.match(error.message,/beasts failed/);assert.equal(completed,1);assert.equal(Object.keys(frames).length,0);
  ensureBossArt('menghuo',frames,()=>alive,e=>{error=e;completed++});jobs.shift().cb(null,{width:768,height:768});jobs.shift().cb(null,{width:768,height:512});assert.equal(error,undefined);assert.equal(completed,2);assert.equal(bossArtReady(frames,'menghuo'),true);assert.ok(frames['boss-beast-23']);
  releaseBossArt(frames);assert.equal(Object.keys(frames).length,0);assert.equal(bossArtReady(frames,'menghuo'),false);
  ensureBossArt('menghuo',frames,()=>alive,e=>{error=e;completed++});alive=false;jobs.shift().cb(null,{width:768,height:768});jobs.shift().cb(null,{width:768,height:512});assert.ok(error);assert.equal(completed,3);assert.equal(Object.keys(frames).length,0);
 }finally{cc.assetManager.loadBundle=original;forgetGameBundle('boss-menghuo');}
 // A stalled subpackage texture expires for all subscribers. A late callback must not overwrite a fresh retry.
 {
  forgetGameBundle('boss-caocao');
  const timers=new Map(),frames={},pending=[];let completed=0;
  cc.testTimers={setTimeout:(fn,ms)=>{const id=Symbol();timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
  cc.assetManager.loadBundle=(name,done)=>name==='boss-caocao'
   ?done(null,{load:(_path,_type,cb)=>pending.push(cb)})
   :original(name,done);
  try{
   const request=()=>ensureBossArt('caocao',frames,()=>true,error=>{assert.match(error.message,/超时/);completed++;});
   request();request();assert.equal(completed,0);
   Array.from(timers.values()).find(timer=>timer.ms===20000).fn();
   assert.equal(completed,2);assert.equal(bossArtReady(frames,'caocao'),false);
   ensureBossArt('caocao',frames,()=>true,error=>{assert.ifError(error);completed++;});
   pending[1](null,{width:895,height:510});assert.ok(bossArtReady(frames,'caocao'));
   const frame=frames['boss-caocao-action-0'];
   pending[0](null,{width:895,height:510});assert.equal(frames['boss-caocao-action-0'],frame);
   assert.equal(completed,3);
   assert.equal(timers.size,0);
  }finally{releaseBossArt(frames);delete cc.testTimers;cc.assetManager.loadBundle=original;forgetGameBundle('boss-caocao');}
 }
 // Preparation freezes simulation; leaving prevents a late download from starting battle.
 const g=await newGame();g.showMainMenu();forgetGameBundle('boss-lvbu');let late;
 cc.assetManager.loadBundle=(name,cb)=>name==='boss-lvbu'?late=()=>original(name,cb):original(name,cb);
 try{let started=0;g.prepareBosses(['lvbu'],()=>started++);assert.equal(g.resourceBusy,true);const age=g.age;g.update(.1);assert.equal(g.age,age);g.showMainMenu();late();assert.equal(started,0);assert.equal(g.phase,'menu');assert.equal(bossArtReady(g.artFrames,'lvbu'),false);}finally{cc.assetManager.loadBundle=original;forgetGameBundle('boss-lvbu');}
 // A preparation request for two bosses (e.g. an encounter preview) and a failed peer
 // can be retried without paying twice or starting more than one battle.
 {
  const ids=Array.from(stageBosses(2));for(const id of ids)forgetGameBundle('boss-'+id);
  let delayed,attempts=0,starts=0;
  cc.assetManager.loadBundle=(name,cb)=>{
   if(name==='boss-lvbu'&&!delayed){delayed=()=>original(name,cb);return;}
   if(name==='boss-dongzhuo'&&attempts++===0){cb(Error('offline'));return;}
   original(name,cb);
  };
  try{
   g.prepareBosses(ids,()=>starts++);assert.ok(g.resourceBusy);assert.equal(starts,0);
   delayed();g.retryResource();
   assert.equal(starts,1);assert.ok(ids.every(id=>bossArtReady(g.artFrames,id)));
   assert.equal(g.resourceBusy,false);
  }finally{cc.assetManager.loadBundle=original;}
 }
 // Both game modes use the same foreground-only transition gate.
 for(const endless of [false,true]){
  g.phase='shop';g.run.endless=endless;let done,commits=0;
  g.prepareVisuals([(alive,complete)=>{done=()=>{assert.ok(alive());complete();};}],()=>commits++);
  g.onBackground();done();g.update(1/60);assert.equal(commits,0);assert.equal(g.resourceBusy,true);
  g.onForeground();g.update(1/60);assert.equal(commits,1);assert.equal(g.resourceBusy,false);
 }
 g.phase='battle';g.paused=false;const pauseAudio=g.music.pause;
 g.music.pause=()=>{throw Error('host pause failure');};
 const warnLifecycle=console.warn;console.warn=()=>{};
 try{assert.doesNotThrow(()=>g.onBackground());assert.equal(g.paused,true);assert.equal(g.menu.active,true);}finally{g.music.pause=pauseAudio;console.warn=warnLifecycle;}
 g.onForeground();assert.equal(g.paused,true);
 g.phase='shop';let restoredCommit=0,contextReady;
 g.prepareVisuals([(_alive,complete)=>{contextReady=complete;}],()=>restoredCommit++);
 g.onGraphicsContextLost();contextReady();g.update(1/60);assert.equal(restoredCommit,0);
 g.onGraphicsContextRestored();g.update(1/60);assert.equal(restoredCommit,1);

 // Stage two supports the real wave-three Lv Bu to wave-five Dong Zhuo handoff.
 g.showMainMenu();g.profile.heroes.liubei.S01={seconds:45,kills:30,hearts:4,clears:1};
 g.run=load('campaign').createStageRun(g.profile,'liubei',2,'sandal','G01');g.restart(false);
 assert.equal(bossArtReady(g.artFrames,'lvbu'),false);
 g.remaining=0;assert.equal(g.stageBoundary(),true);g.resumeStage();
 assert.equal(g.run.stageWave,2);assert.equal(g.resourceBusy,false);assert.equal(g.resourceView,undefined);
 assert.equal(bossArtReady(g.artFrames,'lvbu'),true);assert.equal(bossArtReady(g.artFrames,'dongzhuo'),false);
 g.remaining=0;assert.equal(g.stageBoundary(),true);g.resumeStage();assert.equal(g.run.stageWave,3);
 const lvbu=g.enemies.find(e=>e.bossSkin==='lvbu');assert.ok(lvbu);lvbu.born=0;
 g.hitEnemy(lvbu,0,1e9,0,'sandal',false);assert.equal(g.stageBoundary(),true);g.resumeStage();
 assert.equal(g.run.stageWave,4);g.updateStageArtPrefetch();assert.equal(bossArtReady(g.artFrames,'lvbu'),true,'preserve the visible corpse');
 g.updateEnemy(lvbu,.5);g.updateStageArtPrefetch();assert.equal(bossArtReady(g.artFrames,'lvbu'),false);assert.equal(bossArtReady(g.artFrames,'dongzhuo'),false);
 g.updateStageArtPrefetch();assert.equal(bossArtReady(g.artFrames,'dongzhuo'),true);assert.equal(lvbu.art.spriteFrame,null);
 assert.equal(g.resourceBusy,false);assert.equal(g.resourceView,undefined);
 g.remaining=0;assert.equal(g.stageBoundary(),true);g.resumeStage();assert.equal(g.run.stageWave,5);assert.ok(g.enemies.some(e=>e.hp>0&&e.bossSkin==='dongzhuo'));
 // Every remaining chapter starts final-boss preparation through the wave-four entry.
 const {stageFor}=load('stage-data');
 const {createStageRun}=load('campaign');
 for(let stage=3;stage<=6;stage++){
  g.showMainMenu();
  g.profile.heroes.liubei[stageFor(stage-1).id]={seconds:45,kills:30,hearts:4,clears:1};
  g.run=createStageRun(g.profile,'liubei',stage,'sandal','G01');g.restart(false);
  const boss=stageFor(stage).boss,bundleName='boss-'+boss;
  assert.equal(bossArtReady(g.artFrames,boss),false);
  if(stage===6){
   g.remaining=0;assert.equal(g.stageBoundary(),true);g.resumeStage();
   assert.equal(g.run.stageWave,2);assert.ok(g.artFrames['boss-prop-4']);assert.equal(bossArtReady(g.artFrames,boss),false);
   assert.equal(g.resourceView,undefined);
  }
  // Keep the subpackage pending through several frames to check the live battle stays interactive.
  forgetGameBundle(bundleName);
  const requests=[];
  cc.assetManager.loadBundle=(name,cb)=>{
   if(name===bundleName){requests.push(cb);return;}
   original(name,cb);
  };
  try{
   g.run.stageWave=3;g.run.miniDefeated=true;assert.equal(g.stageBoundary(),true);g.resumeStage();
   assert.equal(g.run.stageWave,4);assert.equal(requests.length,1);
   g.resumeCountdown=0;const age=g.age;g.update(1/60);g.update(1/60);
   assert.ok(g.age>age);assert.equal(requests.length,1);assert.equal(g.resourceBusy,false);assert.equal(g.resourceView,undefined);
   if(stage===3){
    requests.shift()(Error('temporary subpackage failure'));
    assert.ok(g.stageArtPrefetch.retryAt>Date.now());
    g.update(1/60);assert.equal(requests.length,0);assert.equal(g.resourceView,undefined);
    g.stageArtPrefetch.retryAt=0;
    g.update(1/60);assert.equal(requests.length,1);assert.equal(g.resourceBusy,false);
   }
   original(bundleName,requests.shift());
   assert.equal(bossArtReady(g.artFrames,boss),true);
   g.remaining=0;assert.equal(g.stageBoundary(),true);g.resumeStage();
   assert.equal(g.run.stageWave,5);assert.equal(g.resourceView,undefined);
   assert.ok(g.enemies.some(e=>e.hp>0&&e.bossSkin===boss));
  }finally{cc.assetManager.loadBundle=original;forgetGameBundle(bundleName);}
 }
 // Local chapter ground must remain visible even when every optional meadow download is absent.
 const {WORLD}=load('world-rules'),rect=g.ground.rect;let opaqueFills=0;
 g.ground.rect=(x,y,w,h)=>{if(w===WORLD.width&&h===WORLD.height)opaqueFills++;return rect.call(g.ground,x,y,w,h);};
 const oldWorld=g.artFrames['world-ground'];delete g.artFrames['world-ground'];g.run.challenge=true;
 try{
  for(let chapter=1;chapter<=6;chapter++){
   g.run.chapter=chapter;opaqueFills=0;g.rebuildMeadow();assert.ok(g.meadowTiles.length>0,'local theme creates ground tiles');
   assert.ok(g.meadowTiles.every(n=>n.getComponent(cc.Sprite).spriteFrame===g.artFrames['stage-ground-'+chapter]));
   assert.equal(opaqueFills,0,'opaque fallback must never cover a loaded theme');
   const tiles=g.meadowTiles,cols=Math.ceil(WORLD.width/720),rows=Math.ceil(WORLD.height/540),f=g.artFrames['stage-ground-'+chapter];
   assert.equal(tiles.length,cols*rows);assert.equal(f.rect.width,316);assert.equal(f.rect.height,188);
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const t=tiles.find(n=>Math.abs(n.position.x-(-WORLD.halfWidth+(col+.5)*WORLD.width/cols))<1e-6&&Math.abs(n.position.y-(-WORLD.halfHeight+(row+.5)*WORLD.height/rows))<1e-6);assert.ok(t);assert.equal(t.scale.x,col%2?-1:1);assert.equal(t.scale.y,row%2?-1:1);}
  }
  const theme=g.artFrames['stage-ground-6'];delete g.artFrames['stage-ground-6'];opaqueFills=0;g.rebuildMeadow();
  assert.equal(g.meadowTiles.length,0);assert.equal(opaqueFills,1,'genuinely missing textures still show a safe ground');
  g.artFrames['stage-ground-6']=theme;g.rebuildMeadow();
 }finally{g.ground.rect=rect;if(oldWorld)g.artFrames['world-ground']=oldWorld;}
 console.log('通过：六关本地地面不被纯色兜底遮盖、远程草图缺失不影响正式地面、确实缺图仍安全兜底、六关镜像同边连续/2px采样隔离/较大格减少重复');
 const {physicalSounds}=require('../art/audio/runtime-manifest.json');
 const bundled=physicalSounds.filter(cue=>cue.bundle==='sfx-core'||cue.bundle==='sfx');
 const indexed=Object.values(load('audio-catalog').SOUND_ASSETS);
 assert.equal(physicalSounds.length,91);assert.equal(bundled.length,90);
 const assetKey=({bundle,name})=>bundle+'/'+name;
 assert.deepEqual(new Set(indexed.map(assetKey)),new Set(bundled.map(assetKey)));
 console.log('通过：六关第四波静默预取与第五波直进、吕布和棋子第二波预取、吕布退场释放、分包集合与原子发布、后台重试、请求合并、超时及离开保护');
})().catch(e=>{console.error(e);process.exit(1)});
