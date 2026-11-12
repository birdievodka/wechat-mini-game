import { WeaponId, weaponFor } from './weapons';
export interface PassiveItem { id: string; name: string; desc: string; price: number; stack: string; bonus: {}; slot: 'waist'; }
const ROWS = [
  {
    "id": "A01",
    "name": "暴脾气辣椒",
    "desc": "所有武器伤害+18%",
    "price": 1.0,
    "stack": "A"
  },
  {
    "id": "A02",
    "name": "打鸡血头带",
    "desc": "武器攻速+15%",
    "price": 1.0,
    "stack": "A"
  },
  {
    "id": "A03",
    "name": "眼疾手快",
    "desc": "暴击率+5个百分点",
    "price": 1.1,
    "stack": "U：暴击率最高80%，后续转暴伤"
  },
  {
    "id": "A04",
    "name": "祖传狠劲",
    "desc": "暴击伤害倍率+0.15",
    "price": 1.0,
    "stack": "A"
  },
  {
    "id": "A05",
    "name": "临阵磨刀",
    "desc": "每次有效命中伤害基础值+1",
    "price": 1.0,
    "stack": "A：高频武器按攻击系数折算"
  },
  {
    "id": "A06",
    "name": "专打大个",
    "desc": "对精英和首领伤害+18%",
    "price": 1.0,
    "stack": "A"
  },
  {
    "id": "A07",
    "name": "趁热打铁",
    "desc": "对生命低于30%的敌人伤害+20%",
    "price": 1.0,
    "stack": "A"
  },
  {
    "id": "A08",
    "name": "近朱者赤",
    "desc": "距角色180内的敌人受到武器伤害+15%",
    "price": 1.0,
    "stack": "A"
  },
  {
    "id": "B01",
    "name": "草编鞋垫",
    "desc": "移动速度+6%",
    "price": 1.0,
    "stack": "U：总移速加成软上限50%，超出转击退强度"
  },
  {
    "id": "B02",
    "name": "铁锅头盔",
    "desc": "受击无敌时长+0.10秒、击退抗性+15%",
    "price": 1.3,
    "stack": "U：基础1.2秒，最多1.8秒，后续转击退抗性"
  },
  {
    "id": "B03",
    "name": "稳如老狗",
    "desc": "自身被击退距离减少15%",
    "price": 0.9,
    "stack": "U：抗性最多60%，后续转武器击退"
  },
  {
    "id": "B04",
    "name": "风骚小碎步",
    "desc": "角色受击碰撞半径减少3%",
    "price": 1.3,
    "stack": "U：最多缩小12%，之后转移速/击退收益"
  },
  {
    "id": "B05",
    "name": "脚底抹油",
    "desc": "受击后的加速幅度+10%，基础持续1秒",
    "price": 1.0,
    "stack": "A：无新按钮，持续效果不叠触发次数"
  },
  {
    "id": "B06",
    "name": "临危不乱",
    "desc": "受击后加速持续时间+0.25秒",
    "price": 0.9,
    "stack": "U：最长2.5秒，后续转加速幅度"
  },
  {
    "id": "B07",
    "name": "远远抱心",
    "desc": "生命心吸附半径+25单位",
    "price": 0.9,
    "stack": "U：最高180，后续转动物目标伤害"
  },
  {
    "id": "B08",
    "name": "追鸡高手",
    "desc": "对动物伤害+25%",
    "price": 0.8,
    "stack": "A：不提高动物刷新和掉落数量"
  },
  {
    "id": "C01",
    "name": "招财钱袋",
    "desc": "金币掉落收入+10%",
    "price": 1.0,
    "stack": "A：按小数余数累积"
  },
  {
    "id": "C02",
    "name": "钱来！",
    "desc": "金币吸附半径+40单位",
    "price": 0.9,
    "stack": "U：最高360，之后转金币收入"
  },
  {
    "id": "C03",
    "name": "军饷借条",
    "desc": "每次30秒补给军饷+2",
    "price": 1.2,
    "stack": "A：不按持有金币计复利"
  },
  {
    "id": "C04",
    "name": "老板熟人",
    "desc": "武器购买价格降低5%",
    "price": 1.2,
    "stack": "U：最高20%，后续转对应武器伤害"
  },
  {
    "id": "C05",
    "name": "货比三家",
    "desc": "每次补给第一次刷新价格降低1金币",
    "price": 0.9,
    "stack": "U：最低1金币，之后转军饷"
  },
  {
    "id": "C06",
    "name": "回收行家",
    "desc": "武器出售返还率+5个百分点",
    "price": 1.0,
    "stack": "U：最高60%，之后转军饷；禁止买卖套利"
  },
  {
    "id": "C07",
    "name": "热心桃符",
    "desc": "地面生命心保留时间+5秒",
    "price": 0.8,
    "stack": "U：最长40秒，之后转心吸附范围/动物伤害"
  },
  {
    "id": "C08",
    "name": "肉包熟客",
    "desc": "恢复消耗品价格降低10%",
    "price": 0.9,
    "stack": "U：最高30%，后续转生命心保留/动物伤害"
  },
  {
    "id": "D01",
    "name": "顺风快递",
    "desc": "弹体武器飞行速度+25%",
    "price": 1.0,
    "stack": "U：基础的2倍后转远程伤害"
  },
  {
    "id": "D02",
    "name": "千里眼",
    "desc": "远程及法术武器射程+12%",
    "price": 1.0,
    "stack": "U：最高基础的1.6倍，后续转伤害"
  },
  {
    "id": "D03",
    "name": "穿云签",
    "desc": "适配直线弹体额外穿透1人，后续伤害70%",
    "price": 1.3,
    "stack": "M：额外3次后提高穿透伤害"
  },
  {
    "id": "D04",
    "name": "一鞋两响",
    "desc": "草鞋增加一次60%伤害弹射",
    "price": 1.3,
    "stack": "M：最多额外3次，之后提高弹射伤害"
  },
  {
    "id": "D05",
    "name": "剑阵添丁",
    "desc": "环身剑阵额外增加一柄飞剑",
    "price": 1.4,
    "stack": "M：每武器最多六柄，共享目标命中间隔，之后转伤害"
  },
  {
    "id": "D06",
    "name": "贯穿劲道",
    "desc": "弹丸穿透后的伤害衰减减少10个百分点",
    "price": 1.1,
    "stack": "U：最高保留100%，后续转穿透伤害保留"
  },
  {
    "id": "D07",
    "name": "稳手红绳",
    "desc": "枪械散布角降低10%",
    "price": 1.0,
    "stack": "U：最低原始50%，后续转枪械伤害；霰弹仍保留扇形"
  },
  {
    "id": "D08",
    "name": "御剑如风",
    "desc": "环身剑阵旋转速度+20%",
    "price": 1.0,
    "stack": "U：最高基础2倍，后续转飞剑伤害"
  },
  {
    "id": "E01",
    "name": "伸长胳膊",
    "desc": "近战攻击距离+12%",
    "price": 1.0,
    "stack": "U：最高基础1.6倍，后续转近战伤害"
  },
  {
    "id": "E02",
    "name": "横扫乡里",
    "desc": "近战攻击扇角+15度",
    "price": 1.1,
    "stack": "U：最高220度，后续转近战伤害"
  },
  {
    "id": "E03",
    "name": "鞋底加厚",
    "desc": "武器击退强度+20%",
    "price": 1.0,
    "stack": "U：最高基础2倍，后续转伤害"
  },
  {
    "id": "E04",
    "name": "火药加料",
    "desc": "爆炸半径+15%",
    "price": 1.1,
    "stack": "U：最高基础1.8倍，后续转爆炸伤害"
  },
  {
    "id": "E05",
    "name": "震天响",
    "desc": "爆炸外圈伤害+10个百分点",
    "price": 1.1,
    "stack": "U：外圈最高100%，后续转爆炸伤害"
  },
  {
    "id": "E06",
    "name": "连环桃签",
    "desc": "桃花击杀产生一次60%伤害次生爆炸",
    "price": 1.4,
    "stack": "M：不递归；重复提高次生伤害/半径"
  },
  {
    "id": "E07",
    "name": "雷来！",
    "desc": "五雷符额外跳跃一个目标",
    "price": 1.3,
    "stack": "M：整轮最多5目标，之后提高雷伤"
  },
  {
    "id": "E08",
    "name": "葫芦收紧",
    "desc": "葫芦吸引强度+20%",
    "price": 1.0,
    "stack": "U：不拉进角色70范围、不拉首领；上限后转持续伤害"
  },
  {
    "id": "F01",
    "name": "老刘的鞋油",
    "desc": "草鞋伤害+20%",
    "price": 1.0,
    "stack": "A，持有草鞋时出现"
  },
  {
    "id": "F02",
    "name": "扁担把式",
    "desc": "扁担攻速+18%",
    "price": 1.0,
    "stack": "A，持有扁担时出现"
  },
  {
    "id": "F03",
    "name": "桃园道行",
    "desc": "桃花枝伤害+18%、弹速+10%",
    "price": 1.1,
    "stack": "A/U，持有桃花枝时出现"
  },
  {
    "id": "F04",
    "name": "杀猪熟练工",
    "desc": "杀猪刀每第三刀伤害+40%",
    "price": 1.1,
    "stack": "A，计数按武器实例独立"
  },
  {
    "id": "F05",
    "name": "加长弹匣",
    "desc": "突突枪攻速+15%、子弹速度+10%",
    "price": 1.1,
    "stack": "A/U，无换弹操作"
  },
  {
    "id": "F06",
    "name": "青莲剑穗",
    "desc": "飞剑伤害+18%",
    "price": 1.0,
    "stack": "A，持有飞剑时出现"
  },
  {
    "id": "F07",
    "name": "桃园真传",
    "desc": "人物专属技能伤害+18%",
    "price": 1.1,
    "stack": "A，不改变技能所属人物"
  },
  {
    "id": "F08",
    "name": "回气丹",
    "desc": "人物技能冷却恢复速度+12%",
    "price": 1.3,
    "stack": "U：有效冷却最低原始55%，之后转技能伤害"
  }
];
// Keep the original atlas's 48 entries in order; new icons are drawn by the view.
ROWS.push(
  { id:'D09',name:'百步穿杨谱',desc:'远程武器伤害+18%',price:1,stack:'A：仅远程武器，重复收益递减' },
  { id:'D10',name:'快手指套',desc:'远程武器攻速+15%',price:1.1,stack:'A：仅远程武器，重复收益递减' },
  { id:'D11',name:'鹰眼镜片',desc:'远程武器暴击率+6个百分点',price:1.1,stack:'U：总暴击最高80%，超出转远程伤害' },
  { id:'D12',name:'会心红点',desc:'远程武器暴击伤害倍率+0.25',price:1.1,stack:'A：仅远程武器，重复收益递减' },
  { id:'D13',name:'精铁弹芯',desc:'远程武器伤害基础值+2；按攻击频率折算',price:1,stack:'A：高频和霰弹武器按攻击系数折算' },
  { id:'D14',name:'破阵箭簇',desc:'直线弹体穿透后的伤害保留+10个百分点',price:1.1,stack:'U：最多保留100%，超出转远程伤害；不额外增加穿透次数' },
  { id:'D15',name:'回旋鞋钉',desc:'草鞋弹射伤害保留+15个百分点',price:1.1,stack:'U：持有弹射强化时出现，最多保留100%，超出转草鞋伤害' },
  { id:'D16',name:'推山弹簧',desc:'远程武器击退强度+25%',price:1,stack:'U：本项最高+100%，超出转远程伤害' },
  { id:'D17',name:'二踢脚推进器',desc:'火箭筒伤害+25%、弹速+20%',price:1.3,stack:'A/U：持有火箭筒时出现，弹速最多增加100%，超出转火箭伤害' },
  { id:'D18',name:'霰弹聚能环',desc:'霰弹枪伤害+20%、射程+15%',price:1.2,stack:'A/U：持有霰弹枪时出现，射程最多增加60%，超出转霰弹伤害' },
  { id:'D19',name:'突突穿甲匣',desc:'突突枪额外穿透1人，后续伤害70%',price:1.4,stack:'M：最多额外3次，之后提高突突枪伤害' },
  { id:'D20',name:'飞鞋助推带',desc:'草鞋弹速+30%、伤害+10%',price:1,stack:'A/U：持有草鞋时出现，弹速最多增加100%，超出转草鞋伤害' },
);
export const PASSIVE_ITEMS: PassiveItem[] = ROWS.map(r => ({ ...r, bonus: {}, slot: 'waist' }));
export const ITEM_CATEGORIES = ['输出', '生存移动', '经济拾取', '远程弹道', '近战范围', '专属技能'];
export const amount = (inv: Record<string, number>, id: string, unit = 1, k = .08): number => { const n = inv[id] || 0; return n > 0 ? unit * n / (1 + k * (n - 1)) : 0; };
export const count = (inv: Record<string, number>, id: string): number => inv[id] || 0;
export function eligiblePassive(id: string, weapons: { id: WeaponId }[]): boolean {
  const owned = (ids: string[]): boolean => weapons.some(w => ids.indexOf(w.id) >= 0);
  const needs: Record<string, string[]> = { D04:['sandal'],D05:['sword'],D06:['sandal','smg','shotgun'],D07:['smg','shotgun'],D08:['sword'],D15:['sandal'],D17:['rocket'],D18:['shotgun'],D19:['smg'],D20:['sandal'],E06:['peach'],E07:['thunder'],E08:['gourd'],F01:['sandal'],F02:['pole'],F03:['peach'],F04:['cleaver'],F05:['smg'],F06:['sword'] };
  if (needs[id]) return owned(needs[id]);
  if (id==='D03') return owned(['sandal','smg','shotgun']);
  if (['D09','D10','D11','D12','D13','D16'].indexOf(id)>=0) return weapons.some(w=>weaponFor(w.id).category==='ranged');
  if (id==='D14') return owned(['sandal','smg','shotgun']);
  if (id==='D02') return weapons.some(w=>weaponFor(w.id).category!=='melee');
  if (id[0] === 'D') return weapons.some(w => weaponFor(w.id).category !== 'melee' && ['thunder','gourd'].indexOf(w.id) < 0);
  if (id === 'E01' || id === 'E02') return weapons.some(w => weaponFor(w.id).category === 'melee');
  if (id === 'E04' || id === 'E05') return weapons.some(w => weaponFor(w.id).area > 0);
  if (id === 'A03' || id === 'A04') return true;
  return true;
}
export function passivePreview(inv: Record<string, number>, id: string): string {
  const item = PASSIVE_ITEMS.find(i => i.id === id); if (!item) return '';
  const n=count(inv,id),clean=item.desc.replace(/；/g,'\n').replace(/，/g,' · ');
  if(!n)return clean+'\n自动生效 · 不占武器位';
  const primary=[['damage','haste','crit','critDamage','power','elite','execute','close'],['speed','invincible','resist','hitbox','hurtSpeed','hurtDuration','heartPickup','animalDamage'],['income','pickup','stipend','discount','refresh','refund','heartLife','healDiscount'],['shotSpeed','rangedRange','pierce','bounce','split','pierceFactor','spread','homing','rangedDamage','rangedHaste','rangedCrit','rangedCritDamage','rangedPower','pierceRetention','ricochetRetention','rangedKnockback','rocketDamage','shotgunDamage','smgPierce','sandalBoost'],['meleeRange','arc','knockback','area','splash','peachFactor','thunderTargets','pull'],['sandal','poleHaste','peach','cleaverThird','smgHaste','sword','skillDamage','skillHaste']];
  const key=primary[id.charCodeAt(0)-65][Number(id.slice(1))-1],before=passiveBonuses(inv),after=passiveBonuses({...inv,[id]:n+1});
  const read=(v:ReturnType<typeof passiveBonuses>,k:string):number=>(v as unknown as Record<string,number>)[k];
  const percent=['damage','haste','crit','critDamage','elite','execute','close','speed','resist','hitbox','hurtSpeed','animalDamage','income','discount','refund','healDiscount','pierceFactor','area','splash','peachFactor','sandal','poleHaste','peach','cleaverThird','smgHaste','sword','skillDamage','skillHaste','spread','rangedDamage','rangedHaste','rangedCrit','rangedCritDamage','pierceRetention','ricochetRetention','rangedKnockback','rocketDamage','shotgunDamage','sandalBoost'];
  const format=(value:number):string=>percent.indexOf(key)>=0?Number((value*100).toFixed(1))+'%':String(Number(value.toFixed(2)));
  const detail=Math.abs(read(after,key)-read(before,key))>1e-9?`累计 ${format(read(before,key))} → ${format(read(after,key))}`:`主属性达限 · 继续获得伤害增益`;
  return clean+'\n'+`持有 ${n} → ${n+1} · ${detail}`;

}
export function passiveBonuses(inv: Record<string, number>) {
  const v=(id:string,n=1,k=.08):number=>amount(inv,id,n,k);
  const overflow=(id:string,n:number,cap:number):number=>Math.max(0,v(id,n)-cap);
  const caps:[string,number,number][]=[['A03',.05,.75],['B01',.06,.5],['B02',.1,.6],['B03',.15,.6],['B04',.03,.12],['B06',.25,1.5],['B07',25,90],['C02',40,120],['C04',.05,.2],['C05',1,4],['C06',.05,.2],['C07',5,20],['C08',.1,.3],['D01',.25,1],['D02',.12,.6],['D06',.1,.3],['D07',.1,.5],['D08',.2,1],['E01',.12,.6],['E02',15,120],['E03',.2,1],['E04',.15,.8],['E05',.1,.45],['E08',.2,1]];
  const overflowPower=caps.reduce((sum,[id,unit,cap])=>sum+Math.max(0,v(id,unit)-cap)/unit*.025,0)+['D03','D04','D05'].reduce((sum,id)=>sum+Math.log2(1+Math.max(0,count(inv,id)-3))*.04,0)+Math.log2(1+Math.max(0,count(inv,'E07')-2))*.04;
  return {
    damage:overflowPower+v('A01',.18)+overflow('A03',.05,.75)*.5+overflow('D01',.25,1)*.15+overflow('D02',.12,.6)*.3+overflow('E03',.2,1)*.2,
    haste:v('A02',.15,.12),crit:Math.min(.75,v('A03',.05)),critDamage:v('A04',.15),power:v('A05'),elite:v('A06',.18),execute:v('A07',.2),close:v('A08',.15),
    speed:Math.min(.5,v('B01',.06)+overflow('B04',.03,.12)),invincible:Math.min(.6,v('B02',.1)),resist:Math.min(.6,v('B03',.15)+v('B02',.15)+overflow('B02',.1,.6)),hitbox:Math.min(.12,v('B04',.03)),
    hurtSpeed:.1+v('B05',.1)+overflow('B06',.25,1.5)*.1,hurtDuration:Math.min(2.5,1+v('B06',.25)),heartPickup:Math.min(180,90+v('B07',25)),animalDamage:v('B08',.25)+overflow('B07',25,90)*.01,
    income:v('C01',.1)+overflow('C02',40,120)*.001, pickup:Math.min(120,v('C02',40)),stipend:v('C03',2)+overflow('C05',1,4)+overflow('C06',.05,.2)*10,
    discount:Math.min(.2,v('C04',.05)),refresh:Math.max(1,5-Math.floor(v('C05'))),refund:Math.min(.6,.4+v('C06',.05)),heartLife:Math.min(40,20+v('C07',5)),healDiscount:Math.min(.3,v('C08',.1)),
    shotSpeed:1+Math.min(1,v('D01',.25)),rangedRange:1+Math.min(.6,v('D02',.12)),pierce:Math.min(3,count(inv,'D03')),pierceFactor:Math.min(1,.7+Math.max(0,count(inv,'D03')-3)*.05+v('D06',.1)),pierceDamage:v('D06',.1),
    bounce:Math.min(3,count(inv,'D04')),bounceFactor:Math.min(1,.6+Math.max(0,count(inv,'D04')-3)*.05+v('D15',.15)),split:Math.min(3,count(inv,'D05')),splitFactor:Math.min(1,.45+Math.max(0,count(inv,'D05')-3)*.05),
    spread:Math.max(.5,1-v('D07',.1)),homing:1+Math.min(1,v('D08',.2)),meleeRange:1+Math.min(.6,v('E01',.12)),arc:v('E02',15),knockback:1+Math.min(1,v('E03',.2)+overflow('B01',.06,.5)),
    area:Math.min(.8,v('E04',.15)),splash:Math.min(1,.55+v('E05',.1)),peachChain:count(inv,'E06'),peachFactor:.6+Math.max(0,v('E06',.12)-.12),thunderTargets:Math.min(2,count(inv,'E07')),pull:1+Math.min(1,v('E08',.2)),
    sandal:v('F01',.2),poleHaste:v('F02',.18,.12),peach:v('F03',.18),cleaverThird:v('F04',.4),smgHaste:v('F05',.15,.12),sword:v('F06',.18),skillDamage:v('F07',.18)+overflow('F08',.12,1/.55-1)*.5,skillHaste:Math.min(1/.55-1,v('F08',.12,.12)),
    rangedDamage:v('D09',.18)+overflow('D11',.06,.75)+overflow('D14',.1,.3)+overflow('D16',.25,1)*.2,
    rangedHaste:v('D10',.15,.12),rangedCrit:Math.min(.75,v('D11',.06)),rangedCritDamage:v('D12',.25),rangedPower:v('D13',2),
    pierceRetention:Math.min(.3,v('D14',.1)),ricochetRetention:Math.min(.4,v('D15',.15)),rangedKnockback:1+Math.min(1,v('D16',.25)),
    rocketDamage:v('D17',.25)+overflow('D17',.2,1)*.2,rocketSpeed:1+Math.min(1,v('D17',.2)),
    shotgunDamage:v('D18',.2)+overflow('D18',.15,.6)*.3,shotgunRange:1+Math.min(.6,v('D18',.15)),
    smgPierce:Math.min(3,count(inv,'D19')),smgPierceDamage:Math.log2(1+Math.max(0,count(inv,'D19')-3))*.06,
    sandalBoost:v('D20',.1)+overflow('D20',.3,1)*.15+overflow('D15',.15,.4)*.3,sandalSpeed:1+Math.min(1,v('D20',.3)),
  };
}
