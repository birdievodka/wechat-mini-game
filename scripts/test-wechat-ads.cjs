const assert = require('node:assert/strict');
const { GameBootstrap, cc, click, finishStartup, Label, load } = require('./test-campaign.cjs');
const { WECHAT_AD_UNITS, WeChatAds } = load('wechat-ads');
const { unlocked, readProfile, isKnown } = load('stage-progress');
const { heroMaxHearts } = load('campaign');
const { canBuySupply } = load('survival');

const find = (node, name) => node.name === name ? node : node.children.map(child => find(child, name)).find(Boolean);
const labelOf = node => node.getComponentsInChildren(Label)[0].string;
const tick = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

function mockHost() {
  const ads = [];
  function create(type, options) {
    let listener, errorListener;
    const ad = {
      type, options,
      load: async () => {
        if (ad.noFill) throw new Error('1004');
        if (ad.stalled) return new Promise(() => {});
      },
      show: async () => {
        ad.beforeShow?.();
        if (ad.rejectShow) throw new Error('2002');
        if (ad.stallShow) return new Promise(() => {});
        ad.showing = true;
        if (ad.closeInShow) ad.close();
      },
      onClose: callback => { listener = callback; },
      offClose: callback => { assert.equal(listener, callback); listener = undefined; },
      onError: callback => { errorListener = callback; },
      offError: callback => { assert.equal(errorListener, callback); errorListener = undefined; },
      destroy: () => { ad.destroyed = true; },
      close: result => listener?.(result),
      fail: () => errorListener?.(),
      get listener() { return listener; },
    };
    ads.push(ad);
    return ad;
  }
  return { ads, createRewardedVideoAd: options => create('video', options), createInterstitialAd: options => create('interstitial', options) };
}

async function playbackContract() {
  const host = mockHost(), displayChanges = [];
  const playback = new WeChatAds(() => host, displaying => displayChanges.push(displaying));
  const interrupted = playback.play('skill', () => true);
  const video = host.ads.at(-1);
  assert.equal(video.options.adUnitId, WECHAT_AD_UNITS.skill);
  assert.equal(video.options.multiton, true);
  assert.equal(video.options.disableFallbackSharePage, true);
  assert.equal(await playback.play('revive', () => true), 'unavailable', 'one ad at a time');
  video.beforeShow = () => assert.deepEqual(displayChanges, [true]);
  await tick();video.close({isEnded:false});
  assert.equal(await interrupted, 'skipped');assert.ok(video.destroyed);assert.equal(video.listener, undefined);
  assert.deepEqual(displayChanges.splice(0), [true,false]);

  const rejected = playback.play('freeSupply', () => true);
  host.ads.at(-1).rejectShow = true;
  assert.equal(await rejected, 'unavailable', 'frequency limit never grants free stock');
  assert.deepEqual(displayChanges.splice(0), [true,false]);
  const unavailable = playback.play('freeSupply', () => true);
  host.ads.at(-1).noFill = true;
  assert.equal(await unavailable, 'unavailable');
  assert.deepEqual(displayChanges, [], 'load failure leaves music alone');

  const shown = playback.play('freeSupply', () => true);
  host.ads.at(-1).closeInShow = true;
  assert.equal(await shown, 'complete', 'a close before the show promise resolves is still paired to a successful display');
  assert.deepEqual(displayChanges.splice(0), [true,false]);
  const nativeError = playback.play('freeSupply', () => true);
  await tick();host.ads.at(-1).fail();
  assert.equal(await nativeError, 'unavailable');
  assert.deepEqual(displayChanges.splice(0), [true,false]);
  let current = true;
  const stale = playback.play('revive', () => current);
  const staleAd = host.ads.at(-1);
  await tick();current = false;staleAd.close({isEnded:true});
  assert.equal(await stale, 'unavailable', 'late completion cannot reward a different screen');
  assert.deepEqual(displayChanges.splice(0), [true,false]);
  let expire;
  cc.testTimers={
    setTimeout:(callback,ms)=>{assert.equal(ms,18_000);expire=callback;return 1;},
    clearTimeout:()=>{expire=undefined;},
  };
  try{
    for (const stall of ['stalled','stallShow']) {
      const pendingAd=playback.play('freeSupply',()=>true);
      const ad=host.ads.at(-1);ad[stall]=true;
      await tick();expire();
      assert.equal(await pendingAd,'unavailable');assert.ok(ad.destroyed);
      assert.deepEqual(displayChanges.splice(0), stall==='stallShow'?[true,false]:[]);
    }
  }finally{delete cc.testTimers;}
  const pending = playback.play('revive', () => true);
  await tick();
  playback.destroy();
  assert.equal(await pending, 'unavailable');assert.equal(playback.supports('skill'), false);
  assert.deepEqual(displayChanges, [true,false]);
}

