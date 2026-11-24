const assert = require('node:assert/strict');
const vm = require('node:vm');
const { patchTextMeasure } = require('./patch-wechat-text-measure.cjs');

const source = 'var cache=new Lru(100);function measure(ctx,str,desc){var key=(desc||ctx.font)+"🎮"+str,hit=cache.get(key);if(null!==hit)return hit;var metric=ctx.measureText(str),width=metric&&metric.width||0;return cache.put(key,width),width}';
const makeMeasure = () => vm.runInNewContext(patchTextMeasure(source) + '\nmeasure', { Lru: class {} });
assert.throws(() => patchTextMeasure(source.replace('new Lru(100)', 'new Lru(200)')), /容量/);
assert.throws(() => patchTextMeasure(source + source), /函数已变化/);

let calls = 0;
const ctx = { font: '16px TaoyuanWenkaiR1', measureText: () => ({ width: ++calls }) };
const measure = makeMeasure();
assert.equal(measure(ctx, '继续战斗'), 1);
assert.equal(measure(ctx, '继续战斗'), 1);
assert.equal(measure(ctx, '继续战斗', 'bold 16px TaoyuanWenkaiM1'), 2);
assert.equal(measure(ctx, '继续战斗', 'bold 16px TaoyuanWenkaiM1'), 2);
assert.equal(measure(ctx, '🎮乙', '甲'), 3);
assert.equal(measure(ctx, '乙', '甲🎮'), 4, 'font and text do not collide through a delimiter');

const bounded = makeMeasure();
calls = 0;
for (let i = 0; i < 100; i++) bounded(ctx, '补给' + i);
assert.equal(bounded(ctx, '补给0'), 1, 'cache hit promotes an entry');
assert.equal(bounded(ctx, '新一轮'), 101);
assert.equal(bounded(ctx, '补给0'), 1);
assert.equal(bounded(ctx, '补给1'), 102, 'least recently used entry is evicted');

let misses = 0;
const missing = { font: 'Arial', measureText: () => { misses++; return null; } };
assert.equal(measure(missing, ''), 0);
assert.equal(measure(missing, ''), 0);
assert.equal(misses, 1, 'a zero width is still cached');
console.log('通过：微信 Cocos 文本测量补丁、中文量宽、字体隔离、100 项 LRU 与输出匹配守卫');
