// Engineering review of G03 only. Runs from menu, never writes a save/record.
function goldenSweepReview(){
 const w=globalThis.__gameContextWindow,c=w.cc,g=c?.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);
 if(!g||!g.ready||g.phase!=='menu')return {skipped:true,phase:g?.phase};
 const old={run:g.run,update:g.update,phase:g.phase,x:g.px,y:g.py,hp:g.playerHp,age:g.age,charge:g.skillCharge,kills:g.kills,hits:g.hits,remaining:g.remaining,paused:g.paused};
 const save=c.sys.localStorage.getItem('taoyuan-chronicle-v7');let timer,closed=false;const frames=[];
 function restore(){
  if(closed)return;closed=true;clearTimeout(timer);g.update=old.update;g.clearBattle();g.run=old.run;g.phase=old.phase;g.px=old.x;g.py=old.y;g.playerHp=old.hp;g.age=old.age;g.skillCharge=old.charge;g.kills=old.kills;g.hits=old.hits;g.remaining=old.remaining;g.paused=old.paused;
  g.applyHeroPresentation();g.setBattleVisible(false);g.screens.root.active=true;
  const result={version:g.buildVersion,restored:true,saveUnchanged:c.sys.localStorage.getItem('taoyuan-chronicle-v7')===save,frames};w.__goldenSweepReview=result;return result;
 }
 function show(time=.1){
  if(closed)return {error:'review closed'};clearTimeout(timer);timer=setTimeout(restore,120000);
  g.clearBattle();g.run=JSON.parse(JSON.stringify(old.run));g.run.skillId='G03';g.run.heroId='liubei';g.phase='battle';g.playerHp=5;g.px=g.py=g.cameraX=g.cameraY=g.heading=0;g.facing=1;g.idleTime=g.walkPhase=g.walkBlend=0;g.resumeCountdown=0;g.paused=false;g.protectionTime=999;g.age=0;g.remaining=15;g.setBattleVisible(true);g.screens.root.active=false;g.applyHeroPresentation();g.syncWeapons();g.avatar.spriteFrame=g.artFrames['hero-select-liubei'];
  for(let i=0;i<14;i++){
   const e=g.spawnNext('soldier','E01'),a=i<8?i*Math.PI/4:i<10?(i-8)*Math.PI+.4:(i-10)*Math.PI/2+.4,r=i<8?210:i<10?110:335;
   Object.assign(e,{x:Math.cos(a)*r,y:Math.sin(a)*r,hp:1e6,maxHp:1e6,born:0,moving:false,speed:0,attackCooldown:999,weaponKind:i%2});e.node.setPosition(e.x,e.y);g.drawEnemy(e);
  }
  g.skillCharge=g.skillRequirement();g.castSkill();
  for(let i=0;i<Math.ceil(time*120);i++){
   const dt=1/120;g.age+=dt;g.combatFx.update(dt);g.updateSkill(dt);g.animateWalk(dt,0,0,0,0);for(const e of g.enemies)if(e.hp>0)g.updateEnemy(e,dt);
  }
  g.hero.setPosition(0,0);g.drawPlayerHealth();g.drawProgress();g.updateEffects(0);g.update=function(){g.drawSkillButton();};
  const result={time,damageTargets:g.enemies.filter(e=>e.hp<1e6&&e.hp>0).length,visuals:g.commonEffects.visuals.length,contacts:g.commonEffects.visuals.filter(v=>v.kind==='sweep-hit').length,particles:g.combatFx.particles.active,pose:g.commonSkill.sweepPose};frames.push(result);return result;
 }
 w.__goldenSweepReview={show,restore};timer=setTimeout(restore,120000);return {ready:true,version:g.buildVersion,scope:'engineering fixed-time review; no gameplay progress'};
}
