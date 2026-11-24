// Isolated diagnostic fault paths only: no engine boot, gameplay, clipboard or user storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(name,imports={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(`assets/scripts/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:id=>{if(id in imports)return imports[id];throw Error(id)},setTimeout,clearTimeout,Date,console});return module.exports;}
(async()=>{
 const {RuntimeHealth,SUPPLY_TRACE_KEY}=load('runtime-health'),{runtimeReportPages,copyRuntimeReport}=load('runtime-report',{'./stage-data':{bossDisplayName:id=>id==='dongzhuo'?'董卓':id==='zhangjiao'?'张角':id}});
 let saved=JSON.stringify({version:'phone-before',snapshot:{phase:'battle',mode:'endless',seconds:360,weapons:['smg:4']},events:[{type:'memory-warning',count:2,detail:'level=10'}]});
 const storage={getItem:()=>saved,setItem:(_,v)=>saved=v};
 const broken=new RuntimeHealth(undefined,storage,'report-fix',()=>{throw Error('native IA unavailable')},()=>{});
 broken.frame(5);const report=JSON.parse(broken.report());
 assert.equal(report.previous.snapshot.seconds,360,'a failed current census cannot lose the previous battle');
 assert.match(report.snapshot.snapshotError,/native IA/);assert.equal(JSON.parse(saved).previous.version,'phone-before');
 const pages=runtimeReportPages(broken.report());assert.equal(pages[0].title,'上一局摘要');assert.match(pages[0].body,/360s/);assert.ok(pages.some(p=>p.body.includes('native IA')));
 broken.destroy();
 const reopened=new RuntimeHealth(undefined,storage,'menu-only',()=>({phase:'menu',seconds:0}),()=>{});
 assert.equal(JSON.parse(reopened.report()).previous.version,'phone-before','menu-only reopening preserves battle');
 assert.match(runtimeReportPages(reopened.report('TaoyuanWenkaiR1 / TaoyuanWenkaiM1')).find(page=>page.title==='当前会话').body,/界面字体 TaoyuanWenkaiR1 \/ TaoyuanWenkaiM1/);
 assert.equal(JSON.parse(reopened.report()).snapshot.uiFontFaces,undefined,'font metadata is export-only');
 reopened.destroy();
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
 const disk=new Map();let traceWrites=0,censuses=0;
 const traceStore={getItem:k=>disk.get(k)||null,setItem(k,v){disk.set(k,v);traceWrites+=Number(k===SUPPLY_TRACE_KEY);}};
 const supply=new RuntimeHealth(undefined,traceStore,'supply-version',()=>{censuses++;return {phase:'shop'};},()=>{});
 for(let i=0;i<9;i++)supply.markSupply('refresh','endless',i+1);
 supply.markSupply('shop-drawn','endless',9);supply.markSupply('continue','endless',9);
 assert.equal(censuses,0,'operation trace does not walk the scene or flush the full report');
 assert.equal(traceWrites,11);assert.ok(disk.get(SUPPLY_TRACE_KEY).length<1024);
 const afterExit=new RuntimeHealth(undefined,traceStore,'new-menu',()=>({phase:'menu'}),()=>{});
 const priorSupply=JSON.parse(afterExit.report()).previousSupply;
 assert.equal(priorSupply.version,'supply-version');assert.equal(priorSupply.steps.length,8);
 assert.equal(priorSupply.steps.at(-1).step,'continue');
 assert.ok(runtimeReportPages(afterExit.report()).some(p=>p.title==='上次补给操作'&&p.body.includes('继续战斗')));
 const lastBattle={phase:'battle',seconds:86,bossAreas:2,bossShots:4,bossActions:[{id:'zhangjiao',move:0,phase:'windup'},{id:'dongzhuo',move:2,phase:'recover'}]};
 const bossReport=runtimeReportPages(JSON.stringify({previous:{savedAt:2000,snapshot:lastBattle,recent:[{at:1000,state:{phase:'shop',bossActions:lastBattle.bossActions}}]}}));
 assert.equal(bossReport[1].title,'上一局首领动作');
 assert.match(bossReport[1].body,/86s.*张角 #1 windup \/ 董卓 #3 recover.*区 2 · 弹 4/);
 assert.equal(bossReport[1].body.split('\n').length,1,'shop phase is excluded and the latest battle snapshot survives');
 afterExit.frame(5);afterExit.destroy();assert.equal(traceWrites,11,'menu restart preserves the previous trace');
 supply.destroy();
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
