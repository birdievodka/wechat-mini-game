const { existsSync, copyFileSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const version = require('../package.json').creator.version;
const editor = process.env.COCOS_CREATOR || [
  `/Applications/Cocos/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
  `/Applications/CocosCreator/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
].find(existsSync);
if (!editor || !existsSync(editor)) {
  console.error('请安装 Cocos Creator 3.8.8，并设置 COCOS_CREATOR 为编辑器可执行文件的绝对路径。详见 README。');
  process.exit(1);
}
const result = spawnSync(editor, [
  '--project', root,
  '--build', `configPath=${resolve(root, 'config/build-wechat.json')}`,
], { stdio: 'inherit' });
if (result.error) throw result.error;
// Creator 的命令行构建以 36 表示成功。
if (![0, 36].includes(result.status)) process.exit(result.status || 1);
for (const file of ['game.js', 'game.json', 'project.config.json']) {
  if (!existsSync(resolve(root, 'build/wechatgame', file))) {
    console.error(`构建未生成 ${file}，请检查 Creator 构建日志。`);
    process.exit(1);
  }
}
// Raw local image is available before any resource bundle or engine scene starts.
copyFileSync(resolve(root,'assets/campaign/poster.jpg'),resolve(root,'build/wechatgame/startup-poster.jpg'));
const assert = require('node:assert/strict');
assert.equal(readFileSync(resolve(root,'build/wechatgame/first-screen.js'),'utf8'),readFileSync(resolve(root,'build-templates/wechatgame/first-screen.js'),'utf8'),'自定义启动海报模板未生效');
assert.equal(JSON.parse(readFileSync(resolve(root,'build/wechatgame/src/settings.json'),'utf8')).splashScreen.totalTime,0,'引擎插屏必须关闭，避免海报前后再次显示引擎标识');
require('./check-package-size.cjs');
require('./check-engine-imports.cjs');
console.log('构建完成：请用微信开发者工具导入 build/wechatgame。');
