// Isolated accelerated simulation / retained-rendering stress, not a phone FPS benchmark.
import fs from 'node:fs';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&t.url==='http://127.0.0.1:8766/');if(!tab)throw Error('Missing isolated review');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let seq=0;const pending=new Map();ws.onmessage=({data})=>{const v=JSON.parse(data);if(v.id){const q=pending.get(v.id);pending.delete(v.id);v.error?q.reject(Error(JSON.stringify(v.error))):q.resolve(v.result);}};
const ev=async expression=>{const id=++seq,p=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));const r=await p;if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const records=[];try{
 const start=await ev(fs.readFileSync('scripts/fixtures/vfx-upgrade-review.js','utf8')+';installVfxUpgradeReview()');if(!start.ready)throw Error(JSON.stringify(start));
 for(const orbit of [false,true]){
  const initial=await ev(`vfxUpgradeReview.stressStart(${orbit})`),samples=[];
  for(let i=0;i<12;i++){const r=await ev('vfxUpgradeReview.stressStep(300)');if(r.allocated>96||r.quads>96||r.shots>160||r.enemyShots>80||r.particles>280)throw Error('Budget exceeded '+JSON.stringify(r));samples.push(r);console.log(JSON.stringify({scenario:orbit?'six-sword-arrays':'six-red-ranged-weapons',sample:i+1,...r}));}
  records.push({scenario:orbit?'six-sword-arrays':'six-red-ranged-weapons',initial,samples});
 }
 const restored=await ev('vfxUpgradeReview.restore()');if(!restored.profileUnchanged||!restored.storageUnchanged)throw Error('Persistence changed');
 fs.writeFileSync('art/reviews/vfx-v10/pressure.json',JSON.stringify({version:'stage-v10.0-material-vfx',scope:'Two 60-second accelerated real Cocos simulations, 80 starting enemies, render submitted every 30 frames. Retained allocation/GPU counters only, not WeChat/iPhone FPS or crash proof.',records,restored},null,2)+'\n');
}finally{await ev('globalThis.vfxUpgradeReview?.restore()').catch(()=>{});ws.close();}
