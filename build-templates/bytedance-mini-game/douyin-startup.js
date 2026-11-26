// This runs before Cocos loads its adapter or starts the scene.
const listeners = new Set();
const launch = GameGlobal.__taoyuanDouyinLaunch = {
  sidebarAt: undefined,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

function update(options) {
  const fromSidebar = options && (
    (options.launch_from === 'homepage' && options.location === 'sidebar_card')
    || options.scene === '021036'
  );
  launch.sidebarAt = fromSidebar ? Date.now() : undefined;
  for (const listener of listeners) listener();
}

try { if (tt.getLaunchOptionsSync) update(tt.getLaunchOptionsSync()); } catch (error) { console.warn('读取小游戏启动场景失败', error); }
try { if (tt.onShow) tt.onShow(update); } catch (error) { console.warn('监听小游戏启动场景失败', error); }
