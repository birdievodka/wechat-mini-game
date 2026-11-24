import {applyUiFont} from './ui-font';
import {Node,Graphics,Label,Color,UITransform} from 'cc';
/** Reused preparation/error surface. It blocks input while combat is frozen. */
export class ResourcePrepareView {
 readonly root:Node;private status:Label;private actions:Node;
 constructor(parent:Node,private retry:()=>void,private cancel:()=>void,titleText='整装待发'){
  this.root=new Node('ResourcePreparation');this.root.layer=parent.layer;parent.addChild(this.root);
  this.root.addComponent(UITransform).setContentSize(5000,3000);const g=this.root.addComponent(Graphics);g.fillColor=new Color(20,33,24,225);g.rect(-2500,-1500,5000,3000);g.fill();
  this.root.on(Node.EventType.TOUCH_START,(e:{propagationStopped:boolean})=>e.propagationStopped=true);this.root.on(Node.EventType.TOUCH_END,(e:{propagationStopped:boolean})=>e.propagationStopped=true);
  this.text(this.root,titleText,60,34,700,70,true);
  this.status=this.text(this.root,'正在准备战场…',-12,23,900,80);this.actions=new Node('ResourceRetryActions');this.actions.layer=parent.layer;this.root.addChild(this.actions);
  this.button('重试',-155,()=>this.retry());this.button('返回备战',155,()=>this.cancel());this.root.active=false;
 }
 private text(parent:Node,s:string,y:number,size:number,w:number,h:number,emphasized=false):Label{const n=new Node(s);n.layer=parent.layer;parent.addChild(n);n.setPosition(0,y);n.addComponent(UITransform).setContentSize(w,h);const l=n.addComponent(Label);l.string=s;l.fontSize=size;l.color=new Color('#ffedc0');l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;return applyUiFont(l, emphasized);}
 private button(s:string,x:number,click:()=>void):void{const n=new Node(s);n.layer=this.root.layer;this.actions.addChild(n);n.setPosition(x,-120);n.addComponent(UITransform).setContentSize(270,64);const g=n.addComponent(Graphics);g.fillColor=new Color('#355e40');g.strokeColor=new Color('#d6b674');g.lineWidth=2;g.roundRect(-135,-32,270,64,15);g.fill();g.stroke();this.text(n,s,0,25,240,60);n.on(Node.EventType.TOUCH_END,click);}
 show(message:string,error=false):void{this.root.active=true;this.root.setSiblingIndex(this.root.parent!.children.length-1);this.status.string=message;this.actions.active=error;}
 hide():void{this.root.active=false;this.root.removeFromParent();this.root.destroy();}
}
