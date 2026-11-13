import {GAME_NAME} from './game-brand';
import {SkillSelectView} from './SkillSelectView';
import {DEFAULT_SKILL,availableSkill,commonSkillFor} from './common-skills';
import {HeroShowcase} from './HeroShowcase';
import {CodexView} from './CodexView';
import {chapterFor} from './chronicles';
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

interface HeroPortraitSlot {node:Node;selected:Node;}

/** Screens own their input surfaces; combat never runs underneath an open screen. */
export class CampaignView {
  readonly root: Node;
  private content!: Node;
  private campMode = false;
  private heroMenu = false;
  private campBackground?: Sprite;
  private selection: HeroId = 'liubei';
  private selectionSkill=DEFAULT_SKILL;
  private width = 1334;
  private height = 750;
  private resultView?:ResultView;private codexView?:CodexView;private heroShowcase?:HeroShowcase;
  constructor(parent: Node, private frames: Record<string, SpriteFrame>, private icons: SpriteFrame[]) {
    this.root = this.node(parent, 'CampaignScreens'); this.root.active = false;
  }
  resize(width: number, height: number): void {
    this.width = width; this.height = height;
    if(this.codexView){this.codexView.resize(width,height);return;}
    if(this.resultView){this.resultView.resize(width,height);return;}
    const scale = this.heroMenu ? Math.min(1.05,(width-112)/1280,(height-70)/680) : this.campMode ? Math.min(1, (width - 64) / 1200, (height - 60) / 660) : Math.min(1, (width - 48) / 1200, (height - 30) / 720);
    if (this.content) this.content.setScale(scale, scale, 1);
    if(this.campBackground){const frame=this.campBackground.spriteFrame;const aspect=this.heroMenu&&frame?frame.rect.width/frame.rect.height:16/9;this.campBackground.node.getComponent(UITransform)!.setContentSize(Math.max(width,height*aspect),Math.max(height,width/aspect));}
  }
  hide(): void { this.root.active = false; }
  private begin(title: string, subtitle: string, poster = false): Node {
    this.resultView=undefined;this.heroShowcase=undefined;
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
  menu(selected: HeroId, start: (hero: HeroId,skill:string) => void, codex?:()=>void,skill=DEFAULT_SKILL,training?:(hero:HeroId,skill:string)=>void): void {
    this.resultView=undefined;this.heroShowcase=undefined;this.codexView=undefined;
    for(const child of [...this.root.children]){child.removeFromParent();child.destroy();}
    this.root.active=true;this.campMode=false;this.heroMenu=true;this.selection=selected;this.selectionSkill=availableSkill(skill);
    let starting=false;
    this.campBackground=this.sprite(this.root,this.frames['hero-menu-background'],0,0,1,1);
    if(this.campBackground)this.campBackground.node.name='HeroMenuBackground';
    const shade=this.node(this.root,'MenuVignette').addComponent(Graphics);
    // The environment provides its own contrast; retain a plain meadow fallback.
    if(!this.campBackground){shade.fillColor=new Color('#849354');shade.rect(-2500,-1500,5000,3000);shade.fill();}
    this.content=this.node(this.root,'ScreenContent');this.resize(this.width,this.height);const p=this.content;
    const logoFrame=this.frames['hero-menu-logo'];
    const logo=this.sprite(p,logoFrame,-516,297,244,logoFrame?244*logoFrame.rect.height/logoFrame.rect.width:80);
    if(logo)logo.node.name='GameLogo';else this.bold(p,GAME_NAME,-516,297,34,'#fff0cb',245,70);

    this.heroShowcase=new HeroShowcase(p,this.frames);this.heroShowcase.root.setPosition(0,15);this.heroShowcase.root.setScale(2.2,2.2,1);
    const nameplate=this.node(p,'HeroNameplate').addComponent(Graphics);
    nameplate.fillColor=new Color(43,65,41,225);nameplate.roundRect(-69,-112,138,43,18);nameplate.fill();
    const heroName=this.bold(p,'',0,-90,30,'#fff0d2',126,43);heroName.node.name='ShowcaseHeroName';heroName.fontFamily='serif';
    const rail=this.node(p,'HeroPortraitRail').addComponent(Graphics);
    rail.fillColor=new Color(16,34,25,145);rail.strokeColor=new Color(229,204,143,65);rail.lineWidth=1;rail.roundRect(-346,-229,692,111,24);rail.fill();rail.stroke();
    const portraits:HeroPortraitSlot[]=[];
    HEROES.forEach((hero,i)=>{
      const n=this.node(p,hero.id);n.setPosition((i-2)*130,-175);n.addComponent(UITransform).setContentSize(100,100);
      const bg=n.addComponent(Graphics);bg.fillColor=new Color('#374c3b');bg.strokeColor=new Color('#9b9e74');bg.lineWidth=1.5;bg.roundRect(-46,-46,92,92,18);bg.fill();bg.stroke();
      const f=this.frames['hero-'+hero.id+'-open'];
      const portrait=this.sprite(n,f,0,0,1,1);
      if(portrait){portrait.node.name='HeroPortrait';const r=f.rect,unit=80/Math.max(r.width,r.height);portrait.node.getComponent(UITransform)!.setContentSize(r.width*unit,r.height*unit);}
      const selectedNode=this.node(n,'HeroSelected'),mark=selectedNode.addComponent(Graphics);
      mark.strokeColor=new Color('#ffdc8b');mark.lineWidth=4;mark.roundRect(-48,-48,96,96,19);mark.stroke();
      mark.fillColor=new Color('#ffdc8b');mark.roundRect(-11,-48,22,4,2);mark.fill();
      portraits.push({node:n,selected:selectedNode});
      n.on(Node.EventType.TOUCH_START,()=>{if(!starting)n.setScale(.96,.96,1);});
      n.on(Node.EventType.TOUCH_CANCEL,()=>n.setScale(1,1,1));
      n.on(Node.EventType.TOUCH_END,()=>{n.setScale(1,1,1);if(!starting)select(hero.id);});
    });
    const select=(id:HeroId):void=>{
      this.selection=id;heroName.string=HEROES.find(h=>h.id===id)!.name;this.heroShowcase!.setHero(id);
      portraits.forEach((slot,i)=>{const active=HEROES[i].id===id;slot.selected.active=active;slot.node.setPosition((i-2)*130,active?-171:-175);});
    };
    select(selected);
    const skillCard=this.node(p,'HeroSkillSelect');skillCard.setPosition(406,-175);skillCard.addComponent(UITransform).setContentSize(84,84);
    const sg=skillCard.addComponent(Graphics);sg.fillColor=new Color(35,61,42,230);sg.strokeColor=new Color('#d4be81');sg.lineWidth=2;sg.circle(0,0,39);sg.fill();sg.stroke();
    const skillIcon=this.sprite(skillCard,this.frames['skill-'+commonSkillFor(this.selectionSkill).icon],0,0,62,62);
    const updateSkill=()=>{if(skillIcon)skillIcon.spriteFrame=this.frames['skill-'+commonSkillFor(this.selectionSkill).icon];};
    skillCard.on(Node.EventType.TOUCH_START,()=>{if(!starting)skillCard.setScale(.94,.94,1);});skillCard.on(Node.EventType.TOUCH_CANCEL,()=>skillCard.setScale(1,1,1));
    let choosing=false;skillCard.on(Node.EventType.TOUCH_END,()=>{skillCard.setScale(1,1,1);if(starting||choosing)return;choosing=true;new SkillSelectView(p,this.frames,this.selectionSkill,id=>{this.selectionSkill=id;choosing=false;updateSkill();},()=>choosing=false);});
    const button=this.node(p,'StartHero');button.setPosition(0,-289);button.addComponent(UITransform).setContentSize(330,88);
    const plate=this.sprite(button,this.frames['hero-menu-start'],0,0,360,180);
    if(!plate){const g=button.addComponent(Graphics);g.fillColor=new Color('#683723');g.roundRect(-165,-48,330,88,24);g.fill();g.fillColor=new Color('#cb4e2b');g.strokeColor=new Color('#f69b68');g.lineWidth=3;g.roundRect(-165,-41,330,82,24);g.fill();g.stroke();}
    const text=this.bold(button,'开始',0,0,44,'#fff0cc',290,65);text.fontFamily='serif';
    button.on(Node.EventType.TOUCH_START,()=>{if(!starting)button.setScale(.97,.97,1);});button.on(Node.EventType.TOUCH_CANCEL,()=>button.setScale(1,1,1));
    button.on(Node.EventType.TOUCH_END,()=>{if(starting)return;starting=true;start(this.selection,this.selectionSkill);});
    if(codex)this.action(p,'图鉴',-516,-289,164,()=>codex());
    if(training)this.action(p,'演武场',516,-289,164,()=>{if(starting||choosing)return;starting=true;training(this.selection,this.selectionSkill);});
  }

  codex(close:()=>void):void {this.resultView=undefined;this.heroShowcase=undefined;this.heroMenu=false;this.root.active=true;for(const n of [...this.root.children]){n.removeFromParent();n.destroy();}this.codexView=new CodexView(this.root,this.frames,close);this.codexView.resize(this.width,this.height);}
  private action(parent:Node,label:string,x:number,y:number,width:number,action:()=>void):void{const n=this.node(parent,label);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(width,66);const g=n.addComponent(Graphics);g.fillColor=new Color(C.green);g.strokeColor=new Color('#ffda83');g.lineWidth=2;g.roundRect(-width/2,-33,width,66,17);g.fill();g.stroke();this.bold(n,label,0,0,27,C.paper,width-16,60);n.on(Node.EventType.TOUCH_END,action);}

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
    this.resultView=undefined;this.heroShowcase=undefined;
    for(const child of [...this.root.children]){child.removeFromParent();child.destroy();}
    this.root.active=true;this.heroMenu=false;this.campMode=true;this.campBackground=undefined;
    const scrim=this.node(this.root,'SupplyScrim');scrim.addComponent(UITransform).setContentSize(6000,4000);const shade=scrim.addComponent(Graphics);shade.fillColor=new Color(12,26,19,95);shade.rect(-3000,-2000,6000,4000);shade.fill();
    scrim.on(Node.EventType.TOUCH_END,()=>{});
    this.content=this.node(this.root,'SupplyContent');this.resize(this.width,this.height);const p=this.content;
    const major=run.supplyMode==='major',bossPrep=run.wavesCleared>=3;
    this.jadePanel(p,1140,650);
    const title=bossPrep?chapterFor(run.chapter).boss+' · 战前补给':run.chapterShop?chapterFor(run.chapter).name+' · 补给':major?'天命强化':'桃园补给';
    this.bold(p,title,-315,278,34,'#ffedba',460,50);
    this.text(p,'可购买多件',-437,238,18,'#c5d1b5',210,30);
    this.sprite(p,this.frames['ui-coin'],414,274,34,34);
    const balance=this.bold(p,String(run.gold),482,274,32,'#ffe1a0',90,46);balance.node.name='SupplyBalance';
    if(major)this.campButton(p,'SupplyNormal','普通补给 ›',40,271,180,normal,'secondary');
    run.offers.forEach((id,i)=>{
      const card=supplyCard(run,id),n=this.node(p,'Supply-'+i);n.setPosition((i-1)*360,27);n.addComponent(UITransform).setContentSize(336,360);
      const g=n.addComponent(Graphics),color=card.major?'#e8bb65':card.weapon?TIER_COLORS[card.weapon.tier-1]:'#b8afdc';
      g.fillColor=new Color(48,84,62,230);g.strokeColor=new Color(color);g.lineWidth=card.weapon?2+card.weapon.tier*.65:2;g.roundRect(-168,-180,336,360,19);g.fill();g.stroke();
      if(card.weapon){const wash=new Color(color);wash.a=card.weapon.tier===1?10:22;g.fillColor=wash;g.roundRect(-162,-174,324,348,15);g.fill();this.tierBand(n,card.weapon.tier,0,149,310,card.from);}
      else this.text(n,card.tag,0,149,17,'#e8dca4',300,32);
      if(card.weapon)this.weaponIcon(n,card.weapon.id,card.weapon.tier,0,67,1.25);
      else this.itemIcon(n,id,0,67,.95);
      this.bold(n,card.title,0,3,26,'#fff0c8',302,40);
      this.text(n,card.desc,0,-59,18,'#e4eacb',300,80);
      const enabled=canBuySupply(run,id),sold=run.purchasedOffers.indexOf(id)>=0,full=card.weapon&&parseWeaponOffer(id)&&run.weapons.length===6;
      const title=sold?'已购入':!enabled?(run.gold<card.price?'铜钱不足':'暂不可购'):`${card.price} ${full?'替换':'购买'}`;
      this.campButton(n,'SupplyBuy-'+i,title,0,-137,296,()=>full?this.replacementDialog(run,id,buy):buy(id),'buy',enabled,!sold);
    });
    const rail=this.node(p,'SupplyEquipment');rail.setPosition(0,-207);this.jadePanel(rail,1080,78,false);
    this.bold(rail,`武器 ${run.weapons.length}/6`,-445,0,21,'#e9d9a4',160,40);
    for(let i=0;i<6;i++){
      const w=run.weapons[i],n=this.node(rail,'SupplyWeapon-'+i);n.setPosition(-282+i*90,0);n.addComponent(UITransform).setContentSize(76,60);
      const g=n.addComponent(Graphics);g.fillColor=new Color(26,47,35,230);g.strokeColor=new Color(w?TIER_COLORS[w.tier-1]:'#6b8065');g.lineWidth=1.5;g.roundRect(-38,-30,76,60,10);g.fill();g.stroke();
      if(w){this.weaponIcon(n,w.id,w.tier,0,-7,.66);this.bold(n,['I','II','III','IV'][w.tier-1],27,-18,14,'#f0dfb3',25,20);n.on(Node.EventType.TOUCH_END,()=>this.weaponDialog(run,w,manage));}
      else this.text(n,'+',0,0,25,'#839879',60,40);
    }
    this.campButton(rail,'OpenInventory',`道具 ${Object.keys(run.inventory).reduce((sum,id)=>sum+run.inventory[id],0)} ›`,424,0,178,()=>this.inventoryDialog(run),'secondary');
    const price=refreshPrice(run);
    this.campButton(p,'SupplyRefresh',`刷新 ${price}`,-420,-285,240,refresh,'secondary',run.gold>=price,true);
    this.campButton(p,'SupplySkip','继续战斗',390,-285,300,skip,'primary');
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
    const card=supplyCard(run,id),p=this.dialog('替换武器',1100,620),marks:Node[]=[];let selected:EquippedWeapon|undefined;
    const incoming=this.node(p,'IncomingWeapon');incoming.setPosition(-263,120);this.jadePanel(incoming,498,176,false);
    this.text(incoming,'换入',-194,60,17,'#c7d1b6',70,26);
    if(card.weapon){this.weaponIcon(incoming,card.weapon.id,card.weapon.tier,-173,-2,1.15);this.bold(incoming,weaponFor(card.weapon.id).name,53,49,25,'#fff0d2',300,36);this.tierBand(incoming,card.weapon.tier,54,5,284,card.from);}
    this.text(incoming,card.desc,55,-49,16,'#d8e1c3',300,53);
    const outgoing=this.node(p,'OutgoingWeapon');outgoing.setPosition(263,120);this.jadePanel(outgoing,498,176,false);
    this.text(outgoing,'换下',-194,60,17,'#c7d1b6',70,26);
    const oldPreview=this.node(outgoing,'SelectedReplacement');
    this.text(oldPreview,'从下方选择一件旧武器',0,-2,22,'#c7d1b6',420,62);
    this.text(p,'选择要换下的武器',-350,8,18,'#dfd8b7',320,28);
    const ledger=this.text(p,`当前 ${run.gold}  ·  购买 −${card.price}  ·  请选择换下武器`,0,-181,21,'#ead9ac',1010,48);ledger.node.name='ReplacementLedger';
    const close=():void=>{const overlay=p.parent!;overlay.removeFromParent();overlay.destroy();};
    const updateConfirm=():void=>{
      const old=p.children.find(n=>n.name==='ConfirmReplacement');if(old){old.removeFromParent();old.destroy();}
      const affordable=!!selected&&run.gold+recycleValue(run,selected.uid)>=card.price;
      this.campButton(p,'ConfirmReplacement',selected&&!affordable?'铜钱不足':'确认替换',323,-253,350,()=>{if(selected&&canBuySupply(run,id)&&run.gold+recycleValue(run,selected.uid)>=card.price)buy(id,selected.uid);},'primary',affordable);
    };
    run.weapons.forEach((w,i)=>{
      const n=this.node(p,'ReplaceWeapon-'+w.uid);n.setPosition((i-2.5)*166,-83);n.addComponent(UITransform).setContentSize(150,126);this.jadePanel(n,150,126,false);
      const glow=this.node(n,'ReplaceChoice'),gg=glow.addComponent(Graphics);gg.strokeColor=new Color('#ffda83');gg.lineWidth=3;gg.roundRect(-73,-61,146,122,15);gg.stroke();glow.active=false;marks.push(glow);
      this.weaponIcon(n,w.id,w.tier,0,23,.72);
      this.bold(n,weaponFor(w.id).name,0,-17,17,'#fff0d2',140,27);
      this.plaque(n,TIER_NAMES[w.tier-1],0,-46,130,25,TIER_COLORS[w.tier-1],w.tier===1?C.ink:'#ffffff',14);
      n.on(Node.EventType.TOUCH_END,()=>{
        selected=w;marks.forEach(m=>m.active=false);glow.active=true;
        for(const child of [...oldPreview.children]){child.removeFromParent();child.destroy();}
        this.weaponIcon(oldPreview,w.id,w.tier,-173,-2,1.15);
        this.bold(oldPreview,weaponFor(w.id).name,53,49,25,'#fff0d2',300,36);this.tierBand(oldPreview,w.tier,54,5,284);
        const refund=recycleValue(run,w.uid),left=run.gold+refund-card.price;
        this.text(oldPreview,`出售返还 +${refund} 铜钱`,54,-48,20,'#d8e1c3',300,36);
        ledger.string=`当前 ${run.gold}  ＋  回收 ${refund}  −  购买 ${card.price}  ＝  余额 ${left}`;ledger.color=new Color(left<0?'#f3a796':'#ead9ac');updateConfirm();
      });
    });
    this.campButton(p,'CancelReplacement','取消',-323,-253,350,close,'secondary');updateConfirm();
  }

