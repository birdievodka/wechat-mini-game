// Offline only. Stage all samples before replacing Cocos resources.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {get, names, render} from 'plinkfx';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path));
const json = path => JSON.parse(read(path));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sampleRate = 24000;
const mixPath = 'art/audio/plinkfx/mix.json';
const reviewPath = 'art/audio/review-v1/manifest.json';
const shoeSource = 'art/audio/review-v1/sfx/sandal-hit.wav';
const original = json(reviewPath);
const {cues: recipes, weaponSoundFamilies} = json(mixPath);
const {version} = json('node_modules/plinkfx/package.json');
const upstream = json('package-lock.json').packages['node_modules/plinkfx'];
assert.equal(version, upstream.version);
assert.equal(read('art/audio/plinkfx/LICENSE-SOUNDS').compare(read('node_modules/plinkfx/LICENSE-SOUNDS')), 0);
const presets = new Set(names);
const extras = {
  'skill-G08-heavy': 'skill-G08', 'skill-G10-beat': 'skill-G10',
  'skill-G20-heavy': 'skill-G20', 'skill-G22-heavy': 'skill-G22',
};
const priorCues = new Map(original.entries.filter(e => e.group !== '配乐' && e.group !== '混音' && e.id !== 'sandal-hit').map(e => [e.id, e]));
priorCues.set('sandal-hit-pcm', {gain: .40 / .9, gap: .09, priority: 2});
for (const [id, base] of Object.entries(extras)) priorCues.set(id, priorCues.get(base));
assert.deepEqual(Object.keys(recipes).sort(), [...priorCues.keys()].sort(), 'Every existing SFX has a recipe');

const core = new Set([
  'player-hurt', 'coin', 'heal', 'block', 'skill-ready', 'dash', 'hoof', 'footstep',
  'enemy-fall', 'enemy-bow', 'melee-commit', 'charge-warn', 'danger', 'spawn',
  'ui-click', 'ui-hero', 'ui-equip', 'ui-open', 'ui-close', 'ui-start',
  'skill-G01', 'skill-G03', 'skill-G08', 'skill-G08-heavy',
]);
for (const family of ['wood', 'blade', 'heavy', 'bow', 'gun', 'blast', 'petal', 'spirit', 'thunder', 'ritual']) {
  core.add(family + '-attack');
  core.add(family + '-hit');
}

function readShoe() {
  const wav = read(shoeSource);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ');
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt16LE(34), 16);
  for (let at = 12; at + 8 <= wav.length;) {
    const length = wav.readUInt32LE(at + 4);
    if (wav.toString('ascii', at, at + 4) === 'data') {
      const samples = Float32Array.from({length: length / 2}, (_, i) => wav.readInt16LE(at + 8 + 2 * i) / 32768);
      return {samples, rate: wav.readUInt32LE(24)};
    }
    at += 8 + length + length % 2;
  }
  throw new Error('Approved sandal sample has no PCM data');
}

function mixCue(id, [seconds, ...layers]) {
  assert.ok(seconds > 0 && seconds <= 1 && layers.length > 0, id);
  const output = new Float32Array(Math.round(seconds * sampleRate));
  for (const [name, speed = 1, gain = 1, delay = 0, seed = 0] of layers) {
    assert.ok(speed > 0 && gain > 0 && delay >= 0 && delay < seconds, id);
    assert.ok(presets.has(name) || (id === 'sandal-hit-pcm' && name === 'approved-sandal'), id + ': ' + name);
    const source = name === 'approved-sandal' ? readShoe() : {samples: render(get(name), {sampleRate, seed}), rate: sampleRate};
    const step = speed * source.rate / sampleRate;
    const offset = Math.round(delay * sampleRate);
    for (let i = offset; i < output.length; i++) {
      const position = (i - offset) * step;
      const index = Math.floor(position);
      if (index + 1 >= source.samples.length) break;
      const a = source.samples[index], b = source.samples[index + 1];
      output[i] += (a + (b - a) * (position - index)) * gain;
    }
  }
  const tail = Math.min(Math.round(sampleRate * .05), Math.round(output.length * .28));
  let peak = 0;
  for (let i = 0; i < output.length; i++) {
    output[i] *= Math.min(1, i / 60, (output.length - 1 - i) / tail);
    peak = Math.max(peak, Math.abs(output[i]));
  }
  assert.ok(peak > .015, id + ' has an audible transient');
  const level = Math.min(8, .74 / peak);
  let power = 0;
  const pcm = Buffer.alloc(44 + output.length * 2);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write('WAVEfmt ', 8);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(sampleRate, 24); pcm.writeUInt32LE(sampleRate * 2, 28);
  pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36); pcm.writeUInt32LE(output.length * 2, 40);
  for (let i = 0; i < output.length; i++) {
    const value = Math.round(output[i] * level * 32767);
    pcm.writeInt16LE(value, 44 + 2 * i);
    power += value * value;
  }
  assert.ok(Math.sqrt(power / output.length) > 500, id + ' is too quiet');
  return pcm;
}

