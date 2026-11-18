// Same raw single-poster delivery as WeChat, for isolated WebGL review builds.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),version=require('../package.json').creator.version;
const editor=process.env.COCOS_CREATOR||`/Applications/Cocos/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`;
require('./cocos-build-lock.cjs').acquire(root);
const result=cp.spawnSync(editor,['--project',root,'--build',`configPath=${path.join(root,'config/build-camp-review.json')}`],{stdio:'inherit'});
if(![0,36].includes(result.status))process.exit(result.status||1);
fs.copyFileSync(path.join(root,'art/runtime-youth/poster.jpg'),path.join(root,'build/camp-review/startup-poster.jpg'));
