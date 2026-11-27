// Isolated local Cocos/WebGL engineering frames. Never attaches to WeChat or writes player progress.
import fs from 'node:fs';
import sharp from 'sharp';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&t.url==='http://127.0.0.1:8766/');
if(!tab)throw Error('Start isolated local 8766/9336 review first');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let serial=0;const waiting=new Map(),errors=[];
ws.onmessage=({data})=>{const v=JSON.parse(data);if(v.id){const p=waiting.get(v.id);waiting.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result);}else if(v.method==='Runtime.exceptionThrown')errors.push(v.params);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const version='stage-v11.1-pixelfx',out=process.argv[2]||'art/reviews/vfx-v111';fs.mkdirSync(out,{recursive:true});const records=[];
async function capture(name,expression){const result=await ev(`(()=>{const r=${expression};const c=globalThis.__qaCC;c.director.tick(0);c.director.tick(0);return {...r,image:document.getElementById('GameCanvas').toDataURL('image/png')};})()`);const bytes=Buffer.from(result.image.split(',')[1],'base64');delete result.image;fs.writeFileSync(out+'/'+name+'.png',bytes);records.push({name,...result});return bytes;}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:750,deviceScaleFactor:1,mobile:false});
 await send('Page.reload',{ignoreCache:true});
 let state;for(let i=0;i<100;i++){state=await ev(`(async()=>{window.__qaCC=await System.import('cc');window.cc=__qaCC;window.__qaGame=cc.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return {version:__qaGame?.buildVersion,ready:__qaGame?.ready,phase:__qaGame?.phase};})()`).catch(()=>null);if(state?.ready)break;await new Promise(r=>setTimeout(r,150));}
 if(state.version!==version||!state.ready||state.phase!=='menu')throw Error(JSON.stringify(state));
 await ev(`(()=>{const d=document.getElementById('GameDiv');d.style.width='1500px';d.style.height='750px';d.style.margin='0';d.style.border='0';for(const s of ['.header','.footer']){const n=document.querySelector(s);if(n)n.style.display='none';}cc.view.setCanvasSize(1500,750);cc.view.setDesignResolutionSize(1500,750,cc.ResolutionPolicy.SHOW_ALL);__qaGame.layoutBattlefield();window.qaOriginalDiscovery=__qaGame.markDiscovery;__qaGame.markDiscovery=()=>{};window.qaOriginalHealth=__qaGame.health;__qaGame.health=undefined;window.v10SavedProfile=JSON.stringify(__qaGame.profile);window.v10SavedStorage=JSON.stringify(Object.keys(cc.sys.localStorage).sort().map(k=>[k,cc.sys.localStorage.getItem(k)]));return true;})()`);
 const ready=await ev(fs.readFileSync('scripts/fixtures/browser-skill-vfx-review.js','utf8')+';installSkillVfxReview()');if(!ready.ready)throw Error(JSON.stringify(ready));
 for(const [id,time]of [['G08',.72],['G01',.16],['G03',.12],['G18',.28],['G10',.95],['G12',.48],['G20',1.52],['G07',5.6],['G25',.75],['G26',.12],['G19',.24],['G22',.94]])await capture('skill-'+id,`skillVfxReview.show('${id}',${time})`);
 await ev('skillVfxReview.restore()');
 // Representative stage-by-stage motion is explicitly an engineering keyframe sequence.
 await ev(fs.readFileSync('scripts/fixtures/browser-skill-vfx-review.js','utf8')+';installSkillVfxReview()');
 const motion=[];for(let i=0;i<24;i++){const time=i*.035,r=await ev(`(()=>{skillVfxReview.show('G12',${time});cc.director.tick(0);cc.director.tick(0);return document.getElementById('GameCanvas').toDataURL('image/png');})()`);motion.push(await sharp(Buffer.from(r.split(',')[1],'base64')).resize(900,450).png().toBuffer());}
 const guard=[];for(let i=0;i<28;i++){
  const time=i/24,r=await ev(`(()=>{skillVfxReview.show('G25',${time},'liubei','one');return document.getElementById('GameCanvas').toDataURL('image/png');})()`);
  guard.push(await sharp(Buffer.from(r.split(',')[1],'base64')).resize(900,450).png().toBuffer());
 }
 await sharp(guard,{join:{animated:true}}).gif({delay:50,loop:0,colours:192}).toFile(out+'/guard-keyframes.gif');
 await sharp(motion,{join:{animated:true}}).gif({delay:70,loop:0,colours:192}).toFile(out+'/water-keyframes.gif');await ev('skillVfxReview.restore()');
 await ev(fs.readFileSync('scripts/fixtures/vfx-upgrade-review.js','utf8')+';installVfxUpgradeReview()');
 const catalog=JSON.parse(fs.readFileSync('.agents/skills/taoyuan-game/references/catalog.json'));
 for(const {id} of catalog.weapons){if(['twin-swords','guandao','serpent-spear'].includes(id))continue;await capture('weapon-'+id,`vfxUpgradeReview.weapon('${id}',4)`);}
 for(let i=1;i<=40;i++){const id='E'+String(i).padStart(2,'0');await capture('npc-'+id,`vfxUpgradeReview.npc('${id}')`);}
 for(const id of ['liubei','guanyu','zhangfei']){await capture('growth-'+id,`vfxUpgradeReview.growth('${id}')`);await capture('mount-'+id,`vfxUpgradeReview.mount('${id}')`);}
 for(const kind of ['hurt','heal','bounce','death'])await capture('feedback-'+kind,`vfxUpgradeReview.feedback('${kind}')`);
 for(const [n,stage,time,phase]of [['yellow',1,.85,0],['hebei',3,.93,0],['tiger',4,1.0,0],['elephant-charge',5,1.05,0],['elephant-quake',5,1.0,1],['chess-follow',6,1.7,0],['chess-cross',6,1.2,1]])await capture('mini-'+n,`vfxUpgradeReview.mini(${stage},${time},${phase})`);
 for(const name of ['birth','guard','peach'])await capture('feedback-'+name,`vfxUpgradeReview.${name}()`);
 await ev('vfxUpgradeReview.restore()');
 await ev(fs.readFileSync('scripts/fixtures/bosses-review.js','utf8')+';installBossesReview()');
 await ev(`new Promise(resolve=>__qaGame.prepareBosses(['lvbu','dongzhuo','yuanshao','caocao','menghuo','simayi'],resolve))`);
 for(const [chapter,times]of [[1,[1.2,1.4,2.1]],[3,[1.2,1.8,2.2]],[4,[1.8,2.0,2.0]],[5,[1.3,1.5,1.8]],[6,[1.6,2.2,2.0]],[7,[1.21,1.08,1.37]]])for(let i=0;i<3;i++)await capture('boss-'+chapter+'-'+i,`bossesReview.show(${chapter},${i},${times[i]})`);
 await ev('bossesReview.restore()');
 await ev(fs.readFileSync('scripts/fixtures/lvbu-review.js','utf8')+';installLvbuReview()');await ev(`new Promise(resolve=>__qaGame.prepareBosses(['lvbu'],resolve))`);for(let i=0;i<3;i++)await capture('lvbu-'+i,`lvbuReview.show(${i},${i===1?1.26:1.1})`);await ev('lvbuReview.restore()');
 await ev(fs.readFileSync('scripts/fixtures/vfx-upgrade-review.js','utf8')+';installVfxUpgradeReview()');await ev(`(async()=>{const g=__qaGame,r=g.run;g.run={...r,growth:5};await new Promise(resolve=>g.prepareBosses([],resolve));g.run=r;return true;})()`);for(const id of ['liubei','guanyu','zhangfei'])await capture('pet-'+id,`vfxUpgradeReview.pet('${id}')`);await ev('vfxUpgradeReview.restore()');
 const restored=await ev(`(()=>{const before=new Map(JSON.parse(v10SavedStorage)),storage=cc.sys.localStorage;const keys=new Set([...before.keys(),...Object.keys(storage)]);return {changedKeys:Array.from(keys).filter(k=>before.get(k)!==storage.getItem(k)),phase:__qaGame.phase,profileUnchanged:v10SavedProfile===JSON.stringify(__qaGame.profile),storageUnchanged:v10SavedStorage===JSON.stringify(Object.keys(cc.sys.localStorage).sort().map(k=>[k,cc.sys.localStorage.getItem(k)])),materials:__qaGame.vfxMaterials.allocated,textureBytes:cc.director.root.device.memoryStatus.textureSize,bufferBytes:cc.director.root.device.memoryStatus.bufferSize};})()`);
 if(!restored.storageUnchanged||!restored.profileUnchanged||errors.length)throw Error(JSON.stringify({restored,errors}));
 fs.writeFileSync(out+'/validation.json',JSON.stringify({version:state.version,scope:'Actual isolated Cocos/WebGL engineering frames, no iPhone/WeChat FPS claim',records,motion:'Water and sword guard GIFs are assembled from simulations at selected clocks.',restored,errors},null,2)+'\n');console.log(JSON.stringify({frames:records.length,restored,errors:errors.length}));
}finally{await ev('globalThis.skillVfxReview?.restore();globalThis.bossesReview?.restore();globalThis.vfxUpgradeReview?.restore();globalThis.lvbuReview?.restore();if(globalThis.qaOriginalDiscovery)__qaGame.markDiscovery=qaOriginalDiscovery;if(globalThis.qaOriginalHealth)__qaGame.health=qaOriginalHealth').catch(()=>{});ws.close();}
