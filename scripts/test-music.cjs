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
const wav = fs.readFileSync('assets/music/taoyuan-kaida.wav');
assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.readUInt16LE(20), 1);
assert.equal(wav.readUInt16LE(22), 1); assert.equal(wav.readUInt32LE(24), 24000); assert.equal(wav.readUInt16LE(34), 16);
assert.equal(wav.readUInt32LE(40) / 48000, 60); assert.ok(wav.length < 3 * 1024 * 1024);
const samples = new Int16Array(wav.buffer, wav.byteOffset + 44, (wav.length - 44) / 2);
let peak = 0, power = 0; for (const v of samples) { peak = Math.max(peak, Math.abs(v)); power += v * v; }
assert.ok(peak < 32760 && peak > 10000, 'not clipped or silent');
assert.ok(Math.sqrt(power / samples.length) > 1000, 'audible average level');
assert.ok(Math.abs(samples[0] - samples[samples.length - 1]) < 4, 'no boundary amplitude jump');
console.log('通过：音乐手势解锁、淡入、暂停冻结、独立开关、60秒循环、换关重置、延迟加载与退出竞态、PCM时长/大小/非静音/无削波/循环接点');
