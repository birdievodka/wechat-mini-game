// Engineering-only pooled spawn regression. Run only from menu; never writes progress.
function reviewEnemyBirth(definitions){
 const w=globalThis.__gameContextWindow,c=w?.cc,g=c?.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);
 if(!g?.ready||g.phase!=='menu')return {skipped:true,phase:g?.phase};
 const old={update:g.update,selection:g.screens.selection,skill:g.screens.selectionSkill,run:g.run};
 const save=c.sys.localStorage.getItem('taoyuan-chronicle-v7');let timer,closed=false;const labels=[];
 function appearance(e){return e.art.enabled?[e.art.spriteFrame]:e.rigParts.filter(sp=>sp.node.active).map(sp=>sp.spriteFrame);}
 function restore(){if(closed)return;closed=true;clearTimeout(timer);labels.forEach(n=>n.destroy());g.update=old.update;g.presentSubstep=true;g.run={...old.run,heroId:old.selection,skillId:old.skill};g.showMainMenu();g.run=old.run;const result={restored:true,saveUnchanged:c.sys.localStorage.getItem('taoyuan-chronicle-v7')===save,version:g.buildVersion};w.__enemyBirthReview=result;return result;}
 function pooled(d){g.presentSubstep=true;const prev=g.spawnNext('soldier');prev.hp=0;prev.dead=0;g.presentSubstep=false;const e=g.spawnNext(d.kind,d.id);if(e.art.node.active)throw Error('premature visibility '+d.id);return e;}
 function show(progress=.5){
  if(closed)return {error:'review closed'};clearTimeout(timer);timer=setTimeout(restore,120000);g.clearBattle();g.phase='battle';g.setBattleVisible(true);g.screens.hide();g.update=function(){};g.presentSubstep=true;
  const result=[];
  for(const [i,id]of ['E01','E12','E19'].entries()){
   const d=definitions.find(d=>d.id===id),e=pooled(d);e.x=(i-1)*180;e.y=60;e.node.setPosition(e.x,e.y);g.presentSubstep=true;g.updateEnemy(e,e.bornTotal*progress);
   if(!labels[i]){const l=g.label(g.ui,d.name,(i-1)*180,-5,21,'#432d1d');labels[i]=l.node;}
   result.push({id,name:d.name,visible:e.art.node.active,key:e.rigKey,remaining:e.born});
  }
  return {progress,samples:result,version:g.buildVersion,scope:'engineering pooled spawn review; no gameplay progress'};
 }
 try{
  g.clearBattle();g.update=function(){};const checked=[];
  for(const d of definitions){
   const e=pooled(d),first=appearance(e);if(e.rigKey!=='enemy-'+d.id+'-front'||first.length!==4||first.some(f=>!f))throw Error('wrong initial rig '+d.id);
   g.updateEnemy(e,e.bornTotal*.5);if(!e.art.node.active||appearance(e).some((f,i)=>f!==first[i]))throw Error('wrong birth rig '+d.id);
   g.presentSubstep=true;g.updateEnemy(e,e.bornTotal);if(appearance(e).some((f,i)=>f!==first[i]))throw Error('changed after birth '+d.id);
   checked.push(d.id);e.hp=0;e.dead=0;
  }
  w.__enemyBirthReview={show,restore};return {checked,frame:show(.5)};
 }catch(error){restore();throw error;}
}
