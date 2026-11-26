const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const platform = 'bytedance-mini-game';
const output = path.join(root, 'build', platform);
const version = require('../package.json').creator.version;
const editor = process.env.COCOS_CREATOR || [
  `/Applications/Cocos/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
  `/Applications/CocosCreator/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
].find(fs.existsSync);
assert.ok(editor && fs.existsSync(editor), `请安装 Cocos Creator ${version}，或设置 COCOS_CREATOR。`);

const appid = process.env.DOUYIN_APPID || 'testappId';
assert.ok(appid === 'testappId' || /^tt[0-9a-z]+$/i.test(appid), 'DOUYIN_APPID 必须是抖音小游戏 AppID');
const config = {
  ...require('../config/build-wechat.json'),
  platform,
  outputName: platform,
  packages: { [platform]: { appid, orientation: 'landscape' } },
};

require('./cocos-build-lock.cjs').acquire(root);
const scratch = fs.mkdtempSync(path.join(root, 'local', 'douyin-build-'));
try {
  const configPath = path.join(scratch, 'build.json');
  fs.writeFileSync(configPath, JSON.stringify(config));
  const result = spawnSync(editor, ['--project', root, '--build', `configPath=${configPath}`], { stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.ok([0, 36].includes(result.status), `Creator 抖音构建失败（${result.status ?? result.signal}）`);
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

const entry = path.join(output, 'game.js');
const rawEntry = fs.readFileSync(entry, 'utf8');
assert.ok(rawEntry.includes('web-adapter') && !rawEntry.includes('douyin-startup.js'), 'Creator 未生成新的抖音入口');
fs.copyFileSync(path.join(root, 'build-templates', platform, 'douyin-startup.js'), path.join(output, 'douyin-startup.js'));
fs.writeFileSync(entry, `require('./douyin-startup.js');\n${rawEntry}`);
fs.copyFileSync(path.join(root, 'art', 'runtime-youth', 'poster.jpg'), path.join(output, 'startup-poster.jpg'));

const settingsPath = path.join(output, 'src', 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
settings.assets.downloadMaxConcurrency = 4;
settings.splashScreen.totalTime = 0;
settings.splashScreen.logo.base64 = '';
fs.writeFileSync(settingsPath, JSON.stringify(settings));
// The optional editor runtime bridge writes local build diagnostics here.
fs.rmSync(path.join(output, '.runtime-bridge'), { recursive: true, force: true });
assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'project.config.json'), 'utf8')).appid, appid, '产物 AppID 与本次构建不一致');

require('./check-douyin-package.cjs').checkDouyinPackage(output);
require('./check-engine-imports.cjs').checkEngineImports(output);
console.log(`抖音构建完成（${appid === 'testappId' ? '本地测试配置' : '正式 AppID 配置'}）：${output}`);
