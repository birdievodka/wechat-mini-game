import type {BossAction} from './chronicles';

export const REFORGED_BOSSES=['zhangjiao','dongzhuo','yuanshao','caocao','menghuo','simayi'];
const a=(name:string,kind:BossAction['kind'],cd:number,windup:number,description:string,extra:Partial<BossAction>={}):BossAction=>({name,kind,cd,windup,description,...extra});
/** Actual contracts shared by codex, actor controller and the encounter runtime. */
export const REFORGED_ACTIONS:Record<string,BossAction[]>={
 zhangjiao:[a('黄符定雷','zones',2.6,.85,'锁定落点R76 · 黄符聚能后落雷\n落点不追踪，击中一次',{radius:76,count:1}),a('三才雷阵','zones',6,.85,'三处R70 · 间隔0.45秒依次落雷\n沿同一横列展开，前后可避',{radius:70,count:3,delay:.45}),a('太平雷狱','flag',13,1,'三枚雷符各84生命 · 存留7秒\n雷链逐条预告0.9秒，可拆符切断',{count:3,duration:7})],
 dongzhuo:[a('金印镇地','zones',5.2,1.1,'锁定落点R135 · 1.1秒抬印\n印玺落地才伤害，余尘无伤',{radius:135,count:1}),a('赤铜横财','shots',6.8,.95,'四枚大铜钱错时滚过 · 速度230\n两侧各两枚，中间留160通道',{count:4,speed:230}),a('酒池焚阵','zones',12,1.05,'三坛酒依次落地，0.45秒后燃烧\n火池R78持续2秒，每1.2秒至多一击',{count:3,radius:78,duration:2})],
 yuanshao:[a('四世箭阵','summon',5,1,'本体五箭扇射＋四弓手两轮齐射\n箭速340；弓手可击杀，箭阵保留缺口',{count:4,units:['E11'],speed:340}),a('官渡弩阵','summon',8.5,1.1,'耐久弩车交替三连重弩，箭速360\n同步锁定一圈箭雨，预警后落地',{count:2,units:['E35'],duration:8.5,radius:94}),a('万军齐射','summon',10.5,1.1,'半血：三轮变向箭墙＋三处错时箭雨\n箭雨R92、落点固定；离开圈后再穿缺口',{count:4,speed:340,radius:92})],
 caocao:[a('倚天连刃','shots',4.5,.9,'一刃起手、双刃交叉、双刃追压\n三拍共五道银锋，速度340，锁向不追尾',{count:5,speed:340,delay:.5}),a('疑兵换影','clone',7,.95,'本体横移160，两纸影蓄势后各斩一道剑气\n原位置出现R145剑阵；纸影可击杀阻止出招',{count:2,duration:5.5,radius:145}),a('虎豹合围','summon',10,1.1,'两名耐久虎豹骑错开1.3秒锁向冲锋\n本体三段剑气＋R160落剑，横向走位避让',{count:2,units:['E21'],speed:520,radius:160})],
 menghuo:[a('猪突猛进','summon',8,1,'四头战猪从远处列阵，刨地0.55秒\n速度520直冲1.25秒；冲锋无敌，收招可攻击',{count:4,speed:520}),a('群狼围猎','summon',10,1,'三狼绕侧包抄，伏身0.75秒后锁向扑击\n速度660；扑击无敌，结束后恢复可受伤',{count:3,speed:660}),a('万象开道','summon',14,1.2,'两象错开1.5秒，踏地蓄势0.8秒\n速度380冲锋1.45秒；冲锋无敌，收招可攻击',{count:2,speed:380})],
 simayi:[a('落子成灾','zones',4.8,.8,'三枚棋子R78 · 每隔0.28秒落地\n首枚0.8秒预告，落点锁定，余光无伤',{count:3,radius:78,delay:.28}),a('阴阳双龙','shots',8,.85,'黑白双龙沿固定曲线穿场\n速度260 · 中央180宽安全通道保留',{count:2,speed:260}),a('五丈星劫','zones',10.5,.9,'三枚星石R92 · 每隔0.35秒落下\n首枚0.9秒预告，不覆盖整张棋盘',{count:3,radius:92,delay:.35})],
};
export const BOSS_UNIT_HP:Record<string,number>={sigil:.55,bowman:.65,cart:3,decoy:.7,rider:1.6,boar:1.2,wolf:.95,elephant:2.4};
export const BOSS_UNIT_LIMIT=12,BOSS_BEAST_LIMIT=6,BOSS_MAIN_LIMIT=4;
export const isReforgedBoss=(id?:string):boolean=>!!id&&REFORGED_BOSSES.indexOf(id)>=0;
