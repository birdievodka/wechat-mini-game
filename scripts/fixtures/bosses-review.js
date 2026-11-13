// Actual Cocos engineering frames. Menu-only, no storage writes, restores all touched state.
function installBossesReview(){
 const c=globalThis.__qaCC,g=globalThis.__qaGame;if(!g?.ready||g.phase!=='menu')return {skipped:true,phase:g?.phase};
 const old={};for(const k of ['update','run','phase','px','py','age','playerHp','heading','facing','cameraX','cameraY','testMode','trainingMode','skillCharge','remaining','kills','hits','paused','hurtTime','protectionTime','cooldown','spawnClock','resumeCountdown','playerVx','playerVy'])old[k]=g[k];
 const selection=g.screens.selection,skill=g.screens.selectionSkill,save=c.sys.localStorage.getItem('taoyuan-chronicle-v7');let timer,closed=false,title;
 function restore(){if(closed)return;closed=true;clearTimeout(timer);title?.node.destroy();g.clearBattle();Object.assign(g,old);g.presentSubstep=true;g.run={...old.run,heroId:selection,skillId:skill};g.showMainMenu();g.run=old.run;g.syncWeapons();return {restored:true,saveUnchanged:save===c.sys.localStorage.getItem('taoyuan-chronicle-v7'),version:g.buildVersion};}
 function show(chapter=1,index=0,time=.5,back=false){
  if(closed)return {error:'review closed'};clearTimeout(timer);timer=setTimeout(restore,120000);
  try{
   g.clearBattle();g.run=JSON.parse(JSON.stringify(old.run));Object.assign(g.run,{chapter,heroId:'liubei',wave:2,bossEncounter:true});Object.assign(g,{phase:'battle',testMode:true,trainingMode:false,update:function(){},paused:false,resumeCountdown:0,playerHp:5,hurtTime:0,protectionTime:0,px:0,py:0,cameraX:0,cameraY:0,heading:0,age:0,facing:-1,playerVx:0,playerVy:0,presentSubstep:true});
   g.setBattleVisible(true);g.screens.hide();g.applyHeroPresentation();g.syncWeapons();g.hero.setPosition(0,0);g.animateWalk(0,0,0,0,0);g.world.setPosition(0,0);g.battlefield.setPosition(0,0);g.terrain.setPosition(0,0);
   const e=g.spawnNext('chief',undefined,chapter);Object.assign(e,{x:-260,y:back?-200:0,born:0,bossTimers:[999,999,999],hp:e.maxHp*.45});e.node.setPosition(e.x,e.y);g.bossBattle.start(e,index,back?Math.PI/2:0);e.bossTimers=[999,999,999];
   for(let t=0;t<time-1e-8;t+=1/120){const dt=Math.min(1/120,time-t);g.age+=dt;g.hurtTime=Math.max(0,g.hurtTime-dt);for(const mob of g.enemies)if(mob.hp>0)g.updateEnemy(mob,dt);g.bossBattle.update(dt);}
   g.drawPlayerHealth();g.drawProgress();g.updateEffects(0);g.hero.setPosition(g.px,g.py);
   if(!title)title=g.label(g.ui,'',0,g.halfHeight-118,23,'#ffebbe');title.string=e.bossSkin+' · '+e.bossMove.name+' · '+time.toFixed(2)+'s · 工程定帧';
   const size=e.art.node._uiProps.uiTransformComp;return {version:g.buildVersion,chapter,id:e.bossSkin,skill:e.bossMove.name,index,time,phase:e.bossState.phase,displaySize:[size.width,size.height],hearts:g.playerHp,hazards:g.bossBattle.hazards.filter(h=>h.active).map(h=>({kind:h.kind,age:h.age,delay:h.delay,x:h.x,y:h.y})),units:g.enemies.filter(e=>e.hp>0&&e.bossUnit).map(e=>({kind:e.bossUnit.kind,phase:e.bossUnit.phase,x:e.x,y:e.y,hp:e.hp})),scope:'actual Cocos engineering frame; not normal gameplay'};
  }catch(error){restore();throw error;}
 }
 const review={show,restore};globalThis.bossesReview=review;timer=setTimeout(restore,120000);return {ready:true,version:g.buildVersion};
}
