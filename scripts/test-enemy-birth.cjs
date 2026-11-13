const assert=require('node:assert/strict');
const {newGame,load,cc}=require('./test-campaign.cjs');
const {CHRONICLE_ENEMIES,chapterFor}=load('chronicles');
(async()=>{
 const g=await newGame();g.clearBattle();
 // Reproduce pooled legacy sprite -> chronicle rig while intermediate physics skips drawing.
 const atlas=g.battleSprites;atlas.texture=new cc.Texture2D();for(const id of ['birth-ring','birth-dot'])atlas.cells[id]={frame:new cc.SpriteFrame(),width:32,height:32,x:0,y:0};
 const pooled=g.spawnNext('soldier');pooled.hp=0;pooled.dead=0;
 const appearance=e=>e.art.enabled?[e.art.spriteFrame]:e.rigParts.filter(sp=>sp.node.active).map(sp=>sp.spriteFrame);
 const cases=[...CHRONICLE_ENEMIES.map(d=>({kind:d.kind,id:d.id})),{kind:'soldier'},{kind:'spearman'},{kind:'cavalry'},{kind:'chief'}];
 for(const {kind,id} of cases){
  g.presentSubstep=false;
  const e=g.spawnNext(kind,id);assert.equal(e,pooled,'复用同一个对象，不额外创建兵');
  if(e.birthRig)assert.equal(e.birthRig.active,false,'复用时清除上一轮出生效果');
  assert.equal(e.art.node.active,false,'出生前段不能先露出旧模型 '+(id||kind));
  const expected=appearance(e);assert.ok(expected.length>0&&expected.every(Boolean),'首次显示前准备本兵种贴图 '+(id||kind));
  if(id||kind==='chief')assert.equal(e.rigKey,id?'enemy-'+id+'-front':'boss-'+chapterFor(g.run.chapter).bossId);
  const duration=e.bornTotal;g.updateEnemy(e,duration*.2);assert.equal(e.art.node.active,false);
  g.presentSubstep=true;g.updateEnemy(e,duration*.3);assert.equal(e.art.node.active,true);
  assert.deepEqual(appearance(e),expected,'出生显形阶段不能露出上个兵种 '+(id||kind));
  g.updateEnemy(e,duration*.5+.000001);assert.equal(e.born,0);assert.deepEqual(appearance(e),expected);
  e.x=0;e.y=240;e.speed=0;e.attackCooldown=999;e.node.setPosition(0,240);g.updateEnemy(e,1/120);
  assert.deepEqual(appearance(e),expected,'出生结束不能再换一次兵种 '+(id||kind));
  // Force the next reuse to encounter a lingering birth marker as well as cached rigs.
  if(e.birthRig)e.birthRig.active=true;e.hp=0;e.dead=0;
 }
 // Boss summons finalize clone/eye identity after spawnNext returns.
 for(const [object,skin,key] of [['eye',undefined,'skill-19'],['clone','zhangjiao','boss-zhangjiao']]){
  pooled.hp=0;pooled.dead=0;g.presentSubstep=false;const e=g.spawnNext('soldier','E09');e.object=object;e.bossSkin=skin;
  g.updateEnemy(e,e.bornTotal*.5);assert.equal(e.rigKey,key,'召唤物首次显形就使用最终身份');const visible=appearance(e);
  g.updateEnemy(e,e.bornTotal);assert.deepEqual(appearance(e),visible,'召唤物出生结束不变形');
 }
 // Correctness must not remove normal per-display-frame draw throttling.
 const e=g.spawnNext('soldier','E01');g.presentSubstep=false;const pose=appearance(e);e.direction=2;g.drawEnemy(e);assert.deepEqual(appearance(e),pose,'普通物理子步仍跳过绘制');
 console.log('通过：40兵种与旧兵/骑兵/Boss在非显示子步复用，出生前隐藏、显形贴图正确、出生结束不变兵种');
})().catch(e=>{console.error(e);process.exitCode=1;});
