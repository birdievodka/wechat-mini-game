// Isolated real Cocos browser fixture (8766/9336), never a player's WeChat game.
import fs from 'node:fs';
const list=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=list.find(x=>x.type==='page');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let serial=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>ev(`({version:gg.buildVersion,phase:gg.phase,mode:gg.musicMode,loaded:gg.musicLoaded,playing:gg.musicSource?.playing,volume:gg.musicSource?.volume,time:gg.musicSource?.currentTime,duration:gg.musicSource?.duration,clip:gg.musicSource?.clip?.name,sfx:Object.keys(gg.clips).length,voices:gg.soundSources.length,started:Array.from(gg.loggedSounds)})`);
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:750,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:8766/'});
 let ready=false;for(let i=0;i<200;i++){
  await wait(150);ready=await ev(`(async()=>{if(!globalThis.System)return false;window.gc=await System.import('cc');window.gg=gc.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return !!gg?.ready;})()`);if(ready)break;
 }if(!ready)throw Error('Real Cocos startup did not finish');
 await ev(`gc.view.setCanvasSize(1440,750);gc.view.setDesignResolutionSize(1440,750,gc.ResolutionPolicy.SHOW_ALL);gg.layoutReady=false;gg.layoutBattlefield();`);await wait(300);
 const tap=async name=>{const p=await ev(`(()=>{const find=n=>n.name===${JSON.stringify(name)}?n:n.children.map(find).find(Boolean);const n=find(gg.screens.root),c=document.getElementById('GameCanvas'),b=c.getBoundingClientRect(),v=gg.camera.worldToScreen(n.getWorldPosition());return{x:b.x+v.x*b.width/c.width,y:b.y+(c.height-v.y)*b.height/c.height}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...p});};
 const initial=await state();if(initial.version!=='stage-v9.3-audio'||initial.phase!=='menu'||initial.sfx!==87)throw Error(JSON.stringify(initial));
 await tap('liubei');await wait(700);
 const menu=await state();if(!menu.playing||menu.volume<=0||menu.clip!=='menu')throw Error('Menu playback failed '+JSON.stringify(menu));
 await tap('StartHero');await wait(1700);
 const battle=await state();if(!battle.playing||battle.clip!=='battle'||battle.voices!==6)throw Error('Battle playback failed '+JSON.stringify(battle));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await wait(400);
 const hurt=await ev(`gg.hurtPlayer(gg.px+35,gg.py,1)`);await wait(150);const feedback=await state();if(!hurt||!feedback.started.includes('player-hurt')||!feedback.started.some(x=>x.startsWith('skill-')))throw Error('Actual SFX STARTED missing '+JSON.stringify(feedback));
 await ev('gg.showShop()');await wait(500);const shop=await state();if(!shop.playing||shop.clip!=='battle'||shop.time<=battle.time)throw Error('Shop continuity failed');
 await ev(`gg.selectMusic('boss')`);await wait(750);const boss=await state();if(!boss.playing||boss.clip!=='boss')throw Error('Boss playback failed');
 await ev('gg.onBackground()');const background=await state();if(background.playing)throw Error('Background must stop audio');await ev('gg.onForeground()');await wait(350);const foreground=await state();if(!foreground.playing)throw Error('Shop foreground did not resume');
 await ev('gg.showMainMenu()');await wait(650);const returned=await state();if(!returned.playing||returned.clip!=='menu')throw Error('Menu return failed');
 if(errors.length)throw Error(JSON.stringify(errors));
 const report={scope:'isolated real Cocos/WebAudio desktop fixture; not iOS listening or phone FPS. UI launch/key skill, controlled hit/shop/music fixtures; no player profile involved.',initial,menu,battle,feedback,shop,boss,background,foreground,returned,errors};
 fs.mkdirSync('art/reviews/audio-v93',{recursive:true});fs.writeFileSync('art/reviews/audio-v93/validation.json',JSON.stringify(report,null,2)+'\n');
 const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:80});fs.writeFileSync('local/v93-audio-runtime.jpg',Buffer.from(shot.data,'base64'));
 console.log(JSON.stringify({version:returned.version,menuPlaying:menu.playing,battlePlaying:battle.playing,bossPlaying:boss.playing,shopContinuous:shop.time>battle.time,hurtStarted:feedback.started.includes('player-hurt'),skillStarted:feedback.started.filter(x=>x.startsWith('skill-')),sources:returned.voices,sfx:returned.sfx,errors:errors.length}));
}finally{ws.close();}
