import {stageBossHp,stageEnemyHp} from './stage-data';
import {addPanelClose} from './panel-ui';
import {Color,Graphics,Label,Layers,Node,Sprite,SpriteFrame,UITransform} from 'cc';
import {CHAPTERS,CHRONICLE_ENEMIES} from './chronicles';
import {COMMON_SKILLS,commonSkillFor,skillPowerText} from './common-skills';
import {EquippedWeapon,Tier,WEAPONS,TIER_COLORS,TIER_NAMES,weaponFor,calculateWeapon,weaponEffectText} from './weapons';
import {addWeaponIcon} from './presentation-art';
import {HeroId,heroMaxHearts} from './campaign';
import {HeroShowcase} from './HeroShowcase';
import {growthTitle,signatureId,growthRewardText} from './hero-growth';
import {petName} from './pets';

const FORM_HEROES=[{id:'liubei',name:'小刘'},{id:'guanyu',name:'小关'},{id:'zhangfei',name:'小张'}] as const;
const FORM_NAMES=['初始少年','本命进阶','获得坐骑','本命三连','骑乘冲刺','短甲与灵宠','桃园留名'];
interface FormCard {node:Node;icon?:Sprite;selected:boolean;}
interface FormHeroButton {node:Node;label:Label;selected:boolean;}
interface FormSurface {
  status:Label;message:Label;title:Label;summary:Label;apply:Label;
  cards:FormCard[];heroes:FormHeroButton[];hero?:HeroId;growth?:number;
}

