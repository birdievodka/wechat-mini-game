// Engineering fixed-pose review only. Does not run combat AI or write progress/records.
function commonSkillReview(){
 const w=globalThis.__gameContextWindow,c=w.cc,g=c?.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);
 if(!g||!g.ready||g.phase!=='menu')return {skipped:true,phase:g?.phase};
 const old={run:g.run,update:g.update,phase:g.phase,x:g.px,y:g.py,hp:g.playerHp,age:g.age,charge:g.skillCharge,kills:g.kills,hits:g.hits},save=c.sys.localStorage.getItem('taoyuan-chronicle-v4');let timer,closed=false;
 const reviews=[];
 function restore(){if(closed)return;closed=true;clearTimeout(timer);g.update=old.update;g.clearBattle();g.run=old.run;g.phase=old.phase;g.px=old.x;g.py=old.y;g.playerHp=old.hp;g.age=old.age;g.skillCharge=old.charge;g.kills=old.kills;g.hits=old.hits;g.applyHeroPresentation();g.setBattleVisible(false);g.screens.root.active=true;const result={version:g.buildVersion,restored:true,saveUnchanged:c.sys.localStorage.getItem('taoyuan-chronicle-v4')===save,reviews};w.__commonSkillReview=result;return result;}
 function show(id,time=.3){
  if(closed)return {error:'review closed'};clearTimeout(timer);timer=setTimeout(restore,120000);
  g.clearBattle();g.run=JSON.parse(JSON.stringify(old.run));g.run.skillId=id;g.run.heroId='liubei';g.run.skillHealChapter=0;g.phase='battle';g.playerHp=id==='G17'?4:5;g.px=g.py=g.cameraX=g.cameraY=0;g.heading=0;g.resumeCountdown=0;g.paused=false;g.protectionTime=999;g.age=0;g.setBattleVisible(true);g.screens.root.active=false;g.applyHeroPresentation();g.syncWeapons();g.avatar.spriteFrame=g.artFrames['hero-select-liubei'];
  for(let i=0;i<18;i++){const e=g.spawnNext('soldier','E01');e.x=(i%6-2.5)*95;e.y=(Math.floor(i/6)-1)*105;e.hp=e.maxHp=1e6;e.born=0;e.moving=false;e.node.setPosition(e.x,e.y);g.drawEnemy(e);}
  g.skillCharge=g.skillRequirement();g.castSkill();if(id==='G11')for(let i=0;i<4;i++)g.commonSkill.interceptShot(-180,0,0,0,'E12');
  for(let i=0;i<Math.ceil(time*120);i++){g.age+=1/120;g.combatFx.update(1/120);g.updateSkill(1/120);g.animateWalk(1/120,0,0,0,0);}
  g.hero.setPosition(g.px,g.py);g.drawPlayerHealth();g.drawProgress();g.updateEffects(0);g.update=function(){g.drawSkillButton();};
  const result={id,poseSeconds:time,hero:g.run.heroId,charge:g.skillCharge,required:g.skillRequirement(),damageTargets:g.enemies.filter(e=>e.hp<1e6&&e.hp>0).length,particles:g.combatFx.particles.active,visuals:g.commonEffects.visuals.length,tasks:g.commonSkill.tasks.length};reviews.push(result);return result;
 }
 w.__commonSkillReview={show,restore};timer=setTimeout(restore,120000);return {ready:true,version:g.buildVersion,scope:'engineering fixed-pose review, not real gameplay'};
}
