// Isolated real Cocos browser fixture (8766/9336), never a player's WeChat game.
import fs from 'node:fs';
const list=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=list.find(x=>x.type==='page');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let serial=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>ev(`({version:gg.buildVersion,phase:gg.phase,mode:gg.musicMode,loaded:gg.musicLoaded,playing:gg.musicSource?.playing,volume:gg.musicSource?.volume,time:gg.musicSource?.currentTime,duration:gg.musicSource?.duration,clip:gg.musicSource?.clip?.name,sfx:Object.keys(gg.clips).length,physicalSfx:new Set(Object.values(gg.clips)).size,voices:gg.soundSources.length,started:Array.from(gg.loggedSounds)})`);
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:750,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:8766/'});
 let ready=false;for(let i=0;i<200;i++){
  await wait(150);ready=await ev(`(async()=>{if(!globalThis.System)return false;window.gc=await System.import('cc');window.gg=gc.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return !!gg?.ready;})()`);if(ready)break;
 }if(!ready)throw Error('Real Cocos startup did not finish');
 await ev(`gc.view.setCanvasSize(1440,750);gc.view.setDesignResolutionSize(1440,750,gc.ResolutionPolicy.SHOW_ALL);gg.layoutReady=false;gg.layoutBattlefield();`);await wait(300);
 const tap=async name=>{const p=await ev(`(()=>{const find=n=>n.name===${JSON.stringify(name)}?n:n.children.map(find).find(Boolean);const n=find(gg.screens.root),c=document.getElementById('GameCanvas'),b=c.getBoundingClientRect(),v=gg.camera.worldToScreen(n.getWorldPosition());return{x:b.x+v.x*b.width/c.width,y:b.y+(c.height-v.y)*b.height/c.height}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...p});};
 const initial=await state();if(initial.version!=='stage-v9.5-lossless-assets'||initial.phase!=='menu'||initial.sfx<40||initial.sfx>=87)throw Error(JSON.stringify(initial));
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
 // Same production preparation/release path, exercised in an isolated training scene.
 const lazyMenu=await ev(`({lvbu:!!gg.artFrames['lvbu-action-0'],menghuo:!!gg.artFrames['boss-menghuo-action-0'],beasts:!!gg.artFrames['boss-beast-0']})`);
 if(lazyMenu.lvbu||lazyMenu.menghuo||lazyMenu.beasts)throw Error('Boss animation eagerly loaded at boot');
 await ev(`gg.startTraining('liubei','G03');gg.addTrainingEnemies('2',1,true)`);
 for(let i=0;i<100&&await ev('gg.resourceBusy');i++)await wait(100);
 const lvbu=await ev(`({busy:gg.resourceBusy,frames:Object.keys(gg.artFrames).filter(x=>x.startsWith('lvbu-action-')).length,boss:gg.enemies.find(e=>e.hp>0)?.bossSkin,frame:!!gg.enemies.find(e=>e.hp>0)?.art.spriteFrame})`);
 if(lvbu.busy||lvbu.frames!==20||lvbu.boss!=='lvbu'||!lvbu.frame)throw Error('Lvbu preparation failed '+JSON.stringify(lvbu));
 await ev(`gg.clearBattle();gg.addTrainingEnemies('6',1,true)`);
 for(let i=0;i<100&&await ev('gg.resourceBusy');i++)await wait(100);
 const menghuo=await ev(`({busy:gg.resourceBusy,frames:Object.keys(gg.artFrames).filter(x=>x.startsWith('boss-menghuo-action-')).length,beasts:Object.keys(gg.artFrames).filter(x=>x.startsWith('boss-beast-')).length,boss:gg.enemies.find(e=>e.hp>0)?.bossSkin,frame:!!gg.enemies.find(e=>e.hp>0)?.art.spriteFrame})`);
 if(menghuo.busy||menghuo.frames!==16||menghuo.beasts!==24||menghuo.boss!=='menghuo'||!menghuo.frame)throw Error('Menghuo preparation failed '+JSON.stringify(menghuo));
 await ev('gg.showMainMenu()');await wait(300);
 const released=await ev(`({phase:gg.phase,remoteFrames:Object.keys(gg.artFrames).filter(x=>x.startsWith('lvbu-action-')||x.startsWith('boss-menghuo-action-')||x.startsWith('boss-beast-')).length,portrait:!!gg.artFrames['boss-lvbu'],stale:gg.enemies.some(e=>e.art.spriteFrame&&!gc.isValid(e.art.spriteFrame))})`);
 if(released.phase!=='menu'||released.remoteFrames!==0||!released.portrait||released.stale)throw Error('Boss release failed '+JSON.stringify(released));
 await ev(`gg.startTraining('liubei','G03');gg.addTrainingEnemies('2',1,true)`);
 for(let i=0;i<100&&await ev('gg.resourceBusy');i++)await wait(100);
 const reloaded=await ev(`({frames:Object.keys(gg.artFrames).filter(x=>x.startsWith('lvbu-action-')).length,valid:gc.isValid(gg.artFrames['lvbu-action-0']?.texture)})`);
 if(reloaded.frames!==20||!reloaded.valid)throw Error('Cached bundle reload failed '+JSON.stringify(reloaded));
 await ev('gg.showMainMenu()');await wait(150);
 if(errors.length)throw Error(JSON.stringify(errors));
 const report={scope:'isolated real Cocos/WebAudio desktop fixture; not iOS listening or phone FPS. UI launch/key skill, controlled hit/shop/music fixtures; no player profile involved.',initial,menu,battle,feedback,shop,boss,background,foreground,returned,lazyMenu,lvbu,menghuo,released,reloaded,errors};
 fs.mkdirSync('art/reviews/audio',{recursive:true});fs.writeFileSync('art/reviews/audio/validation.json',JSON.stringify(report,null,2)+'\n');
 const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:80});fs.writeFileSync('local/v94-audio-runtime.jpg',Buffer.from(shot.data,'base64'));
 console.log(JSON.stringify({version:returned.version,menuPlaying:menu.playing,battlePlaying:battle.playing,bossPlaying:boss.playing,shopContinuous:shop.time>battle.time,hurtStarted:feedback.started.includes('player-hurt'),skillStarted:feedback.started.filter(x=>x.startsWith('skill-')),sources:returned.voices,sfx:returned.sfx,lvbu,menghuo,released,reloaded,errors:errors.length}));
}finally{ws.close();}
