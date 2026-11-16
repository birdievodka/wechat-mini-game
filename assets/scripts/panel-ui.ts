import {Color,Graphics,Node,Sprite,SpriteFrame,UITransform} from 'cc';

/** All dismissible panels use the same 64px target and cached jade close symbol. */
export function addPanelClose(parent:Node,frames:Record<string,SpriteFrame>,name:string,x:number,y:number,close:()=>void):Node {
  const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(64,64);
  const frame=frames['ui-panel-close'];
  if(frame){const s=n.addComponent(Sprite);s.spriteFrame=frame;s.sizeMode=Sprite.SizeMode.CUSTOM;}
  else{const g=n.addComponent(Graphics);g.fillColor=new Color('#355e40');g.strokeColor=new Color('#d6be85');g.lineWidth=1.5;g.circle(0,0,23);g.fill();g.stroke();g.strokeColor=new Color('#fff0d2');g.lineWidth=2.5;g.moveTo(-6,-6);g.lineTo(6,6);g.moveTo(-6,6);g.lineTo(6,-6);g.stroke();}
  let closing=false;
  n.on(Node.EventType.TOUCH_START,()=>n.setScale(.94,.94,1));
  n.on(Node.EventType.TOUCH_CANCEL,()=>n.setScale(1,1,1));
  n.on(Node.EventType.TOUCH_END,(event?:{propagationStopped:boolean})=>{if(event)event.propagationStopped=true;n.setScale(1,1,1);if(closing)return;closing=true;try{close();}finally{closing=false;}});
  return n;
}
