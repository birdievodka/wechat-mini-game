import { Color, Graphics, Label, Layers, Node, Sprite, SpriteFrame, UITransform } from 'cc';

/** Same poster and bar placement as the early WeChat screen. No game/HUD beneath it. */
export class LoadingView {
  readonly status:Label;
  private poster:Sprite;
  private title:Label;
  private bar:Graphics;
  private background:Graphics;
  private width=1334;
  private height=750;
  private imageWidth=1334;
  private imageHeight=750;
  private value=.22;
  private error='';
  constructor(readonly node:Node){
    this.background=node.addComponent(Graphics);
    this.poster=this.child('LoadingPoster').addComponent(Sprite);this.poster.sizeMode=Sprite.SizeMode.CUSTOM;
    this.title=this.text('桃园乱斗',58,'#ffe3a0');this.title.fontFamily='serif';this.title.isBold=true;
    this.bar=this.child('LoadingProgress').addComponent(Graphics);
    this.status=this.text('',19,'#fff0cf');this.resize(this.width,this.height);
  }
  private child(name:string):Node {const n=new Node(name);n.layer=Layers.Enum.UI_2D;this.node.addChild(n);return n;}
  private text(value:string,size:number,color:string):Label {
    const n=this.child(value||'LoadingStatus');n.addComponent(UITransform).setContentSize(800,80);const label=n.addComponent(Label);
    label.string=value;label.fontSize=size;label.lineHeight=size*1.3;label.color=new Color(color);label.horizontalAlign=Label.HorizontalAlign.CENTER;label.verticalAlign=Label.VerticalAlign.CENTER;return label;
  }
  setPoster(frame:SpriteFrame,width:number,height:number):void {this.poster.spriteFrame=frame;this.imageWidth=width;this.imageHeight=height;this.resize(this.width,this.height);}
  setProgress(value:number,error=''):void {this.value=Math.max(this.value,Math.max(0,Math.min(1,value)));this.error=error;this.draw();}
  resize(width:number,height:number):void {
    this.width=width;this.height=height;const scale=Math.max(width/this.imageWidth,height/this.imageHeight);
    this.poster.node.getComponent(UITransform)!.setContentSize(this.imageWidth*scale,this.imageHeight*scale);
    this.poster.node.setPosition(0,height/2-this.imageHeight*scale/2);
    this.title.node.setPosition(0,-height/2+155);this.status.node.setPosition(0,-height/2+43);
    this.bar.node.setPosition(0,-height*.4);
    const g=this.background;g.clear();g.fillColor=new Color('#263024');g.rect(-width/2,-height/2,width,height);g.fill();this.draw();
  }
  private draw():void {
    const width=Math.min(520,this.width-112),g=this.bar;g.clear();
    g.fillColor=new Color('#d6b875');g.roundRect(-width/2-4,-10,width+8,20,10);g.fill();
    g.fillColor=new Color('#1c2b1f');g.roundRect(-width/2-2,-8,width+4,16,8);g.fill();
    const fill=width*this.value;if(fill>0){g.fillColor=new Color('#91af56');g.roundRect(-width/2,-6,fill,12,Math.min(6,fill/2));g.fill();
      g.fillColor=new Color('#c8d988');g.roundRect(-width/2,-1,fill,5,Math.min(2,fill/2));g.fill();}
    this.status.string=this.error||`英雄集结中…  ${Math.floor(this.value*100)}%`;
  }
}
