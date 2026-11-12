const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync('assets/scripts/combat-math.ts', 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mathExports = {};
vm.runInNewContext(output, { exports: mathExports });
const { movement, sweptHit, sectorHitsCircle } = mathExports;
assert.ok(sectorHitsCircle(140,0,135,0,90,26),'enemy body touching the blade range is hit');
assert.ok(!sectorHitsCircle(162,0,135,0,90,26));assert.ok(!sectorHitsCircle(-100,0,135,0,90,26));
assert.ok(sectorHitsCircle(120*Math.cos(55*Math.PI/180),120*Math.sin(55*Math.PI/180),135,0,90,26),'body crossing the sector side is hit');
assert.ok(!sectorHitsCircle(161*Math.cos(50*Math.PI/180),161*Math.sin(50*Math.PI/180),135,0,90,26),'outside the rounded sector corner is not hit');
assert.ok(Math.abs(Math.hypot(movement(1, 1).x, movement(1, 1).y) - 1) < 1e-10);
assert.equal(movement(0, 0).x, 0);
assert.equal(movement(0.3, 0.4).y, 0.4);
assert.ok(sweptHit(-80, 0, 80, 0, 0, 0, 15), '跨帧越过敌人仍应命中');
assert.ok(!sweptHit(-80, 0, 80, 0, 0, 40, 15), '距离挥击轨迹太远不能命中');
assert.ok(sweptHit(0, -80, 0, 80, 0, 0, 15), '纵向攻击');
assert.ok(sweptHit(-50, -50, 50, 50, 0, 0, 15), '斜向攻击');
assert.ok(sweptHit(0, 0, 0, 0, 10, 0, 15), '静止线段');
assert.ok(!sweptHit(0, 0, 10, 0, 60, 0, 15), '线段外延不能命中');
console.log('通过：移动归一化、横向/纵向/斜向挥击、跨帧碰撞与范围外判定');

// 回归：屏幕中心必须映射到场地中心，向上/右拖动给出正确摇杆方向。
const main = ts.transpileModule(fs.readFileSync('assets/scripts/GameBootstrap.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2015, experimentalDecorators: true },
}).outputText;
class Vec3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } }
const codes = { KEY_W: 87, KEY_A: 65, KEY_S: 83, KEY_D: 68, ARROW_UP: 38, ARROW_LEFT: 37, ARROW_DOWN: 40, ARROW_RIGHT: 39 };
const cc = { _decorator: { ccclass: () => klass => klass }, Component: class {}, Color: class { constructor(value) { this.value = value; } }, Vec3, KeyCode: codes, UITransform: class {} };
const componentExports = {};
const modules = {};
function loadModule(name) {
  if (modules[name]) return modules[name];
  const exports = modules[name] = {};
  const code = ts.transpileModule(fs.readFileSync('assets/scripts/' + name + '.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  vm.runInNewContext(code, { exports, require: id => id === 'cc' ? cc : id === 'cc/env' ? { DEBUG: false } : loadModule(id.replace('./', '')) }); return exports;
}
const campaignExports = loadModule('campaign');
vm.runInNewContext(main, { exports: componentExports, require: name => name === 'cc' ? cc : name === 'cc/env' ? { DEBUG: false } : loadModule(name.replace('./', '')) });
const demo = new componentExports.GameBootstrap(); demo.phase = 'battle';
demo.root = { getComponent: () => ({ convertToNodeSpaceAR: world => world }) };
// 模拟不同像素比下，正交摄像机将屏幕像素映射到居中世界坐标。
for (const ratio of [1, 2, 3]) {
  demo.camera = { screenToWorld: p => new Vec3(p.x / ratio - 667, p.y / ratio - 375, 0) };
  demo.drawStick = () => {};
  demo.joystick = { clear() {} };
  const touch = (x, y, id = 1) => ({ getLocation: () => ({ x: x * ratio, y: y * ratio }), getID: () => id });
  const j=loadModule('joystick-input');
  const center=j.joystickCenter(667,375),sx=center.x+667,sy=center.y+375;
  const drag=j.JOYSTICK.travel+7;
  demo.origin=center;
  demo.touchStart(touch(sx,sy));
  assert.equal(demo.touchId,1,'左下固定摇杆可激活');
  assert.equal(demo.origin.x,center.x);assert.equal(demo.origin.y,center.y);
  demo.touchMove(touch(sx+drag,sy));assert.equal(demo.stick.x,1);assert.equal(demo.stick.y,0);
  demo.touchMove(touch(sx,sy+drag));assert.equal(demo.stick.y,1);
  demo.touchMove(touch(sx-drag,sy-drag));assert.ok(demo.stick.x<0&&demo.stick.y<0);
  assert.ok(Math.abs(Math.hypot(demo.stick.x,demo.stick.y)-1)<1e-9);
  demo.touchEnd(touch(sx,sy,2));assert.equal(demo.touchId,1,'技能手指松开不能中断摇杆');
  demo.touchEnd(touch(sx,sy));assert.equal(demo.stick.x,0);assert.equal(demo.touchId,null);
  demo.touchStart(touch(667,375));assert.equal(demo.touchId,null,'战场中央不再生成浮动摇杆');
  demo.touchStart(touch(sx+36,sy));assert.equal(demo.origin.x,center.x,'偏心按下也不移动原点');assert.ok(demo.stick.x>0);
  demo.touchStart(touch(sx-30,sy,2));assert.equal(demo.touchId,1);
  demo.touchMove(touch(sx+2,sy+1));assert.equal(demo.stick.x,0,'中心死区不漂移');
  demo.touchMove(touch(sx+500,sy+300));assert.ok(Math.abs(Math.hypot(demo.stick.x,demo.stick.y)-1)<1e-9,'拖出底座仍限速');
  demo.touchEnd(touch(sx,sy));
  for(const [x,y]of [[70,700],[1270,700],[1230,100]]){demo.touchStart(touch(x,y));assert.equal(demo.touchId,null,'HUD及技能区不夺取摇杆');}
  demo.resumeCountdown=1;demo.touchStart(touch(sx+drag,sy));assert.equal(demo.touchId,1,'倒数可提前按住摇杆');assert.equal(demo.stick.x,1);demo.touchEnd(touch(sx,sy));demo.resumeCountdown=0;
}
demo.keyDown({ keyCode: 16 }); assert.equal(demo.keys.size, 0, 'Shift 不应覆盖触摸移动');
demo.keyDown({ keyCode: codes.KEY_W }); assert.equal(demo.keys.size, 1);
demo.clearInput(); assert.equal(demo.keys.size, 0);
console.log('通过：居中触摸转换、1/2/3像素比、四向拖动、多点触摸释放、按钮区域及键盘输入回归');

// Fixed grip anchors remain bounded throughout a melee swing; no thrown cleavers.
cc.Color = class {};
const drawing = () => new Proxy({}, { get: (o, k) => o[k] || (() => {}) });
demo.hero = { children: [1, 2, 3, 4] }; demo.enemies = [];
for (const side of [-1, 1]) for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
  const grip = { setSiblingIndex() {}, x: 0, y: 0, setPosition(x, y) { this.x = x; this.y = y; }, setScale() {} };
  const arm = drawing(); arm.node = { setSiblingIndex() {} };
  const equipped = { id: 'cleaver', tier: 1, uid: 1 }, stats = campaignExports.weaponStatsFor(demo.run, equipped);
  const w = { node: grip, arm, shoe: {}, offhand: {}, trail: drawing(), side, angle, time: 0, duration: .38, equipped, stats, hit: new Set(), lastX: 0, lastY: 0 };
  demo.weapons = [w]; let previous;
  for (let i = 0; i <= 120; i++) {
    w.time = i / 120 * .38; demo.updateWeapon(w, 0);
    assert.ok(Math.hypot(grip.x - side * 35, grip.y + 4) <= 19.3, 'short curved arm extension stays bounded at waist height');
    assert.equal(w.shoe.active, true, 'melee weapon always remains held');
    if (previous) assert.ok(Math.hypot(grip.x - previous.x, grip.y - previous.y) < 6, 'windup and recovery are continuous');
    previous = { x: grip.x, y: grip.y };
  }
}
console.log('通过：近战四向握持/伸手距离、蓄力与收招连续、刀不离手');

const visualNode = () => ({ x: 0, y: 0, angle: 0, setPosition(x, y) { this.x = x; this.y = y; }, setScale() {} });
demo.body = { node: visualNode() };
demo.feet = [visualNode(), visualNode()];
for (let i = 0; i < 20; i++) demo.animateWalk(1 / 120, 235 / 120, 0, 1, 0);
assert.ok(Math.abs(demo.feet[0].y - demo.feet[1].y) > 1, '两脚应交替抬落');
assert.ok(demo.body.node.angle < 0, '右移身体应向右倾');
const stoppedPhase = demo.walkPhase;
for (let i = 0; i < 120; i++) demo.animateWalk(1 / 120, 0, 0, 1, 0);
assert.equal(demo.walkPhase, stoppedPhase, '顶墙无位移时不能原地迈步');
assert.ok(demo.walkBlend < 0.001 && Math.abs(demo.lean) < 0.001, '停步后应平滑回正');
console.log('通过：交替迈步、朝向倾斜、顶墙停步和站姿回正');

// 命中反馈只随有效伤害触发；尸体不会重复计数或重复播放。
const feedbackDemo = new componentExports.GameBootstrap();
let droppedCoins = 0; feedbackDemo.dropCoin = () => droppedCoins++;
feedbackDemo.drawEnemy = () => {}; feedbackDemo.health = () => {};
const played = [];
feedbackDemo.playSound = name => played.push(name);
const enemy = { hp: 18, x: 30, y: 20, text: { string: '' }, node: { angle: 0 } };
feedbackDemo.hitEnemy(enemy, 0);
assert.equal(enemy.hp, 2); assert.equal(played[0], 'sandal-hit-pcm');
assert.equal(feedbackDemo.weaponFreeze, 0.035);
assert.ok(feedbackDemo.combatFx.particles.active>0);
feedbackDemo.hitEnemy(enemy, 0);
assert.equal(enemy.hp, 0); assert.equal(played[1], 'sandal-hit-pcm');
feedbackDemo.hitEnemy(enemy, 0);
assert.equal(droppedCoins, 1, '每只小兵仅死亡时掉落一次');
assert.equal(feedbackDemo.hits, 2); assert.equal(played.length, 2);
assert.equal(feedbackDemo.combatFx.particles.slots.length,280,'粒子池有固定上限');
console.log('通过：草鞋命中/击败啪声、尸体不重复触发和粒子反馈固定上限');

// 小兵击退保留；击败后也继续滑动，复活计时不受形变影响。
assert.equal(enemy.vx, 348);
assert.equal(enemy.vy, 0);
enemy.node = visualNode();
enemy.art = { node: visualNode() };
const hitX = enemy.x;
feedbackDemo.updateEnemy(enemy, 1 / 60);
assert.ok(enemy.x > hitX, '击败后仍应沿受击方向滑动');
assert.ok(enemy.vx > 0 && enemy.vx < 348, '击退速度应逐渐衰减');
assert.ok(enemy.node.active, '击败形变阶段不能立即消失');
console.log('通过：小兵击败后击退、阻尼及可见形变时间');

const playerDemo = new componentExports.GameBootstrap();playerDemo.phase="battle";
playerDemo.menu = {}; playerDemo.body = {}; playerDemo.hero = visualNode(); playerDemo.hurtText = { string: '' };
playerDemo.refreshStats = () => {}; playerDemo.drawPlayerHealth = () => {}; playerDemo.playSound = () => {}; playerDemo.endRun = () => {};
playerDemo.hurtPlayer(-20, 0);
assert.equal(playerDemo.playerHp, 4);
assert.ok(playerDemo.playerVx > 0, '应远离攻击来源击退');
playerDemo.hurtPlayer(-20, 0);
assert.equal(playerDemo.playerHp, 4, '无敌期内多个敌人不能连续扣血');
playerDemo.hurtTime = 0; playerDemo.playerHp = 1;
playerDemo.hurtPlayer(0, 0);
assert.equal(playerDemo.playerHp, 0);
assert.ok(Number.isFinite(playerDemo.playerVx), '完全重叠时击退不能产生NaN');
playerDemo.hurtTime = 0; playerDemo.hurtPlayer(0, 0);
assert.equal(playerDemo.playerHp, 0, '死亡后不继续扣血');
console.log('通过：玩家扣血、无敌期、击退方向、重叠保护及死亡边界');

const attackDemo = new componentExports.GameBootstrap();attackDemo.phase="battle";
for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4]) {
  const fighter = { x: 0, y: 0, weaponKind: 0, attackAngle: angle };
  attackDemo.px = Math.cos(angle) * 60; attackDemo.py = Math.sin(angle) * 60;
  assert.ok(attackDemo.enemyStrikeHits(fighter), '各方向前方范围内应命中');
  attackDemo.px *= -1; attackDemo.py *= -1;
  assert.ok(!attackDemo.enemyStrikeHits(fighter), '背后应能躲开攻击');
  attackDemo.px = Math.cos(angle) * 90; attackDemo.py = Math.sin(angle) * 90;
  assert.ok(!attackDemo.enemyStrikeHits(fighter), '范围外不能命中');
}
attackDemo.soldierFrames = [Array.from({ length: 12 }, (_, i) => i + 1)];
for (const direction of [0, 1, 2, 3]) {
  const fighter = { direction, weaponKind: 0, attack: 0.1, walk: 0, flash: 0, art: {} };
  attackDemo.drawEnemy(fighter);
  const windup = fighter.art.spriteFrame;
  fighter.attack = 0.33; attackDemo.drawEnemy(fighter);
  assert.equal(fighter.art.spriteFrame, windup + 1, '挥击必须切换到出手帧');
}
console.log('通过：小兵四向/斜向攻击扇区、距离边界和蓄力出手帧');

