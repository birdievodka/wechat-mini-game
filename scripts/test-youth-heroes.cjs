const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),sharp=require('sharp');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 const m=JSON.parse(fs.readFileSync('art/runtime-youth/manifest.json'));
 for(const p of m.sources)assert.equal(hash(p.file),p.sha256,'生成源图可恢复');
 for(const a of Object.values(m.atlases))assert.equal(hash(a.file),a.sha256,'当前英雄图集来源一致');
 for(const a of [m.poster,m.avatar])assert.equal(hash(a.file),a.sha256,'海报/资料头像与当前生成链一致');
 for(const [name,cols]of [['three-hero-parts',3],['hero-parts',2]]){
  const a=m.atlases[name],{data,info}=await sharp(a.file).raw().toBuffer({resolveWithObject:true});
  for(let col=0;col<cols;col++){
   let changed=0,visible=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*info.width+col*256+x)*4,j=i+256*info.width*4;
    if(data[i+3]<128||data[j+3]<128)continue;visible++;
    if(Math.abs(data[i]-data[j])+Math.abs(data[i+1]-data[j+1])+Math.abs(data[i+2]-data[j+2])>90)changed++;
   }
   assert.ok(changed>visible*.005&&changed<visible*.2,'眨眼真实换眼，其他轮廓表情稳定');
  }
 }
 for(const name of ['three-hero-portraits','hero-portraits']){
  const a=m.atlases[name],{data,info}=await sharp(a.file).raw().toBuffer({resolveWithObject:true});
  for(let col=0;col<a.columns;col++){
   let tears=0;for(let y=384;y<768;y++)for(let x=col*384;x<(col+1)*384;x++){
    const i=(y*info.width+x)*4;if(data[i+3]>128&&data[i+2]>data[i]+30&&data[i+1]>data[i]+20)tears++;
   }
   assert.ok(tears>300,'每位失败英雄都有真实蓝色眼泪');
  }
 }
 const decoded=m.atlases['three-hero-parts'].width*m.atlases['three-hero-parts'].height*4+m.atlases['hero-parts'].width*m.atlases['hero-parts'].height*4;
 assert.ok(decoded<4*1024*1024,'五英雄分层合计解码低于4MiB');
 const protectedFiles=JSON.parse(fs.readFileSync('art/runtime-youth/protected.json'));
 for(const [p,sha]of Object.entries(protectedFiles.sha256)){
  if(p==='assets/scripts/chronicles-data.ts'){
   const {execFileSync}=require('node:child_process');const previous=execFileSync('git',['show','a848884:'+p],{encoding:'utf8'});const current=fs.readFileSync(p,'utf8');
   // The later authorized E01 combat sample changes only its tell and description.
   // Compare semantic tables so importing that pure constant is not an art regression.
   const ts=require('typescript'),vm=require('node:vm'),old={};vm.runInNewContext(ts.transpileModule(previous,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:old});
   const now=require('./test-campaign.cjs').load('chronicles-data'),plain=x=>JSON.parse(JSON.stringify(x)),enemies=plain(now.CHRONICLE_ENEMIES),baseline=plain(old.CHRONICLE_ENEMIES);
   const action=require('./test-campaign.cjs').load('enemy-actions'),ranges={E03:105,E06:85,E07:95,E08:110,E26:85,E27:65};for(let i=0;i<40;i++){const id=enemies[i].id;assert.equal(enemies[i].windup,action.readableWindup(id,id==='E08'?.8:i===0?.48:baseline[i].windup));assert.equal(enemies[i].range,ranges[id]??baseline[i].range);assert.equal(enemies[i].cycle,id==='E08'?2.8:baseline[i].cycle);enemies[i].range=baseline[i].range;enemies[i].cycle=baseline[i].cycle;enemies[i].windup=baseline[i].windup;enemies[i].mechanic=baseline[i].mechanic;}
   assert.deepEqual(enemies,baseline,'除授权起手/长近战距离/戟兵周期外，40兵的基础强度保留');
   for(const key of Object.keys(old).filter(k=>!['GENERIC_SKILLS','CHRONICLE_ENEMIES'].includes(k)))assert.deepEqual(plain(now[key]),plain(old[key]),'保留旧首领数据 '+key);
  }else if(p==='assets/scripts/boss-battle.ts'){const base=require('node:child_process').execFileSync('git',['show','a848884:'+p],{encoding:'utf8'});const withoutFrame=x=>x.replace(/export function bossFrame[^\n]+/,'');assert.equal(withoutFrame(fs.readFileSync(p,'utf8')),withoutFrame(base),'首领仅改表现选帧，不改招式伤害/时钟');}else if(/troops-[ab]-(front|back)\.png$/.test(p)){const name=p.split('/').pop();assert.equal(hash('art/runtime-enemy-actions/original-'+name),sha,'原兵种美术基线归档');const a=JSON.parse(fs.readFileSync('art/runtime-enemy-actions/manifest.json')).atlases[name.slice(7,-4)];assert.equal(hash(p),a.sha256,'授权模块化兵种图集');}else assert.equal(hash(p),sha,'保留Boss美术：'+p);
 }
 console.log('通过：五英雄少年素材来源、真实眨眼/哭泣、分层纹理预算，Boss逻辑与原兵图基线保留，40兵模块图/抬手和Boss选帧按后续授权验证');
})().catch(e=>{console.error(e);process.exitCode=1;});
