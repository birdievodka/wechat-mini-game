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
  const allowed = new Set(['hero-growth','enemy-actions','grunt-melee','yellow-chargers','stage-data','stage-progress','game-brand','common-skills','campaign', 'weapons', 'passive-items', 'survival', 'world-rules', 'enemy-behavior', 'weapon-sound', 'battle-music', 'combat-particles', 'joystick-input', 'combat-math', 'startup-progress', 'chronicles', 'chronicles-data', 'lvbu-boss', 'boss-roster', 'extra-weapons']);
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
  const startup=load('startup-progress'),chronicles=load('chronicles'),extra=load('extra-weapons');
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
  const stages=load('stage-data');
  const hero = c.HEROES[0].id;
  const weaponRows = w.WEAPONS.map(def => {
    const run = c.createRun(hero, def.id);run.challenge=true;
    return { ...def,
      qualityStatsWithoutHeroOrItems: w.TIER_NAMES.map((name, i) => {const stats=w.calculateWeapon({ id:def.id,tier:i+1 },c.emptyBonus(),hero);return {tier:i+1,name,color:w.TIER_COLORS[i],...stats,effectText:w.weaponEffectText(def.id,stats),mechanics:extra.isExtraWeapon(def.id)?extra.extraMechanics(def.id,i+1):w.weaponEffectText(def.id,stats)};}),
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
  const heroes = c.HEROES.filter(h=>stages.VISIBLE_HERO_IDS.includes(h.id)).map(h => {
    const run = c.createRun(h.id);run.gold=28;run.challenge=true;
    return { ...h, starter: w.starterFor(h.id), startingHearts: run.hearts, initialGold: run.gold, stats: c.statsFor(run), skill: {selection:'通用技能自由搭配',defaultId:run.skillId,recharge:'固定15名真实小兵重置'} };
  });
  const prices = stages.STAGES.map((stage,index) => {
    const chapter={id:index+1};
    const run = c.createRun(hero); run.chapter=chapter.id;run.challenge=true;
    return { chapter:chapter.id, basePrice: s.basePrice(run), weaponPrices: Object.fromEntries(w.WEAPONS.map(d => [d.id, w.TIER_NAMES.map((_, i) => s.supplyWeaponPrice(run, d.id, i + 1))])) };
  });
  const refresh = [0, 1, 2, 3, 4, 5].map(rerolls => ({ rerolls,
    costsByC05Copies: [0, 1, 2, 3, 10].map(copies => { const run = c.createRun(hero); run.challenge=true;run.rerolls = rerolls; run.inventory.C05 = copies; return { copies, cost: s.refreshPrice(run) }; }),
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
  for (const entry of ['assets', 'scripts', 'config', 'settings', 'docs', 'art', '.agents/skills', 'build-templates', 'AGENTS.md', 'README.md', 'package.json', 'package-lock.json', 'project.config.json', 'tsconfig.json', '.gitignore']) scan(entry);
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
  const heroGrowth=load('hero-growth'),progress=load('stage-progress');
  const growthRows=heroGrowth.GROWTH_HEROES.flatMap(id=>Array.from({length:7},(_,clears)=>{const profile=progress.newProfile();for(let i=1;i<=clears;i++)progress.recordClear(profile,id,i,240,100,5);const run=c.createStageRun(profile,id,Math.min(6,clears+1),w.starterFor(id),'G03'),weapon=run.weapons[0],stats=c.statsFor(run);return {hero:id,clears,title:heroGrowth.growthTitle(id,clears),maxHearts:stats.maxHp,speed:stats.speed,signature:weapon.id,tier:weapon.tier,weaponStats:c.weaponStatsFor(run,weapon),singleTargetDpsCeiling:c.weaponDps(run,weapon),combo:clears>=3,mounted:clears>=2,dash:clears>=4,finalOutfit:clears>=5};}));
  const catalog = clean({ schemaVersion: 2, game: { name: load('game-brand').GAME_NAME, version: s.SURVIVAL_VERSION,
    creator: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).creator.version },
    provenance: { fingerprint: hash(JSON.stringify(sources)), files: sources },
    counts: { heroes: heroes.length, stages: stages.STAGES.length, weapons: weaponRows.length, passives: itemRows.length, augments: s.AUGMENTS.length, enemyArchetypes:chronicles.CHRONICLE_ENEMIES.length, bossEncounters:chronicles.CHAPTERS.length, bossPeople:new Set(chronicles.CHAPTERS.map(ch=>ch.bossId)).size, genericSkills:chronicles.GENERIC_SKILLS.length },
    rules: {initialShop:false,warmupSeconds:0,waveSeconds:[45,45,60,60,null],wave3End:'all miniBosses defeated; immediate',wave3CountdownVisible:false,wave5End:'boss defeated',initialGold:28,shopOffers:4,refreshCap:20,skillKillRequirement:15,stageProgress:'per hero',contentUnlocks:'account shared; advanced weapons shop only',carryEquipment:false,weaponLimit:w.WEAPON_LIMIT,defaultWorld:world.WORLD},
    heroGrowth:{enabled:true,progress:'per hero consecutive first clears',heartPerClear:1,mountBaseSpeedBonus:.3,dash:heroGrowth.DASH,states:growthRows},
    stageChallenge:{waveRosters:stages.STAGE_WAVE_ROSTERS,rangedCostShares:stages.STAGE_RANGED_COST_SHARE,shooterWeight:1.5,yellowChargers:load('yellow-chargers').YELLOW_CHARGERS,spawnCostPerSecond:stages.STAGES.map((s,i)=>({stage:i+1,waves:[1,2,3,4,5].map(w=>stages.stageThreat(i+1,w)),stipends:[1,2,3,4,5].map(w=>stages.stageStipend(i+1,w))})),stages:stages.STAGES,initial:stages.INITIAL_CONTENT,starterWeapons:stages.STARTER_WEAPONS,visibleHeroes:stages.VISIBLE_HERO_IDS,themes:stages.STAGE_THEMES},
    effects: { limits: effects.FX_LIMITS }, controls: { joystick: controls.JOYSTICK },
    startup: { tasks: startup.STARTUP_TASKS, poster:'assets/campaign/poster.jpg', template:'build-templates/wechatgame/first-screen.js' },
    heroes, weapons: weaponRows, passives: itemRows, augments: s.AUGMENTS,
    consumables: c.ITEMS.filter(i => !p.PASSIVE_ITEMS.some(p => p.id === i.id)),
    enemy: { kinds: enemyKinds, warmup: Object.fromEntries(enemyKinds.map(k => [k, c.enemyStats(k, 1, 0)])), costs: Object.fromEntries(enemyKinds.map(k => [k, s.enemyCost(k)])), behavior: { archer: behavior.ARCHER, cavalry: behavior.CAVALRY, zhangjiao: behavior.ZHANGJIAO }, curve },
    chronicles:{chapters:chronicles.CHAPTERS.map(ch=>({...ch,enemyHpMultiplier:(ch.referenceDps/152.05)**.95,threatPerSecond:[0,1,2,3].map(stage=>chronicles.chapterThreat(ch.id,stage)),bossThreat:chronicles.chapterThreat(ch.id,3,true),actions:chronicles.BOSS_ACTIONS[ch.id-1]})),enemies:chronicles.CHRONICLE_ENEMIES.map(e=>{const firstStage=stages.STAGES.findIndex((s,i)=>s.roster.includes(e.id)||stages.miniArchetype(i+1)===e.id)+1;return {...e,firstStage,firstChapterValues:{hp:stages.stageEnemyHp(e.hp,firstStage,1),speed:e.speed*(1+.006*(firstStage-1)),coins:e.coins,damage:1}};}),genericSkills:[...chronicles.GENERIC_SKILLS].sort((a,b)=>a.powerRank-b.powerRank),genericSkillsCombatEnabled:true},
    growth: { enabled:false, xpThresholds: Array.from({ length: 30 }, (_, i) => ({ level: i + 1, xpNeeded: c.xpNeeded(i + 1) })) },
    economy: { prices, refresh },
    audio: { cues: sound.SOUND_CUES, voices: sound.SFX_VOICES, musicSeconds: music.MUSIC_SECONDS, musicVolume: music.MUSIC_VOLUME },
    assets: { bundles, media },
  });
  const weaponDoc = [heading('武器与天命目录'), `当前版本：\`${catalog.game.version}\`；${weaponRows.length}种武器，${w.WEAPON_LIMIT}个槽位。\n`,
    '## 基础定义\n', '这是白色基础定义，尚未加英雄、道具和局内成长；间隔单位秒，射程/速度为游戏单位。`price`字段不是现行商店最终价格。\n',
    table(['ID / 武器', '类别', '伤害', '间隔', '射程', '弹速', '击退', '半径 / 穿透', '暴击 / 倍率', '特点'], weaponRows.map(d => [d.id + ' / ' + d.name, w.CLASS_NAMES[d.category], d.damage, d.interval, d.range, d.speed, d.knockback, d.area + ' / ' + d.pierce, `${round(d.crit * 100)}% / ${d.critMultiplier}`, d.desc])),
    '\n## 品质派生\n', '无英雄或道具的伤害/间隔/射程/爆炸半径；实际暴击、特效、DPS上限及各英雄开局值见 `catalog.json`。\n',
    table(['武器', ...w.TIER_NAMES], weaponRows.map(d => [d.name, ...d.qualityStatsWithoutHeroOrItems.map(v => [v.damage, v.interval, v.range, v.area].map(round).join(' / '))])),
    '\n## 各品级攻击机制\n', table(['武器', ...w.TIER_NAMES],weaponRows.map(d=>[d.name,...d.qualityStatsWithoutHeroOrItems.map(v=>v.mechanics)])),
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
  const balanceDoc = [heading('角色与数值曲线'), `版本：\`${catalog.game.version}\`。六关独立构筑、无热身，购物与暂停不计时。\n`,
    '## 角色开局与技能\n', table(['英雄', '心 / 移速', '默认武器', '固有特点', '技能', '充能方式'], heroes.map(h => [h.name, h.startingHearts + ' / ' + h.stats.speed, names[h.starter], h.desc, h.skill.selection,h.skill.recharge])),
    `\n${catalog.chronicles.genericSkills.length}通用技能，初始3个，其他随共享首通解锁；全英雄统一15击杀重置、初始就绪，释放后每击杀1名真实小兵+1，时间不充能。S为施法瞬间装备DPS之和。详见common-skills-v5规则。\n`,
    '## 个人首通成长（白I本命、无道具）\n',table(['英雄','首通数','形态','最大心','移速','本命','单体理论DPS','三连 / 冲刺'],growthRows.map(r=>[r.hero,r.clears,r.title,r.maxHearts,r.speed,r.signature,round(r.singleTargetDpsCeiling),(r.combo?'三连':'单击')+' / '+(r.dash?'6秒':'无')])),
    '本命只占六槽之一，三连替代原品质附加连段；范围收益另计。成长规则见hero-growth.md。\n',
    `## ${catalog.chronicles.genericSkills.length}通用技能（综合威力升序）\n`,table(['技能','威力阶','基础击杀需求','伤害/收益','范围','持续','真实机制'],catalog.chronicles.genericSkills.map(s=>[s.id+' / '+s.name,s.powerTier,s.killCharge,s.damage,s.range,s.duration,s.effect])),
    '## 六关固定曲线\n',table(['关 / 大首领','小首领 / HP','大首领 HP','普通兵HP倍率','五波投入成本/秒','目标Boss前金币'],stages.STAGES.map((d,i)=>[d.name+' / '+d.boss,d.miniBoss+' / '+d.miniBossHp,d.bossHp,d.ordinaryHpFactor,[1,2,3,4,5].map(w=>stages.stageThreat(i+1,w)).join(' / '),d.targetPreBossBudget])),
    '\n每波普通兵HP倍率0.8/0.95/1/1.1/1.1；移速只随关卡微增，预警与弹速不加快。Boss不读取装备动态抬血。经济与完成率仍需手机实测。\n',

    '## 40类敌兵标准数值\n',table(['ID / 名称','首登','标准HP','首登关第1波HP','基速','攻击周期 / 前摇','射程','成本 / 金币','机制'],catalog.chronicles.enemies.map(e=>[e.id+' / '+e.name,e.firstStage,e.hp,e.firstChapterValues.hp,e.speed,e.cycle+' / '+e.windup,e.range,e.cost+' / '+e.coins,e.mechanic])),
    '\n无隐藏等级成长、无经验换币。旧enemyKind/enemyStats曲线仅兼容测试；正式出兵使用chronicles.ts。首领技能与当前可携带通用技能完整字段见catalog.json和expansion-v4.md。购物路径模型见docs/chronicle-balance.json，不等于真人存活率。\n',
    '## 商店价格与刷新\n', table(['章节', '基础价', '草鞋 I/II/III/IV', '突突枪 I/II/III/IV'], catalog.economy.prices.map(row => [row.chapter, row.basePrice, row.weaponPrices.sandal.join(' / '), row.weaponPrices.smg.join(' / ')])),
    '\n无折扣样本，按固定章节指数 `min(5,1.07^(章−1))` 调用现行商店价格函数，不使用旧八关商店价格。\n',
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
  if (!root || !fs.existsSync(path.join(root, 'assets/scripts/GameBootstrap.ts'))) throw Error('找不到桃园小英雄仓库，请提供 --project');
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
