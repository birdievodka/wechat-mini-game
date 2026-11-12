import { Graphics, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { WeaponId, Tier } from './weapons';
import { drawWeaponArt } from './weapon-art';

// Measured alpha bounds, not an assumed grid: generated objects can extend past nominal cells.
export const WEAPON_ICON_RECTS: Partial<Record<WeaponId, number[]>> = {
  sandal:[31,30,208,213], peach:[527,26,214,221], firecracker:[277,262,201,224], smg:[499,270,246,203], shotgun:[770,270,245,222],
  rocket:[8,519,239,224], sword:[274,506,210,237], thunder:[519,515,212,236], gourd:[768,502,241,250],
};
export const WEAPON_ICON_PATCH_RECTS={pole:[25,27,218,206]};
export const BUTCHER_ICON_RECT=[28,34,335,331];
// [open head, closed head, torso]; paired head rects have identical geometry for stable blinking.
export const HERO_PART_RECTS: Record<string, number[][]> = {
  liubei:[[40,29,379,363],[40,438,379,363],[66,939,310,232]],
  guanyu:[[443,30,372,395],[443,439,372,395],[477,937,305,232]],
  zhangfei:[[876,29,356,380],[876,438,356,380],[883,937,325,235]],
};

/** Centered UI illustration; never reuse a grip-origin projectile drawing as a tiny inventory icon. */
export function addWeaponIcon(parent: Node, frames: Record<string, SpriteFrame>, id: WeaponId, tier: Tier, size: number): Node {
  const node=new Node('WeaponIcon-'+id);node.layer=parent.layer;parent.addChild(node);
  const transform=node.addComponent(UITransform), frame=frames['icon-'+id];
  if(frame){
    const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=frame;
    const rect=frame.rect, scale=size/Math.max(rect.width,rect.height);
    transform.setContentSize(rect.width*scale,rect.height*scale);
  }else{
    // Only a diagnostic fallback: normal startup requires the complete presentation bundle.
    const drawing=new Node('FallbackArt');drawing.layer=parent.layer;node.addChild(drawing);drawing.addComponent(UITransform);
    drawWeaponArt(drawing.addComponent(Graphics),id,tier);drawing.setScale(size/78,size/78,1);drawing.setPosition(0,-size*.2);
    transform.setContentSize(size,size);
  }
  return node;
}
