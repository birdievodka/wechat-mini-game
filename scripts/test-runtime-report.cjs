// Isolated diagnostic fault paths only: no engine boot, gameplay, clipboard or user storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(name,imports={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(`assets/scripts/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:id=>{if(id in imports)return imports[id];throw Error(id)},setTimeout,clearTimeout,Date,console});return module.exports;}
(async()=>{
 const {RuntimeHealth}=load('runtime-health'),{runtimeReportPages,copyRuntimeReport}=load('runtime-report');
 let saved=JSON.stringify({version:'phone-before',snapshot:{phase:'battle',mode:'endless',seconds:360,weapons:['smg:4']},events:[{type:'memory-warning',count:2,detail:'level=10'}]});
 const storage={getItem:()=>saved,setItem:(_,v)=>saved=v};
 const broken=new RuntimeHealth(undefined,storage,'report-fix',()=>{throw Error('native IA unavailable')},()=>{});
 broken.frame(5);const report=JSON.parse(broken.report());
 assert.equal(report.previous.snapshot.seconds,360,'a failed current census cannot lose the previous battle');
 assert.match(report.snapshot.snapshotError,/native IA/);assert.equal(JSON.parse(saved).previous.version,'phone-before');
 const pages=runtimeReportPages(broken.report());assert.equal(pages[0].title,'上一局摘要');assert.match(pages[0].body,/360s/);assert.ok(pages.some(p=>p.body.includes('native IA')));
 broken.destroy();
 const reopened=new RuntimeHealth(undefined,storage,'menu-only',()=>({phase:'menu',seconds:0}),()=>{});assert.equal(JSON.parse(reopened.report()).previous.version,'phone-before','menu-only reopening preserves battle');reopened.destroy();
 // A process can disappear without destroy/background callbacks. The next menu must show its latest battle.
 let latest='';const journal={getItem:()=>latest,setItem:(_,v)=>latest=v};let seconds=0,phase='menu';
 const live=new RuntimeHealth(undefined,journal,'new-vfx',()=>({phase,mode:'endless',seconds,gfxBuffers:60*1048576,gfxTextures:90*1048576,alive:17,vfxAllocated:57}),()=>{});
 assert.ok(!runtimeReportPages(live.report()).some(p=>p.body.includes('1970')),'an unsaved session is not an epoch date');
 phase='battle';for(let i=0;i<60;i++){seconds+=5;live.frame(5);}phase='menu';seconds=0;live.frame(5);
 const restart=new RuntimeHealth(undefined,journal,'reopened',()=>({phase:'menu',seconds:0}),()=>{}),retained=JSON.parse(restart.report());
 assert.equal(retained.previous.version,'new-vfx');assert.equal(retained.previous.snapshot.phase,'battle');assert.equal(retained.previous.snapshot.seconds,300,'menu snapshots do not replace the last battle snapshot');assert.equal(retained.previous.recent.length,18);assert.equal(retained.previous.previous,undefined);assert.ok(latest.length<64000);
 assert.ok(runtimeReportPages(restart.report()).some(p=>p.title.includes('末段趋势')),'screenshots expose trends without clipboard permission');
 restart.destroy();live.destroy();
 // The simulator freezes progression in training, including while a configuration panel is open.
 let prior=JSON.stringify({version:'old-stage',snapshot:{phase:'battle',mode:'stage',seconds:45}});
 const trainingStore={getItem:()=>prior,setItem:(_,v)=>prior=v};
 let trainingView='config';
 const arena=new RuntimeHealth(undefined,trainingStore,'arena',()=>({phase:'battle',mode:'training',seconds:0,trainingView,trainingCasts:0}),()=>{});
 arena.flush(true);trainingView='field';arena.flush(true);
 for(let i=0;i<2;i++){
  const menu=new RuntimeHealth(undefined,trainingStore,'menu',()=>({phase:'menu',seconds:0}),()=>{});
  const priorBattle=JSON.parse(menu.report()).previous;
  assert.equal(priorBattle.version,'arena');assert.equal(priorBattle.snapshot.trainingView,'field');
  assert.equal(priorBattle.snapshot.seconds,0);menu.frame(5);menu.destroy();
 }
 arena.destroy();
 let fail=true;const failing=new RuntimeHealth(undefined,{getItem:()=>null,setItem(){if(fail)throw Error('quota denied')}},'write-fault',()=>({phase:'battle',seconds:20}),()=>{});
 failing.frame(5);let fault=JSON.parse(failing.report());assert.equal(fault.persistence.failures,1);assert.match(fault.persistence.lastError,/quota denied/);assert.ok(runtimeReportPages(failing.report()).some(p=>p.body.includes('quota denied')));fail=false;failing.frame(5);assert.ok(JSON.parse(failing.report()).persistence.lastSuccessAt>0);failing.destroy();
 let result,calls=0;copyRuntimeReport('report',{setClipboardData(o){assert.equal(o.data,'report');o.fail({errMsg:'setClipboardData:fail denied'});o.success();}},r=>{result=r;calls++;});assert.equal(result.ok,false);assert.match(result.error,/denied/);assert.equal(calls,1);
 copyRuntimeReport('report',{setClipboardData(){throw Error('host unavailable')}},r=>result=r);assert.match(result.error,/host unavailable/);
 copyRuntimeReport('report',undefined,r=>result=r);assert.equal(result.ok,false);assert.match(result.error,/剪贴板/);
 copyRuntimeReport('report',undefined,r=>result=r,()=>Promise.resolve());await Promise.resolve();await Promise.resolve();assert.equal(result.ok,true);
 copyRuntimeReport('report',undefined,r=>result=r,()=>Promise.reject(Error('not allowed')));await Promise.resolve();await Promise.resolve();assert.equal(result.ok,false);assert.match(result.error,/not allowed/);
 const {renderDiagnostics}=load('render-diagnostics',{cc:{Graphics:class{}}});
 const root={isValid:true,activeInHierarchy:true,name:'root',children:[],getComponent(){return {model:{subModels:[{inputAssembler:null}]}}}};
 assert.equal(renderDiagnostics(root).unavailable,1);
 root.getComponent=()=>({model:{subModels:[{get inputAssembler(){throw Error('retired')}}]}});
 assert.equal(renderDiagnostics(root).unavailable,1);
 console.log('通过：诊断采集异常仍导出上局、菜单重开保留、失败原因展示、剪贴板拒绝/缺失/抛错/浏览器回退、残缺原生绘图模型隔离；无游戏长测');
})().catch(e=>{console.error(e);process.exitCode=1});
