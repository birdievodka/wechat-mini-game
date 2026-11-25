const assert=require('node:assert/strict');
const {cc,storage,GameBootstrap,finishStartup,click,load}=require('./test-campaign.cjs');
const {HEALTH_KEY,SUPPLY_TRACE_KEY,RELEASE_MARKER_KEY,ReleaseHealth}=load('runtime-health');

async function checkEnvironment(version){
  storage.clear();
  const errors=[],steps=[],hooks=new Map();
  let managers=0;
  const host={
    getAccountInfoSync:()=>({miniProgram:{envVersion:version}}),
    getRealtimeLogManager(){managers++;return {info:e=>steps.push(e),error:e=>errors.push(e)};}
  };
  for(const name of ['Error','UnhandledRejection','MemoryWarning']){
    host['on'+name]=fn=>hooks.set(name,fn);
    host['off'+name]=fn=>{assert.equal(hooks.get(name),fn);hooks.delete(name);};
  }
  cc.wechatHost=host;
  const game=new GameBootstrap();
  try{
    await game.start();finishStartup(game);
    click(game.screens.root,'StartHero');
    for(let i=0;i<360;i++)game.update(1/60);
    game.remaining=0;assert.equal(game.stageBoundary(),true);
    game.traceSupply('refresh');click(game.screens.root,'SupplySkip');
    const detailed=version==='develop';
    assert.equal(!!game.health,detailed);
    assert.equal(managers,detailed?0:1);
    if(detailed){
      game.health.flush(true);
      assert.ok(JSON.parse(storage.get(HEALTH_KEY)).snapshot.render);
      assert.ok(storage.has(SUPPLY_TRACE_KEY));
      assert.equal(storage.has(RELEASE_MARKER_KEY),false);
      return;
    }

    function advanceWave(){
      game.remaining=0;if(game.run.stageWave===3)game.run.miniDefeated=true;
      assert.equal(game.stageBoundary(),true);click(game.screens.root,'SupplySkip');
    }
    advanceWave();advanceWave();advanceWave();game.endRun(true);
    assert.deepEqual(steps.map(e=>[e.step,e.wave]),[['start',1],['wave',2],['mini-boss',3],['wave',4],['boss',5],['victory',5]]);
    assert.deepEqual(JSON.parse(storage.get(RELEASE_MARKER_KEY)),{...steps[5]});

    game.showMainMenu();
    for(let stage=1;stage<=6;stage++)load('stage-progress').recordClear(game.profile,'liubei',stage,200,100,5);
    game.startEndless('liubei','G01','sandal');game.remaining=0;game.stageBoundary();click(game.screens.root,'SupplySkip');
    assert.deepEqual(steps.slice(-2).map(e=>[e.step,e.mode,e.wave]),[['start','endless',1],['boss','endless',2]]);
    const late=hooks.get('Error');
    for(let i=0;i<20;i++)late({stack:'boom https://example.com/script?token=secret'});
    hooks.get('UnhandledRejection')({reason:{stack:'rejection'}});
    hooks.get('MemoryWarning')({level:10});assert.equal(game.pressureSeconds,15);
    game.onGraphicsContextLost();game.onGraphicsContextRestored();
    assert.deepEqual(errors.map(e=>e.type),['error','unhandled-rejection','memory-warning','webgl-context-lost']);
    assert.ok(errors.every(e=>e.version===game.buildVersion&&e.mode==='endless'&&e.wave===2));
    assert.ok(!JSON.stringify(errors).includes('secret'));
    for(let i=0;i<30;i++)late({message:'distinct '+i});assert.equal(errors.length,8);
    game.endRun(false);assert.equal(steps.at(-1).step,'defeat');
    game.onDestroy();late('late');assert.equal(errors.length,8);
    assert.ok(!storage.has(HEALTH_KEY)&&!storage.has(SUPPLY_TRACE_KEY));assert.equal(hooks.size,0);
  }finally{if(hooks.size)game.onDestroy();cc.wechatHost=undefined;}
}
(async()=>{
  for(const version of ['develop','trial','release',undefined])await checkEnvironment(version);
  let pressure=0,warning;
  const fallback=new ReleaseHealth({getRealtimeLogManager(){throw Error('unsupported')},onMemoryWarning(fn){warning=fn}},
    {setItem(){throw Error('quota')}},'test',()=>({mode:'menu',phase:'menu',stage:0,wave:0}),()=>pressure++);
  fallback.checkpoint('start');warning({level:5});assert.equal(pressure,1);
  fallback.destroy();warning({level:5});assert.equal(pressure,1);
  console.log('通过：开发/体验/正式/未知环境、线上零全量采样及商店追踪、普通/无尽里程碑、异常去重限频与宿主降级');
})().catch(error=>{console.error(error);process.exitCode=1;});
