const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { GameBootstrap, cc, click, finishStartup, Label, load } = require('./test-campaign.cjs');
const { DouyinSidebar } = load('douyin-sidebar');

const startup = fs.readFileSync('build-templates/bytedance-mini-game/douyin-startup.js', 'utf8');
const visit = { scene: '021036', launch_from: 'homepage', location: 'sidebar_card' };
const normal = { scene: '021001' };
const find = (node, name) => node.name === name ? node : node.children.map(child => find(child, name)).find(Boolean);

function mount(initial) {
  const g = {};
  let show, navigation, supported;
  const host = {
    getLaunchOptionsSync: () => initial,
    onShow: callback => { show = callback; },
    checkScene: options => { assert.equal(options.scene, 'sidebar'); supported = options.success; },
    navigateToScene: options => { assert.equal(options.scene, 'sidebar'); navigation = options; },
  };
  vm.runInNewContext(startup, { tt: host, GameGlobal: g, console });
  assert.equal(typeof show, 'function', 'first-screen module registers the host lifecycle synchronously');
  return { g, host, show, capability: isExist => supported({ isExist }), navigation: () => navigation };
}

async function runGame() {
  const mock = mount(normal);
  cc.douyinHost = mock.host;
  cc.gameGlobal = mock.g;
  const game = new GameBootstrap();
  await game.start();
  finishStartup(game);
  const menu = game.screens.root;
  const tap = name => click(menu, name);
  assert.equal(find(menu, '侧边栏有礼').active, false);
  mock.capability(true);
  assert.equal(find(menu, '侧边栏有礼').active, true);
  assert.equal(find(menu, '游戏圈'), undefined);
  tap('侧边栏有礼');
  assert.equal(find(menu, 'SidebarClaim').active, false);
  tap('SidebarNavigate');
  mock.navigation().fail();
  assert.match(find(menu, 'SidebarRewardStatus').getComponent(Label).string, /手动打开/);
  tap('SidebarNavigate');
  mock.navigation().success();
  assert.equal(find(menu, 'SidebarReward'), undefined);
  tap('侧边栏有礼');
  mock.show(visit);
  assert.equal(find(menu, 'SidebarClaim').active, true);
  mock.show(normal);
  assert.equal(find(menu, 'SidebarClaim').active, false, 'new foreground event replaces the previous scene');
  mock.show({ launch_from: 'homepage', location: 'sidebar_card' });
  tap('SidebarClaim');
  assert.match(find(menu, 'SidebarRewardStatus').getComponent(Label).string, /已领取/);
  tap('SidebarClose');
  tap('无尽模式');
  tap('SettingsClose');
  game.onDestroy();

  // A cold sidebar launch and a new game instance preserve the unspent reward.
  const cold = mount(visit);
  cc.douyinHost = cold.host;
  cc.gameGlobal = cold.g;
  const reopened = new GameBootstrap();
  await reopened.start();
  finishStartup(reopened);
  cold.capability(true);
  click(reopened.screens.root, 'StartHero');
  assert.equal(reopened.run.gold, 33);
  reopened.restart(false);
  assert.equal(reopened.run.gold, 28);
  reopened.showMainMenu();
  click(reopened.screens.root, '侧边栏有礼');
  assert.match(find(reopened.screens.root, 'SidebarRewardStatus').getComponent(Label).string, /今日奖励已使用/);
  reopened.onDestroy();

  const unsupported = mount(visit);
  cc.douyinHost = unsupported.host;
  cc.gameGlobal = unsupported.g;
  const fallback = new GameBootstrap();
  await fallback.start();
  finishStartup(fallback);
  unsupported.capability(false);
  assert.equal(find(fallback.screens.root, '侧边栏有礼').active, false);
  click(fallback.screens.root, 'StartHero');
  assert.equal(fallback.run.gold, 28);
  fallback.onDestroy();
}

function rewardBoundaries() {
  let clock = Date.parse('2026-11-26T23:59:59+08:00');
  let saved = null, fail = true;
  const bridge = { sidebarAt: clock, subscribe: () => () => {} };
  const sidebar = new DouyinSidebar({
    checkScene({ success }) { success({ isExist: true }); },
  }, bridge, {
    getItem() { return saved; },
    setItem(_key, value) { if (fail) throw Error('storage'); saved = value; },
  }, () => clock);
  sidebar.check();
  assert.equal(sidebar.status(), 'claim');
  assert.equal(sidebar.claim(), 'storage-error');
  fail = false;
  assert.equal(sidebar.claim(), 'pending');
  fail = true;
  assert.equal(sidebar.takeGold(), 0);
  fail = false;
  clock += 2000;
  assert.equal(sidebar.claim(), 'pending', 'unused rewards persist without stacking across days');
  assert.equal(sidebar.takeGold(), 5);
  assert.equal(sidebar.status(), 'guide', 'yesterday’s launch cannot redeem today');
  bridge.sidebarAt = clock;
  assert.equal(sidebar.claim(), 'pending');
  assert.equal(sidebar.takeGold(), 5);
  assert.equal(sidebar.takeGold(), 0);
  sidebar.destroy();
}

runGame().then(() => {
  rewardBoundaries();
  console.log('通过：抖音侧边栏早期监听、冷热启动、实际营地入口、跳转失败、跨天领奖和一次性开局金币');
}).catch(error => { console.error(error); process.exitCode = 1; });
