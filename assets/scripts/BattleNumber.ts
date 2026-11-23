import {Color,Node,Sprite,UITransform} from 'cc';
import type {BattleSpriteAtlas} from './BattleSpriteAtlas';
interface Digit {node:Node;sprite:Sprite;index:number;}
/** Label-shaped feedback port. Existing movement/pop/lifetime still owns the root. */
export class BattleNumber {
 readonly node:Node;private value='';private digits:Digit[]=[];private dirty=false;
 constructor(parent:Node,private atlas:BattleSpriteAtlas,private tint:Color){
  this.node=new Node('DamageNumber');this.node.layer=parent.layer;parent.addChild(this.node);this.node.addComponent(UITransform).setContentSize(112,34);
 }
 renderedWidth=0;
 get string():string{return this.value;}
 set string(value:string){
  if(value===this.value)return;this.value=value;this.dirty=true;
 }
 /** Like Label, coalesce all hits on this actor into one update before drawing. */
 flush():void {
  if(!this.dirty)return;this.dirty=false;const value=this.value;
  let width=0,count=0;
  // Numbers originate from finite combat damage. Fixed maximum also bounds bad input.
  for(let i=0;i<value.length&&count<24;i++){
   const c=value.charCodeAt(i),index=c>=48&&c<=57?c-48:c===45?10:c===43?11:c===47?12:-1,glyph=this.atlas.numberGlyphs[index];if(!glyph)continue;
   let digit=this.digits[count];
   if(!digit){const node=new Node('Digit');node.layer=this.node.layer;this.node.addChild(node);const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.color=this.tint;node.getComponent(UITransform)!.setContentSize(glyph.width,glyph.height);digit={node,sprite,index:-1};this.digits.push(digit);}
   digit.node.active=true;if(digit.index!==index){digit.sprite.spriteFrame=glyph.frame;digit.index=index;}
   digit.node.setPosition(width+glyph.width/2-glyph.left,0);width+=glyph.advance;count++;
  }
  this.renderedWidth=width;
  for(let i=0;i<this.digits.length;i++){const digit=this.digits[i];if(i<count)digit.node.setPosition(digit.node.position.x-width/2,0);else digit.node.active=false;}
 }
}
