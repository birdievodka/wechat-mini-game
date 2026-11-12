const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
process.chdir(path.resolve(__dirname, '..'));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const scene = json('assets/scenes/Main.scene');
const sceneMeta = json('assets/scenes/Main.scene.meta');
const scriptMeta = json('assets/scripts/GameBootstrap.ts.meta');
const config = json('config/build-wechat.json');
assert.equal(config.startScene, sceneMeta.uuid);
assert.equal(config.scenes[0].uuid, sceneMeta.uuid);
assert.equal(config.packages.wechatgame.appid, json('project.config.json').appid);
const hex = scriptMeta.uuid.replaceAll('-', '');
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
let compressed = hex.slice(0, 5);
for (let i = 5; i < 32; i += 3) {
  const value = parseInt(hex.slice(i, i + 3), 16);
  compressed += alphabet[value >> 6] + alphabet[value & 63];
}
assert.ok(scene.some(item => item.__type__ === compressed), '场景必须引用入口脚本');
function checkReferences(value) {
  if (!value || typeof value !== 'object') return;
  if ('__id__' in value) assert.ok(scene[value.__id__], '场景引用不存在');
  Object.values(value).forEach(checkReferences);
}
checkReferences(scene);
const result = ts.transpileModule(fs.readFileSync('assets/scripts/GameBootstrap.ts', 'utf8'), {
  fileName: 'GameBootstrap.ts', reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2017, experimentalDecorators: true },
});
const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
for (const error of errors) console.error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
assert.equal(errors.length, 0, 'TypeScript 语法检查失败');
console.log('通过：场景引用、AppID、构建配置和 TypeScript 转译检查（不含引擎类型检查）。');
