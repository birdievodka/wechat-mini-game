// Normalize S=100 so UI rounding, scheduler timing, hit caps and control can be compared.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load}=require('./test-campaign.cjs');
const {CommonSkillRuntime}=load('CommonSkillRuntime');
const {COMMON_SKILLS}=load('common-skills');
const scenes={
 single:[[190,0]],
 column:Array.from({length:8},(_,i)=>[85+54*i,0]),
 encircled:Array.from({length:12},(_,i)=>[150*Math.cos(i*Math.PI/6),150*Math.sin(i*Math.PI/6)]),
 mixedBoss:[[215,0],...Array.from({length:11},(_,i)=>[150*Math.cos(i*Math.PI/6),150*Math.sin(i*Math.PI/6)])],
};
function measure(skill,scene,points){
 let protectedTime=0,elapsed=0,haste=0,wards=0,marked=0;
 const events=[];
 const enemies=points.map(([x,y],i)=>({x,y,hp:1e6,kind:scene==='mixedBoss'&&i===0?'chief':'soldier',born:0,dead:0}));
 const host={
  x:0,y:0,angle:0,age:0,enemies:()=>enemies,move(dx,dy){this.x+=dx;this.y+=dy;},
  hit(e,_a,n){e.hp-=n;events.push({target:enemies.indexOf(e),n,time:elapsed});},
  protect(seconds){protectedTime+=seconds;},clearSlow(){},canHeal(){return false;},heal(){},sound(){},
 };
 const effects={play(){},playSky(){},stop(){},setCount(_kind,count){wards=count;},flight(){},aimBow(){},
  update(){},track(){},markTargets(list){marked=Math.max(marked,list.length);},endpoint(){},clear(){}};
 const runtime=new CommonSkillRuntime(host,effects);
 assert.equal(runtime.cast(skill.id,100),true);
 for(let i=0;i<Math.ceil(7*120);i++){
  const dt=1/120;
  if(runtime.hasteMultiplier>1)haste+=dt;
  host.age=elapsed;runtime.update(dt);elapsed+=dt;
 }
 const byTarget=enemies.map((e,i)=>({damage:1e6-e.hp,hits:events.filter(x=>x.target===i).length,slow:e.slowFactor||0}));
 assert.ok(byTarget.filter(t=>t.hits).length<=skill.maxTargets);
 assert.ok(byTarget.every(t=>t.hits<=skill.maxHits));
 assert.equal(runtime.tasks.length,0);
 const total=byTarget.reduce((n,t)=>n+t.damage,0);
 return {id:skill.id,scene,targets:byTarget.filter(t=>t.hits).length,total,focal:byTarget[0],maxHits:Math.max(...byTarget.map(t=>t.hits)),hasteSeconds:+haste.toFixed(3),wards,marked,protectedTime};
}
const results=Object.entries(scenes).flatMap(([scene,points])=>COMMON_SKILLS.map(skill=>measure(skill,scene,points)));
const select=(scene,id)=>results.find(r=>r.id===id&&r.scene===scene);
assert.equal(select('single','G19').total,164);
assert.equal(select('single','G20').total,165,'lone enemy caps before the bonus final volley');
assert.equal(select('single','G22').total,108);
assert.equal(select('encircled','G03').total,1200);
assert.equal(select('encircled','G25').total,960);
assert.equal(select('mixedBoss','G12').focal.slow,.1);
assert.equal(select('encircled','G12').focal.slow,.4);
assert.equal(select('single','G07').hasteSeconds,6);
assert.equal(select('encircled','G26').marked,12);
function simayiRun(index,startX,startY,heading){
 const {BossBattle,createBossState}=load('boss-battle');
 let x=startX,y=startY,age=0,taken=0,contacts=0,protectUntil=0;
 const boss={bossSkin:'simayi',x:startX-250,y:startY,hp:45,maxHp:100,speed:0,attack:0,attackAngle:0,bossState:createBossState(),bossTimers:[99,99,99]};
 const battle=new BossBattle({
  now:()=>age,target:()=>({x,y}),bounds:()=>({halfWidth:1000,halfHeight:600}),
  actors:()=>[boss],normalZones:()=>0,normalShots:()=>0,otherBusy:()=>0,
  referenceDps:()=>100,spawn(){return undefined;},
  hit(){contacts++;if(age<protectUntil)return false;protectUntil=age+1.2;taken++;return true;},
  intercept(){return false;},impact(){},release(){},
 });
 assert.ok(battle.start(boss,index,0));
 for(let tick=0;tick<540;tick++){
  const dt=1/120;age+=dt;
  if(Number.isFinite(heading)){
   x=Math.max(-950,Math.min(950,x+Math.cos(heading)*270*dt));
   y=Math.max(-550,Math.min(550,y+Math.sin(heading)*270*dt));
  }
  battle.update(dt);
 }
 return {taken,contacts};
}
const simayi=[];
for(const [arena,x,y] of [['center',0,0],['rightTop',855,473],['leftBottom',-864,-474]]){
 for(let index=0;index<3;index++){
  const straightRoutes=Array.from({length:16},(_,i)=>simayiRun(index,x,y,Math.PI*i/8));
  const safeRoutes=straightRoutes.filter(run=>run.taken===0).length;
  assert.ok(safeRoutes>0,`司马懿第${index+1}招在${arena}至少存在一条270移速步行避让路线`);
  simayi.push({arena,index,standing:simayiRun(index,x,y,Infinity),safeRoutes,straightRoutes});
 }
}
assert.deepEqual(simayi[0].standing,{taken:1,contacts:4},'站桩面对四次判定，仍遵守1.2秒受击保护');
const report={version:load('survival').SURVIVAL_VERSION,scope:'48 deterministic casts through CommonSkillRuntime in Node with Cocos stubs, using power S=100 and static enemy layouts. Damage is measured before archetype mitigation, no weapon attacks or victory-rate measurement.',results,simayi};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({skillCasts:results.length,simayi}));
