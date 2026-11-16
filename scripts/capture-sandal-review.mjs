// Isolated real Cocos engineering frames; never touches the WeChat player window.
import fs from 'node:fs';
import sharp from 'sharp';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&t.url==='http://127.0.0.1:8766/');
if(!tab)throw Error('Missing isolated review tab');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const ev=async expression=>{const x=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));return x.result.value;};
const out='art/reviews/sandal-grip';fs.mkdirSync(out,{recursive:true});
const capture=async name=>{const image=await ev(`(async()=>{for(let i=0;i<4;i++)await new Promise(r=>requestAnimationFrame(r));return document.getElementById('GameCanvas').toDataURL('image/png')})()`);const b=Buffer.from(image.split(',')[1],'base64');if(name)fs.writeFileSync(out+'/'+name+'.png',b);return b;};
try{
 await send('Runtime.enable');await send('Page.enable');await send('Page.reload',{ignoreCache:true});await send('Emulation.setDeviceMetricsOverride',{width:1440,height:750,deviceScaleFactor:1,mobile:false});
 let ready=false;for(let i=0;i<150;i++){await new Promise(r=>setTimeout(r,150));ready=await ev(`(async()=>{if(!globalThis.System)return false;window.c=await System.import('cc');window.g=c.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return !!g?.ready})()`);if(ready)break;}if(!ready)throw Error('Boot failed');
 const initial=await ev(`(()=>{if(g.buildVersion!=='stage-v9.6-red-strap-sandal'||g.phase!=='menu')throw Error('Wrong runtime');window.savedProfile=JSON.stringify(Object.keys(c.sys.localStorage).sort().map(k=>[k,c.sys.localStorage.getItem(k)]));window.savedUpdate=g.update;g.update=function(){};document.querySelector('.header')?.remove();document.querySelector('.footer')?.remove();const d=document.getElementById('GameDiv');d.style.width='1440px';d.style.height='750px';d.style.margin='0';d.style.border='0';c.view.setCanvasSize(1440,750);c.view.setDesignResolutionSize(1440,750,c.ResolutionPolicy.SHOW_ALL);g.layoutReady=false;g.layoutBattlefield();return{version:g.buildVersion,phase:g.phase,atlasCells:Object.keys(g.battleSprites.cells).length,atlasSize:[g.battleSprites.texture.width,g.battleSprites.texture.height],shoeCell:g.battleSprites.cells['weapon-sandal'].frame.rect,iconShared:g.artFrames['icon-sandal'].texture===g.battleSprites.texture};})()`);
 if(!initial.iconShared||initial.atlasSize[0]!==1024||initial.atlasSize[1]!==1024)throw Error('Shared atlas changed '+JSON.stringify(initial));
 await capture('menu');
 await ev(`g.startTraining('liubei','G03');g.trainingPanel.hide();g.clearBattle();g.paused=true;g.run.weapons=[{id:'sandal',uid:1001,tier:1,invested:0}];g.run.growth=0;g.refreshStats();g.px=g.py=g.cameraX=g.cameraY=0;g.hero.setPosition(0,0);g.world.setPosition(0,0);g.battlefield.setPosition(0,0);g.terrain.setPosition(0,0);g.facing=1;g.hurtTime=g.protectionTime=0;g.applyHeroPresentation();g.syncWeapons();g.animateWalk(0,0,0,0,0);g.updateFreeHand();g.drawWeaponHud();`);
 const records=[];
 for(const facing of [1,-1]){
  const record=await ev(`(()=>{g.facing=${facing};g.walkBlend=0;g.animateWalk(0,0,0,0,0);const w=g.weapons[0];w.time=w.duration;g.updateWeapon(w,0);g.updateFreeHand();return{facing:g.facing,equipped:g.run.weapons.length,hands:g.weapons.slice(0,2).map(w=>({fist:w.fist.node.active,shoe:w.shoe.active,angle:w.node.angle,grip:[w.node.position.x,w.node.position.y],fistInFront:w.fist.node.getSiblingIndex()>w.shoe.getSiblingIndex()}))}})()`);records.push(record);if(record.hands.some(h=>!h.fist||!h.shoe||!h.fistInFront)||record.equipped!==1)throw Error('Grip failed');await capture('idle-'+facing);
 }
 for(const [name,angle]of [['right',0],['up',Math.PI/2],['left',Math.PI],['down',-Math.PI/2]]){
  const record=await ev(`(()=>{g.facing=${name==='left'?-1:1};const w=g.weapons[0];w.time=0;w.angle=${angle};w.damage=16;w.aimX=g.px+Math.cos(w.angle)*300;w.aimY=g.py+Math.sin(w.angle)*300;const before=g.projectiles.filter(s=>s.node.active).length;g.updateWeapon(w,w.duration*.4);g.updateFreeHand();const after=g.projectiles.filter(s=>s.node.active).length;return{direction:'${name}',shots:after-before,shoe:w.shoe.active,fist:w.fist.node.active,spare:g.weapons[1].shoe.active}})()`);records.push(record);if(record.shots!==1||record.shoe||!record.fist||!record.spare)throw Error('Release failed '+JSON.stringify(record));await capture('release-'+name);
 }
 await ev(`g.run.weapons.push({id:'cleaver',uid:1002,tier:1,invested:0});g.syncWeapons();g.updateRestingArms()`);const multi=await ev(`({hands:g.naturalHands.filter(h=>h.node.active).length,weaponHands:g.weapons.filter(w=>w.fist.node.active).length,weapons:g.run.weapons.length})`);if(multi.hands!==2||multi.weaponHands)throw Error('Multiweapon hands failed');await capture('multi');
 await ev(`g.run.weapons=[{id:'pole',uid:1003,tier:1,invested:0}];g.syncWeapons()`);const switched=await ev(`({spare:g.weapons[1].shoe.active,gripping:g.weapons[0].fist.node.active})`);if(switched.spare)throw Error('Old spare persisted');
 const grounds=[];
 await ev(`g.clearBattle();g.run.challenge=true;delete g.artFrames['world-ground'];g.setBattleHudVisible(false);g.hero.active=false;`);
 for(let chapter=1;chapter<=6;chapter++){
  const terrain=await ev(`(()=>{g.run.chapter=${chapter};g.rebuildMeadow();return{chapter:${chapter},tiles:g.meadowTiles.length,correct:g.meadowTiles.every(n=>n.getComponent(c.Sprite).spriteFrame===g.artFrames['stage-ground-${chapter}'])}})()`);
  const visible=await sharp(await capture('ground-'+chapter)).ensureAlpha().raw().toBuffer();
  await ev('g.meadowTiles.forEach(n=>n.active=false)');const hidden=await sharp(await capture()).ensureAlpha().raw().toBuffer();
  let changed=0;for(let i=0;i<visible.length;i+=4)if(Math.abs(visible[i]-hidden[i])+Math.abs(visible[i+1]-hidden[i+1])+Math.abs(visible[i+2]-hidden[i+2])>12)changed++;
  await ev('g.meadowTiles.forEach(n=>n.active=true)');terrain.changedPixelsWhenHidden=changed;grounds.push(terrain);if(!terrain.correct||!terrain.tiles||changed<100000)throw Error('Ground hidden behind opaque fill '+JSON.stringify(terrain));
 }
 await ev('g.hero.active=true');
 await ev('g.clearBattle();g.update=savedUpdate;g.showMainMenu()');const restored=await ev(`({phase:g.phase,profileUnchanged:savedProfile===JSON.stringify(Object.keys(c.sys.localStorage).sort().map(k=>[k,c.sys.localStorage.getItem(k)]))})`);
 const report={scope:'isolated real Cocos/WebGL engineering frames, not iPhone testing',initial,records,multi,switched,grounds,restored,errors};fs.writeFileSync(out+'/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(errors.length||!restored.profileUnchanged)throw Error('Review failed');
}finally{await ev('if(window.g&&window.savedUpdate){g.update=savedUpdate;g.showMainMenu()}').catch(()=>{});ws.close();}
