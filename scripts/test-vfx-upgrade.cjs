const assert=require('node:assert/strict'),sharp=require('sharp');
const {newGame,load,cc,Graphics,Node}=require('./test-campaign.cjs');
const {VfxMaterials,VFX_MATERIAL_KEYS}=load('vfx-materials');
const {WEAPON_VFX,drawWeaponSlash,drawWeaponFlight,drawWeaponBurst}=load('weapon-vfx');
const {WEAPONS}=load('weapons'),{CHRONICLE_ENEMIES}=load('chronicles');
const {drawNpcAttack,drawEnemyZone}=load('enemy-vfx-v10');
function recorder(){const g=new Graphics();let calls=0;for(const name of ['moveTo','lineTo','bezierCurveTo','ellipse','circle','arc','rect','roundRect'])g[name]=(...a)=>{assert.ok(a.every(x=>typeof x!=='number'||Number.isFinite(x)),name+' finite');calls++;};return {g,get calls(){return calls;}};}
(async()=>{
 const {data,info}=await sharp('assets/presentation/vfx-materials.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,1024);assert.equal(info.height,1024);assert.equal(info.channels,4);
 for(let i=0;i<16;i++){let opaque=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++){const a=data[((Math.floor(i/4)*256+y)*1024+i%4*256+x)*4+3];if(x<16||x>=240||y<16||y>=240)assert.equal(a,0,'transparent gutter');else opaque+=Number(a>40);}assert.ok(opaque>500,'each runtime material exists');}
 assert.deepEqual(Object.keys(WEAPON_VFX).filter(id=>load('weapons').migratedWeaponId(id)===id).sort(),Array.from(WEAPONS,w=>w.id).sort());
 const g=await newGame();assert.ok(VFX_MATERIAL_KEYS.every(k=>g.artFrames['vfx-'+k]));
 const {PIXEL_RECTS,PIXEL_MOTIFS}=load('pixelfx-layout');
 const manifest=require('../art/runtime-pixelfx/manifest.json'),raw=require('node:fs').readFileSync(manifest.image);
 assert.equal(require('node:crypto').createHash('sha256').update(raw).digest('hex'),manifest.sha256);
 const pixelAtlas=await sharp(raw).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual([pixelAtlas.info.width,pixelAtlas.info.height,pixelAtlas.data.length],[512,512,1048576]);
 assert.equal(PIXEL_RECTS.length,manifest.frames);
 for(const [key,x,y,w,h] of PIXEL_RECTS){
  assert.ok(g.artFrames[key],key+' actually registered in the presentation bundle');
  assert.ok(x>=0&&y>=0&&x+w<=512&&y+h<=512);
  let opaque=0;
  for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)opaque+=Number(pixelAtlas.data[(j*512+i)*4+3]>32);
  assert.ok(opaque>3,key+' contains pixels');
 }
 const atlas=g.battleSprites;
 atlas.texture={};
 atlas.cells['enemy-arrow']={frame:new cc.SpriteFrame(),width:40,height:12,x:0,y:0};
 const arrows=['E11','E12','E13','E14','E22','E23'].map(id=>{
  const e=g.spawnNext('spearman',id);e.born=0;
  g.fireEnemyShot(e,0,400);
  return g.enemyShots.at(-1).atlasArt.spriteFrame;
 });
 assert.equal(new Set(arrows).size,6,'real enemy launches choose six distinct upstream arrows');
 delete atlas.cells['enemy-arrow'];atlas.texture=undefined;
 g.clearBattle();
 const back=g.friendlyGroundFx,front=g.fx,v=g.vfxMaterials;assert.ok(v);
 for(let frame=0;frame<50;frame++){
  v.begin();for(let i=0;i<180;i++)load('vfx-materials').material([back,g.dangerFx,g.spellFx,front][(i+frame)%4],VFX_MATERIAL_KEYS[i%16],i,10,40,40,0,.8,i%3?0:1);v.end();assert.ok(v.count<=96);assert.ok(v.allocated<=96);
 }
 v.clear();assert.equal(v.count,0);for(const l of v.layers)assert.ok(l.slots.every(q=>!q.sprite.node.active));
 const a=recorder(),b=recorder();
 for(const w of WEAPONS)for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const tier of [1,4]){
  drawWeaponSlash(a.g,b.g,w.id,0,0,angle,165,2.1,.4,.8,tier);drawWeaponFlight(b.g,w.id,30,20,angle,tier);drawWeaponBurst(a.g,b.g,w.id,20,30,80,.35);
 }
 for(const e of CHRONICLE_ENEMIES)for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const time of [e.windup*.7,e.windup+.01,e.windup+.4])drawNpcAttack(a.g,e.id,0,0,time,angle,e.windup,e.range);
 assert.ok(a.calls+b.calls>1000);
 for(const shape of ['circle','line','sector','ring'])for(const age of [.2,1.1,1.4])drawEnemyZone(a.g,b.g,{x:0,y:0,radius:80,delay:1,age,fired:age>=1,shape,angle:1,arc:110,theme:'fire'});
 g.clearBattle();g.spawnClock=999;g.cooldown=999;g.playerHp=5;g.protectionTime=g.hurtTime=0;
 const enemy=g.spawnNext('soldier','E01');Object.assign(enemy,{hp:1000,born:0,x:80,y:0,attackCooldown:999,speed:0});
 g.combatFx.hit('guandao',80,0,0,false);const snapshot=JSON.stringify({hp:enemy.hp,run:g.run,age:g.age,rng:g.combatFx.particles.seed});
 for(let i=0;i<20;i++)g.updateEffects(0);
 assert.equal(JSON.stringify({hp:enemy.hp,run:g.run,age:g.age,rng:g.combatFx.particles.seed}),snapshot,'real material draw is side-effect free for combat');
 assert.ok(v.count>0);assert.ok(v.layers.some(layer=>layer.slots.some(slot=>slot.sprite.node.active&&slot.key===PIXEL_MOTIFS.hit[0])));g.clearBattle();assert.equal(v.count,0);assert.ok(v.layers.every(l=>l.slots.every(q=>!q.sprite.node.active)));
 g.onDestroy();assert.equal(v.allocated,0);console.log('通过：16材质真实alpha/透明边、33武器/40兵四向有限几何、96材质硬上限与跨层复用、真实组件绘制不改变判定/RNG、清场/销毁回收');
})().catch(e=>{console.error(e);process.exitCode=1;});
