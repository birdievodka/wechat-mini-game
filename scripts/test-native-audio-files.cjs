const assert=require('node:assert/strict');
const {load,cc,GameBootstrap,finishStartup}=require('./test-campaign.cjs');
const {NativeAudioFiles}=load('native-audio-files'),{NativeMusic}=load('native-music'),{BattleMusic}=load('battle-music');
const {forgetGameBundle}=load('game-resources');
function clock(){let serial=0,now=0;const jobs=new Map();return {jobs,setTimeout(fn,ms){const id=++serial;jobs.set(id,{fn,at:now+ms});return id},clearTimeout(id){jobs.delete(id)},tick(ms){now+=ms;for(const[id,j]of Array.from(jobs))if(j.at<=now){jobs.delete(id);j.fn()}}};}
(async()=>{
 const timers=clock();cc.testTimers=timers;
 const original=cc.assetManager.loadBundle,utils=cc.assetManager.utils,pending=new Map();
 let clipLoads=0,lookups=0;
 cc.assetManager.utils={getUrlWithUuid:(uuid,options)=>'subpackages/'+uuid+'.hash'+options.nativeExt};
 const bundle=name=>({getInfoWithPath(path){lookups++;return {uuid:name+'/'+path};},load(){clipLoads++;throw Error('No metadata allowed');}});
 cc.assetManager.loadBundle=(name,done)=>name.startsWith('delayed-')?pending.set(name,done):done(null,bundle(name));
 try{
  for(const b of ['music','sfx-core','sfx','battle'])forgetGameBundle(b);
  const files=new NativeAudioFiles();let result;
  files.load('music','menu',(e,url)=>{assert.equal(e,null);result=url});assert.equal(result,'subpackages/music/menu.hash.m4a');
  for(let i=0;i<200;i++)files.load('music','menu',(e,url)=>assert.equal(url,result));assert.equal(lookups,1,'reuse the native subpackage path');
  files.load('battle','audio/sandal-hit-pcm',(e,path)=>{assert.equal(e,null);assert.match(path,/\.wav$/);});
  files.load('sfx','enemy-cue',(e,path)=>{assert.equal(e,null);assert.match(path,/^subpackages\/sfx\//);});
  assert.equal(clipLoads,0);
  let completions=0;
  files.load('delayed-timeout','late',e=>{assert.ok(e);completions++},100);
  timers.tick(100);
  pending.get('delayed-timeout')(null,bundle('delayed-timeout'));
  assert.equal(completions,1);assert.equal(files.count,3,'late success does not cache an expired request');
  files.load('delayed-close','cancelled',e=>{assert.ok(e);completions++});
  files.destroy();pending.get('delayed-close')(null,bundle('delayed-close'));
  assert.equal(files.count,0);assert.equal(completions,2);
  const packaged=new NativeAudioFiles();
  for(const id of ['brass-oath','brass-rally']){
    let url;packaged.load('music',id,(e,path)=>{assert.equal(e,null);url=path});assert.equal(url,'subpackages/music/'+id+'.hash.m4a');
  }
  cc.assetManager.utils={getUrlWithUuid:()=> 'https://example.invalid/remote.wav'};
  packaged.load('sfx','unexpected-remote-path',(e,path)=>{assert.match(e.message,/分包地址无效/);assert.equal(path,undefined);});
  packaged.destroy();
  let creates=0,writes=0,errors=0;const callbacks=new Map(),c={src:'',autoplay:false,loop:false,plays:0,destroys:0,seek(t){this.seekTime=t},play(){this.plays++;callbacks.get('Play')?.()},pause(){callbacks.get('Pause')?.()},stop(){callbacks.get('Stop')?.()},destroy(){this.destroys++}};
  Object.defineProperty(c,'volume',{get(){return this.gain},set(v){writes++;this.gain=v}});
  for(const n of ['Play','Pause','Stop','Canplay','Error']){c['on'+n]=fn=>callbacks.set(n,fn);c['off'+n]=fn=>{assert.equal(callbacks.get(n),fn);callbacks.delete(n)}}
  const source=NativeMusic.create({createInnerAudioContext(){creates++;return c}},()=>errors++),music=new BattleMusic();source.src='wxfile://music';music.attach(source);music.begin();music.tryAutoplay();music.update(1);const base=writes;for(let i=0;i<18000;i++)music.update(1/60);assert.equal(writes,base,'steady BGM does not send 60 identical native-volume writes per second');assert.ok(source.playing);source.currentTime=8;callbacks.get('Canplay')();assert.equal(c.seekTime,8);music.pause();assert.equal(source.playing,false);music.resume();assert.ok(source.playing);source.src='wxfile://boss';assert.equal(creates,1);callbacks.get('Error')();assert.equal(source.playing,false);assert.equal(errors,1);source.destroy();source.destroy();assert.equal(c.destroys,1);assert.equal(callbacks.size,0);
  let stops=0,sets=0,gain=0,failVolume=false;
  const unstable={src:'',play(){},pause(){throw Error('native pause rejected');},stop(){stops++;},destroy(){},
    get volume(){return gain;},set volume(value){sets++;if(failVolume)throw Error('native volume rejected');gain=value;}};
  const guarded=NativeMusic.create({createInnerAudioContext:()=>unstable},()=>{});
  guarded.src='battle.m4a';assert.doesNotThrow(()=>guarded.pause());assert.equal(stops,1,'pause failure falls back to stopping the same player');
  failVolume=true;for(let i=0;i<100;i++)guarded.volume=.17;
  assert.equal(sets,2,'failed native gain writes are backed off');assert.equal(guarded.volume,0,'failed gain never updates the cache');
  failVolume=false;guarded.src='menu.m4a';guarded.volume=.17;assert.equal(gain,.17);guarded.destroy();
  assert.equal(timers.jobs.size,0);
 }finally{cc.assetManager.loadBundle=original;cc.assetManager.utils=utils;for(const b of ['music','sfx-core','sfx','battle'])forgetGameBundle(b);delete cc.testTimers;}
 console.log('通过：分包UUID/版本地址解析、原草鞋WAV/音乐M4A、拒绝远程音频路径、缓存/超时/迟到/销毁不分配临时播放器、300秒音乐零重复音量命令、监听解绑');
})().catch(e=>{console.error(e);process.exitCode=1});
