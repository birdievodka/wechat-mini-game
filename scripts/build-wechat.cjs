const { existsSync, copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const release = process.argv.includes('--release');
const outputName = release ? 'wechat-release' : 'wechatgame';
const output = resolve(root, 'build', outputName);
const configPath = resolve(root, 'config/build-wechat.json');
const buildConfig = JSON.parse(readFileSync(configPath, 'utf8'));
const version = require('../package.json').creator.version;
const editor = process.env.COCOS_CREATOR || [
  `/Applications/Cocos/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
  `/Applications/CocosCreator/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
].find(existsSync);
if (!editor || !existsSync(editor)) {
  console.error('请安装 Cocos Creator 3.8.8，并设置 COCOS_CREATOR 为编辑器可执行文件的绝对路径。详见 README。');
  process.exit(1);
}
require('./cocos-build-lock.cjs').acquire(root);
const releaseConfigDir = release ? mkdtempSync(resolve(tmpdir(), 'taoyuan-wechat-release-')) : undefined;
let result;
try {
  const selectedConfig = release ? resolve(releaseConfigDir, 'build-wechat.json') : configPath;
  if (release) writeFileSync(selectedConfig, JSON.stringify({ ...buildConfig, outputName }));
  result = spawnSync(editor, ['--project', root, '--build', `configPath=${selectedConfig}`], { stdio: 'inherit' });
} finally {
  if (releaseConfigDir) rmSync(releaseConfigDir, { recursive: true, force: true });
}
if (result.error) throw result.error;
// Creator 的命令行构建以 36 表示成功。
if (![0, 36].includes(result.status)) process.exit(result.status || 1);
for (const file of ['game.js', 'game.json', 'project.config.json']) {
  if (!existsSync(resolve(output, file))) {
    console.error(`构建未生成 ${file}，请检查 Creator 构建日志。`);
    process.exit(1);
  }
}
// Raw local image is available before any resource bundle or engine scene starts.
copyFileSync(resolve(root,'art/runtime-youth/poster.jpg'),resolve(output,'startup-poster.jpg'));
copyFileSync(resolve(root,'art/runtime-pixelfx/LICENSE'),resolve(output,'PIXELFX-LICENSE.txt'));
const assert = require('node:assert/strict');
const expectedAppId=JSON.parse(readFileSync(resolve(root,'project.config.json'),'utf8')).appid;
const wechatConfig=buildConfig.packages.wechatgame;
assert.equal(wechatConfig.appid,expectedAppId,'Creator与仓库AppID不一致');
assert.equal(JSON.parse(readFileSync(resolve(output,'project.config.json'),'utf8')).appid,expectedAppId,'微信构建仍绑定旧AppID');
const gameManifestPath=resolve(output,'game.json');
const gameManifest=JSON.parse(readFileSync(gameManifestPath,'utf8'));
assert.equal(gameManifest.iOSHighPerformance===true,wechatConfig.highPerformanceMode===true,'微信产物的 iOS 高性能模式与构建配置不一致');
assert.equal(readFileSync(resolve(output,'first-screen.js'),'utf8'),readFileSync(resolve(root,'build-templates/wechatgame/first-screen.js'),'utf8'),'自定义启动海报模板未生效');
const settingsPath=resolve(output,'src/settings.json');
const settings=JSON.parse(readFileSync(settingsPath,'utf8'));
assert.equal(settings.splashScreen.totalTime,0,'引擎插屏必须关闭，避免海报前后再次显示引擎标识');
settings.assets.downloadMaxConcurrency=4;
if (release) {
  // This bundle is only requested by the development-only training arena.
  gameManifest.subpackages=gameManifest.subpackages.filter(bundle=>bundle.name!=='meadow');
  settings.assets.subpackages=settings.assets.subpackages.filter(name=>name!=='meadow');
  settings.assets.projectBundles=settings.assets.projectBundles.filter(name=>name!=='meadow');
  const entry=resolve(output,'game.js');
  writeFileSync(entry,'GameGlobal.__taoyuanUploadBuild = true;\n'+readFileSync(entry,'utf8'));
  writeFileSync(gameManifestPath,JSON.stringify(gameManifest,null,4)+'\n');
  rmSync(resolve(output,'subpackages/meadow'),{recursive:true,force:true});
}
writeFileSync(settingsPath,JSON.stringify(settings));
require('./patch-wechat-text-measure.cjs').patchWechatTextMeasure(resolve(output,'cocos-js/cc.js'));
require('./check-package-size.cjs');
require('./check-engine-imports.cjs').checkEngineImports(output);
console.log(`构建完成，请用微信开发者工具导入 build/${outputName}。`);
