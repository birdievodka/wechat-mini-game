const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const project = path.resolve(__dirname, '..');
const release = process.argv.includes('--release');
const root = path.join(project, 'build', release ? 'wechat-release' : 'wechatgame');
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
      assert.ok(!relative.endsWith('.map') && !/^(scripts|tmp|output|art\/reviews)\//.test(relative), '微信包夹带工程测试文件 '+relative);
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
const migrated = ['arsenal','talismans','meadow','orchard','sfx','enemies','results','hidden-heroes','pets',
  'boss-zhangjiao','boss-props','boss-lvbu','boss-dongzhuo','boss-yuanshao','boss-caocao','boss-menghuo','boss-simayi']
  .filter(name => !release || name !== 'meadow');
for(const name of ['battle','campaign','chronicle-ui','chronicle-units','hero-menu','presentation','sfx-core','music',...migrated]){
  assert.ok(bundles.some(b=>b.name===name),'缺少必需本地分包 '+name);
  assert.ok(fs.existsSync(path.join(root,'subpackages',name,'game.js')),'缺少本地分包入口 '+name);
}
// Validate every audition and scene track against the native file shipped to WeChat.
const musicSource=path.resolve(__dirname,'../assets/music');
const packagedMusic=fs.readdirSync(path.join(root,'subpackages/music/native'),{recursive:true})
  .filter(f=>f.endsWith('.m4a'));
const tracks=['brass-oath.m4a','brass-rally.m4a'];
assert.deepEqual(fs.readdirSync(musicSource).filter(f=>f.endsWith('.m4a')).sort(),tracks);
assert.equal(packagedMusic.length,tracks.length,'音乐分包仅应包含两首铜管主题');
for(const src of tracks){
  const uuid=JSON.parse(fs.readFileSync(path.join(musicSource,src+'.meta'))).uuid;
  const dest=packagedMusic.find(f=>path.basename(f).startsWith(uuid+'.'));
  assert.ok(dest&&fs.readFileSync(path.join(root,'subpackages/music/native',dest)).equals(fs.readFileSync(path.join(musicSource,src))),'音乐分包缺失或内容不一致 '+src);
}
const settings=JSON.parse(fs.readFileSync(path.join(root,'src/settings.json')));
assert.equal(bundles.some(b=>b.name==='meadow'),!release,'演武分包声明与构建类型不符');
assert.equal(settings.assets.subpackages.includes('meadow'),!release,'演武分包引擎配置与构建类型不符');
assert.equal(settings.assets.projectBundles.includes('meadow'),!release,'演武分包项目配置与构建类型不符');
assert.equal(fs.existsSync(path.join(root,'subpackages/meadow')),!release,'演武分包文件与构建类型不符');
assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8').startsWith('GameGlobal.__taoyuanUploadBuild = true;'),release,'线上包入口标记与构建类型不符');
assert.equal(settings.engine.debug,false,'微信发布包必须使用非调试引擎设置');
assert.notEqual(config.debug,true,'微信游戏配置不得开启调试');
assert.equal(settings.assets.downloadMaxConcurrency,4,'限制下载并发');
assert.deepEqual(settings.assets.remoteBundles||[],[],'微信运行包不可依赖远程 Bundle');
assert.ok(!settings.assets.server,'微信运行包不可配置资源 CDN');
assert.ok(!fs.existsSync(path.join(root,'remote')),'构建不应导出远程资源');
const sha=file=>require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const {physicalSounds}=require('../art/audio/runtime-manifest.json');
for(const cue of physicalSounds){
  const source=path.join(project,'assets',cue.bundle,cue.name+'.wav');
  const {uuid}=JSON.parse(fs.readFileSync(source+'.meta'));
  const native=path.join(root,'subpackages',cue.bundle,'native',uuid.slice(0,2));
  const file=fs.readdirSync(native).find(asset=>asset.startsWith(uuid+'.')&&asset.endsWith('.wav'));
  assert.ok(file&&sha(path.join(native,file))===cue.sha256,'微信分包缺少新版音效或字节不一致 '+cue.name);
}
const {files:encoded}=require('../art/runtime-subpackages/manifest.json');
for(const file of encoded){
  assert.equal(sha(path.join(project,file.source)),file.sourceSha256,'压缩源图变更，重新生成 '+file.source);
  assert.equal(sha(path.join(project,file.dest)),file.sha256,'运行图与压缩清单不一致 '+file.dest);
}
for(const name of migrated){
  const direct=path.join(project,'assets',name);
  const source=fs.existsSync(direct)?direct:path.join(project,'assets/remote-content',name);
  const packaged=path.join(root,'subpackages',name);
  assert.ok(fs.readdirSync(packaged).some(file=>/^config(?:\.[^.]+)?\.json$/.test(file)), '微信分包缺少配置 '+name);
  const imagesAndAudio=fs.readdirSync(source,{recursive:true}).filter(file=>/\.(png|jpg|wav)$/.test(file));
  assert.ok(imagesAndAudio.length,'微信分包缺少来源文件 '+name);
  for(const file of imagesAndAudio){
    const input=path.join(source,file),ext=path.extname(file);
    const {uuid}=JSON.parse(fs.readFileSync(input+'.meta'));
    const native=path.join(packaged,'native',uuid.slice(0,2));
    const match=fs.readdirSync(native).find(asset=>asset.startsWith(uuid+'.')&&asset.endsWith(ext));
    assert.ok(match&&sha(path.join(native,match))===sha(input),'微信分包缺少资源或字节变更 '+name+'/'+file);
  }
}
const total = main + Object.values(sizes).reduce((a, b) => a + b, 0);
console.log(`总包 ${(total / 1024 / 1024).toFixed(2)} MiB`);
// This project's actual DevTools preview rejects source packages above 20 MiB.
// Keep a 0.5 MiB margin for packaging overhead and future small changes.
assert.ok(total < 19.5 * 1024 * 1024, '总资源包超过手机预览安全预算19.5MiB（当前预览上限20MB），禁止继续预览');
