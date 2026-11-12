#!/usr/bin/env node
'use strict';
// Deterministic documentation from pure rules. Never loads Cocos or a live game.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const SKILL = '.agents/skills/taoyuan-game';
const OUTPUTS = ['catalog.json', 'weapon-catalog.md', 'item-catalog.md', 'balance-tables.md'];

function options(argv) {
  const result = { check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') result.check = true;
    else if (['--project', '--output-dir'].includes(argv[i])) {
      const key = argv[i] === '--project' ? 'project' : 'output';
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw Error(`缺少 ${argv[i]} 参数`);
      result[key] = path.resolve(argv[++i]);
    } else throw Error(`未知参数：${argv[i]}`);
  }
  return result;
}
function findRoot(start) {
  let dir = fs.realpathSync(start);
  while (!fs.existsSync(path.join(dir, 'assets/scripts/GameBootstrap.ts'))) {
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return dir;
}
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const round = value => Number(value.toFixed(6));
function clean(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw Error(`目录包含非有限数值：${value}`);
    return round(value);
  }
  if (Array.isArray(value)) return Array.from(value, clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  return value;
}
const cell = value => String(value ?? '—').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows].map(row => `| ${row.map(cell).join(' | ')} |`).join('\n');
const heading = name => `# ${name}\n\n由 \`npm run skill:sync\` 从当前代码生成，请修改源码后重新生成。机制、实际调用和已知差异见人工参考；配置字段不代表已接入效果。\n`;

