// Isolated real Cocos WebGL UI review, never a user's WeChat profile.
import fs from 'node:fs';import sharp from 'sharp';
const origin='http://127.0.0.1:8793/',out='art/reviews/training-forms';
const tabs=await(await fetch('http://127.0.0.1:9393/json/list')).json(),tab=tabs.find(t=>t.type==='page'&&t.url.startsWith(origin));if(!tab)throw Error('Missing own review tab');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let serial=0,installed=false;const pending=new Map(),errors=[],records=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(Error(JSON.stringify(m.error))):p.r(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
const send=(method,params={})=>new Promise((r,j)=>{const id=++serial;pending.set(id,{r,j});ws.send(JSON.stringify({id,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));fs.mkdirSync(out,{recursive:true});
const capture=async name=>{await ev('c.director.tick(0);c.director.tick(0)');await wait(60);const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'));};
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:750,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:origin+'?forms='+Date.now()});let ready;
 for(let i=0;i<240;i++){ready=await ev(`(async()=>{if(!window.System)return {};window.c=await System.import('cc');window.g=c.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);return {ready:g?.ready,phase:g?.phase,version:g?.buildVersion,forms:typeof g?.setTrainingForm==='function'};})()`);if(ready.ready)break;await wait(100);}
 if(!ready.ready||ready.phase!=='menu'||!ready.forms)throw Error('Wrong runtime '+JSON.stringify(ready));
 await ev(`(()=>{document.querySelector('.header')?.remove();document.querySelector('.footer')?.remove();document.body.style.margin='0';Object.assign(document.getElementById('GameDiv').style,{width:'1440px',height:'750px',margin:'0',border:'0'});c.view.setCanvasSize(1440,750);c.view.setDesignResolutionSize(1440,750,c.ResolutionPolicy.SHOW_ALL);g.layoutReady=false;g.layoutBattlefield();window.formSaved={run:g.run,profile:JSON.parse(JSON.stringify(g.profile)),stage:g.selectedStage,storage:Object.keys(c.sys.localStorage).sort().map(k=>[k,c.sys.localStorage.getItem(k)])};window.restoreForms=()=>{clearTimeout(window.formGuard);g.showMainMenu();g.run=formSaved.run;g.profile=formSaved.profile;g.selectedStage=formSaved.stage;g.showMainMenu();for(const k of Object.keys(c.sys.localStorage))c.sys.localStorage.removeItem(k);for(const[k,v]of formSaved.storage)c.sys.localStorage.setItem(k,v);};window.formGuard=setTimeout(restoreForms,120000);window.clickForm=name=>{const find=n=>n.name===name?n:n.children.map(find).find(Boolean),n=find(g.trainingPanel.root);if(!n)throw Error('Missing '+name);n.emit(c.Node.EventType.TOUCH_END,{propagationStopped:false});};g.startTraining('liubei','G03');clickForm('TrainingGrowth');})()`);installed=true;
 for(const id of ['liubei','guanyu','zhangfei']){
  for(let n=0;n<=6;n++){
   await ev(`clickForm('TrainingHero-${id}');clickForm('TrainingChoice-4-${n}');clickForm('TrainingApplyForm');`);
   for(let i=0;i<200&&await ev('g.resourceBusy');i++)await wait(100);
   const record=await ev(`(()=>{const p=g.trainingPanel,t=p.showcase.time,age=g.age;g.update(.05);return {hero:g.run.heroId,growth:g.run.growth,weapon:g.run.weapons[0].id,hearts:g.playerHp,pet:g.pet.active,petId:g.pet.id,dash:g.dashButton.active,mounted:p.showcase.mount.sprite.node.active,previewAnimated:p.showcase.time>t,simFrozen:g.age===age,config:p.root.active};})()`);
   if(record.hero!==id||record.growth!==n||record.pet!==(n>=5)||record.dash!==(n>=4)||!record.previewAnimated||!record.simFrozen)throw Error(JSON.stringify(record));records.push(record);await wait(40);
  }
  await ev(`clickForm('TrainingChoice-4-5');clickForm('TrainingApplyForm');`);await capture(id+'-panel');await ev(`clickForm('TrainingResume');`);await wait(160);await capture(id+'-battle');await ev('g.openTrainingPanel()');
 }
 await ev('restoreForms()');installed=false;const restored=await ev(`({phase:g.phase,storage:JSON.stringify(Object.keys(c.sys.localStorage).sort().map(k=>[k,c.sys.localStorage.getItem(k)]))===JSON.stringify(formSaved.storage)})`);
 const layers=[];for(let i=0;i<6;i++){const id=['liubei','guanyu','zhangfei'][Math.floor(i/2)],pose=i%2?'battle':'panel';layers.push({input:await sharp(out+'/'+id+'-'+pose+'.png').resize(720,375).png().toBuffer(),left:i%2*720,top:Math.floor(i/2)*375});}await sharp({create:{width:1440,height:1125,channels:4,background:'#203c30'}}).composite(layers).png().toFile(out+'/overview.png');
 fs.writeFileSync(out+'/validation.json',JSON.stringify({scope:'isolated Cocos WebGL actual UI events; no iPhone FPS/stability claim',version:ready.version,records,restored,errors},null,2)+'\n');if(errors.length||!restored.storage)throw Error('Runtime/restoration errors');console.log({forms:records.length,stills:6,restored,errors:errors.length});
}finally{if(installed)await ev('restoreForms()').catch(()=>{});ws.close();}