  survivalResult(run: Run, kills: number, best: number, record: boolean, retry: () => void, menu: () => void, testing: boolean, warmupElapsed=0,won=false): void {
    for(const child of [...this.root.children]){child.removeFromParent();child.destroy();}
    this.root.active=true;this.heroMenu=false;this.campMode=false;this.campBackground=undefined;
    this.resultView=new ResultView(this.root,this.frames,run,kills,best,record,retry,menu,testing,warmupElapsed,won);
    this.resultView.resize(this.width,this.height);
  }
  update(delta:number):void {if(!this.root.active)return;if(this.heroMenu)this.heroShowcase?.update(delta);this.resultView?.update(delta);}

  private weaponDialog(run: Run, w: EquippedWeapon, manage: (action: 'combine' | 'recycle', uid: number) => void): void {
    const d = weaponFor(w.id), current = weaponStatsFor(run, w), pair = matchingWeapon(run, w.id, w.tier, w.uid);
    const p = this.dialog(`${d.name} · ${TIER_NAMES[w.tier - 1]}`, 880, 510);
    this.weaponIcon(p, w.id, w.tier, -280, 8, 2.8);
    this.bold(p, `${CLASS_NAMES[d.category]}   伤害 ${formatStat(current.damage)}   间隔 ${current.interval.toFixed(2)}s`, 100, 100, 24, '#dce4c1', 600, 42);
    this.text(p, `距离 ${current.range}   暴击 ${Math.round(current.crit * 100)}%   暴伤 ×${current.critMultiplier}`, 100, 53, 21, '#fff0d2', 600, 40);
    this.text(p, weaponEffectText(w.id,current), 100, 7, 20, '#fff0d2', 600, 62);
    if (pair) {
      const nextW = { ...w, tier: (w.tier + 1) as Tier }, nextRun = { ...run, weapons: run.weapons.filter(v => v.uid !== pair.uid).map(v => v.uid === w.uid ? nextW : v) }, future = weaponStatsFor(nextRun, nextW);
      this.text(p, `合成后  ${TIER_NAMES[w.tier]} · 伤害 ${formatStat(future.damage)} · ${future.interval.toFixed(2)}s\n装备 ${run.weapons.length} → ${run.weapons.length - 1} 件，同类加成随数量变化`, 95, -72, 20, '#dce4c1', 610, 90);
    } else this.text(p, w.tier === 4 ? '已达最高品质' : '再找到一件同款同品质，即可免费合成', 95, -69, 21, '#bdc9ae', 610, 60);
    this.campButton(p, 'CombineWeapon', '免费合成 ↑', -115, -187, 225, () => manage('combine', w.uid), 'primary', !!pair);
    this.campButton(p, 'RecycleWeapon', run.weapons.length > 1 ? `出售 +${recycleValue(run, w.uid)}` : '至少保留1件', 175, -187, 225, () => manage('recycle', w.uid), 'secondary', run.weapons.length > 1);
  }

