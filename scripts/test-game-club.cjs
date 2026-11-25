const assert=require('node:assert/strict');
const {GameBootstrap,cc,click,finishStartup}=require('./test-campaign.cjs');
const account=()=>({miniProgram:{envVersion:'release'}});

(async()=>{
  let opens=0,destroys=0,toasts=0,rejectShow,link;
  cc.wechatHost={getAccountInfoSync:account,showToast(){toasts++;},createPageManager(){
    return {destroy(){destroys++;},show(options){
      opens++;link=options.openlink;return new Promise((_,reject)=>{rejectShow=reject;});
    }};
  }};
  const g=new GameBootstrap();await g.start();finishStartup(g);
  const tap=name=>click(g.screens.root,name);
  tap('游戏圈');tap('游戏圈');assert.equal(opens,1);assert.match(link,/^-SSEyk.*AAXByA$/);
  g.onBackground();g.onForeground();assert.equal(destroys,0,'native navigation can background the game');
  rejectShow(Error('unsupported'));await new Promise(resolve=>setImmediate(resolve));assert.equal(toasts,1);
  tap('游戏圈');assert.equal(opens,2);tap('StartHero');assert.equal(destroys,1);
  rejectShow(Error('late'));await new Promise(resolve=>setImmediate(resolve));assert.equal(toasts,1);g.onDestroy();

  let live=0;
  cc.wechatHost={getAccountInfoSync:account,getWindowInfo:()=>({windowWidth:844,windowHeight:390}),
    createGameClubButton(opts){
      assert.equal(opts.text,'游戏圈');assert.equal(opts.openlink,undefined);
      assert.ok(opts.style.left>=0&&opts.style.width>0&&opts.style.top>=0);
      assert.equal(++live,1);return {destroy(){assert.equal(--live,0);}};
    }};
  const legacy=new GameBootstrap();await legacy.start();finishStartup(legacy);assert.equal(live,1);
  const select=name=>click(legacy.screens.root,name);
  select('HeroSkillSelect');assert.equal(live,0);select('SkillClose');assert.equal(live,1);
  select('设置');assert.equal(live,0);select('SettingsClose');assert.equal(live,1);
  legacy.onBackground();assert.equal(live,0);legacy.onForeground();assert.equal(live,1);
  select('StartHero');assert.equal(live,0);
  legacy.showMainMenu();assert.equal(live,1);legacy.onDestroy();assert.equal(live,0);
  cc.wechatHost=undefined;
  console.log('通过：游戏圈主页标识、打开防重、宿主失败后重试、迟到回调与旧基础库原生入口生命周期');
})().catch(e=>{console.error(e);process.exitCode=1;});
