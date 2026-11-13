const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

// Minimal scene API, exercising the actual startup, screens and combat component.
class Transform { setContentSize(w, h) { this.width = w; this.height = h; } setAnchorPoint() {} convertToNodeSpaceAR(v) { return v; } }
class Node {
  static EventType = { TOUCH_END: 'end', TOUCH_START: 'start', TOUCH_CANCEL: 'cancel' };
  constructor(name = '') { this.name = name; this.children = []; this.position = { x: 0, y: 0, z: 0 }; this.active = true; this.components = new Map(); this.events = {}; }
  addChild(n) { n.parent = this; this.children.push(n); }
  addComponent(Type) { const c = new Type(); c.node = this; this.components.set(Type, c); if ((Type === Sprite || Type === Label) && !this.components.has(Transform)) this.addComponent(Transform); return c; }
  getComponent(Type) { return this.components.get(Type); }
  setPosition(x, y = 0, z = 0) { this.position = typeof x === 'object' ? { ...x } : { x, y, z }; }
  setScale(x, y, z) { this.scale = { x, y, z }; }
  setSiblingIndex(index) {if(!this.parent)return;const a=this.parent.children,old=a.indexOf(this);if(old<0)return;a.splice(old,1);a.splice(Math.max(0,Math.min(index,a.length)),0,this);}
  getSiblingIndex() { return this.parent?this.parent.children.indexOf(this):0; }
  on(event, callback) { this.events[event] = callback; }
  removeFromParent() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null; }
  destroy() { this.destroyed = true; }
}
class Graphics {}
for (const method of ['clear', 'ellipse', 'fill', 'stroke', 'moveTo', 'lineTo', 'circle', 'rect', 'roundRect', 'close', 'bezierCurveTo', 'arc']) Graphics.prototype[method] = () => {};
class Sprite { static SizeMode = { CUSTOM: 1 }; static Type = { SLICED: 1 }; }
class Label { static CacheMode={NONE:0,CHAR:2}; static HorizontalAlign = { CENTER: 0 }; static VerticalAlign = { CENTER: 0 }; static Overflow = { SHRINK: 0 }; }
class Frame { destroy() {} }
class Camera { static ProjectionType = { ORTHO: 1 }; screenToWorld(p) { return p; } }
const storage = new Map();
let seed = 20261111;
const seeded = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const randomMath = Object.create(Math); randomMath.random = seeded;
const cc = {
  _decorator: { ccclass: () => c => c }, Component: class { constructor() { this.node = new Node('Scene'); this.isValid = true; } },
  Node, Graphics, Label, Sprite, SpriteFrame: Frame, UITransform: Transform, Camera, Canvas: class {}, Color: class { constructor(value) { this.value=value; } }, Rect: class {constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}, Vec3: class { constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); } },
  AudioClip: class {}, AudioSource: class {
    constructor() { this.plays = 0; this.playing = false; this.currentTime = 0; }
    stop() { this.playing = false; this.currentTime = 0; }
    pause() { this.playing = false; }
    play() { this.playing = true; this.plays++; }
  }, Texture2D: class {reset(size){Object.assign(this,size);}uploadData(data){this.data=data;}destroy(){this.destroyed=true;}}, Layers: { Enum: { UI_2D: 1 } }, ResolutionPolicy: { FIXED_HEIGHT: 1 },
  assetManager: { loadBundle: (_name, cb) => cb(null, { load: (_url, _type, callback) => callback(null, { width: 768, height: 576 }) }) },
  view: { setDesignResolutionSize() {}, getVisibleSize: () => ({ width: 1334, height: 750 }) },
  input: { on() {}, off() {} }, Input: { EventType: {} }, game: { on() {}, off() {} }, Game: {},
  KeyCode: { KEY_W: 87, KEY_A: 65, KEY_S: 83, KEY_D: 68, ARROW_UP: 38, ARROW_LEFT: 37, ARROW_DOWN: 40, ARROW_RIGHT: 39 },
  sys: { localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) } },
};
const cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  const out = cache[name] = {};
  const code = ts.transpileModule(fs.readFileSync(path.join('assets/scripts', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, experimentalDecorators: true } }).outputText;
  vm.runInNewContext(code, { exports: out, require: id => id === 'cc' ? cc : id === 'cc/env' ? { DEBUG: false } : load(id.replace('./', '')), Math: randomMath, console }); return out;
}
const r = load('campaign');
const { GameBootstrap } = load('GameBootstrap');
function click(root, title) {
  const find = node => (title === 'first-upgrade' ? node.name.startsWith('Upgrade-') : node.name === title) && node.events.end ? node : node.children.map(find).find(Boolean);
  const target = find(root); assert.ok(target, 'button exists: ' + title); target.events.end();
}
function finishStartup(g){g.update(1/60);g.update(1/60);assert.equal(g.ready,true);}
async function newGame(id = 'liubei', weapon) { storage.delete('taoyuan-chronicle-v4'); const g = new GameBootstrap(); await g.start();finishStartup(g); assert.equal(g.phase, 'menu'); click(g.screens.root, id); click(g.screens.root, 'StartHero'); assert.equal(g.phase, 'battle'); if(weapon&&weapon!==g.run.starter){g.run=r.createRun(id,weapon);g.restart(false);} return g; }