export interface TrainingHost {
  snapshot():{stage?:number;heroId?:HeroId;weapons:EquippedWeapon[];skillId:string;alive:number;growth?:number};
  form?(id:HeroId,growth:number):string;
  spawn(id:string,count:number,boss:boolean):string;
  equip(id:string,tier:Tier,slot:number):string;
  remove(slot:number):string;
  skill(id:string):string;
  clear():string;
  refill():string;
  close():void;
  exit():void;
}
/** Sandbox configuration only. All effects and combat continue through GameBootstrap. */
export class TrainingView {
  readonly root:Node;
  private tab=0;private pages=[0,0,0,0,0];private choices=[0,0,0,0,0];
  private formHero:HeroId='liubei';private showcase?:HeroShowcase;
  private formSurface?:FormSurface;
  private count=1;private tier:Tier=1;private slot=0;private message='选择目标后加入战场，收起面板开始演武';
  constructor(parent:Node,private frames:Record<string,SpriteFrame>,private host:TrainingHost){
    this.root=this.node(parent,'TrainingPanel');this.root.active=false;
  }
  resize(w:number,h:number):void {const s=Math.min(1,(w-80)/1140,(h-70)/650);this.root.setScale(s,s,1);}
  show():void {const state=this.host.snapshot();this.formHero=state.heroId||'liubei';this.choices[4]=state.growth||0;this.root.active=true;this.render();}
  refresh():void {if(this.root.active)this.render();}
  update(dt:number):void {if(this.root.active)this.showcase?.update(dt);}
  hide():void {this.root.active=false;this.showcase=undefined;this.formSurface=undefined;for(const n of [...this.root.children]){n.removeFromParent();n.destroy();}}
  private node(p:Node,name:string):Node {const n=new Node(name);n.layer=Layers.Enum.UI_2D;p.addChild(n);return n;}
  private text(p:Node,t:string,x:number,y:number,size=20,w=300,h=36,color='#fff0d2'):Label {
    const n=this.node(p,t);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);const l=n.addComponent(Label);l.string=t;l.fontSize=size;l.lineHeight=size*1.3;l.color=new Color(color);l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;return l;
  }
  private box(p:Node,name:string,x:number,y:number,w:number,h:number,selected=false):Node {
    const n=this.node(p,name);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);n.addComponent(Graphics);this.paintBox(n,w,h,selected);return n;
  }
  private paintBox(n:Node,w:number,h:number,selected:boolean):void {
    const g=n.getComponent(Graphics)!;g.clear();g.fillColor=new Color(selected?'#526b43':'#2b4938');g.strokeColor=new Color(selected?'#ffdc8b':'#7c8c6c');g.lineWidth=selected?3:1;g.roundRect(-w/2,-h/2,w,h,15);g.fill();g.stroke();
  }
  private paintButton(n:Node,w:number,h:number,enabled:boolean,primary:boolean):void {
    const g=n.getComponent(Graphics)!;g.clear();g.fillColor=new Color(enabled?(primary?'#c94d2e':'#fff0d2'):'#5b6856');g.strokeColor=new Color(enabled?'#c7b57e':'#6f7b65');g.lineWidth=1.5;g.roundRect(-w/2,-h/2,w,h,12);g.fill();g.stroke();
  }
  private button(p:Node,name:string,t:string,x:number,y:number,w:number,f:()=>void,enabled=true,primary=false,h=46):Node {
    const n=this.box(p,name,x,y,w,h);this.paintButton(n,w,h,enabled,primary);this.text(n,t,0,0,w<80?19:22,w-10,h-4,enabled?(primary?'#fff0d2':'#432d1d'):'#b6bca8');
    n.on(Node.EventType.TOUCH_END,(e?:{propagationStopped:boolean})=>{if(e)e.propagationStopped=true;if(enabled)f();});return n;
  }
  private picture(p:Node,key:string,x:number,y:number,size:number):Sprite|undefined {
    if(!this.frames[key])return;const n=this.node(p,key),s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;n.setPosition(x,y);this.setPicture(s,key,size);return s;
  }
  private setPicture(s:Sprite,key:string,size:number):void {
    const frame=this.frames[key];if(!frame||s.spriteFrame===frame)return;s.spriteFrame=frame;const r=frame.rect,f=size/Math.max(r.width,r.height);s.node.getComponent(UITransform)!.setContentSize(r.width*f,r.height*f);
  }
  private weapon(p:Node,id:string,x:number,y:number,size:number):void {const n=addWeaponIcon(p,this.frames,weaponFor(id as EquippedWeapon['id']).id,this.tier,size);n.setPosition(x,y);}
  private act(f:()=>string):void {this.message=f();this.render();}
  private entries():{id:string;name:string;key:string}[] {
    if(this.tab===0)return CHRONICLE_ENEMIES.map(e=>({id:e.id,name:e.name,key:'enemy-'+e.id+'-front'}));
    if(this.tab===1)return CHAPTERS.map(c=>({id:String(c.id),name:c.boss,key:'boss-'+c.bossId}));
    if(this.tab===2)return WEAPONS.map(w=>({id:w.id,name:w.name,key:'icon-'+w.id}));
    if(this.tab===4)return FORM_NAMES.map((name,n)=>({id:String(n),name,key:n===0?'icon-'+signatureId(this.formHero,0):n===1||n===3?'icon-'+signatureId(this.formHero,n):n===2||n===4?'mount-'+this.formHero+'-'+(n===4?5:0):'hero-select-'+this.formHero}));
    return COMMON_SKILLS.map(s=>({id:s.id,name:s.name,key:'skill-'+s.icon}));
  }
  private render():void {
    // Keep the active form page alive across selections; hide/tab changes still free it.
    if(this.tab===4&&this.formSurface){this.refreshForm();return;}
    this.showcase=undefined;this.formSurface=undefined;
    for(const n of [...this.root.children]){n.removeFromParent();n.destroy();}
    const shade=this.node(this.root,'TrainingDimmer');shade.addComponent(UITransform).setContentSize(5000,3000);const sg=shade.addComponent(Graphics);sg.fillColor=new Color(10,24,17,150);sg.rect(-2500,-1500,5000,3000);sg.fill();shade.on(Node.EventType.TOUCH_START,()=>{});shade.on(Node.EventType.TOUCH_END,()=>{});
    const p=this.box(this.root,'TrainingSurface',0,0,1140,650),state=this.host.snapshot();
    p.on(Node.EventType.TOUCH_END,(e?:{propagationStopped:boolean})=>{if(e)e.propagationStopped=true;});
    this.text(p,'演武场',-418,278,36,240,52);const status=this.text(p,`生命 ∞  ·  在场 ${state.alive}/80`,-25,286,21,440,32,'#dcd3a8');
    const message=this.text(p,this.message,0,-251,16,1080,20,'#f0d899');
    if(this.host.form)this.button(p,'TrainingGrowth','英雄形态',288,278,150,()=>{const current=this.host.snapshot();this.tab=4;this.formHero=current.heroId||'liubei';this.choices[4]=current.growth||0;this.message='';this.render();});
    addPanelClose(p,this.frames,'TrainingClose',514,278,()=>this.host.close());
    ['小兵','Boss','武器','主动技能','英雄形态'].forEach((t,i)=>this.button(p,'TrainingTab-'+i,t,-438+i*122,214,112,()=>{this.tab=i;this.message='';this.render();},true,this.tab===i,44));
    const entries=this.entries(),pages=Math.ceil(entries.length/12),page=this.pages[this.tab],cards:FormCard[]=[];
    entries.slice(page*12,page*12+12).forEach((item,i)=>{
      const n=this.box(p,'TrainingChoice-'+this.tab+'-'+item.id,-438+i%4*153,126-Math.floor(i/4)*128,140,120,this.choices[this.tab]===page*12+i);
      const icon=this.picture(n,item.key,0,15,80);this.text(n,item.name,0,-41,18,130,30);
      if(this.tab===4)cards.push({node:n,icon,selected:this.choices[4]===i});
      if(this.tab===4)this.text(n,'阶段 '+item.id,-42,46,12,60,22,'#f5d68c');
      n.on(Node.EventType.TOUCH_END,()=>{this.choices[this.tab]=page*12+i;this.message='';this.render();});
    });
    this.button(p,'TrainingPrevious','‹',-438,-218,100,()=>{this.pages[this.tab]--;this.render();},page>0);
    this.text(p,`${page+1} / ${pages}  ·  ${entries.length}种`,-208,-218,19,220,32,'#ddd3b0');
    this.button(p,'TrainingNext','›',20,-218,100,()=>{this.pages[this.tab]++;this.render();},page<pages-1);
    const detail=this.box(p,'TrainingDetails',344,0,350,480),selected=entries[this.choices[this.tab]];
    if(this.tab!==4){this.text(detail,selected.name,0,188,28,320,46);this.picture(detail,selected.key,0,108,110);}
    if(this.tab===4){
      const heroes=FORM_HEROES.map((hero,i)=>{const selected=this.formHero===hero.id,node=this.button(detail,'TrainingHero-'+hero.id,hero.name,-108+i*108,197,98,()=>{this.formHero=hero.id;this.message='';this.render();},true,selected,40);return {node,label:node.children.find(n=>n.getComponent(Label))!.getComponent(Label)!,selected};});
      this.showcase=new HeroShowcase(detail,this.frames);this.showcase.root.setPosition(0,20);this.showcase.root.setScale(1.05,1.05,1);
      const title=this.text(detail,'',0,-58,26,320,40),summary=this.text(detail,'',0,-111,17,320,78);
      const apply=this.button(detail,'TrainingApplyForm','',0,-189,310,()=>this.act(()=>this.host.form?.(this.formHero,this.choices[4])||'形态切换不可用'),true,true,48);
      this.formSurface={status,message,title,summary,apply:apply.children.find(n=>n.getComponent(Label))!.getComponent(Label)!,cards,heroes};
    }else if(this.tab<2){
      const boss=this.tab===1,d=boss?undefined:CHRONICLE_ENEMIES[this.choices[0]],c=boss?CHAPTERS[this.choices[1]]:undefined;
      this.text(detail,boss?`第${c!.id}章 · ${c!.name}`:d!.group,0,28,19,320,32,'#e1d7b1');
      this.text(detail,boss?`生命 ${stageBossHp(c!.bossId)}  ·  移速 ${c!.bossSpeed}\n使用本章完整Boss技能`: `生命 ${stageEnemyHp(d!.hp,this.host.snapshot().stage||1,1)}  ·  移速 ${(d!.speed*(1+Math.min(.006*((this.host.snapshot().stage||1)-1),.12))).toFixed(1)}\n${d!.mechanic}`,0,-27,18,320,66);
      const change=(v:number)=>{this.count=Math.max(1,Math.min(80,this.count+v));this.render();};
      this.button(detail,'TrainingCountMinus10','−10',-124,-91,48,()=>change(-10));this.button(detail,'TrainingCountMinus','−',-71,-91,42,()=>change(-1));this.text(detail,String(this.count),0,-91,28,80,44);
      this.button(detail,'TrainingCountPlus','+',71,-91,42,()=>change(1));this.button(detail,'TrainingCountPlus10','+10',124,-91,48,()=>change(10));
      [1,5,10,20].forEach((v,i)=>this.button(detail,'TrainingCount-'+v,String(v),-111+i*74,-139,66,()=>{this.count=v;this.render();},true,this.count===v,34));
      this.button(detail,'TrainingSpawn',`加入战场 ×${this.count}`,0,-189,310,()=>this.act(()=>this.host.spawn(selected.id,this.count,boss)),state.alive<80,true,48);
    }else if(this.tab===2){
      [1,2,3,4].forEach((v,i)=>{
        const n=this.button(detail,'TrainingTier-'+v,['I','II','III','IV'][i],-111+i*74,36,66,()=>{this.tier=v as Tier;this.render();},true,false,36),g=n.getComponent(Graphics)!;
        g.clear();g.fillColor=new Color(TIER_COLORS[i]);g.strokeColor=new Color(this.tier===v?'#ffe6ac':'#61735d');g.lineWidth=this.tier===v?3:1;g.roundRect(-33,-18,66,36,10);g.fill();g.stroke();
        const label=n.children.find(c=>!!c.getComponent(Label))?.getComponent(Label);if(label)label.color=new Color(v===1?'#432d1d':'#ffffff');
      });
      const stats=calculateWeapon({id:selected.id as EquippedWeapon['id'],tier:this.tier},{power:0,melee:0,ranged:0,magic:0,damage:0,haste:0,range:0,area:0,crit:0},'');
      this.text(detail,`${TIER_NAMES[this.tier-1]} · 伤害基数 ${Number(stats.damage.toFixed(1))}`,0,-5,18,320,32);
      this.text(detail,weaponEffectText(selected.id as EquippedWeapon['id'],stats),0,-44,17,320,48);
      this.text(detail,'选择装备槽 · 空位按顺序装入',0,-84,16,320,26,'#d4d0ad');
      for(let i=0;i<6;i++){
        const w=state.weapons[i],n=this.box(detail,'TrainingSlot-'+i,-125+i*50,-119,45,52,this.slot===i);
        if(w){this.weapon(n,w.id,0,0,37);this.text(n,['I','II','III','IV'][w.tier-1],15,-17,10,19,15,TIER_COLORS[w.tier-1]);}else this.text(n,'+',0,0,24,40,40,'#a9b99c');
        n.on(Node.EventType.TOUCH_END,()=>{this.slot=Math.min(i,state.weapons.length);this.render();});
      }
      this.button(detail,'TrainingEquip',state.weapons[this.slot]?'替换此槽武器':'装备到空位',0,-176,310,()=>this.act(()=>this.host.equip(selected.id,this.tier,this.slot)),true,true,44);
      this.button(detail,'TrainingUnequip','卸下所选武器',0,-216,310,()=>this.act(()=>{const result=this.host.remove(this.slot);this.slot=Math.min(this.slot,this.host.snapshot().weapons.length);return result;}),!!state.weapons[this.slot]&&state.weapons.length>1,false,30);
    }else{
      const skill=commonSkillFor(selected.id);
      this.text(detail,skillPowerText(skill.id)+' · '+skill.category,0,28,20,320,32,'#e1d7b1');
      this.text(detail,`演武场无冷却 · ${skill.duration}`,0,-10,18,320,34);
      this.text(detail,skill.effect,0,-88,19,310,115);
      this.button(detail,'TrainingEquipSkill',state.skillId===skill.id?'已携带 · 重新装配':'携带此技能',0,-189,310,()=>this.act(()=>this.host.skill(skill.id)),true,true,48);
    }
    this.button(p,'TrainingClear','清空战场',-420,-285,200,()=>this.act(()=>this.host.clear()));
    this.button(p,'TrainingRefill','重置技能',-190,-285,200,()=>this.act(()=>this.host.refill()));
    this.button(p,'TrainingExit','返回首页',40,-285,200,()=>this.host.exit());
    this.button(p,'TrainingResume','进入战场  →',350,-285,300,()=>this.host.close(),true,true,54);
    if(this.formSurface)this.refreshForm();
  }
  private refreshForm():void {
    const ui=this.formSurface!,state=this.host.snapshot(),growth=this.choices[4],entries=this.entries();
    ui.status.string=`生命 ∞  ·  在场 ${state.alive}/80`;ui.message.string=this.message;
    for(let i=0;i<ui.cards.length;i++){
      const card=ui.cards[i],selected=i===growth;if(card.selected!==selected){this.paintBox(card.node,140,120,selected);card.selected=selected;}
      if(card.icon)this.setPicture(card.icon,entries[i].key,80);
    }
    for(let i=0;i<ui.heroes.length;i++){
      const hero=ui.heroes[i],selected=FORM_HEROES[i].id===this.formHero;
      if(hero.selected!==selected){this.paintButton(hero.node,98,40,true,selected);hero.label.color=new Color(selected?'#fff0d2':'#432d1d');hero.selected=selected;}
    }
    if(ui.hero!==this.formHero||ui.growth!==growth){this.showcase!.setHero(this.formHero,signatureId(this.formHero,growth) as EquippedWeapon['id'],growth);ui.hero=this.formHero;ui.growth=growth;}
    ui.title.string=growthTitle(this.formHero,growth);
    const hearts=heroMaxHearts(this.formHero)+Math.min(2,growth),bonus=growth===0?'基础武器 · 徒步战斗':growthRewardText(this.formHero,growth);
    ui.summary.string=`${hearts}颗心 · ${growth>=2?'坐骑移速 +30%':'基础移速'}\n${bonus}${growth>=5?'\n灵宠：'+petName(this.formHero):''}`;
    ui.apply.string=state.heroId===this.formHero&&(state.growth||0)===growth?'当前形态 · 重新应用':'应用此形态';
    this.showcase!.update(0);
  }
}