const ranged = new componentExports.GameBootstrap();
const struck = [];
ranged.hitEnemy = e => struck.push(e);
const near = { x: 40, y: 0, hp: 50 }, far = { x: 90, y: 0, hp: 50 };
ranged.enemies = [far, near];
ranged.projectiles = [{ node: visualNode(), x: 0, y: 0, angle: 0, remaining: 280, damage: 6, weaponId: 'sandal', stats: { speed: 480, pierce: 0, area: 0, knockback: 290 }, hit: new Set() }];
ranged.updateProjectiles(0.25);
assert.equal(struck.length, 1); assert.equal(struck[0], near, '飞鞋只能击中最近的首个目标');
assert.equal(ranged.projectiles[0].remaining, 0);
ranged.updateProjectiles(0.25); assert.equal(struck.length, 1, '消失的飞鞋不能重复命中');
ranged.enemies = [{ x: 340, y: 0, hp: 50 }];
ranged.projectiles = [{ node: visualNode(), x: 0, y: 0, angle: 0, remaining: 280, damage: 6, weaponId: 'sandal', stats: { speed: 480, pierce: 0, area: 0, knockback: 290 }, hit: new Set() }];
ranged.updateProjectiles(2);
assert.equal(ranged.projectiles[0].x, 280, '大dt也不能超过射程');
assert.equal(ranged.projectiles[0].node.active, false);
assert.equal(struck.length, 1, '射程外目标不受伤');
console.log('通过：远程飞鞋连续碰撞、首目标命中、射程上限和消失后不重复伤害');

