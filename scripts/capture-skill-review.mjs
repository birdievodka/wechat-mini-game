// Actual Cocos browser engineering capture. Launch a separate Chrome profile on port 9336
// and serve build/camp-review on 8766; never attach to a user's in-progress game.
import fs from 'node:fs';
import sharp from 'sharp';

const tabs=await(await fetch('http://127.0.0.1:9336/json/list')).json();const tab=tabs.find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1:8766/'));if(!tab)throw Error('Open the isolated local Cocos review tab on 8766 first.');const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let id=0;const waiting=new Map();const errors=[];
ws.onmessage=({data})=>{const v=JSON.parse(data);if(v.id){const p=waiting.get(v.id);waiting.delete(v.id);if(v.error)p.reject(Error(JSON.stringify(v.error)));else p.resolve(v.result);}else if(v.method==='Runtime.exceptionThrown')errors.push(v.params);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;waiting.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const v=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(v.exceptionDetails)throw Error(JSON.stringify(v.exceptionDetails));return v.result.value;};
await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:750,deviceScaleFactor:1,mobile:false});await send('Page.reload',{ignoreCache:true});
let state;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,300));state=await evaluate(`(async()=>{try{const c=await System.import('cc');window.__qaCC=c;window.__qaGame=c.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return {version:__qaGame?.buildVersion,phase:__qaGame?.phase,ready:__qaGame?.ready};}catch(e){return {error:String(e)}}})()`);if(state.ready)break;}
if(!state.ready)throw Error(JSON.stringify(state));
await evaluate(`(()=>{const c=__qaCC,div=document.getElementById('GameDiv');div.style.width='1500px';div.style.height='750px';div.style.border='0';div.style.margin='0';document.querySelector('.header').style.display='none';document.querySelector('.footer').style.display='none';c.view.setCanvasSize(1500,750);c.view.setDesignResolutionSize(1500,750,c.ResolutionPolicy.SHOW_ALL);__qaGame.layoutBattlefield();return true;})()`);
console.log(state);
const fixture=fs.readFileSync('scripts/fixtures/browser-skill-vfx-review.js','utf8');console.log(await evaluate(fixture+';installSkillVfxReview()'));
const saveBefore=await evaluate(`__qaCC.sys.localStorage.getItem('taoyuan-chronicle-v4')`);
const output='art/reviews/skills-v6';fs.mkdirSync(output,{recursive:true});
const stages=[['G01',.16],['G08',.3],['G07',.18],['G10',.5],['G12',.35],['G25',.4],['G18',.3],['G26',.15],['G19',.18],['G22',.18],['G20',.45]];
const records=[];
for(const [skill,time]of stages){
 const r=await evaluate(`(async()=>{const r=skillVfxReview.show('${skill}',${time});__qaCC.director.tick(0);__qaCC.director.tick(0);return {...r,image:document.getElementById('GameCanvas').toDataURL('image/png')};})()`);
 if(!r.image?.startsWith('data:image/png;base64,'))throw Error('Missing canvas '+skill);
 fs.writeFileSync(output+'/'+skill+'.png',Buffer.from(r.image.split(',')[1],'base64'));delete r.image;records.push(r);console.log(r);
}
const labels=['冲锋破阵','百步穿杨','背水一战','火烧连营','水淹七军','护体剑阵','八门金锁','震军号令','雷霆万钧','万箭齐发','星落五丈原'];
const inputs=[];
for(let i=0;i<stages.length;i++){
 const thumb=await sharp(output+'/'+stages[i][0]+'.png').resize(500,250).toBuffer();
 const heading=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="35"><rect width="500" height="35" fill="#203c30"/><text x="14" y="26" fill="#ffe3a2" font-family="Heiti SC,PingFang SC,sans-serif" font-size="22">${labels[i]} · ${stages[i][1]}s</text></svg>`);
 inputs.push({input:heading,left:i%3*500,top:Math.floor(i/3)*285},{input:thumb,left:i%3*500,top:Math.floor(i/3)*285+35});
}
await sharp({create:{width:1500,height:1140,channels:4,background:'#203c30'}}).composite(inputs).png().toFile(output+'/实装总览.png');
const motion='/tmp/taoyuan-v6-motion';fs.mkdirSync(motion,{recursive:true});let frame=0;
for(const [skill,label]of [['G10','火烧连营'],['G22','万箭齐发'],['G25','护体剑阵'],['G26','震军号令']])for(let i=0;i<24;i++){
 const time=.025+i*.05;
 const data=await evaluate(`(()=>{skillVfxReview.show('${skill}',${time});__qaCC.director.tick(0);__qaCC.director.tick(0);return document.getElementById('GameCanvas').toDataURL('image/png');})()`);
 const title=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="750" height="32"><rect width="750" height="32" fill="#203c30"/><text x="14" y="23" fill="#ffe3a2" font-family="Heiti SC,PingFang SC,sans-serif" font-size="18">${label} · Cocos工程关键帧合成（非连续录像）</text></svg>`);
 await sharp(Buffer.from(data.split(',')[1],'base64')).resize(750,375).composite([{input:title,left:0,top:0}]).png().toFile(motion+'/'+String(frame++).padStart(3,'0')+'.png');
}
await sharp(Array.from({length:frame},(_,i)=>motion+'/'+String(i).padStart(3,'0')+'.png'),{join:{animated:true}}).gif({delay:Array.from({length:frame},()=>50),loop:0,colours:128,dither:0}).toFile(output+'/重点技能.gif');
console.log(await evaluate('skillVfxReview.restore()'));
const saveAfter=await evaluate(`__qaCC.sys.localStorage.getItem('taoyuan-chronicle-v4')`);if(saveBefore!==saveAfter)throw Error('Engineering capture modified progress');
for(const [skill]of stages)fs.unlinkSync(output+'/'+skill+'.png');
fs.rmSync(motion,{recursive:true,force:true});fs.writeFileSync(output+'/validation.json',JSON.stringify({version:state.version,scope:'Actual Cocos WebGL browser engineering frames, synthetic scene, not WeChat or iOS gameplay',records,errors,saveUnchanged:saveBefore===saveAfter,motionFrames:frame},null,2)+'\n');console.log({errors:errors.length});ws.close();
