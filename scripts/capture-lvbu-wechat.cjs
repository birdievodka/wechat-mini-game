// Purpose-built WeChat CLI, menu-only engineering review; never records gameplay progress.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const project=path.resolve(__dirname,'..'),out=path.join(project,'art/reviews/lvbu');
function call(tool,args){const r=spawnSync('wechatide',['-c','Codex',tool,'--project',project,...args],{encoding:'utf8',maxBuffer:4*1024*1024});if(r.status!==0)throw Error(r.stdout+'\n'+r.stderr);const v=JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));if(!v.ok||v.result?.success===false)throw Error(JSON.stringify(v));return v.result;}
const evaluate=body=>call('automation_evaluate',['--fn-source','function(){'+body+'}']).result;
let installed=false,restored,visualVerified=false,failure;
const samples=[];
try{
 const state=evaluate(`const c=globalThis.__gameContextWindow?.cc,g=c?.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);if(g?.phase==='loading'&&g.startupProgress.value===1){c.director.tick(0);c.director.tick(0);}return {version:g?.buildVersion,ready:g?.ready,phase:g?.phase,progress:g?.startupProgress?.value};`);
 if(state.version!=='chronicles-v6.5-lvbu-gold-sweep'||!state.ready||state.phase!=='menu'){console.log({skipped:true,state});process.exitCode=2;}
 else{
  const start=evaluate(fs.readFileSync(path.join(project,'scripts/fixtures/lvbu-review.js'),'utf8')+';return installLvbuReview();');if(!start.ready)throw Error(JSON.stringify(start));installed=true;
  for(const [index,time,name]of [[0,1.16,'微信冲锋.png'],[1,1.35,'微信回旋.png'],[2,2.9,'微信三连冲.png']]){
   const sample=evaluate(`const r=globalThis.__gameContextWindow.__lvbuReview.show(${index},${time});const c=globalThis.__gameContextWindow.cc;c.director.tick(0);c.director.tick(0);return r;`);
   if(sample.displaySize[0]!==300)throw Error('Stale pooled sprite size');
   const file=path.join(out,name),shot=call('simulator_screenshot',['--path',file,'--optimize','false']);
   const sha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');samples.push({...sample,file:name,sha256,width:shot.imageWidth,height:shot.imageHeight});console.log({sample:index,phase:sample.phase,sha256});
  }
  if(new Set(samples.map(s=>s.sha256)).size!==3)throw Error('WeChat screenshot is stale: different phases returned identical pixels');
  visualVerified=true;
 }
}catch(error){failure=String(error);throw error;}finally{
 if(installed){restored=evaluate('const r=globalThis.__gameContextWindow.__lvbuReview;return typeof r.restore==="function"?r.restore():r;');if(!restored.saveUnchanged)throw Error('WeChat review changed progress');}
 if(!visualVerified)for(const s of samples)fs.rmSync(path.join(out,s.file),{force:true});
 if(samples.length)fs.writeFileSync(path.join(out,'wechat-validation.json'),JSON.stringify({version:'chronicles-v6.5-lvbu-gold-sweep',scope:'WeChat desktop simulator engineering review; not iOS gameplay',runtimeStagesChecked:samples.length===3,visualVerified,failure,samples:samples.map(s=>({...s,file:visualVerified?s.file:undefined})),restored},null,2)+'\n');
}
