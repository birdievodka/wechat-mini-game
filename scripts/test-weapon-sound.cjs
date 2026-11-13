const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const ts = require('typescript');
const vm = require('node:vm');
const out = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/weapon-sound.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
}).outputText, { exports: out,require:()=>require('./test-campaign.cjs').load('weapons') });
const { SOUND_CUES, GENERATED_SOUNDS, weaponSound, SoundGate, SFX_VOICES } = out;
assert.equal(weaponSound('sandal', 'attack'), undefined, 'shoe never adds a whoosh');
assert.equal(weaponSound('sandal', 'hit'), 'sandal-hit-pcm');
assert.equal(new Set(['sandal','pole','peach','cleaver','firecracker'].map(w => weaponSound(w,'hit'))).size,5);
const hashes = new Set();
for (const id of GENERATED_SOUNDS) {
  const wav = fs.readFileSync(`assets/sfx/${id}.wav`), cue = SOUND_CUES[id];
  assert.equal(wav.toString('ascii',0,4),'RIFF'); assert.equal(wav.readUInt16LE(20),1);
  assert.equal(wav.readUInt16LE(22),1); assert.equal(wav.readUInt32LE(24),24000); assert.equal(wav.readUInt16LE(34),16);
  assert.ok(Math.abs(wav.readUInt32LE(40)/48000-cue.duration)<.001, id+' duration matches voice budget');
  let max=0,power=0;
  for(let i=44;i<wav.length;i+=2) { const v=wav.readInt16LE(i);max=Math.max(max,Math.abs(v));power+=v*v; }
  assert.ok(max>5000 && max<32760); assert.ok(Math.sqrt(power/((wav.length-44)/2))>500);
  assert.equal(wav.readInt16LE(44),0); assert.equal(wav.readInt16LE(wav.length-2),0);
  hashes.add(crypto.createHash('sha256').update(wav).digest('hex'));
}
assert.equal(hashes.size,10,'ten independently rendered release / impact sounds');
const gate = new SoundGate(2);
assert.equal(gate.acquire('beans-hit'),0); assert.equal(gate.acquire('beans-hit'),undefined,'crowd hits do not stack identical sounds');
assert.equal(gate.acquire('cleaver-hit'),1,'different weapon can sound in the same frame');
assert.equal(gate.acquire('peach-attack'),undefined,'release cannot steal a live impact');
assert.notEqual(gate.acquire('sandal-hit-pcm',2),undefined,'player damage can preempt an impact');
gate.update(.2); assert.notEqual(gate.acquire('beans-hit'),undefined); gate.reset(); assert.equal(gate.acquire('beans-hit'),0);
const crowded = new SoundGate();
for (let i=0;i<100;i++) { const id=GENERATED_SOUNDS[i%GENERATED_SOUNDS.length]; const voice=crowded.acquire(id); assert.ok(voice===undefined || voice>=0 && voice<SFX_VOICES); crowded.update(.003); }
console.log('通过：五种基础武器音色、草鞋无风声、10个PCM无静音/削波/端点跳变、同帧混音/同声限频、命中优先与六声道上限');
