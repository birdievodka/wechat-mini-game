// Reduce PNG RGB colour noise without changing dimensions, alpha or atlas coordinates.
// Originals stay outside assets/ and are never included in the game package.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const archive = path.join(root, 'art/runtime-sources/png');
const manifestPath = path.join(archive, 'manifest.json');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function pngs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? pngs(p) : e.name.endsWith('.png') ? [p] : [];
  });
}
async function main() {
  fs.mkdirSync(archive, { recursive: true });
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : {};
  let before = 0, after = 0;
  for (const file of pngs(path.join(root, 'assets')).sort()) {
    const name = path.relative(root, file).split(path.sep).join('/');
    const current = fs.readFileSync(file), previous = manifest[name];
    const input = previous?.outputSha === hash(current)
      ? fs.readFileSync(path.join(archive, previous.sourceSha + '.png')) : current;
    const sourceSha = hash(input), original = path.join(archive, sourceSha + '.png');
    if (!fs.existsSync(original)) fs.writeFileSync(original, input);
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const palette = await sharp(input).removeAlpha().png({ palette: true, colours: 256, dither: 0, effort: 10 }).toBuffer();
    const rgb = await sharp(palette).removeAlpha().raw().toBuffer();
    const rgba = Buffer.from(data);
    let squaredError = 0, count = 0;
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      for (let c = 0; c < 3; c++) {
        if (data[i + 3] > 8) { squaredError += (data[i + c] - rgb[j + c]) ** 2; count++; }
        rgba[i + c] = data[i + 3] === 0 ? 0 : rgb[j + c];
      }
      // rgba[i+3] is deliberately untouched, including all soft outline pixels.
    }
    const rmse = Math.sqrt(squaredError / Math.max(1, count));
    assert.ok(rmse < 8, name + ': RGB误差过大，需要人工选择压缩参数');
    const compressed = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ palette: false, compressionLevel: 9, effort: 10 }).toBuffer();
    const output = compressed.length < input.length ? compressed : input;
    const decoded = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(decoded.info.width, info.width); assert.equal(decoded.info.height, info.height);
    for (let i = 3; i < data.length; i += 4) assert.equal(decoded.data[i], data[i], name + ': alpha必须逐像素相同');
    manifest[name] = { sourceSha, outputSha: hash(output), sourceBytes: input.length, outputBytes: output.length,
      width: info.width, height: info.height, rgbRmse: Number(rmse.toFixed(4)), alpha: 'identical' };
    // Persist recovery information first, so an interrupted run never requantizes an output.
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(file, output);
    before += input.length; after += output.length;
    console.log(`${name}: ${(input.length / 1024).toFixed(0)} → ${(output.length / 1024).toFixed(0)} KiB`);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`PNG合计 ${(before / 1048576).toFixed(2)} → ${(after / 1048576).toFixed(2)} MiB`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
