// Cold-load UI fixture in an isolated browser. Holds only the actual logo PNG request.
import fs from 'node:fs';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&t.url==='about:blank');if(!tab)throw Error('Expected isolated blank tab');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let id=0,held;const pending=new Map();
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(Error(JSON.stringify(m.error))):p.r(m.result);}else if(m.method==='Fetch.requestPaused')held=m.params.requestId;};
const send=(method,params={})=>new Promise((r,j)=>{const key=++id;pending.set(key,{r,j});ws.send(JSON.stringify({id:key,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const out='art/reviews/loading-v84';fs.mkdirSync(out,{recursive:true});let frozen=false;
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:750,deviceScaleFactor:1,mobile:false});await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Fetch.enable',{patterns:[{urlPattern:'*5b516e50-1b88-46c8-9667-954052f2c0d8.png*',requestStage:'Request'}]});await send('Page.navigate',{url:'http://127.0.0.1:8766/'});
 let state;for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,150));state=await ev(`(async()=>{if(!globalThis.System)return null;const c=await System.import('cc');window.lc=c;window.lg=c.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return lg?{phase:lg.phase,version:lg.buildVersion}:null;})()`);if(held&&state?.phase==='loading')break;}
 if(!held||state?.version!=='stage-v8.4-stable-loading-title')throw Error('Unexpected startup '+JSON.stringify(state));
 await ev(`(()=>{window.loadingOriginalUpdate=lg.update;lg.update=()=>{};lc.view.setCanvasSize(1500,750);lc.view.setDesignResolutionSize(1500,750,lc.ResolutionPolicy.SHOW_ALL);lg.layoutReady=false;lg.layoutBattlefield();return true;})()`);frozen=true;
 const records=[];async function capture(name){const r=await ev(`(()=>{const v=lg.loadingView;lc.director.tick(0);lc.director.tick(0);return {title:v.title.node.active,logo:v.logo.node.active,mode:v.titleMode,barY:v.bar.node.position.y,logoX:v.logo.node.position.x,logoY:v.logo.node.position.y,image:document.getElementById('GameCanvas').toDataURL('image/png')};})()`);fs.writeFileSync(out+'/'+name+'.png',Buffer.from(r.image.split(',')[1],'base64'));delete r.image;records.push({name,...r});return r;}
 const before=await capture('logo-pending');if(before.title||before.logo)throw Error('Fallback text flashed before logo');await send('Fetch.continueRequest',{requestId:held});held=undefined;
 for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,100));if(await ev('lg.loadingView.logo.node.active'))break;}
 const after=await capture('logo-ready');if(after.title||!after.logo||['barY','logoX','logoY'].some(k=>before[k]!==after[k]))throw Error('Branding changed layout');
 await ev('lg.update=loadingOriginalUpdate;lc.director.tick(0);lc.director.tick(0)');frozen=false;
 fs.writeFileSync(out+'/validation.json',JSON.stringify({version:state.version,scope:'isolated real Cocos cold-load UI; logo PNG request delayed by CDP; no phone test',records,restored:true},null,2)+'\n');console.log({version:state.version,records});
}finally{if(held)await send('Fetch.continueRequest',{requestId:held}).catch(()=>{});await send('Fetch.disable').catch(()=>{});if(frozen)await ev('lg.update=loadingOriginalUpdate').catch(()=>{});ws.close();}
