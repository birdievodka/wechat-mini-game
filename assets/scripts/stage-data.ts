/** v8 fixed stages: balance is independent of player equipment. */
export const STARTER_WEAPONS = ['sandal','pole','cleaver'] as const;
export const VISIBLE_HERO_IDS = ['liubei','guanyu','zhangfei'] as const;
export const INITIAL_CONTENT = {"weapons": ["sandal", "pole", "cleaver"], "passives": ["A01", "A02", "A03", "A04", "A05", "A06", "B01", "B02", "B03", "B07", "B08", "C01", "C04", "C05", "C07", "C08", "D01", "D02", "D09", "D10", "D20", "E01", "E02", "E03"], "skills": ["G08", "G01", "G03"]} as const;
export const STAGES = [
  {
    "id": "S01",
    "name": "黄巾起义",
    "unlock": "default-open",
    "waves": 5,
    "boss": "zhangjiao",
    "miniBoss": "黄巾冲锋三将",
    "roster": [
      "E01",
      "E11",
      "E15",
      "E39"
    ],
    "ordinaryHpFactor": 1,
    "spawnCostPerSecond": 2,
    "miniBossHp": 2400,
    "bossHp": 5700,
    "targetPreBossBudget": 403,
    "firstClear": {
      "weapons": [
        "taiping-book",
        "thunder",
        "gourd",
        "seven-saber",
        "peach",
        "firecracker"
      ],
      "passives": [
        "A07",
        "B04",
        "B05",
        "D03",
        "D04",
        "F01"
      ],
      "skills": [
        "G18",
        "G10"
      ]
    },
    "targetWaveIncome": [
      70,
      90,
      85,
      130
    ]
  },
  {
    "id": "S02",
    "name": "虎牢讨董",
    "unlock": "current hero clears previous stage",
    "waves": 5,
    "boss": "dongzhuo",
    "miniBoss": "吕布",
    "roster": [
      "E02",
      "E03",
      "E04",
      "E19",
      "E23",
      "E17",
      "E06",
      "E18"
    ],
    "ordinaryHpFactor": 1.14,
    "spawnCostPerSecond": 2.5,
    "miniBossHp": 3000,
    "bossHp": 8550,
    "targetPreBossBudget": 493,
    "firstClear": {
      "weapons": [
        "halberd",
        "guandao",
        "serpent-spear",
        "chain-hook",
        "sword",
        "twin-swords",
        "silver-spear"
      ],
      "passives": [
        "A08",
        "B06",
        "C02",
        "D15",
        "F02",
        "F04"
      ],
      "skills": [
        "G12",
        "G20"
      ]
    },
    "targetWaveIncome": [
      75,
      105,
      105,
      180
    ]
  },
  {
    "id": "S03",
    "name": "官渡争锋",
    "unlock": "current hero clears previous stage",
    "waves": 5,
    "boss": "yuanshao",
    "miniBoss": "河北戟将",
    "roster": [
      "E08",
      "E09",
      "E10",
      "E12",
      "E14",
      "E22",
      "E35",
      "E36"
    ],
    "ordinaryHpFactor": 1.3,
    "spawnCostPerSecond": 3.05,
    "miniBossHp": 3840,
    "bossHp": 11280,
    "targetPreBossBudget": 603,
    "firstClear": {
      "weapons": [
        "phoenix-bow",
        "heavy-crossbow",
        "repeater",
        "trident",
        "caltrops",
        "hand-halberd",
        "feather-fan"
      ],
      "passives": [
        "C03",
        "C06",
        "D06",
        "D11",
        "D12",
        "D14"
      ],
      "skills": [
        "G07",
        "G25"
      ]
    },
    "targetWaveIncome": [
      95,
      130,
      125,
      225
    ]
  },
  {
    "id": "S04",
    "name": "赤壁鏖兵",
    "unlock": "current hero clears previous stage",
    "waves": 5,
    "boss": "caocao",
    "miniBoss": "虎豹先锋",
    "roster": [
      "E05",
      "E07",
      "E13",
      "E21",
      "E29",
      "E30",
      "E31",
      "E33"
    ],
    "ordinaryHpFactor": 1.48,
    "spawnCostPerSecond": 3.65,
    "miniBossHp": 4900,
    "bossHp": 14560,
    "targetPreBossBudget": 713,
    "firstClear": {
      "weapons": [
        "qinggang",
        "yitian",
        "ancient-saber",
        "twin-halberds",
        "smg",
        "oil-jar"
      ],
      "passives": [
        "D07",
        "D13",
        "D16",
        "D19",
        "F05",
        "F08"
      ],
      "skills": [
        "G26"
      ]
    },
    "targetWaveIncome": [
      110,
      155,
      145,
      275
    ]
  },
  {
    "id": "S05",
    "name": "南中平蛮",
    "unlock": "current hero clears previous stage",
    "waves": 5,
    "boss": "menghuo",
    "miniBoss": "象兵统领",
    "roster": [
      "E24",
      "E25",
      "E26",
      "E27",
      "E28"
    ],
    "ordinaryHpFactor": 1.67,
    "spawnCostPerSecond": 4.3,
    "miniBossHp": 6270,
    "bossHp": 18480,
    "targetPreBossBudget": 813,
    "firstClear": {
      "weapons": [
        "shotgun",
        "rocket",
        "thunder-bomb",
        "wood-ox"
      ],
      "passives": [
        "E04",
        "E05",
        "E06",
        "E07",
        "D17",
        "D18"
      ],
      "skills": [
        "G19"
      ]
    },
    "targetWaveIncome": [
      125,
      180,
      160,
      320
    ]
  },
  {
    "id": "S06",
    "name": "五丈原决战",
    "unlock": "current hero clears previous stage",
    "waves": 5,
    "boss": "simayi",
    "miniBoss": "阵法军师",
    "roster": [
      "E08",
      "E16",
      "E20",
      "E32",
      "E34",
      "E37",
      "E38",
      "E40",
      "E14"
    ],
    "ordinaryHpFactor": 1.88,
    "spawnCostPerSecond": 5,
    "miniBossHp": 7600,
    "bossHp": 23400,
    "targetPreBossBudget": 918,
    "firstClear": {
      "weapons": [
        "star-lamps",
        "bagua",
        "wood-kite"
      ],
      "passives": [
        "D05",
        "D08",
        "E08",
        "F03",
        "F06",
        "F07"
      ],
      "skills": [
        "G22"
      ]
    },
    "targetWaveIncome": [
      145,
      205,
      175,
      365
    ]
  }
] as const;
export const stageFor=(n:number)=>STAGES[Math.max(0,Math.min(5,Math.floor(n)-1))];
export const waveSeconds=(wave:number)=>[45,45,60,60,Infinity][Math.max(0,Math.min(4,wave-1))];
export const stageThreat=(n:number,wave:number)=>stageFor(n).spawnCostPerSecond*[.75,.95,.60,1.2,1.2][Math.max(0,Math.min(4,wave-1))];
export const stageEnemyHp=(base:number,n:number,wave:number)=>Math.round(base*stageFor(n).ordinaryHpFactor*[.8,.95,1,1.1,1.1][Math.max(0,Math.min(4,wave-1))]);
export const stageStipend=(n:number,wave:number)=>wave===1?Math.ceil(1.25*(20+2*(n-1))):wave===2?Math.ceil(1.25*(25+3*(n-1))):wave===3?25+5*(n-1):wave===4?Math.ceil(1.25*(35+5*(n-1))):0;
export const miniArchetype=(n:number)=>['E06','','E08','E21','E25','E40'][n-1]||'E06';
export const STAGE_THEMES=[
 {ground:'#ffffff',accent:'#d3b24e',name:'黄巾原野'},
 {ground:'#f2cf97',accent:'#bd7146',name:'虎牢关前'},
 {ground:'#b8d3cf',accent:'#5a86a5',name:'官渡军营'},
 {ground:'#8ba6be',accent:'#dc8d62',name:'赤壁月夜'},
 {ground:'#91c99c',accent:'#5f9266',name:'南中林地'},
 {ground:'#b1a6ca',accent:'#a0a7d3',name:'五丈星原'},
] as const;

