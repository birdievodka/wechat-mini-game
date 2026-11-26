const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const TOTAL_LIMIT = 20_000_000;
const MAIN_LIMIT = 4_000_000;
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const label = bytes => `${bytes.toLocaleString('en-US')} B（${(bytes / 1024 ** 2).toFixed(2)} MiB）`;

function checkDouyinPackage(output = path.join(root, 'build', 'bytedance-mini-game')) {
  const game = readJSON(path.join(output, 'game.json'));
  const app = readJSON(path.join(output, 'project.config.json'));
  const settings = readJSON(path.join(output, 'src', 'settings.json'));
  assert.equal(game.deviceOrientation, 'landscape', '抖音产物须为横屏');
  assert.match(app.appid, /^(testappId|tt[0-9a-z]+)$/i, '抖音产物 AppID 无效');
  assert.equal(settings.engine.debug, false, '抖音产物须关闭调试引擎');
  assert.equal(settings.splashScreen.totalTime, 0, '须关闭引擎默认插屏');
  assert.equal(settings.assets.downloadMaxConcurrency, 4, '须限制分包资源下载并发');
  assert.deepEqual(settings.assets.remoteBundles || [], [], '抖音产物不应包含远程 Bundle');
  assert.ok(!settings.assets.server && !fs.existsSync(path.join(output, 'remote')), '抖音产物不应依赖外部 CDN');
  assert.ok(fs.readFileSync(path.join(output, 'game.js'), 'utf8').startsWith("require('./douyin-startup.js');\n"), '须在引擎前同步监听抖音启动场景');
  assert.deepEqual(fs.readFileSync(path.join(output, 'startup-poster.jpg')), fs.readFileSync(path.join(root, 'art/runtime-youth/poster.jpg')), '启动海报缺失或不一致');
  assert.deepEqual(fs.readFileSync(path.join(output, 'douyin-startup.js')), fs.readFileSync(path.join(root, 'build-templates/bytedance-mini-game/douyin-startup.js')), '侧边栏启动脚本缺失或不一致');

  const declared = game.subpackages || game.subPackages || [];
  const assets = path.join(root, 'assets');
  const expected = [assets, path.join(assets, 'remote-content')].flatMap(dir => fs.readdirSync(dir)
    .filter(file => file.endsWith('.meta'))
    .map(file => readJSON(path.join(dir, file)).userData)
    .filter(meta => meta?.isBundle && meta.bundleConfigID === 'battle-subpackage')
    .map(meta => meta.bundleName));
  assert.ok(expected.length > 0, '未发现 Cocos 战斗资源分包设置');
  assert.deepEqual(declared.map(bundle => bundle.name).sort(), expected.sort(), '抖音产物分包与项目配置不一致');
  const subpackages = declared.map(bundle => {
    const prefix = `subpackages/${bundle.name}/`;
    assert.equal(bundle.root.replace(/\/$/, '') + '/', prefix, `分包路径有误：${bundle.name}`);
    assert.ok(fs.existsSync(path.join(output, prefix, 'game.js')), `缺少分包入口：${bundle.name}`);
    assert.ok(fs.readdirSync(path.join(output, prefix)).some(file => /^config(?:\.[^.]+)?\.json$/.test(file)), `缺少分包资源索引：${bundle.name}`);
    return { name: bundle.name, prefix, bytes: 0 };
  });
  let main = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.DS_Store') continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      const relative = path.relative(output, file).split(path.sep).join('/');
      assert.ok(entry.isFile() && !relative.endsWith('.map') && !/^(scripts|tmp|output|\.runtime-bridge|art\/reviews)\//.test(relative), `抖音包夹带工程文件：${relative}`);
      const owner = subpackages.find(bundle => relative.startsWith(bundle.prefix));
      const bytes = fs.statSync(file).size;
      if (owner) owner.bytes += bytes;
      else main += bytes;
    }
  }
  walk(output);
  const total = main + subpackages.reduce((sum, bundle) => sum + bundle.bytes, 0);
  const largest = subpackages.reduce((max, bundle) => bundle.bytes > max.bytes ? bundle : max);
  console.log(`抖音主包 ${label(main)} / 4 MB，${subpackages.length} 个分包，最大 ${largest.name} ${label(largest.bytes)}`);
  console.log(`抖音总包 ${label(total)} / 20 MB，余量 ${label(TOTAL_LIMIT - total)}`);
  assert.ok(main <= MAIN_LIMIT, '抖音主包超过 4 MB');
  assert.ok(total <= TOTAL_LIMIT, '抖音总包超过 20 MB');
  assert.ok(largest.bytes <= TOTAL_LIMIT, '抖音单个分包超过 20 MB');
}

if (require.main === module) checkDouyinPackage();
module.exports = { checkDouyinPackage };
