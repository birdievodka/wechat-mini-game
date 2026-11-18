// Isolated real-Cocos neutral-object fixture: no player session, no save mutations.
import fs from 'node:fs';
const port=process.env.PROPS_CDP_PORT||9391,origin=process.env.PROPS_ORIGIN||'http://127.0.0.1:8791/';
if(!/^http:\/\/127\.0\.0\.1:\d+\/$/.test(origin))throw Error('Only an isolated loopback review is allowed');
const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json(),tab=tabs.find(t=>t.type==='page'&&(t.url===origin||t.url.startsWith(origin+'?stability=')));if(!tab)throw Error('Missing isolated review');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let serial=0;const jobs=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=jobs.get(m.id);jobs.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;jobs.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
let installed=false;
try{
 await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Network.setBypassServiceWorker',{bypass:true});await send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});await send('Page.navigate',{url:origin+'?stability='+Date.now()});let state;
 for(let i=0;i<150;i++){await new Promise(r=>setTimeout(r,150));state=await ev(`(async()=>{if(!globalThis.System)return null;window.pc=await System.import('cc');window.pg=pc.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return pg?{ready:pg.ready,phase:pg.phase,version:pg.buildVersion}:null})()`);if(state?.ready&&(!process.env.PROPS_VERSION||state.version===process.env.PROPS_VERSION))break}
 if(state?.phase!=='menu'||process.env.PROPS_VERSION&&state.version!==process.env.PROPS_VERSION)throw Error('Wrong runtime '+JSON.stringify(state));
 await ev(`(()=>{const g=pg,c=pc;window.propsOld={update:g.update,profile:JSON.stringify(g.profile),storage:c.sys.localStorage.getItem('taoyuan-stage-profile-v8')};g.startTraining('liubei','G03');g.trainingPanel.hide();g.update=()=>{};g.clearBattle();window.propsMeasure=()=>{for(let i=0;i<3;i++)c.director.tick(0);const d=c.director.root.device;return{buffers:d.memoryStatus.bufferSize,textures:d.memoryStatus.textureSize,models:g.root.getComponentsInChildren(c.Graphics).filter(x=>x.model?.subModels?.length).map(x=>({name:x.node.name,active:x.node.activeInHierarchy,submodels:x.model.subModels.length})),enemies:g.enemies.length}};window.propsRestore=()=>{g.update=propsOld.update;g.showMainMenu()}})()`);installed=true;
 await ev('(async()=>{for(let i=0;i<100&&!pg.artFrames["peach-tree"];i++)await new Promise(r=>setTimeout(r,20))})()');
 const initial=await ev('propsMeasure()');
 await ev(`(()=>{const g=pg;for(const [i,kind]of ['chicken','rabbit','pig'].entries()){const e=g.spawnAnimal(kind);e.x=-180+i*180;e.y=80;e.born=0;e.node.setPosition(e.x,e.y)}for(let i=0;i<4;i++)g.dropHeart(-150+i*100,-100,i%2?'peach':'heart');g.run.challenge=true;g.run.chapter=1;for(let i=0;i<3;i++)g.spawnStageMini(i)})()`);
 const populated=await ev('propsMeasure()');
 if(process.env.PROPS_SHOT){await send('Page.enable');await ev('(async()=>{for(let i=0;i<3;i++)await new Promise(r=>requestAnimationFrame(r))})()');const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.env.PROPS_SHOT,Buffer.from(shot.data,'base64'))}
 await ev('pg.clearBattle()');const cleared=await ev('propsMeasure()');await ev('propsRestore()');installed=false;
 const restored=await ev('({phase:pg.phase,profile:propsOld.profile===JSON.stringify(pg.profile),storage:propsOld.storage===pc.sys.localStorage.getItem("taoyuan-stage-profile-v8")})');
 const report={version:state.version,scope:'isolated real desktop Cocos/WebGL neutral-prop allocation fixture; not normal spawn limits, iOS RSS, FPS or root cause',initial,populated,cleared,restored,errors};
 fs.writeFileSync(process.env.PROPS_OUTPUT||'local/props-memory.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({version:report.version,initial:{...initial,models:initial.models.length},populated:{...populated,models:populated.models.length},cleared:{...cleared,models:cleared.models.length},restored,errors:errors.length}));
 if(errors.length||!restored.profile||!restored.storage)throw Error('Restoration/runtime failed');
}finally{if(installed)await ev('propsRestore()').catch(()=>{});ws.close()}
