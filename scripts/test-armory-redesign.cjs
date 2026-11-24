const assert=require('node:assert/strict');
const {newGame,load}=require('./test-campaign.cjs');

const {weaponStatsFor}=load('campaign');
const {armoryDescription,oilPuddleLife}=load('armory-redesign');
const {supplyCard,upgradeOffer}=load('survival');

(async()=>{
  const g=await newGame();
  const shot=(id,tier,values={})=>{
    g.clearBattle();
    const weapon={id,tier,uid:100};
    g.run.weapons=[weapon];
    return {weapon,stats:{...weaponStatsFor(g.run,weapon),...values,quality:tier}};
  };
  function enemy(x,y=0){
    const e=g.spawnNext('soldier');
    Object.assign(e,{x,y,born:0,hp:1000,maxHp:1000,flash:0,previousHitX:undefined,previousHitY:undefined});
    e.node.setPosition(x,y);g.drawEnemy(e);
    return e;
  }
  function step(count){
    for(let i=0;i<count;i++){g.age+=1/120;g.updateProjectiles(1/120);}
  }
  {
    const {weapon,stats}=shot('sandal',4,{range:360,speed:500,bounce:3,knockback:200,pierce:0});
    const group=[80,155,225,285].map(x=>enemy(x));
    g.launchProjectile(0,34,0,weapon,stats,60);step(140);
    assert.equal(group.filter(e=>e.hp<1000).length,4);
    assert.ok(Math.abs(Math.hypot(group[3].vx,group[3].vy)-250)<1,'third bounce gets bounded push');
    assert.ok(Math.abs(Math.hypot(group[2].vx,group[2].vy)-200)<1,'earlier bounce keeps normal push');
  }
  {
    const {weapon,stats}=shot('hand-halberd',1,{range:300,speed:600,pierce:3});
    g.px=0;g.py=0;g.launchProjectile(20,24,0,weapon,stats,12);step(63);
    g.py=250;step(6);
    const p=g.projectiles.find(p=>p.returning&&p.remaining>0);
    assert.ok(p.returnLeg);assert.equal(p.y,24,'white returns to throw point after player steps');
  }
  {
    const {weapon,stats}=shot('hand-halberd',4,{range:300,speed:600,pierce:3});
    g.px=0;g.py=0;g.launchProjectile(0,24,0,weapon,stats,12);step(63);
    g.py=220;
    const targets=[enemy(233,53),enemy(158,103),enemy(84,159)];
    step(170);
    assert.ok(targets.every(e=>e.hp<1000),'dynamic return actually hits the diagonal enemies');
    assert.equal(g.pendingShots.length,1,'exactly one catch follow-up');
    g.updateExtraFields(1/120);
    assert.equal(g.pendingShots.length,0);
    assert.ok(g.projectiles.some(p=>p.remaining>0&&p.secondary&&!p.returning));
    step(160);assert.equal(g.pendingShots.length,0,'follow-up cannot chain');
  }
  {
    const {weapon,stats}=shot('heavy-crossbow',4,{range:620,speed:1200,pierce:5,knockback:0,pierceFactor:.85});
    const line=[80,170,260].map(x=>enemy(x)),rear=enemy(272,43);
    g.launchProjectile(0,34,0,weapon,stats,100);step(90);
    assert.deepEqual(line.map(e=>e.hp),[900,915,915]);
    assert.equal(rear.hp,970,'third distinct pierce gives a 30% burst and no duplicate direct hit');
  }
  {
    const {stats}=shot('oil-jar',4,{area:20,knockback:0});
    const target=enemy(70,0);
    g.addFriendlyField('oil-jar',100,0,34,20,oilPuddleLife(4),40,stats);
    g.addFriendlyField('oil-jar',100,140,34,20,oilPuddleLife(4),40,stats);
    g.updateExtraFields(1/60);
    assert.equal(target.hp,970);assert.equal(g.oilLinks.get(100).spent,true);
    g.updateExtraFields(1/60);assert.equal(target.hp,970,'no repeated immediate hit');
    g.age+=.51;g.updateExtraFields(1/60);assert.equal(target.hp,950,'line continues at low oil damage');
    g.clearBattle();assert.equal(g.oilLinks.size,0);assert.equal(g.friendlyFields.length,0);
  }
  {
    const {weapon}=shot('hand-halberd',2);
    const id=upgradeOffer(weapon),card=supplyCard(g.run,id);
    assert.ok(card.desc.includes(armoryDescription(weapon.id,2)));
    assert.ok(card.desc.includes(armoryDescription(weapon.id,3)));
    assert.equal(card.from,2);
  }
  g.onDestroy();
  console.log('通过：草鞋第三跳、手戟两类回程与红品补掷、重弩第三穿碎石去重、火线共享节奏与清场、升阶文案');
})().catch(error=>{console.error(error);process.exitCode=1;});
