const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const project=process.env.TAOYUAN_REVIEW_WECHAT_PROJECT||path.join(root,'build/wechatgame');
const expectedVersion=fs.readFileSync(path.join(root,'assets/scripts/survival.ts'),'utf8').match(/export const SURVIVAL_VERSION = '([^']+)'/)?.[1];
assert.ok(expectedVersion,'Missing source build version');
const out=path.join(root,'art/reviews/handcrafted');
function call(tool,...args){
  const reply=spawnSync('wechatide',['-c','Codex',tool,'--project',project,...args],{encoding:'utf8',timeout:20000});
  if(reply.error)throw reply.error;
  if(reply.status!==0)throw Error(reply.stdout+'\n'+reply.stderr);
  const result=JSON.parse(reply.stdout.slice(reply.stdout.indexOf('{')));
  assert.ok(result.ok&&result.result?.success!==false,JSON.stringify(result));
  return result.result;
}
function evaluate(body){
  return call('automation_evaluate','--fn-source',`function(){
    const w=globalThis.__gameContextWindow,c=w.cc;
    const g=c.director.getScene().getChildByName('Game').components.find(x=>'buildVersion' in x);
    ${body}
  }`).result;
}
function screenshot(name){
  const file=path.join(out,name+'.png');
  const result=call('simulator_screenshot','--path',file,'--optimize','false');
  assert.ok(fs.statSync(file).size>10000,'Simulator returned a blank or invalid screenshot');
  return {file:name+'.png',width:result.imageWidth,height:result.imageHeight};
}

const home=evaluate(`
  const frames=g.artFrames;
  const find=(node,name)=>node.name===name?node:node.children.map(n=>find(n,name)).find(Boolean);
  const button=find(g.screens.root,'StartHero');
  const start=button?.getComponentsInChildren(c.Label).find(label=>label.string==='开始挑战');
  const menuArt=c.assetManager.getBundle('hero-menu');
  const regular=menuArt.get('taoyuan-ui-regular',c.TTFFont),medium=menuArt.get('taoyuan-ui-medium',c.TTFFont);
  const canvas=w.document.createElement('canvas');canvas.width=8;canvas.height=8;
  const context=canvas.getContext('2d');
  const sample='WWiiiAA0011';
  const width=family=>{context.font='44px '+family;return context.measureText(sample)?.width;};
  const systemWidth=width('Arial'),regularWidth=width(regular?._nativeAsset),mediumWidth=width(medium?._nativeAsset);
  canvas.width=canvas.height=0;
  const measured=[regularWidth,mediumWidth].every(value=>Number.isFinite(value)&&Math.abs(value-systemWidth)>1);
  return {version:g.buildVersion,ready:g.ready,phase:g.phase,nativeAudio:g.nativeAudio,
    redraw:[frames['hero-liubei-open'],frames['stage-relief-1'],frames['redesign-skill-2']].every(Boolean),
    startButton:!!button?.getChildByName('StartHeroFace')&&start?.node._uiProps.uiTransformComp?.width===270&&start.isBold,
    fonts:regular?._nativeAsset==='TaoyuanWenkaiR1'&&medium?._nativeAsset==='TaoyuanWenkaiM1'&&g.hud.node.getComponent(c.Label)?.font===regular&&start?.font===medium,
    fontMetricsDifferFromSystem:measured,
    farmerFrames:g.soldierFrames.map(row=>row.length)};
`);
assert.deepEqual(home,{version:expectedVersion,ready:true,phase:'menu',nativeAudio:true,redraw:true,startButton:true,fonts:true,fontMetricsDifferFromSystem:true,farmerFrames:[12,12]});
home.screenshot=screenshot('wechat-home');
let battle,restored;
try{
  battle=evaluate(`
    if(g.profileDirty||g.phase!=='menu')throw Error('Open the review build at a settled menu');
    const store=c.sys.localStorage,key='taoyuan-stage-profile-v8';
    w.__taoyuanReview={run:g.run,stage:g.selectedStage,update:g.update,original:store.getItem(key)};
    const find=(node,name)=>node.name===name?node:node.children.map(n=>find(n,name)).find(Boolean);
    const start=find(g.screens.root,'StartHero');
    if(!start)throw Error('Missing StartHero');
    g.update=()=>{};
    start.emit('touch-end',{propagationStopped:false});
    if(g.phase!=='battle')throw Error('StartHero did not enter battle');
    const e=g.spawnNext('soldier','E01');
    Object.assign(e,{x:150,y:50,born:0,direction:1,attack:.33,attackAngle:Math.PI,weaponKind:0});
    e.node.setPosition(e.x,e.y);g.drawEnemy(e,true);g.updateEffects(0);
    return {phase:g.phase,wave:g.run.stageWave,menuNodes:g.screens.root.children.length,
      farmer:e.art.spriteFrame===g.soldierFrames[0][6]&&e.art.spriteFrame.rect.width===362};
  `);
  assert.deepEqual(battle,{phase:'battle',wave:1,menuNodes:0,farmer:true});
  battle.screenshot=screenshot('wechat-battle');
}finally{
  restored=evaluate(`
    const review=w.__taoyuanReview;
    if(!review)return {phase:g.phase,saveUnchanged:true};
    delete w.__taoyuanReview;
    g.update=review.update;g.run=review.run;g.selectedStage=review.stage;g.profileDirty=false;
    g.showMainMenu();
    return {phase:g.phase,saveUnchanged:c.sys.localStorage.getItem('taoyuan-stage-profile-v8')===review.original};
  `);
  assert.deepEqual(restored,{phase:'menu',saveUnchanged:true});
}
const result={scope:'WeChat desktop simulator. Real menu StartHero callback; a controlled actor pose. No device measurement.',home,battle,restored};
fs.writeFileSync(path.join(out,'wechat-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
