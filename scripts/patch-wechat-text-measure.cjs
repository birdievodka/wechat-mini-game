const { readFileSync, writeFileSync } = require('node:fs');

function createMeasureTextCache(limit) {
  const fonts = new Map();
  const lru = new Set();
  return function measure(ctx, text, descriptor) {
    const font = descriptor || ctx.font;
    let widths = fonts.get(font);
    const cached = widths && widths.get(text);
    if (cached) {
      lru.delete(cached);
      lru.add(cached);
      return cached.width;
    }

    const metric = ctx.measureText(text);
    const width = metric && metric.width || 0;
    if (!widths) {
      widths = new Map();
      fonts.set(font, widths);
    }
    const entry = { font, text, width, widths };
    widths.set(text, entry);
    lru.add(entry);
    if (lru.size > limit) {
      const oldest = lru.values().next().value;
      lru.delete(oldest);
      oldest.widths.delete(oldest.text);
      if (oldest.widths.size === 0) fonts.delete(oldest.font);
    }
    return width;
  };
}

// Match the emitted Creator 3.8.8 measure function, including the cache write.
// Refuse a changed engine layout so a successful WeChat build always contains the fix.
function patchTextMeasure(source) {
  const original = /function (\w+)\((\w+),(\w+),(\w+)\)\{var (\w+)=\(\4\|\|\2\.font\)\+"🎮"\+\3,(\w+)=(\w+)\.get\(\5\);if\(null!==\6\)return \6;var (\w+)=\2\.measureText\(\3\),(\w+)=\8&&\8\.width\|\|0;return \7\.put\(\5,\9\),\9\}/g;
  const matches = Array.from(source.matchAll(original));
  if (matches.length !== 1) throw new Error('Cocos 3.8.8 微信包的文本测量函数已变化，请复核字符串键补丁');
  const [body, name, ctx, str, font, , , cache] = matches[0];
  const capacity = new RegExp(`\\b${cache}=new \\w+\\((\\d+)\\)`).exec(source)?.[1];
  if (capacity !== '100') throw new Error('Cocos 文本缓存容量与已验证的版本不一致');
  const replacement = `function ${name}(${ctx},${str},${font}){if(!${name}.taoyuanMeasureText)${name}.taoyuanMeasureText=(${createMeasureTextCache})(${capacity});return ${name}.taoyuanMeasureText(${ctx},${str},${font})}`;
  return source.replace(body, () => replacement);
}

function patchWechatTextMeasure(file) {
  writeFileSync(file, patchTextMeasure(readFileSync(file, 'utf8')));
}

module.exports = { patchTextMeasure, patchWechatTextMeasure };
