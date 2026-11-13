// DEBUG browser engineering fixture. No battle progress or save writes; menu guard + watchdog.
function installSkillVfxReview(){
 const c=globalThis.cc;let g;function find(n){if(!n)return;for(const x of n.components||[])if('buildVersion'in x)g=x;for(const child of n.children||[])find(child);}find(c?.director.getScene());
 if(!g||!g.ready||g.phase!=='menu')return {skipped:true,phase:g?.phase};
 const old={run:g.run,update:g.update,phase:g.phase,x:g.px,y:g.py,hp:g.playerHp,age:g.age,charge:g.skillCharge,kills:g.kills,hits:g.hits,remaining:g.remaining,paused:g.paused,cameraX:g.cameraX,cameraY:g.cameraY,testMode:g.testMode,backgrounded:g.backgrounded};
 const poseKeys=['heading','facing','idleTime','walkPhase','walkBlend','resumeCountdown','protectionTime','handBob','torsoBob','lean'];const poseOld={};for(const key of poseKeys)poseOld[key]=g[key];
 let closed=false,timer;const records=[];
 function restore(){if(closed)return;closed=true;clearTimeout(timer);g.update=old.update;g.clearBattle();Object.assign(g,{run:old.run,phase:old.phase,px:old.x,py:old.y,playerHp:old.hp,age:old.age,skillCharge:old.charge,kills:old.kills,hits:old.hits,remaining:old.remaining,paused:old.paused,cameraX:old.cameraX,cameraY:old.cameraY,testMode:old.testMode,backgrounded:old.backgrounded});Object.assign(g,poseOld);g.applyHeroPresentation();g.setBattleVisible(false);g.screens.root.active=true;return {restored:true,version:g.buildVersion,records};}
 function show(id,time=.14,hero='liubei',mode='peak'){
  if(closed)return {error:'closed'};clearTimeout(timer);timer=setTimeout(restore,120000);
  g.clearBattle();g.run=JSON.parse(JSON.stringify(old.run));g.run.skillId=id;g.run.heroId=hero;g.phase='battle';g.testMode=true;g.playerHp=5;g.px=g.py=g.cameraX=g.cameraY=g.heading=0;g.facing=1;g.idleTime=g.walkPhase=g.walkBlend=0;g.resumeCountdown=0;g.paused=false;g.backgrounded=false;g.protectionTime=999;g.age=0;g.remaining=15;g.run.skillHealChapter=0;g.setBattleVisible(true);g.screens.root.active=false;g.applyHeroPresentation();g.syncWeapons();
  for(let i=0;i<18;i++){const e=g.spawnNext('soldier','E01'),x=(i%6-2.5)*100,y=(Math.floor(i/6)-1)*120;Object.assign(e,{x,y,hp:1e6,maxHp:1e6,born:0,moving:false,speed:0,attackCooldown:999,weaponKind:i%2});e.node.setPosition(x,y);g.drawEnemy(e);}
  g.skillCharge=g.skillRequirement();g.castSkill();
  if(id==='G25'&&mode==='one')g.commonSkill.block();
  for(let i=0;i<Math.ceil(time*120);i++){const dt=1/120;g.age+=dt;g.combatFx.update(dt);g.updateSkill(dt);g.animateWalk(dt,0,0,1,0);for(const e of g.enemies)if(e.hp>0)g.updateEnemy(e,dt);}
  g.hero.setPosition(g.px,g.py);g.world.setPosition(0,0);g.drawPlayerHealth();g.drawProgress();g.updateEffects(0);g.update=function(){g.drawSkillButton();};c.game.step();c.director.tick(0);c.director.tick(0);
  const r={id,time,hero,mode,version:g.buildVersion,damageTargets:g.enemies.filter(e=>e.hp<1e6&&e.hp>0).length,visuals:g.commonEffects.visuals.length,particles:g.combatFx.particles.active,shield:g.commonSkill.shield,stunned:g.enemies.filter(e=>(e.stunUntil||0)>g.age).length,pose:g.commonSkill.castPose.body};records.push(r);return r;
 }
 globalThis.skillVfxReview={show,restore,records};timer=setTimeout(restore,120000);return {ready:true,version:g.buildVersion,scope:'Cocos browser runtime engineering frames; not gameplay or mobile testing'};
}
