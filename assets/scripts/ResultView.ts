import { Color, Graphics, Label, Layers, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { heroFor, Run, WAVE_SECONDS } from './campaign';
import { clockText } from './survival';
import { TIER_COLORS, WEAPON_LIMIT } from './weapons';
import { addWeaponIcon } from './presentation-art';

const P={paper:'#fff0d2',ink:'#432d1d',muted:'#887053',green:'#355e40',red:'#c94d2e',gold:'#f1cd80'};
const QUIPS={liubei:'鞋还在，面子没了。',guanyu:'挑不动了，先歇一担。',zhangfei:'俺这刀，先歇会儿。'};
const WIN_QUIPS={liubei:'这张角，还得用鞋劝。',guanyu:'一担挑翻，黄巾散场。',zhangfei:'俺这刀，今天立功了！'};

/** A dedicated defeat composition. All three heroes use actual crying art. */
export class ResultView {
  readonly content:Node;
  private background?:Sprite;
  private shade:Graphics;
  private portrait?:Node;
  private age=0;
  constructor(parent:Node,private frames:Record<string,SpriteFrame>,run:Run,kills:number,best:number,record:boolean,
    retry:()=>void,menu:()=>void,testing:boolean,warmupElapsed=0,private won=false){
    const base=this.node(parent,'ResultBackdrop');this.shade=base.addComponent(Graphics);
    this.background=this.sprite(parent,frames['hero-menu-background']||frames['camp-background'],0,0,1,1,'ResultLandscape');
    const tint=this.node(parent,'ResultVignette').addComponent(Graphics);
    tint.fillColor=new Color(23,38,29,222);tint.rect(-4000,-2000,8000,4000);tint.fill();
    this.content=this.node(parent,'ResultContent');const p=this.content;
    this.text(p,'桃 园 战 报',-385,292,17,P.gold,430,32);
    const title=this.text(p,testing?'测 试 结 束':won?'通关啦！':'这把，先撤了！',-385,245,43,P.paper,460,68,true);title.fontFamily='serif';title.node.name='ResultTitle';
    const flourish=this.node(p,'TitleInk').addComponent(Graphics);flourish.strokeColor=new Color('#a68c56');flourish.lineWidth=2;
    flourish.moveTo(-555,211);flourish.bezierCurveTo(-450,204,-330,204,-216,213);flourish.stroke();

    const halo=this.node(p,'HeroInkWash').addComponent(Graphics);
    halo.fillColor=new Color(191,184,125,20);halo.ellipse(-385,-3,190,188);halo.fill();
    halo.strokeColor=new Color(221,204,151,50);halo.lineWidth=1;halo.ellipse(-385,-3,180,177);halo.stroke();
    halo.fillColor=new Color(5,16,10,65);halo.ellipse(-385,-143,113,16);halo.fill();
    const cry=this.sprite(p,frames[(won?'hero-select-':'result-')+run.heroId],-385,32,340,340,won?'VictoryHero':'CryingHero');
    if(cry)this.portrait=cry.node;
    else if(!won)this.tearFallback(p); // A win must never show a tear fallback.
    this.text(p,heroFor(run).name,-385,-172,29,P.paper,360,48,true).node.name='ResultHeroName';
    this.text(p,(won?WIN_QUIPS:QUIPS)[run.heroId],-385,-215,20,'#d5d2b3',430,42).node.name='ResultQuip';

    const paper=this.node(p,'ResultPaper');paper.setPosition(245,46);
    const sheet=paper.addComponent(Graphics);sheet.fillColor=new Color(10,22,15,80);sheet.roundRect(-332,-229,668,448,26);sheet.fill();
    sheet.fillColor=new Color(P.paper);sheet.strokeColor=new Color('#6d5031');sheet.lineWidth=3;sheet.roundRect(-330,-220,660,440,22);sheet.fill();sheet.stroke();
    sheet.strokeColor=new Color('#ddc494');sheet.lineWidth=1.5;sheet.roundRect(-320,-210,640,420,17);sheet.stroke();
    const texture=this.sprite(paper,frames['camp-paper'],0,0,660,440,'ResultPaperTexture');if(texture)texture.type=Sprite.Type.SLICED;
    this.text(paper,won?'通关用时':run.wave===1?'热身坚持':'本局坚持',-188,175,20,P.green,180,36,true).node.name='ResultTimeLabel';
    const badge=this.node(paper,'ResultBadge');badge.setPosition(208,175);badge.angle=record?-4:0;
    const seal=badge.addComponent(Graphics);seal.fillColor=new Color(record?'#f1d18b':'#e9ddbd');seal.roundRect(-85,-20,170,40,12);seal.fill();
    this.text(badge,testing?'内部测试':won?(record?'刷新通关纪录':'张角已击败'):run.wave===1?'桃园热身':`守住${run.wavesCleared}/3波`,0,0,18,record?'#95512b':P.green,158,34,true);
    const elapsed=run.wave===1?Math.max(0,Math.min(WAVE_SECONDS,warmupElapsed)):WAVE_SECONDS+run.survivalSeconds;
    this.text(paper,clockText(elapsed),-51,98,92,P.ink,474,118,true).node.name='ResultTime';
    const stamp=this.node(paper,won?'VictorySeal':'DefeatSeal');stamp.setPosition(246,86);stamp.angle=-10;
    const ink=stamp.addComponent(Graphics);ink.strokeColor=new Color(178,75,48,175);ink.lineWidth=3;ink.roundRect(-34,-34,68,68,7);ink.stroke();
    ink.lineWidth=1;ink.roundRect(-28,-28,56,56,3);ink.stroke();this.text(stamp,won?'胜':'败',0,0,43,'#b55d40',62,62,true).fontFamily='serif';
    const rules=this.node(paper,'ResultDividers').addComponent(Graphics);rules.strokeColor=new Color('#dcc9a5');rules.lineWidth=1.5;
    for(const y of [30,-64]){rules.moveTo(-282,y);rules.lineTo(282,y);}rules.stroke();
    const stats=[['击败敌兵',String(kills)],[won?'最快通关':'已守波数',won?clockText(best||elapsed):`${run.wavesCleared}/3`],['剩余铜钱',String(run.gold)]];
    stats.forEach(([label,value],i)=>{
      const x=(i-1)*202;this.text(paper,value,x,-4,i===1?35:38,P.ink,184,55,true).node.name='ResultStat-'+i;
      this.text(paper,label,x,-43,17,P.muted,184,30);
    });
    this.text(paper,'本局武器',-226,-85,17,P.muted,120,28);
    this.text(paper,`天命 ${run.augments.length}  ·  道具 ${Object.keys(run.inventory).length}种`,169,-85,16,P.muted,250,28);
    for(let i=0;i<WEAPON_LIMIT;i++){
      const weapon=run.weapons[i],slot=this.node(paper,'ResultWeapon-'+i);slot.setPosition((i-2.5)*92,-135);
      slot.addComponent(UITransform).setContentSize(80,70);const g=slot.addComponent(Graphics);
      g.fillColor=new Color(weapon?'#f3e2bf':'#ede2cc');g.strokeColor=new Color(weapon?TIER_COLORS[weapon.tier-1]:'#d7c7a8');g.lineWidth=weapon?2.5:1;g.roundRect(-40,-35,80,70,11);g.fill();g.stroke();
      if(weapon){
        const art=addWeaponIcon(slot,frames,weapon.id,weapon.tier,59);art.name='ResultWeaponArt';art.setPosition(-2,1);
        this.text(slot,['I','II','III','IV'][weapon.tier-1],28,-21,13,P.muted,21,21);
      }else this.text(slot,'—',0,0,18,'#c3b393',65,40);
    }
    let committed=false;const commit=(action:()=>void):void=>{if(committed)return;committed=true;action();};
    this.button(p,'ResultMenu','返回选人',67,-272,270,false,()=>commit(menu));
    this.button(p,'ResultRetry','再来一局',410,-272,330,true,()=>commit(retry));
    this.resize(1334,750);
  }
  resize(width:number,height:number):void {
    const scale=Math.min(1.04,(width-112)/1200,(height-80)/660);this.content.setScale(scale,scale,1);
    const g=this.shade;g.clear();g.fillColor=new Color('#273b2e');g.rect(-width/2,-height/2,width,height);g.fill();
    if(this.background)this.background.node.getComponent(UITransform)!.setContentSize(Math.max(width,height*2.13),Math.max(height,width/2.13));
  }
  update(dt:number):void {
    this.age+=Math.min(.05,Math.max(0,dt));if(!this.portrait)return;
    if(this.won){this.portrait.setPosition(-385,32+Math.sin(this.age*3)*2);this.portrait.angle=Math.sin(this.age*2)*1.2;return;}
    const beat=this.age%2.8,sob=beat<.9?Math.sin(beat*25)*Math.exp(-beat*3):0;
    this.portrait.setPosition(-385,32+Math.abs(sob)*2);this.portrait.angle=sob*.65;
  }
  private node(parent:Node,name:string):Node {const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);return n;}
  private text(parent:Node,value:string,x:number,y:number,size:number,color:string,w:number,h:number,bold=false):Label {
    const n=this.node(parent,value);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);const l=n.addComponent(Label);
    l.string=value;l.fontSize=size;l.lineHeight=size*1.3;l.isBold=bold;l.color=new Color(color);l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;return l;
  }
  private sprite(parent:Node,frame:SpriteFrame|undefined,x:number,y:number,w:number,h:number,name:string):Sprite|undefined {
    if(!frame)return;const n=this.node(parent,name);n.setPosition(x,y);const s=n.addComponent(Sprite);s.spriteFrame=frame;s.sizeMode=Sprite.SizeMode.CUSTOM;n.getComponent(UITransform)!.setContentSize(w,h);return s;
  }
  private button(parent:Node,name:string,label:string,x:number,y:number,width:number,primary:boolean,action:()=>void):void {
    const n=this.node(parent,name);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(width,76);const g=n.addComponent(Graphics);
    g.fillColor=new Color(primary?'#693922':'#152d22');g.roundRect(-width/2,-43,width,76,18);g.fill();
    g.fillColor=new Color(primary?P.red:'#e8dfc6');g.strokeColor=new Color(primary?'#f49a65':'#b9ba94');g.lineWidth=2.5;g.roundRect(-width/2,-36,width,72,17);g.fill();g.stroke();
    g.strokeColor=new Color(primary?'#e9754c':'#fff1d0');g.lineWidth=1;g.roundRect(-width/2+6,-30,width-12,60,13);g.stroke();
    this.text(n,label,0,0,primary?29:25,primary?P.paper:P.green,width-30,58,true);
    n.on(Node.EventType.TOUCH_START,()=>n.setPosition(x,y-3));n.on(Node.EventType.TOUCH_CANCEL,()=>n.setPosition(x,y));
    n.on(Node.EventType.TOUCH_END,()=>{n.setPosition(x,y);action();});
  }
  private tearFallback(parent:Node):void {
    const g=this.node(parent,'CryingArtFallback').addComponent(Graphics);g.fillColor=new Color('#a5d9ed');g.strokeColor=new Color('#4f90b1');g.lineWidth=3;
    g.moveTo(-385,125);g.bezierCurveTo(-470,20,-465,-55,-385,-55);g.bezierCurveTo(-305,-55,-300,20,-385,125);g.close();g.fill();g.stroke();
  }
}