  private campBegin(run: Run, mode: 'upgrade' | 'shop', summary: string): Node {
    this.resultView=undefined;this.heroShowcase=undefined;
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
    this.text(p,`共 ${Object.keys(run.inventory).reduce((sum,id)=>sum+run.inventory[id],0)} 件 · ${PASSIVE_ITEMS.filter(i=>run.inventory[i.id]).length} 种 · 不占武器位`,0,190,19,'#dce4c1',850,32);
    ['全部',...ITEM_CATEGORIES].forEach((name,i)=>this.campButton(p,'Category'+i,name,-425+i*140,140,130,()=>this.inventoryDialog(run,undefined,i-1,0),'secondary'));
    const detail=this.text(p,'点击道具查看效果',0,-187,20,'#dce4c1',950,75);
    all.slice(page*6,page*6+6).forEach((item,i)=>{const n=this.plaque(p,'', (i%3-1)*310,43-Math.floor(i/3)*120,290,105,C.sand,C.ink);n.name='Inventory-'+item.id;this.itemIcon(n,item.id,-103,4,.6);this.bold(n,item.name,33,17,22,C.ink,210,34);this.text(n,'持有 ×'+run.inventory[item.id],33,-18,18,C.green,210,32);n.on(Node.EventType.TOUCH_END,()=>detail.string=passivePreview(run.inventory,item.id));});
    this.campButton(p,'BagPrevious','←',-310,-248,100,()=>this.inventoryDialog(run,undefined,category,Math.max(0,page-1)),'secondary',page>0);
    this.text(p,`${page+1} / ${pages}`,0,-248,20,'#fff0d2',150,32);this.campButton(p,'BagNext','→',310,-248,100,()=>this.inventoryDialog(run,undefined,category,page+1),'secondary',page+1<pages);
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
    const box = this.node(overlay, 'DialogPaper'); box.addComponent(UITransform).setContentSize(width, height); if(this.content.name==='SupplyContent')this.jadePanel(box,width,height);else this.paper(box, width, height);
    box.on(Node.EventType.TOUCH_END, (event?: { propagationStopped: boolean }) => { if (event) event.propagationStopped = true; });
    this.bold(box, title, 0, height / 2 - 50, 32, this.content.name==='SupplyContent'?'#ffedba':C.green, width - 150, 50);
    if(this.content.name==='SupplyContent'){
      const button=this.node(box,'CloseDialog');button.setPosition(width/2-44,height/2-44);button.addComponent(UITransform).setContentSize(64,64);
      const g=button.addComponent(Graphics);g.fillColor=new Color('#355e40');g.strokeColor=new Color('#c7ba82');g.lineWidth=1.5;g.circle(0,0,21);g.fill();g.stroke();
      this.bold(button,'×',0,1,27,'#f4e7c0',42,42);button.on(Node.EventType.TOUCH_END,(event?:{propagationStopped:boolean})=>{if(event)event.propagationStopped=true;close();});
    }else this.campButton(box, 'CloseDialog', '×', width / 2 - 48, height / 2 - 48, 54, close, 'secondary');
    return box;
  }