export const bossDisplayName=(id:string)=>({zhangjiao:'张角',lvbu:'吕布',dongzhuo:'董卓',yuanshao:'袁绍',caocao:'曹操',menghuo:'孟获',simayi:'司马懿'} as Record<string,string>)[id]||id;

/** Explicit per-wave composition; ranged cost share rises, total threat/count budgets stay fixed. */
export const STAGE_RANGED_COST_SHARE=[.24,.30,.38,.40,.38,.42];
export const STAGE_WAVE_ROSTERS:string[][][]=[
 [['E01','E11'],['E01','E11'],['E01','E11'],['E01','E11','E15','E39'],['E01','E11','E15','E39']],
 [['E02','E03','E17'],['E02','E03','E04','E19','E17'],['E02','E03','E17'],['E02','E04','E23','E17','E06','E18'],['E02','E03','E04','E19','E23','E17']],
 [['E08','E12'],['E08','E12','E09','E10'],['E08','E12'],['E08','E14','E22','E35','E36'],['E08','E12','E14','E22']],
 [['E05','E13'],['E05','E13','E29','E30','E21'],['E05','E13'],['E05','E31','E33','E07'],['E05','E13','E21','E29']],
 [['E26','E28'],['E26','E27','E28','E24'],['E26','E28'],['E26','E27','E28','E25'],['E26','E27','E28','E24']],
 [['E08','E16','E20'],['E08','E32','E34','E40'],['E08','E16','E20'],['E08','E16','E37','E38','E14'],['E08','E16','E20','E32','E40']],
];
export const STAGE_SHOOTERS=['E11','E12','E13','E14','E15','E16','E17','E18','E22','E23','E28','E31','E32','E35'];
export function pickStageUnit(pool:string[],random:number):string|undefined {let total=0;for(const id of pool)total+=STAGE_SHOOTERS.includes(id)?1.5:1;let t=Math.max(0,Math.min(.999999,random))*total;for(const id of pool){t-=STAGE_SHOOTERS.includes(id)?1.5:1;if(t<0)return id;}return pool[pool.length-1];}