function generate(root) {
  const ts = createRequire(path.join(root, 'package.json'))('typescript');
  const cache = new Map();
  // An allowlist prevents accidentally executing engine/UI modules during sync.
  const allowed = new Set(['campaign', 'weapons', 'passive-items', 'survival', 'world-rules', 'enemy-behavior', 'weapon-sound', 'battle-music', 'combat-particles', 'joystick-input', 'combat-math', 'startup-progress']);
  function load(name) {
    if (!allowed.has(name)) throw Error(`禁止加载非纯规则模块：${name}`);
    if (cache.has(name)) return cache.get(name);
    const filename = path.join(root, 'assets/scripts', name + '.ts');
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    });
    const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw Error(ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: s => s, getCurrentDirectory: () => root, getNewLine: () => '\n',
    }));
    const exports = {};
    cache.set(name, exports);
    vm.runInNewContext(result.outputText, {
      exports, require: id => {
        if (!/^\.\/[a-z-]+$/.test(id)) throw Error(`不支持的规则依赖：${id}`);
        return load(id.slice(2));
      },
    }, { filename, timeout: 1000 });
    return exports;
  }
  const c = load('campaign'), w = load('weapons'), p = load('passive-items'), s = load('survival');
  const world = load('world-rules'), behavior = load('enemy-behavior'), sound = load('weapon-sound'), music = load('battle-music');
  const effects = load('combat-particles'), controls = load('joystick-input');
  const startup=load('startup-progress');
  function stringsFromUnion(name) {
    const filename = path.join(root, 'assets/scripts/campaign.ts');
    const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
    const alias = source.statements.find(n => ts.isTypeAliasDeclaration(n) && n.name.text === name);
    if (!alias || !ts.isUnionTypeNode(alias.type) || alias.type.types.some(n => !ts.isLiteralTypeNode(n) || !ts.isStringLiteral(n.literal))) {
      throw Error(`无法读取字符串联合类型 ${name}，请更新目录生成器`);
    }
    return alias.type.types.map(n => n.literal.text);
  }
  const enemyKinds = stringsFromUnion('EnemyKind');
  const hero = c.HEROES[0].id;
  const weaponRows = w.WEAPONS.map(def => {
    const run = c.createRun(hero, def.id);
    return { ...def,
      qualityStatsWithoutHeroOrItems: w.TIER_NAMES.map((name, i) => {const stats=w.calculateWeapon({ id:def.id,tier:i+1 },c.emptyBonus(),hero);return {tier:i+1,name,color:w.TIER_COLORS[i],...stats,effectText:w.weaponEffectText(def.id,stats)};}),
      openingStatsByHero: c.HEROES.map(h => {
        const opening = c.createRun(h.id, def.id);
        return { hero: h.id, ...c.weaponStatsFor(opening, opening.weapons[0]), singleTargetDpsCeiling: c.weaponDps(opening, opening.weapons[0]) };
      }),
      firstShopPrices: w.TIER_NAMES.map((_, i) => s.supplyWeaponPrice(run, def.id, i + 1)),
      sound: { attack: sound.weaponSound(def.id, 'attack') ?? null, hit: sound.weaponSound(def.id, 'hit') ?? null },
    };
  });
  const baseline = p.passiveBonuses({});
  const itemRows = p.PASSIVE_ITEMS.map((item, index) => {
    const eligibleWeapons = w.WEAPONS.filter(def => p.eligiblePassive(item.id, [{ id: def.id }])).map(def => def.id);
    const baselineEligibleWeapons = w.WEAPONS.filter(def => s.eligibleItem(c.createRun(hero, def.id), item.id)).map(def => def.id);
    // Find additional single-passive / single-augment prerequisites from the live eligibility function.
    const prerequisiteExamples = [];
    if (eligibleWeapons.length && !baselineEligibleWeapons.length) {
      for (const other of p.PASSIVE_ITEMS) {
        const run = c.createRun(hero, eligibleWeapons[0]); run.inventory[other.id] = 1;
        if (s.eligibleItem(run, item.id)) prerequisiteExamples.push(other.id);
      }
      for (const aug of s.AUGMENTS) {
        const run = c.createRun(hero, eligibleWeapons[0]); run.augments = [aug.id];
        if (s.eligibleItem(run, item.id)) prerequisiteExamples.push('a:' + aug.id);
      }
    }
    return { ...item, category: p.ITEM_CATEGORIES[item.id.charCodeAt(0) - 65],
      art: index < 48 ? { atlas: 'assets/talismans/items.png', columns: 8, rows: 6, cell: index } : { renderer: 'CampaignView vector icon' },
      eligibleWeapons, baselineEligibleWeapons, prerequisiteExamples,
      singleItemBonusChanges: [1, 2, 3, 10, 100].map(copies => {
        const after = p.passiveBonuses({ [item.id]: copies });
        return { copies, delta: Object.fromEntries(Object.keys(after).filter(k => Math.abs(after[k] - baseline[k]) > 1e-9).map(k => [k, after[k] - baseline[k]])) };
      }),
    };
  });
  const curve = [0, 30, 60, 90, 180, 300, 480, 600].map(seconds => {
    const counts = Object.fromEntries(enemyKinds.map(k => [k, 0]));
    for (let i = 0; i < 10000; i++) counts[c.enemyKind(2, () => (i + .5) / 10000, seconds)]++;
    return { seconds, spawnBudget: s.spawnBudget(seconds),
      ordinaryMix: Object.fromEntries(enemyKinds.map(k => [k, counts[k] / 10000])),
      enemies: Object.fromEntries(enemyKinds.map(k => [k, c.enemyStats(k, 2, seconds)])),
    };
  });
  const heroes = c.HEROES.map(h => {
    const run = c.createRun(h.id);
    return { ...h, starter: w.starterFor(h.id), startingHearts: run.hearts, initialGold: run.gold, stats: c.statsFor(run), skill: world.HERO_SKILLS[h.id] };
  });
  const prices = [0, 1, 2, 3, 6, 10, 20, 40].map(supplyCount => {
    const run = c.createRun(hero); run.supplyCount = supplyCount;
    return { supplyCount, basePrice: s.basePrice(run), weaponPrices: Object.fromEntries(w.WEAPONS.map(d => [d.id, w.TIER_NAMES.map((_, i) => s.supplyWeaponPrice(run, d.id, i + 1))])) };
  });
  const refresh = [0, 1, 2, 3, 4, 5].map(rerolls => ({ rerolls,
    costsByC05Copies: [0, 1, 2, 3, 10].map(copies => { const run = c.createRun(hero); run.rerolls = rerolls; run.inventory.C05 = copies; return { copies, cost: s.refreshPrice(run) }; }),
  }));
  const sources = [];
  function scan(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const info = fs.lstatSync(absolute);
    if (info.isSymbolicLink()) throw Error(`源目录不能包含未处理软链接：${relative}`);
    if (info.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) {
        if (name.startsWith('.') && name !== '.gitignore') continue;
        const next = relative + '/' + name;
        if (!OUTPUTS.some(file => next === `${SKILL}/references/${file}`)) scan(next);
      }
    } else if (info.isFile()) {
      const bytes = fs.readFileSync(absolute);
      sources.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  for (const entry of ['assets', 'scripts', 'config', 'settings', 'docs', SKILL, 'AGENTS.md', 'README.md', 'package.json', 'package-lock.json', 'project.config.json', 'tsconfig.json', '.gitignore', 'art/concepts/hero-select-v2.5/03-select-hero-simple.png', 'art/concepts/hero-select-v2.5/runtime-prompts.json']) scan(entry);
  scan('build-templates');
  scan('art/concepts/defeat-v2.9');
  scan('art/concepts/presentation-v3.0');
  scan('art/concepts/weapons-v3.1');
  scan('art/reviews/arms-v3.2');
  scan('art/reviews/chapter-v3.3');
  scan('art/runtime-sources/png/manifest.json');
  scan('art/reviews/combat-v2.7/particle-contact-sheet.png');
  sources.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const media = sources.filter(f => /\.(png|wav|mp3)$/.test(f.path)).map(f => {
    const data = fs.readFileSync(path.join(root, f.path));
    if (/\.png$/.test(f.path) && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
      return { path: f.path, bytes: f.bytes, width: data.readUInt32BE(16), height: data.readUInt32BE(20), colorType: data[25] };
    }
    return { path: f.path, bytes: f.bytes };
  });
  const bundles = sources.filter(f => /^assets\/[^/]+\.meta$/.test(f.path)).flatMap(f => {
    const meta = JSON.parse(fs.readFileSync(path.join(root, f.path), 'utf8'));
    if (!meta.userData?.isBundle) return [];
    const prefix = f.path.slice(0, -5) + '/';
    return [{ path: prefix, ...meta.userData, sourceBytes: sources.filter(s => s.path.startsWith(prefix)).reduce((n, s) => n + s.bytes, 0) }];
  });
  const catalog = clean({ schemaVersion: 1, game: { name: '桃园乱斗', version: s.SURVIVAL_VERSION,
    creator: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).creator.version },
    provenance: { fingerprint: hash(JSON.stringify(sources)), files: sources },
    counts: { heroes: heroes.length, weapons: weaponRows.length, passives: itemRows.length, augments: s.AUGMENTS.length },
    rules: { warmupSeconds: c.WAVE_SECONDS, supplySeconds: s.SUPPLY_SECONDS, majorSeconds: s.MAJOR_SECONDS, bossEveryWaves:s.BOSS_EVERY_WAVES, chapterFinalBoss:'chief', clearAfterFirstBoss:true, earlySecondWeaponChance:s.EARLY_SECOND_WEAPON_CHANCE, weaponLimit: w.WEAPON_LIMIT, defaultWorld: world.WORLD, waveRules: [c.waveRule(1), c.waveRule(2)] },
    effects: { limits: effects.FX_LIMITS }, controls: { joystick: controls.JOYSTICK },
    startup: { tasks: startup.STARTUP_TASKS, poster:'assets/campaign/poster.jpg', template:'build-templates/wechatgame/first-screen.js' },
    heroes, weapons: weaponRows, passives: itemRows, augments: s.AUGMENTS,
    consumables: c.ITEMS.filter(i => !p.PASSIVE_ITEMS.some(p => p.id === i.id)),
    enemy: { kinds: enemyKinds, warmup: Object.fromEntries(enemyKinds.map(k => [k, c.enemyStats(k, 1, 0)])), costs: Object.fromEntries(enemyKinds.map(k => [k, s.enemyCost(k)])), behavior: { archer: behavior.ARCHER, cavalry: behavior.CAVALRY, zhangjiao: behavior.ZHANGJIAO }, curve },
    growth: { xpThresholds: Array.from({ length: 30 }, (_, i) => ({ level: i + 1, xpNeeded: c.xpNeeded(i + 1) })) },
    economy: { prices, refresh },
    audio: { cues: sound.SOUND_CUES, voices: sound.SFX_VOICES, musicSeconds: music.MUSIC_SECONDS, musicVolume: music.MUSIC_VOLUME },
    assets: { bundles, media },
  });
  const weaponDoc = [heading('武器与天命目录'), `当前版本：\`${catalog.game.version}\`；${weaponRows.length}种武器，${w.WEAPON_LIMIT}个槽位。\n`,
    '## 基础定义\n', '这是白色基础定义，尚未加英雄、道具和局内成长；间隔单位秒，射程/速度为游戏单位。`price`字段不是现行商店最终价格。\n',
    table(['ID / 武器', '类别', '伤害', '间隔', '射程', '弹速', '击退', '半径 / 穿透', '暴击 / 倍率', '特点'], weaponRows.map(d => [d.id + ' / ' + d.name, w.CLASS_NAMES[d.category], d.damage, d.interval, d.range, d.speed, d.knockback, d.area + ' / ' + d.pierce, `${round(d.crit * 100)}% / ${d.critMultiplier}`, d.desc])),
    '\n## 品质派生\n', '无英雄或道具的伤害/间隔/射程/爆炸半径；实际暴击、特效、DPS上限及各英雄开局值见 `catalog.json`。\n',
    table(['武器', ...w.TIER_NAMES], weaponRows.map(d => [d.name, ...d.qualityStatsWithoutHeroOrItems.map(v => [v.damage, v.interval, v.range, v.area].map(round).join(' / '))])),
    '\n## 各品级攻击机制\n', table(['武器', ...w.TIER_NAMES],weaponRows.map(d=>[d.name,...d.qualityStatsWithoutHeroOrItems.map(v=>v.effectText)])),
    '\n## 出手与命中声音\n', table(['武器', '出手', '命中'], weaponRows.map(d => [d.name, d.sound.attack, d.sound.hit])),
    '\n## 天命强化\n', '每种本局唯一；货架出现资格与战斗生效条件不同，见装备机制参考。\n',
    table(['ID', '名称', '效果', '定义中的武器需求'], s.AUGMENTS.map(a => [a.id, a.name, a.desc, a.needs?.join(', ') || '另见机制条件'])),
  ].join('\n') + '\n';
  const names = Object.fromEntries(w.WEAPONS.map(d => [d.id, d.name]));
  const itemDoc = [heading('被动道具目录'), `当前${itemRows.length}种被动；不占武器位，重复购买按代码收益递减。价格列是商店基础价的倍率。\n`,
    '叠加公式与上限见 `weapons-items.md`，每项持有1/2/3/10/100份的属性差值见 `catalog.json`；配置变化与实际消费差异见 `known-gaps.md`。\n',
    ...p.ITEM_CATEGORIES.flatMap(category => [`## ${category}\n`, table(['ID / 名称', '首份描述', '价格倍率', '叠加 / 上限', '适配武器 / 前提'], itemRows.filter(i => i.category === category).map(i => [i.id + ' / ' + i.name, i.desc, i.price, i.stack,
      (i.eligibleWeapons.length === w.WEAPONS.length ? '全部' : i.eligibleWeapons.map(id => names[id]).join('、')) + (i.prerequisiteExamples.length ? '；另需其一：' + i.prerequisiteExamples.join(' / ') : '')])), '']),
    '## 恢复消耗品\n', table(['ID / 名称', '描述'], catalog.consumables.map(i => [i.id + ' / ' + i.name, i.desc])),
    '\n原始48项按源顺序映射8×6图集；新增远程道具为矢量图标。具体图集格位记录在机器目录，新增条目不要打乱旧格位。',
  ].join('\n') + '\n';
  const balanceDoc = [heading('角色与数值曲线'), `版本：\`${catalog.game.version}\`。时间从进入无尽后开始计；20秒热身另算，购物与暂停不计时。\n`,
    '## 角色开局与技能\n', table(['英雄', '心 / 移速', '默认武器', '固有特点', '技能', '冷却 / 距离 / 系数'], heroes.map(h => [h.name, h.startingHearts + ' / ' + h.stats.speed, names[h.starter], h.desc, h.skill.name, [h.skill.cooldown, h.skill.range, h.skill.factor].join(' / ')])),
    '\n技能系数的实际伤害基数、保护、额外段数见玩法参考；不是技能面板最终伤害。\n',
    '## 热身与无尽敌人\n', table(['类型', '热身生命', '无尽起始生命', '基础速度', '经验', '钱币', '出兵成本'], enemyKinds.map(k => { const a = catalog.enemy.warmup[k], b = catalog.enemy.curve[0].enemies[k]; return [k, a.hp, b.hp, b.speed, b.xp, b.coins, s.enemyCost(k)]; })),
    '\n热身实际只出普通兵；首领由事件额外安排，不进入下表普通出兵配比。\n',
    table(['战斗秒数模型', ...enemyKinds.map(k => k + ' HP'), '预算/秒', '普通兵 / 弓兵 / 骑兵'], catalog.enemy.curve.map(row => [row.seconds, ...enemyKinds.map(k => row.enemies[k].hp), row.spawnBudget, ['soldier','spearman','cavalry'].map(k => round(row.ordinaryMix[k] * 100) + '%').join(' / ')])),
    '\n配比为对 `enemyKind` 的10000个等距输入取样；血量与预算直接调用代码。理论值不等于实测存活时间，首领/精英额外事件和出生动画见玩法参考。\n',
    '## 隐藏成长\n', table(['内部等级', '下次经验'], catalog.growth.xpThresholds.filter(v => [1,2,3,5,10,20,30].includes(v.level)).map(v => [v.level, v.xpNeeded])),
    '\nHUD不显示经验和等级；保留隐藏成长与封顶转换，见玩法参考。\n',
    '## 商店价格与刷新\n', table(['补给计数', '基础价', '草鞋 I/II/III/IV', '突突枪 I/II/III/IV'], catalog.economy.prices.map(row => [row.supplyCount, row.basePrice, row.weaponPrices.sandal.join(' / '), row.weaponPrices.smg.join(' / ')])),
    '\n无折扣样本，按当前 `supplyCount` 调用现行商店价格函数，不使用旧八关商店价格。\n',
    table(['已刷新次数', '无C05', 'C05×1', 'C05×2', 'C05×3', 'C05×10'], catalog.economy.refresh.map(row => [row.rerolls, ...row.costsByC05Copies.map(v => v.cost)])),
    '\nC05只降低每次进店的第一次刷新；收益递减后取整，第二份不一定立即降价。\n',
    '## 音频与资源清单\n', `音效池${sound.SFX_VOICES}声道；配乐${music.MUSIC_SECONDS}秒，基础音量${music.MUSIC_VOLUME}。完整声音映射见武器目录。\n`,
    table(['Bundle', '优先级', '源码素材 MiB'], bundles.map(b => [b.bundleName, b.priority, round(b.sourceBytes / 1024 / 1024)])),
    '\n以上为源码目录字节，包含meta，并非发布包大小。PNG尺寸、资源路径、源码指纹见机器目录；微信包限制与验证见工程参考。',
  ].join('\n') + '\n';
  return { 'catalog.json': JSON.stringify(catalog, null, 2) + '\n', 'weapon-catalog.md': weaponDoc, 'item-catalog.md': itemDoc, 'balance-tables.md': balanceDoc };
}

try {
  const args = options(process.argv.slice(2));
  const root = args.project || findRoot(process.cwd()) || findRoot(__dirname);
  if (!root || !fs.existsSync(path.join(root, 'assets/scripts/GameBootstrap.ts'))) throw Error('找不到桃园乱斗仓库，请提供 --project');
  const destination = args.output || path.join(root, SKILL, 'references');
  const results = generate(root), stale = [];
  for (const [filename, expected] of Object.entries(results)) {
    const file = path.join(destination, filename);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected) {
      stale.push(filename);
      if (!args.check) { fs.mkdirSync(destination, { recursive: true }); fs.writeFileSync(file, expected); }
    }
  }
  if (args.check && stale.length) throw Error(`项目skill已过期：${stale.join('、')}。更新相关人工参考后运行 npm run skill:sync`);
  console.log(args.check ? '项目skill目录与来源指纹同步检查通过。' : `项目skill目录已同步（${stale.length}个文件更新）。`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
