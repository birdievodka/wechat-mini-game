// Runtime export only: original generated designs remain in art/concepts.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets/campaign');
fs.mkdirSync(dir, { recursive: true });
const artIds = ['guanyu', 'zhangfei', 'guanyu_body', 'zhangfei_body', 'spearman', 'cavalry', 'chief', 'items', 'poster', 'camp-background', 'camp-paper', 'camp-stats', 'camp-titles'];
for (const id of [...artIds, 'liubei']) {
  const source = path.join(root, id === 'liubei' ? 'art/concepts/characters/liubei-v8-bean-feet-grip.png' : id.startsWith('camp-') ? `art/concepts/ui-camp-v2/${id}.png` : `art/concepts/campaign/${id}.png`);
  const ext = ['poster', 'camp-background'].includes(id) ? 'jpg' : 'png';
  const file = path.join(dir, `${id}.${ext}`);
  cp.execFileSync('sips', ['-s', 'format', ext === 'jpg' ? 'jpeg' : 'png', '-Z', ['poster', 'camp-background'].includes(id) ? '1334' : ['items', 'camp-stats'].includes(id) ? '768' : id === 'camp-titles' ? '1024' : id === 'camp-paper' ? '512' : '384', source, '--out', file], { stdio: 'ignore' });
  if (!fs.existsSync(file + '.meta')) {
    const uuid = crypto.randomUUID();
    fs.writeFileSync(file + '.meta', JSON.stringify({ ver: '1.0.27', importer: 'image', imported: true, uuid, files: ['.json', '.' + ext],
      subMetas: { '6c48a': { importer: 'texture', uuid: uuid + '@6c48a', displayName: id, id: '6c48a', name: 'texture', userData: { wrapModeS: 'clamp-to-edge', wrapModeT: 'clamp-to-edge', minfilter: 'linear', magfilter: 'linear', mipfilter: 'none', anisotropy: 0, isUuid: true, imageUuidOrDatabaseUri: uuid, visible: false }, ver: '1.0.22', imported: true, files: ['.json'], subMetas: {} } },
      userData: { type: 'texture', fixAlphaTransparencyArtifacts: false, hasAlpha: ext === 'png', redirect: uuid + '@6c48a' } }, null, 2));
  }
}
const bundle = path.join(root, 'assets/campaign.meta');
if (!fs.existsSync(bundle)) fs.writeFileSync(bundle, JSON.stringify({ ver: '1.2.0', importer: 'directory', imported: true, uuid: crypto.randomUUID(), files: [], subMetas: {}, userData: { isBundle: true, bundleConfigID: 'battle-subpackage', bundleName: 'campaign', priority: 8 } }, null, 2));
console.log('Prepared campaign runtime textures; original concept images preserved.');