async function gameContract() {
  const host = cc.wechatHost = mockHost();
  const game = new GameBootstrap();await game.start();finishStartup(game);
  const root = game.screens.root;
  const tap = name => click(root, name);
  const settle = async () => { await tick();game.update(0);await tick(); };
  const musicSource = {
    loop: false, volume: 0, currentTime: 0, playing: false,
    play() { this.playing = true; }, pause() { this.playing = false; }, stop() { this.playing = false; },
  };
  const closeVideo = async (adUnitId, isEnded) => {
    await tick();const ad = host.ads.at(-1);
    assert.equal(ad.options.adUnitId, adUnitId);assert.equal(ad.type, 'video');assert.ok(ad.showing);
    ad.close({isEnded});await settle();
  };

  tap('HeroSkillSelect');tap('SkillChoice-G19');
  game.music.attach(musicSource);game.music.unlock();game.music.update(.45);
  assert.ok(musicSource.playing);
  tap('UnlockSkillAd');await closeVideo(WECHAT_AD_UNITS.skill,false);
  assert.ok(musicSource.playing, 'skipping the skill ad resumes menu music');
  assert.equal(unlocked(game.profile,'skills').includes('G19'),false);
  tap('UnlockSkillAd');await closeVideo(WECHAT_AD_UNITS.skill,true);
  assert.equal(labelOf(find(root,'ConfirmSkill')),'携带此技能');
  assert.ok(isKnown(game.profile,'skills','G19'));
  const saved=readProfile(cc.sys.localStorage);
  assert.ok(unlocked(saved,'skills').includes('G19'));assert.ok(isKnown(saved,'skills','G19'));
  assert.equal(Object.keys(saved.heroes).some(hero=>Object.keys(saved.heroes[hero]).length),false);
  tap('ConfirmSkill');tap('StartHero');await settle();
  assert.equal(game.phase,'battle');assert.equal(game.run.skillId,'G19');

  const finishWave = () => { game.remaining = 0;assert.equal(game.stageBoundary(),true); };
  finishWave();
  game.run.gold=0;game.showShop();
  const prices = JSON.stringify(game.run.offerPrices);
  const stock = game.run.offers.slice();
  const index = stock.findIndex(id=>canBuySupply(game.run,id,true));
  assert.ok(index>=0);assert.equal(canBuySupply(game.run,stock[index]),false);
  assert.equal(labelOf(find(root,'SupplyFreeAd')),'看广告0元购');
  game.music.attach(musicSource);game.music.update(.45);
  assert.ok(musicSource.playing);
  tap('SupplyFreeAd');await tick();
  const interstitial=host.ads.at(-1);
  assert.equal(interstitial.type,'interstitial');assert.equal(interstitial.options.adUnitId,WECHAT_AD_UNITS.freeSupply);
  assert.equal(canBuySupply(game.run,stock[index]),false);
  assert.equal(musicSource.playing,false);assert.equal(musicSource.volume,0);
  game.onBackground();game.onForeground();
  assert.equal(musicSource.playing,false,'foreground during the ad cannot resume music');
  game.onBackground();
  interstitial.close();await settle();
  assert.equal(musicSource.playing,false,'closing the ad in the background cannot resume music');
  game.onForeground();assert.ok(musicSource.playing);
  assert.equal(game.supplyAd.status,'available');
  for(let i=0;i<stock.length;i++)if(canBuySupply(game.run,stock[i],true))assert.match(labelOf(find(root,'SupplyBuy-'+i)),/^0 /);
  tap('SupplyBuy-'+index);
  assert.equal(game.run.gold,0);assert.equal(game.supplyAd.status,'used');
  assert.equal(JSON.stringify(game.run.offerPrices),prices,'free purchase never mutates original pricing');
  const priorShows=host.ads.length;tap('SupplyFreeAd');assert.equal(host.ads.length,priorShows);
  assert.equal(game.run.purchasedOffers.length,1);

  tap('SupplySkip');assert.equal(game.run.stageWave,2);finishWave();
  assert.equal(game.supplyAd.status,'ready','the next shop gets its own allowance');
  tap('SupplySkip');assert.equal(game.run.stageWave,3);
  const chargers=()=>game.enemies.filter(enemy=>enemy.hp>0&&enemy.miniCharge);
  assert.equal(chargers().length,3);
  const initialGold=game.run.gold,initialKills=game.kills;
  game.run.gold+=100;game.kills+=9;game.run.waveTime=18;
  chargers()[0].hp=1;
  game.playerHp=0;game.endRun(false);await settle();
  assert.equal(game.phase,'defeat');
  assert.match(find(root,'ResultReviveStatus').getComponent(Label).string,/第 3 波/);
  tap('ResultRevive');await closeVideo(WECHAT_AD_UNITS.revive,false);assert.equal(game.phase,'defeat');
  tap('ResultRevive');await closeVideo(WECHAT_AD_UNITS.revive,true);
  assert.equal(game.phase,'battle');assert.equal(game.run.stageWave,3);assert.equal(game.run.waveTime,0);
  assert.equal(game.playerHp,heroMaxHearts(game.run));assert.equal(game.run.gold,initialGold);assert.equal(game.kills,initialKills);
  assert.equal(chargers().length,3);assert.ok(chargers().every(enemy=>enemy.hp===enemy.maxHp));
  assert.equal(game.enemies.filter(enemy=>enemy.hp>0).length,3,'previous small enemies are cleared');

  game.run.miniDefeated=true;assert.equal(game.stageBoundary(),true);
  tap('SupplySkip');await settle();assert.equal(game.run.stageWave,4);finishWave();
  tap('SupplySkip');await settle();assert.equal(game.run.stageWave,5);
  const bosses=()=>game.enemies.filter(enemy=>enemy.hp>0&&enemy.kind==='chief'&&!enemy.miniBoss);
  assert.equal(bosses().length,1);bosses()[0].hp=1;
  game.playerHp=0;game.endRun(false);await settle();tap('ResultRevive');await closeVideo(WECHAT_AD_UNITS.revive,true);
  assert.equal(game.run.stageWave,5);assert.equal(bosses().length,1);assert.equal(bosses()[0].hp,bosses()[0].maxHp);
  assert.equal(game.remaining,Infinity);
  game.playerHp=0;game.endRun(false);await settle();tap('ResultRetry');
  assert.equal(game.run.stageWave,1,'ordinary retry still starts at wave one');
  game.onDestroy();delete cc.wechatHost;
}

(async () => {
  await playbackContract();
  await gameContract();
  console.log('通过：微信三广告位、展示期间暂停音乐与前后台恢复、同屏有效回调、技能持久化、按波限购与第三和第五波复活');
})().catch(error => {console.error(error);process.exitCode=1;});
