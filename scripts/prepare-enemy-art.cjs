// Retain generated originals; export the three 4x3 atlases into their own small bundle.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), dir = path.join(root, 'assets/enemies');
fs.mkdirSync(dir, { recursive: true });
for (const id of ['archer-actions', 'cavalry-actions', 'zhangjiao-actions']) {
  const file = path.join(dir, id + '.png');
  cp.execFileSync('sips', ['-s', 'format', 'png', '-Z', '1024', path.join(root, 'art/concepts/enemies-v2', id + '.png'), '--out', file], { stdio: 'ignore' });
  if (!fs.existsSync(file + '.meta')) {
    const uuid = crypto.randomUUID();
    fs.writeFileSync(file + '.meta', JSON.stringify({ ver: '1.0.27', importer: 'image', imported: true, uuid, files: ['.json', '.png'],
      subMetas: { '6c48a': { importer: 'texture', uuid: uuid + '@6c48a', displayName: id, id: '6c48a', name: 'texture', userData: { wrapModeS: 'clamp-to-edge', wrapModeT: 'clamp-to-edge', minfilter: 'linear', magfilter: 'linear', mipfilter: 'none', anisotropy: 0, isUuid: true, imageUuidOrDatabaseUri: uuid, visible: false }, ver: '1.0.22', imported: true, files: ['.json'], subMetas: {} } },
      userData: { type: 'texture', fixAlphaTransparencyArtifacts: false, hasAlpha: true, redirect: uuid + '@6c48a' } }, null, 2));
  }
}
const meta = path.join(root, 'assets/enemies.meta');
if (!fs.existsSync(meta)) fs.writeFileSync(meta, JSON.stringify({ ver: '1.2.0', importer: 'directory', imported: true, uuid: crypto.randomUUID(), files: [], subMetas: {}, userData: { isBundle: true, bundleConfigID: 'battle-subpackage', bundleName: 'enemies', priority: 8 } }, null, 2));
console.log('Prepared 3 enemy animation atlases in enemies bundle.');
