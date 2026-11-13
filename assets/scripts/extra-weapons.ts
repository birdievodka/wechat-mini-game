import type { WeaponDefinition, WeaponId, WeaponStats, Evolution } from './weapons';
export const EXTRA_WEAPONS:(WeaponDefinition & {unlock:number})[] = [
  {
    "id": "twin-swords",
    "name": "双股剑",
    "category": "melee",
    "starter": false,
    "damage": 18.0,
    "interval": 0.52,
    "range": 145.0,
    "arc": 110.0,
    "knockback": 130.0,
    "crit": 0.1,
    "speed": 0.0,
    "area": 0.0,
    "price": 32.0,
    "unlock": 1,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "双剑交替 · 宽扫"
  },
  {
    "id": "guandao",
    "name": "青龙偃月刀",
    "category": "melee",
    "starter": false,
    "damage": 50.0,
    "interval": 1.15,
    "range": 200.0,
    "arc": 150.0,
    "knockback": 260.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 0.0,
    "price": 46.0,
    "unlock": 2,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "青龙宽扫 · 高阶第三击刃波"
  },
  {
    "id": "serpent-spear",
    "name": "丈八蛇矛",
    "category": "melee",
    "starter": false,
    "damage": 30.0,
    "interval": 0.7,
    "range": 240.0,
    "arc": 45.0,
    "knockback": 160.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 0.0,
    "price": 42.0,
    "unlock": 2,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "长距离直刺 · 高阶双刺"
  },
  {
    "id": "halberd",
    "name": "方天画戟",
    "category": "melee",
    "starter": false,
    "damage": 42.0,
    "interval": 1.1,
    "range": 210.0,
    "arc": 160.0,
    "knockback": 220.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 0.0,
    "price": 48.0,
    "unlock": 2,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "画戟横扫 · 高阶追加追斩"
  },
  {
    "id": "silver-spear",
    "name": "龙胆银枪",
    "category": "melee",
    "starter": false,
    "damage": 22.0,
    "interval": 0.48,
    "range": 220.0,
    "arc": 35.0,
    "knockback": 120.0,
    "crit": 0.1,
    "speed": 0.0,
    "area": 0.0,
    "price": 42.0,
    "unlock": 8,
    "pierce": 0,
    "critMultiplier": 1.75,
    "desc": "银枪连刺 · 同组共享命中次数"
  },
  {
    "id": "qinggang",
    "name": "青釭剑",
    "category": "melee",
    "starter": false,
    "damage": 26.0,
    "interval": 0.58,
    "range": 155.0,
    "arc": 100.0,
    "knockback": 100.0,
    "crit": 0.1,
    "speed": 0.0,
    "area": 0.0,
    "price": 40.0,
    "unlock": 8,
    "pierce": 0,
    "critMultiplier": 1.75,
    "desc": "剑斩破盾 · 忽略部分减伤"
  },
  {
    "id": "yitian",
    "name": "倚天剑",
    "category": "melee",
    "starter": false,
    "damage": 36.0,
    "interval": 0.8,
    "range": 175.0,
    "arc": 120.0,
    "knockback": 170.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 0.0,
    "price": 48.0,
    "unlock": 10,
    "pierce": 0,
    "critMultiplier": 1.7,
    "desc": "四击一月牙 · 近斩与刃波"
  },
  {
    "id": "seven-saber",
    "name": "七星宝刀",
    "category": "melee",
    "starter": false,
    "damage": 24.0,
    "interval": 0.62,
    "range": 145.0,
    "arc": 95.0,
    "knockback": 100.0,
    "crit": 0.18,
    "speed": 0.0,
    "area": 0.0,
    "price": 38.0,
    "unlock": 3,
    "pierce": 0,
    "critMultiplier": 2,
    "desc": "七击洒星 · 同敌最多2星"
  },
  {
    "id": "ancient-saber",
    "name": "古锭刀",
    "category": "melee",
    "starter": false,
    "damage": 46.0,
    "interval": 1.05,
    "range": 175.0,
    "arc": 150.0,
    "knockback": 240.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 0.0,
    "price": 44.0,
    "unlock": 4,
    "pierce": 0,
    "critMultiplier": 1.6,
    "desc": "重斩 · 首击额外伤害"
  },
  {
    "id": "twin-halberds",
    "name": "双铁戟",
    "category": "melee",
    "starter": false,
    "damage": 21.0,
    "interval": 0.56,
    "range": 150.0,
    "arc": 130.0,
    "knockback": 170.0,
    "crit": 0.08,
    "speed": 0.0,
    "area": 0.0,
    "price": 44.0,
    "unlock": 6,
    "pierce": 0,
    "critMultiplier": 1.6,
    "desc": "双戟连续横扫 · 范围全部命中"
  },
  {
    "id": "trident",
    "name": "三尖刀",
    "category": "melee",
    "starter": false,
    "damage": 34.0,
    "interval": 0.85,
    "range": 195.0,
    "arc": 135.0,
    "knockback": 190.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 0.0,
    "price": 42.0,
    "unlock": 4,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "三尖横扫 · 高阶侧刃"
  },
  {
    "id": "caltrops",
    "name": "铁蒺藜",
    "category": "ranged",
    "starter": false,
    "damage": 10.0,
    "interval": 1.2,
    "range": 260.0,
    "arc": 0.0,
    "knockback": 20.0,
    "crit": 0.05,
    "speed": 320.0,
    "area": 35.0,
    "price": 30.0,
    "unlock": 5,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "自动布陷阱 · 同敌1秒一次"
  },
  {
    "id": "repeater",
    "name": "诸葛连弩",
    "category": "ranged",
    "starter": false,
    "damage": 8.0,
    "interval": 0.65,
    "range": 430.0,
    "arc": 0.0,
    "knockback": 45.0,
    "crit": 0.05,
    "speed": 480.0,
    "area": 0.0,
    "price": 40.0,
    "unlock": 7,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "连弩逐发 · 同敌命中有上限"
  },
  {
    "id": "phoenix-bow",
    "name": "麒麟弓",
    "category": "ranged",
    "starter": false,
    "damage": 30.0,
    "interval": 0.95,
    "range": 540.0,
    "arc": 0.0,
    "knockback": 70.0,
    "crit": 0.1,
    "speed": 600.0,
    "area": 0.0,
    "price": 38.0,
    "unlock": 11,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "强弓扇射 · 同敌每轮一箭"
  },
  {
    "id": "heavy-crossbow",
    "name": "贯石弩",
    "category": "ranged",
    "starter": false,
    "damage": 55.0,
    "interval": 1.6,
    "range": 650.0,
    "arc": 0.0,
    "knockback": 150.0,
    "crit": 0.05,
    "speed": 760.0,
    "area": 0.0,
    "price": 44.0,
    "unlock": 6,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "直线贯穿 · 后续目标85%伤害"
  },
  {
    "id": "hand-halberd",
    "name": "手戟",
    "category": "ranged",
    "starter": false,
    "damage": 22.0,
    "interval": 0.62,
    "range": 340.0,
    "arc": 0.0,
    "knockback": 120.0,
    "crit": 0.05,
    "speed": 480.0,
    "area": 0.0,
    "price": 34.0,
    "unlock": 9,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "飞出与返回 · 每程各一次"
  },
  {
    "id": "chain-hook",
    "name": "锁链钩",
    "category": "ranged",
    "starter": false,
    "damage": 20.0,
    "interval": 0.9,
    "range": 320.0,
    "arc": 0.0,
    "knockback": 90.0,
    "crit": 0.05,
    "speed": 550.0,
    "area": 0.0,
    "price": 36.0,
    "unlock": 12,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "连钩聚敌 · 不拉入身体"
  },
  {
    "id": "oil-jar",
    "name": "火油壶",
    "category": "magic",
    "starter": false,
    "damage": 18.0,
    "interval": 1.8,
    "range": 360.0,
    "arc": 0.0,
    "knockback": 50.0,
    "crit": 0.05,
    "speed": 300.0,
    "area": 85.0,
    "price": 34.0,
    "unlock": 7,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "火油地面 · 同敌共享叠火上限"
  },
  {
    "id": "thunder-bomb",
    "name": "震天雷",
    "category": "magic",
    "starter": false,
    "damage": 60.0,
    "interval": 2.1,
    "range": 400.0,
    "arc": 0.0,
    "knockback": 280.0,
    "crit": 0.05,
    "speed": 340.0,
    "area": 115.0,
    "price": 44.0,
    "unlock": 13,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "范围爆破 · 外圈55%伤害"
  },
  {
    "id": "feather-fan",
    "name": "白羽扇",
    "category": "magic",
    "starter": false,
    "damage": 18.0,
    "interval": 0.75,
    "range": 380.0,
    "arc": 0.0,
    "knockback": 150.0,
    "crit": 0.05,
    "speed": 380.0,
    "area": 0.0,
    "price": 34.0,
    "unlock": 7,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "风羽扇射 · 同敌每轮一次"
  },
  {
    "id": "taiping-book",
    "name": "太平要术",
    "category": "magic",
    "starter": false,
    "damage": 38.0,
    "interval": 1.3,
    "range": 420.0,
    "arc": 0.0,
    "knockback": 100.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 70.0,
    "price": 38.0,
    "unlock": 1,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "黄符锁定 · 落印爆散不重复伤害"
  },
  {
    "id": "star-lamps",
    "name": "七星灯",
    "category": "magic",
    "starter": false,
    "damage": 12.0,
    "interval": 0.5,
    "range": 160.0,
    "arc": 0.0,
    "knockback": 35.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 0.0,
    "price": 46.0,
    "unlock": 16,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "七星灯阵 · 同敌不按灯数叠加"
  },
  {
    "id": "bagua",
    "name": "八阵图",
    "category": "magic",
    "starter": false,
    "damage": 25.0,
    "interval": 1.4,
    "range": 400.0,
    "arc": 0.0,
    "knockback": 60.0,
    "crit": 0.05,
    "speed": 0.0,
    "area": 100.0,
    "price": 44.0,
    "unlock": 13,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "自动布阵 · 入阵伤害并减速"
  },
  {
    "id": "wood-ox",
    "name": "木牛机关",
    "category": "ranged",
    "starter": false,
    "damage": 9.0,
    "interval": 0.3,
    "range": 350.0,
    "arc": 0.0,
    "knockback": 25.0,
    "crit": 0.05,
    "speed": 500.0,
    "area": 0.0,
    "price": 42.0,
    "unlock": 15,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "木牛自动点射 · 全场随从最多12"
  },
  {
    "id": "wood-kite",
    "name": "木鸢飞翼",
    "category": "ranged",
    "starter": false,
    "damage": 16.0,
    "interval": 0.9,
    "range": 450.0,
    "arc": 0.0,
    "knockback": 70.0,
    "crit": 0.05,
    "speed": 430.0,
    "area": 0.0,
    "price": 40.0,
    "unlock": 15,
    "pierce": 0,
    "critMultiplier": 1.5,
    "desc": "木鸢穿行 · 每只同敌一次"
  }
];
export const EXTRA_EVOLUTION:Record<string,Evolution>={
  "twin-swords": {
    "arc": [
      110,
      130,
      150,
      170
    ]
  },
  "guandao": {
    "arc": [
      150,
      170,
      190,
      210
    ]
  },
  "serpent-spear": {
    "arc": [
      45,
      55,
      65,
      75
    ]
  },
  "halberd": {
    "arc": [
      160,
      180,
      200,
      220
    ]
  },
  "silver-spear": {},
  "qinggang": {},
  "yitian": {},
  "seven-saber": {},
  "ancient-saber": {},
  "twin-halberds": {},
  "trident": {},
  "caltrops": {},
  "repeater": {
    "shots": [
      3,
      4,
      5,
      6
    ],
    "pierce": [
      1,
      2,
      2,
      2
    ]
  },
  "phoenix-bow": {
    "shots": [
      1,
      1,
      2,
      3
    ],
    "crit": [
      0,
      0.03,
      0.03,
      0.03
    ]
  },
  "heavy-crossbow": {
    "pierce": [
      2,
      3,
      4,
      5
    ]
  },
  "hand-halberd": {},
  "chain-hook": {
    "bounce": [
      0,
      1,
      2,
      3
    ]
  },
  "oil-jar": {
    "area": [
      85,
      95,
      105,
      115
    ]
  },
  "thunder-bomb": {
    "area": [
      115,
      130,
      145,
      165
    ]
  },
  "feather-fan": {
    "shots": [
      2,
      3,
      3,
      5
    ]
  },
  "taiping-book": {
    "chain": [
      1,
      2,
      3,
      4
    ]
  },
  "star-lamps": {
    "shots": [
      3,
      4,
      6,
      7
    ]
  },
  "bagua": {},
  "wood-ox": {
    "shots": [
      1,
      2,
      2,
      3
    ]
  },
  "wood-kite": {
    "shots": [
      1,
      1,
      2,
      2
    ],
    "pierce": [
      3,
      3,
      3,
      3
    ]
  }
};
const FACTORS:Record<string,number[]>={"guandao": [1, 1, 1.1166666666666667, 1.1666666666666667], "serpent-spear": [1, 1, 1.3, 1.5], "halberd": [1, 1, 1.25, 1.4], "silver-spear": [1, 1.1, 1.2, 1.35], "yitian": [1.075, 1.1, 1.125, 1.1625], "seven-saber": [1.0342857142857143, 1.0457142857142858, 1.0571428571428572, 1.0714285714285714], "twin-halberds": [1.1, 1.2, 1.3, 1.4], "trident": [1, 1, 1.2, 1.3], "repeater": [2, 2, 3, 3], "hand-halberd": [1.1, 1.2, 1.3, 1.4], "oil-jar": [1.2, 1.2, 1.2, 1.2], "wood-ox": [1, 1.1, 1.2, 1.35], "wood-kite": [1, 1, 1.2, 1.5]};
export const isExtraWeapon=(id:string)=>EXTRA_WEAPONS.some(w=>w.id===id);
export const extraHitFactor=(id:string,tier:number)=>(FACTORS[id]||[1,1,1,1])[tier-1];
/** Text uses the same tier and hit budgets as the battle routes. D is the displayed damage basis. */
export function extraMechanics(id:WeaponId,tier:number):string {
 const q=tier-1;
 const text:Record<string,string>={
  'twin-swords':`双剑交替，单轮1D；扫角${[110,130,150,170][q]}°，范围内全体受伤。`,
  guandao:`扫角${[150,170,190,210][q]}°；${q<2?'单次宽扫1D':`每第3击额外发射${[0,0,.35,.5][q]}D刃波，射程300、同敌一次`}。`,
  'serpent-spear':q<2?'长矛单刺1D，窄区内全体命中。':`每轮双刺，每刺${q===2?.65:.75}D，两刺分别结算。`,
  halberd:q<2?'画戟宽扫1D，范围内全体受伤。':`宽扫1D后追加${q===2?.25:.4}D追斩；追加不会再生追斩。`,
  'silver-spear':[`每轮单刺1D。`,`每轮两刺，各0.55D。`,`每轮两刺，各0.60D。`,`每轮三刺，各0.45D。`][q]+'攻击组随攻速压缩，不无限排队。',
  qinggang:`忽略盾兵减伤的${[20,30,40,50][q]}%；例如40%减伤变为${[32,28,24,20][q]}%。`,
  yitian:`每第4击附加${[.3,.4,.5,.65][q]}D月牙，射程300；同敌可吃横扫与月牙各一次。`,
  'seven-saber':`每第7击洒出7星，每星${[.12,.16,.2,.25][q]}D；同敌最多2星。`,
  'ancient-saber':`对同目标首击额外${[15,20,25,30][q]}%；同敌每2秒才能再次触发。`,
  'twin-halberds':`每轮双扫，每扫${[.55,.6,.65,.7][q]}D；两扫各命中范围内全部敌人。`,
  trident:q<2?'三尖刀单轮宽扫1D。':`宽扫1D，另发两片${q===2?.2:.3}D侧刃；同敌最多吃一片侧刃。`,
  caltrops:`自动铺设3秒陷阱，每武器最多${[3,4,5,6][q]}枚、全场12枚；同敌每武器每秒至多1D。`,
  repeater:`每轮${[3,4,5,6][q]}矢，同敌最多${[2,2,3,3][q]}矢；穿透${q?2:1}人，组内间隔随攻速压缩。`,
  'phoenix-bow':`${[1,1,2,3][q]}箭扇射，同敌每轮最多1箭；${q?'暴击率额外+3个百分点。':'高阶增加覆盖。'}`,
  'heavy-crossbow':`单矢最多穿过${[3,4,5,6][q]}名敌人；首敌1D，后续各0.85D。`,
  'hand-halberd':`飞出与回程各${[.55,.6,.65,.7][q]}D，同敌每程一次；回程沿真实路径。`,
  'chain-hook':`最多连${tier}名敌人，拉近${[90,105,120,135][q]}；距离90内不拉，Boss只受6%拉力。`,
  'oil-jar':`火场1.2秒，每0.5秒0.4D；全队同敌每0.5秒最多2次油火，六壶共享上限。`,
  'thunder-bomb':'直击与爆炸共享一次命中；外圈默认55%伤害，可受道具改变；不再生子炸弹。',
  'feather-fan':`${[2,3,3,5][q]}片风羽，同敌每轮1次；${q>=2?`击退额外+${q===2?15:25}%。`:'增加扇面覆盖。'}`,
  'taiping-book':`标记${tier}个不同目标，0.25秒后R70落符；同敌本轮符伤和爆散合计一次。`,
  'star-lamps':`${[3,4,6,7][q]}盏灯环绕；每轮同敌一次1D，不按灯数叠伤。半径${[160,175,190,210][q]}。`,
  bagua:`阵地1秒，进入伤害一次；减速${[20,25,30,35][q]}%，Boss最多10%；每武器2阵，全场8阵。`,
  'wood-ox':`${[1,2,2,3][q]}台木牛，每台每轮${[1,.55,.6,.45][q]}D；全场最多12台。`,
  'wood-kite':`${[1,1,2,2][q]}只木鸢，每只${[1,1,.6,.75][q]}D；各穿透4名敌人，同敌单鸢一次。`,
 };
 return text[id]||'';
}
export function extraEffectText(id:WeaponId,s:WeaponStats):string {
 const d=EXTRA_WEAPONS.find(w=>w.id===id)!;
 return d.desc+'\n'+(s.arc?Math.round(s.arc)+'° · 范围内全体命中':s.area?'范围 '+Math.round(s.area):'射程 '+Math.round(s.range));
}
