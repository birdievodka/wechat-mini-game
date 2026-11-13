import {Color,Graphics,Node,Sprite,SpriteFrame,UITransform} from 'cc';
import {HeroId,HEROES} from './campaign';
import {heroIdlePose} from './hero-idle';
import {drawHeroFist,drawHeroSleeve} from './hero-arms';
import {drawWeaponArt} from './weapon-art';

/** Menu-only puppet. Owns its clock and props; never creates a Run, attacks or reads combat RNG. */
export class HeroShowcase {
  readonly root:Node;
  private rig:Node;
  private body:Sprite;
  private headPivot:Node;
  private head:Sprite;
  private sleeves:Graphics;
  private hands:Graphics[]=[];
  private feet:Node[]=[];
  private props:Node[]=[];
  private sparkle:Graphics;
  private id:HeroId='liubei';
  private time=0;
  private open?:SpriteFrame;
  private closed?:SpriteFrame;
  constructor(parent:Node,private frames:Record<string,SpriteFrame>){
    this.root=this.node(parent,'HeroShowcase');
    const shadow=this.node(this.root,'ShowcaseShadow').addComponent(Graphics);
    shadow.fillColor=new Color(74,49,24,35);shadow.ellipse(0,-21,31,6);shadow.fill();
    this.rig=this.node(this.root,'ShowcaseRig');
    for(const side of [-1,1]){const n=this.node(this.rig,side<0?'ShowcaseLeftFoot':'ShowcaseRightFoot'),g=n.addComponent(Graphics);g.fillColor=new Color('#66432b');g.strokeColor=new Color('#493522');g.lineWidth=1.8;g.ellipse(0,0,6.5,4.6);g.fill();g.stroke();this.feet.push(n);}
    this.body=this.sprite(this.rig,'ShowcaseBody');
    this.sleeves=this.node(this.rig,'ShowcaseSleeves').addComponent(Graphics);
    this.headPivot=this.node(this.rig,'ShowcaseHeadPivot');
    this.head=this.sprite(this.headPivot,'ShowcaseHead');
    for(const side of [-1,1]){
      const n=this.node(this.rig,side<0?'ShowcaseLeftProp':'ShowcaseRightProp');this.props.push(n);
    }
    for(const side of [-1,1]){const g=this.node(this.rig,side<0?'ShowcaseLeftHand':'ShowcaseRightHand').addComponent(Graphics);this.hands.push(g);}
    this.sparkle=this.node(this.root,'ShowcaseAccent').addComponent(Graphics);
    this.setHero('liubei');
  }
  private node(p:Node,name:string):Node{const n=new Node(name);n.layer=p.layer;p.addChild(n);return n;}
  private sprite(p:Node,name:string):Sprite{const s=this.node(p,name).addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;return s;}
  setHero(id:HeroId):void{
    this.id=id;this.time=0;
    this.open=this.frames['hero-'+id+'-open'];this.closed=this.frames['hero-'+id+'-closed'];
    this.head.spriteFrame=this.open||null;this.body.spriteFrame=this.frames['hero-'+id+'-torso']||null;
    const aspect=(s:Sprite,w:number)=>{const r=s.spriteFrame?.rect;s.node.getComponent(UITransform)!.setContentSize(w,r?w*r.height/r.width:w);};
    aspect(this.head,100);aspect(this.body,49);
    for(const p of this.props){for(const n of [...p.children]){n.removeFromParent();n.destroy();}p.getComponent(Graphics)?.clear();p.active=false;}
    if(id==='liubei'){
      for(const p of this.props){p.active=true;drawWeaponArt(p.getComponent(Graphics)||p.addComponent(Graphics),'sandal');}
    }else if(id==='guanyu'){
      const p=this.props[1];p.active=true;drawWeaponArt(p.getComponent(Graphics)||p.addComponent(Graphics),'pole');
    }else if(id==='zhangfei'){
      const p=this.props[1];p.active=true;drawWeaponArt(p.getComponent(Graphics)||p.addComponent(Graphics),'cleaver');
    }else{
      const p=this.props[1];p.active=true;const s=this.sprite(p,'ShowcaseWeapon');
      s.spriteFrame=this.frames['weapon-'+(id==='zhaoyun'?'silver-spear':'feather-fan')]||null;
      const size=id==='zhaoyun'?88:64;s.node.getComponent(UITransform)!.setContentSize(size,size);
      s.node.angle=45;s.node.setPosition(0,id==='zhaoyun'?32:22);
    }
    this.update(0);
  }
  update(delta:number):void{
    this.time+=Math.min(.05,Math.max(0,delta));
    const t=this.time,pose=heroIdlePose(this.id,t,0);
    // Immediate greeting on selection, then one small signature gesture every 5.8 seconds.
    const phase=t%5.8,gesture=phase<1.05?Math.sin(phase/1.05*Math.PI):0;
    const sway=Math.sin(t*1.6)*.65,breath=pose.handBob;
    let left={x:-35,y:-5+breath},right={x:35,y:-5+breath},leftAngle=-12,rightAngle=12;
    let tilt=pose.bodyAngle;
    if(this.id==='liubei'){
      left={x:-41-gesture*3,y:-4+breath+gesture*5};right={x:41+gesture*3,y:-4+breath+gesture*5};
      leftAngle=-18-gesture*12;rightAngle=18+gesture*12;
      tilt+=Math.sin(t*7)*gesture*.8;
    }else if(this.id==='guanyu'){
      const angle=(-4+gesture*11)*Math.PI/180,y=-3+breath+gesture*2;
      left={x:-36*Math.cos(angle),y:y-36*Math.sin(angle)};right={x:36*Math.cos(angle),y:y+36*Math.sin(angle)};
      this.props[1].setPosition(0,y);this.props[1].angle=90+angle*180/Math.PI;
      tilt-=gesture*1.2;
    }else if(this.id==='zhangfei'){
      left={x:-34-gesture*3,y:-6+breath+gesture*6};right={x:40+gesture*5,y:-4+breath+gesture*5};
      rightAngle=-8+gesture*20;tilt+=gesture*2;
    }else if(this.id==='zhaoyun'){
      right={x:40+gesture*8,y:-5+breath+gesture*3};rightAngle=-8+gesture*18;
      left={x:-33,y:-6+breath+gesture*2};tilt-=gesture*1.5;
    }else{
      right={x:38,y:-5+breath+gesture*3};rightAngle=-14+Math.sin(t*7)*7+gesture*8;
      left={x:-32,y:-6+breath};tilt+=Math.sin(t*1.3)*.8;
    }
    this.rig.setPosition(sway,pose.headY*.35);this.rig.angle=tilt;
    this.body.node.setPosition(0,-1);this.body.node.setScale(1+pose.breath,1-pose.breath,1);
    this.headPivot.setPosition(pose.headX,18+pose.headY);this.headPivot.angle=pose.headAngle+(this.id==='zhangfei'?Math.sin(t*13)*gesture*1.4:0);
    this.head.node.setPosition(0,this.id==='guanyu'?24:this.id==='zhangfei'?25:26);
    this.head.spriteFrame=(pose.eyesClosed?this.closed:this.open)||this.open||null;
    this.sleeves.clear();const color=HEROES.find(h=>h.id===this.id)!.color;
    for(const [i,p]of [left,right].entries()){
      const side=i?1:-1;drawHeroSleeve(this.sleeves,side,p,0,color,this.id);
      this.hands[i].node.setPosition(p.x,p.y);drawHeroFist(this.hands[i],this.id,side,this.id==='liubei'||this.id==='guanyu'||i===1);
      if(this.id!=='guanyu'){this.props[i].setPosition(p.x,p.y);this.props[i].angle=i?rightAngle:leftAngle;}
      this.feet[i].setPosition(side*9,-19+Math.sin(t*1.6+side)*gesture*.8);this.feet[i].angle=side*gesture*3;
    }
    // Tiny prop highlights, confined to the stage; no battle effect or audio is emitted.
    const g=this.sparkle;g.clear();
    if(gesture>.4){g.strokeColor=new Color(224,160,57,Math.round((gesture-.4)*180));g.lineWidth=1;
      for(const side of [-1,1]){const x=side*61,y=9+gesture*12;g.moveTo(x-3,y);g.lineTo(x+3,y);g.moveTo(x,y-3);g.lineTo(x,y+3);}g.stroke();}
  }
}
