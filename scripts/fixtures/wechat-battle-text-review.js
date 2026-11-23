function () {
  const c = globalThis.__gameContextWindow && globalThis.__gameContextWindow.cc;
  if (!c) throw Error('Cocos runtime unavailable');
  let g;
  function find(n) { if (!n) return; g = g || n.getComponent('GameBootstrap'); if (!g) n.children.forEach(find); }
  find(c.director.getScene());
  if (!g || !g.ready || g.phase !== 'menu' || g.buildVersion !== 'stage-v9.22-battle-text') throw Error('Requires v9.22 idle menu');
  if (g.battleSprites.numberGlyphs.length !== 13) throw Error('Numeric atlas fallback active');
  if (globalThis.__battleTextReviewRestore) throw Error('Existing review must be restored first');
  const before = JSON.stringify(g.profile), run = g.run, pool = g.enemies.length;
  const overlay = g.node2D(g.root, 'BattleTextReview');
  const paper = g.battleSprites.add(overlay, 'ui-solid');
  paper.node.getComponent('cc.UITransform').setContentSize(980,560); paper.color = new c.Color('#fff0d2');
  g.label(overlay, '原 Label', -230, 222, 29, '#48351e');
  g.label(overlay, '共享图集数字', 230, 222, 29, '#48351e');
  ['-16','-128','-9876','-12345678'].forEach((value,i) => {
    const y = 138-i*91;
    const old = g.label(overlay, value, -230, y, 21, '#b64e2a');
    old.cacheMode = c.Label && c.Label.CacheMode ? c.Label.CacheMode.CHAR : 2;
    old.node.setScale(2,2,1);
    // UI-only factory use: never insert into the actor pool, spawn or simulate.
    const e = g.createEnemy(10000+i); e.node.removeFromParent(); overlay.addChild(e.node);
    e.node.active = true; e.node.setPosition(230,y); e.art.node.active = false;
    e.text.node.setPosition(0,0); e.text.node.setScale(2,2,1); e.text.string = value; e.text.flush();
  });
  let timer;
  const restore = () => {
    clearTimeout(timer); delete globalThis.__battleTextReviewRestore;
    overlay.removeFromParent(); overlay.destroy();
    return {menu:g.phase==='menu',profileUnchanged:JSON.stringify(g.profile)===before,runUnchanged:g.run===run,poolUnchanged:g.enemies.length===pool};
  };
  globalThis.__battleTextReviewRestore = restore; timer = setTimeout(restore,25000);
  return {version:g.buildVersion,glyphs:g.battleSprites.numberGlyphs.length,texture:{width:g.battleSprites.texture.width,height:g.battleSprites.texture.height},scope:'UI only; no battle, HP or profile edits; 25s restore watchdog'};
}
