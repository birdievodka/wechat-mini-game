import type {Tier,WeaponId} from './weapons';

const descriptions:Partial<Record<WeaponId,readonly string[]>>={
  sandal:['首击拍退前敌','增加一次侧向回弹','连续拍开两名追兵','第三跳额外击退末敌'],
  'hand-halberd':['循原出手点折返','回程提速，折点亮铜','回到你手中，横移切侧翼','回程切中三敌并接住后补掷'],
  'heavy-crossbow':['重矢穿过三敌','重矢穿过四敌','重矢穿五敌，前三次铜箍亮起','穿过三敌时卷起碎石'],
  'oil-jar':['落点留下油洼','油洼维持更久','相近两洼接成火线','首个有效踏线目标卷起短焰'],
};

export const armoryDescription=(id:WeaponId,tier:Tier):string|undefined=>descriptions[id]?.[tier-1];
export const heavyCrossbowRelease=.18;
export const handHalberdReturnSeconds=1.2;
export const handHalberdCatchRadius=24;
export const handHalberdReturnSpeed=(tier:Tier):number=>tier>=2?1.2:1;
export const oilPuddleLife=(tier:Tier):number=>tier>=3?2.65:tier===2?1.7:1.2;
export const oilLinkReach=180;
export const oilLinkHalfWidth=14;

export function oilLinkContains(ax:number,ay:number,bx:number,by:number,x:number,y:number):boolean {
  const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
  if(length<1)return false;
  const t=((x-ax)*dx+(y-ay)*dy)/length;
  return t>=0&&t<=1&&(x-ax-dx*t)**2+(y-ay-dy*t)**2<=oilLinkHalfWidth**2;
}
