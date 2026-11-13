import {extraHitFactor,extraMechanics,isExtraWeapon} from './extra-weapons';
import {Color,Graphics,Label,Node,Sprite,SpriteFrame,UITransform} from 'cc';
import {CHAPTERS,CHRONICLE_ENEMIES,GENERIC_SKILLS,chapterFor,scaledEnemy,BOSS_ACTIONS} from './chronicles';
import {WEAPONS,TIER_COLORS,CLASS_NAMES,Tier,calculateWeapon,weaponEffectText} from './weapons';
import {HEROES} from './campaign';
import {addWeaponIcon} from './presentation-art';
import {COMMON_SKILLS,commonSkillFor,skillPowerText} from './common-skills';
const C={paper:'#fff0d2',ink:'#432d1d',jade:'#355e40',gold:'#ffda83',muted:'#87745a'};
/** Read-only encyclopedia. Skill values and ascending power order share the actual combat definitions. */
export class CodexView {
 readonly root:Node;private page=0;private tab=0;private sub=0;private selected=0;private quality:Tier=1;private chapter=1;private chapterValues=false;private filter=0;private mechanism=false;private surface!:Node;
 constructor(parent:Node,private frames:Record<string,SpriteFrame>,private close:()=>void){this.root=this.node(parent,'ThreeKingdomsCodex');this.render();}
 resize(w:number,h:number){this.root.setScale(Math.min((w-70)/1260,(h-60)/690),Math.min((w-70)/1260,(h-60)/690),1);}
 private node(p:Node,name:string){const n=new Node(name);n.layer=p.layer;p.addChild(n);return n;}
 private text(p:Node,t:string,x:number,y:number,size=23,w=240,h=44,color=C.ink){const n=this.node(p,t);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);const l=n.addComponent(Label);l.string=t;l.fontSize=size;l.lineHeight=size*1.3;l.color=new Color(color);l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;return l;}
 private box(p:Node,x:number,y:number,w:number,h:number,color:string,stroke=C.gold){const n=this.node(p,'Panel');n.setPosition(x,y);const g=n.addComponent(Graphics);g.fillColor=new Color(color);g.strokeColor=new Color(stroke);g.lineWidth=2;g.roundRect(-w/2,-h/2,w,h,17);g.fill();g.stroke();return n;}
 private button(p:Node,label:string,x:number,y:number,w:number,active:boolean,f:()=>void){const n=this.box(p,x,y,w,46,active?C.jade:'#ecd3a4');n.name='Codex-'+label;n.addComponent(UITransform).setContentSize(w,48);this.text(n,label,0,0,22,w-8,42,active?C.paper:C.ink);n.on(Node.EventType.TOUCH_END,f);}
 private picture(p:Node,key:string,x:number,y:number,size:number){const f=this.frames[key];if(!f)return;const n=this.node(p,key);n.setPosition(x,y);const sp=n.addComponent(Sprite);sp.sizeMode=Sprite.SizeMode.CUSTOM;sp.spriteFrame=f;const r=f.rect;n.getComponent(UITransform)!.setContentSize(size*r.width/Math.max(r.width,r.height),size*r.height/Math.max(r.width,r.height));}
 private entries():{name:string;key:string;index:number}[]{
  if(this.tab===0&&this.sub===1)return CHAPTERS.map((c,i)=>({name:c.boss,key:'boss-'+c.bossId,index:i}));
  if(this.tab===0)return CHRONICLE_ENEMIES.map((e,i)=>({name:e.name,key:'enemy-'+e.id+'-front',index:i})).filter(e=>{const d=CHRONICLE_ENEMIES[e.index];return !this.filter||this.filter===1&&d.kind==='soldier'||this.filter===2&&d.kind==='spearman'&&d.group.indexOf('器械')<0||this.filter===3&&d.kind==='cavalry'||this.filter===4&&d.group.indexOf('器械')>=0;});
  if(this.tab===1)return WEAPONS.map((w,i)=>({name:w.name,key:'icon-'+w.id,index:i})).filter(e=>!this.filter||WEAPONS[e.index].category===['','melee','ranged','magic'][this.filter]);
  return COMMON_SKILLS.filter(s=>!this.filter||s.category===['','战技','军略','奇术'][this.filter]).map(s=>({name:s.name,key:'skill-'+s.icon,index:GENERIC_SKILLS.findIndex(d=>d.id===s.id)}));
 }
 private reset(){this.page=0;this.selected=0;this.render();}
 private render(){for(const n of [...this.root.children]){n.removeFromParent();n.destroy();}this.surface=this.box(this.root,0,0,1260,690,C.paper);const p=this.surface;
  this.button(p,'返回',-550,300,120,false,()=>{this.root.removeFromParent();this.root.destroy();this.close();});this.text(p,'三国图鉴',-310,300,38,300,60,C.jade);
  ['敌兵','武器','技能'].forEach((t,i)=>this.button(p,t,90+i*185,300,165,this.tab===i,()=>{this.tab=i;this.sub=0;this.filter=0;this.mechanism=false;this.reset();}));
  const left=this.box(p,-286,-17,660,570,'#f3e0b8',C.jade),right=this.box(p,342,-17,550,570,'#fff4d9',C.jade);
  const filters=this.tab===0?(this.sub===0?['全部','步兵','远程','骑兵','器械']:[]):this.tab===1?['全部','近战','远程','法术']:['全部','战技','军略','奇术'];
  if(this.tab===0){const subs=['兵种','首领'];subs.forEach((t,i)=>this.button(left,t,-160+i*310,250,280,this.sub===i,()=>{this.sub=i;this.filter=0;this.reset();}));}
  filters.forEach((t,i)=>this.button(left,t,-264+i*(530/Math.max(1,filters.length-1)),this.tab===0?194:248,filters.length===5?108:130,this.filter===i,()=>{this.filter=i;this.reset();}));
  const entries=this.entries();this.page=Math.min(this.page,Math.max(0,Math.ceil(entries.length/12)-1));this.selected=Math.min(this.selected,entries.length-1);
  const shown=entries.slice(this.page*12,this.page*12+12),top=this.tab!==0?144:this.tab===0&&this.sub===0?108:160;
  const compact=this.tab===0&&this.sub===0;shown.forEach((e,i)=>{const n=this.box(left,-245+i%4*163,top-Math.floor(i/4)*(compact?128:143),148,compact?120:132,this.selected===this.page*12+i?'#e4d18f':'#fff0d2',this.selected===this.page*12+i?C.jade:'#c7a26a');n.name='CodexEntry-'+e.key;n.addComponent(UITransform).setContentSize(148,compact?120:132);this.picture(n,e.key,0,compact?12:13,compact?86:92);this.text(n,e.name,0,compact?-42:-44,20,140,compact?32:35);n.on(Node.EventType.TOUCH_END,()=>{this.selected=this.page*12+i;this.render();});});
  this.button(left,'‹',-235,-245,70,false,()=>{this.page=Math.max(0,this.page-1);this.selected=this.page*12;this.render();});this.text(left,(this.page+1)+' / '+Math.max(1,Math.ceil(entries.length/12))+'  ·  '+entries.length+'项',0,-245,22,300,42,C.jade);this.button(left,'›',235,-245,70,false,()=>{this.page=Math.min(Math.ceil(entries.length/12)-1,this.page+1);this.selected=this.page*12;this.render();});
  const current=entries[this.selected];if(!current)return;this.text(right,current.name,0,240,34,520,55,C.jade);this.picture(right,current.key,this.tab===1?-110:0,133,145);
  if(this.tab===0&&this.sub===0){const d=CHRONICLE_ENEMIES[current.index],v=this.chapterValues?scaledEnemy(d.id,this.chapter,1):{hp:d.hp,speed:d.speed};
   this.button(right,this.chapterValues?'本章值':'标准值',-145,32,150,this.chapterValues,()=>{this.chapterValues=!this.chapterValues;this.render();});this.button(right,'‹',5,32,55,false,()=>{this.chapter=Math.max(1,this.chapter-1);this.render();});this.text(right,'章 '+this.chapter,77,32,22,84,42);this.button(right,'›',148,32,55,false,()=>{this.chapter=Math.min(CHAPTERS.length,this.chapter+1);this.render();});
   this.details(right,[['生命',String(v.hp)],['移速',v.speed.toFixed(1)],['伤害','1颗心'],['射程',String(d.range)],['攻击周期',d.cycle+'秒'],['前摇',d.windup+'秒'],['金币',String(d.coins)],['首登','章 '+d.first],['出兵成本',String(d.cost)],['兵种',d.group]],-28,30);
   this.text(right,d.mechanic,0,-190,20,500,66);this.text(right,'应对：'+d.counter,0,-245,20,500,57,C.muted);
  }else if(this.tab===0){const c=CHAPTERS[current.index];this.text(right,'第'+c.id+'章 · '+c.name+' · HP '+c.bossHp,0,26,21,510,45);BOSS_ACTIONS[c.id-1].forEach((a,i)=>this.text(right,a.name+'  /  '+a.cd+'秒\n'+(a.description||this.actionDesc(a.kind,a.range||a.radius||0,a.count||1,a.windup)),0,-43-i*75,22,500,74));}
  else if(this.tab===1){const w=WEAPONS[current.index],q=this.quality;this.button(right,this.mechanism?'查看数值':'攻击机制',164,148,170,this.mechanism,()=>{this.mechanism=!this.mechanism;this.render();});[1,2,3,4].forEach((v,i)=>this.button(right,['I','II','III','IV'][i],-190+i*125,33,105,q===v,()=>{this.quality=v as Tier;this.render();}));
   const s=calculateWeapon({id:w.id,tier:q},{power:0,melee:0,ranged:0,magic:0,damage:0,haste:0,range:0,area:0,crit:0},'');
   if(!this.mechanism)this.details(right,[['伤害基数',s.damage.toFixed(1)],['周期',s.interval.toFixed(2)+'秒'],['射程',String(s.range)],['扫角',Math.round(s.arc)+'°'],['击退',String(s.knockback)],['暴击',Math.round(s.crit*100)+'%'],['弹速',String(s.speed)],['范围半径',String(s.area)],['基准DPS',(s.damage/(w.id==='caltrops'?1:s.interval)*(w.id==='shotgun'?4:w.id==='gourd'?(s.pulses||6):1)*extraHitFactor(w.id,q)).toFixed(1)],['每轮数量',String(s.shotCount||1)]],-27,31);
   const mechanic=isExtraWeapon(w.id)?extraMechanics(w.id,q):weaponEffectText(w.id,s);this.text(right,this.mechanism?mechanic:w.desc,0,this.mechanism?-105:-196,this.mechanism?25:20,500,this.mechanism?238:58);this.text(right,CLASS_NAMES[w.category]+' · 白I基价 '+(w.starter?28:w.price)+' · 六槽 · D为基数',0,-246,20,510,44,C.muted);
  }else{const s=GENERIC_SKILLS[current.index];this.details(right,[['威力',skillPowerText(s.id)],['充能','击杀'+s.killCharge+'名小兵'],['类型',s.category],['伤害/收益',s.damage],['范围',s.range],['持续',s.duration]],-22);this.text(right,s.effect,0,-172,21,500,104);this.text(right,'全英雄可携带 · 选人时自由搭配',0,-247,22,500,44,C.muted);}

 }
 private details(p:Node,rows:string[][],y:number,gap=37){rows.forEach((r,i)=>this.text(p,r[0]+'  '+r[1],i%2?132:-132,y-Math.floor(i/2)*gap,21,260,36));}
 private actionDesc(kind:string,range:number,count:number,windup:number){const map:Record<string,string>={sector:'扇形扫击',charge:'蓄力冲锋',zones:'落点范围攻击',ring:'留有缺口的环阵',shots:'定向弹幕',summon:'召唤援军',flag:'可摧毁阵眼',clone:'真假分身',lines:'错位线形攻击',waves:'向外扩散冲击',teleport:'换位突袭',moving:'预告后移动火场',enrage:'半血缩短主雷间隔'};return (map[kind]||kind)+' · '+count+'段 · 范围'+range+' · 前摇'+windup+'秒';}
}