const survival = load("survival");
module.exports={newGame,GameBootstrap,finishStartup,click,load,cc,Node,Graphics,Sprite,Label,r,storage};
if(require.main===module)(async () => {
  // Actual asynchronous boot: a missing critical frame must not be hidden by the menu.
  const bootLoad=cc.assetManager.loadBundle;let releaseBody;
  cc.assetManager.loadBundle=(name,cb)=>bootLoad(name,(error,bundle)=>{
    if(name!=='battle')return cb(error,bundle);
    cb(error,{load:(url,type,callback)=>url==='characters/liubei-bean-body/texture'?releaseBody=()=>bundle.load(url,type,callback):bundle.load(url,type,callback)});
  });
  const pendingBoot=new GameBootstrap();await pendingBoot.start();
  assert.equal(pendingBoot.phase,'loading');assert.equal(pendingBoot.ready,false);assert.equal(pendingBoot.world.active,false);assert.equal(pendingBoot.loadingScreen.active,true);
  const waiting=pendingBoot.startupProgress.value;for(let i=0;i<30;i++)pendingBoot.update(1/60);assert.equal(pendingBoot.startupProgress.value,waiting,'等待真实回调，不靠时间造进度');assert.ok(waiting<1);
  releaseBody();assert.equal(pendingBoot.phase,'loading');assert.equal(pendingBoot.startupProgress.value,1);pendingBoot.update(1/60);assert.equal(pendingBoot.loadingScreen.active,true,'完成帧提交后才进入菜单');pendingBoot.update(1/60);assert.equal(pendingBoot.phase,'menu');
  cc.assetManager.loadBundle=bootLoad;
  const bootError=console.error;console.error=()=>{};
  try{
    cc.assetManager.loadBundle=(name,cb)=>bootLoad(name,(error,bundle)=>name==='battle'?cb(error,{load:(url,type,callback)=>url==='characters/soldier-sickle-actions/texture'?callback(new Error('fixture missing soldier')):bundle.load(url,type,callback)}):cb(error,bundle));
    const broken=new GameBootstrap();await broken.start();broken.update(2);assert.equal(broken.phase,'loading');assert.equal(broken.ready,false);assert.ok(broken.startupProgress.value<1);assert.match(broken.loadingText.string,/小兵资源加载失败/);assert.equal(broken.loadingScreen.active,true);
  }finally{cc.assetManager.loadBundle=bootLoad;console.error=bootError;}
  console.log('通过：关键角色图延迟时保留加载海报/真实进度、100%完成帧后进入选人、资源失败保留提示而非黑屏或假就绪');
  // The approved menu has one direct start action and no old loadout/test flow.
  for(const hero of r.HEROES){
    storage.delete('taoyuan-chronicle-v4');const menuGame=new GameBootstrap();await menuGame.start();finishStartup(menuGame);
    const nodes=()=>{const all=[];const walk=n=>{all.push(n);n.children.forEach(walk);};walk(menuGame.screens.root);return all;};
    assert.equal(menuGame.phase,'menu');assert.equal(menuGame.world.active,false);
    assert.ok(!nodes().some(n=>n.name==='选择英雄'),'首页不再显示选择英雄标题');assert.ok(nodes().some(n=>n.name==='GameLogo'));
    for(const name of ['TestMode','ChooseWeapon','SelectedHero','LoadoutPreview','InitialSlot0'])assert.ok(!nodes().some(n=>n.name===name),name+' removed');
    const labels=nodes().map(n=>n.getComponent(Label)?.string||'').join('|');assert.ok(!/拾取范围|武器击退|五颗心|移速|测试模式|选择武器|lv\./i.test(labels));
    assert.equal(nodes().filter(n=>n.name==='HeroPortrait').length,5,'five head-only selection portraits');
    click(menuGame.screens.root,hero.id);assert.equal(menuGame.phase,'menu');
    const preview=menuGame.screens.heroShowcase,runBefore=JSON.stringify(menuGame.run),rootBefore=preview.root;let blink=false;const angles=new Set();for(let f=0;f<450;f++){menuGame.update(1/60);blink ||= preview.head.spriteFrame===menuGame.artFrames['hero-'+hero.id+'-closed'];angles.add(Math.round(preview.props[1].angle*10));}assert.ok(blink,hero.id+' showcase actually blinks');assert.ok(angles.size>8,hero.id+' prop gesture moves');assert.equal(JSON.stringify(menuGame.run),runBefore,'menu animation does not advance combat or consume resources');click(menuGame.screens.root,hero.id);assert.equal(menuGame.screens.heroShowcase.root,rootBefore,'selection reuses the puppet');
    const selected=nodes().filter(n=>n.name==='HeroSelected'&&n.active);assert.equal(selected.length,1);assert.equal(selected[0].parent.name,hero.id);
    for(const [width,height]of [[1334,750],[1622,750],[1875,750]]){
      menuGame.screens.resize(width,height);const p=menuGame.screens.content,scale=p.scale.x,start=p.children.find(n=>n.name==='StartHero');
      assert.ok((start.position.x+165)*scale<width/2-24);assert.ok((start.position.y-44)*scale>-height/2+24,'start stays above bottom safe area');
      for(const id of r.HEROES.map(h=>h.id)){const n=p.children.find(n=>n.name===id);assert.ok((Math.abs(n.position.x)+50)*scale<width/2-36);assert.ok(n.position.y>start.position.y+90,'avatar list above start');assert.equal(n.getComponent(Transform).height,100);}
    }
    click(menuGame.screens.root,'StartHero');assert.equal(menuGame.phase,'battle');assert.equal(menuGame.run.heroId,hero.id);assert.equal(menuGame.run.starter,load('weapons').starterFor(hero.id));assert.equal(menuGame.remaining,15);assert.equal(menuGame.playerHp,5);assert.equal(menuGame.testMode,false);
    menuGame.showMainMenu();assert.equal(menuGame.phase,'menu');assert.equal(menuGame.screens.selection,hero.id);
  }
  console.log('通过：上方分层动态英雄/五头像/真实眨眼与五种武器亮相/菜单不推进战斗/唯一金边选中态/无属性条/无测试和选武器入口、开始直接携带默认武器/15秒第零章/五颗心、三种横屏安全区、返回保留所选英雄');
  const loadBundle=cc.assetManager.loadBundle;cc.assetManager.loadBundle=(name,cb)=>name==='hero-menu'?cb(new Error('simulated optional art failure')):loadBundle(name,cb);
  const warn=console.warn;console.warn=()=>{};
  try{const fallback=new GameBootstrap();await fallback.start();finishStartup(fallback);assert.equal(fallback.phase,'menu');click(fallback.screens.root,'guanyu');storage.delete('taoyuan-chronicle-v4');click(fallback.screens.root,'StartHero');assert.equal(fallback.run.starter,'pole');assert.equal(fallback.phase,'battle');}
  finally{cc.assetManager.loadBundle=loadBundle;console.warn=warn;}
  console.log('通过：选角素材加载失败仍能进入基础菜单和默认武器战斗，不停留启动页');
  const keyboardGame = await newGame(); keyboardGame.clearBattle(); keyboardGame.spawnClock = 999;
  const listeners = new Map(), wxKeys = {};
  const surface = { addEventListener: (type, cb) => listeners.set(type, cb), removeEventListener: (type, cb) => { assert.equal(listeners.get(type), cb); listeners.delete(type); } };
  const wxKeyboard = { onKeyDown: cb => wxKeys.down = cb, onKeyUp: cb => wxKeys.up = cb, offKeyDown: cb => { assert.equal(wxKeys.down, cb); delete wxKeys.down; }, offKeyUp: cb => { assert.equal(wxKeys.up, cb); delete wxKeys.up; } };
  const detach = load('desktop-keyboard').attachDesktopKeyboard(surface, wxKeyboard,
    () => keyboardGame.phase === 'battle' && !keyboardGame.paused,
    code => keyboardGame.keyDown({ keyCode: code }), code => keyboardGame.keyUp({ keyCode: code }), () => keyboardGame.clearInput());
  for (const [code, dx, dy] of [['ArrowUp', 0, 1], ['ArrowDown', 0, -1], ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0]]) {
    keyboardGame.px = 0; keyboardGame.py = 0;
    let prevented = false; listeners.get('keydown')({ code, preventDefault: () => prevented = true });
    for (let i = 0; i < 30; i++) keyboardGame.update(1 / 60);
    assert.ok(prevented); assert.ok(Math.abs(keyboardGame.px - dx * keyboardGame.stats.speed / 2) < 1e-8); assert.ok(Math.abs(keyboardGame.py - dy * keyboardGame.stats.speed / 2) < 1e-8);
    listeners.get('keyup')({ code }); const x = keyboardGame.px, y = keyboardGame.py; keyboardGame.update(1 / 60); assert.equal(keyboardGame.px, x); assert.equal(keyboardGame.py, y);
  }
  keyboardGame.px = keyboardGame.py = 0;
  wxKeys.down({ code: 'ArrowRight' }); listeners.get('keydown')({ key: 'w' });
  listeners.get('keydown')({ code: 'ArrowRight' }); // Duplicate native and engine events stay idempotent.
  keyboardGame.touchId = 7; keyboardGame.touchEnd({ getID: () => 7 }); assert.equal(keyboardGame.keys.size, 2, 'mouse release must not cancel held keyboard keys');
  for (let i = 0; i < 30; i++) keyboardGame.update(1 / 60);
  assert.ok(Math.abs(Math.hypot(keyboardGame.px, keyboardGame.py) - keyboardGame.stats.speed / 2) < 1e-8, 'diagonal speed is normalized');
  listeners.get('blur')({}); assert.equal(keyboardGame.keys.size, 0);
  for (const event of [{ code: 'ArrowUp', target: { tagName: 'INPUT' } }, { code: 'KeyW', metaKey: true }, { keyCode: 16 }]) listeners.get('keydown')(event);
  assert.equal(keyboardGame.keys.size, 0, 'text editing and shortcuts are not movement');
  keyboardGame.paused = true; wxKeys.down({ keyCode: 38 }); assert.equal(keyboardGame.keys.size, 0); keyboardGame.paused = false;
  wxKeys.down({ keyCode: 38 }); assert.equal(keyboardGame.keys.size, 1); wxKeys.up({ keyCode: 38 }); assert.equal(keyboardGame.keys.size, 0);
  detach(); assert.equal(listeners.size, 0); assert.equal(Object.keys(wxKeys).length, 0);
  const unsupported = () => { throw Error('keyboard unavailable on this host'); };
  const disposeUnsupported = load('desktop-keyboard').attachDesktopKeyboard(
    { addEventListener: unsupported, removeEventListener: unsupported }, { onKeyDown: unsupported, onKeyUp: unsupported },
    () => true, () => {}, () => {}, () => {});
  disposeUnsupported(); // Optional host APIs cannot abort initialization or teardown.
  console.log('通过：方向键持续位移/松开停止、WASD混用、斜向等速、鼠标松开不打断、失焦清理、暂停保护与监听卸载');

  const poleGame=await newGame('guanyu');poleGame.clearBattle();poleGame.spawnClock=999;
  assert.equal(poleGame.run.starter,'pole');assert.equal(poleGame.weapons[0].stats.speed,0);
  poleGame.spawnNext('soldier');const poleTarget=poleGame.enemies.find(e=>e.hp>0);Object.assign(poleTarget,{x:120,y:0,hp:9999,born:0,speed:0,attackCooldown:999});
  for(let i=0;i<120;i++){poleTarget.x=120;poleTarget.y=0;poleTarget.vx=poleTarget.vy=0;poleGame.update(1/120);assert.ok(poleGame.weapons[0].shoe.active,'pole remains held');assert.equal(poleGame.weapons[1].shoe.active,false);}
  assert.ok(poleGame.hits>0);assert.equal(poleGame.projectiles.length,0,'pole never throws beans or itself');
  console.log('通过：关羽默认扁担真实横扫、持握不抛出、自由手不多武器、不再投豆');

  for(const hero of r.HEROES){
    const arms=await newGame(hero.id);arms.clearBattle();arms.spawnClock=999;
    const held=arms.weapons[0],free=arms.weapons[1];
    assert.ok(held.node.position.y<1&&free.node.position.y<1,'resting wrists stay at waist, not across the cheeks');
    for(const hand of [held,free]){
      assert.ok(hand.arm.node.getSiblingIndex()<arms.headPivot.getSiblingIndex(),'head occludes sleeve/shoulder seam');
      assert.ok(hand.fist.node.getSiblingIndex()>hand.shoe.getSiblingIndex(),'visible palm and thumb wrap in front of weapon');
      assert.equal(hand.fist.node.active,true);
    }
    assert.equal(arms.naturalHands.filter(h=>h.node.active).length,0,'single weapon uses exactly its two anatomical hands');
    const leftX=held.node.position.x,rightX=free.node.position.x;arms.facing=-1;arms.updateWeapon(held,0);arms.updateFreeHand();
    assert.ok(held.node.position.x*leftX<0&&free.node.position.x*rightX<0,'arm anchors mirror with the hero');
    if(hero.id==='liubei'){
      held.time=0;arms.updateWeapon(held,held.duration*.4);assert.equal(held.shoe.active,false);assert.equal(held.fist.node.active,true,'throwing the shoe never removes the hand');
    }
    arms.run.weapons.push({id:'cleaver',uid:2,tier:1});arms.syncWeapons();
    assert.equal(arms.naturalHands.filter(h=>h.node.active).length,2);assert.equal(arms.idleArms.node.active,true);
    assert.ok(arms.weapons.every(w=>!w.arm.node.active&&!w.fist.node.active),'orbital weapons never grow extra arms or hands');
    for(const hand of arms.naturalHands)assert.ok(hand.node.position.y<2);
    arms.run.weapons=[{id:'sword',uid:3,tier:1}];arms.syncWeapons();
    assert.equal(arms.naturalHands.filter(h=>h.node.active).length,2);assert.equal(arms.weapons[0].fist.node.active,false,'sword array preserves relaxed anatomical hands');
  }
  console.log('通过：三英雄肩腰低位握持/袖口低于头层/手掌高于武器、左右镜像、鞋投出保留手掌、多武器与飞剑恰好两只自然手');

  const makeTarget = (game, x, y, kind = 'soldier') => { game.spawnNext(kind); const e = game.enemies.findLast(e => e.hp > 0); e.x = x; e.y = y; e.hp = 100; e.born = 0; e.previousHitX = x; e.previousHitY = y + 34; return e; };
  const sweep=await newGame('zhangfei');sweep.clearBattle();sweep.spawnClock=999;
  const blade=sweep.weapons[0];blade.time=0;blade.duration=.38;blade.damage=25;blade.angle=0;blade.hit.clear();blade.strikeStarted=false;blade.impactPlayed=false;
  const crowd=Array.from({length:16},(_,i)=>{const a=(-40+i*80/15)*Math.PI/180;return makeTarget(sweep,95*Math.cos(a),16+95*Math.sin(a)-34);});
  const late=makeTarget(sweep,-300,-18),unborn=makeTarget(sweep,70,-18);unborn.born=.9;
  sweep.updateWeapon(blade,.38*.25);assert.ok(crowd.every(e=>e.hp===75),'every enemy in the sector takes the full swing, without a target cap');assert.equal(late.hp,100);assert.equal(unborn.hp,100);
  late.x=90;late.y=-18;sweep.updateWeapon(blade,.38*.15);assert.equal(late.hp,75,'entering during the remaining sweep is still hit');assert.ok(crowd.every(e=>e.hp===75),'one attack cannot hit the same enemy again');
  sweep.updateWeapon(blade,.38*.4);const after=makeTarget(sweep,80,-18);sweep.updateWeapon(blade,.01);assert.equal(after.hp,100,'recovery frames do not deal hidden damage');
  console.log('通过：近战16敌全额横扫/躯体边缘判定/有效时间内新入范围敌兵命中/同挥不重复/出生与收招无伤害');
  // Exercise actual attacks for all 11×4 patterns, not just their config fields.
  const weaponRules=load('weapons');assert.equal(weaponRules.WEAPONS.length,36);
  assert.equal(weaponRules.parseWeaponOffer('w:beans:1'),undefined);assert.equal(weaponRules.parseWeaponOffer('w:rollingpin:1'),undefined);
  for(const def of weaponRules.WEAPONS.slice(0,11))for(let tier=1;tier<=4;tier++){
    const qa=await newGame('liubei',def.id);qa.clearBattle();qa.spawnClock=999;qa.run.weapons[0].tier=tier;qa.refreshStats();qa.syncWeapons();
    const weapon=qa.weapons[0],stats=weapon.stats;weapon.damage=10;weapon.angle=0;
    if(def.category==='melee'){
      const front=makeTarget(qa,80,-18),radians=(def.id==='pole'?95:73)*Math.PI/180,radius=def.id==='pole'?150:120;
      const side=makeTarget(qa,radius*Math.cos(radians),16+radius*Math.sin(radians)-34),rear=makeTarget(qa,-100,-18);
      qa.meleeStrike(weapon);assert.equal(front.hp,90);assert.equal(side.hp,tier>=3?90:100);assert.equal(rear.hp,100);
      qa.meleeStrike(weapon);assert.equal(front.hp,90,'one melee sweep cannot hit twice');assert.equal(qa.projectiles.length,0);
    }else if(def.id==='sword'){
      assert.equal(weapon.orbitBlades.length,tier+2);const blade=weapon.orbitBlades[0].position;const target=makeTarget(qa,blade.x,blade.y+1);target.hp=10000;qa.updateWeapon(weapon,.016);assert.ok(target.hp<10000);const hp=target.hp;qa.updateWeapon(weapon,.016);assert.equal(target.hp,hp,'blades share one cooldown');
    }else if(def.id==='thunder'){
      const targets=Array.from({length:8},(_,i)=>makeTarget(qa,70+i*80,0));qa.releaseWeapon(0,34,0,weapon);
      assert.equal(targets.filter(e=>e.hp<100).length,tier+2,'actual chain target count');assert.equal(new Set(targets.filter(e=>e.hp<100)).size,tier+2);
    }else if(def.id==='gourd'){
      const targets=Array.from({length:9},(_,i)=>makeTarget(qa,90,(i-4)*20));targets.forEach(e=>e.hp=1000);qa.releaseWeapon(0,34,0,weapon);
      for(let i=0;i<130;i++)qa.updateGourds(1/120);
      assert.equal(1000-targets[0].hp,(tier+5)*10,'actual pulse count');assert.equal(targets.filter(e=>e.hp<1000).length,[6,6,7,8][tier-1]);
    }else if(def.id==='peach'||def.id==='shotgun'){
      const target=makeTarget(qa,100,0,def.id==='shotgun'?'chief':'soldier');target.hp=1000;qa.releaseWeapon(0,34,0,weapon);
      assert.equal(qa.projectiles.filter(p=>p.remaining>0).length,def.id==='peach'?(tier===1?1:3):tier+4,'actual volley count');
      for(let i=0;i<120;i++)qa.updateProjectiles(1/120);
      assert.equal(1000-target.hp,def.id==='peach'?10:40,'same-target direct and splash cap applies across the whole volley');
    }else if(def.id==='sandal'||def.id==='smg'){
      const targets=Array.from({length:4},(_,i)=>makeTarget(qa,80+i*80,0));qa.releaseWeapon(0,34,0,weapon);
      for(let i=0;i<150;i++)qa.updateProjectiles(1/120);
      assert.equal(targets.filter(e=>e.hp<100).length,def.id==='sandal'?tier:[1,2,2,3][tier-1],'actual bounce/pierce targets');
    }else{
      const center=makeTarget(qa,100,0),inside=makeTarget(qa,100+stats.area-1,0),outside=makeTarget(qa,100+stats.area+1,0);
      qa.releaseWeapon(0,34,0,weapon);for(let i=0;i<120;i++)qa.updateProjectiles(1/120);
      assert.ok(center.hp<100&&inside.hp<100);assert.equal(outside.hp,100,'blast radius matches actual area');
    }
    const text=weaponRules.weaponEffectText(def.id,stats);assert.ok(text&&!/绿豆|桃枝|擀面杖/.test(text));
  }
  const flowerMerge=await newGame('liubei','peach');flowerMerge.clearBattle();flowerMerge.run.weapons.push({id:'peach',tier:1,uid:2});
  assert.ok(r.combineWeapon(flowerMerge.run,1));flowerMerge.refreshStats();flowerMerge.syncWeapons();flowerMerge.releaseWeapon(0,0,0,flowerMerge.weapons[0]);assert.equal(flowerMerge.projectiles.filter(p=>p.remaining>0).length,3,'real merge immediately enables three petals');
  console.log('通过：11武器×4品级真实攻击、桃花单/三瓣与爆炸不重复伤害、霰弹同敌最多4颗、扁担/尖刀升级刀弧、弹射/穿透、剑数、雷链和吸风段数/目标上限、桃花合成即时生效');
  for (const def of load('weapons').WEAPONS.slice(0,5)) {
    const audioGame = await newGame(); audioGame.clearBattle(); audioGame.spawnClock = 999;
    audioGame.run.weapons = [{ id: def.id, tier: 1, uid: 1 }]; audioGame.refreshStats(); audioGame.syncWeapons();
    const sounds = [], play = audioGame.playSound.bind(audioGame);
    audioGame.playSound = (...args) => { sounds.push(args[0]); play(...args); };
    const one = makeTarget(audioGame,80,0), two = makeTarget(audioGame,90,0);
    const equipped = audioGame.run.weapons[0], w = audioGame.weapons[0]; w.angle=0; w.damage=5;
    if (def.category === 'melee') audioGame.meleeStrike(w);
    else { audioGame.launchProjectile(0,34,0,equipped,w.stats,5); audioGame.updateProjectiles(.5); }
    const expected = load('weapon-sound').weaponSound(def.id,'hit');
    assert.ok(sounds.includes(expected), `${def.id} routes real damage to its own impact sound`);
    if (def.id !== 'sandal') assert.ok(!sounds.includes('sandal-hit-pcm'), 'non-shoe weapons cannot fall back to the shoe impact');
    if (def.area || def.category === 'melee') assert.equal(sounds.filter(s => s===expected).length,1,'one sweep / explosion only sounds once for several targets');
    const beforeDead=sounds.length; one.hp=0; audioGame.hitEnemy(one,0,5); assert.equal(sounds.length,beforeDead);
    const nativePlays=audioGame.soundSources.reduce((n,s)=>n+s.plays,0);
    assert.equal(nativePlays,def.id==='sandal'?1:2,'one release + one audible impact even for same-frame bean piercing');
    audioGame.stopSounds(); audioGame.muted=true; audioGame.playWeaponSound(def.id,'hit');
    assert.equal(audioGame.soundSources.reduce((n,s)=>n+s.plays,0),nativePlays,'mute covers all weapon sounds');
    audioGame.muted=false; audioGame.clearBattle(); sounds.length=0;
    if (def.category === 'melee') { w.hit.clear(); audioGame.meleeStrike(w); assert.ok(!sounds.includes(expected),'air swing never makes a hit sound'); }
    else {
      audioGame.launchProjectile(0,34,0,equipped,w.stats,5); audioGame.updateProjectiles(2);
      assert.equal(sounds.includes(expected),def.id==='firecracker','only a firecracker explodes audibly at max range');
    }
  }
  const ownedSound = await newGame('liubei','smg'); ownedSound.clearBattle(); makeTarget(ownedSound,80,0);
  const beanWeapon=ownedSound.run.weapons[0], beanStats=ownedSound.weapons[0].stats, routed=[];
  ownedSound.playSound=id=>routed.push(id); ownedSound.launchProjectile(0,34,0,beanWeapon,beanStats,4);
  ownedSound.run.weapons[0]={uid:2,id:'sandal',tier:1}; ownedSound.updateProjectiles(.4);
  assert.ok(routed.includes('beans-hit') && !routed.includes('sandal-hit-pcm'),'in-flight shot retains its sound identity after equipment changes');
  console.log('通过：五种基础武器真实攻击/命中路由、空挥无命中声、扇形与范围攻击只响一次、弹丸同帧穿透限频、爆竹空爆、弹丸声音快照、全部音效静音');
  for (const hero of r.HEROES) for (const def of load('weapons').WEAPONS.filter(w => w.starter)) {
    const combo = await newGame(hero.id, def.id); combo.clearBattle(); combo.spawnClock = 999;
    assert.equal(combo.run.weapons[0].id, def.id); assert.equal(combo.run.starter, def.id);
    assert.ok(combo.weapons[0].arm.node.active && combo.weapons[1].arm.node.active, 'one weapon still renders both hands');
    assert.equal(combo.weapons[1].equipped, undefined); assert.equal(combo.weapons[1].shoe.active, false);
    assert.equal(combo.weapons.filter(w => w.equipped).length, 1, 'the free hand has no attack stream');
    const target = makeTarget(combo, 80, 0); target.hp = 9999; target.speed = 0; target.attackCooldown = 999;
    for (let i = 0; i < 120; i++) { target.x = 80; target.y = 0; target.vx = target.vy = 0; combo.update(1 / 60); }
    assert.ok(combo.hits > 0, `${hero.id} can actually attack with ${def.id}`);
    if (def.category === 'melee') assert.equal(combo.projectiles.length, 0, 'melee weapons never become projectiles');
  }
  const freeHand = await newGame(); freeHand.clearBattle(); freeHand.spawnClock = 999;
  const freeY = freeHand.weapons[1].node.position.y;
  freeHand.keys.add(cc.KeyCode.ARROW_RIGHT);
  for (let i = 0; i < 15; i++) freeHand.update(1 / 60);
  assert.notEqual(freeHand.weapons[1].node.position.y, freeY, 'empty hand follows the walking pose');
  freeHand.run.weapons.push({ id: 'cleaver', tier: 1, uid: 2 }); freeHand.syncWeapons();
  assert.equal(freeHand.weapons[1].shoe.active, true, 'second weapon uses the existing second hand');
  freeHand.run.weapons.pop(); freeHand.syncWeapons();
  assert.equal(freeHand.weapons[1].shoe.active, false, 'removing the second weapon restores an empty hand');
  assert.equal(freeHand.weapons[1].arm.node.active, true);
  const mixed = await newGame(); mixed.clearBattle(); mixed.spawnClock = 999;
  mixed.run.weapons = load('weapons').WEAPONS.slice(0,6).map((w, i) => ({ id: w.id, tier: 2, uid: i + 1 })); mixed.run.nextWeaponUid = 7;
  mixed.refreshStats(); mixed.syncWeapons(); const attacks = new Map();
  const launch = mixed.launchProjectile.bind(mixed), strike = mixed.meleeStrike.bind(mixed);
  mixed.launchProjectile = (...args) => { attacks.set(args[3].id, (attacks.get(args[3].id) || 0) + 1); launch(...args); };
  mixed.meleeStrike = weapon => { attacks.set(weapon.equipped.id, (attacks.get(weapon.equipped.id) || 0) + 1); strike(weapon); };
  const dummyMixed = makeTarget(mixed, 80, 0); dummyMixed.hp = 999999; dummyMixed.speed = 0; dummyMixed.attackCooldown = 999;
  for (let i = 0; i < 180; i++) { dummyMixed.x = 80; dummyMixed.y = 0; dummyMixed.vx = dummyMixed.vy = 0; mixed.update(1 / 60); }
  assert.equal(attacks.size, 6, 'all six weapons have an independent firing stream');
  assert.ok(attacks.get('pole') > attacks.get('firecracker'), 'weapon intervals are independent');
  assert.ok(mixed.hits > 15); assert.ok(mixed.projectiles.length <= 160);
  const clocks = mixed.weapons.map(w => [w.time, w.cooldown]); mixed.paused = true; mixed.update(5);
  assert.equal(JSON.stringify(mixed.weapons.map(w => [w.time, w.cooldown])), JSON.stringify(clocks)); mixed.paused = false;
  const snapshotWeapon = mixed.run.weapons[0], snapshotStats = r.weaponStatsFor(mixed.run, snapshotWeapon);
  mixed.launchProjectile(0, 34, 0, snapshotWeapon, snapshotStats, 8); const snapshotShot = mixed.projectiles.findLast(p => p.remaining > 0);
  const oldDamage = snapshotShot.damage, oldRange = snapshotShot.remaining, oldSpeed = snapshotShot.stats.speed;
  mixed.run.bonus.power = 20; mixed.run.bonus.range = 100; mixed.refreshStats();
  assert.equal(snapshotShot.damage, oldDamage); assert.equal(snapshotShot.remaining, oldRange); assert.equal(snapshotShot.stats.speed, oldSpeed);
  const close = await newGame('liubei', 'cleaver'); close.clearBattle(); const knife = close.weapons[0]; knife.angle = 0; knife.damage = 5;
  const front = makeTarget(close, 80, 0), frontSide = makeTarget(close, 70, 30), flank = makeTarget(close, 0, 80), rear = makeTarget(close, -80, 0), distant = makeTarget(close, knife.stats.range + 60, 0);
  close.meleeStrike(knife); assert.equal(front.hp, 95); assert.equal(frontSide.hp, 95); assert.equal(flank.hp, 100); assert.equal(rear.hp, 100); assert.equal(distant.hp, 100);
  close.meleeStrike(knife); assert.equal(front.hp, 95, 'one swing never hits the same enemy twice');

  console.log("通过：真实启动、键盘/触摸、单手/双手姿势、9种初始组合、六独立武器流、音效路由与投射物快照");

  const behavior = load('enemy-behavior');
  const special = await newGame(); special.clearBattle(); special.phase = 'battle'; special.spawnClock = 999;
  for (const kind of ['soldier', 'spearman', 'cavalry', 'chief']) {
    special.spawnSerial = 5000; special.spawnNext(kind);
    const fresh = special.enemies.findLast(e => e.hp > 0); assert.ok(fresh.attackCooldown < 1, 'late-wave spawn serial cannot delay skills for minutes');
    special.clearBattle();
  }
  const archer = makeTarget(special, -260, 0, 'spearman'); archer.attackCooldown = 0;
  let warningStrokes = 0; archer.warning.stroke = () => warningStrokes++;
  special.updateSpecialEnemy(archer, .17); assert.equal(special.enemyShots.length, 0);
  archer.flash = .1; special.updateSpecialEnemy(archer, .02); assert.equal(special.enemyShots.length, 1, 'short draw fires even when hit');
  special.updateSpecialEnemy(archer, .1); assert.equal(special.enemyShots.length, 1, 'one arrow per attack');
  for (let i = 0; i < 180; i++) { archer.flash = .1; special.updateSpecialEnemy(archer, 1 / 60); }
  assert.ok(special.enemyShots.length >= 3, 'sustained hits no longer reset every shot'); assert.equal(warningStrokes, 0, 'archer does not render aim lines');
  const shotsBeforeDeath = special.enemyShots.length; archer.attack = .17; archer.hp = 0; special.updateEnemy(archer, .1); assert.equal(special.enemyShots.length, shotsBeforeDeath);
  special.enemyShots.forEach(shot => shot.remaining = 0);
  archer.hp = 100; archer.x = -150; archer.y = 0; special.hurtTime = 0; special.playerHp = 5;
  special.fireEnemyShot(archer, 0, behavior.ARCHER.speed); special.updateEnemyShots(1); assert.equal(special.playerHp, 4, 'arrow sweep still hits when an update crosses player');
  special.updateEnemyShots(1); assert.equal(special.playerHp, 4, 'spent arrow cannot hit twice');
  console.log('通过：后期出生延迟有界、弓箭手0.18秒出手、连续受击仍射箭、无瞄准线、死亡不射箭及箭矢连续碰撞');

  special.clearBattle(); special.px = 0; special.py = 0; special.playerHp = 5; special.hurtTime = 0;
  const approaching = makeTarget(special, -behavior.CAVALRY.range - 80, 0, 'cavalry'); approaching.attackCooldown = 0;
  const approachX = approaching.x;
  for (let i = 0; i < 40; i++) special.updateSpecialEnemy(approaching, 1 / 60);
  assert.equal(approaching.attack, -1, 'cavalry outside the activation radius keeps pursuing instead of charging');
  assert.ok(approaching.x > approachX);
  for (let i = 0; i < 60 && approaching.attack < 0; i++) special.updateSpecialEnemy(approaching, 1 / 60);
  assert.ok(approaching.attack >= 0, 'pursuit starts the windup after entering range');
  assert.ok(Math.hypot(approaching.x - special.px, approaching.y - special.py) < 260);
  special.clearBattle();
  const rider = makeTarget(special, -250, 0, 'cavalry'); rider.attackCooldown = 0;
  let riderIndicators = 0;
  rider.warning.stroke = () => riderIndicators++; rider.warning.fill = () => riderIndicators++;
  special.updateSpecialEnemy(rider, .2); const locked = rider.attackAngle; const startX = rider.x;
  assert.equal(riderIndicators, 0, 'cavalry windup has no path, arrow or area overlay');
  assert.ok(rider.art.node.scale.y < 1 && rider.art.node.angle !== 0, 'the rider visibly braces before charging');
  special.px = 100; special.py = 120; special.updateSpecialEnemy(rider, .25);
  assert.equal(rider.attackAngle, locked); assert.equal(rider.x, startX, 'windup does not charge early');
  special.updateSpecialEnemy(rider, .3); assert.ok(Math.abs(rider.x - startX - 162) < 1e-6, 'charge speed is 540');
  assert.equal(special.playerHp, 5, 'sidestepping the locked lane avoids the charge');
  special.px = 0; special.py = 0; special.updateSpecialEnemy(rider, .32);
  assert.ok(Math.abs(rider.x - startX - behavior.CAVALRY.speed * behavior.CAVALRY.duration) < 1e-6);
  assert.equal(special.playerHp, 4); assert.ok(rider.chargeHit); const endX = rider.x; rider.vx = rider.vy = 0;
  special.updateSpecialEnemy(rider, .4); assert.equal(rider.x, endX, 'recovery has a definite end to movement');
  assert.equal(rider.attack, -1); assert.equal(rider.attackCooldown, behavior.CAVALRY.cooldown);
  console.log('通过：骑兵追近260范围才蓄势、无路径范围提示、锁向冲锋/侧移可躲、540速度/334.8距离、连续碰撞与单次命中、收招和冷却');

  special.clearBattle(); special.px = 0; special.py = 0; special.playerHp = 5; special.hurtTime = 0;
  const caster = makeTarget(special, -300, 0, 'chief'); caster.attackCooldown = 0;
  special.updateSpecialEnemy(caster, .01); assert.equal(special.enemyZones.length, 1); const zone = special.enemyZones[0];
  special.updateEnemyZones(.84); assert.equal(special.playerHp, 5, 'circle warning cannot damage early');
  special.px = 110; special.py = 0; special.updateEnemyZones(.02); assert.equal(special.playerHp, 5, 'walking out of locked circle avoids lightning');
  assert.equal(zone.x, 0); assert.equal(zone.y, 0); assert.ok(zone.fired);
  special.px = 0; special.updateEnemyZones(.1); assert.equal(special.playerHp, 5, 'impact is one damage check, not lingering damage');
  special.enemyZones = []; caster.attack = -1; caster.attackCooldown = 0; caster.skill = 0;
  special.updateSpecialEnemy(caster, .01); special.updateEnemyZones(.86); assert.equal(special.playerHp, 4, 'staying in the circle takes boss damage');
  special.hurtTime = 0; special.updateEnemyZones(.1); assert.equal(special.playerHp, 4, 'even without invulnerability the same spell only hits once');
  special.updateEnemyZones(.3); assert.equal(special.playerHp, 4, 'longer visual afterglow never applies damage');
  assert.equal(special.enemyZones.length, 1, 'the burst retains its fading particles');
  special.updateEnemyZones(.2); assert.equal(special.enemyZones.length, 0, 'the afterglow has a bounded lifetime');
  special.enemyZones = []; caster.attack = -1; caster.attackCooldown = 0;
  special.updateSpecialEnemy(caster, .01); assert.equal(special.enemyZones.length, 3, 'second cast is three marked lightning circles');
  assert.equal(new Set(special.enemyZones.map(z => z.x + ',' + z.y)).size, 3);
  const age = special.enemyZones[0].age; special.paused = true; special.update(.5); assert.equal(special.enemyZones[0].age, age); special.paused = false;
  special.hitEnemy(caster, 0, 99999); assert.equal(special.enemyZones.length, 0, 'killing Zhang Jiao cancels pending circles');
  special.spawnNext('chief'); const recycled = special.enemies.findLast(e => e.hp > 0); assert.equal(recycled.skill, 0, 'pooled enemies reset their skill cycle');
  special.beginLightning(recycled); special.clearBattle(); assert.equal(special.enemyZones.length, 0, 'round/menu transitions clear hazards');
  console.log('通过：张角定点落雷/三才雷阵、预警不伤害、离圈可躲、爆发只命中一次、暂停冻结、死亡与换关清理');

  const animated = await newGame(); animated.clearBattle(); animated.spawnClock = 999;
  for (const kind of ['spearman', 'cavalry', 'chief']) {
    for (const [x, y, facing] of [[-600, 0, 1], [600, 0, 3], [0, -280, 2], [0, 280, 0]]) {
      const mob = makeTarget(animated, x, y, kind); mob.attackCooldown = 99;
      if (kind === 'spearman' && !x) { mob.x = 0; mob.y = y > 0 ? 310 : -310; }
      animated.updateSpecialEnemy(mob, 1 / 60); assert.equal(mob.direction, facing); assert.ok(mob.moving);
      mob.walk = 0; animated.drawEnemy(mob); const firstFrame = mob.art.spriteFrame;
      if(kind==='chief'){const foot=mob.rigParts[2].node.position.y;mob.walk=.5;animated.drawEnemy(mob);assert.notEqual(mob.rigParts[2].node.position.y,foot,'new boss rig has independent footsteps');}else{mob.walk=1;animated.drawEnemy(mob);assert.notEqual(mob.art.spriteFrame,firstFrame,'walking changes limb pose, not only sprite tilt');}
      assert.equal(mob.art.node.scale.x < 0, facing === 3, 'left uses mirrored right profile');
      animated.clearBattle();
    }
    assert.equal(animated.enemyFrames[kind].length, 12);
  }

  const advance = (g, seconds) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60); };
  const g = await newGame(); g.clearBattle(); g.spawnClock = 999;
  assert.equal(g.remaining, 15); assert.equal(g.playerHp, 5); assert.equal(g.stats.maxHp, 5);
  g.playerHp = 3; const levelBefore = g.run.level; r.gainXp(g.run, 100); g.refreshStats();
  assert.equal(g.run.level,levelBefore); assert.equal(g.playerHp, 3); assert.equal(g.run.pending, 0);
  g.paused = true; g.update(50); assert.equal(g.remaining, 15); g.paused = false;
  g.dropCoin(400, 0); g.dropCoin(-400, 0); advance(g, 15);
  assert.equal(g.phase,'shop');assert.equal(g.run.wave,1);assert.equal(g.run.supplyMode,'departure');assert.equal(g.run.gold,28);assert.equal(g.playerHp,5);assert.equal(g.difficultyLabel.string,'');assert.equal(g.run.survivalSeconds,0);
  const uiLabels=[];const readLabels=n=>{const l=n.getComponent(Label);if(l)uiLabels.push(l.string);n.children.forEach(readLabels);};readLabels(g.screens.root);assert.ok(uiLabels.includes('继续战斗'));assert.ok(!uiLabels.some(t=>/进入第|热身完成/.test(t)));
  const cash=g.run.gold;g.finishWave();assert.equal(g.run.gold,cash,'seamless transition reward is idempotent');assert.equal(g.run.weapons.length,1,'heat transition must not grant a duplicate weapon');assert.equal(g.run.weapons[0].id,g.run.starter);assert.equal(g.run.weapons[0].uid,1);assert.equal(g.run.nextWeaponUid,2);
  const preparation=JSON.stringify([g.age,g.spawnClock,g.run.survivalSeconds,g.enemies.map(e=>[e.x,e.y,e.hp])]);advance(g,10);assert.equal(JSON.stringify([g.age,g.spawnClock,g.run.survivalSeconds,g.enemies.map(e=>[e.x,e.y,e.hp])]),preparation,'preparation shop freezes battlefield');click(g.screens.root,'SupplySkip');assert.equal(g.phase,'battle');assert.equal(g.run.wave,2);assert.equal(g.nextSupply,30);assert.equal(g.difficultyLabel.string,'');assert.equal(g.run.weapons.length,1,'skipping purchases never grants a weapon');
  g.clearBattle(); g.spawnClock = 999; g.resumeCountdown = 0;
  advance(g, 30); assert.equal(g.phase, 'shop'); assert.equal(g.run.supplyCount, 1); assert.equal(g.run.gold,40);
  const frozen = JSON.stringify([g.run.survivalSeconds,g.spawnClock,g.age,g.enemies.map(e=>[e.x,e.y,e.attack])]); advance(g, 15);
  assert.equal(JSON.stringify([g.run.survivalSeconds,g.spawnClock,g.age,g.enemies.map(e=>[e.x,e.y,e.attack])]),frozen,'shopping freezes every clock and actor');
  assert.equal(g.run.offers.length,3); assert.ok(g.run.offers.some(id=>survival.canBuySupply(g.run,id)),'affordable choice guaranteed');
  const affordable = g.run.offers.findIndex(id=>survival.canBuySupply(g.run,id)); click(g.screens.root,'SupplyBuy-'+affordable);
  assert.equal(g.phase,'shop');assert.equal(g.run.purchasedOffers.length,1);const held=g.run.survivalSeconds;advance(g,2);assert.equal(g.run.survivalSeconds,held,'purchase keeps combat frozen');click(g.screens.root,'SupplySkip');assert.equal(g.phase,'battle'); const survive = g.run.survivalSeconds; advance(g,.5); assert.equal(g.run.survivalSeconds,survive,'resume countdown cannot inflate score');
  advance(g,1); assert.ok(g.protectionTime>0);assert.equal(g.hurtTime,0); assert.equal(g.nextSupply,60);
  g.clearBattle(); g.spawnClock=999; g.resumeCountdown=0; advance(g,30); assert.equal(g.phase,'shop'); click(g.screens.root,'SupplySkip');
  g.clearBattle(); g.spawnClock=999; g.resumeCountdown=0; advance(g,30); assert.equal(g.phase,'shop'); assert.equal(g.run.supplyMode,'major');
  click(g.screens.root,'SupplyNormal'); assert.equal(g.run.supplyMode,'normal');
  const oldMinions=['soldier','spearman','cavalry'].map((kind,i)=>makeTarget(g,-500+i*80,200,kind));
  oldMinions.forEach(e=>{e.hp=300;e.speed=0;e.attackCooldown=999;});
  g.fireEnemyShot(oldMinions[1],0,100);const oldShot=g.enemyShots.find(p=>p.remaining>0);
  const oldState=JSON.stringify(oldMinions.map(e=>[e.x,e.y,e.hp,e.attack,e.born]));
  click(g.screens.root,'SupplySkip');
  assert.equal(JSON.stringify(oldMinions.map(e=>[e.x,e.y,e.hp,e.attack,e.born])),oldState,'boss entry preserves minion health, pose and position');
  assert.ok(oldMinions.every(e=>e.node.active));assert.ok(oldShot.remaining>0&&oldShot.node.active,'existing arrows remain');
  assert.equal(g.run.wavesCleared,3);assert.equal(g.run.bossEncounter,true);assert.equal(g.nextSupply,Infinity);
  assert.equal(g.enemies.filter(e=>e.hp>0&&e.kind==='chief').length,1);assert.equal(g.enemies.filter(e=>e.hp>0&&!e.animal&&e.kind!=='chief').length,3,'boss joins surviving minions');
  const firstBoss=g.enemies.find(e=>e.hp>0&&e.kind==='chief');firstBoss.attackCooldown=999;firstBoss.speed=0;
  g.resumeCountdown=0;g.spawnClock=0;
  const realSpawn=g.spawnNext,realHurt=g.hurtPlayer,reinforcements=[];g.spawnNext=function(kind){reinforcements.push(kind);return realSpawn.call(this,kind);};g.hurtPlayer=()=>{};
  advance(g,31);g.spawnNext=realSpawn;g.hurtPlayer=realHurt;
  assert.equal(g.phase,'battle','boss is not a timed survival wave');assert.equal(g.enemies.filter(e=>e.hp>0&&e.kind==='chief').length,1);
  assert.ok(reinforcements.length>=10,'boss battle continues the regular timed spawning budget');assert.ok(reinforcements.every(kind=>['soldier','spearman','cavalry'].includes(kind)),'reinforcements do not create another boss');
  assert.ok(g.enemies.filter(e=>e.hp>0&&!e.animal).length<=80,'boss and reinforcements share the enemy cap');
  g.openSupply();g.resumeSupply('duplicate');assert.equal(g.phase,'battle');assert.equal(g.enemies.filter(e=>e.hp>0&&e.kind==='chief').length,1,'no extra shop/boss while Zhang Jiao is alive');
  g.playerHp=5;g.hurtTime=0;g.protectionTime=0;g.hurtPlayer(-20,0,999);assert.equal(g.playerHp,4);g.hurtPlayer(-20,0,999);assert.equal(g.playerHp,4);
  for(let i=0;i<4;i++){g.hurtTime=0;g.hurtPlayer(-20,0,999);}
  assert.equal(g.phase,'defeat');assert.equal(storage.has('taoyuan-chronicle-clear-best-v4'),false,'failure never writes a clear record');
  click(g.screens.root,'ResultRetry');assert.equal(g.run.wave,1);assert.equal(g.run.wavesCleared,0);assert.equal(g.run.bossEncounter,false);assert.equal(g.run.gold,0);assert.equal(g.playerHp,5);
  console.log('通过：15秒第零章/先购物/不送武器、三波各30秒与补给冻结、第三波后唯一张角/保留旧敌与弹幕/持续援军/不重复首领/不超时过关、失败/重开清阶段');

  const prep=await newGame('guanyu');prep.clearBattle();prep.spawnClock=999;prep.run.gold=120;prep.playerHp=3;prep.px=240;prep.py=-70;prep.hero.setPosition(240,-70);prep.cameraX=120;prep.cameraY=-20;
  const prepEnemy=makeTarget(prep,-350,180);prepEnemy.hp=200;prep.remaining=.001;prep.update(.01);
  assert.equal(prep.phase,'shop');assert.equal(prep.run.wave,1);assert.equal(prep.run.gold,120);assert.equal(prep.playerHp,5);assert.equal(prep.run.weapons.length,1);assert.equal(prep.run.offers.length,3);assert.equal(prep.run.offers[0],'w:pole:1');assert.equal(prep.run.offers.filter(id=>id.startsWith('w:')).length,2,'preparation guarantees two weapon choices');
  for(let i=0;i<3;i++){const id=prep.run.offers[i],price=prep.run.offerPrices[id],gold=prep.run.gold;click(prep.screens.root,'SupplyBuy-'+i);assert.equal(prep.run.gold,gold-price);assert.equal(prep.phase,'shop');assert.equal(prep.run.wave,1);assert.equal(prep.difficultyLabel.string,'');}
  const refreshCost=survival.refreshPrice(prep.run),beforeRefresh=prep.run.gold;click(prep.screens.root,'SupplyRefresh');assert.equal(prep.run.gold,beforeRefresh-refreshCost);assert.equal(prep.run.rerolls,1);assert.equal(survival.refreshPrice(prep.run),8);
  const next=prep.run.offers.findIndex(id=>survival.canBuySupply(prep.run,id));assert.ok(next>=0);click(prep.screens.root,'SupplyBuy-'+next);assert.equal(prep.phase,'shop');
  const frozenPrep=JSON.stringify([prep.age,prep.px,prep.py,prep.cameraX,prep.cameraY,prepEnemy.hp,prepEnemy.x,prepEnemy.y,prep.run.survivalSeconds]);advance(prep,8);assert.equal(JSON.stringify([prep.age,prep.px,prep.py,prep.cameraX,prep.cameraY,prepEnemy.hp,prepEnemy.x,prepEnemy.y,prep.run.survivalSeconds]),frozenPrep);
  const equippedPrep=JSON.stringify(prep.run.weapons),prepUid=prep.run.nextWeaponUid;click(prep.screens.root,'SupplySkip');assert.equal(prep.run.wave,2);assert.equal(prep.nextSupply,30);assert.equal(prep.nextEvent,90);assert.equal(prep.run.survivalSeconds,0);assert.equal(prep.difficultyLabel.string,'');assert.equal(JSON.stringify(prep.run.weapons),equippedPrep);assert.equal(prep.run.nextWeaponUid,prepUid);assert.equal(prep.px,240);assert.equal(prep.py,-70);assert.equal(prep.cameraX,120);assert.equal(prep.cameraY,-20);assert.equal(prepEnemy.hp,200);
  const continued=JSON.stringify([prep.run.gold,prep.nextSupply,prep.nextEvent,prep.run.weapons]);prep.resumeSupply('重复点击');assert.equal(JSON.stringify([prep.run.gold,prep.nextSupply,prep.nextEvent,prep.run.weapons]),continued);
  console.log('通过：正式战斗前展示一次普通补给/两武器一道具/可全买与刷新后再买、购物期间不升级/完整战场冻结、付款后原地继续战斗/不复制装备/不跳过30秒补给/继续幂等');

  const feedback=await newGame();feedback.clearBattle();feedback.spawnClock=999;feedback.lastDamage=3;
  assert.equal(feedback.hurtTime,0);assert.equal(feedback.protectionTime,0);feedback.finishWave();
  assert.equal(feedback.phase,'shop');click(feedback.screens.root,'SupplySkip');advance(feedback,1.3);assert.ok(feedback.protectionTime>0);assert.equal(feedback.hurtTime,0);feedback.stick={x:1,y:0};const beforeMove=feedback.px;
  feedback.update(1/60);assert.ok(Math.abs(feedback.px-beforeMove-feedback.stats.speed/60)<1e-8,'transition protection must not trigger hurt-speed bonus');
  assert.equal(feedback.body.color.value,'#ffffff');assert.equal(feedback.hurtText.string,'','protection must not display stale damage');
  feedback.hurtPlayer(feedback.px-20,feedback.py);assert.equal(feedback.playerHp,5);assert.equal(feedback.hurtText.string,'');
  advance(feedback,1.25);assert.equal(feedback.protectionTime,0);feedback.hurtPlayer(feedback.px-20,feedback.py);
  assert.equal(feedback.playerHp,4);assert.ok(feedback.hurtTime>0);assert.equal(feedback.body.color.value,'#ff8479');assert.equal(feedback.hurtText.string,'-1');feedback.hurtPlayer(feedback.px-20,feedback.py);assert.equal(feedback.playerHp,4,'real-hit invulnerability still blocks repeat damage');
  advance(feedback,1.4);feedback.openSupply();click(feedback.screens.root,'SupplySkip');assert.ok(feedback.protectionTime>0);assert.equal(feedback.hurtTime,0);
  const protection=feedback.protectionTime;feedback.paused=true;advance(feedback,2);assert.equal(feedback.protectionTime,protection);feedback.paused=false;advance(feedback,1.4);
  assert.equal(feedback.body.color.value,'#ffffff');assert.equal(feedback.hurtText.string,'');feedback.hurtPlayer(feedback.px,feedback.py);assert.equal(feedback.playerHp,4,'supply protection blocks hits without showing damage');
  feedback.showMainMenu();assert.equal(feedback.protectionTime,0);assert.equal(feedback.hurtTime,0);storage.delete('taoyuan-chronicle-v4');click(feedback.screens.root,'StartHero');assert.equal(feedback.hurtText.string,'');assert.equal(feedback.body.color.value,'#ffffff');
  feedback.clearBattle();feedback.spawnClock=999;feedback.hurtPlayer(-20,0);feedback.finishWave();assert.ok(feedback.hurtTime>0,'real hit feedback is preserved during the preparation shop');click(feedback.screens.root,'SupplySkip');advance(feedback,2.5);assert.equal(feedback.body.color.value,'#ffffff');
  console.log('通过：热身/补给保护不闪红/不显示扣血/不触发受击加速、保护仍能免伤/暂停冻结、真实受击正常闪红扣血/防连击、重开清理');

  for(const hero of r.HEROES) {
    const run=r.createRun(hero.id);assert.equal(r.statsFor(run).maxHp,5);assert.ok(r.statsFor(run).pickup>=240);
    run.gold=9999;survival.rollSupply(run,seeded);assert.equal(new Set(run.offers).size,3);
    const offer=run.offers[0],price=run.offerPrices[offer];assert.ok(survival.buySupply(run,offer));assert.equal(run.gold,9999-price);
    const snapshot=JSON.stringify(run);assert.equal(survival.buySupply(run,offer),false);assert.equal(JSON.stringify(run),snapshot,'same card cannot be charged twice');for(const id of run.offers.slice(1))assert.ok(survival.buySupply(run,id));assert.equal(run.purchasedOffers.length,3,'all three cards can be bought');
  }
  for(let i=0;i<300;i++) {
    const run=r.createRun(['liubei','guanyu','zhangfei'][i%3]);run.supplyMode=i%2?'major':'normal';run.supplyCount=i;run.survivalSeconds=i*30;run.gold=12;
    if(i%3===0) {run.weapons=load('weapons').WEAPONS.slice(0,6).map((w,j)=>({id:w.id,tier:i%2?4:2,uid:j+1}));run.augments=survival.AUGMENTS.map(a=>a.id);for(const item of r.ITEMS)run.inventory[item.id]=3;}
    survival.rollSupply(run,seeded);assert.equal(run.offers.length,3);assert.equal(new Set(run.offers).size,3);assert.ok(run.offers.some(id=>survival.canBuySupply(run,id)));
    for(const id of run.offers){const c=survival.supplyCard(run,id);assert.ok(c.title&&c.desc&&c.price>0);if(id.startsWith('w:'))assert.ok(run.weapons.length<=6);}
    assert.ok(survival.rerollSupply(run,seeded));assert.equal(survival.refreshPrice(run),8);const canRefresh=run.gold>=8;assert.equal(survival.rerollSupply(run,seeded),canRefresh);
  }
  const heal=r.createRun('liubei');heal.supplyMode='normal';heal.hearts=2;heal.gold=999;heal.offers=['bun'];heal.offerPrices={bun:50};assert.ok(survival.buySupply(heal,'bun'));assert.equal(heal.hearts,3);
  heal.purchasedOffers=[];assert.equal(survival.buySupply(heal,'bun'),false);heal.survivalSeconds=60;assert.ok(survival.buySupply(heal,'bun'));assert.equal(heal.hearts,4);
  heal.purchasedOffers=[];heal.survivalSeconds=120;heal.hearts=5;assert.equal(survival.buySupply(heal,'bun'),false);
  const full=r.createRun('liubei');full.weapons=load('weapons').WEAPONS.slice(0,6).map((w,i)=>({id:w.id,tier:1,uid:i+1}));full.gold=999;full.supplyMode='normal';full.offers=['u:1:2'];full.offerPrices={'u:1:2':40};assert.ok(survival.buySupply(full,'u:1:2'));assert.equal(full.weapons.length,6);assert.equal(full.weapons[0].tier,2);
  assert.equal(r.enemyStats('soldier',2,0).hp,24);assert.ok(r.enemyStats('soldier',2,600).hp>r.enemyStats('soldier',2,480).hp);
  assert.equal(survival.spawnBudget(3600),7.5);assert.equal(r.enemyStats('chief',2,900).damage,1);
  console.log('通过：300轮三卡唯一/适配/满槽/全收集回退/可负担保底、连续刷新递增价格、多项购买、防重复扣款、补心冷却/满心、满槽升阶、难度曲线');

  const shopping=r.createRun('liubei');shopping.supplyMode='normal';shopping.gold=1000;shopping.offers=['A01','A02','C01'];shopping.offerPrices={A01:10,A02:10,C01:10};
  for(const id of shopping.offers)assert.ok(survival.buySupply(shopping,id));assert.equal(shopping.gold,970);assert.equal(shopping.purchasedOffers.length,3);
  let before=JSON.stringify(shopping);assert.equal(survival.buySupply(shopping,'A01'),false);assert.equal(JSON.stringify(shopping),before);
  for(const price of [5,8,11,14]){assert.equal(survival.refreshPrice(shopping),price);const balance=shopping.gold;assert.ok(survival.rerollSupply(shopping,seeded));assert.equal(shopping.gold,balance-price);assert.equal(shopping.purchasedOffers.length,0);assert.ok(survival.buySupply(shopping,shopping.offers.find(id=>survival.canBuySupply(shopping,id))),'may purchase after every refresh');}
  shopping.gold=0;before=JSON.stringify(shopping);assert.equal(survival.rerollSupply(shopping,seeded),false);assert.equal(JSON.stringify(shopping),before,'failed refresh does not increase next price');
  shopping.rerolls=0;shopping.inventory.C05=1;assert.equal(survival.refreshPrice(shopping),4);shopping.gold=100;assert.ok(survival.rerollSupply(shopping,seeded));assert.equal(survival.refreshPrice(shopping),8,'discount applies only to first refresh');
  console.log('通过：三卡全部可购/原卡不重复扣款、已购后四次刷新仍可买、刷新5/8/11/14递增、失败无扣款/涨价、首刷优惠');

  const bounce=await newGame();bounce.clearBattle();bounce.run.augments=['ricochet'];bounce.refreshStats();
  const b1=makeTarget(bounce,80,0),b2=makeTarget(bounce,160,0),b3=makeTarget(bounce,240,0),b4=makeTarget(bounce,320,0);
  bounce.launchProjectile(0,34,0,bounce.run.weapons[0],bounce.weapons[0].stats,10);
  for(let i=0;i<180;i++)bounce.updateProjectiles(1/120);
  assert.equal(b1.hp,90);assert.equal(b2.hp,94);assert.equal(b3.hp,94);assert.equal(b4.hp,100,'shoe bounces at most twice');
  const mastery=await newGame('guanyu');mastery.clearBattle();const beforeMastery=r.weaponStatsFor(mastery.run,mastery.run.weapons[0]);mastery.run.augments=['pole-mastery'];mastery.refreshStats();const mastered=r.weaponStatsFor(mastery.run,mastery.run.weapons[0]);assert.ok(mastered.arc>beforeMastery.arc&&mastered.knockback>beforeMastery.knockback);
  const chain=await newGame('zhangfei','peach');chain.clearBattle();chain.run.augments=['chain-peach'];const p1=makeTarget(chain,0,0),p2=makeTarget(chain,20,0),p3=makeTarget(chain,40,0);p1.hp=1;p2.hp=1;
  chain.hitEnemy(p1,0,10,0,'peach');assert.ok(p2.hp<=0);assert.equal(p3.hp,94,'secondary explosion cannot recursively explode');
  const hurt=await newGame();hurt.run.augments=['last-heart'];hurt.playerHp=1;hurt.refreshStats();const strong=hurt.stats.damage;hurt.playerHp=2;hurt.refreshStats();assert.ok(hurt.stats.damage<strong);
  console.log('通过：草鞋两次弹射、扁担专属扩大角度与击退、桃花次生爆炸不连锁、最后一心增益随恢复撤销');

  const worldRules=load('world-rules'), passive=load('passive-items');
  const large=await newGame();large.clearBattle();large.spawnClock=999;large.stick={x:1,y:0};const hudX=large.statusPanel.position.x;advance(large,5);
  assert.ok(large.px>large.halfWidth,'world movement crosses a screen boundary');assert.ok(large.cameraX>250);assert.equal(worldRules.WORLD.width,large.halfWidth*3);assert.equal(worldRules.WORLD.height,large.halfHeight*3);assert.equal(large.terrainNodes.length,0);assert.equal(large.statusPanel.position.x,hudX);assert.equal(large.xpBar.node.active,false);
  for(const kind of ['soldier','cavalry','chief'])for(let i=0;i<80;i++){const px=worldRules.WORLD.halfWidth-100,py=-worldRules.WORLD.halfHeight+100,point=worldRules.spawnPoint(px,py,kind,seeded);assert.ok(Math.abs(point.x)<worldRules.WORLD.halfWidth&&Math.abs(point.y)<worldRules.WORLD.halfHeight);assert.ok(Math.hypot(point.x-px,point.y-py)>=(kind==='chief'?550:kind==='cavalry'?420:260));}
  const orbit=await newGame();orbit.clearBattle();orbit.run.weapons=load('weapons').WEAPONS.filter(w=>['smg','shotgun','rocket','sword','thunder','gourd'].includes(w.id)).map((w,i)=>({id:w.id,tier:2,uid:i+1,invested:50}));orbit.refreshStats();orbit.syncWeapons();
  const points=orbit.weapons.map(w=>w.node.position);assert.equal(new Set(points.map(p=>Math.round(p.x)+','+Math.round(p.y))).size,6);assert.ok(points.some(p=>p.y>100)&&points.some(p=>p.y<0));
  assert.ok(points.some(p=>p.x>75)&&points.some(p=>p.x<-75));for(const w of orbit.weapons){assert.equal(w.arm.node.active,false);assert.equal(w.node.parent,orbit.hero,'orbit weapon has no inactive arm parent');assert.ok(w.node.active);if(w.equipped.id==='sword'){assert.equal(w.shoe.active,false);assert.equal(w.orbitBlades.length,w.stats.shotCount);}else assert.ok(w.shoe.active);}
  const birth=orbit.spawnNext('soldier');const beforeBorn=birth.hp;orbit.castSkill();assert.equal(birth.hp,beforeBorn,'materializing soldiers cannot take skill damage');assert.ok(birth.born>=.9);orbit.updateEnemy(birth,.4);assert.ok(birth.born>0);assert.equal(birth.attack,-1);
  console.log('通过：1.5屏世界跨屏与镜头跟随、固定HUD/无经验条、240次合法出生采样、六武器周身分布/独立父节点/无额外手臂、出生预告无伤害');

  const animals=await newGame();animals.clearBattle();animals.spawnClock=999;const animal=animals.spawnAnimal('chicken');animal.born=0;animal.x=100;animal.y=0;const xpBefore=animals.run.xp,killsBefore=animals.kills;
  animals.hitEnemy(animal,0,9999);assert.equal(animals.run.xp,xpBefore);assert.equal(animals.kills,killsBefore);assert.equal(animals.hearts.filter(h=>h.active).length,1);animals.hitEnemy(animal,0,9999);assert.equal(animals.hearts.filter(h=>h.active).length,1);
  const heart=animals.hearts.find(h=>h.active);heart.x=animals.px;heart.y=animals.py;animals.updateWildlife(.5);assert.equal(heart.active,false,'full health still collects drops');assert.equal(animals.playerHp,5,'full health never exceeds five hearts');
  animals.dropHeart(animals.px,animals.py);animals.playerHp=4;animals.updateWildlife(.3);assert.equal(animals.playerHp,5);assert.equal(heart.active,false);animals.updateWildlife(.1);assert.equal(animals.playerHp,5);
  animals.dropHeart(50,0);const hAge=animals.hearts.find(h=>h.active).age;animals.phase='shop';advance(animals,5);assert.equal(animals.hearts.find(h=>h.active).age,hAge);animals.collectAllCoins();assert.ok(animals.hearts.some(h=>h.active),'coin sweep never collects life hearts');
  console.log('通过：动物击败只掉一颗心、不计敌兵成长、满心可拾取但不超上限、回血上限/单次结算、补给冻结寿命与金币回收隔离');

  for(const hero of r.HEROES){const skill=await newGame(hero.id);skill.clearBattle();skill.spawnClock=999;const target=makeTarget(skill,90,0);target.hp=9999;skill.heading=0;skill.skillCharge=skill.skillRequirement();skill.castSkill();skill.updateSkill(.28);assert.ok(target.hp<9999,hero.id+' selected generic dash deals real damage');assert.equal(skill.skillCharge,0);skill.castSkill();assert.equal(skill.skillCharge,0,'double tap cannot cast twice');
    skill.paused=true;advance(skill,3);assert.equal(skill.skillCharge,0);skill.paused=false;skill.phase='shop';advance(skill,3);assert.equal(skill.skillCharge,0);skill.phase='battle';skill.protectionTime=0;skill.commonSkill.reset();skill.weapons.forEach(w=>w.cooldown=999);advance(skill,.1);assert.equal(skill.skillCharge,0,'time never recharges a common skill');
    const hearts=skill.playerHp;skill.skillCharge=skill.skillRequirement();skill.castSkill();skill.hurtTime=0;skill.hurtPlayer(0,0);assert.equal(skill.playerHp,hearts,'generic dash protection applies to every hero');
  }
  console.log('通过：五英雄可携带同一通用技能、真实路径伤害、防连点、时间不充能、暂停补给保留计数、突进保护不限英雄');

  const controls=await newGame(),jc=load('joystick-input').joystickCenter(controls.halfWidth,controls.halfHeight);
  const finger=(x,y,id=1)=>({getLocation:()=>({x,y}),getID:()=>id});
  assert.equal(controls.joystick.node.active,true,'静止时固定摇杆可见');
  controls.touchStart(finger(jc.x,jc.y));controls.touchMove(finger(jc.x+60,jc.y));
  assert.equal(controls.stick.x,1);controls.castSkill();controls.touchEnd(finger(0,0,2));assert.equal(controls.touchId,1,'技能手指不打断移动');
  const beforeMoving=controls.px;advance(controls,.2);assert.ok(controls.px>beforeMoving,'固定摇杆真实驱动角色');
  controls.touchEnd(finger(jc.x,jc.y));assert.equal(controls.stick.x,0);assert.equal(controls.joystick.node.active,true,'松手归中但底座保留');
  const particlesBefore=JSON.stringify(controls.combatFx.particles.slots),stampsBefore=JSON.stringify(controls.combatFx.stamps);
  controls.onBackground();advance(controls,2);assert.equal(controls.joystick.node.active,false);assert.equal(JSON.stringify(controls.combatFx.particles.slots),particlesBefore);assert.equal(JSON.stringify(controls.combatFx.stamps),stampsBefore);
  controls.onForeground();controls.paused=false;controls.finishWave();assert.equal(controls.joystick.node.active,false,'商店隐藏摇杆');controls.resumeSupply('');assert.equal(controls.joystick.node.active,true);controls.showMainMenu();assert.equal(controls.joystick.node.active,false);
  controls.restart();controls.clearBattle();controls.spawnClock=999;controls.resumeCountdown=.3;controls.touchStart(finger(jc.x+60,jc.y));const waitingX=controls.px;
  advance(controls,.2);assert.equal(controls.px,waitingX,'倒数期间不提前移动');advance(controls,.3);assert.ok(controls.px>waitingX,'倒数结束响应已按住的摇杆');controls.touchEnd(finger(jc.x,jc.y));
  for(const def of load('weapons').WEAPONS){
    const effectGame=await newGame('liubei',def.id);effectGame.clearBattle();effectGame.spawnClock=999;
    const w=effectGame.weapons[0],target=makeTarget(effectGame,80,0);target.hp=99999;w.angle=0;w.damage=w.stats.damage;
    if(def.category==='melee')effectGame.meleeStrike(w);
    else if(def.id==='sword'){let strokes=0;w.trail.stroke=()=>strokes++;effectGame.updateWeapon(w,.016);assert.ok(strokes>0,'实际剑阵绘制切割弧');}
    else effectGame.releaseWeapon(0,20,0,w);
    if(def.id!=='sword')assert.ok(effectGame.combatFx.stamps.some(s=>s.age<s.duration&&s.id===def.id),def.id+' 实际攻击连接新特效');
    effectGame.updateEffects(0);
    const frozen=JSON.stringify(effectGame.combatFx.particles.slots);effectGame.phase='shop';advance(effectGame,1);assert.equal(JSON.stringify(effectGame.combatFx.particles.slots),frozen);
    effectGame.clearBattle();assert.equal(effectGame.combatFx.particles.active,0);assert.ok(effectGame.combatFx.stamps.every(s=>s.age>=s.duration));
  }
  console.log('通过：固定左下摇杆真实移动/常驻/技能双指/后台商店隐藏、真实暂停冻结粒子、11武器攻击接入新表现、剑阵切割弧与清场回收');

  assert.equal(passive.PASSIVE_ITEMS.length,60);const itemRun=r.createRun('liubei');itemRun.weapons=load('weapons').WEAPONS.map((w,i)=>({id:w.id,tier:1,uid:i+1}));
  for(const item of passive.PASSIVE_ITEMS){assert.ok(passive.eligiblePassive(item.id,itemRun.weapons));const one=passive.passiveBonuses({[item.id]:1}),many=passive.passiveBonuses({[item.id]:100}),more=passive.passiveBonuses({[item.id]:101});assert.notEqual(JSON.stringify(one),JSON.stringify(passive.passiveBonuses({})),item.id+' first purchase has an effect');assert.notEqual(JSON.stringify(many),JSON.stringify(more),item.id+' unlimited repeats retain a benefit');}
  const repeat=r.createRun('liubei');repeat.gold=100000;repeat.supplyMode='normal';for(let n=0;n<12;n++){repeat.purchasedOffers=[];repeat.offers=['A01'];repeat.offerPrices={A01:28};assert.ok(survival.buySupply(repeat,'A01'));}assert.equal(repeat.inventory.A01,12);assert.ok(r.statsFor(repeat).damage>r.statsFor(r.createRun('liubei')).damage);
  console.log('通过：60种道具首购真实属性、100→101件仍有收益、超过三件可持续购买、武器/道具槽位分离');

  const rangedChecks=[['D09','sandal','damage',1],['D10','smg','interval',-1],['D11','smg','crit',1],['D12','shotgun','critMultiplier',1],['D13','sandal','damage',1],['D14','smg','pierceFactor',1],['D15','sandal','bounceFactor',1],['D16','smg','knockback',1],['D17','rocket','damage',1],['D18','shotgun','range',1],['D19','smg','pierce',1],['D20','sandal','speed',1]];
  for(const [id,weapon,key,sign] of rangedChecks){const run=r.createRun('liubei',weapon),old=r.weaponStatsFor(run,run.weapons[0]);run.inventory[id]=1;const now=r.weaponStatsFor(run,run.weapons[0]);assert.ok((now[key]-old[key])*sign>0,id+' changes actual weapon stats');assert.ok(passive.passivePreview(run.inventory,id).includes('累计'),id+' repeat preview is valid');const melee=r.weaponStatsFor(run,{id:'cleaver',tier:1}),unmodified=r.weaponStatsFor(r.createRun('liubei'),{id:'cleaver',tier:1});assert.deepEqual(melee,unmodified,id+' does not buff melee');}
  const ricochet=r.createRun('liubei');assert.equal(survival.eligibleItem(ricochet,'D15'),false);ricochet.inventory.D04=1;assert.ok(survival.eligibleItem(ricochet,'D15'));
  for(const id of ['D09','D10','D11','D12','D13','D16','D17','D18','D19','D20'])assert.equal(passive.eligiblePassive(id,[{id:'cleaver'}]),false);
  const uiShop=await newGame();uiShop.finishWave();click(uiShop.screens.root,'SupplySkip');uiShop.run.gold=1000;uiShop.openSupply();uiShop.run.offers=['D09','D10','D20'];uiShop.run.offerPrices={D09:20,D10:20,D20:20};uiShop.showShop();const shopTime=uiShop.run.survivalSeconds;
  click(uiShop.screens.root,'SupplyBuy-0');assert.equal(uiShop.phase,'shop');assert.equal(uiShop.run.inventory.D09,1);assert.equal(uiShop.weapons[0].stats.damage,r.weaponStatsFor(uiShop.run,uiShop.run.weapons[0]).damage);
  click(uiShop.screens.root,'SupplyBuy-0');assert.equal(uiShop.run.inventory.D09,1);click(uiShop.screens.root,'SupplyBuy-1');click(uiShop.screens.root,'SupplyBuy-2');assert.equal(uiShop.run.purchasedOffers.length,3);advance(uiShop,3);assert.equal(uiShop.run.survivalSeconds,shopTime);
  click(uiShop.screens.root,'SupplyRefresh');assert.equal(uiShop.run.rerolls,1);assert.equal(uiShop.run.purchasedOffers.length,0);click(uiShop.screens.root,'SupplyRefresh');assert.equal(uiShop.run.rerolls,2);click(uiShop.screens.root,'SupplySkip');assert.equal(uiShop.phase,'battle');assert.equal(uiShop.nextSupply,60);
  uiShop.run.survivalSeconds=60;uiShop.openSupply();assert.equal(uiShop.run.rerolls,0);assert.equal(survival.refreshPrice(uiShop.run),5);
  console.log('通过：12种远程强化实际生效/不强化近战/适配筛选、补给界面多购与多刷保持冻结、装备同步即时生效、继续按钮恢复战斗/下次补给重置刷新费');

  const trade=r.createRun('liubei');trade.supplyMode='normal';trade.gold=0;trade.weapons=load('weapons').WEAPONS.slice(0,6).map((w,i)=>({id:w.id,tier:1,uid:i+1,invested:100}));trade.offers=['w:smg:1'];trade.offerPrices={'w:smg:1':35};
  assert.ok(survival.canBuySupply(trade,'w:smg:1'));let snapshot=JSON.stringify(trade);assert.equal(survival.buySupply(trade,'w:smg:1',999),false);assert.equal(JSON.stringify(trade),snapshot);assert.ok(survival.buySupply(trade,'w:smg:1',1));assert.equal(trade.weapons.length,6);assert.equal(trade.gold,5);assert.ok(trade.weapons.some(w=>w.id==='smg'));assert.equal(survival.buySupply(trade,'w:smg:1',2),false);
  const sold=trade.weapons[1],refund=r.recycleValue(trade,sold.uid),balance=trade.gold;assert.ok(r.recycleWeapon(trade,sold.uid));assert.equal(trade.gold,balance+refund);assert.equal(r.recycleWeapon(trade,sold.uid),false);
  trade.purchasedOffers=[];trade.offers=['u:'+trade.weapons[0].uid+':2','A02','C01'];trade.offerPrices[trade.offers[0]]=40;trade.weapons[0].tier=2;survival.repairSupply(trade);assert.ok(!trade.offers.some(id=>id.startsWith('u:')));assert.equal(new Set(trade.offers).size,3);
  console.log('通过：满六槽净额替换、无效对象/不足不扣款、重复购买/出售幂等、旧升阶报价修复');

  for(const id of ['smg','shotgun','rocket','thunder','gourd']){
    const game=await newGame();game.clearBattle();game.spawnClock=999;game.run.weapons=[{id,tier:1,uid:1}];game.refreshStats();game.syncWeapons();const target=makeTarget(game,100,0);target.hp=1000;target.maxHp=1000;const w=game.weapons[0];w.damage=20;w.angle=0;game.releaseWeapon(0,34,0,w);
    for(let i=0;i<120;i++){game.updateProjectiles(1/120);game.updateSkill(1/120);}assert.ok(target.hp<1000,id+' attacks cause damage');assert.ok(game.projectiles.length<=160);
  }
  const sword=await newGame();sword.clearBattle();sword.run.weapons=[{id:'sword',tier:1,uid:1}];sword.run.inventory.D05=10;sword.refreshStats();sword.syncWeapons();sword.spawnClock=999;
  const swordTarget=makeTarget(sword,150,0);swordTarget.hp=10000;swordTarget.speed=0;swordTarget.attackCooldown=999;const sw=sword.weapons[0];const farSword=makeTarget(sword,500,0);farSword.hp=10000;farSword.speed=0;
  const beforeAngle=sw.orbitBlades[0].angle;for(let i=0;i<180;i++){sword.age+=1/120;swordTarget.vx=swordTarget.vy=0;sword.updateWeapon(sw,1/120);}
  assert.equal(sw.orbitBlades.length,6,'extra swords stop at six per slot');assert.notEqual(sw.orbitBlades[0].angle,beforeAngle);assert.ok(swordTarget.hp<10000,'orbit contact deals damage');assert.equal(farSword.hp,10000,'swords cannot hit distant enemies');assert.equal(sword.projectiles.filter(p=>p.remaining>0).length,0,'sword formation does not launch homing projectiles');
  const afterContact=swordTarget.hp;sword.updateWeapon(sw,1/120);assert.equal(swordTarget.hp,afterContact,'multiple blades share per-target cooldown');
  sword.px=220;sword.py=-90;sword.updateWeapon(sw,0);for(let i=0;i<sw.orbitBlades.length;i++){const p=sw.orbitPrevious[i];assert.ok(Math.abs(Math.hypot(p.x-sword.px,p.y-sword.py-35)-sw.stats.range)<1e-6,'formation follows the moving hero');}
  sword.paused=true;const angleFrozen=sw.orbitBlades[0].angle;advance(sword,2);assert.equal(sw.orbitBlades[0].angle,angleFrozen);sword.paused=false;sword.phase='shop';advance(sword,2);assert.equal(sw.orbitBlades[0].angle,angleFrozen);
  sword.run.weapons=[{id:'smg',tier:1,uid:2}];sword.syncWeapons();assert.equal(sw.orbitBlades.length,0,'selling sword clears orbit nodes');assert.equal(sw.shoe.active,true);
  assert.equal(sword.heroName.string,'刘备');
  console.log('通过：现代/修仙武器实际输出、飞剑常驻环绕/接触伤害/共用命中间隔/六剑上限/随角色移动/暂停冻结/出售清理/无追踪弹体、姓名不显示等级');

  const suppression=await newGame();suppression.clearBattle();suppression.run.weapons=[{id:'smg',tier:1,uid:1}];suppression.refreshStats();suppression.syncWeapons();const runner=makeTarget(suppression,350,0);runner.hp=10000;runner.maxHp=10000;runner.speed=100;runner.attackCooldown=999;
  const runnerStart=runner.x;for(let i=0;i<240;i++){if(i%19===0)suppression.hitEnemy(runner,0,3,12,'smg',false);suppression.updateEnemy(runner,1/120);}assert.ok(runnerStart-runner.x>150,'continuous SMG hits cannot lock infantry in place');
  const armored=makeTarget(suppression,350,0,'cavalry');armored.attack=-1;suppression.hitEnemy(armored,0,1,100,'sandal',false);assert.ok(Math.abs(armored.vx-35)<1e-9,'cavalry resists knockback');const durable=makeTarget(suppression,420,0,'chief');durable.hp=durable.maxHp=r.enemyStats('chief',2,180).hp;suppression.run.weapons=Array.from({length:6},(_,i)=>({id:'smg',tier:2,uid:i+1}));suppression.run.inventory={A01:3,A02:3,D09:3,D10:3,D11:2,F05:2,A05:3};suppression.run.level=7;suppression.skillCharge=999;suppression.run.heroId='guanyu';suppression.run.skillId='G19';suppression.refreshStats();suppression.syncWeapons();suppression.castSkill();for(let i=0;i<180;i++)suppression.updateSkill(1/120);assert.ok(durable.hp<durable.maxHp,'skill actually reaches boss');assert.ok(durable.hp>durable.maxHp*.6,'even six upgraded gun skill cannot erase boss');
  const pressure=await newGame();pressure.clearBattle();pressure.run.wave=2;pressure.nextSupply=999;pressure.run.weapons=[{id:'smg',tier:1,uid:1}];pressure.refreshStats();pressure.syncWeapons();pressure.spawnClock=.1;pressure.queuedKind='soldier';advance(pressure,40);assert.ok(pressure.playerHp<5,'one SMG cannot make stationary hero invulnerable');
  console.log('通过：机关枪连续命中仍可追近、骑兵击退抗性、首领抗单次技能爆发、单机关枪站桩产生生存压力');

  const seamless=await newGame();seamless.clearBattle();seamless.music.begin();seamless.px=310;seamless.py=-110;seamless.hero.setPosition(310,-110);seamless.cameraX=180;seamless.cameraY=-70;seamless.stick={x:.5,y:0};
  const survivor=makeTarget(seamless,-500,-200);survivor.hp=300;const clock=seamless.age;const musicPlays=seamless.musicSource.plays;
  seamless.finishWave();assert.equal(seamless.phase,'shop');assert.equal(seamless.px,310);assert.equal(seamless.py,-110);assert.equal(seamless.cameraX,180);assert.equal(seamless.cameraY,-70);assert.equal(survivor.hp,300);assert.equal(seamless.age,clock);assert.equal(seamless.stick.x,0);assert.equal(seamless.musicSource.plays,musicPlays);assert.equal(seamless.musicSource.playing,true);click(seamless.screens.root,'SupplySkip');assert.equal(seamless.phase,'battle');assert.equal(seamless.px,310);assert.equal(seamless.py,-110);assert.equal(seamless.cameraX,180);assert.equal(seamless.cameraY,-70);assert.equal(survivor.hp,300);assert.equal(seamless.age,clock);assert.equal(seamless.nextSupply,30);
  assert.equal(seamless.weaponHud.children.length,6);assert.ok(seamless.weaponHud.children[0].children.some(n=>n.getComponent(Sprite)?.spriteFrame===seamless.artFrames['icon-sandal']),'initial illustrated weapon is drawn before the first update');
  assert.ok(seamless.weaponHud.children[0].children.some(n=>n.getComponent(Label)?.string==='草鞋'),'initial weapon has a visible label');
  const peach=await newGame();peach.clearBattle();const tree=peach.spawnPeachTree();assert.ok(tree);assert.equal(tree.animal,'tree');assert.ok(tree.animalArt.node.children.some(n=>n.name==='TreeSprite'));const treeAt={x:tree.x,y:tree.y};tree.born=0;peach.updateAnimal(tree,1);assert.equal(tree.x,treeAt.x);assert.equal(tree.y,treeAt.y);
  const oldKills=peach.kills;peach.hitEnemy(tree,0,9999);const fruit=peach.hearts.find(h=>h.active);assert.equal(fruit.kind,'peach');assert.equal(fruit.node.name,'HealingPeach');assert.equal(peach.kills,oldKills);peach.hitEnemy(tree,0,9999);assert.equal(peach.hearts.filter(h=>h.active).length,1);
  peach.playerHp=4;fruit.x=peach.px;fruit.y=peach.py;peach.updateWildlife(.3);assert.equal(peach.playerHp,5);assert.equal(fruit.active,false);
  console.log('通过：15秒先补给后原地衔接/保留镜头与存活敌人/购物音乐续播、首帧初始武器栏、小桃树静止可攻击/单次桃子掉落/拾取回血');
  for(const hero of r.HEROES){
    const lively=await newGame(hero.id);lively.clearBattle();lively.spawnClock=999;lively.treeClock=999;lively.animalClock=999;
    assert.equal(lively.head.spriteFrame,lively.artFrames['hero-'+hero.id+'-open']);
    assert.equal(lively.body.spriteFrame,lively.artFrames['hero-'+hero.id+'-torso']);
    const frames=new Set(),angles=[],ys=[];const px=lively.px,py=lively.py,facing=lively.facing,walk=lively.walkPhase;
    for(let i=0;i<600;i++){lively.update(1/60);frames.add(lively.head.spriteFrame);angles.push(lively.headPivot.angle);ys.push(lively.headPivot.position.y);}
    assert.ok(frames.has(lively.artFrames['hero-'+hero.id+'-open'])&&frames.has(lively.artFrames['hero-'+hero.id+'-closed']),'actual combat uses both eyelid frames');
    assert.ok(Math.max(...angles)-Math.min(...angles)>2,'head moves independently');assert.ok(Math.max(...ys)-Math.min(...ys)>1);
    assert.equal(lively.px,px);assert.equal(lively.py,py);assert.equal(lively.facing,facing);assert.equal(lively.walkPhase,walk,'idle does not fake footsteps');
    assert.ok(Math.abs(lively.headPivot.position.y-lively.body.node.position.y)>15,'head and torso remain independently rigged');
    const time=lively.idleTime;const angle=lively.headPivot.angle;click(lively.ui,'PauseButton');lively.update(1);assert.equal(lively.idleTime,time);assert.equal(lively.headPivot.angle,angle);click(lively.menu,'继续战斗');
    lively.hurtTime=.8;lively.animateWalk(.01,0,0,0,0);assert.equal(lively.head.spriteFrame,lively.headOpen,'hurt should not accidentally blink');
    lively.tintHero('#ff8479');assert.equal(lively.head.color.value,'#ff8479');assert.equal(lively.body.color.value,'#ff8479');
    lively.startWave();assert.equal(lively.head.color.value,'#ffffff');assert.equal(lively.head.spriteFrame,lively.headOpen,'restart resets visual state');
  }
  const icons=await newGame();
  assert.ok(icons.weaponHud.position.y-42-11>-icons.halfHeight+32,'weapon names stay above bottom home indicator');
  assert.ok(icons.hintText.node.position.y>icons.weaponHud.position.y+40,'healing hint stays above icon row');
  for(const def of load('weapons').WEAPONS){
    icons.run.weapons=[{id:def.id,tier:3,uid:1}];icons.syncWeapons();
    const frame=icons.artFrames['icon-'+def.id],icon=icons.weaponHud.children[0].children.find(n=>n.getComponent(Sprite)?.spriteFrame===frame);
    assert.ok(icon,def.id+' HUD uses illustrated sprite');const tr=icon.getComponent(Transform);
    assert.ok(Math.max(tr.width,tr.height)<=50.001);assert.ok(Math.abs(tr.width/tr.height-frame.rect.width/frame.rect.height)<1e-9,'icons preserve aspect ratio');
    const preview=icons.screens.weaponIcon(icons.screens.root,def.id,3,0,0,1).children[0];assert.equal(preview.getComponent(Sprite).spriteFrame,frame,'shop shares same illustration');
    icons.screens.survivalResult(icons.run,1,0,false,()=>{},()=>{});
    const nodes=[];const visit=n=>{nodes.push(n);n.children.forEach(visit);};visit(icons.screens.root);
    assert.ok(nodes.some(n=>n.name==='ResultWeaponArt'&&n.getComponent(Sprite)?.spriteFrame===frame),'result shares same illustration');
  }
  console.log('通过：三英雄真实睁闭眼/独立头部/呼吸/动作不改位置面向或脚步、暂停冻结/受击同步/重开清理、11武器HUD商店结算统一插画及等比适配');
  const musicGame=await newGame();const source=musicGame.musicSource;assert.ok(source.playing);click(musicGame.ui,'PauseButton');assert.equal(source.playing,false);click(musicGame.menu,'继续战斗');assert.ok(source.playing);
  const shopPlays=source.plays;
  musicGame.remaining=.001;musicGame.update(.01);assert.equal(musicGame.phase,'shop');assert.equal(musicGame.run.wave,1);assert.ok(source.playing);
  const phrase=musicGame.music.elapsed,musicShopAge=musicGame.age;advance(musicGame,2);
  assert.ok(Math.abs(musicGame.music.elapsed-phrase-2)<1e-8,'music clock advances while shopping');assert.equal(musicGame.age,musicShopAge,'battle remains frozen');
  musicGame.onBackground();const backgroundPhrase=musicGame.music.elapsed;advance(musicGame,2);assert.equal(source.playing,false);assert.equal(musicGame.music.elapsed,backgroundPhrase);
  musicGame.onForeground();assert.ok(source.playing);assert.equal(source.currentTime,backgroundPhrase,'foreground shop resumes same phrase');
  const resumedPlays=source.plays;click(musicGame.screens.root,'SupplySkip');advance(musicGame,1.3);assert.equal(musicGame.phase,'battle');assert.equal(musicGame.run.wave,2);assert.ok(source.playing);assert.equal(source.plays,resumedPlays,'leaving shop does not restart playback');
  musicGame.openSupply();assert.ok(source.playing);const supplyPhrase=musicGame.music.elapsed;advance(musicGame,1);assert.ok(musicGame.music.elapsed>supplyPhrase);
  musicGame.music.setEnabled(false);advance(musicGame,1);assert.equal(source.playing,false);musicGame.music.setEnabled(true);assert.ok(source.playing);assert.equal(source.currentTime,musicGame.music.elapsed,'unmute joins the shopping phrase');
  click(musicGame.screens.root,'SupplySkip');advance(musicGame,1.3);assert.ok(source.playing);assert.ok(shopPlays>0);
  const frozenTime=musicGame.run.survivalSeconds;musicGame.onBackground();advance(musicGame,60);assert.equal(musicGame.run.survivalSeconds,frozenTime);assert.equal(source.playing,false);
  click(musicGame.menu,'返回选人');assert.equal(musicGame.phase,'menu');assert.equal(musicGame.world.active,false);
  const test=new GameBootstrap();await test.start();finishStartup(test);test.restart(true);assert.equal(test.playerHp,10000);assert.equal(test.testMode,true);advance(test,65);assert.equal(test.phase,'battle');assert.equal(test.run.survivalSeconds,0);
  const testAge=test.age;test.onBackground();advance(test,20);assert.equal(test.age,testAge);test.onDestroy();assert.equal(test.musicSource.playing,false);
  console.log('通过：音乐开始/暂停/补给续播/后台恢复/独立静音、后台不计时、选人页隔离、内部测试10000生命与正式入口隔离');

  const allNodes=root=>{const out=[];const visit=n=>{out.push(n);n.children.forEach(visit);};visit(root);return out;};
  for(const hero of r.HEROES){
    const defeat=await newGame(hero.id);defeat.clearBattle();defeat.spawnClock=999;defeat.run.wave=2;defeat.run.survivalSeconds=42;defeat.kills=64;defeat.bestSurvival=194;defeat.run.gold=23;
    defeat.run.weapons=load('weapons').WEAPONS.slice(0,6).map((w,i)=>({id:w.id,tier:i%4+1,uid:i+1}));defeat.endRun(false);
    const find=name=>allNodes(defeat.screens.root).find(n=>n.name===name);
    const portrait=find('CryingHero');assert.ok(portrait);assert.equal(portrait.getComponent(Sprite).spriteFrame,defeat.artFrames['result-'+hero.id]);assert.notEqual(portrait.getComponent(Sprite).spriteFrame,defeat.artFrames[hero.id]);
    assert.equal(find('ResultTime').getComponent(Label).string,'00:57');assert.equal(find('ResultStat-0').getComponent(Label).string,'64');assert.equal(find('ResultStat-1').getComponent(Label).string,'1/17');assert.equal(find('ResultStat-2').getComponent(Label).string,'23');
    assert.equal(allNodes(defeat.screens.root).filter(n=>n.name.startsWith('ResultWeapon-')).length,6);
    const time=defeat.run.survivalSeconds,age=defeat.age;defeat.update(.1);assert.equal(defeat.run.survivalSeconds,time);assert.equal(defeat.age,age);assert.ok(defeat.screens.resultView.age>0,'只推进哭泣UI，不推进战斗');
    for(const [width,height]of [[1334,750],[1622,750],[1875,750]]){
      defeat.screens.resize(width,height);const scale=defeat.screens.resultView.content.scale.x;
      for(const name of ['ResultRetry','ResultMenu']){const n=find(name),rect=n.getComponent(Transform);assert.ok((Math.abs(n.position.x)+rect.width/2)*scale<width/2-30);assert.ok((n.position.y-43)*scale>-height/2+30,'按钮不贴底部安全区');}
    }
    const oldMenu=find('ResultMenu'),oldRetry=find('ResultRetry');oldRetry.events.end();assert.equal(defeat.phase,'battle');assert.equal(defeat.run.heroId,hero.id);assert.equal(defeat.run.gold,0);assert.equal(defeat.run.weapons.length,1);assert.equal(defeat.playerHp,5);oldMenu.events.end();assert.equal(defeat.phase,'battle','同一结算只提交一次导航');
    defeat.clearBattle();defeat.remaining=7;defeat.endRun(false);assert.equal(find('ResultTime').getComponent(Label).string,'00:08','热身失败显示真实热身时长');assert.equal(find('ResultTimeLabel').getComponent(Label).string,'本局坚持');click(defeat.screens.root,'ResultMenu');assert.equal(defeat.phase,'menu');assert.equal(defeat.screens.selection,hero.id);
  }
  storage.delete('taoyuan-chronicle-clear-best-v4');storage.set('taoyuan-survival-best','1234');
  let bestClear=Infinity;
  for(const [index,hero]of r.HEROES.entries()){
    const clear=await newGame(hero.id);clear.clearBattle();clear.run.chapter=17;clear.run.wave=2;clear.run.wavesCleared=3;clear.run.bossEncounter=true;clear.run.survivalSeconds=[100,105,95,108,110][index];clear.run.elapsed=15+clear.run.survivalSeconds;clear.nextSupply=Infinity;clear.spawnClock=999;
    const boss=makeTarget(clear,180,0,'chief');boss.hp=10;clear.hitEnemy(boss,0,9999);assert.equal(clear.victoryPending,true);clear.hurtPlayer(0,0);assert.equal(clear.playerHp,5,'boss death cannot turn into a later same-frame defeat');clear.update(1/60);
    assert.equal(clear.phase,'victory');const nodes=allNodes(clear.screens.root);assert.equal(nodes.find(n=>n.name==='ResultTitle').getComponent(Label).string,'通关啦！');assert.ok(nodes.some(n=>n.name==='VictoryHero'&&n.getComponent(Sprite)?.spriteFrame===clear.artFrames['hero-select-'+hero.id]));assert.ok(!nodes.some(n=>n.name==='CryingHero'||n.name==='DefeatSeal'));assert.ok(nodes.some(n=>n.name==='VictorySeal'));assert.ok(nodes.some(n=>n.getComponent(Label)?.string==='通关用时'));
    bestClear=Math.min(bestClear,15+[100,105,95,108,110][index]);assert.equal(Number(storage.get('taoyuan-chronicle-clear-best-v4')),bestClear);assert.equal(storage.get('taoyuan-survival-best'),'1234','legacy endless record is isolated');
    const frozen=JSON.stringify([clear.run.survivalSeconds,clear.kills,clear.run.gold]);advance(clear,5);assert.equal(JSON.stringify([clear.run.survivalSeconds,clear.kills,clear.run.gold]),frozen,'victory freezes all combat');clear.endRun(false);assert.equal(clear.phase,'victory');assert.equal(clear.enemies.filter(e=>e.hp>0&&!e.animal).length,0);
    click(clear.screens.root,'ResultRetry');assert.equal(clear.phase,'battle');assert.equal(clear.run.wave,1);assert.equal(clear.run.wavesCleared,0);assert.equal(clear.run.bossEncounter,false);
  }
  console.log('通过：五英雄末章Boss立即通关/开心立绘与胜印/无后续波次/通关冻结/同帧不被反杀/最快通关独立纪录/再来一局重置');
  console.log('通过：五英雄失败哭泣专用帧/独立裁切、存活/最佳/击败/剩余金币与六格武器、三宽屏安全区、UI哭泣不推进战斗、重开与返回防重复、热身实际时长与纪录提示');
})().catch(error=>{console.error(error);process.exit(1);});
