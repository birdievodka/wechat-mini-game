// Isolated real-engine lifecycle fixture. No personal browser, WeChat or player state.
import fs from 'node:fs';
const origin='http://127.0.0.1:8791/',port=9391;
const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json(),tab=tabs.find(t=>t.type==='page'&&(t.url===origin||t.url.startsWith(origin+'?stability=')));
if(!tab)throw Error('Missing isolated loopback review');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let serial=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(Error(JSON.stringify(m.error))):p.r(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params)};
const send=(method,params={})=>new Promise((r,j)=>{const id=++serial;pending.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const report={version:'stage-v9.13-lifecycle',scope:'isolated real desktop Cocos/WebGL; UI loops + scene/component destruction, not iPhone RSS/FPS or original crash reproduction',samples:[],errors};let stored;
const ready=async()=>{for(let i=0;i<300;i++){const s=await ev(`(async()=>{if(!globalThis.System)return null;window.lc=await System.import('cc');window.lg=lc.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return {ready:lg?.ready,phase:lg?.phase,version:lg?.buildVersion,error:lg?.startupProgress.error};})()`);if(s?.error)throw Error(JSON.stringify(s));if(s?.ready){if(s.version!==report.version||s.phase!=='menu')throw Error(JSON.stringify(s));return;}await new Promise(r=>setTimeout(r,100));}throw Error('Boot deadline')};
const measure=()=>ev(`(()=>{for(let i=0;i<5;i++)lc.director.tick(0);const d=lc.director.root.device.memoryStatus;return {buffers:d.bufferSize,textures:d.textureSize,assets:lc.assetManager.assets.count,heap:performance.memory?.usedJSHeapSize};})()`);
try{
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});await send('Page.navigate',{url:origin+'?stability='+Date.now()});await ready();
 stored=await ev(`Object.keys(lc.sys.localStorage).sort().map(k=>[k,lc.sys.localStorage.getItem(k)])`);
 await ev(`window.reviewGuard=setTimeout(()=>{lc.director.loadScene('Main');for(const k of Object.keys(lc.sys.localStorage))lc.sys.localStorage.removeItem(k);for(const[k,v]of ${JSON.stringify(stored)})lc.sys.localStorage.setItem(k,v);},600000);true`);
 for(let scene=0;scene<20;scene++){
  if(scene){await ev(`new Promise((resolve,reject)=>lc.director.loadScene('Main',e=>e?reject(e):resolve(true)))`);await ready();}
  await ev(`(()=>{lg.update=()=>{};lg.spawnClock=Infinity;return true})()`);
  for(let loop=0;loop<5;loop++){
   await ev(`(()=>{const g=lg;g.showMainMenu();const find=(n,name)=>n.name===name?n:n.children.map(x=>find(x,name)).find(Boolean);find(g.screens.root,'StartHero').emit(lc.Node.EventType.TOUCH_END);g.resumeCountdown=0;g.spawnClock=Infinity;for(let i=0;i<3;i++)lc.director.tick(0);g.run.offers=['w:sandal:1','w:pole:1','C01','C02'];g.run.offerPrices={'w:sandal:1':12,'w:pole:1':14,C01:10,C02:10};g.showShop();for(let i=0;i<3;i++)lc.director.tick(0);g.showMainMenu();return true;})()`);
  }
  report.samples.push({scene,phase:'returned-menu',...await measure()});
  if(scene===19){const layout=await send('Page.getLayoutMetrics'),area=layout.cssContentSize||layout.contentSize;const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:area.width,height:area.height,scale:1}});fs.writeFileSync('local/review-v913-lifecycle.png',Buffer.from(shot.data,'base64'));}
  // Explicit component-only destruction must release its owned Canvas and all leased textures.
  await ev(`(()=>{lg.destroy();for(let i=0;i<5;i++)lc.director.tick(0);return true})()`);
  let retired;for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,80));retired=await measure();if(retired.textures<5*1024*1024&&retired.buffers<65536)break;}
  if(retired.textures>=5*1024*1024||retired.buffers>=65536)throw Error('Resources did not retire within 4.8 seconds: '+JSON.stringify(retired));
  report.samples.push({scene,phase:'destroyed-component',...retired});console.log(JSON.stringify(report.samples.slice(-2)));
 }
 await ev(`new Promise((resolve,reject)=>lc.director.loadScene('Main',e=>e?reject(e):resolve(true)))`);await ready();
 await ev(`(()=>{lg.flushProfile();lg.health?.destroy();for(const k of Object.keys(lc.sys.localStorage))lc.sys.localStorage.removeItem(k);for(const[k,v]of ${JSON.stringify(stored)})lc.sys.localStorage.setItem(k,v);return true})()`);
 report.storageRestored=await ev(`JSON.stringify(Object.keys(lc.sys.localStorage).sort().map(k=>[k,lc.sys.localStorage.getItem(k)]))===JSON.stringify(${JSON.stringify(stored)})`);
 if(errors.length||!report.storageRestored)throw Error('Runtime/restoration failure');
 fs.writeFileSync('local/review-v913-lifecycle.json',JSON.stringify(report,null,2)+'\n');
}finally{if(stored)await ev(`(()=>{clearTimeout(window.reviewGuard);if(lg?.isValid)lg.flushProfile();for(const k of Object.keys(lc.sys.localStorage))lc.sys.localStorage.removeItem(k);for(const[k,v]of ${JSON.stringify(stored)})lc.sys.localStorage.setItem(k,v);return true})()`).catch(()=>{});ws.close();}
