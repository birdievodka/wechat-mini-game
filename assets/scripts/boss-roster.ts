import type {BossAction} from './chronicles';

export const REFORGED_BOSSES=['zhangjiao','dongzhuo','yuanshao','caocao','menghuo','simayi'];
const a=(name:string,kind:BossAction['kind'],cd:number,windup:number,description:string,extra:Partial<BossAction>={}):BossAction=>({name,kind,cd,windup,description,...extra});
/** Actual contracts shared by codex, actor controller and the encounter runtime. */
export const REFORGED_ACTIONS:Record<string,BossAction[]>={
 zhangjiao:[a('黄符定雷','zones',2.6,.85,'锁定落点R76 · 黄符聚能后落雷\n落点不追踪，击中一次',{radius:76,count:1}),a('三才雷阵','zones',6,.85,'三处R70 · 间隔0.45秒依次落雷\n沿同一横列展开，前后可避',{radius:70,count:3,delay:.45}),a('太平雷狱','flag',13,1,'三枚雷符各84生命 · 存留7秒\n雷链逐条预告0.9秒，可拆符切断',{count:3,duration:7})],
 dongzhuo:[a('金印镇地','zones',5.2,1.1,'锁定落点R135 · 1.1秒抬印\n印玺落地才伤害，余尘无伤',{radius:135,count:1}),a('赤铜横财','shots',6.8,.95,'四枚大铜钱错时滚过 · 速度230\n两侧各两枚，中间留160通道',{count:4,speed:230}),a('酒池焚阵','zones',12,1.05,'三坛酒依次落地，0.45秒后燃烧\n火池R78持续2秒，每1.2秒至多一击',{count:3,radius:78,duration:2})],
 yuanshao:[a('四世箭阵','summon',7.2,1,'列阵1秒＋绷弦0.7秒 · 四箭齐射\n平行箭速280，中央180宽通道',{count:4,units:['E11'],speed:280}),a('官渡弩阵','summon',12,1.1,'两台可拆弩车，各520生命\n交替上弦1秒，重弩速度300，7秒后撤',{count:2,units:['E35'],duration:7}),a('万军齐射','summon',13,1.1,'列阵1.1秒＋绷弦0.7秒 · 三轮箭墙\n令旗变向后再放箭，缺口始终可见',{count:4,speed:280})],
 caocao:[a('倚天连刃','shots',5.5,.9,'两道银锋错时飞行，间隔0.65秒\n速度290 · 刃宽68，锁向不追踪',{count:2,speed:290,delay:.65}),a('疑兵换影','clone',10,1,'本体横移120 · 留两个纸影5秒\n纸影各90生命、可打散，不隐身不免伤',{count:2,duration:5}),a('虎豹合围','summon',13,1.1,'两骑分别蓄势后锁向直冲\n错开1.3秒，本体最后补一道剑气',{count:2,units:['E21'],speed:440})],
 menghuo:[a('猪突猛进','summon',8,1,'四头战猪各438生命 · 速度320\n刨地蓄势后直冲，击倒可打开缺口',{count:4,speed:320}),a('群狼围猎','summon',10,1,'三狼各275生命 · 先绕两侧包抄\n各自再伏身0.9秒，锁旧位置扑击',{count:3}),a('万象开道','summon',14,1.2,'两象各1125生命 · 速度230\n前后错开1.5秒，直线重踏后离场',{count:2,speed:230})],
 simayi:[a('落子成灾','zones',6,1,'三枚棋子R78 · 间隔0.4秒落地\n落点锁定、中央预告、落后0.55秒收光',{count:3,radius:78,delay:.4}),a('阴阳双龙','shots',10,1.1,'黑白双龙沿固定曲线穿场\n速度210 · 中间最窄安全通道180',{count:2,speed:210}),a('五丈星劫','zones',13,1.15,'三枚星石R92 · 间隔0.55秒落下\n格点预告、不覆盖整张棋盘',{count:3,radius:92,delay:.55})],
};
export const BOSS_UNIT_HP:Record<string,number>={sigil:.55,bowman:.18,cart:.8,decoy:.1,rider:.45,boar:.35,wolf:.22,elephant:.9};
export const BOSS_UNIT_LIMIT=12,BOSS_BEAST_LIMIT=6,BOSS_MAIN_LIMIT=4;
export const isReforgedBoss=(id?:string):boolean=>!!id&&REFORGED_BOSSES.indexOf(id)>=0;
