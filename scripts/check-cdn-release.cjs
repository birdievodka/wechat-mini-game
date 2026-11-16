// Run after publishing, before preview/upload. No network or credentials required.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const release=read('cdn-assets/release.json'),published=read('cdn-assets/published.json'),config=read('config/cdn.json');
assert.equal(release.version,published.version,'当前资源未发布，先执行 npm run cdn:publish');
assert.equal(release.baseUrl,published.baseUrl);assert.equal(release.baseUrl,config.baseUrl+'/'+release.version);
assert.equal(published.verifiedSha256,true);assert.equal(published.files,release.files.length);assert.equal(published.totalBytes,release.totalBytes);
const buildSettings='build/wechatgame/src/settings.json';
if(fs.existsSync(path.join(root,buildSettings)))assert.equal(read(buildSettings).assets.server,release.baseUrl+'/','微信构建与已发布资源不一致');
console.log('通过：当前微信资源版本已发布并逐文件校验 '+release.version+'；对应AppID的downloadFile域名需由微信实际请求核验');
