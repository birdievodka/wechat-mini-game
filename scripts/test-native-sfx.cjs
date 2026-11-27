const assert=require('node:assert/strict');
const {load,newGame,cc}=require('./test-campaign.cjs');
const {NativeSfx,AudioLoadQueue}=load('native-sfx');
const {GENERATED_SOUNDS,SoundGate}=load('weapon-sound');
function context(){return {src:'',volume:0,loop:false,autoplay:false,plays:0,stops:0,destroys:0,onPlay(fn){this.started=fn},offPlay(fn){assert.equal(this.started,fn);this.started=undefined},onError(fn){this.error=fn},offError(fn){assert.equal(this.error,fn);this.error=undefined},play(){this.plays++;this.started?.()},stop(){this.stops++},destroy(){this.destroys++}};}
(async()=>{
 const voices=[],errors=[],pool=NativeSfx.create({createInnerAudioContext(){const c=context();voices.push(c);return c}},6,s=>errors.push(s));
 for(let i=0;i<10000;i++)pool.play(i%6,'cached://cue-'+i%GENERATED_SOUNDS.length,.4);
 assert.equal(pool.played,10000,'actual native onPlay callbacks are observed');assert.equal(voices.length,6,'changing sound sources never creates extra native players');assert.equal(voices.reduce((n,c)=>n+c.plays,0),10000);
 pool.setVolume(0,.12);assert.equal(voices[0].volume,.12);pool.stopAll();assert.ok(voices.every(c=>c.stops>0));voices[0].error({errMsg:'fixture'});assert.equal(errors.length,1);for(let i=0;i<100;i++)voices[0].error({errMsg:'repeat'});assert.equal(errors.length,1,'native error storms do not synchronously flush storage for every event');assert.equal(pool.failures,101);
 const lateError=voices[0].error;
 pool.destroy();lateError({get errMsg(){throw Error('read a retired native event')}});
 assert.equal(pool.failures,101);
 pool.destroy();pool.play(0,'ignored',1);assert.ok(voices.every(c=>c.destroys===1&&!c.error&&!c.started));assert.equal(pool.size,0);
 const partial=[];assert.equal(NativeSfx.create({createInnerAudioContext(){if(partial.length===2)throw Error('limit');const c=context();partial.push(c);return c}},6,()=>{}),undefined);assert.ok(partial.every(c=>c.destroys===1));assert.equal(NativeSfx.create(undefined,6,()=>{}),undefined);
 const broken=context(),brokenPool=NativeSfx.create({createInnerAudioContext:()=>broken},1,()=>{});brokenPool.play(0,'cue.wav',.4);broken.stop=()=>{throw Error('native stop failed')};brokenPool.destroy();assert.equal(broken.destroys,1,'teardown still destroys a player when stop throws');
 let writes=0;const normalized=context();Object.defineProperty(normalized,'src',{get(){throw Error('native src round trip must not be needed')},set(){writes++}});const cached=NativeSfx.create({createInnerAudioContext:()=>normalized},1,()=>{});for(let i=0;i<1000;i++)cached.play(0,'same.wav',.4);assert.equal(writes,1,'same cue reuses the decoded source despite a normalizing host');normalized.error({errMsg:'fixture'});cached.play(0,'same.wav',.4);assert.equal(writes,2,'playback failure permits a fresh source assignment');cached.destroy();
 const affinity=new SoundGate(2),alternating=NativeSfx.create({createInnerAudioContext:context},2,()=>{});
 for(let i=0;i<120;i++){
   const cue=i%2?'blast-hit':'wood-hit',url=cue+'.wav';
   affinity.update(.5);
   alternating.play(affinity.acquire(cue,2,undefined,url),url,.4);
 }
 assert.equal(alternating.played,120);assert.equal(alternating.sourceAssignments,2,'alternating repeated cues keep both sources');
 assert.equal(alternating.volumeAssignments,2,'repeated cue and gain need only one write per voice');
 assert.equal(alternating.stops,118,'a started voice still stops before replay');
 alternating.stopAll();alternating.stopAll();
 assert.equal(alternating.stops,120,'already stopped voices stay idle across repeated shop, pause and lifecycle stops');
 alternating.destroy();
 const gainContext=context(),gainPool=NativeSfx.create({createInnerAudioContext:()=>gainContext},1,()=>{});
 gainPool.stopAll();assert.equal(gainContext.stops,0,'never stop an unassigned voice');
 gainPool.play(0,'a.wav',.4);gainPool.setVolume(0,.15);gainPool.setVolume(0,.15);
 assert.equal(gainPool.volumeAssignments,2);assert.equal(gainContext.volume,.15);
 gainPool.play(0,'a.wav',.4);assert.equal(gainContext.volume,.4,'replay restores gain after ducking');
 gainPool.play(0,'b.wav',.4);assert.equal(gainPool.volumeAssignments,4,'reapply gain when changing source');
 gainContext.error({errMsg:'fixture'});gainPool.play(0,'b.wav',.4);
 assert.equal(gainPool.sourceAssignments,3);assert.equal(gainPool.volumeAssignments,5,'reapply gain after a host error');
 gainPool.destroy();
 const failedSource=context();let rejectSource=true;
 Object.defineProperty(failedSource,'src',{set(){if(rejectSource)this.error({errMsg:'source rejected'});}});
 const failedPool=NativeSfx.create({createInnerAudioContext:()=>failedSource},1,()=>{});
 failedPool.play(0,'cue.wav',.4);assert.equal(failedSource.plays,0,'synchronous src error prevents play');
 rejectSource=false;failedPool.play(0,'cue.wav',.4);assert.equal(failedSource.plays,1);assert.equal(failedPool.sourceAssignments,2);
 failedPool.destroy();
 const q=new AudioLoadQueue(1),pending=[];let running=0,peak=0,completed=0;
 for(let i=0;i<100;i++)q.enqueue(done=>{peak=Math.max(peak,++running);pending.push(()=>{running--;completed++;done();done()})});
 assert.equal(pending.length,1);while(pending.length)pending.shift()();assert.equal(completed,100);assert.equal(peak,1);assert.equal(q.loading,0);assert.equal(q.waiting,0);
 const late=new AudioLoadQueue(1);let finish,notStarted=0;late.enqueue(done=>finish=done);late.enqueue(()=>notStarted++);late.destroy();finish();assert.equal(notStarted,0);assert.equal(late.loading,0);

 const baseLoad=cc.assetManager.loadBundle,native=[];let metadata=0;
 cc.wechatHost={createInnerAudioContext(){const c=context();c.pause=()=>{};c.seek=()=>{};native.push(c);return c}};
 cc.assetManager.loadBundle=(bundle,done)=>baseLoad(bundle,(error,b)=>done(error,{...b,load(path,type,cb){
   if(type===cc.AudioClip){metadata++;throw Error('native file resolution must never instantiate AudioClip')}
   return b.load(path,type,cb);
 }}));
 try{
  const g=await newGame();for(const id of GENERATED_SOUNDS)g.loadSound(id);
  assert.equal(native.length,7);assert.equal(g.soundSources.length,0);assert.equal(g.musicSource,undefined);assert.equal(metadata,0,'native BGM and FX never load AudioClip metadata');assert.equal(Object.keys(g.clips).length,0);
  assert.ok(Object.keys(g.soundUrls).length>=GENERATED_SOUNDS.length);assert.ok(Object.values(g.soundUrls).every(url=>url.startsWith('packaged/')));
  for(let i=0;i<10000;i++){g.soundGate.update(.5);g.playSound(GENERATED_SOUNDS[i%GENERATED_SOUNDS.length]);if(i%50===0)g.selectMusic(['menu','battle','boss'][i%3],true)}assert.equal(native.length,7,'200 music transitions plus ten thousand FX still seven contexts');
  g.onDestroy();assert.ok(native.every(c=>c.destroys===1));assert.equal(Object.keys(g.soundUrls).length,0);assert.equal(g.soundLoads.loading,0);
 }finally{cc.assetManager.loadBundle=baseLoad;cc.wechatHost=undefined;}
 console.log('通过：全库音效万次切换固定6原生播放器、加载并发1、原生零AudioClip、200次音乐切换固定7源、销毁/中途失败无残留');
})().catch(e=>{console.error(e);process.exitCode=1});
