const assert=require('node:assert/strict');
const {useDevelopmentHost,load,cc,GameBootstrap,finishStartup,newGame,storage}=require('./test-campaign.cjs');
const {boundedCall}=load('load-lifetime'),{AssetScope,artScope}=load('asset-scope');
const {forgetGameBundle}=load('game-resources');
const {RuntimeHealth,HEALTH_KEY}=load('runtime-health');
function timers(){let time=0,id=0;const jobs=new Map();return {jobs,setTimeout(fn,ms){const n=++id;jobs.set(n,{fn,at:time+ms});return n},clearTimeout(n){jobs.delete(n)},tick(ms){const end=time+ms;for(let guard=0;guard<10000;guard++){const next=Array.from(jobs).sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end){time=end;return;}time=next[1].at;jobs.delete(next[0]);next[1].fn();}throw Error('timer storm')}};}
const pump=async()=>{for(let i=0;i<70;i++)await Promise.resolve()};
function asset(){return {width:768,height:768,refCount:0,dead:false,addRef(){assert.ok(!this.dead);this.refCount++;return this},decRef(){assert.ok(this.refCount>0);if(--this.refCount===0)this.dead=true;return this}};}
(async()=>{
 const warn=console.warn,error=console.error;console.warn=()=>{};console.error=()=>{};
 try{
 // One-shot deadlines, sync throws, duplicates, a throwing subscriber cannot strand peers.
 const clock=timers();cc.testTimers=clock;const ready=async g=>{for(let i=0;i<60&&!g.startupCanEnter;i++){clock.tick(0);await pump();}finishStartup(g);};let finish,results=0,late=0;
 boundedCall(cb=>finish=cb,e=>{assert.ok(e);results++},20,()=>late++);clock.tick(20);finish(null,{});finish(null,{});assert.equal(results,1);assert.equal(late,2);
 const {ResourceGate}=load('resource-gate');let complete,notified=0;const gate=new ResourceGate((_,cb)=>complete=cb);gate.get('x',()=>{throw Error('listener')});gate.get('x',()=>notified++);complete(null,1);assert.equal(notified,1);assert.equal(gate.has('x'),true);
 // Shared leases: old cancellation, late old completion and replacement publication interleave.
 const callbacks=[],bundle={load(_p,_t,cb){callbacks.push(cb)}},a=new AssetScope(),b=new AssetScope(),shared=asset();let failures=0,success=0;
 a.load(bundle,'same',cc.Texture2D,e=>{assert.ok(e);failures++},20);clock.tick(20);
 b.load(bundle,'same',cc.Texture2D,(e,t)=>{assert.equal(e,null);assert.equal(t,shared);success++},20);
 callbacks[0](null,shared);assert.equal(shared.dead,false,'old result reserved while replacement is in flight');callbacks[1](null,shared);assert.equal(success,1);assert.equal(shared.dead,false);assert.equal(shared.refCount,1);a.destroy();assert.equal(shared.dead,false);b.destroy();assert.equal(shared.dead,true);assert.equal(failures,1);
 const repeats=[],same=asset(),retrySource={load(_p,_t,cb){repeats.push(cb)}},expired=[];for(let i=0;i<4;i++){const old=new AssetScope();expired.push(old);old.load(retrySource,'retry',cc.Texture2D,()=>{},20);clock.tick(20);}const latest=new AssetScope();latest.load(retrySource,'retry',cc.Texture2D,()=>{},20);for(let i=0;i<4;i++)repeats[i](null,same);repeats[4](null,same);assert.equal(same.refCount,1,'multiple retired callbacks of the same texture retain one temporary lease');latest.destroy();expired.forEach(x=>x.destroy());assert.equal(same.dead,true);
 const c=new AssetScope(),d=new AssetScope(),jobs=[],source={load(_p,_t,cb){jobs.push(cb)}},t=asset();
 c.load(source,'coalesced',cc.Texture2D,()=>{throw Error('consumer')});d.load(source,'coalesced',cc.Texture2D,()=>notified++);assert.equal(jobs.length,1);jobs[0](null,t);assert.equal(t.refCount,2);c.destroy();assert.equal(t.dead,false);d.destroy();assert.equal(t.dead,true);
 // Native metadata retires before the next tick even when every cached load is synchronous.
 const clipRelease=cc.assetManager.releaseAsset;let metadata=0,metadataPeak=0;class Clip extends cc.AudioClip{constructor(){super();this.refCount=0;metadata++;metadataPeak=Math.max(metadataPeak,metadata)}addRef(){this.refCount++;return this}decRef(){this.refCount--;return this}}
 cc.assetManager.releaseAsset=a=>{if(a instanceof Clip)metadata--;else clipRelease(a)};const cueScope=new AssetScope(),cues={load(_p,_t,cb){cb(null,new Clip())}};for(let i=0;i<66;i++)cueScope.load(cues,'cue'+i,cc.AudioClip,(e,c)=>cueScope.release(c));assert.equal(metadata,0);assert.equal(metadataPeak,1);cueScope.destroy();cc.assetManager.releaseAsset=clipRelease;
 // Full Boss publication coalesces too, and a failed consumer cannot block another one.
 const original=cc.assetManager.loadBundle;forgetGameBundle('boss-menghuo');const bossJobs=[];
 cc.assetManager.loadBundle=(_name,cb)=>cb(null,{load(_path,_type,cb){bossJobs.push(cb)}});
 const frames={},boss=load('chronicle-art');let bossDone=0;
 boss.ensureBossArt('menghuo',frames,()=>true,()=>{throw Error('caller')});boss.ensureBossArt('menghuo',frames,()=>true,e=>{assert.equal(e,undefined);bossDone++});assert.equal(bossJobs.length,2);bossJobs[0](null,asset());bossJobs[1](null,asset());assert.equal(bossDone,1);assert.ok(frames['boss-beast-23']);boss.releaseBossArt(frames);artScope(frames).destroy();cc.assetManager.loadBundle=original;forgetGameBundle('boss-menghuo');
 // 10,000 identical errors cause bounded IO, retain first/last/count, and off failure is isolated.
 const hooks={},offs=[],host={onMemoryWarning(){throw Error('on')},onError(fn){hooks.error=fn},onUnhandledRejection(fn){hooks.rejection=fn},offError(){offs.push('error');throw Error('off')},offUnhandledRejection(){offs.push('rejection')}};
 let writes=0,saved;const health=new RuntimeHealth(host,{getItem:()=>null,setItem(_k,v){writes++;saved=JSON.parse(v)}},'faults',()=>({phase:'battle'}),()=>{});
 for(let i=0;i<10000;i++)hooks.error({message:'error '+i});assert.ok(writes<=2);clock.tick(1000);assert.equal(saved.events[0].count,10000);assert.equal(saved.events[0].first,'error 0');assert.equal(saved.events[0].detail,'error 9999');health.destroy();assert.deepEqual(offs,['error','rejection']);
 let failedWrites=0;const noStorage=new RuntimeHealth(undefined,{getItem:()=>null,setItem(){failedWrites++;throw Error('quota')}},'quota',()=>({}),()=>{});for(let i=0;i<10000;i++)noStorage.record('error','same');assert.equal(failedWrites,1,'quota errors must also respect the IO throttle');noStorage.destroy();
 let deferredWrites=0,deferredScans=0;const deferredHealth=new RuntimeHealth(undefined,{getItem:()=>null,setItem(){deferredWrites++;}},'deferred',()=>{deferredScans++;return {phase:'battle',seconds:5};},()=>{},true);
 deferredHealth.record('resource-ready');deferredHealth.frame(5);assert.equal(deferredScans,0);assert.equal(deferredWrites,0);
 clock.tick(0);assert.equal(deferredScans,1);assert.equal(deferredWrites,1);
 deferredHealth.frame(5);deferredHealth.record('webgl-context-lost');assert.equal(deferredWrites,2,'context loss flushes once and consumes the periodic timer');clock.tick(0);assert.equal(deferredWrites,2);deferredHealth.destroy();
 // A hung core bundle ends in a visible error, never a fabricated ready state.
 const hung=[];cc.assetManager.loadBundle=(name,cb)=>name==='battle'?hung.push(cb):original(name,cb);
 const blocked=new GameBootstrap(),boot=blocked.start();await pump();clock.tick(18000);await pump();await boot;assert.equal(blocked.ready,false);assert.match(blocked.startupProgress.error,/资源下载失败/);blocked.onDestroy();hung[0](null,{load(){throw Error('late boot must not continue')}});cc.assetManager.loadBundle=original;
 // A hung first sandal cue cannot permanently block the serial audio bank.
 const sandalJobs=[],released=[],originalRelease=cc.assetManager.releaseAsset;cc.assetManager.releaseAsset=a=>released.push(a);
 for(const n of ['sfx-core','music'])forgetGameBundle(n);
 cc.assetManager.loadBundle=(name,cb)=>original(name,(e,b)=>cb(e,name==='battle'?{load(path,type,cb){if(type===cc.AudioClip)sandalJobs.push(cb);else b.load(path,type,cb)}}:b));
 const audio=new GameBootstrap();await audio.start();await ready(audio);assert.equal(audio.soundLoads.loading,1);assert.ok(audio.soundLoads.waiting>0);clock.tick(30000);assert.equal(audio.soundLoads.waiting,0);assert.equal(audio.soundLoads.loading,0);const clip={nativeUrl:'fixture'};sandalJobs[0](null,clip);assert.ok(released.includes(clip));audio.onDestroy();cc.assetManager.releaseAsset=originalRelease;cc.assetManager.loadBundle=original;
 // Hung old music is cancelled on a scene switch; its late clip is released, never attached.
 forgetGameBundle('music');const musicJobs=[];cc.assetManager.loadBundle=(name,cb)=>original(name,(e,b)=>cb(e,name==='music'?{load(path,type,cb){musicJobs.push({path,cb})}}:b));
 const music=new GameBootstrap();await music.start();await ready(music);assert.equal(music.musicLoading,true);music.selectMusic('battle');assert.equal(musicJobs.at(-1).path,'brass-rally');music.selectMusic('boss');assert.equal(musicJobs.at(-1).path,'brass-rally');const current={name:'boss'};musicJobs.at(-1).cb(null,current);assert.equal(music.musicClip,current);musicJobs[0].cb(null,{name:'stale'});assert.equal(music.musicClip,current);assert.equal(music.musicLoading,false);music.onDestroy();cc.assetManager.loadBundle=original;forgetGameBundle('music');
 // Native initialization failure never creates the Cocos whole-bank fallback, recovers boundedly.
 let attempts=0,liveNative=0,peakNative=0,fail=true;const natives=[];
 cc.wechatHost={getAccountInfoSync:()=>({miniProgram:{envVersion:'develop'}}),createInnerAudioContext(){if(fail&&attempts++===2)throw Error('native exhausted');liveNative++;peakNative=Math.max(peakNative,liveNative);const n={src:'',volume:0,play(){},stop(){},destroy(){if(!this.closed){this.closed=true;liveNative--}},onError(){},offError(){},onPlay(){},offPlay(){}};natives.push(n);return n;}};
 const native=new GameBootstrap();await native.start();await ready(native);assert.equal(native.soundSources.length,0);assert.equal(Object.keys(native.clips).length,0);assert.equal(liveNative,1,'failed FX pool still allows independent single music player');fail=false;native.nativeRetryAt=0;native.ensureNativeAudio();assert.equal(liveNative,7);assert.ok(peakNative<=7);const finishHealth=native.health.destroy.bind(native.health);native.health.destroy=()=>{throw Error('host cleanup')};native.onDestroy();finishHealth();assert.equal(liveNative,0);cc.wechatHost=undefined;
 delete cc.testTimers;
 // Cosmetic arsenal arrival cannot alter time/cooldown/hit windows or recreate orbit blades.
 const g=await newGame();g.run.weapons=Array.from({length:6},(_,i)=>({id:'sword',tier:4,uid:i+20}));g.syncWeapons();g.weapons.forEach(w=>{w.time=.03;w.cooldown=.25});const states=g.weapons.map(w=>({w,time:w.time,cooldown:w.cooldown,blades:[...w.orbitBlades],previous:w.orbitPrevious,hits:w.orbitHits}));
 forgetGameBundle('arsenal');let arrive;cc.assetManager.loadBundle=(name,cb)=>original(name,(e,b)=>cb(e,name==='arsenal'?{load(path,type,cb){arrive=()=>b.load(path,type,cb)}}:b));g.optionalLoaded.delete('arsenal/weapons');g.loadOrchardArt();assert.equal(typeof arrive,'function');arrive();for(const s of states){assert.equal(s.w.time,s.time);assert.equal(s.w.cooldown,s.cooldown);assert.equal(s.w.orbitBlades.length,s.blades.length);s.blades.forEach((blade,i)=>assert.equal(s.w.orbitBlades[i],blade));assert.equal(s.w.orbitPrevious,s.previous);assert.equal(s.w.orbitHits,s.hits);}cc.assetManager.loadBundle=original;forgetGameBundle('arsenal');
 // Repeated config generations never retain the hidden 1.15s corpse cooldown tail.
 useDevelopmentHost();g.trainingMode=true;g.openTrainingPanel();for(let cycle=0;cycle<100;cycle++){for(const e of g.enemies){e.hp=0;e.dead=1.5;e.node.active=true;}g.addTrainingEnemies('E01',80,false);assert.equal(g.trainingAlive(),80);assert.ok(g.enemies.length<=80);}
 const actor=g.enemies[0];actor.archetype='E02';actor.bossSkin=undefined;actor.bossUnit=undefined;actor.miniBoss=false;actor.attack=-1;actor.direction=0;actor.walk=0;actor.moving=false;actor.flash=0;g.drawEnemy(actor,true);const rig=actor.npcRig;assert.ok(rig);let anchors=0,sizes=0,visibility=0;for(const sp of rig.parts){const tr=sp.node.getComponent(cc.UITransform),a=tr.setAnchorPoint.bind(tr),z=tr.setContentSize.bind(tr);tr.setAnchorPoint=(...v)=>{anchors++;a(...v)};tr.setContentSize=(...v)=>{sizes++;z(...v)};let active=sp.node.active;Object.defineProperty(sp.node,'active',{get:()=>active,set:v=>{visibility++;active=v},configurable:true});}for(let i=0;i<100;i++)rig.draw(actor,.4,1,i/60);assert.equal(anchors,0);assert.equal(sizes,0);assert.equal(visibility,0);
 const effects=new (load('boss-effects').BossEffects)(g.world,{}),frameA={},frameB={};effects.frames.key=frameA;effects.sprite('key',0,0,10,10);effects.used=0;effects.frames.key=frameB;effects.sprite('key',0,0,10,10);assert.equal(effects.slots[0].sprite.spriteFrame,frameB);effects.destroy();
 for(const delta of [NaN,Infinity,-1])g.update(delta);assert.ok(Number.isFinite(g.shake));assert.ok(Number.isFinite(g.soundGate.elapsed));assert.equal(g.paused,true);g.onDestroy();
 // Shared Graphics: idle does zero clears, final frame removes stale contents once.
 const forwarded=new cc.Graphics(),forwardedCalls=[];for(const name of ['fill','moveTo','circle','rect','roundRect','bezierCurveTo','arc'])forwarded[name]=function(...args){assert.equal(this,forwarded);forwardedCalls.push([name,...args]);};
 const {trackGraphicsContent:track}=load('graphics-content');track(forwarded);forwarded.fill();forwarded.moveTo(1,2);forwarded.circle(3,4,5);forwarded.rect(1,2,3,4);forwarded.roundRect(1,2,3,4,5);forwarded.bezierCurveTo(1,2,3,4,5,6);forwarded.arc(1,2,3,4,5,false);
 assert.deepEqual(forwardedCalls,[['fill'],['moveTo',1,2],['circle',3,4,5],['rect',1,2,3,4],['roundRect',1,2,3,4,5],['bezierCurveTo',1,2,3,4,5,6],['arc',1,2,3,4,5,false]],'fixed-arity hot wrappers preserve arguments and receiver');
 const {trackGraphicsContent}=load('graphics-content');const graphics=new cc.Graphics();let clears=0;graphics.clear=()=>clears++;trackGraphicsContent(graphics);for(let i=0;i<600;i++)graphics.clear();assert.equal(clears,0);graphics.fill();graphics.clear();graphics.clear();assert.equal(clears,1);graphics.moveTo(1,1);graphics.clear();assert.equal(clears,2,'unfilled paths must not survive into a future fill');
 // Swept AABB is conservative: exactly the same TOI as the previous quadratic.
 const sweep=load('combat-math').sweepEllipseTime;
 function old(ax,ay,bx,by,rx,ry){const x=ax/rx,y=ay/ry,dx=(bx-ax)/rx,dy=(by-ay)/ry,c=x*x+y*y-1;if(c<=0)return 0;const a=dx*dx+dy*dy;if(a<1e-12)return null;const b=2*(x*dx+y*dy),d=b*b-4*a*c;if(d<0)return null;const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;}
 let seed=913;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);for(let i=0;i<30000;i++){const args=Array.from({length:4},()=>rand()*1500-750).concat([10+rand()*100,10+rand()*100]);assert.equal(sweep(...args),old(...args));}
 const p=load('stage-progress'),corrupt=p.newProfile();corrupt.discovered.enemies=Array(10000).fill('fake');corrupt.pendingWeapons=['sandal','sandal'];const restored=p.readProfile({getItem:()=>JSON.stringify(corrupt)});assert.equal(restored.discovered.enemies.length,0);assert.equal(restored.pendingWeapons.length,1);
 assert.equal(clock.jobs.size,0,'all scoped deadlines and queue watchdogs removed on disposal');
 console.log('通过：加载挂起/重试/重复/取消/迟到租约、Boss整组去重与异常订阅隔离、万次错误限频、草鞋解堵/音乐切场、原生失败恢复无旧缓存、贴图不重置六剑、演武100轮/空层/非有限帧/3万CCD差分/坏档限界');
 }finally{delete cc.testTimers;cc.wechatHost=undefined;console.warn=warn;console.error=error;}
})().catch(e=>{console.error(e);process.exitCode=1});
