const assert=require('node:assert/strict');
const {load,newGame,cc}=require('./test-campaign.cjs');
const {NativeSfx,AudioLoadQueue}=load('native-sfx');
const {GENERATED_SOUNDS}=load('weapon-sound');
function context(){return {src:'',volume:0,loop:false,autoplay:false,plays:0,stops:0,destroys:0,onPlay(fn){this.started=fn},offPlay(fn){assert.equal(this.started,fn);this.started=undefined},onError(fn){this.error=fn},offError(fn){assert.equal(this.error,fn);this.error=undefined},play(){this.plays++;this.started?.()},stop(){this.stops++},destroy(){this.destroys++}};}
(async()=>{
 const voices=[],errors=[],pool=NativeSfx.create({createInnerAudioContext(){const c=context();voices.push(c);return c}},6,s=>errors.push(s));
 for(let i=0;i<10000;i++)pool.play(i%6,'cached://cue-'+i%66,.4);
 assert.equal(pool.played,10000,'actual native onPlay callbacks are observed');assert.equal(voices.length,6,'changing 66 sounds never creates extra native players');assert.equal(voices.reduce((n,c)=>n+c.plays,0),10000);
 pool.setVolume(0,.12);assert.equal(voices[0].volume,.12);pool.stopAll();assert.ok(voices.every(c=>c.stops>0));voices[0].error({errMsg:'fixture'});assert.equal(errors.length,1);for(let i=0;i<100;i++)voices[0].error({errMsg:'repeat'});assert.equal(errors.length,1,'native error storms do not synchronously flush storage for every event');assert.equal(pool.failures,101);
 pool.destroy();pool.destroy();pool.play(0,'ignored',1);assert.ok(voices.every(c=>c.destroys===1&&!c.error&&!c.started));assert.equal(pool.size,0);
 const partial=[];assert.equal(NativeSfx.create({createInnerAudioContext(){if(partial.length===2)throw Error('limit');const c=context();partial.push(c);return c}},6,()=>{}),undefined);assert.ok(partial.every(c=>c.destroys===1));assert.equal(NativeSfx.create(undefined,6,()=>{}),undefined);
 const broken=context(),brokenPool=NativeSfx.create({createInnerAudioContext:()=>broken},1,()=>{});broken.stop=()=>{throw Error('native stop failed')};brokenPool.destroy();assert.equal(broken.destroys,1,'teardown still destroys a player when stop throws');
 const q=new AudioLoadQueue(1),pending=[];let running=0,peak=0,completed=0;
 for(let i=0;i<100;i++)q.enqueue(done=>{peak=Math.max(peak,++running);pending.push(()=>{running--;completed++;done();done()})});
 assert.equal(pending.length,1);while(pending.length)pending.shift()();assert.equal(completed,100);assert.equal(peak,1);assert.equal(q.loading,0);assert.equal(q.waiting,0);
 const late=new AudioLoadQueue(1);let finish,notStarted=0;late.enqueue(done=>finish=done);late.enqueue(()=>notStarted++);late.destroy();finish();assert.equal(notStarted,0);assert.equal(late.loading,0);

 const baseLoad=cc.assetManager.loadBundle,baseRelease=cc.assetManager.releaseAsset,liveMeta=new Set(),physical=[],native=[];let defer=false,waiting=[];
 cc.wechatHost={createInnerAudioContext(){const c=context();native.push(c);return c}};
 cc.assetManager.loadBundle=(bundle,done)=>baseLoad(bundle,(error,b)=>done(error,{load(path,type,cb){
   if(type!==cc.AudioClip)return b.load(path,type,cb);
   const clip={nativeUrl:'https://example.invalid/'+bundle+'/'+path,_nativeAsset:{url:'cached://'+bundle+'/'+path}};liveMeta.add(clip);physical.push(clip.nativeUrl);
   if(defer&&bundle!=='music')waiting.push(()=>cb(null,clip));else cb(null,clip);
 }}));
 cc.assetManager.releaseAsset=asset=>{liveMeta.delete(asset);baseRelease(asset)};
 try{
  const g=await newGame();for(const id of GENERATED_SOUNDS)g.loadSound(id);
  assert.equal(native.length,6);assert.equal(g.soundSources.length,0,'WeChat FX never instantiate Cocos AudioSource players');assert.equal(Object.keys(g.clips).length,0,'no SFX AudioClip metadata is kept resident');
  assert.ok(liveMeta.size<=1,'only the current music clip metadata remains');assert.ok(Object.keys(g.soundUrls).length>=GENERATED_SOUNDS.length);assert.ok(Object.values(g.soundUrls).every(url=>url.startsWith('cached://')),'retain Cocos downloaded paths rather than re-fetching remote URLs on every cast');
  for(let i=0;i<1000;i++){g.soundGate.update(.5);g.playSound(GENERATED_SOUNDS[i%GENERATED_SOUNDS.length])}assert.equal(native.length,6);
  const first=GENERATED_SOUNDS.find(id=>load('weapon-sound').soundAsset(id).bundle==='sfx-core');delete g.soundUrls[first];defer=true;g.loadSound(first);assert.equal(waiting.length,1);assert.equal(g.soundLoads.loading,1);g.onDestroy();waiting.shift()();
  assert.ok(native.every(c=>c.destroys===1));assert.equal(Object.keys(g.soundUrls).length,0,'late metadata cannot resurrect a destroyed bank');assert.equal(g.soundLoads.loading,0);assert.equal(liveMeta.size,0);
 }finally{cc.assetManager.loadBundle=baseLoad;cc.assetManager.releaseAsset=baseRelease;cc.wechatHost=undefined;}
 console.log('通过：66音色万次切换固定6原生播放器、加载并发1、元数据立即释放、销毁/迟到回调/中途失败无残留');
})().catch(e=>{console.error(e);process.exitCode=1});
