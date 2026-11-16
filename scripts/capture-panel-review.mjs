// Independent Cocos/WebGL review, including real browser touch dispatch. Never uses the player's WeChat session.
import fs from 'node:fs';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&t.url==='http://127.0.0.1:8766/');if(!tab)throw Error('Missing isolated review tab');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const out='art/reviews/panel-controls';fs.mkdirSync(out,{recursive:true});
const frames=()=>ev('(async()=>{for(let i=0;i<3;i++)await new Promise(r=>requestAnimationFrame(r))})()');
const capture=async name=>{await frames();const image=await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1440,height:750,scale:1},captureBeyondViewport:true});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(image.data,'base64'));};
try{
 await send('Runtime.enable');await send('Page.enable');
 await ev(`(async()=>{window.c=await System.import('cc');window.g=c.director.getScene().getChildByName('Game').components.find(x=>'buildVersion'in x);if(g.buildVersion!=='stage-v9.9-panel-controls'||!g.ready)throw Error('Wrong runtime');g.showMainMenu();window.find=(n,name)=>n.name===name?n:n.children.map(k=>find(k,name)).find(Boolean);window.profileBefore=JSON.stringify(g.profile);window.storageBefore=c.sys.localStorage.getItem('taoyuan-stage-profile-v8')})()`);
 const tap=async(name,root='g.ui')=>{const p=await ev(`(()=>{const n=find(${root},${JSON.stringify(name)});if(!n)throw Error('Missing '+${JSON.stringify(name)});const p=n.worldPosition;return{x:720+p.x,y:375-p.y}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:37,radiusX:3,radiusY:3,force:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frames();};
 const audit=async(name,root='g.ui')=>ev(`(()=>{const n=find(${root},${JSON.stringify(name)}),s=n.getComponent(c.Sprite),r=n.getComponent(c.UITransform);if(!s||s.spriteFrame!==g.artFrames['ui-panel-close']||n.getComponent(c.Graphics))throw Error('Close must share cached sprite '+n.name);return{name:n.name,width:r.width,height:r.height,texture:[s.spriteFrame.texture.width,s.spriteFrame.texture.height]}})()`);
 const controls=[];
 await ev("find(g.screens.root,'HeroSkillSelect').emit(c.Node.EventType.TOUCH_END)");controls.push(await audit('SkillClose'));await capture('skills');await tap('SkillClose');
 await ev("find(g.screens.root,'HeroWeaponSelect').emit(c.Node.EventType.TOUCH_END)");controls.push(await audit('StarterCancel'));await capture('starter');await tap('StarterCancel');
 await ev("g.screens.codex(()=>g.showMainMenu(),g.profile)");controls.push(await audit('Codex-返回'));await capture('codex');await tap('Codex-返回');
 await ev("g.startTraining('liubei','G03')");controls.push(await audit('TrainingClose'));await capture('training');await tap('TrainingClose');
 const hidden=await ev('!g.trainingPanel.root.active');if(!hidden)throw Error('X must return to battlefield');
 for(let i=0;i<2;i++){await ev('g.paused=true;g.menu.active=true');controls.push(await audit('PauseClose'));if(!i)await capture('pause');await tap('PauseClose');if(await ev('g.paused||g.menu.active'))throw Error('Pause close cannot be reused');}
 await ev("g.run.weapons=Array.from({length:6},(_,i)=>({uid:i+1,id:i===1?'cleaver':'sandal',tier:i===1?3:1,invested:i===1?400:15}));g.run.nextWeaponUid=7;g.run.gold=200;g.run.offers=['w:peach:2'];g.run.offerPrices={'w:peach:2':90};g.run.purchasedOffers=[];g.showShop();window.economyBefore=JSON.stringify([g.run.gold,g.run.weapons,g.run.purchasedOffers]);find(g.screens.root,'SupplyBuy-0').emit(c.Node.EventType.TOUCH_END)");controls.push(await audit('CancelReplacement'));await capture('replacement');await tap('CancelReplacement');
 const cancelled=await ev("!find(g.screens.root,'CampDialog')&&economyBefore===JSON.stringify([g.run.gold,g.run.weapons,g.run.purchasedOffers])");if(!cancelled)throw Error('Close altered transaction');
 await ev('g.showMainMenu()');const restored=await ev("({profile:profileBefore===JSON.stringify(g.profile),storage:storageBefore===c.sys.localStorage.getItem('taoyuan-stage-profile-v8'),phase:g.phase})");
 const report={version:'stage-v9.9-panel-controls',scope:'isolated real Cocos/WebGL rendering and actual browser touch to close; engineering fixtures for shop/equipment; not iPhone FPS or touch latency',controls,trainingClosedToBattle:hidden,replacementCancelledWithoutMutation:cancelled,restored,errors};fs.writeFileSync(out+'/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(errors.length||!restored.profile||!restored.storage)throw Error('Review failed');
}finally{await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});await ev('if(window.g)g.showMainMenu()').catch(()=>{});ws.close();}
