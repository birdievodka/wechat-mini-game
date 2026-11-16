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
for(const name of ['battle','campaign','chronicle-ui','chronicle-units','hero-menu','presentation','sfx-core']){
  assert.ok(bundles.some(b=>b.name===name),'缺少必需本地分包 '+name);
  assert.ok(fs.existsSync(path.join(root,'subpackages',name,'game.js')),'缺少本地分包入口 '+name);
}
const cdn=JSON.parse(fs.readFileSync(path.join(__dirname,'../config/cdn.json')));
const release=JSON.parse(fs.readFileSync(path.join(__dirname,'../cdn-assets/release.json')));
const settings=JSON.parse(fs.readFileSync(path.join(root,'src/settings.json')));
assert.equal(settings.assets.server,release.baseUrl+'/','构建必须固定到当前不可变CDN版本');
assert.equal(settings.assets.downloadMaxConcurrency,4,'限制下载并发');
assert.ok(!fs.existsSync(path.join(root,'remote')),'远程资源不能重复装入微信包');
for(const name of cdn.remoteBundles){
  assert.ok(settings.assets.remoteBundles.includes(name),'缺少远程Bundle '+name);
  assert.ok(!bundles.some(b=>b.name===name),'远程Bundle误入本地分包 '+name);
  assert.ok(fs.existsSync(path.join(root,'src/bundle-scripts',name,'index.js')),'代码必须留在本地 '+name);
  assert.ok(release.files.some(f=>f.path.startsWith('remote/'+name+'/config.')),'远程清单缺少Bundle配置 '+name);
  assert.ok(release.files.some(f=>f.path.startsWith('remote/'+name+'/native/')),'远程清单缺少原生资源 '+name);
}
assert.ok(release.files.every(f=>!f.path.endsWith('.js')),'CDN不发布可执行代码');
const total = main + Object.values(sizes).reduce((a, b) => a + b, 0);
console.log(`总包 ${(total / 1024 / 1024).toFixed(2)} MiB`);
// This project's actual DevTools preview rejects source packages above 20 MiB.
// Keep a 0.5 MiB margin for packaging overhead and future small changes.
assert.ok(total < 19.5 * 1024 * 1024, '总资源包超过手机预览安全预算19.5MiB（当前预览上限20MB），禁止继续预览');
