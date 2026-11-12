// Use the actual game's landscape ratio instead of Creator's default 1280x960 preview wrapper.
const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '../build/camp-review/index.html');
let html = fs.readFileSync(file, 'utf8');
html = html.replace('width: 1280px; height: 960px;', 'width: 1334px; height: 750px;')
  .replace('width="1280" height="960"', 'width="1334" height="750"')
  .replace('name="screen-orientation" content="portrait"', 'name="screen-orientation" content="landscape"');
if (!html.includes('id="desktop-preview-style"')) html = html.replace('</head>', `<style id="desktop-preview-style">
  body { background: #25332a; color: #f9ebcf; }
  .header { font-size: 20px; margin: 16px 0; }
  #GameDiv { width: min(calc(100vw - 24px), calc((100vh - 104px) * 1334 / 750)) !important; height: auto !important; aspect-ratio: 1334 / 750; border: 0; }
  .footer { font-size: 14px; margin: 14px 0; }
</style></head>`);
html = html.replace('<h1 class="header">wechat-mini-game</h1>', '<h1 class="header">桃园乱斗</h1>')
  .replace(/<p class="footer">[\s\S]*?<\/p>/, '<p class="footer">↑↓←→ / WASD 移动 · 自动攻击</p>');
fs.writeFileSync(file, html);
console.log('Camp review canvas: 1334 × 750.');
