// Engineering scene only; guarded menu install, explicit simulation, save check and watchdog.
function installLvbuReview(){
 const w=globalThis.__gameContextWindow||globalThis,c=w.cc||globalThis.__qaCC,g=globalThis.__gameContextWindow?c?.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x):globalThis.__qaGame;
 if(!g?.ready||g.phase!=='menu')return {skipped:true,phase:g?.phase};
 const old={};for(const k of ['update','run','phase','px','py','age','playerHp','heading','facing','cameraX','cameraY','testMode','trainingMode','skillCharge','remaining','kills','hits','paused','hurtTime','protectionTime','cooldown'])old[k]=g[k];
 const selection=g.screens.selection,skill=g.screens.selectionSkill,save=c.sys.localStorage.getItem('taoyuan-chronicle-v7');let timer,closed=false,title;
 function restore(){
  if(closed)return;closed=true;clearTimeout(timer);if(title)title.node.destroy();g.clearBattle();Object.assign(g,old);g.presentSubstep=true;
  g.run={...old.run,heroId:selection,skillId:skill};g.showMainMenu();g.run=old.run;g.syncWeapons();
  const result={restored:true,saveUnchanged:save===c.sys.localStorage.getItem('taoyuan-chronicle-v7'),version:g.buildVersion};w.__lvbuReview=result;globalThis.lvbuReview=result;return result;
 }
 function show(index=0,time=.4,back=false){
  if(closed)return {error:'review closed'};clearTimeout(timer);timer=setTimeout(restore,120000);
  try{
   g.clearBattle();g.run=JSON.parse(JSON.stringify(old.run));g.run.chapter=2;g.run.heroId='liubei';g.run.wave=2;g.run.bossEncounter=true;
   g.phase='battle';g.testMode=true;g.trainingMode=false;g.update=function(){};g.paused=false;g.resumeCountdown=0;g.playerHp=5;g.hurtTime=g.protectionTime=0;g.px=index===3?200:0;g.py=index===3&&back?100:0;g.cameraX=g.cameraY=g.heading=g.age=0;g.facing=-1;
   g.setBattleVisible(true);g.screens.hide();g.applyHeroPresentation();g.syncWeapons();g.hero.setPosition(0,0);g.animateWalk(0,0,0,0,0);g.world.setPosition(0,0);g.battlefield.setPosition(0,0);g.terrain.setPosition(0,0);
   const e=g.spawnNext('chief',undefined,2);Object.assign(e,{x:index===3?(back?-250:-500):index===1?-155:-300,y:index===3&&back?-280:back?-130:0,born:0,bossNext:index,bossTimers:[999,999,999],hp:index===2?e.maxHp*.45:e.maxHp});if(index<3)e.bossTimers[index]=0;e.node.setPosition(e.x,e.y);e.born=0;
   g.updateChronicleBoss(e,0,Math.hypot(e.x,e.y),Math.atan2(-e.y,-e.x));
   for(let t=0;t<time-1e-8;t+=1/120){const dt=Math.min(1/120,time-t);g.age+=dt;g.hurtTime=Math.max(0,g.hurtTime-dt);g.updateEnemy(e,dt);}
   g.drawPlayerHealth();g.drawProgress();g.updateEffects(0);g.hero.setPosition(g.px,g.py);
   if(!title)title=g.label(g.ui,'',0,g.halfHeight-118,23,'#ffebbe');
   title.string=['赤兔破军','画戟回旋','无双三连冲','骑马小跑'][index]+' · '+time.toFixed(2)+'s · 工程定帧';
   const size=e.art.node._uiProps.uiTransformComp;return {version:g.buildVersion,index,time,phase:e.lvbu.phase,leg:e.lvbu.leg+1,gait:e.lvbu.gait,moveSpeed:e.lvbu.moveSpeed,frame:e.art.spriteFrame?.rect,displaySize:[size.width,size.height],position:[e.x,e.y],angle:e.attackAngle,playerHearts:g.playerHp,ghosts:e.lvbuGhosts.filter(sp=>sp.node.active).length,scope:'actual Cocos engineering frame; not normal gameplay'};
  }catch(error){restore();throw error;}
 }
 const review={show,restore};w.__lvbuReview=review;globalThis.lvbuReview=review;timer=setTimeout(restore,120000);return {ready:true,version:g.buildVersion};
}