  private jadePanel(parent:Node,width:number,height:number,raised=true):void {
    const g=this.node(parent,'JadePanel').addComponent(Graphics);
    if(raised){g.fillColor=new Color(14,26,20,130);g.roundRect(-width/2,-height/2-6,width,height,25);g.fill();}
    g.fillColor=new Color(30,55,42,raised?237:145);g.strokeColor=new Color(210,199,140,raised?210:95);g.lineWidth=raised?2:1;
    g.roundRect(-width/2,-height/2,width,height,raised?24:14);g.fill();g.stroke();
    if(raised){g.strokeColor=new Color(198,210,168,50);g.lineWidth=1;g.roundRect(-width/2+6,-height/2+6,width-12,height-12,19);g.stroke();}
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
  /** 品级色带：底色、描边厚度、金色菱形数量三重区分白/蓝/紫/红；升阶卡并列显示旧→新两段。 */
  private tierBand(parent: Node, tier: Tier, x: number, y: number, width: number, from?: Tier): void {
    const n = this.node(parent, 'TierBand-' + tier + (from ? '-from-' + from : '')); n.setPosition(x, y);
    const g = n.addComponent(Graphics), rim = new Color('#2f2418'), pip = new Color('#ffe3a1');
    const chip = (cx: number, w: number, t: Tier): void => {
      const small = w < 180, step = small ? 9 : 11, r = small ? 4 : 5;
      g.fillColor = rim; g.roundRect(cx - w / 2, -21, w, 42, 12); g.fill();
      g.fillColor = new Color(TIER_COLORS[t - 1]); g.strokeColor = new Color(C.ink); g.lineWidth = 2;
      g.roundRect(cx - w / 2, -18, w, 42, 12); g.fill(); g.stroke();
      if (t >= 3) { g.strokeColor = new Color('#ffe6a8'); g.lineWidth = 1.5; g.roundRect(cx - w / 2 + 4, -14, w - 8, 34, 9); g.stroke(); }
      g.fillColor = pip; g.strokeColor = rim; g.lineWidth = 1.2;
      const start = cx - w / 2 + (small ? 14 : 17);
      for (let i = 0; i < t; i++) { const px = start + i * step; g.moveTo(px, 2 + r + 1); g.lineTo(px + r, 2); g.lineTo(px, 2 - r - 1); g.lineTo(px - r, 2); g.close(); }
      g.fill(); g.stroke();
      this.bold(n, TIER_NAMES[t - 1], cx + (small ? 9 : 24), 2, small ? 14 : 18, t === 1 ? C.ink : '#ffffff', w - (small ? 50 : 70), 34);
    };
    if (from) { const w = width / 2 - 22; chip(-w / 2 - 8, w, from); chip(w / 2 + 8, w, tier); this.bold(n, '›', 0, 2, 22, '#ffe6a8', 18, 32); }
    else chip(0, width, tier);
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
    n.on(Node.EventType.TOUCH_END, (event?: {propagationStopped:boolean}) => { if(event)event.propagationStopped=true; if (enabled && !fired) { fired = true; n.setPosition(x, y); action(); fired = false; } });
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