// 回归：旧脚底半径28会漏掉头部；新判定覆盖实际身体，且包含鞋面宽度。
assert.equal(sweptHit(0, 65, 120, 65, 60, 0, 28), false);
const collision = new componentExports.GameBootstrap();
let collisionCount = 0;
collision.hitEnemy = () => collisionCount++;
const fireAcross = (height, enemy) => {
  collision.enemies = [enemy];
  collision.projectiles = [{ node: visualNode(), x: 0, y: height, angle: 0, remaining: 280, damage: 6, weaponId: 'sandal', stats: { speed: 480, pierce: 0, area: 0, knockback: 290 }, hit: new Set() }];
  collision.updateProjectiles(0.25);
};
fireAcross(65, { x: 60, y: 0, hp: 50 }); assert.equal(collisionCount, 1, '穿过头部必须命中');
fireAcross(25, { x: 60, y: 0, hp: 50 }); assert.equal(collisionCount, 2, '穿过躯干必须命中');
fireAcross(95, { x: 60, y: 0, hp: 50 }); assert.equal(collisionCount, 2, '明显从头顶飞过不能误伤');
fireAcross(0, { x: 60, y: 66, previousHitX: 60, previousHitY: -100, hp: 50 });
assert.equal(collisionCount, 3, '敌人跨过弹道也应连续判定');
const { sweepEllipseTime } = mathExports;
assert.equal(sweepEllipseTime(0, 0, 0, 0, 33, 47), 0);
assert.equal(sweepEllipseTime(100, 100, 100, 100, 33, 47), null);
assert.ok(Math.abs(sweepEllipseTime(-100, 0, 100, 0, 33, 47) - 0.335) < 1e-8);
console.log('通过：旧穿头漏判复现、头部/身体命中、头顶掠过、敌人跨弹道及首次接触时刻');

const loot = new componentExports.GameBootstrap();
loot.coinLabel = { string: '', node: visualNode() }; loot.pickupText = { string: '', node: visualNode() };
const coin = { node: visualNode(), art: visualNode(), x: 80, y: 0, age: 0, active: true, attracted: false };
loot.coins = [coin];
loot.updateCoins(0.1); assert.equal(coin.attracted, false, '弹出阶段不立即吸收');
loot.updateCoins(0.2); assert.equal(loot.coinTotal, 1, '进入吸附范围可拾取');
assert.equal(coin.active, false);
loot.updateCoins(1); assert.equal(loot.coinTotal, 1, '已拾取钱币不能重复计数');
loot.coins = [{ ...coin, node: visualNode(), art: visualNode(), x: 200, age: 1, active: true, attracted: false }];
loot.updateCoins(0.1); assert.equal(loot.coinTotal, 1, '范围外钱币留在地面');
console.log('通过：死亡只掉落一次、落地延迟、范围吸附和拾取不重复计数');
