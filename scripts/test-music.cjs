const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/battle-music.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
}).outputText, { exports: exportsObject });
const { BattleMusic, MUSIC_VOLUME } = exportsObject;
function source() {
  return { plays: 0, pauses: 0, stops: 0, currentTime: 0, volume: 0, loop: false,
    play() { this.plays++; }, pause() { this.pauses++; }, stop() { this.stops++; this.currentTime = 0; } };
}
const music = new BattleMusic(), s = source();
music.attach(s); music.begin(); assert.equal(s.plays, 0, 'no playback before user gesture');
music.unlock(); music.unlock(); assert.equal(s.plays, 1); assert.equal(s.currentTime, 0); assert.equal(s.loop, true);
music.update(.2); assert.ok(s.volume > 0 && s.volume < MUSIC_VOLUME);
music.update(.3); assert.equal(s.volume, MUSIC_VOLUME);
music.pause(); assert.equal(s.pauses, 1); music.update(40); music.resume(); assert.equal(s.currentTime, .5, 'pause freezes the music clock');
music.setEnabled(false); music.update(10); music.setEnabled(true); assert.equal(s.currentTime, 10.5, 'unmute joins the round rather than starting over');
music.pause(); music.setEnabled(false); const plays = s.plays; music.setEnabled(true); assert.equal(s.plays, plays, 'unmute inside pause menu stays silent');
music.resume(); music.update(60); music.pause(); music.resume(); assert.equal(s.currentTime, 10.5, 'unlimited arena wraps at 60 seconds');
music.begin(); assert.equal(s.currentTime, 0, 'new round resets the phrase');
music.stop(); const stopped = s.plays; music.update(100); music.unlock(); music.resume(); assert.equal(s.plays, stopped, 'menu / result never restart stopped music');
const delayed = new BattleMusic(), late = source(); delayed.begin(); delayed.unlock(); delayed.update(8); delayed.attach(late);
assert.equal(late.plays, 1); assert.equal(late.currentTime, 8, 'late download catches up with the battle clock');
delayed.stop(); const menuSource = source(); delayed.attach(menuSource); assert.equal(menuSource.plays, 0, 'late completion after round end remains silent');
// Scene-length changes and important feedback ducking retain pause safety.
const scenes=new BattleMusic(), sceneSource=source();scenes.configure(40,.65);scenes.attach(sceneSource);scenes.unlock();scenes.begin();scenes.update(41);scenes.pause();scenes.resume();assert.equal(sceneSource.currentTime,1);
scenes.update(.5);assert.equal(sceneSource.volume,.65);scenes.duck(.5,.4);scenes.update(.02);assert.ok(sceneSource.volume<.4);scenes.update(.5);assert.equal(sceneSource.volume,.65);
scenes.detach();const oldPlays=sceneSource.plays;scenes.update(1);assert.equal(sceneSource.plays,oldPlays);scenes.configure(30,.72);const boss=source();scenes.attach(boss);assert.equal(boss.loop,true);
for(const id of ['menu','battle','boss']){
 const file=fs.readFileSync('assets/music/'+id+'.m4a');assert.equal(file.toString('ascii',4,8),'ftyp');assert.ok(file.length>100000&&file.length<650000,'compact AAC scene loop');
}
assert.ok(!fs.existsSync('assets/music/taoyuan-kaida.wav'),'old multi-megabyte runtime WAV replaced');
console.log('通过：音乐手势解锁、淡入、暂停冻结、开关、延迟/退出竞态、40/60/30秒场景循环、重要反馈压低与恢复、单源解码与AAC预算');
