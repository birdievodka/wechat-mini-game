// Actual Cocos engineering animation; isolated browser only, never a player's session.
import fs from 'node:fs';import sharp from 'sharp';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&(t.url==='about:blank'||t.url==='http://127.0.0.1:8766/'));if(!tab)throw Error('Expected isolated blank tab');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let id=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(Error(JSON.stringify(m.error))):p.r(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
const send=(method,params={})=>new Promise((r,j)=>{const key=++id;pending.set(key,{r,j});ws.send(JSON.stringify({id:key,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const out='art/reviews/grunt-melee';fs.mkdirSync(out,{recursive:true});let installed=false;
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:750,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:8766/'});
 let state;for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,200));state=await ev(`(async()=>{if(!globalThis.System)return null;const c=await System.import('cc');window.gc=c;window.gg=c.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return gg?{ready:gg.ready,phase:gg.phase,version:gg.buildVersion}:null;})()`);if(state?.ready)break;}
 if(state?.phase!=='menu'||state?.version!=='stage-v8.5-grunt-attack')throw Error(JSON.stringify(state));
 await ev(`(()=>{const g=gg,c=gc;window.gruntOriginal={update:g.update,run:g.run,profile:JSON.parse(JSON.stringify(g.profile)),storage:Object.keys(c.sys.localStorage).map(k=>[k,c.sys.localStorage.getItem(k)])};window.restoreGrunt=()=>{const o=gruntOriginal;clearTimeout(window.gruntWatchdog);g.clearBattle();g.update=o.update;g.run=o.run;g.profile=o.profile;for(const k of Object.keys(c.sys.localStorage))c.sys.localStorage.removeItem(k);for(const [k,v]of o.storage)c.sys.localStorage.setItem(k,v);g.showMainMenu();};window.gruntWatchdog=setTimeout(restoreGrunt,120000);g.update=()=>{};const find=(n,name)=>n.name===name?n:n.children.map(x=>find(x,name)).find(Boolean);find(g.screens.root,'StartHero').emit(c.Node.EventType.TOUCH_END);c.view.setCanvasSize(1500,750);c.view.setDesignResolutionSize(1500,750,c.ResolutionPolicy.SHOW_ALL);g.layoutReady=false;g.layoutBattlefield();window.makeGrunt=(weapon,x=-100,y=0)=>{g.clearBattle(true);g.phase='battle';g.run.stageWave=1;g.run.waveTime=0;g.spawnClock=g.cooldown=999;g.resumeCountdown=g.protectionTime=g.hurtTime=0;g.px=g.py=g.playerVx=g.playerVy=g.cameraX=g.cameraY=0;g.hero.setPosition(0,0);g.battlefield.setPosition(0,0);g.playerHp=5;g.drawPlayerHealth();g.weapons.forEach(w=>w.cooldown=999);const e=g.spawnNext('soldier','E01');Object.assign(e,{x,y,born:0,hp:1000,maxHp:1000,attack:-1,attackCooldown:0,weaponKind:weapon});e.node.setPosition(x,y);g.drawEnemy(e,true);return e;};window.gruntActor=makeGrunt(0);return true;})()`);installed=true;
 const records=[],animation=[];async function frame(dt){const r=await ev(`(()=>{gruntOriginal.update.call(gg,${dt});gc.director.tick(0);gc.director.tick(0);return {attack:gruntActor.attack,hp:gg.playerHp,direction:gruntActor.direction,image:document.getElementById('GameCanvas').toDataURL('image/png')};})()`);const pixels=Buffer.from(r.image.split(',')[1],'base64');delete r.image;return {...r,pixels};}
 for(let weapon=0;weapon<2;weapon++){
  await ev(`(()=>{gruntActor=makeGrunt(${weapon});return true;})()`);const phases=new Set();let hurt=false;
  for(let i=0;i<36;i++){
   const r=await frame(1/24);hurt||=r.hp<5;animation.push(await sharp(r.pixels).extract({left:590,top:230,width:320,height:220}).resize(640,440).png().toBuffer());
   const phase=r.attack>=.1&&r.attack<.35?'raise':r.attack>=.35&&r.attack<.48?'hold':r.attack>=.48&&r.attack<.6?'strike':r.attack>=.6&&r.attack<.78?'recover':null;
   if(phase&&!phases.has(phase)){phases.add(phase);const name=(weapon?'hoe-':'sickle-')+phase;fs.writeFileSync(out+'/'+name+'.png',r.pixels);records.push({name,attack:r.attack,hp:r.hp,direction:r.direction});}
  }
  if(phases.size!==4||!hurt)throw Error('Incomplete real attack '+weapon);
 }
 await sharp(animation,{join:{animated:true}}).gif({delay:42,loop:0,colours:128,dither:0}).toFile(out+'/attack.gif');
 for(let direction=0;direction<4;direction++){
  const r=await ev(`(()=>{const a=[-Math.PI/2,0,Math.PI/2,Math.PI][${direction}];gruntActor=makeGrunt(${direction%2},-Math.cos(a)*64,-Math.sin(a)*64);for(let i=0;i<30;i++)gruntOriginal.update.call(gg,1/120);gc.director.tick(0);gc.director.tick(0);return {direction:gruntActor.direction,attack:gruntActor.attack,hp:gg.playerHp,image:document.getElementById('GameCanvas').toDataURL('image/png')};})()`);
  if(r.direction!==direction||r.hp!==5)throw Error('Direction/anticipation damage mismatch');fs.writeFileSync(out+'/direction-'+direction+'.png',Buffer.from(r.image.split(',')[1],'base64'));delete r.image;records.push({name:'direction-'+direction,...r});
 }
 await ev('restoreGrunt()');installed=false;fs.writeFileSync(out+'/validation.json',JSON.stringify({version:state.version,scope:'isolated real Cocos engineering frames; GIF is 2x crop assembled at 24 fps, not phone recording or gameplay score',records,motionFrames:animation.length,errors,restored:true},null,2)+'\n');console.log({records:records.length,frames:animation.length,errors:errors.length});if(errors.length)throw Error('Runtime errors');
}finally{if(installed)await ev('restoreGrunt()').catch(()=>{});ws.close();}