function writeIfChanged(path, data) {
  const output = resolve(root, path), bytes = Buffer.from(data);
  if (!existsSync(output) || readFileSync(output).compare(bytes) !== 0) writeFileSync(output, bytes);
}

function audioMeta(path) {
  // Keep any existing Cocos identity. New cue paths get a reproducible UUID.
  if (existsSync(resolve(root, path))) return read(path);
  const hash = createHash('sha256').update('taoyuan-plinkfx/' + path).digest();
  hash[6] = (hash[6] & 15) | 128;
  hash[8] = (hash[8] & 63) | 128;
  const uuid = hash.subarray(0, 16).toString('hex').replace(/^(........)(....)(....)(....)/, '$1-$2-$3-$4-');
  return JSON.stringify({ver: '1.0.0', importer: 'audio-clip', imported: true, uuid, files: ['.json', '.wav'], subMetas: {}, userData: {downloadMode: 0}}, null, 2) + '\n';
}

const updatedGaps = {'skill-G08': .075, 'skill-G19': .20, 'skill-G20': .115, 'skill-G22': .20};
const catalog = {}, assets = {}, allAssets = {}, physical = [];
const seen = new Set();
for (const [id, recipe] of Object.entries(recipes)) {
  const clip = mixCue(id, recipe), sha = sha256(clip);
  assert.ok(!seen.has(sha), id + ' duplicates another cue');
  seen.add(sha);
  const asset = id === 'sandal-hit-pcm'
    ? {bundle: 'battle', name: 'audio/sandal-hit-pcm'}
    : {bundle: core.has(id) ? 'sfx-core' : 'sfx', name: id};
  const {gain, gap, priority} = priorCues.get(id);
  catalog[id] = {volume: +(gain * .9).toFixed(4), duration: recipe[0], gap: updatedGaps[id] ?? gap, priority};
  allAssets[id] = asset;
  if (id !== 'sandal-hit-pcm') assets[id] = asset;
  physical.push({...asset, sha256: sha, bytes: clip.length, clip});
}

for (const {bundle, name, clip} of physical) {
  const path = `assets/${bundle}/${name}.wav`;
  writeIfChanged(path + '.meta', audioMeta(path + '.meta'));
  writeIfChanged(path, clip);
}
// Remove retired generated clips from the two dedicated SFX bundles only.
for (const bundle of ['sfx', 'sfx-core']) {
  const keep = new Set(physical.filter(p => p.bundle === bundle).map(p => p.name + '.wav'));
  for (const file of readdirSync(resolve(root, 'assets', bundle))) {
    if (file.endsWith('.wav') && !keep.has(file)) {
      unlinkSync(resolve(root, 'assets', bundle, file));
      const meta = resolve(root, 'assets', bundle, file + '.meta');
      if (existsSync(meta)) unlinkSync(meta);
    }
  }
}

const code = [
  '// Generated by scripts/pack-plinkfx-audio.mjs.',
  'export const AUDIO_CUES = ' + JSON.stringify(catalog, null, 2) + ' as const;',
  'export const SOUND_ASSETS = ' + JSON.stringify(assets, null, 2) + ' as const;',
  'export const WEAPON_AUDIO_FAMILIES:Record<string,string> = ' + JSON.stringify({...Object.fromEntries(original.weapons.map(w => [w.id, w.family])), ...weaponSoundFamilies}, null, 2) + ';',
];
writeIfChanged('assets/scripts/audio-catalog.ts', code.join('\n') + '\n');
const manifest = {
  source: 'https://github.com/maximilianfeix/plinkfx',
  version,
  integrity: upstream.integrity,
  license: 'CC0-1.0',
  recipe: mixPath,
  recipeSha256: sha256(read(mixPath)),
  preservedSandalSource: {path: shoeSource, sha256: sha256(read(shoeSource))},
  format: {sampleRate, channels: 1, bitsPerSample: 16, encoding: 'pcm'},
  sfx: Object.keys(recipes),
  music: ['brass-oath', 'brass-rally'],
  musicFormat: 'AAC mono 24kHz 64kbps',
  aliases: allAssets,
  physicalSounds: physical.map(({clip, ...record}) => record),
};
writeIfChanged('art/audio/runtime-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`PlinkFX ${version}: ${physical.length} clips / ${physical.reduce((n, item) => n + item.bytes, 0)} bytes`);
