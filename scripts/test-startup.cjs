const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/startup-progress.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out});
const {StartupProgress,STARTUP_TASKS}=out;
const loading=new StartupProgress();assert.equal(loading.value,.22);loading.complete();assert.ok(loading.value<1);
loading.mark('battle');const first=loading.value;loading.mark('battle');assert.equal(loading.value,first,'重复回调不能重复推进');
for(const id of STARTUP_TASKS.filter(id=>id!=='liubei-body'))loading.mark(id);
assert.equal(loading.allSettled,false);loading.complete();assert.ok(loading.value<1,'缺角色资源不允许假100%');
loading.mark('liubei-body');assert.equal(loading.allSettled,true);assert.equal(loading.value,.98);loading.complete();assert.equal(loading.value,1);
const failed=new StartupProgress();for(const id of STARTUP_TASKS)failed.mark(id);failed.fail('error');failed.complete();assert.ok(failed.value<1);
const optional=new StartupProgress();for(const id of STARTUP_TASKS.filter(id=>!['hero-menu','menu:background','menu:atlas','menu:logo'].includes(id)))optional.mark(id);optional.skipMenuArt();optional.complete();assert.equal(optional.value,1,'可选菜单图失败可以进入基础布局');
console.log('通过：真实资源计数、单调/幂等推进、关键资源缺失与错误不假100%、可选图失败降级');

async function testFirstScreen(imageFails,uploadFails=false){
  const frames=new Map(),uniforms=[],deleted=[];let serial=0,contextRequests=[];
  const gl={};
  for(const name of ['VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','ARRAY_BUFFER','STATIC_DRAW','TEXTURE_2D','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','LINEAR','TEXTURE_WRAP_S','TEXTURE_WRAP_T','CLAMP_TO_EDGE','RGBA','UNSIGNED_BYTE','FLOAT','TRIANGLE_STRIP','TEXTURE0','DEPTH_TEST','CULL_FACE','BLEND','UNPACK_FLIP_Y_WEBGL'])gl[name]=name;
  for(const name of ['createShader','createProgram','createBuffer','createTexture'])gl[name]=()=>({id:++serial});
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','deleteShader','bindBuffer','bufferData','bindTexture','texParameteri','texImage2D','pixelStorei','viewport','disable','useProgram','enableVertexAttribArray','disableVertexAttribArray','vertexAttribPointer','activeTexture','uniform1i','uniform2f','drawArrays'])gl[name]=()=>{};
  if(uploadFails)gl.texImage2D=(...args)=>{if(args.length===6)throw Error('fixture upload failure');};
  gl.getShaderParameter=gl.getProgramParameter=()=>true;gl.getAttribLocation=()=>0;gl.getUniformLocation=(_p,name)=>name;
  gl.uniform1f=(name,value)=>uniforms.push([name,value]);
  for(const name of ['deleteTexture','deleteBuffer','deleteProgram'])gl[name]=()=>deleted.push(name);
  const canvas={width:1624,height:750,getContext:name=>{contextRequests.push(name);return gl;}};
  const surface={canvas},scope={module:{exports:{}},window:surface,canvas,GameGlobal:{},console:{warn(){}},Uint8Array,Float32Array,
    requestAnimationFrame:callback=>{const id=++serial;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),
    Image:class{constructor(){this.width=1334;this.height=750;}set src(value){assert.equal(value,'startup-poster.jpg');Promise.resolve().then(()=>imageFails?this.onerror(new Error('fixture')):this.onload());}},
  };
  vm.runInNewContext(fs.readFileSync('build-templates/wechatgame/first-screen.js','utf8'),scope);
  async function pump(promise){let done=false,error;promise.then(()=>done=true,e=>{done=true;error=e;});for(let i=0;i<12&&!done;i++){
    for(const [id,callback]of [...frames]){frames.delete(id);callback();}await Promise.resolve();
  }assert.equal(done,true,'start/setProgress/end应当在画面提交后正常完成');if(error)throw error;}
  const screen=scope.module.exports;await pump(screen.start('default','default','false'));
  assert.deepEqual(contextRequests,['webgl'],'不得切主画布为2D导致引擎黑屏');
  assert.equal(surface.__taoyuanStartup,scope.GameGlobal.__taoyuanStartup);assert.equal(!!surface.__taoyuanStartup.image,!imageFails&&!uploadFails);
  await pump(screen.setProgress(.6));const progress=surface.__taoyuanStartup.progress;await pump(screen.setProgress(.2));assert.equal(surface.__taoyuanStartup.progress,progress);
  await pump(screen.end());assert.equal(surface.__taoyuanStartup.progress,.22,'引擎阶段结束继续衔接22%，不能先100%又归零');
  assert.equal(frames.size,0);assert.equal(deleted.length,3);assert.equal(surface.__taoyuanStartup.ended,true);
  assert.ok(uniforms.some(([name])=>name==='u_progress'));assert.ok(uniforms.every(([,value])=>Number.isFinite(value)));
}
(async()=>{await testFirstScreen(false);await testFirstScreen(true);await testFirstScreen(false,true);console.log('通过：启动海报/进度同一WebGL上下文、跨阶段衔接、图片/纹理上传失败不挂起、绘制后兑现Promise、RAF与GPU资源释放');})().catch(error=>{console.error(error);process.exit(1);});

// A delayed/failed logo must never swap an already-visible title mid-load.
const {load,cc}=require('./test-campaign.cjs'),{LoadingView}=load('LoadingView');
const v=new LoadingView(new cc.Node('LoadingFixture'));assert.equal(v.title.node.active,false);assert.equal(v.logo.node.active,false);
v.setProgress(.52);const barY=v.bar.node.position.y,logoX=v.logo.node.position.x,logoY=v.logo.node.position.y;
const logo=new cc.SpriteFrame();logo.rect={width:720,height:220};v.setLogo(logo);
assert.equal(v.title.node.active,false);assert.equal(v.logo.node.active,true);assert.deepEqual([v.bar.node.position.y,v.logo.node.position.x,v.logo.node.position.y],[barY,logoX,logoY],'Logo到达不移动标题锚点或进度条');
v.showTitleFallback();assert.equal(v.title.node.active,false,'其他菜单素材失败不替换已显示的Logo');assert.equal(v.logo.node.active,true);
const fallback=new LoadingView(new cc.Node('FallbackFixture'));fallback.showTitleFallback();assert.equal(fallback.title.node.active,true);fallback.setLogo(logo);assert.equal(fallback.title.node.active,true);assert.equal(fallback.logo.node.active,false,'晚到图片不能替换已显示的备用标题');
console.log('通过：Logo延迟不先显示替代字体/进度条位置稳定/失败备用标题一次决定/晚到Logo不再切换');
