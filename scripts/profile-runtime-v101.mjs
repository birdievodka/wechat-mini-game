// Isolated 8-minute accelerated retention check of the reported six-weapon loadout.
// Not real elapsed time, a player game, iOS/JSC reproduction, or an FPS measurement.
import fs from 'node:fs';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&t.url==='http://127.0.0.1:8766/');if(!tab)throw Error('Missing isolated review');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let seq=0;const pending=new Map();ws.onmessage=({data})=>{const v=JSON.parse(data);if(v.id){const q=pending.get(v.id);pending.delete(v.id);v.error?q.reject(Error(JSON.stringify(v.error))):q.resolve(v.result);}};
const ev=async expression=>{const id=++seq,p=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));const r=await p;if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
try{
 let ready=false;for(let i=0;i<180;i++){ready=await ev(`(async()=>{if(!globalThis.System)return false;window.__qaCC=await System.import('cc');window.cc=__qaCC;window.__qaGame=cc.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return !!__qaGame?.ready;})()`).catch(()=>false);if(ready)break;await new Promise(r=>setTimeout(r,150));}if(!ready)throw Error('Boot deadline');
 await ev('window.pressureHealth=__qaGame.health;pressureHealth?.flush();__qaGame.health=undefined');
 const s=await ev(fs.readFileSync('scripts/fixtures/vfx-upgrade-review.js','utf8')+';installVfxUpgradeReview()');if(!s.ready)throw Error(JSON.stringify(s));
 const initial=await ev('vfxUpgradeReview.stressStart(false,true)');if(initial.version!=='stage-v10.1-runtime-audit')throw Error('Stale build');const samples=[];
 for(let i=0;i<96;i++){const r=await ev('vfxUpgradeReview.stressStep(300)');if(r.allocated>96||r.quads>96||r.shots>160||r.enemyShots>80||r.particles>280)throw Error('Budget exceeded '+JSON.stringify(r));if(i%6===5){samples.push(r);console.log(JSON.stringify(r));}}
 const restored=await ev('vfxUpgradeReview.restore()');if(!restored.profileUnchanged||!restored.storageUnchanged)throw Error('Persistence changed');
 fs.writeFileSync('art/reviews/runtime-v101/pressure.json',JSON.stringify({version:initial.version,scope:'480 seconds accelerated Cocos/WebGL simulation; 80 initial enemies, actual reported 6 weapon tiers + G25, render every 30 frames. Not a phone/JSC/FPS test; no normal-stage progress or shop roundtrip.',initial,samples,restored},null,2)+'\n');
}finally{await ev('globalThis.vfxUpgradeReview?.restore();if(globalThis.pressureHealth){__qaGame.health=pressureHealth;delete window.pressureHealth;}').catch(()=>{});ws.close();}
