// Isolated, accelerated Cocos WebGL pressure run. The browser and server both use loopback.
import fs from 'node:fs';
import path from 'node:path';
const version='stage-v11.1-pixelfx';
const out=process.argv[2]||'art/reviews/vfx-v111';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json();
const tab=tabs.find(t=>t.type==='page'&&t.url==='http://127.0.0.1:8766/');
if(!tab)throw Error('Start isolated local 8766/9336 review first');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let seq=0;
const pending=new Map();
const errors=[];
ws.onmessage=({data})=>{
 const v=JSON.parse(data);
 if(v.id){
  const {resolve,reject}=pending.get(v.id);
  pending.delete(v.id);
  if(v.error)reject(Error(JSON.stringify(v.error)));
  else resolve(v.result);
 }else if(v.method==='Runtime.exceptionThrown')errors.push(v.params);
};
const send=(method,params={})=>{
 const id=++seq;
 return new Promise((resolve,reject)=>{
  pending.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
 });
};
const ev=async expression=>{
 const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
 return r.result.value;
};
const records=[];
try{
 await send('Runtime.enable');
 const state=await ev(`(async()=>{
  window.__qaCC=await System.import('cc');
  window.__qaGame=__qaCC.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);
  const g=__qaGame;
  return {version:g?.buildVersion,ready:g?.ready,phase:g?.phase};
 })()`);
 if(state.version!==version||!state.ready||state.phase!=='menu')throw Error(JSON.stringify(state));
 await ev(`window.qaOriginalDiscovery=__qaGame.markDiscovery;__qaGame.markDiscovery=()=>{};window.qaOriginalHealth=__qaGame.health;__qaGame.health=undefined;`);
 await ev(`new Promise(resolve=>__qaGame.prepareBosses(['caocao','simayi'],resolve))`);
 const ready=await ev(fs.readFileSync('scripts/fixtures/vfx-upgrade-review.js','utf8')+';installVfxUpgradeReview()');
 if(!ready.ready)throw Error(JSON.stringify(ready));
 const caps={shots:160,enemyShots:80,particles:280,areas:6,visuals:32,quads:96,allocated:96};
 for(const orbit of [false,true]){
  const name=orbit?'six-orbits-G25':'six-mixed-G22';
  const initial=await ev(`vfxUpgradeReview.stressStart(${orbit})`);
  const samples=[];
  if(initial.enemies!==80)throw Error('Expected 78 enemies and 2 bosses');
  for(let i=0;i<20;i++){
   const sample=await ev('vfxUpgradeReview.stressStep(1800)');
   for(const [key,cap] of Object.entries(caps))if(sample.peak[key]>cap)throw Error(name+' '+key+' '+JSON.stringify(sample));
   samples.push(sample);
   console.log(name,Math.round(sample.seconds),JSON.stringify(sample.peak),sample.simulationP95);
  }
  if(samples.at(-1).seconds<599.99)throw Error('Incomplete simulation');
  records.push({name,initial,samples});
 }
 const restored=await ev('vfxUpgradeReview.restore()');
 if(!restored.profileUnchanged||!restored.storageUnchanged||errors.length)throw Error(JSON.stringify({restored,errors}));
 fs.writeFileSync(path.join(out,'pressure.json'),JSON.stringify({
  version,scope:'Desktop Cocos WebGL, accelerated 60Hz simulation; geometry every 15 frames and raster sampling every 120 frames. Times are CPU samples, not phone performance or continuous play.',
  records,restored,errors
 },null,2)+'\n');
}finally{
 await ev('globalThis.vfxUpgradeReview?.restore();if(globalThis.qaOriginalDiscovery)__qaGame.markDiscovery=qaOriginalDiscovery;if(globalThis.qaOriginalHealth)__qaGame.health=qaOriginalHealth').catch(()=>{});
 ws.close();
}
