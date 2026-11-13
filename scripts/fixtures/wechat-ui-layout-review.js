// Engineering-only UI fixture. Starts only from menu, never writes player progress.
function uiLayoutReview(){
 const w=globalThis.__gameContextWindow,c=w.cc,g=c?.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);
 if(!g||!g.ready||g.phase!=='menu')return {skipped:true,phase:g?.phase};
 const old={run:g.run,update:g.update,selection:g.screens.selection,skill:g.screens.selectionSkill};
 const save=c.sys.localStorage.getItem('taoyuan-chronicle-v7');let timer,closed=false;
 const run=JSON.parse(JSON.stringify(old.run));Object.assign(run,{gold:28,offers:['w:sandal:1','w:peach:2','D09'],offerPrices:{'w:sandal:1':28,'w:peach:2':32,D09:28},purchasedOffers:[],supplyMode:'normal',inventory:{D09:2,A01:1},weapons:[{uid:1,id:'sandal',tier:1,invested:28},{uid:2,id:'pole',tier:2,invested:50},{uid:3,id:'cleaver',tier:3,invested:100},{uid:4,id:'peach',tier:2,invested:32},{uid:5,id:'sword',tier:1,invested:42},{uid:6,id:'smg',tier:1,invested:39}]});
 function restore(){if(closed)return;closed=true;clearTimeout(timer);g.update=old.update;g.run={...old.run,heroId:old.selection,skillId:old.skill};g.showMainMenu();g.run=old.run;const result={restored:true,version:g.buildVersion,saveUnchanged:c.sys.localStorage.getItem('taoyuan-chronicle-v7')===save};w.__uiLayoutReview=result;return result;}
 function show(kind='shop'){
  if(closed)return {error:'review closed'};clearTimeout(timer);timer=setTimeout(restore,120000);
  g.phase='shop';g.setBattleVisible(true);g.setBattleHudVisible(false);g.clearInput();
  g.update=function(dt){g.screens.update(dt);};
  const noop=()=>{};g.screens.supply(run,noop,noop,noop,noop,noop);
  if(kind==='battle'){g.phase='battle';g.screens.hide();g.setBattleVisible(true);g.drawPlayerHealth();g.drawProgress();g.drawWeaponHud();}
  if(kind==='replace')g.screens.replacementDialog(run,'w:peach:2',noop);
  if(kind==='manage')g.screens.weaponDialog(run,run.weapons[2],noop);
  if(kind==='inventory')g.screens.inventoryDialog(run);
  return {kind,version:g.buildVersion,scope:'engineering UI only; sample wallet/loadout; no player progress writes'};
 }
 w.__uiLayoutReview={show,restore};timer=setTimeout(restore,120000);return show();
}
