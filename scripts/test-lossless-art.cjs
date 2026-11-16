const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const {load,cc,GameBootstrap,finishStartup}=require('./test-campaign.cjs'),{decodeIndexedArt,decodeLoadingArt}=load('indexed-art');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 for(const a of require('../art/runtime-grunts/manifest.json').entries){
  const buffer=fs.readFileSync(a.dest),{data,info}=await sharp(a.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});const start=performance.now(),decoded=decodeIndexedArt(buffer),ms=performance.now()-start;
  assert.equal(decoded.width,info.width);assert.equal(decoded.height,info.height);assert.ok(Buffer.from(decoded.pixels).equals(data),'全RGBA含半透明边缘逐字节相同');assert.equal(sha(data),a.rgbaSha256);
  for(let frame=0;frame<12;frame++){const row=Math.floor(frame/4),col=frame%4,cw=info.width/4,ch=info.height/3;const old=await sharp(data,{raw:info}).extract({left:col*cw,top:row*ch,width:cw,height:ch}).raw().toBuffer();const now=await sharp(Buffer.from(decoded.pixels),{raw:info}).extract({left:col*cw,top:row*ch,width:cw,height:ch}).raw().toBuffer();assert.ok(old.equals(now));}
  let yields=0,alive=true;
  cc.testTimers={setTimeout:fn=>setTimeout(()=>{yields++;fn();},0)};
  try {
   const asyncArt=await decodeLoadingArt(buffer,()=>alive);
   assert.ok(yields>0);assert.ok(Buffer.from(asyncArt.pixels).equals(data));
   cc.testTimers.setTimeout=fn=>setTimeout(()=>{alive=false;fn();},0);
   assert.equal(await decodeLoadingArt(buffer,()=>alive),undefined);
  } finally {delete cc.testTimers;}
  const corrupt=Buffer.from(buffer);corrupt[12]^=1;assert.throws(()=>decodeIndexedArt(corrupt),/校验/);assert.throws(()=>decodeIndexedArt(buffer.subarray(0,12)),/格式/);assert.ok(buffer.length<a.sourceBytes*.8);console.log(a.kind+' RGBA精确还原，12帧完整，Node解码 '+ms.toFixed(1)+'ms（非手机性能）');
 }
 const split=require('../art/runtime-youth/deferred-manifest.json');for(const a of split.outputs){const old=await sharp(split.source).extract({left:a.sourceRect[0],top:a.sourceRect[1],width:a.sourceRect[2],height:a.sourceRect[3]}).ensureAlpha().raw().toBuffer(),now=await sharp(a.file).ensureAlpha().raw().toBuffer();assert.ok(old.equals(now),'HUD与哭泣肖像不缩放不改色');}
 const g=new GameBootstrap();await g.start();finishStartup(g);assert.ok(!g.artFrames['result-liubei']);assert.ok(!g.artFrames['hero-zhaoyun-open']);assert.ok(g.artFrames['hero-select-liubei']);assert.equal(g.soldierFrames[0][0].rect.width,362);assert.equal(g.soldierFrames[1][11].rect.height,362);
 const {forgetGameBundle}=load('game-resources'),original=cc.assetManager.loadBundle;forgetGameBundle('results');let finish;
 cc.assetManager.loadBundle=(name,done)=>name==='results'?done(null,{load:(p,t,cb)=>{finish=cb;}}):original(name,done);
 try{g.run=load('campaign').createRun('liubei');g.phase='defeat';let displayed=0;g.prepareResult(()=>displayed++);assert.equal(g.resourceBusy,true);assert.equal(displayed,0);finish(null,{width:1152,height:384});assert.equal(displayed,1);assert.equal(g.resourceBusy,false);assert.equal(g.artFrames['result-liubei'].rect.y,0);}finally{cc.assetManager.loadBundle=original;forgetGameBundle('results');}
 // Failed deferred data never delays boot and can be requested again.
 const h=new GameBootstrap();await h.start();finishStartup(h);forgetGameBundle('results');cc.assetManager.loadBundle=(name,cb)=>name==='results'?cb(Error('offline')):original(name,cb);
 try{h.prepareResult(()=>assert.fail('must not display missing crying art'));assert.equal(h.resourceView.actions.active,true);h.showMainMenu();assert.equal(h.resourceBusy,false);}finally{cc.assetManager.loadBundle=original;forgetGameBundle('results');}
 const remoteLoad=cc.assetManager.loadRemote,logError=console.error;cc.assetManager.loadRemote=(_u,_o,done)=>done(Error('missing raw poster'));console.error=()=>{};try{const broken=new GameBootstrap();await broken.start();broken.update(.1);assert.equal(broken.ready,false);assert.equal(broken.phase,'loading');assert.match(broken.startupProgress.error,/海报/);}finally{cc.assetManager.loadRemote=remoteLoad;console.error=logError;}
 assert.ok(!fs.existsSync('assets/campaign/poster.jpg'));assert.equal(sha(fs.readFileSync('art/runtime-youth/poster.jpg')),require('../art/runtime-youth/manifest.json').poster.sha256);
 console.log('通过：无损RGBA/12帧/校验损坏、肖像无损拆分、首屏零隐藏英雄和哭泣依赖、结算延迟就绪/失败返回、单份原海报');
})().catch(e=>{console.error(e);process.exit(1)});
