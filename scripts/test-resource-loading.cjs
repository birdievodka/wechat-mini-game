const assert=require('node:assert/strict'),fs=require('node:fs');
const {load,cc,newGame,GameBootstrap,finishStartup}=require('./test-campaign.cjs');
const {ResourceGate}=load('resource-gate');
const pending=[];let calls=0;const gate=new ResourceGate((id,done)=>{calls++;pending.push(done);});
const results=[];gate.get('same',(e,v)=>results.push([e,v]));gate.get('same',(e,v)=>results.push([e,v]));assert.equal(calls,1);
pending.shift()(null,0);assert.equal(results.length,2);assert.ok(results.every(x=>!x[0]&&x[1]===0));gate.get('same',(e,v)=>assert.equal(v,0));assert.equal(calls,1);
gate.get('failure',(e)=>assert.ok(e));pending.shift()(new Error('offline'));gate.get('failure',()=>{});assert.equal(calls,3);pending.shift()(null,1);
const thrown=new ResourceGate(()=>{throw Error('sync failure')});thrown.get('x',e=>assert.match(e.message,/sync failure/));assert.equal(thrown.has('x'),false);
const {ensureBossArt,bossArtReady,releaseBossArt}=load('chronicle-art'),{forgetGameBundle,stageBosses}=load('game-resources');
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
 // All optional remote bundles may fail without holding the local menu or first wave.
 const original=cc.assetManager.loadBundle,remote=require('../config/cdn.json').remoteBundles,requested=[];
 const warn=console.warn;console.warn=()=>{};
 cc.assetManager.loadBundle=(name,cb)=>{requested.push(name);remote.includes(name)?cb(Error('offline')):original(name,cb)};
 try{const g=new GameBootstrap();await g.start();finishStartup(g);assert.equal(g.phase,'menu');assert.ok(!requested.some(x=>x.startsWith('boss-')||['arsenal','talismans','orchard','enemies','results','hidden-heroes'].includes(x)));assert.ok(bossArtReady(g.artFrames,'zhangjiao'));g.prepareBosses(stageBosses(1),()=>g.restart(false));assert.equal(g.phase,'battle');assert.equal(g.resourceBusy,false);}finally{cc.assetManager.loadBundle=original;console.warn=warn;}
 // Atomic multi-atlas loading, failed retries and cancellation cannot leak partial poses.
 forgetGameBundle('boss-menghuo');const jobs=[];cc.assetManager.loadBundle=(name,done)=>done(null,{load:(path,type,cb)=>jobs.push({path,cb})});
 const frames={};let error,completed=0,alive=true;
 try{
  ensureBossArt('menghuo',frames,()=>alive,e=>{error=e;completed++});assert.equal(jobs.length,2);
  jobs.shift().cb(null,{width:768,height:768});assert.equal(Object.keys(frames).length,0);assert.equal(bossArtReady(frames,'menghuo'),false);
  jobs.shift().cb(Error('beasts failed'));assert.ok(error);assert.equal(completed,1);assert.equal(Object.keys(frames).length,0);
  ensureBossArt('menghuo',frames,()=>alive,e=>{error=e;completed++});jobs.shift().cb(null,{width:768,height:768});jobs.shift().cb(null,{width:768,height:512});assert.equal(error,undefined);assert.equal(completed,2);assert.equal(bossArtReady(frames,'menghuo'),true);assert.ok(frames['boss-beast-23']);
  releaseBossArt(frames);assert.equal(Object.keys(frames).length,0);assert.equal(bossArtReady(frames,'menghuo'),false);
  ensureBossArt('menghuo',frames,()=>alive,e=>{error=e;completed++});alive=false;jobs.shift().cb(null,{width:768,height:768});jobs.shift().cb(null,{width:768,height:512});assert.ok(error);assert.equal(completed,3);assert.equal(Object.keys(frames).length,0);
 }finally{cc.assetManager.loadBundle=original;forgetGameBundle('boss-menghuo');}
 // Preparation freezes simulation; leaving prevents a late download from starting battle.
 const g=await newGame();g.showMainMenu();forgetGameBundle('boss-lvbu');let late;
 cc.assetManager.loadBundle=(name,cb)=>name==='boss-lvbu'?late=()=>original(name,cb):original(name,cb);
 try{let started=0;g.prepareBosses(['lvbu'],()=>started++);assert.equal(g.resourceBusy,true);const age=g.age;g.update(.1);assert.equal(g.age,age);g.showMainMenu();late();assert.equal(started,0);assert.equal(g.phase,'menu');assert.equal(bossArtReady(g.artFrames,'lvbu'),false);}finally{cc.assetManager.loadBundle=original;forgetGameBundle('boss-lvbu');}
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
 const manifest=require('../art/audio/runtime-manifest.json');assert.equal(manifest.physicalSounds.length,66);assert.equal(Object.keys(load('audio-catalog').SOUND_ASSETS).length,86);
 console.log('通过：资源请求合并/失败重试/同步异常、离线首屏与首关、首领双图原子加载/取消、战斗准备冻结和离开保护、66份音效文件复用86事件');
})().catch(e=>{console.error(e);process.exit(1)});
