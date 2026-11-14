import {Node,Sprite,SpriteFrame,UITransform,Layers} from 'cc';
/** One shared-atlas sprite. Anatomy and collision belong to the existing hero, never to the mount. */
export class HeroMount {
 readonly sprite:Sprite;private frame?:SpriteFrame;
 constructor(parent:Node,private frames:Record<string,SpriteFrame>){const n=new Node('HeroMount');n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(128,128);n.getComponent(UITransform)!.setAnchorPoint(.5,0);this.sprite=n.addComponent(Sprite);this.sprite.sizeMode=Sprite.SizeMode.CUSTOM;n.setSiblingIndex(0);}
 update(id:string,n:number,walk:number,moving:boolean,dashing:boolean,facing=1,time=0):void {const node=this.sprite.node;node.active=n>=2;if(!node.active)return;const index=dashing?5:moving?1+Math.floor(walk/Math.PI*1.3)%4:0,frame=this.frames['mount-'+id+'-'+index];if(frame&&frame!==this.frame){this.sprite.spriteFrame=frame;this.frame=frame;}node.setPosition(25*facing,-30+(moving?Math.abs(Math.sin(walk))*1:Math.sin(time*2)*.3));node.setScale(facing,1,1);node.angle=dashing?-facing*3:0;}
}
