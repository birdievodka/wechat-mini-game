// Isolated local Cocos WebGL review, never attaches to the player's browser/profile.
import fs from 'node:fs';
import sharp from 'sharp';
const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&t.url==='http://127.0.0.1:8766/');
if(!tab)throw Error('Missing isolated review page on 8766/9336');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let serial=0;const waiting=new Map(),errors=[];
ws.onmessage=({data})=>{const v=JSON.parse(data);if(v.id){const p=waiting.get(v.id);waiting.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result);}else if(v.method==='Runtime.exceptionThrown')errors.push(v.params);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const output='art/reviews/lvbu';fs.mkdirSync(output,{recursive:true});let installed=false;
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:750,deviceScaleFactor:1,mobile:false});await send('Page.reload',{ignoreCache:true});
 let state;for(let i=0;i<30;i++){
  await new Promise(r=>setTimeout(r,300));state=await evaluate(`(async()=>{try{const c=await System.import('cc');window.__qaCC=c;window.__qaGame=c.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return {version:__qaGame?.buildVersion,ready:__qaGame?.ready,phase:__qaGame?.phase};}catch(e){return {error:String(e)}}})()`);if(state.ready)break;
 }
 if(!state.ready||state.version!=='chronicles-v6.5-lvbu-gold-sweep')throw Error(JSON.stringify(state));console.log(state);
 await evaluate(`(()=>{const c=__qaCC,div=document.getElementById('GameDiv');div.style.width='1500px';div.style.height='750px';div.style.border='0';div.style.margin='0';document.querySelector('.header').style.display='none';document.querySelector('.footer').style.display='none';c.view.setCanvasSize(1500,750);c.view.setDesignResolutionSize(1500,750,c.ResolutionPolicy.SHOW_ALL);__qaGame.layoutBattlefield();return true;})()`);
 const installedResult=await evaluate(fs.readFileSync('scripts/fixtures/lvbu-review.js','utf8')+';installLvbuReview()');if(!installedResult.ready)throw Error(JSON.stringify(installedResult));installed=true;
 const records=[],images=[],names=['赤兔破军','画戟回旋','无双三连冲','骑马小跑'];
 const capture=async(index,time)=>{const r=await evaluate(`(()=>{const r=lvbuReview.show(${index},${time});__qaCC.director.tick(0);__qaCC.director.tick(0);return {...r,image:document.getElementById('GameCanvas').toDataURL('image/png')};})()`);if(!r.image?.startsWith('data:image/png;base64,'))throw Error('Missing rendered canvas');const b=Buffer.from(r.image.split(',')[1],'base64');delete r.image;return {record:r,buffer:b};};
 const cases=[[0,.45],[0,1.23],[0,1.8],[1,.65],[1,1.35],[1,1.52],[2,.45],[2,2.9],[2,4.5],[3,.3],[3,.8],[3,1.3]];
 for(const [index,time]of cases){const {record,buffer}=await capture(index,time);if(record.displaySize[0]!==300)throw Error('Pooled Lu Bu display size changed');records.push(record);images.push(buffer);console.log({index,time,phase:record.phase,leg:record.leg,size:record.displaySize[0]});}
 const layers=[];for(let i=0;i<images.length;i++){
  const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="34"><rect width="600" height="34" fill="#203c30"/><text x="14" y="25" fill="#ffe3a2" font-family="Heiti SC,PingFang SC,sans-serif" font-size="20">${names[cases[i][0]]} · ${cases[i][1].toFixed(2)}s</text></svg>`);
  layers.push({input:label,left:i%3*600,top:Math.floor(i/3)*334},{input:await sharp(images[i]).resize(600,300).toBuffer(),left:i%3*600,top:Math.floor(i/3)*334+34});
 }
 await sharp({create:{width:1800,height:Math.ceil(images.length/3)*334,channels:4,background:'#203c30'}}).composite(layers).png().toFile(output+'/技能实装总览.png');
 const motion=[];
 if(process.argv.includes('--motion'))for(const [index,seconds]of [[0,2.7],[1,2.5],[2,5.8],[3,2]]){
  const buffers=[],delay=[];for(let frame=0;frame<Math.ceil(seconds*12);frame++){
   const {buffer}=await capture(index,frame/12),label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="750" height="30"><rect width="750" height="30" fill="#203c30"/><text x="12" y="22" fill="#ffe3a2" font-family="Heiti SC,PingFang SC,sans-serif" font-size="17">${names[index]} · Cocos工程关键帧合成，非连续录像</text></svg>`);
   buffers.push(await sharp(buffer).resize(750,375).composite([{input:label,left:0,top:0}]).png().toBuffer());delay.push(83);
  }
  const gif=names[index]+'.gif';await sharp(buffers,{join:{animated:true}}).gif({delay,loop:0,colours:128,dither:0}).toFile(output+'/'+gif);motion.push({file:gif,frames:buffers.length,fps:12});console.log({gif,frames:buffers.length});
 }
 const restored=await evaluate('lvbuReview.restore()');installed=false;if(!restored.saveUnchanged)throw Error('Review changed progress');
 fs.writeFileSync(output+'/validation.json',JSON.stringify({version:state.version,scope:'actual Cocos WebGL in isolated headless Chrome; engineering scene, not WeChat/iOS gameplay',records,motion,errors,restored},null,2)+'\n');
 console.log({restored,errors:errors.length});if(errors.length)throw Error('Runtime exceptions during review');
}finally{if(installed)await evaluate('lvbuReview.restore()').catch(()=>{});ws.close();}
