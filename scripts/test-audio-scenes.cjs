const assert=require('node:assert/strict');
const {newGame,load,cc}=require('./test-campaign.cjs');
(async()=>{
 const g=await newGame();g.showMainMenu();g.unlockAudio();
 assert.equal(g.musicMode,'menu');assert.ok(g.musicSource.playing);
 const before=g.musicSource.currentTime;g.update(.08);g.music.pause();g.music.resume();assert.ok(g.musicSource.currentTime>before,'menu clock advances');
 g.restart(false);assert.equal(g.musicMode,'battle');const source=g.musicSource,plays=source.plays;
 g.showShop();g.update(.08);assert.equal(source.playing,true);assert.equal(source.plays,plays,'shop never restarts battle track');
 g.onBackground();assert.equal(source.playing,false);const stopped=g.musicSource.plays;g.playSound('ui-click');assert.equal(g.musicSource.plays,stopped);g.onForeground();assert.equal(source.playing,true);
 g.showMainMenu();const pending=[],released=[],old=cc.assetManager.loadBundle,release=cc.assetManager.releaseAsset;
 cc.assetManager.releaseAsset=x=>released.push(x);cc.assetManager.loadBundle=(name,cb)=>name==='music'?cb(null,{load:(id,type,done)=>pending.push({id,done})}):old(name,cb);
 try{
  g.selectMusic('battle',true);g.selectMusic('boss');assert.equal(pending.length,1);
  const stale={name:'battle-stale'};pending.shift().done(null,stale);assert.ok(released.includes(stale));assert.equal(pending[0].id,'boss');
  g.onBackground();const boss={name:'boss-current'};pending.shift().done(null,boss);assert.equal(g.musicSource.clip,boss);assert.equal(g.musicSource.playing,false,'late download cannot play in background');
  g.onForeground();assert.ok(g.musicSource.playing);g.showMainMenu();assert.ok(released.includes(boss),'scene switch releases prior decoded music');
 }finally{cc.assetManager.loadBundle=old;cc.assetManager.releaseAsset=release;}
 // Real skill tasks emit each release, rather than a prerecorded future montage.
 for(const [id,count] of [['G08',8],['G19',4],['G20',5],['G22',4]]){
  const s=await newGame();s.spawnClock=999;s.commonSkill.reset();const e=s.spawnNext('soldier');Object.assign(e,{x:180,y:0,born:0,hp:1e7,maxHp:1e7,speed:0});
  const events=[],old=s.skillAudio.bind(s);s.skillAudio=(skill,event)=>{events.push([skill,event]);old(skill,event)};
  assert.equal(s.commonSkill.cast(id,100),true);for(let i=0;i<300;i++){s.age+=1/120;s.soundGate.update(1/120);s.updateSkill(1/120)}
  assert.equal(events.filter(e=>e[0]===id&&e[1]==='release').length,count,id+' actual timed releases');
  s.commonSkill.reset();const n=events.length;for(let i=0;i<120;i++)s.updateSkill(1/120);assert.equal(events.length,n,'cancelled skill produces no future audio');
 }
 const {SoundGate}=load('weapon-sound'),gate=new SoundGate(2);gate.acquire('gun-attack');gate.acquire('blade-hit');assert.notEqual(gate.acquire('player-hurt'),undefined);assert.equal(gate.acquire('wood-attack'),undefined,'low-priority movement cannot displace important feedback');
 console.log('通过：选人/战斗/购物音乐、后台迟到加载、旧解码资源释放、12技能中多段真实释放时序/取消、受伤声道抢占');
})().catch(e=>{console.error(e);process.exit(1)});
