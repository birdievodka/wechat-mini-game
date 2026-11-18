const assert=require('node:assert/strict');
const {load,cc,GameBootstrap,finishStartup}=require('./test-campaign.cjs');
const {NativeAudioFiles}=load('native-audio-files'),{NativeMusic}=load('native-music'),{BattleMusic}=load('battle-music');
const {forgetGameBundle}=load('game-resources');
function clock(){let serial=0,now=0;const jobs=new Map();return {jobs,setTimeout(fn,ms){const id=++serial;jobs.set(id,{fn,at:now+ms});return id},clearTimeout(id){jobs.delete(id)},tick(ms){now+=ms;for(const[id,j]of Array.from(jobs))if(j.at<=now){jobs.delete(id);j.fn()}}};}
(async()=>{
 const timers=clock();cc.testTimers=timers;
 const original=cc.assetManager.loadBundle,utils=cc.assetManager.utils;let clipLoads=0,downloads=[],defer=false;
 cc.assetManager.utils={getUrlWithUuid:(uuid,options)=>'https://cdn.invalid/'+uuid+'.hash'+options.nativeExt};
 cc.assetManager.loadBundle=(name,done)=>done(null,{getInfoWithPath:path=>({uuid:name+'/'+path}),load(){clipLoads++;throw Error('No metadata allowed')}});
 const host={downloadFile(options){const job={options,aborts:0,abort(){this.aborts++}};downloads.push(job);if(!defer)options.success({statusCode:200,tempFilePath:'wxfile://tmp/'+downloads.length});return job;}};
 try{
  for(const b of ['music','sfx-core','sfx','battle'])forgetGameBundle(b);
  const files=new NativeAudioFiles(host);let result;
  files.load('music','menu',(e,url)=>{assert.equal(e,null);result=url});assert.match(result,/wxfile:/);assert.match(downloads[0].options.url,/\.hash\.m4a$/);
  for(let i=0;i<200;i++)files.load('music','menu',(e,url)=>assert.equal(url,result));assert.equal(downloads.length,1,'repeated scene uses same raw file, no repeated download/decoder');
  files.load('battle','audio/sandal-hit-pcm',e=>assert.equal(e,null));assert.match(downloads.at(-1).options.url,/\.wav$/);assert.equal(clipLoads,0);
  defer=true;let completions=0;files.load('sfx','late',e=>{assert.ok(e);completions++},100);const timeout=downloads.at(-1);timers.tick(100);assert.equal(timeout.aborts,1);timeout.options.success({statusCode:200,tempFilePath:'late'});assert.equal(completions,1);assert.equal(files.count,2,'late success does not resurrect an expired file');
  files.load('sfx','cancelled',e=>{assert.ok(e);completions++});const pending=downloads.at(-1);files.destroy();assert.equal(pending.aborts,1);pending.options.success({statusCode:200,tempFilePath:'late'});assert.equal(files.count,0);assert.equal(completions,2);
  // 100 raw-download failures never allocate a native audio player; only playback does.
  const fail=new NativeAudioFiles({downloadFile(options){options.fail({errMsg:'network'});return {abort(){}}}});for(let i=0;i<100;i++)fail.load('sfx','failed',e=>assert.ok(e));assert.equal(fail.count,0);assert.equal(clipLoads,0);fail.destroy();
  let creates=0,writes=0,errors=0;const callbacks=new Map(),c={src:'',autoplay:false,loop:false,plays:0,destroys:0,seek(t){this.seekTime=t},play(){this.plays++;callbacks.get('Play')?.()},pause(){callbacks.get('Pause')?.()},stop(){callbacks.get('Stop')?.()},destroy(){this.destroys++}};
  Object.defineProperty(c,'volume',{get(){return this.gain},set(v){writes++;this.gain=v}});
  for(const n of ['Play','Pause','Stop','Canplay','Error']){c['on'+n]=fn=>callbacks.set(n,fn);c['off'+n]=fn=>{assert.equal(callbacks.get(n),fn);callbacks.delete(n)}}
  const source=NativeMusic.create({createInnerAudioContext(){creates++;return c}},()=>errors++),music=new BattleMusic();source.src='wxfile://music';music.attach(source);music.begin();music.tryAutoplay();music.update(1);const base=writes;for(let i=0;i<18000;i++)music.update(1/60);assert.equal(writes,base,'steady BGM does not send 60 identical native-volume writes per second');assert.ok(source.playing);source.currentTime=8;callbacks.get('Canplay')();assert.equal(c.seekTime,8);music.pause();assert.equal(source.playing,false);music.resume();assert.ok(source.playing);source.src='wxfile://boss';assert.equal(creates,1);callbacks.get('Error')();assert.equal(source.playing,false);assert.equal(errors,1);source.destroy();source.destroy();assert.equal(c.destroys,1);assert.equal(callbacks.size,0);
  assert.equal(timers.jobs.size,0);
 }finally{cc.assetManager.loadBundle=original;cc.assetManager.utils=utils;for(const b of ['music','sfx-core','sfx','battle'])forgetGameBundle(b);delete cc.testTimers;}
 console.log('通过：原生音频UUID/版本地址解析、原草鞋WAV/音乐M4A、缓存/超时abort/迟到/销毁/百次失败零临时播放器、300秒音乐零重复音量命令、监听解绑');
})().catch(e=>{console.error(e);process.exitCode=1});
