import {StageProfile,isKnown,unlocked} from './stage-progress';
import {Color,Graphics,Label,Node,Sprite,SpriteFrame,UITransform} from 'cc';
import {COMMON_SKILLS,commonSkillFor,skillPowerText} from './common-skills';

/** Menu-only selection, reading the same data as combat and the encyclopedia. */
export class SkillSelectView {
  readonly root:Node;private page=0;private selected:string;
  constructor(parent:Node,private frames:Record<string,SpriteFrame>,selected:string,private choose:(id:string)=>void,private close:()=>void,private profile?:StageProfile){this.root=this.node(parent,'SkillSelection');this.selected=commonSkillFor(selected).id;this.page=Math.floor(Math.max(0,COMMON_SKILLS.findIndex(s=>s.id===this.selected))/12);this.render();}
  private node(p:Node,name:string):Node{const n=new Node(name);n.layer=p.layer;p.addChild(n);return n;}
  private text(p:Node,t:string,x:number,y:number,size:number,w:number,h:number,color='#432d1d'):Label{const n=this.node(p,t);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);const l=n.addComponent(Label);l.string=t;l.fontSize=size;l.lineHeight=size*1.35;l.color=new Color(color);l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;return l;}
  private box(p:Node,name:string,x:number,y:number,w:number,h:number,fill:string,border='#d0b77e'):Node{const n=this.node(p,name);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);const g=n.addComponent(Graphics);g.fillColor=new Color(fill);g.strokeColor=new Color(border);g.lineWidth=2;g.roundRect(-w/2,-h/2,w,h,15);g.fill();g.stroke();return n;}
  private button(p:Node,name:string,text:string,x:number,y:number,w:number,f:()=>void,primary=false):void{const n=this.box(p,name,x,y,w,52,primary?'#c94d2e':'#355e40');this.text(n,text,0,0,23,w-16,46,'#fff0d2');n.on(Node.EventType.TOUCH_END,f);}
  private icon(p:Node,id:string,x:number,y:number,size:number):void{const s=commonSkillFor(id),f=this.frames['skill-'+s.icon];if(!f)return;const n=this.node(p,'SkillIcon-'+id),sp=n.addComponent(Sprite);sp.sizeMode=Sprite.SizeMode.CUSTOM;sp.spriteFrame=f;n.setPosition(x,y);n.getComponent(UITransform)!.setContentSize(size,size);}
  private render():void{
    const pages=Math.max(1,Math.ceil(COMMON_SKILLS.length/12));this.page=Math.min(this.page,pages-1);
    for(const n of [...this.root.children]){n.removeFromParent();n.destroy();}
    const shade=this.node(this.root,'SkillDimmer');shade.addComponent(UITransform).setContentSize(4000,2500);const g=shade.addComponent(Graphics);g.fillColor=new Color(17,28,21,200);g.rect(-2000,-1250,4000,2500);g.fill();shade.on(Node.EventType.TOUCH_START,()=>{});shade.on(Node.EventType.TOUCH_END,()=>{});
    const p=this.box(this.root,'SkillPanel',0,0,1160,610,'#fff0d2','#d6b76b');this.text(p,'选择技能',-360,253,35,350,55,'#355e40');this.text(p,'综合威力升序',-120,253,20,270,42,'#87745a');
    this.button(p,'SkillClose','返回',470,251,126,()=>{this.root.removeFromParent();this.root.destroy();this.close();});
    COMMON_SKILLS.slice(this.page*12,this.page*12+12).forEach((s,i)=>{
      const n=this.box(p,'SkillChoice-'+s.id,-460+i%4*172,136-Math.floor(i/4)*139,158,128,this.selected===s.id?'#dfd596':'#f3e0b8',this.selected===s.id?'#355e40':'#d0b77e');
      const known=!this.profile||isKnown(this.profile,'skills',s.id);if(known)this.icon(n,s.id,-26,17,66);else this.text(n,'?',-26,17,44,80,80);const open=!this.profile||unlocked(this.profile,'skills').includes(s.id);this.text(n,known?(s.powerRank<10?'0':'')+s.powerRank:'',52,38,17,40,28,'#87745a');this.text(n,known?s.name:'尚未发现',0,-35,21,150,36);this.text(n,open?known?['I','II','III','IV','V','VI'][s.powerTier-1]:'':'锁',50,2,17,35,25,'#9b662b');n.on(Node.EventType.TOUCH_END,()=>{this.selected=s.id;this.render();});
    });
    this.button(p,'SkillPrevious','‹',-446,-249,75,()=>{this.page=Math.max(0,this.page-1);this.render();});this.text(p,(this.page+1)+' / '+pages,-200,-249,22,180,40,'#355e40');this.button(p,'SkillNext','›',45,-249,75,()=>{this.page=Math.min(pages-1,this.page+1);this.render();});
    const s=commonSkillFor(this.selected),known=!this.profile||isKnown(this.profile,'skills',s.id),open=!this.profile||unlocked(this.profile,'skills').includes(s.id),card=this.box(p,'SelectedSkillDetails',355,-13,368,430,'#f7e6bf','#d0b77e');if(known)this.icon(card,s.id,0,125,100);else this.text(card,'?',0,125,70,200,110);this.text(card,known?s.name:'尚未发现',0,47,30,342,46,'#355e40');this.text(card,known?skillPowerText(s.id)+' · '+s.category:'',0,8,21,340,36,'#956735');
    this.text(card,known?'击杀15名小兵重置':'',0,-35,24,340,40,'#b3542a');this.text(card,known?s.damage+'  ·  '+s.range:'',0,-77,20,342,40);this.text(card,known?s.effect:'继续挑战，发现更多技能',0,-140,20,334,100);
    this.button(p,'ConfirmSkill',open?'携带此技能':'尚未解锁',355,-249,286,()=>{if(!s.unlocked||!open)return;this.choose(s.id);this.root.removeFromParent();this.root.destroy();},true);
  }
}
