import type {BattleSpriteAtlas} from './BattleSpriteAtlas';
import {HeroShowcase} from './HeroShowcase';
import {growthClears,growthTitle,growthRewardText,signatureId,dashName} from './hero-growth';
import {Color,Graphics,Label,Node,Sprite,SpriteFrame,Rect,UITransform} from 'cc';
import {Run,heroFor,heroMaxHearts,ITEMS} from './campaign';
import {STAGES,stageFor,bossDisplayName,STAGE_THEMES,STARTER_WEAPONS} from './stage-data';
import {StageProfile,StageReward,highestStage} from './stage-progress';
import {WeaponId,weaponFor} from './weapons';
import {commonSkillFor} from './common-skills';
import {addWeaponIcon} from './presentation-art';
import {clockText} from './survival';
const C={jade:'#294e3c',paper:'#fff0d2',gold:'#efd08a',ink:'#48351e',red:'#cf512f',muted:'#b3c1a4'};
class StageSurface {
 readonly root:Node;readonly panel:Node;
 constructor(parent:Node,protected frames:Record<string,SpriteFrame>,name:string,w=1180,h=650,modal=true){this.root=this.node(parent,name);this.root.addComponent(UITransform).setContentSize(w,h);if(modal){const shade=this.node(this.root,'Dimmer'),g=shade.addComponent(Graphics);shade.addComponent(UITransform).setContentSize(6000,4000);g.fillColor=new Color(12,26,19,170);g.rect(-3000,-2000,6000,4000);g.fill();shade.on(Node.EventType.TOUCH_START,()=>{});shade.on(Node.EventType.TOUCH_END,()=>{});}this.panel=this.box(this.root,'StagePanel',0,0,w,h,C.jade);}
 protected node(p:Node,name:string){const n=new Node(name);n.layer=p.layer;p.addChild(n);return n;}
 protected text(p:Node,t:string,x:number,y:number,size:number,w=300,h=45,color:string=C.paper){const n=this.node(p,t);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);const l=n.addComponent(Label);l.string=t;l.fontSize=size;l.lineHeight=size*1.3;l.color=new Color(color);l.isBold=true;l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;return l;}
 protected box(p:Node,name:string,x:number,y:number,w:number,h:number,color:string=C.jade){
  const n=this.node(p,name);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);
  const skin=this.frames['stage-panel'];
  if(skin&&color!==C.paper&&color!=='#ffffff00'){const image=this.node(n,'JadeSkin'),sp=image.addComponent(Sprite);sp.spriteFrame=skin;sp.type=Sprite.Type.SLICED;sp.sizeMode=Sprite.SizeMode.CUSTOM;image.getComponent(UITransform)!.setContentSize(w,h);if(color==='#344c43'||color==='#3b5045')sp.color=new Color('#9bab9e');}
  else{const g=n.addComponent(Graphics);g.fillColor=new Color(color);g.strokeColor=new Color(C.gold);g.lineWidth=2;g.roundRect(-w/2,-h/2,w,h,20);g.fill();g.stroke();}return n;
 }
 protected button(p:Node,name:string,t:string,x:number,y:number,w:number,f:()=>void,enabled=true,primary=false){
  const n=this.box(p,name,x,y,w,primary?72:62,enabled?primary?C.red:'#486a4c':'#3b5045');
  if(primary&&enabled&&this.frames['hero-menu-start']){const skin=n.children.find(c=>c.name==='JadeSkin');if(skin)skin.active=false;const image=this.node(n,'RedButtonArt'),sp=image.addComponent(Sprite);sp.spriteFrame=this.frames['hero-menu-start'];sp.sizeMode=Sprite.SizeMode.CUSTOM;image.getComponent(UITransform)!.setContentSize(w+22,112);}
  const l=this.text(n,t,0,0,primary?30:24,w-20,50,enabled?C.paper:C.muted);l.fontFamily='serif';n.on(Node.EventType.TOUCH_END,()=>{if(enabled)f();});return n;
 }
 protected glow(p:Node,w:number,h:number):Node{const n=this.node(p,'SelectedStage'),g=n.addComponent(Graphics);for(const [line,alpha]of[[12,30],[7,65],[3,240]]){g.lineWidth=line;g.strokeColor=new Color(255,209,97,alpha);g.roundRect(-w/2,-h/2,w,h,18);g.stroke();}return n;}
 protected lock(p:Node,x:number,y:number):void{const g=this.node(p,'StageLock').addComponent(Graphics);g.fillColor=new Color('#bec6b2');g.strokeColor=new Color('#bec6b2');g.lineWidth=3;g.moveTo(x-7,y+3);g.lineTo(x-7,y+12);g.bezierCurveTo(x-7,y+23,x+7,y+23,x+7,y+12);g.lineTo(x+7,y+3);g.stroke();g.roundRect(x-12,y-10,24,22,4);g.fill();g.fillColor=new Color('#34503d');g.circle(x,y+2,3);g.fill();g.rect(x-1,y-4,2,6);g.fill();}
 protected flourish(p:Node,x:number,y:number):void{const n=this.node(p,'GoldCurl');n.setPosition(x,y);const g=n.addComponent(Graphics);g.strokeColor=new Color(C.gold);g.lineWidth=3;g.moveTo(-24,0);g.bezierCurveTo(-5,6,20,-11,22,2);g.bezierCurveTo(24,16,2,14,6,4);g.bezierCurveTo(8,0,15,4,12,8);g.stroke();}
 protected picture(p:Node,key:string,x:number,y:number,size:number){const f=this.frames[key];if(!f)return;const n=this.node(p,key);n.setPosition(x,y);const s=n.addComponent(Sprite);s.spriteFrame=f;s.sizeMode=Sprite.SizeMode.CUSTOM;const r=f.rect;n.getComponent(UITransform)!.setContentSize(size*r.width/Math.max(r.width,r.height),size*r.height/Math.max(r.width,r.height));}
 close(){this.root.removeFromParent();this.root.destroy();}
}
/** Selected stage is a full illustrated card, not a text-only placeholder panel. */
export class StageBriefView extends StageSurface {
 constructor(parent:Node,frames:Record<string,SpriteFrame>){super(parent,frames,'HeroStageSelect',500,380,false);}
 setSelection(profile:StageProfile,hero:string,stage:number):void {
  const p=this.panel;for(const n of [...p.children])if(n.name!=='JadeSkin'){n.removeFromParent();n.destroy();}
  const d=stageFor(stage),name=heroFor({heroId:hero} as Run).name,done=Object.keys(profile.heroes[hero]||{}).length;
  const tab=this.box(p,'JourneyTitle',0,187,360,48);this.text(tab,name+' · '+growthTitle(hero,growthClears(profile,hero)),0,0,27,330,40).fontFamily='serif';
  const image=this.node(p,'CurrentStageLandscape');image.setPosition(0,91);const sp=image.addComponent(Sprite);sp.spriteFrame=this.frames['stage-thumb-'+stage];sp.sizeMode=Sprite.SizeMode.CUSTOM;image.getComponent(UITransform)!.setContentSize(444,124);
  this.text(p,String(stage).padStart(2,'0')+' '+d.name,0,-5,35,440,52).fontFamily='serif';
  this.text(p,'五波挑战',0,-48,21,250,34,C.gold);this.flourish(p,-173,-47);this.flourish(p,170,-47);
  const badges=[{key:stage===2?'boss-lvbu':'enemy-'+['E06','','E08','E21','E25','E40'][stage-1]+'-front',name:stage===1?'冲锋精英 ×3':d.miniBoss},{key:'boss-'+d.boss,name:bossDisplayName(d.boss)}];
  badges.forEach((b,i)=>{const n=this.box(p,'StageBossBadge-'+i,(i-.5)*218,-98,200,55);this.picture(n,b.key,-60,3,63);this.text(n,b.name,28,0,20,132,44).fontFamily='serif';});
  this.text(p,'更换关卡 ›',0,-153,25,340,43).fontFamily='serif';this.flourish(p,-170,-153);this.flourish(p,169,-153);
 }
}
export class StagePickerView extends StageSurface {
 private selected:number;
 constructor(parent:Node,frames:Record<string,SpriteFrame>,profile:StageProfile,hero:string,selected:number,choose:(stage:number)=>void,close:()=>void){
  super(parent,frames,'StageSelection');this.selected=selected;
  this.picture(this.panel,'hero-'+hero+'-open',-205,270,74);
  this.text(this.panel,heroFor({heroId:hero} as Run).name+'的征程',-33,270,40,490,62).fontFamily='serif';
  const count=this.box(this.panel,'StageProgress',373,270,220,46);this.text(count,'已通关 '+Object.keys(profile.heroes[hero]||{}).length+'/6',0,0,22,200,40).fontFamily='serif';
  this.button(this.panel,'StageCancel','×',565,316,58,()=>{this.close();close();});
  let refresh=()=>{};const marks:Node[]=[];
  STAGES.forEach((d,i)=>{
   const open=i+1<=highestStage(profile,hero),done=!!profile.heroes[hero]?.[d.id],n=this.box(this.panel,'StageChoice-'+(i+1),(i%3-1)*366,132-Math.floor(i/3)*215,346,204,open?C.jade:'#344c43');
   const image=this.node(n,'ThemeThumbnail');image.setPosition(0,36);const sp=image.addComponent(Sprite);sp.spriteFrame=this.frames['stage-thumb-'+(i+1)];sp.sizeMode=Sprite.SizeMode.CUSTOM;sp.color=new Color(open?'#ffffff':'#82968a');image.getComponent(UITransform)!.setContentSize(326,116);
   this.text(n,String(i+1).padStart(2,'0')+' '+d.name,0,-48,27,320,43,open?C.paper:'#c5cbb9').fontFamily='serif';
   if(open)this.text(n,done?'✓ 已通关':'可挑战',0,-84,19,290,30,C.gold).fontFamily='serif';else this.lock(n,0,-85);
   const m=this.glow(n,342,200);m.active=this.selected===i+1;marks.push(m);
   n.on(Node.EventType.TOUCH_END,()=>{this.selected=i+1;marks.forEach((mark,j)=>mark.active=j===i);refresh();});
  });
  const footer=this.node(this.panel,'StageRewards');
  refresh=()=>{
   for(const n of [...footer.children]){n.removeFromParent();n.destroy();}const old=this.panel.children.find(n=>n.name==='ConfirmStage');if(old){old.removeFromParent();old.destroy();}
   const d=stageFor(this.selected),open=this.selected<=highestStage(profile,hero);
   this.text(footer,open?'首通解锁':'尚未解锁',-467,-248,23,170,46,C.gold).fontFamily='serif';
   [['武器',d.firstClear.weapons.length],['道具',d.firstClear.passives.length],['技能',d.firstClear.skills.length]].forEach(([label,count],i)=>{const badge=this.box(footer,'RewardCategory-'+i,-282+i*159,-248,145,47);this.text(badge,label+' +'+count,0,0,20,130,39,C.gold);});
   this.button(this.panel,'ConfirmStage',open?'选择此关':'尚未解锁',373,-248,300,()=>{if(open){choose(this.selected);this.close();}},open,true);
   this.text(footer,open?'通关当前关卡后解锁下一关':'本英雄通关上一关后解锁',0,-304,17,1050,24,'#d4d3b1');
  };refresh();
 }
}
export class StarterSelectView extends StageSurface {
 constructor(parent:Node,frames:Record<string,SpriteFrame>,selected:WeaponId,choose:(id:WeaponId)=>void,close:()=>void){super(parent,frames,'StarterSelection',900,450);this.text(this.panel,'选择初始武器',0,173,34,720,56);this.text(this.panel,'基础 I 级 · 开局装备一把',0,119,20,700,36,C.gold);
 STARTER_WEAPONS.forEach((id,i)=>{const n=this.box(this.panel,'StarterChoice-'+id,(i-1)*270,-17,240,206,id===selected?'#647744':'#365a43');const art=addWeaponIcon(n,frames,id,1,105);art.setPosition(0,28);this.text(n,weaponFor(id).name,0,-54,25,228,42);this.text(n,id===selected?'已选择':'携带',0,-88,18,210,32,C.gold);n.on(Node.EventType.TOUCH_END,()=>{choose(id);this.close();});});this.button(this.panel,'StarterCancel','返回',0,-178,260,()=>{this.close();close();});}
}
export class StageClearView extends StageSurface {
 private showcase:HeroShowcase;private background?:Sprite;
 constructor(parent:Node,frames:Record<string,SpriteFrame>,run:Run,kills:number,reward:StageReward,next:()=>void,menu:()=>void,saved:boolean,atlas?:BattleSpriteAtlas){
  super(parent,frames,'StageClear',1240,690,false);const p=this.panel,s=stageFor(run.chapter),growth=reward.growthAfter||0;
  // An open celebration scene, without the former full-screen green frame.
  const old=p.children.find(n=>n.name==='JadeSkin');if(old)old.active=false;
  const bg=this.node(this.root,'ClearLandscape');bg.setSiblingIndex(0);this.background=bg.addComponent(Sprite);this.background.spriteFrame=frames['hero-menu-background']||frames['camp-background'];this.background.sizeMode=Sprite.SizeMode.CUSTOM;this.background.color=new Color('#a0ac8e');
  const wash=this.node(this.root,'ClearShade');wash.setSiblingIndex(1);const tint=wash.addComponent(Graphics);tint.fillColor=new Color(23,42,30,150);tint.rect(-3000,-2000,6000,4000);tint.fill();
  this.text(p,'挑 战 成 功',-420,285,44,360,66,C.gold).fontFamily='serif';
  this.text(p,`${String(run.chapter).padStart(2,'0')}  ${s.name} · ${bossDisplayName(s.boss)}已败`,185,286,29,800,54,C.paper).node.name='ClearStageName';
  this.showcase=new HeroShowcase(p,frames);this.showcase.setHero(run.heroId,signatureId(run.heroId,growth) as WeaponId,growth);
  const size=growth>=2?2.2:2.8;this.showcase.root.setPosition(-420,-140+(growth>=2?30:19)*size);this.showcase.root.setScale(size,size,1);
  this.text(p,heroFor(run).name+' · '+growthTitle(run.heroId,growth),-420,-185,27,360,46,C.paper).node.name='ClearHeroTitle';
  const base=heroFor(run).hp,before=base+(reward.growthBefore||0),after=base+growth;
  this.text(p,reward.firstHeroClear?`♥  生命上限  ${before} → ${after}`:`♥  生命上限 ${after}`,-420,-225,23,360,40,C.gold).node.name='ClearHeartReward';
  const feature=run.chapter===1?weaponFor(signatureId(run.heroId,growth) as WeaponId).name+'解锁':run.chapter===2?(run.heroId==='liubei'?'白马':run.heroId==='guanyu'?'赤兔':'黑猪')+' · 移速+30%':run.chapter===3?'本命三连解锁':run.chapter===4?dashName(run.heroId)+'解锁':run.chapter===5?'最终形象解锁':'桃园留名';
  this.text(p,reward.firstHeroClear?feature:'成长已保存 · 重复挑战不叠加',-420,-257,19,360,32,C.muted).node.name='ClearGrowthFeature';
  const paper=this.box(p,'ClearRewards',185,34,800,456,C.paper);
  const fresh=reward.weapons.length+reward.passives.length+reward.skills.length;
  this.text(paper,'本关奖励',-240,185,29,260,46,C.ink).node.name='ClearRewardHeading';
  this.text(paper,fresh?`${fresh}项新解锁 · 全英雄可用`:'已在账号解锁 · 全英雄可用',181,185,18,380,38,'#54724d');
  this.text(paper,`用时 ${clockText(run.elapsed)}     击败 ${kills}     剩余生命 ${run.hearts}/${heroMaxHearts(run)}`,0,143,20,748,36,'#887255').node.name='ClearStats';
  const groups=[['weapons','武器'],['passives','道具'],['skills','技能']] as const;
  groups.forEach(([kind,label],row)=>{
   const all=s.firstClear[kind],y=65-row*101;this.text(paper,label+' '+all.length,-340,y,20,92,38,'#436047');
   if(!all.length){this.text(paper,'—',0,y,22,600,42,'#9b947e');return;}
   const spacing=Math.min(102,622/all.length);
   all.forEach((id,i)=>{
    const n=this.node(paper,'Reward-'+id);n.setPosition(18+(i-(all.length-1)/2)*spacing,y);n.addComponent(UITransform).setContentSize(spacing-4,88);
    if(kind==='weapons'){const art=addWeaponIcon(n,frames,id as WeaponId,1,58);art.setPosition(0,9);}else this.picture(n,kind==='skills'?'skill-'+commonSkillFor(id).icon:frames['item-'+id]?'item-'+id:'ui-power',0,9,58);
    const name=kind==='weapons'?weaponFor(id as WeaponId).name:kind==='skills'?commonSkillFor(id).name:ITEMS.find(v=>v.id===id)?.name||id;
    this.text(n,name,0,-31,16,spacing-3,34,C.ink);
    if((reward[kind] as string[]).includes(id))this.text(n,'新',30,34,12,24,22,C.red).node.name='RewardNew';
    n.on(Node.EventType.TOUCH_END,()=>{
     if(this.root.children.some(v=>v.name==='RewardDetails'))return;
     const card=this.box(this.root,'RewardDetails',0,0,800,370,C.paper),desc=kind==='weapons'?weaponFor(id as WeaponId).desc:kind==='skills'?commonSkillFor(id).effect:ITEMS.find(v=>v.id===id)?.desc||'';
     this.text(card,name,0,120,34,730,55,C.ink);this.text(card,desc,0,20,24,730,130,C.ink);this.text(card,kind==='skills'?'全英雄可用 · 击杀15名小兵重置':'全英雄可用 · 商店刷出后购买',0,-78,20,730,40,'#55784e');
     this.button(card,'RewardDetailsClose','知道了',0,-139,300,()=>{card.removeFromParent();card.destroy();});
    });
   });
  });
  this.text(p,saved?(run.chapter<6?`下一战 · ${stageFor(run.chapter+1).name}`:'六关告捷，桃园留名！'):'保存失败，请保留游戏并重试保存',185,-236,22,790,38,saved?C.gold:'#ffb894').node.name='ClearNextStage';
  let committed=false;const once=(f:()=>void)=>{if(committed)return;committed=true;f();};
  const cta=(name:string,title:string,x:number,w:number,action:()=>void,primary:boolean,enabled=true)=>{
   const n=this.node(p,name);n.setPosition(x,-306);n.addComponent(UITransform).setContentSize(w,64);const color=enabled?primary?'#c94d2e':'#fff0d2':'#d3c9b2';
   if(!atlas?.addSliced(n,'ui-pill-'+color,w,64,12)){const g=n.addComponent(Graphics);g.fillColor=new Color(color);g.strokeColor=new Color('#432d1d');g.lineWidth=2;g.roundRect(-w/2,-32,w,64,18);g.fill();g.stroke();}
   this.text(n,title,0,0,27,w-24,52,primary?C.paper:C.ink).fontFamily='serif';n.on(Node.EventType.TOUCH_END,()=>{if(enabled)once(action);});
  };
  cta('StageClearMenu','返回备战',-420,308,menu,false);cta('StageClearNext',run.chapter<6?'下一关  →':'返回备战',290,420,next,true,saved);
 }
 resize(w:number,h:number){const scale=Math.min((w-80)/1240,(h-60)/690,1.05);this.root.setScale(scale,scale,1);if(this.background){const r=this.background.spriteFrame?.rect,aspect=r?r.width/r.height:2;this.background.node.getComponent(UITransform)!.setContentSize(Math.max(w/scale,h/scale*aspect),Math.max(h/scale,w/scale/aspect));}}
 update(dt:number){this.showcase.update(dt);}
}

/** Read-only permanent growth details, kept out of the combat HUD. */
export class GrowthDetailView extends StageSurface {
 constructor(parent:Node,frames:Record<string,SpriteFrame>,id:Run['heroId'],count:number,close:()=>void){super(parent,frames,'HeroGrowthDetails',960,590);this.text(this.panel,'本命成长 · '+growthTitle(id,count),0,238,34,860,60,C.gold);this.text(this.panel,'本命占一个武器位 · 每关首通增加1心',0,180,21,850,40);const names=['黄巾起义','虎牢讨董','官渡争锋','赤壁鏖兵','南中平蛮','五丈原决战'];for(let i=0;i<6;i++){const y=111-i*49;this.text(this.panel,(i<count?'✓ ':'○ ')+names[i],-297,y,22,220,40,i<count?C.gold:C.muted);this.text(this.panel,growthRewardText(id,i+1),120,y,21,590,40,i<count?C.paper:C.muted);}this.button(this.panel,'GrowthClose','返回',0,-244,320,()=>{this.close();close();});}
}
