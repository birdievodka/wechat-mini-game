const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../build/wechatgame');
const config = JSON.parse(fs.readFileSync(path.join(root, 'game.json'), 'utf8'));
const bundles = config.subpackages || config.subPackages || [];
const roots = bundles.map(b => b.root.replace(/\/$/, '') + '/');
let main = 0;
const sizes = Object.fromEntries(roots.map(r => [r, 0]));
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else {
      const relative = path.relative(root, file).split(path.sep).join('/');
      const owner = roots.find(r => relative.startsWith(r));
      const bytes = fs.statSync(file).size;
      if (owner) sizes[owner] += bytes; else main += bytes;
    }
  }
}
walk(root);
console.log(`主包 ${(main / 1024 / 1024).toFixed(2)} MiB`);
for (const [name, bytes] of Object.entries(sizes)) console.log(`分包 ${name}: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
for (const [name, bytes] of Object.entries(sizes)) assert.ok(bytes < 4 * 1024 * 1024, `${name} 超过4MiB`);
assert.ok(main < 4 * 1024 * 1024, '微信主包超过4MiB，禁止继续预览');
assert.ok(bundles.some(b => b.name === 'battle'), '缺少战斗资源分包');
assert.ok(fs.existsSync(path.join(root, 'subpackages/battle/game.js')), '缺少分包入口');
assert.ok(bundles.some(b => b.name === 'campaign'), '缺少角色与菜单资源分包');
assert.ok(fs.existsSync(path.join(root, 'subpackages/campaign/game.js')), '缺少角色分包入口');
assert.ok(bundles.some(b => b.name === 'enemies'), '缺少敌兵动画资源分包');
assert.ok(fs.existsSync(path.join(root, 'subpackages/enemies/game.js')), '缺少敌兵分包入口');
assert.ok(bundles.some(b => b.name === 'music'), '缺少独立音乐资源分包');
assert.ok(fs.existsSync(path.join(root, 'subpackages/music/game.js')), '缺少音乐分包入口');
assert.ok(bundles.some(b => b.name === 'sfx'), '缺少独立武器音效分包');
assert.ok(fs.existsSync(path.join(root, 'subpackages/sfx/game.js')), '缺少武器音效分包入口');
assert.ok(bundles.some(b=>b.name==='results'),'缺少结算表情分包');
assert.ok(fs.existsSync(path.join(root,'subpackages/results/game.js')),'缺少结算表情分包入口');
assert.ok(bundles.some(b=>b.name==='presentation'),'缺少武器图标与角色分层分包');
assert.ok(fs.existsSync(path.join(root,'subpackages/presentation/game.js')),'缺少表现分包入口');
for(const name of ['chronicle-ui','chronicle-units']){
  assert.ok(bundles.some(b=>b.name===name),'缺少v4共享图集分包 '+name);
  assert.ok(fs.existsSync(path.join(root,'subpackages',name,'game.js')),'缺少v4分包入口 '+name);
}
const total = main + Object.values(sizes).reduce((a, b) => a + b, 0);
console.log(`总包 ${(total / 1024 / 1024).toFixed(2)} MiB`);
// This project's actual DevTools preview rejects source packages above 20 MiB.
// Keep a 1 MiB margin for packaging overhead and future small changes.
assert.ok(total < 19 * 1024 * 1024, '总资源包超过手机预览安全预算19MiB（当前预览上限20MB），禁止继续预览');
