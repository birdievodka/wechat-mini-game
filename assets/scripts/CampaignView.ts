import { Color, Graphics, Label, Layers, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { HeroId, HEROES, ITEMS, Run, Stats, Upgrade, WAVE_NAMES, heroFor, priceFor, rerollPrice } from './campaign';

import { WEAPONS, WeaponId, EquippedWeapon, Tier, WEAPON_LIMIT, TIER_NAMES, TIER_COLORS, CLASS_NAMES, weaponFor, starterFor, parseWeaponOffer, weaponEffectText } from './weapons';
import { addWeaponIcon } from './presentation-art';
import { createRun, weaponStatsFor, offerPrice, canBuyOffer, matchingWeapon, recycleValue, totalBonus } from './campaign';
import { formatStat, hasteText, upgradePresentation } from './camp-presenter';

import { supplyCard, canBuySupply, clockText, basePrice, AUGMENTS, refreshPrice } from './survival';

import { PASSIVE_ITEMS, ITEM_CATEGORIES, passivePreview } from './passive-items';
import { ResultView } from './ResultView';

const C = { paper: '#fff0d2', ink: '#432d1d', green: '#355e40', red: '#c94d2e', sand: '#f1d7a4', muted: '#826442' };

/** Screens own their input surfaces; combat never runs underneath an open screen. */
export class CampaignView {
  readonly root: Node;
  private content!: Node;
  private campMode = false;
  private heroMenu = false;
  private campBackground?: Sprite;
  private selection: HeroId = 'liubei';
  private width = 1334;
  private height = 750;
  private resultView?:ResultView;
  constructor(parent: Node, private frames: Record<string, SpriteFrame>, private icons: SpriteFrame[]) {
    this.root = this.node(parent, 'CampaignScreens'); this.root.active = false;
  }
  resize(width: number, height: number): void {
    this.width = width; this.height = height;
    if(this.resultView){this.resultView.resize(width,height);return;}
    const scale = this.heroMenu ? Math.min(1.08,(width-112)/1360,(height-90)/660) : this.campMode ? Math.min(1, (width - 64) / 1200, (height - 60) / 660) : Math.min(1, (width - 48) / 1200, (height - 30) / 720);
    if (this.content) this.content.setScale(scale, scale, 1);
    if(this.campBackground){const aspect=this.heroMenu?2.13:16/9;this.campBackground.node.getComponent(UITransform)!.setContentSize(Math.max(width,height*aspect),Math.max(height,width/aspect));}
  }
  hide(): void { this.root.active = false; }
  private begin(title: string, subtitle: string, poster = false): Node {
    this.resultView=undefined;
    for (const child of [...this.root.children]) { child.removeFromParent(); child.destroy(); }
    this.root.active = true; this.heroMenu=false; this.campMode = false; this.campBackground = undefined;
    if (poster) this.sprite(this.root, this.frames.poster, 0, 0, Math.max(this.width, this.height * 16 / 9), Math.max(this.height, this.width * 9 / 16));
    const shade = this.node(this.root, 'Backdrop').addComponent(Graphics);
    shade.fillColor = new Color(23, 29, 25, poster ? 85 : 244); shade.rect(-2500, -1500, 5000, 3000); shade.fill();
    this.content = this.node(this.root, 'ScreenContent'); this.resize(this.width, this.height);
    this.text(this.content, title, 0, 317, 42, '#ffe1a0', 1100, 60);
    if (subtitle) this.text(this.content, subtitle, 0, 265, 20, '#e6d8bc', 1100, 36);
    return this.content;
  }
  menu(selected: HeroId, start: (hero: HeroId) => void): void {
    this.resultView=undefined;
    this.selection=selected;let starting=false;
    const render=():void=>{
      for(const child of [...this.root.children]){child.removeFromParent();child.destroy();}
      this.root.active=true;this.campMode=false;this.heroMenu=true;
      this.campBackground=this.sprite(this.root,this.frames['hero-menu-background']||this.frames.poster,0,0,1,1);
      if(this.campBackground)this.campBackground.node.name='HeroMenuBackground';
      const shade=this.node(this.root,'MenuVignette').addComponent(Graphics);shade.fillColor=new Color(44,37,24,this.frames['hero-menu-background']?12:145);shade.rect(-2500,-1500,5000,3000);shade.fill();
      this.content=this.node(this.root,'ScreenContent');this.resize(this.width,this.height);const p=this.content;
      const logo=this.sprite(p,this.frames['hero-menu-logo'],-550,292,250,125);
      if(logo)logo.node.name='GameLogo';else this.bold(p,'桃园乱斗',-550,292,43,'#fff0cb',290,80);
      const title=this.sprite(p,this.frames['hero-menu-title'],0,292,430,215);
      if(title)title.node.name='选择英雄';else this.bold(p,'选择英雄',0,292,45,'#fff0cb',510,70);
      const roles=['均衡 · 控场','近战 · 横扫','近战 · 暴击'];
      HEROES.forEach((hero,i)=>{
        const selected=hero.id===this.selection,x=(i-1)*385,y=selected?8:0;
        const n=this.node(p,hero.id);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(330,410);
        const g=n.addComponent(Graphics);g.fillColor=new Color(52,36,23,65);g.roundRect(-164,-215,330,410,31);g.fill();
        g.fillColor=new Color(selected?'#66703d':'#374633');g.strokeColor=new Color(selected?'#ffda83':'#7c8460');g.lineWidth=selected?5:2;g.roundRect(-165,-205,330,410,31);g.fill();g.stroke();
        g.strokeColor=new Color(255,235,163,selected?65:25);g.lineWidth=1;g.roundRect(-157,-197,314,394,26);g.stroke();
        g.fillColor=new Color(180,185,100,selected?28:18);g.ellipse(-125,-155,45,13);g.ellipse(-148,-140,30,12);g.ellipse(-103,-144,25,11);g.ellipse(133,-115,38,12);g.fill();
        const portrait=this.sprite(n,this.frames['hero-select-'+hero.id]||this.frames['hero-menu-'+hero.id]||this.frames[hero.id],0,43,310,310);if(portrait)portrait.node.name='HeroPortrait';
        const name=this.bold(n,hero.name,0,-112,42,'#fff0cc',290,66);name.fontFamily='serif';
        g.strokeColor=new Color('#e9d5a2');g.lineWidth=1.5;g.roundRect(-105,-180,210,38,19);g.stroke();this.text(n,roles[i],0,-161,19,'#fff0cc',204,33);
        const check=this.node(n,'HeroSelected');check.active=selected;const mark=check.addComponent(Graphics);mark.fillColor=new Color('#56613b');mark.strokeColor=new Color('#ffda83');mark.lineWidth=4;mark.circle(132,168,24);mark.fill();mark.stroke();mark.lineWidth=6;mark.moveTo(119,168);mark.lineTo(129,159);mark.lineTo(146,180);mark.stroke();
        n.on(Node.EventType.TOUCH_START,()=>{if(!starting)n.setScale(.985,.985,1);});
        n.on(Node.EventType.TOUCH_CANCEL,()=>n.setScale(1,1,1));
        n.on(Node.EventType.TOUCH_END,()=>{if(!starting){this.selection=hero.id;render();}});
      });
      const button=this.node(p,'StartHero');button.setPosition(0,-287);button.addComponent(UITransform).setContentSize(330,88);
      const plate=this.sprite(button,this.frames['hero-menu-start'],0,0,360,180);
      if(!plate){const g=button.addComponent(Graphics);g.fillColor=new Color('#683723');g.roundRect(-165,-48,330,88,24);g.fill();g.fillColor=new Color('#cb4e2b');g.strokeColor=new Color('#f69b68');g.lineWidth=3;g.roundRect(-165,-41,330,82,24);g.fill();g.stroke();}
      const text=this.bold(button,'开始',0,0,44,'#fff0cc',290,65);text.fontFamily='serif';
      button.on(Node.EventType.TOUCH_START,()=>{if(!starting)button.setScale(.97,.97,1);});button.on(Node.EventType.TOUCH_CANCEL,()=>button.setScale(1,1,1));
      button.on(Node.EventType.TOUCH_END,()=>{if(starting)return;starting=true;start(this.selection);});
    };render();
  }

  private previewHands(parent: Node, id: HeroId, weapon: EquippedWeapon, y: number, scale: number): void {
    const hands = this.node(parent, 'PreviewHands'); hands.setPosition(0, y); hands.setScale(scale, scale, 1);
    const color = HEROES.find(h => h.id === id)!.color;
    for (const side of [-1, 1]) {
      const wrist = side * 60;
      const arm = this.node(hands, side < 0 ? 'PreviewLeftArm' : 'PreviewRightArm').addComponent(Graphics);
      arm.strokeColor = new Color('#493522'); arm.lineWidth = 12;
      arm.moveTo(side * 27, 7); arm.lineTo(wrist, 0); arm.stroke();
      arm.strokeColor = new Color(color); arm.lineWidth = 8;
      arm.moveTo(side * 27, 7); arm.lineTo(wrist, 0); arm.stroke();
      if (side < 0) this.weaponIcon(hands, weapon.id, weapon.tier, wrist, 0, 1);
      const fist = this.node(hands, side < 0 ? 'PreviewLeftGrip' : 'PreviewRightGrip').addComponent(Graphics);
      fist.fillColor = new Color('#f2c69c'); fist.strokeColor = new Color('#493522'); fist.lineWidth = 1.5;
      fist.roundRect(wrist - 6, -5, 12, 11, 4); fist.fill(); fist.stroke();

    }
  }

  private weaponIcon(parent: Node, id: WeaponId, tier: Tier, x: number, y: number, scale: number): Node {
    const n = this.node(parent, 'WeaponArt-' + id); n.setPosition(x, y); n.setScale(scale, scale, 1);
    const icon=addWeaponIcon(n,this.frames,id,tier,74);icon.setPosition(0,12);return n;
  }
  upgrades(run: Run, choices: Upgrade[], summary: string, choose: (u: Upgrade) => void): void {
    const p = this.campBegin(run, 'upgrade', summary);
    this.sprite(p, this.frames[run.heroId], -463, -33, 252, 271);
    this.plaque(p, heroFor(run).name, -463, -205, 270, 48, C.paper, C.ink, 26);
    this.plaque(p, `剩余 ${run.pending} 次`, -463, -293, 204, 45, C.green, C.paper, 24);
    let committed = false;
    choices.forEach((u, i) => {
      const x = 148 + (i - (choices.length - 1) / 2) * 294;
      const n = this.node(p, 'Upgrade-' + u.key); n.setPosition(x, -5);
      n.addComponent(UITransform).setContentSize(274, 466);
      this.paper(n, 274, 466);
      const focus = this.node(n, 'PressedBorder').addComponent(Graphics);
      focus.strokeColor = new Color(C.green); focus.lineWidth = 6; focus.roundRect(-133, -227, 266, 454, 21); focus.stroke(); focus.node.active = false;
      this.plaque(n, u.name, 0, 210, 220, 50, C.sand, C.ink, 29);
      this.tape(n, 0, 237, C.red, 78);
      this.sprite(n, this.frames['ui-' + ((['melee', 'ranged', 'magic'].indexOf(u.key) >= 0) ? 'power' : u.key)], 0, 105, 152, 152);
      const preview = upgradePresentation(run, u);
      this.bold(n, preview.amount, 0, -21, 68, C.red, 244, 90);
      this.bold(n, preview.label, 0, -93, 29, C.ink, 246, 48);
      this.plaque(n, '', 0, -166, 226, 45, C.sand, C.ink);
      this.bold(n, preview.before, -64, -166, 25, C.ink, 92, 40);
      this.bold(n, '→', 0, -166, 28, C.red, 32, 40);
      this.bold(n, preview.after, 64, -166, 25, C.ink, 92, 40);
      n.on(Node.EventType.TOUCH_START, () => { focus.node.active = true; n.setPosition(x, 1); });
      n.on(Node.EventType.TOUCH_CANCEL, () => { focus.node.active = false; n.setPosition(x, -5); });
      n.on(Node.EventType.TOUCH_END, () => { if (!committed) { committed = true; choose(u); } });
    });
    this.bold(p, '点击卡片，立即强化', 146, -293, 26, C.green, 690, 44);
  }

  shop(run: Run, stats: Stats, hp: number, summary: string, buy: (id: string) => void, reroll: () => void, next: () => void, manage: (action: 'combine' | 'recycle', uid: number) => void, lock: (id: string) => void): void {
    const p = this.campBegin(run, 'shop', summary), bonus = totalBonus(run);
    this.plaque(p, '', 500, 277, 186, 60, C.green, C.paper);
    this.sprite(p, this.frames['ui-coin'], 442, 277, 54, 54); this.bold(p, String(run.gold), 523, 277, 36, C.paper, 122, 53);
    const hero = this.node(p, 'CampHero'); hero.setPosition(-470, -11); this.paper(hero, 250, 454);
    this.plaque(hero, heroFor(run).name, 0, 201, 228, 48, C.green, C.paper, 26);
    this.sprite(hero, this.frames[run.heroId + '_body'], 0, 84, 175, 180);
    this.previewHands(hero, run.heroId, run.weapons[0], 32, 1.1);
    this.plaque(hero, `${Math.ceil(hp)} / ${stats.maxHp}`, 0, -25, 216, 35, C.green, C.paper, 22);
    const core = [['近战', bonus.melee], ['远程', bonus.ranged], ['法术', bonus.magic], ['护甲', stats.armor]];
    core.forEach(([label, value], i) => { const x = i % 2 ? 57 : -57, y = i < 2 ? -79 : -119;
      this.plaque(hero, `${label} ${value}`, x, y, 106, 35, C.sand, C.ink, 19); });
    this.text(hero, `伤害 ${Math.round(bonus.damage * 100)}% · 攻速 ${hasteText(run)}`, 0, -151, 17, C.green, 225, 32);
    const more = this.text(hero, '查看全部属性 ›', 0, -185, 18, C.green, 225, 30); more.node.on(Node.EventType.TOUCH_END, () => this.statsDialog(run, stats));
    for (let i = 0; i < 4; i++) {
      const id = run.offers[i] || '', weapon = parseWeaponOffer(id), index = ITEMS.findIndex(item => item.id === id), item = ITEMS[index];
      const n = this.node(p, `Offer${i}`); n.setPosition(-215 + i * 235, 47); this.paper(n, 220, 350);
      if (!weapon && !item) { this.bold(n, '已购入', 0, 10, 28, C.green, 194, 48); continue; }
      const locked = (run.locked.indexOf(id) >= 0);
      const lockButton = this.text(n, locked ? '已锁' : '锁定', 76, 144, 17, locked ? C.red : C.green, 62, 44);
      lockButton.node.name = 'Lock-' + id; lockButton.node.on(Node.EventType.TOUCH_END, () => lock(id));
      if (weapon) {
        const def = weaponFor(weapon.id), ws = weaponStatsFor(run, weapon);
        this.plaque(n, TIER_NAMES[weapon.tier - 1], -29, 141, 126, 32, TIER_COLORS[weapon.tier - 1], weapon.tier === 1 ? C.ink : '#ffffff', 17);
        this.weaponIcon(n, weapon.id, weapon.tier, 0, 50, 1.45);
        this.bold(n, def.name, 0, 0, 25, C.ink, 194, 38);
        this.text(n, `${CLASS_NAMES[def.category]}  ${formatStat(ws.damage)}伤害`, 0, -36, 19, C.green, 194, 28);
        this.text(n, `${ws.interval.toFixed(2)}秒 · 距离${ws.range}`, 0, -64, 18, C.ink, 194, 28);
        this.text(n, weaponEffectText(weapon.id,ws).split(' · ')[0], 0, -91, 18, C.muted, 194, 28);
      } else {
        this.text(n, `道具  ${(run.inventory[id] || 0)}/3`, -23, 141, 18, C.green, 140, 32);
        this.sprite(n, this.icons[index], 0, 73, 113, 113); this.bold(n, item.name, 0, 0, 24, C.ink, 194, 38);
        item.desc.split(/\n| · /).forEach((line, row) => this.bold(n, line, 0, -39 - row * 27, 18, /[−-]\d/.test(line) ? C.red : C.green, 194, 28));
      }
      const price = offerPrice(run, id), enabled = canBuyOffer(run, id), merging = weapon && run.weapons.length >= WEAPON_LIMIT && !!matchingWeapon(run, weapon.id, weapon.tier);
      const label = run.gold < price ? '不足' : !enabled ? '满槽' : merging ? '合成' : '购买';
      this.campButton(n, `Buy-${id}`, `${price}  ${label}`, 0, -139, 184, () => buy(id), 'buy', enabled, true);
    }
    this.text(p, `武器 ${run.weapons.length}/6  ·  点击管理`, -160, -148, 18, C.green, 360, 28);
    const sets = (['melee', 'ranged', 'magic'] as const).map(c => { const count = run.weapons.filter(w => weaponFor(w.id).category === c).length; return `${CLASS_NAMES[c]} ${count}${count >= 2 ? '(+' + Math.floor(count / 2) + ')' : ''}`; }).join('  ');
    this.text(p, sets, 352, -148, 17, C.muted, 460, 28);
    for (let i = 0; i < WEAPON_LIMIT; i++) {
      const w = run.weapons[i], n = this.node(p, w ? 'Equipment-' + w.uid : 'EmptyWeapon-' + i); n.setPosition(-250 + i * 145, -209);
      this.plaque(n, '', 0, 0, 128, 88, w ? '#fff3db' : '#e5d8bc', C.ink);
      if (w) {
        const g = n.addComponent(Graphics); g.strokeColor = new Color(TIER_COLORS[w.tier - 1]); g.lineWidth = 4; g.roundRect(-62, -42, 124, 84, 13); g.stroke();
        this.weaponIcon(n, w.id, w.tier, -32, -1, .85);
        this.bold(n, weaponFor(w.id).name, 24, 12, 17, C.ink, 76, 28); this.text(n, ['I', 'II', 'III', 'IV'][w.tier - 1], 24, -17, 19, w.tier === 1 ? C.muted : TIER_COLORS[w.tier - 1], 70, 27);
        n.addComponent(UITransform).setContentSize(128, 88); n.on(Node.EventType.TOUCH_END, () => this.weaponDialog(run, w, manage));
      } else this.text(n, '+', 0, 0, 30, '#aa9c7e', 100, 70);
    }
    this.inventoryRail(p, run);
    this.campButton(p, 'Reroll', `换一批  ${rerollPrice(run)}`, 222, -293, 226, reroll, 'secondary', run.gold >= rerollPrice(run) && run.locked.length < 4, true);
    this.campButton(p, 'NextWave', `第${run.wave + 1}关  出发 →`, 481, -293, 244, next, 'primary');
  }

  supply(run: Run, buy: (id: string, replaceUid?: number) => void, refresh: () => void, skip: () => void, normal: () => void, manage: (action: 'combine' | 'recycle', uid: number) => void): void {
    this.resultView=undefined;
    for(const child of [...this.root.children]){child.removeFromParent();child.destroy();}
    this.root.active=true;this.heroMenu=false;this.campMode=true;this.campBackground=undefined;
    const scrim=this.node(this.root,'SupplyScrim');scrim.addComponent(UITransform).setContentSize(6000,4000);const shade=scrim.addComponent(Graphics);shade.fillColor=new Color(12,26,19,95);shade.rect(-3000,-2000,6000,4000);shade.fill();
    scrim.on(Node.EventType.TOUCH_END,()=>{});
    this.content=this.node(this.root,'SupplyContent');this.resize(this.width,this.height);const p=this.content;
    const departure=run.supplyMode==='departure',major=run.supplyMode==='major',bossPrep=run.wavesCleared>=3;
    this.bold(p,departure?'热 身 补 给':bossPrep?'张 角 战 前 补 给':major?'天 命 强 化':'桃 园 补 给',0,281,40,'#ffebac',700,60);
    this.text(p,departure?'热身完成 · 准备好后进入第1波':bossPrep?'三波已守住 · 补给后挑战张角':'战斗已暂停 · 可购买多项 · 刷新补充新货',0,232,22,'#e6e3bf',840,38);
    this.plaque(p,`${run.gold} 铜钱`,490,282,190,48,'#355e40','#ffe19a',25);
    run.offers.forEach((id,i)=>{
      const card=supplyCard(run,id),n=this.node(p,'Supply-'+i);n.setPosition((i-1)*340,4);n.addComponent(UITransform).setContentSize(316,392);
      const g=n.addComponent(Graphics),color=card.major?'#e8bb65':card.weapon?TIER_COLORS[card.weapon.tier-1]:'#b8afdc';
      g.fillColor=new Color(36,75,58,213);g.strokeColor=new Color(color);g.lineWidth=3;g.roundRect(-158,-196,316,392,23);g.fill();g.stroke();
      g.strokeColor=new Color(230,220,155,80);g.lineWidth=1;g.roundRect(-150,-188,300,376,20);g.stroke();
      this.text(n,card.tag,0,163,18,'#e8dca4',284,32);
      if(card.weapon)this.weaponIcon(n,card.weapon.id,card.weapon.tier,0,70,1.45);
      else this.itemIcon(n,id,0,84,1);
      this.bold(n,card.title,0,6,27,'#fff0c8',288,44);
      this.text(n,card.desc,0,-61,19,'#e9efcc',281,105);
      const enabled=canBuySupply(run,id),sold=run.purchasedOffers.indexOf(id)>=0,full=card.weapon&&parseWeaponOffer(id)&&run.weapons.length===6;
      const title=sold?'已购入':!enabled?(run.gold<card.price?'金币不足':'暂不可购'):`${card.price} ${full?'替换':'购买'}`;
      this.campButton(n,'SupplyBuy-'+i,title,0,-150,270,()=>full?this.replacementDialog(run,id,buy):buy(id),'buy',enabled,!sold);
    });
    for(let i=0;i<6;i++){
      const w=run.weapons[i],n=this.node(p,'SupplyWeapon-'+i);n.setPosition((i-2.5)*90,-245);n.addComponent(UITransform).setContentSize(78,64);
      const g=n.addComponent(Graphics);g.fillColor=new Color(35,56,42,220);g.strokeColor=new Color(w?TIER_COLORS[w.tier-1]:'#6b8065');g.lineWidth=2;g.roundRect(-39,-32,78,64,12);g.fill();g.stroke();
      if(w){this.weaponIcon(n,w.id,w.tier,0,-10,.7);this.text(n,['I','II','III','IV'][w.tier-1],28,-19,14,'#f0d7a0',25,22);n.on(Node.EventType.TOUCH_END,()=>this.weaponDialog(run,w,manage));}
      else this.text(n,'+',0,0,26,'#93a587',60,42);
    }
    this.campButton(p,'OpenInventory',`道具 ${Object.keys(run.inventory).reduce((sum,id)=>sum+run.inventory[id],0)}`, -444,-245,160,()=>this.inventoryDialog(run),'secondary');
    {
      const price=refreshPrice(run);this.campButton(p,'SupplyRefresh',`刷新 ${price}`,-347,-315,240,refresh,'secondary',run.gold>=price,true);
      this.campButton(p,'SupplySkip',departure?'进入第1波 →':bossPrep?'挑战张角 →':`进入第${run.wavesCleared+1}波 →`,347,-315,250,skip,'primary');
      if(major)this.campButton(p,'SupplyNormal','改选普通补给',0,-315,235,normal,'secondary');
      else this.text(p,'道具自动生效 · 武器最多六件',0,-315,18,'#d5d5ae',430,40);
    }
  }

  private itemIcon(parent:Node,id:string,x:number,y:number,scale:number):void {
    // The old D06 bean portrait is retired; use the existing penetration-arrow icon style.
    if(id==='D06'){this.itemIcon(parent,'D14',x,y,scale);return;}
    const item=PASSIVE_ITEMS.find(i=>i.id===id),category=item?id.charCodeAt(0)-65:0,n=this.node(parent,'ItemArt-'+id);n.setPosition(x,y);n.setScale(scale,scale,1);
    if(id==='F02'){addWeaponIcon(n,this.frames,'pole',1,80);return;}
    const spriteFrame=this.frames['item-'+id];if(spriteFrame){this.sprite(n,spriteFrame,0,0,94,94);return;}
    if(item&&id[0]==='D'&&Number(id.slice(1))>=9){
      const g=n.addComponent(Graphics);g.fillColor=new Color('#365e50');g.strokeColor=new Color('#a1d7be');g.lineWidth=3;g.circle(0,0,43);g.fill();g.stroke();
      const weapon=({D15:'sandal',D17:'rocket',D18:'shotgun',D19:'smg',D20:'sandal'} as Record<string,WeaponId>)[id];
      if(weapon){this.weaponIcon(n,weapon,1,0,0,.85);g.strokeColor=new Color('#ffe0a0');g.lineWidth=4;g.moveTo(25,-18);g.lineTo(25,-36);g.moveTo(16,-27);g.lineTo(34,-27);g.stroke();}
      else{
        g.strokeColor=new Color('#f7d797');g.lineWidth=4;const index=Number(id.slice(1));
        if(index===10||index===14||index===16){for(let i=0;i<(index===10?3:2);i++){const y=(i-(index===10?1:.5))*18;g.moveTo(-25,y);g.lineTo(25,y);g.lineTo(13,y+9);g.moveTo(25,y);g.lineTo(13,y-9);}g.stroke();}
        else{g.circle(0,0,index===13?13:24);g.stroke();g.circle(0,0,5);g.fillColor=new Color('#eea478');g.fill();for(let i=0;i<4;i++){const a=i*Math.PI/2;g.moveTo(Math.cos(a)*18,Math.sin(a)*18);g.lineTo(Math.cos(a)*34,Math.sin(a)*34);}g.stroke();}
      }return;
    }
    if(id==='bun'){const g=n.addComponent(Graphics);g.fillColor=new Color('#f5dba1');g.strokeColor=new Color('#9a7144');g.lineWidth=3;g.ellipse(0,0,32,25);g.fill();g.stroke();g.moveTo(-10,19);g.lineTo(0,9);g.lineTo(10,19);g.stroke();return;}
    const mapped=['power','speed','coin','range','area','haste'][category]||'power',frame=this.frames['ui-'+mapped];
    this.sprite(n,frame,0,0,80,80);
    const tag=this.node(n,'PassiveBadge').addComponent(Graphics);tag.fillColor=new Color(['#e5a768','#88bf82','#ead06f','#86c7cc','#c69bcd','#c5a16e'][category]||'#dbc68a');tag.circle(29,-24,12);tag.fill();

  }

  private replacementDialog(run:Run,id:string,buy:(id:string,uid?:number)=>void):void {
    const card=supplyCard(run,id),p=this.dialog('选择要换下的武器',1000,420);let selected:EquippedWeapon|undefined;
    const detail=this.text(p,'点击旧武器，确认后一次结算出售与购买',0,-90,22,C.green,900,70);
    run.weapons.forEach((w,i)=>{const n=this.plaque(p,'', (i-2.5)*150,45,132,114,C.sand,C.ink);this.weaponIcon(n,w.id,w.tier,0,22,.85);this.text(n,weaponFor(w.id).name,0,-35,17,C.ink,126,30);n.on(Node.EventType.TOUCH_END,()=>{selected=w;detail.string=`出售 ${weaponFor(w.id).name} +${recycleValue(run,w.uid)} · 买入 ${card.title} −${card.price}\\n结算后余额 ${run.gold+recycleValue(run,w.uid)-card.price}`;});});
    this.campButton(p,'ConfirmReplacement','确认替换',0,-156,280,()=>{if(selected&&run.gold+recycleValue(run,selected.uid)>=card.price)buy(id,selected.uid);},'primary');
  }

  survivalResult(run: Run, kills: number, best: number, record: boolean, retry: () => void, menu: () => void, testing: boolean, warmupElapsed=0,won=false): void {
    for(const child of [...this.root.children]){child.removeFromParent();child.destroy();}
    this.root.active=true;this.heroMenu=false;this.campMode=false;this.campBackground=undefined;
    this.resultView=new ResultView(this.root,this.frames,run,kills,best,record,retry,menu,testing,warmupElapsed,won);
    this.resultView.resize(this.width,this.height);
  }
  update(delta:number):void {if(this.root.active)this.resultView?.update(delta);}

  private weaponDialog(run: Run, w: EquippedWeapon, manage: (action: 'combine' | 'recycle', uid: number) => void): void {
    const d = weaponFor(w.id), current = weaponStatsFor(run, w), pair = matchingWeapon(run, w.id, w.tier, w.uid);
    const p = this.dialog(`${d.name} · ${TIER_NAMES[w.tier - 1]}`, 880, 510);
    this.weaponIcon(p, w.id, w.tier, -280, 8, 2.8);
    this.bold(p, `${CLASS_NAMES[d.category]}   伤害 ${formatStat(current.damage)}   间隔 ${current.interval.toFixed(2)}s`, 100, 100, 24, C.green, 600, 42);
    this.text(p, `距离 ${current.range}   暴击 ${Math.round(current.crit * 100)}%   暴伤 ×${current.critMultiplier}`, 100, 53, 21, C.ink, 600, 40);
    this.text(p, weaponEffectText(w.id,current), 100, 7, 20, C.ink, 600, 62);
    if (pair) {
      const nextW = { ...w, tier: (w.tier + 1) as Tier }, nextRun = { ...run, weapons: run.weapons.filter(v => v.uid !== pair.uid).map(v => v.uid === w.uid ? nextW : v) }, future = weaponStatsFor(nextRun, nextW);
      this.text(p, `合成后  ${TIER_NAMES[w.tier]} · 伤害 ${formatStat(future.damage)} · ${future.interval.toFixed(2)}s\n装备 ${run.weapons.length} → ${run.weapons.length - 1} 件，同类加成随数量变化`, 95, -72, 20, C.green, 610, 90);
    } else this.text(p, w.tier === 4 ? '已达最高品质' : '再找到一件同款同品质，即可免费合成', 95, -69, 21, C.muted, 610, 60);
    this.campButton(p, 'CombineWeapon', '免费合成 ↑', -115, -187, 225, () => manage('combine', w.uid), 'primary', !!pair);
    this.campButton(p, 'RecycleWeapon', run.weapons.length > 1 ? `出售 +${recycleValue(run, w.uid)}` : '至少保留1件', 175, -187, 225, () => manage('recycle', w.uid), 'secondary', run.weapons.length > 1);
  }

  private campBegin(run: Run, mode: 'upgrade' | 'shop', summary: string): Node {
    this.resultView=undefined;
    for (const child of [...this.root.children]) { child.removeFromParent(); child.destroy(); }
    this.root.active = true; this.heroMenu=false; this.campMode = true;
    const base = this.node(this.root, 'CampBackdrop').addComponent(Graphics); base.fillColor = new Color(C.paper); base.rect(-2500, -1500, 5000, 3000); base.fill();
    this.campBackground = this.sprite(this.root, this.frames['camp-background'], 0, 0, this.width, this.height);
    this.content = this.node(this.root, 'CampContent'); this.resize(this.width, this.height);
    const p = this.content;
    this.sprite(p, this.frames['title-' + mode], -462, 275, mode === 'upgrade' ? 306 : 278, mode === 'upgrade' ? 142 : 88);
    const report = this.plaque(p, `第${run.wave}关完成 ›`, mode === 'shop' ? -188 : 140, mode === 'shop' ? 277 : 316, 178, 40, C.sand, C.ink, 20);
    report.on(Node.EventType.TOUCH_END, () => {
      const dialog = this.dialog('本关战报', 760, 300);
      this.bold(dialog, summary.replace(/ · /g, '\n'), 0, -12, 22, C.ink, 680, 190);
    });
    const stepsX = mode === 'shop' ? 128 : 140, stepsY = mode === 'shop' ? 277 : 266;
    this.plaque(p, '', stepsX, stepsY, 320, 42, '#f2dfb9', C.ink);
    ['强化', '小铺', '出发'].forEach((name, i) => {
      const x = stepsX + (i - 1) * 104, active = i === (mode === 'upgrade' ? 0 : 1);
      if (active) this.plaque(p, name, x, stepsY, 86, 39, C.red, C.paper, 22);
      else this.bold(p, name, x, stepsY, 21, C.muted, 82, 34);
      if (i < 2) this.bold(p, '›', x + 53, stepsY, 25, C.green, 20, 36);
    });
    return p;
  }

  private inventoryRail(parent: Node, run: Run): void {
    const inv = ITEMS.filter(i => run.inventory[i.id]);
    this.plaque(parent, '', -252, -293, 696, 68, C.paper, C.ink);
    this.sprite(parent, this.frames['ui-pickup'], -563, -293, 56, 56);
    this.bold(parent, `行囊 · ${inv.length}`, -478, -293, 22, C.ink, 114, 40);
    if (!inv.length) { this.text(parent, '买点宝贝再出发', -176, -293, 21, C.muted, 425, 40); return; }
    inv.slice(0, 6).forEach((item, i) => {
      const n = this.node(parent, 'Bag-' + item.id); n.setPosition(-383 + i * 62, -293); n.addComponent(UITransform).setContentSize(58, 60);
      this.sprite(n, this.icons[ITEMS.indexOf(item)], 0, 4, 43, 43);
      this.bold(n, '×' + run.inventory[item.id], 17, -19, 13, C.ink, 35, 21);
      n.on(Node.EventType.TOUCH_END, () => this.inventoryDialog(run, item.id));
    });
    this.campButton(parent, 'OpenInventory', inv.length > 6 ? `全部 ${inv.length}` : '全部 ›', 45, -293, 80, () => this.inventoryDialog(run), 'secondary');
  }

  private inventoryDialog(run:Run,selected?:string,category=-1,page=0):void {
    const p=this.dialog('我的道具 · 全部自动生效',1050,580),all=PASSIVE_ITEMS.filter(i=>(run.inventory[i.id]||0)>0&&(category<0||i.id.charCodeAt(0)-65===category)),pages=Math.max(1,Math.ceil(all.length/6));page=Math.min(page,pages-1);
    this.text(p,`共 ${Object.keys(run.inventory).reduce((sum,id)=>sum+run.inventory[id],0)} 件 · ${PASSIVE_ITEMS.filter(i=>run.inventory[i.id]).length} 种 · 不占武器位`,0,190,19,C.green,850,32);
    ['全部',...ITEM_CATEGORIES].forEach((name,i)=>this.campButton(p,'Category'+i,name,-425+i*140,140,130,()=>this.inventoryDialog(run,undefined,i-1,0),'secondary'));
    const detail=this.text(p,'点击道具查看效果',0,-187,20,C.green,950,75);
    all.slice(page*6,page*6+6).forEach((item,i)=>{const n=this.plaque(p,'', (i%3-1)*310,43-Math.floor(i/3)*120,290,105,C.sand,C.ink);n.name='Inventory-'+item.id;this.itemIcon(n,item.id,-103,4,.6);this.bold(n,item.name,33,17,22,C.ink,210,34);this.text(n,'持有 ×'+run.inventory[item.id],33,-18,18,C.green,210,32);n.on(Node.EventType.TOUCH_END,()=>detail.string=passivePreview(run.inventory,item.id));});
    this.campButton(p,'BagPrevious','←',-310,-248,100,()=>this.inventoryDialog(run,undefined,category,Math.max(0,page-1)),'secondary',page>0);
    this.text(p,`${page+1} / ${pages}`,0,-248,20,C.ink,150,32);this.campButton(p,'BagNext','→',310,-248,100,()=>this.inventoryDialog(run,undefined,category,page+1),'secondary',page+1<pages);
    if(selected)detail.string=passivePreview(run.inventory,selected);
  }

  private statsDialog(run: Run, stats: Stats): void {
    const p = this.dialog('本局属性', 900, 550);
    const b = totalBonus(run);
    const values = [ ['生命上限', String(stats.maxHp)], ['通用伤害', Math.round(b.damage * 100) + '%'], ['攻速', hasteText(run)],
      ['护甲', String(stats.armor)], ['暴击加成', Math.round(b.crit * 100) + '%'], ['移动速度', String(Math.round(stats.speed))],
      ['距离加成', String(b.range)], ['生命再生', stats.regen + '点'], ['拾取范围', String(stats.pickup)],
      ['经验加成', Math.round(stats.xp * 100) + '%'], ['额外军饷', String(stats.stipend)], ['近 / 远 / 法', `${b.melee} / ${b.ranged} / ${b.magic}`] ];
    values.forEach(([label, value], i) => {
      const x = (i % 4 - 1.5) * 208, y = 105 - Math.floor(i / 4) * 128;
      this.plaque(p, '', x, y, 192, 110, '#f5e3c1', C.ink);
      this.text(p, label, x, y + 25, 20, C.muted, 172, 30);
      this.bold(p, value, x, y - 21, 29, C.green, 170, 42);
    });
  }

  private dialog(title: string, width: number, height: number): Node {
    const old = this.content.children.find(n => n.name === 'CampDialog'); if (old) { old.removeFromParent(); old.destroy(); }
    const overlay = this.node(this.content, 'CampDialog'); overlay.addComponent(UITransform).setContentSize(3000, 2000);
    const shade = overlay.addComponent(Graphics); shade.fillColor = new Color(35, 45, 34, 170); shade.rect(-1500, -1000, 3000, 2000); shade.fill();
    const close = (): void => { overlay.removeFromParent(); overlay.destroy(); };
    overlay.on(Node.EventType.TOUCH_END, (event?: { target: Node }) => { if (!event || event.target === overlay) close(); });
    const box = this.node(overlay, 'DialogPaper'); box.addComponent(UITransform).setContentSize(width, height); this.paper(box, width, height);
    box.on(Node.EventType.TOUCH_END, (event?: { propagationStopped: boolean }) => { if (event) event.propagationStopped = true; });
    this.bold(box, title, 0, height / 2 - 50, 32, C.green, width - 150, 50);
    this.campButton(box, 'CloseDialog', '×', width / 2 - 48, height / 2 - 48, 54, close, 'secondary');
    return box;
  }

  private paper(parent: Node, width: number, height: number): void {
    const sprite = this.sprite(parent, this.frames['camp-paper'], 0, 0, width, height);
    if (sprite) sprite.type = Sprite.Type.SLICED;
  }
  private pill(parent: Node, width: number, height: number, color: string): void {
    const g = this.node(parent, 'Pill').addComponent(Graphics);
    g.fillColor = new Color('#392a20'); g.roundRect(-width / 2, -height / 2 - 3, width, height, Math.min(18, height / 2)); g.fill();
    g.fillColor = new Color(color); g.strokeColor = new Color(C.ink); g.lineWidth = 2;
    g.roundRect(-width / 2, -height / 2, width, height, Math.min(18, height / 2)); g.fill(); g.stroke();
  }
  private plaque(parent: Node, title: string, x: number, y: number, w: number, h: number, color: string, textColor: string, size = 23): Node {
    const n = this.node(parent, title || 'Plaque'); n.setPosition(x, y); n.addComponent(UITransform).setContentSize(w, h);
    this.pill(n, w, h, color); if (title) this.bold(n, title, 0, 0, size, textColor, w - 12, h - 4); return n;
  }
  private tape(parent: Node, x: number, y: number, color: string, width: number): void {
    const n = this.node(parent, 'PaperTab'); n.setPosition(x, y); n.angle = -3;
    const g = n.addComponent(Graphics); g.fillColor = new Color(color); g.strokeColor = new Color(C.ink); g.lineWidth = 2.5;
    g.moveTo(-width / 2 + 5, -9); g.lineTo(width / 2 - 6, -9); g.lineTo(width / 2, 10); g.lineTo(-width / 2, 10); g.close(); g.fill(); g.stroke();
  }
  private bold(parent: Node, title: string, x: number, y: number, size: number, color: string, w: number, h: number): Label {
    const label = this.text(parent, title, x, y, size, color, w, h); label.isBold = true; return label;
  }
  private campButton(parent: Node, name: string, title: string, x: number, y: number, w: number, action: () => void, kind: 'buy' | 'primary' | 'secondary', enabled = true, coin = false): Node {
    const color = enabled ? kind === 'primary' ? C.red : kind === 'buy' ? C.green : C.paper : '#d3c9b2';
    const foreground = enabled && kind !== 'secondary' ? C.paper : enabled ? C.ink : '#827b6b';
    const n = this.plaque(parent, '', x, y, w, kind === 'buy' ? 56 : 62, color, foreground); n.name = name;
    if (coin) this.sprite(n, this.frames['ui-coin'], -w / 2 + 28, 0, 33, 33);
    this.bold(n, title, coin ? 14 : 0, 0, w < 100 ? 17 : 24, foreground, w - (coin ? 52 : 16), 48);
    n.on(Node.EventType.TOUCH_START, () => { if (enabled) n.setPosition(x, y - 3); });
    n.on(Node.EventType.TOUCH_CANCEL, () => n.setPosition(x, y));
    let fired = false;
    n.on(Node.EventType.TOUCH_END, () => { if (enabled && !fired) { fired = true; n.setPosition(x, y); action(); fired = false; } });
    return n;
  }
  result(run: Run, won: boolean, kills: number, reason: string, retry: () => void, menu: () => void, testMode = false): void {
    const h = heroFor(run), p = this.begin(testMode ? '测 试 结 束' : won ? '桃 园 守 住 了 ！' : '好 汉 ， 下 回 再 来', reason);
    this.sprite(p, this.frames[run.heroId], -340, 20, 245, 260);
    this.text(p, `${h.name} · ${h.title}`, 170, 115, 32, '#ffe1a0', 650, 50);
    this.text(p, `${testMode ? '自由测试' : won ? '八关全通' : `到达第 ${run.wave} / 8 关`}\n击败 ${kills}    铜钱 ${run.gold}    花费 ${run.spent}\n收集 ${Object.keys(run.inventory).length} 种道具`, 170, 12, 26, '#f1e7cf', 680, 150);
    this.text(p, won ? '草鞋、扁担、尖刀，今天全都立了功。' : '试试护甲和移速，先躲预警再找输出位置。', 130, -115, 20, '#cad3b7', 800, 40);
    this.button(p, '同角色再来', -210, -256, 320, retry);
    this.button(p, '返回选人', 210, -256, 320, menu);
  }
  private node(parent: Node, name: string): Node { const n = new Node(name); n.layer = Layers.Enum.UI_2D; parent.addChild(n); return n; }
  private card(g: Graphics, w: number, h: number, selected: boolean): void {
    g.fillColor = new Color(selected ? '#394b35' : '#303c32'); g.strokeColor = new Color(selected ? '#ffda83' : '#79836a'); g.lineWidth = selected ? 4 : 2;
    g.roundRect(-w / 2, -h / 2, w, h, 18); g.fill(); g.stroke();
  }
  private text(parent: Node, value: string, x: number, y: number, size: number, color: string, w: number, h: number): Label {
    const n = this.node(parent, value.slice(0, 20)); n.setPosition(x, y); n.addComponent(UITransform).setContentSize(w, h);
    const l = n.addComponent(Label); l.string = value; l.fontSize = size; l.lineHeight = size * 1.35; l.color = new Color(color);
    l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER; l.overflow = Label.Overflow.SHRINK; return l;
  }
  private sprite(parent: Node, frame: SpriteFrame, x: number, y: number, w: number, h: number): Sprite | undefined {
    if (!frame) return;
    const n = this.node(parent, 'Art'); n.setPosition(x, y); const s = n.addComponent(Sprite); s.spriteFrame = frame; s.sizeMode = Sprite.SizeMode.CUSTOM;
    n.getComponent(UITransform)!.setContentSize(w, h); return s;
  }
  private button(parent: Node, title: string, x: number, y: number, w: number, action: () => void, enabled = true): void {
    const n = this.node(parent, title); n.setPosition(x, y); n.addComponent(UITransform).setContentSize(w, 58);
    const g = n.addComponent(Graphics); g.fillColor = new Color(enabled ? '#728b42' : '#485044'); g.roundRect(-w / 2, -29, w, 58, 12); g.fill();
    this.text(n, title, 0, 0, 23, enabled ? '#fff5da' : '#9ea38d', w - 16, 54);
    n.on(Node.EventType.TOUCH_END, () => { if (enabled) action(); });
  }
}
