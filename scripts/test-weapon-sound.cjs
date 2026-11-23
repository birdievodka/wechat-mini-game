const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const ts = require('typescript');
const vm = require('node:vm');
const out = {};
Object.assign(out,require('./test-campaign.cjs').load('weapon-sound'));
const { SOUND_CUES, GENERATED_SOUNDS, weaponSound, SoundGate, SFX_VOICES, soundAsset } = out;
assert.equal(weaponSound('sandal', 'attack'), undefined, 'shoe never adds a whoosh');
assert.equal(weaponSound('sandal', 'hit'), 'sandal-hit-pcm');
assert.equal(new Set(['sandal','pole','peach','cleaver','firecracker'].map(w => weaponSound(w,'hit'))).size,5);
const hashes = new Set();
for (const id of GENERATED_SOUNDS) {
  const asset=soundAsset(id);
  const wav = fs.readFileSync(`assets/${asset.bundle}/${asset.name}.wav`), cue = SOUND_CUES[id];
  assert.equal(wav.toString('ascii',0,4),'RIFF'); assert.equal(wav.readUInt16LE(20),1);
  assert.equal(wav.readUInt16LE(22),1); assert.equal(wav.readUInt32LE(24),24000); assert.equal(wav.readUInt16LE(34),16);
  assert.ok(Math.abs(wav.readUInt32LE(40)/48000-cue.duration)<.001, id+' duration matches voice budget');
  let max=0,power=0;
  for(let i=44;i<wav.length;i+=2) { const v=wav.readInt16LE(i);max=Math.max(max,Math.abs(v));power+=v*v; }
  assert.ok(max>5000 && max<32760); assert.ok(Math.sqrt(power/((wav.length-44)/2))>500);
  assert.equal(wav.readInt16LE(44),0); assert.equal(wav.readInt16LE(wav.length-2),0);
  hashes.add(crypto.createHash('sha256').update(wav).digest('hex'));
}
assert.ok(GENERATED_SOUNDS.length>=80&&hashes.size>=50,'complete categorized effects; intentional theme reuse allowed');
assert.equal(hashes.size,66,'86 logical cues use 66 unique physical PCM samples');
const gate = new SoundGate(2);
assert.equal(gate.acquire('gun-hit'),0); assert.equal(gate.acquire('gun-hit'),undefined,'crowd hits do not stack identical sounds');
assert.equal(gate.acquire('blade-hit'),1,'different weapon can sound in the same frame');
assert.equal(gate.acquire('petal-attack'),undefined,'release cannot steal a live impact');
assert.notEqual(gate.acquire('player-hurt',4),undefined,'player damage can preempt an impact');
gate.update(.2); assert.notEqual(gate.acquire('gun-hit'),undefined); gate.reset(); assert.equal(gate.acquire('gun-hit'),0);
// Six simultaneous automatic weapons share one swing and two impact accents.
const layered = new SoundGate();
const families = ['wood','gun','blade','heavy','bow','blast'];
for (const event of ['attack','hit']) {
  const played = families.filter(f => layered.acquire(f+'-'+event, event==='attack'?0:2, event)!==undefined);
  assert.equal(played.length,event==='attack'?1:2);
}
assert.notEqual(layered.acquire('danger'),undefined);
assert.notEqual(layered.acquire('player-hurt'),undefined);
layered.update(.16);
assert.notEqual(layered.acquire('bow-hit',2,'hit'),undefined);
const crowded = new SoundGate();
for (let i=0;i<100;i++) { const id=GENERATED_SOUNDS[i%GENERATED_SOUNDS.length]; const voice=crowded.acquire(id); assert.ok(voice===undefined || voice>=0 && voice<SFX_VOICES); crowded.update(.003); }
console.log('通过：36武器分类音色、草鞋无风声、全部PCM无静音/削波/端点跳变、同帧混音/同声限频、命中优先与六声道上限');
