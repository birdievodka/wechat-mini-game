// Run only against a fresh local Chromium profile and the Cocos review build.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';

const expectedVersion=fs.readFileSync(new URL('../assets/scripts/survival.ts',import.meta.url),'utf8').match(/export const SURVIVAL_VERSION = '([^']+)'/)?.[1];
assert.ok(expectedVersion,'Missing source build version');
const url='http://127.0.0.1:8779/';
const tabs=await (await fetch('http://127.0.0.1:9349/json/list')).json();
const tab=tabs.find(item=>item.type==='page'&&item.url===url);
assert.ok(tab,'Start the isolated Cocos preview first');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
const pending=new Map(),errors=[],records=[];
let serial=0;
ws.onmessage=({data})=>{
  const message=JSON.parse(data);
  if(message.id){
    const task=pending.get(message.id);
    pending.delete(message.id);
    if(message.error)task.reject(new Error(JSON.stringify(message.error)));
    else task.resolve(message.result);
  }else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
  else if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')errors.push(message.params.args.map(a=>a.value||a.description));
};
function send(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function ev(expression){
  const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const out='art/reviews/handcrafted';
fs.mkdirSync(out,{recursive:true});
const frames=()=>ev('(async()=>{for(let i=0;i<3;i++)await new Promise(r=>requestAnimationFrame(r))})()');
async function capture(name,result,clip={x:0,y:0,width:1440,height:750,scale:1},directory=out){
  await frames();
  const image=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});
  fs.writeFileSync(directory+'/'+name+'.png',Buffer.from(image.data,'base64'));
  records.push({name,result});
}
async function pointFor(name,root='g.screens.root'){
  return ev(`(()=>{const n=find(${root},${JSON.stringify(name)});if(!n)throw Error('Missing '+${JSON.stringify(name)});const p=n.worldPosition;return {x:720+p.x,y:375-p.y}})()`);
}
async function tap(name,root){
  const point=await pointFor(name,root);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:71,radiusX:3,radiusY:3,force:1}]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await frames();
}
try{
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:750,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await send('Page.reload',{ignoreCache:true});
  let initial;
  for(let i=0;i<80;i++){
    await sleep(250);
    initial=await ev(`(async()=>{if(!globalThis.System)return;window.c=await System.import('cc');window.g=c.director.getScene()?.getChildByName('Game')?.components.find(o=>'buildVersion' in o);return g&&{ready:g.ready,phase:g.phase,version:g.buildVersion,error:g.startupProgress?.error}})()`);
    if(initial?.ready||initial?.error)break;
  }
  assert.ok(initial?.ready,JSON.stringify({initial,errors}));
  assert.equal(initial.version,expectedVersion);
  await ev(`(()=>{
    if(g.phase!=='menu')throw Error('Open the isolated preview at its menu');
    window.find=(root,name)=>root.name===name?root:root.children.map(n=>find(n,name)).find(Boolean);
    const menuArt=c.assetManager.getBundle('hero-menu');
    window.uiRegular=menuArt.get('taoyuan-ui-regular',c.TTFFont);
    window.uiMedium=menuArt.get('taoyuan-ui-medium',c.TTFFont);
    const registered=font=>!!font?._nativeAsset&&Array.from(document.fonts).some(face=>face.family===font._nativeAsset&&face.status==='loaded');
    if(!registered(uiRegular)||!registered(uiMedium)||uiRegular._nativeAsset===uiMedium._nativeAsset)throw Error('Both local TTF weights must be registered');
    window.checkUiFonts=(root)=>{
      const labels=root.getComponentsInChildren(c.Label).filter(label=>label.enabledInHierarchy&&label.string);
      if(!labels.length||labels.some(label=>label.font!==uiRegular&&label.font!==uiMedium))throw Error('Unstyled text in '+root.name);
      return {regular:labels.filter(label=>label.font===uiRegular).length,medium:labels.filter(label=>label.font===uiMedium).length};
    };
    window.previousStorage=Object.keys(c.sys.localStorage).map(key=>[key,c.sys.localStorage.getItem(key)]);
    document.querySelector('.header')?.remove();document.querySelector('.footer')?.remove();
    Object.assign(document.getElementById('GameDiv').style,{width:'1440px',height:'750px',margin:'0',border:'0'});
    c.view.setCanvasSize(1440,750);c.view.setDesignResolutionSize(1440,750,c.ResolutionPolicy.SHOW_ALL);
    g.layoutReady=false;g.layoutBattlefield();
  })()`);
  await capture('home',await ev(`(()=>{
    const menu=g.screens.root,relief=find(menu,'CurrentStageLandscape'),hero=g.screens.heroShowcase.head;
    const presentation=c.assetManager.getBundle('presentation'),headTexture=presentation.get('heroes/texture',c.Texture2D),hudTexture=presentation.get('hero-hud/texture',c.Texture2D);
    if(!headTexture||hero.spriteFrame.texture!==headTexture||g.artFrames['hero-select-liubei'].texture!==hudTexture)throw Error('Expected classic animated hero and avatar');
    if(relief.getComponent(c.Sprite).spriteFrame!==g.artFrames['stage-relief-1'])throw Error('Expected the new relief');
    if(g.artFrames['icon-sandal']!==g.artFrames['redesign-icon-sandal']||g.artFrames['skill-2']!==g.artFrames['redesign-skill-2'])throw Error('Expected the new weapon and skill art');
    const start=find(menu,'开始挑战').getComponent(c.Label);
    if(start.font!==uiMedium||!start.isBold)throw Error('Expected extra emphasis on StartHero');
    if(start.node.getComponent(c.UITransform).width!==270||start.actualFontSize<36)throw Error('The new font must preserve the StartHero text box and size');
    return {classicHero:true,relief:true,newWeaponAndSkillArt:true,profile:g.profile.version,fonts:checkUiFonts(menu)};
  })()`));
  const reliefDirectory=process.env.TAOYUAN_RELIEF_REVIEW_DIR;
  if(reliefDirectory){
    fs.mkdirSync(reliefDirectory,{recursive:true});
    await ev(`(async()=>{
      const {StageBriefView}=await System.import('chunks:///_virtual/StageViews.ts');
      window.normalStageBrief=find(g.screens.root,'HeroStageSelect');
      window.reliefReview=new StageBriefView(normalStageBrief.parent,g.artFrames);
      reliefReview.root.setPosition(normalStageBrief.position);
      reliefReview.root.setSiblingIndex(normalStageBrief.getSiblingIndex()+1);
      normalStageBrief.active=false;
    })()`);
    try{
      const crop={x:795,y:85,width:486,height:382,scale:1};
      for(let stage=1;stage<=6;stage++){
        const result=await ev(`(()=>{
          reliefReview.setSelection(g.profile,g.run.heroId,${stage});
          const landscape=find(reliefReview.root,'CurrentStageLandscape').getComponent(c.Sprite);
          if(landscape.spriteFrame!==g.artFrames['stage-relief-'+${stage}])throw Error('Unexpected relief frame');
          return {stage:${stage},label:find(reliefReview.root,'CurrentStageTitle').getComponent(c.Label).string};
        })()`);
        await capture('home-stage-'+stage,result,crop,reliefDirectory);
      }
    }finally{
      await ev('reliefReview.close();normalStageBrief.active=true;');
    }
  }
  await tap('HeroSkillSelect');
  await capture('skill-select',await ev(`(()=>{
    const panel=find(g.screens.root,'SkillSelection');
    const cta=find(panel,'携带此技能').getComponent(c.Label);
    if(cta.node.getComponent(c.UITransform).width<230||cta.actualFontSize<21)throw Error('Skill CTA must keep its full text box');
    return {fonts:checkUiFonts(panel)};
  })()`));
  await tap('SkillClose');
  await tap('设置');
  await capture('settings',await ev("({fonts:checkUiFonts(find(g.screens.root,'SettingsPanel'))})"));
  await tap('SettingsClose');
  await tap('演武场');
  const training='g.trainingPanel.root';
  await ev(`window.checkTrainingChoice=(name,selected)=>{
    const node=find(g.trainingPanel.root,name),skin=node.getChildByName('TrainingSkin').getComponent(c.Sprite);
    const text=node.getComponentsInChildren(c.Label)[0];
    const expected=selected?g.battleSprites.cells['ui-shop-card-5'].frame:g.battleSprites.cells['ui-slot-0'].frame;
    if(skin.spriteFrame!==expected||text.color.toHEX()!==(selected?'432d1d':'fff0d2'))throw Error('Incorrect training choice contrast: '+name);
    return text.string;
  };`);
  await tap('TrainingTab-2',training);
  await tap('TrainingChoice-2-pole',training);
  await tap('TrainingTier-4',training);
  await tap('TrainingSlot-1',training);
  await capture('training-weapons',await ev(`({selected:checkTrainingChoice('TrainingChoice-2-pole',true),
    unselected:checkTrainingChoice('TrainingChoice-2-sandal',false),slot:checkTrainingChoice('TrainingSlot-1',true),
    fonts:checkUiFonts(g.trainingPanel.root)})`));
  await tap('TrainingTab-4',training);
  await tap('TrainingHero-guanyu',training);
  await tap('TrainingChoice-4-2',training);
  await capture('training-heroes',await ev(`({hero:checkTrainingChoice('TrainingHero-guanyu',true),
    unselected:checkTrainingChoice('TrainingHero-liubei',false),form:checkTrainingChoice('TrainingChoice-4-2',true),
    previousForm:checkTrainingChoice('TrainingChoice-4-0',false),fonts:checkUiFonts(g.trainingPanel.root)})`));
  await tap('TrainingExit',training);
  await tap('StageSwitchButton');
  assert.equal(await ev("!!find(g.screens.root,'StageSelection')"),true);
  assert.equal(await ev("find(g.screens.root,'ThemeThumbnail').getComponent(c.Sprite).spriteFrame===g.artFrames['stage-ui-thumb-1']"),true);
  await capture('stage-picker',{realTouch:true,newThumbnail:true,fonts:await ev("checkUiFonts(find(g.screens.root,'StageSelection'))")});await tap('StageCancel');
  const startPoint=await pointFor('StartHero');
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...startPoint,id:71,radiusX:3,radiusY:3,force:1}]});
  assert.equal(await ev("find(g.screens.root,'StartHeroFace').position.y"),-3);
  assert.deepEqual(await pointFor('StartHero'),startPoint);
  await send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.deepEqual(await ev("[g.phase,find(g.screens.root,'StartHeroFace').position.y]"),['menu',0]);
  await tap('StartHero');
  await sleep(800);
  const battle=await ev('({phase:g.phase,wave:g.run.stageWave,menuNodes:g.screens.root.children.length})');
  assert.deepEqual(battle,{phase:'battle',wave:1,menuNodes:0});
  await capture('battle-start',{...battle,startButtonCancelRestored:true,fonts:await ev('checkUiFonts(g.ui)')});
  // Controlled visual comparison from here onward in the isolated browser only.
  await ev('window.normalUpdate=g.update;g.update=()=>{}');
  await capture('battle-sweep',await ev(`(()=>{
    g.clearBattle(true);g.run.skillId='G03';g.heading=0;g.skillCharge=g.skillRequirement();
    const enemies=[[-170,150,0],[-155,-90,1],[102,42,0],[142,-128,1],[190,116,1]].map(([x,y,weapon],i)=>{
      const enemy=g.spawnNext('soldier','E01');
      Object.assign(enemy,{x,y,born:0,weaponKind:weapon,direction:i<2?1:3,attack:i<2?.32:-1,attackAngle:i<2?0:Math.PI});
      enemy.node.setPosition(x,y);g.drawEnemy(enemy,true);return enemy;
    });
    if(!enemies.every(e=>e.art.spriteFrame===g.soldierFrames[e.weaponKind][e.gruntPose.cell]&&e.art.spriteFrame.rect.width===362))throw Error('Classic farmer poses missing');
    g.castSkill();
    if(g.skillCharge>=g.skillRequirement()||g.skillIcon.spriteFrame!==g.artFrames['redesign-skill-2'])throw Error(JSON.stringify({charge:g.skillCharge,need:g.skillRequirement(),phase:g.phase,health:g.playerHp,paused:g.paused,icon:g.skillFrameKey,skill:g.run.skillId}));
    g.updateSkill(.016);g.commonEffects.update(.065);g.updateEffects(0);
    return {skill:g.run.skillId,actors:enemies.length,classicFarmers:true,newSkillArt:true};
  })()`));
  await ev("new Promise(resolve=>g.prepareBosses(['zhangjiao'],resolve))");
  await capture('boss-idle',await ev(`(()=>{
    g.clearBattle(true);g.run.stageWave=5;g.run.bossEncounter=true;g.spawnStageBoss(false);
    g.px=-250;g.py=-165;g.hero.setPosition(g.px,g.py);g.cameraX=g.cameraY=0;
    window.reviewBoss=g.enemies.find(e=>e.hp>0&&e.bossSkin==='zhangjiao');
    const boss=reviewBoss;boss.x=68;boss.y=42;boss.node.setPosition(boss.x,boss.y);boss.born=0;
    window.sampleBoss=(seconds,pose,frame)=>{
      for(let time=0;time<seconds;time+=1/120){
        const dt=Math.min(1/120,seconds-time);
        g.bossBattle.updateBoss(reviewBoss,dt);g.bossBattle.update(dt);
      }
      g.drawEnemy(boss,true);g.drawProgress();g.updateEffects(0);
      if(boss.bossState.phase!==pose||boss.art.spriteFrame!==g.artFrames['boss-zhangjiao-action-'+frame]||boss.art.spriteFrame.originalSize.width!==448)throw Error('Wrong classic Zhangjiao phase or frame '+pose);
      if(g.artFrames['boss-zhangjiao'].rect.width!==144)throw Error('Wrong classic boss portrait');
      const zones=g.bossBattle.hazards.filter(h=>h.active).map(h=>({x:h.x,y:h.y,r:h.radius,hit:h.hit}));
      return {boss:boss.bossSkin,pose,frame,classicArt:true,zones};
    };
    return sampleBoss(0,'idle',0);
  })()`));
  await capture('boss-windup',await ev(`(()=>{
    const boss=reviewBoss,tx=125,ty=-105;
    g.px=tx;g.py=ty;
    if(!g.bossBattle.start(boss,1,Math.atan2(ty-boss.y,tx-boss.x)))throw Error('Could not start Threefold Thunder');
    g.px=-250;g.py=-165;g.hero.setPosition(g.px,g.py);
    return sampleBoss(.58,'windup',5);
  })()`));
  await capture('boss-cast',await ev("sampleBoss(.37,'cast',7)"));
  await capture('boss-recover',await ev("sampleBoss(.91,'recover',5)"));
  await capture('shop',await ev(`(()=>{
    g.run.stageWave=1;g.remaining=0;g.run.waveTime=45;g.stageBoundary();
    if(g.phase!=='shop'||g.run.offers.length!==4)throw Error('Expected the real four-card shop');
    return {phase:g.phase,cards:g.run.offers.length,fonts:checkUiFonts(g.screens.root)};
  })()`));
  await capture('clear',await ev(`(()=>{
    g.run.stageWave=5;g.endStage(true);
    if(g.phase!=='victory')throw Error('Expected stage result');
    return {phase:g.phase,fixture:true,fonts:checkUiFonts(g.screens.root)};
  })()`));
  assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/validation.json',JSON.stringify({version:initial.version,scope:'Actual Cocos WebGL. Touch input at home, stage selection and battle entry. Controlled fixture for skill, boss, shop and victory.',records,errors},null,2)+'\n');
  console.log(JSON.stringify({version:initial.version,frames:records.length,errors:errors.length}));
}finally{
  await ev(`if(window.g&&window.previousStorage){g.update=window.normalUpdate||g.update;g.clearBattle();for(const key of Object.keys(c.sys.localStorage))c.sys.localStorage.removeItem(key);for(const [key,value] of previousStorage)c.sys.localStorage.setItem(key,value);}`).catch(()=>{});
  ws.close();
}
