import {TrainingView} from './TrainingView';
import {GAME_NAME} from './game-brand';
import {COMMON_SKILLS,DEFAULT_SKILL,availableSkill,commonSkillFor,skillKillRequirement} from './common-skills';
import {CommonSkillRuntime} from './CommonSkillRuntime';
import {CommonSkillEffects} from './CommonSkillEffects';
import {loadChronicleArt} from './chronicle-art';
import {CHAPTERS,CHRONICLE_ENEMIES,chapterFor,archetypeFor,scaledEnemy,chapterThreat,pickChapterEnemy,chapterInflation,BOSS_ACTIONS,BossAction} from './chronicles';
import {isExtraWeapon,extraHitFactor} from './extra-weapons';
import {ChronicleSave,SavePoint,SAVE_KEY,copyPoint} from './chronicle-save';
import {
  _decorator, assetManager, AssetManager, AudioClip, AudioSource, Camera, Canvas, Color, Component, EventKeyboard, EventTouch,
  game, Game, Graphics, ImageAsset, input, Input, KeyCode, Label, Layers, Node,
  Rect, ResolutionPolicy, Sprite, SpriteFrame, Texture2D,
  UITransform, Vec3, view, sys,
} from 'cc';
import { DEBUG } from 'cc/env';
import { RuntimeHealth, HealthHost } from './runtime-health';
import { BattleMusic } from './battle-music';
import { SoundId, SoundEvent, SOUND_CUES, GENERATED_SOUNDS, SFX_VOICES, SoundGate, weaponSound } from './weapon-sound';
import { movement, sweepEllipseTime, sectorHitsCircle } from './combat-math';
import { JOYSTICK, joystickCenter, joystickVector } from './joystick-input';
import {ParticleSprites} from './ParticleSprites';
import {BattleSpriteAtlas} from './BattleSpriteAtlas';
import { CombatEffects, drawSwordTrail, effectInk } from './combat-effects';
import { CampaignView } from './CampaignView';
import { LoadingView } from './LoadingView';
import { StartupProgress, startupBridge, CAMPAIGN_ART, ENEMY_ART } from './startup-progress';
import { ARCHER, CAVALRY, ZHANGJIAO, initialEnemyCooldown, enemyDirection, enemyAnimationCell, attackWindup } from './enemy-behavior';
import { drawWeaponArt } from './weapon-art';
import { addWeaponIcon, WEAPON_ICON_RECTS, WEAPON_ICON_PATCH_RECTS, BUTCHER_ICON_RECT, HERO_PART_RECTS } from './presentation-art';
import { heroIdlePose } from './hero-idle';
import { HERO_ARMS, relaxedWrist, drawHeroSleeve, drawHeroFist } from './hero-arms';
import { WeaponId, EquippedWeapon, WeaponStats, Tier, WEAPON_LIMIT, WEAPONS, TIER_COLORS, weaponFor, starterFor } from './weapons';
import { weaponStatsFor, weaponDps, combineWeapon, recycleWeapon, toggleOfferLock } from './campaign';
import { drawLightningSpell, drawTaoistCast, LIGHTNING_AFTERGLOW } from './enemy-spell-effects';
import { attachDesktopKeyboard, KeyboardSurface, WeChatKeyboard } from './desktop-keyboard';
declare const wx: (WeChatKeyboard & HealthHost) | undefined;
import { HeroId, EnemyKind, Phase, Run, Stats, Upgrade, ITEMS, WAVE_NAMES, WAVE_SECONDS,
  createRun, heroFor, statsFor, gainXp, xpNeeded, damageTaken, regenPerSecond, buyItem, rollShop, rerollShop,
  availableUpgrades, randomSample, chooseUpgrade, waveRule, enemyKind, enemyStats, stipendFor, waveOutcome } from './campaign';
import { passiveBonuses, amount, PASSIVE_ITEMS } from './passive-items';
import { WORLD, resizeWorld, spawnPoint, cameraTarget, orbitAnchor } from './world-rules';
import { SUPPLY_SECONDS, MAJOR_SECONDS, BOSS_EVERY_WAVES, bossDue, clockText, spawnBudget, enemyCost, rollSupply, buySupply, rerollSupply, supplyCard, SURVIVAL_VERSION, repairSupply } from './survival';
const { ccclass } = _decorator;
const ENEMY_COUNT = 8;
const TEST_HP = 10000;
const ENEMY_NORMAL=new Color('#ffffff'),ENEMY_HIT=new Color('#ffb3a3'),CLONE_TINT=new Color('#a6bcc4');
const BIRTH_RING_TINTS=Array.from({length:33},(_,i)=>new Color(211,173,84,Math.round(190*i/32)));
const BIRTH_DOT_TINTS=Array.from({length:33},(_,i)=>new Color(219,190,119,Math.round(140*i/32)));
const FACTION_TINTS=['#fff0ce','#ead8ff','#d9e5ff','#e0f0d0','#ffe0bf','#dce7f0'].map(c=>new Color(c));
const DEPTH_ORDER=(a:Node,b:Node):number=>b.position.y-a.position.y;
const MAX_COIN_NODES=128;
const TEST_ENEMIES: EnemyKind[] = ['soldier', 'spearman', 'cavalry', 'chief'];
const TEST_SPAWN = { interval: 1.1, cap: 16 };
export interface Enemy {
  nextCycleUntil?:number;specialCooldown?:number;sidestepLeft?:number;
  encounterChapter?:number;archetype?:string;bossSkin?:string;bossTimers?:number[];bossMove?:BossAction;bossAge?:number;bossNext?:number;fired?:boolean;object?:'flag'|'clone'|'eye';slowUntil?:number;slowFactor?:number;firstHits?:Map<number,number>;rigParts?:Sprite[];rigKey?:string;rigSize?:number;rigTint?:string;
  stagger?:number; staggerCooldown?:number; elite?:boolean;
  animal?: 'chicken' | 'rabbit' | 'pig' | 'tree'; animalArt?: Graphics; ttl?: number; bornTotal?: number; farAge?: number;
  birthRig?:Node;birthSprites?:Sprite[];warningDrawn?:boolean;visualHit?:boolean;moving?: boolean; chargeHit?: boolean;
  kind?: EnemyKind; maxHp?: number; damage?: number; born?: number; warning?: Graphics; skill?: number;
  node: Node; art: Sprite; text: Label; weaponKind: number; direction: number; walk: number; attack: number; attackCooldown: number; attackAngle: number;
  hitCenter?:{x:number;y:number};
  x: number; y: number; previousHitX?: number; previousHitY?: number; hp: number; flash: number; dead: number;
  vx: number; vy: number; speed: number; feedback: number;
}
interface Coin { value?:number; node: Node; art: Node; x: number; y: number; age: number; active: boolean; attracted: boolean; }
interface Projectile { atlasArt?:Sprite; returning?:boolean;returnLeg?:boolean;ownerUid?:number; artKey?:string; node: Node; x: number; y: number; angle: number; remaining: number; damage: number; weaponId: WeaponId; stats: WeaponStats; hit: Set<Enemy>; fxClock?:number; bounceLeft?: number; bounced?: boolean; secondary?: boolean; group?: {hits: Map<Enemy,number>; max: number}; }
interface EnemyShot { atlasArt?:Sprite; style?:string;styleKey?:string;returning?:boolean;originX?:number;originY?:number; node: Node; x: number; y: number; angle: number; remaining: number; speed: number; damage: number; }
interface EnemyZone { shape?:'circle'|'sector'|'line'|'ring';innerRadius?:number;angle?:number;arc?:number;length?:number;duration?:number;tick?:number;fake?:boolean;theme?:string;moveX?:number;moveY?:number; source: Enemy; x: number; y: number; radius: number; age: number; delay: number; damage: number; fired: boolean; }
interface Weapon { extraPhase?:number;extraCooldown?:number;
  strikeStarted?:boolean;impactPlayed?:boolean;
  fist:Graphics;
  orbitBlades?:Node[]; orbitPrevious?:{x:number;y:number}[]; orbitHits?:Map<Enemy,number>;
  equipped?: EquippedWeapon; stats?: WeaponStats; cooldown: number; duration: number; damage: number; offhand: Node;
  strikes?: number;
  node: Node; shoe: Node; arm: Graphics; trail: Graphics; time: number; angle: number; side: number;
  aimX?: number; aimY?: number; hit: Set<Enemy>; lastX: number; lastY: number;
}

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
  private chapterEntry?:SavePoint;
  private savedPoint?:SavePoint;
  private pendingShots:{delay:number;x:number;y:number;angle:number;weapon:EquippedWeapon;stats:WeaponStats;damage:number;group:{hits:Map<Enemy,number>;max:number}}[]=[];
  private friendlyFields:{id:WeaponId;uid:number;x:number;y:number;radius:number;life:number;next:number;damage:number;stats:WeaponStats;hit:Map<Enemy,number>;group?:{hits:Map<Enemy,number>;max:number}}[]=[];

  private pendingEnemyShots:{source:Enemy;angle:number;speed:number;delay:number}[]=[];private formationUntil=0;
  private oilHits=new Map<Enemy,{until:number;count:number}>();private trapHits=new Map<number,Map<Enemy,number>>();
private playerSlowUntil=0;
  private rigFrames:Record<string,SpriteFrame[]>={};
  private readonly buildVersion = SURVIVAL_VERSION;
  private phase: Phase = 'loading';
  private health?:RuntimeHealth;
  private pressureSeconds=0;
  private particleSprites!:ParticleSprites;
  private battleSprites!:BattleSpriteAtlas;
  private testMode = false;
  private trainingMode=false;
  private trainingPanel?:TrainingView;
  private trainingButton?:Label;
  private run: Run = createRun('liubei');
  private stats: Stats = statsFor(this.run);
  private screens!: CampaignView;
  private artFrames: Record<string, SpriteFrame> = {};
  private itemFrames: SpriteFrame[] = [];
  private ornaments: Node[] = [];
  private heroName!: Label;
  private xpBar!: Graphics;
  private bossBar!: Graphics;
  private bossLabel!: Label;
  private remaining = WAVE_SECONDS;
  private spawnClock = 0;
  private spawnSerial = 0;
  private chiefDead = false;
  private victoryPending=false;
  private bestClear=0;
  private enemyShots: EnemyShot[] = [];
  private roundKills = 0;
  private roundSummary = '';
  private bestWave = 0;
  private bestSurvival = 0;
  private nextSupply = SUPPLY_SECONDS;
  private nextEvent = MAJOR_SECONDS;
  private queuedKind: EnemyKind = 'soldier';
  private respite = 0;
  private resumeCountdown = 0;
  private powerNotice = '';
  private chainDepth = 0;
  private peachBurstCooldown = 0;
  private cleaverCounter = 0;
  private lastDamage = 0;
  private upgradeChoices: Upgrade[] = [];
  private resources!: AssetManager.Bundle;
  private root!: Node;
  private camera!: Camera;
  private battlefield!: Node;
  private terrain!: Node;
  private cameraX = 0;
  private cameraY = 0;
  private heading = 0;
  private perks = passiveBonuses(this.run.inventory);
  private skillButton!: Node;
  private skillGraphic!: Graphics;
  private skillLabel!: Label;
  private skillCharge = 0;
  private commonSkill!:CommonSkillRuntime;
  private commonEffects!:CommonSkillEffects;
  private skillIcon!:Sprite;
  private playerAim={x:0,y:0};
  private animalClock = 30;
  private treeClock = 10;
  private difficultyNotice = 0;
  private difficultyLabel!: Label;
  private meadowTiles:Node[]=[];
  private hearts: { kind?:'heart'|'peach'; node:Node; x:number;y:number;age:number;active:boolean;attracted:boolean }[] = [];
  private hintText!: Label;
  private weaponHud!: Node;
  private weaponHudKey = '';
  private idleArms!: Graphics;
  private naturalHands:Graphics[]=[];
  private terrainNodes: Node[] = [];
  private world!: Node;
  private hero!: Node;
  private body!: Sprite;
  private head!: Sprite;
  private headPivot!: Node;
  private headOpen?: SpriteFrame;
  private headClosed?: SpriteFrame;
  private handBob = 0;
  private feet: Node[] = [];
  private walkPhase = 0;
  private walkBlend = 0;
  private lean = 0;
  private torsoBob = 0;
  private bodyFrame: SpriteFrame | null = null;
  private soldierFrames: SpriteFrame[][] = [];
  private enemyFrames: Partial<Record<EnemyKind, SpriteFrame[]>> = {};
  private enemyZones: EnemyZone[] = [];
  private dangerFx!: Graphics;
  private spellFx!: Graphics;
  private weapons: Weapon[] = [];
  private projectiles: Projectile[] = [];
  private projectileContacts:{e:Enemy;t:number}[]=[];
  private depthNodes:Node[]=[];
  private presentSubstep=true;
  private heroTint='';
  private skillDrawKey='';
  private bossDrawKey='';
  private lastPickupValue=1;
  private coins: Coin[] = [];
  private get coinTotal(): number { return this.run.gold; }
  private set coinTotal(value: number) { this.run.gold = value; }
  private coinPulse = 0;
  private coinLabel!: Label;
  private pickupText!: Label;
  private enemies: Enemy[] = [];
  private hud!: Label;
  private joystick!: Graphics;
  private pauseLabel!: Label;
  private keys = new Set<KeyCode>();
  private detachKeyboard?: () => void;
  private touchId: number | null = null;
  private origin = { x: 0, y: 0 };
  private stick = { x: 0, y: 0 };
  private px = 0;
  private py = 0;
  private age = 0;
  private cooldown = 0;
  private kills = 0;
  private hits = 0;
  private facing = 1;
  private paused = false;
  private ready = false;
  private get playerHp(): number { return this.run.hearts; }
  private set playerHp(value: number) { this.run.hearts = value; }
  private regenCharge = 0;
  private idleTime = 0;
  private hurtTime = 0;
  // Transition protection blocks damage without pretending the hero was hit.
  private protectionTime = 0;
  private playerVx = 0;
  private playerVy = 0;
  private playerBar!: Graphics;
  private hurtText!: Label;
  private fx!: Graphics;
  private friendlyGroundFx!: Graphics;
  private combatFx = new CombatEffects();
  private shake = 0;
  private weaponFreeze = 0;
  private audioUnlocked = false;
  private muted = false;
  private music = new BattleMusic();
  private musicMuted = false;
  private backgrounded = false;
  private musicLoading = false;
  private musicLoaded = false;
  private musicSource?: AudioSource;
  private musicButton!: Label;
  private soundSources: AudioSource[] = [];
  private clips: Partial<Record<SoundId, AudioClip>> = {};
  private soundGate = new SoundGate();
  private loggedSounds = new Set<string>();
  private soundButton!: Label;
  private layoutReady = false;
  private halfWidth = 667;
  private halfHeight = 375;
  private ui!: Node;
  private statusPanel!: Node;
  private menu!: Node;
  private ground!: Graphics;
  private avatar!: Sprite;
  private avatarFrame: SpriteFrame | null = null;
  private healthText!: Label;
  private loadingScreen!: Node;
  private loadingText!: Label;
  private loadingView!: LoadingView;
  private startupProgress=new StartupProgress();
  private startupCanEnter=false;
  private startupCompletePainted=false;
  private startupTexture?:Texture2D;
  private startupImage?:ImageAsset;

  async start(): Promise<void> {
    this.health=new RuntimeHealth(typeof wx==='undefined'?undefined:wx,sys.localStorage,this.buildVersion,
      ()=>({phase:this.phase,seconds:Math.round(this.run.survivalSeconds),enemyNodes:this.enemies.length,
        alive:this.enemies.reduce((n,e)=>n+Number(e.hp>0),0),projectileNodes:this.projectiles.length,coinNodes:this.coins.length,
        particles:this.combatFx.particles.active,weapons:this.run.weapons.map(w=>w.id)}),
      ()=>{this.pressureSeconds=15;this.combatFx.particles.trimTrails();});
    view.setDesignResolutionSize(1334, 750, ResolutionPolicy.FIXED_HEIGHT);
    this.root = this.node2D(this.node, 'Canvas');
    this.root.addComponent(UITransform).setContentSize(1334, 750);
    const cameraNode = this.node2D(this.root, 'Camera');
    cameraNode.setPosition(0, 0, 1000);
    const camera = cameraNode.addComponent(Camera);
    this.camera = camera;
    camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = 375; camera.near = 1; camera.far = 2000;
    camera.visibility = Layers.Enum.UI_2D;
    camera.clearColor = new Color('#e5ecd6');
    const canvas = this.root.addComponent(Canvas);
    canvas.cameraComponent = camera; canvas.alignCanvasWithScreen = true;
    this.battlefield = this.node2D(this.root,'Battlefield');
    this.ground = this.node2D(this.battlefield, 'Ground').addComponent(Graphics);
    this.friendlyGroundFx = this.node2D(this.battlefield, 'FriendlyGroundEffects').addComponent(Graphics);
    this.dangerFx = this.node2D(this.battlefield, 'EnemySpells').addComponent(Graphics);
    this.world = this.node2D(this.battlefield, 'World');
    this.spellFx = this.node2D(this.battlefield, 'EnemySpellBursts').addComponent(Graphics);
    this.fx = this.node2D(this.battlefield, 'ImpactEffects').addComponent(Graphics);
    this.particleSprites=new ParticleSprites(this.fx.node,effectInk);
    this.battleSprites=new BattleSpriteAtlas();
    this.initCommonSkill();
    this.terrain = this.node2D(this.battlefield,'Terrain'); this.terrain.setSiblingIndex(1);
    this.hero = this.node2D(this.world, 'LiuBei');
    const shadow = this.hero.addComponent(Graphics);
    shadow.fillColor = new Color(65, 80, 40, 55); shadow.ellipse(0, -16, 31, 10); shadow.fill();
    for (const side of [-1, 1]) {
      const foot = this.node2D(this.hero, side < 0 ? 'LeftFoot' : 'RightFoot');
      const g = foot.addComponent(Graphics);
      g.strokeColor = new Color('#42291d'); g.lineWidth = 2;
      g.fillColor = new Color('#654231');
      g.ellipse(0, 0, 7, 5); g.fill(); g.stroke();
      foot.setPosition(side * 9, -19);
      this.feet.push(foot);
    }
    const bodyNode = this.node2D(this.hero, 'Body');
    bodyNode.setPosition(0, 35);
    this.idleArms=this.node2D(this.hero,'NaturalArms').addComponent(Graphics);
    this.body = bodyNode.addComponent(Sprite); this.body.sizeMode = Sprite.SizeMode.CUSTOM;
    bodyNode.getComponent(UITransform)!.setContentSize(112, 110);
    this.headPivot=this.node2D(this.hero,'HeadPivot');
    this.head=this.node2D(this.headPivot,'Head').addComponent(Sprite);this.head.sizeMode=Sprite.SizeMode.CUSTOM;
    for(const side of [-1,1]){const hand=this.node2D(this.hero,side<0?'RelaxedLeftHand':'RelaxedRightHand').addComponent(Graphics);hand.node.setScale(.85,.85,1);hand.node.active=false;this.naturalHands.push(hand);}
    for (let i = 0; i < WEAPON_LIMIT; i++) this.weapons.push(this.createWeapon(i % 2 ? 1 : -1));

    this.hurtText = this.label(this.hero, '', 0, 116, 24, '#c44338');
    for (let i = 0; i < ENEMY_COUNT; i++) this.enemies.push(this.createEnemy(i));
    this.ui = this.node2D(this.root, 'HUD');
    this.statusPanel = this.node2D(this.ui, 'PlayerStatus');
    const panel = this.statusPanel.addComponent(Graphics);
    panel.fillColor = new Color(35, 49, 34, 220); panel.roundRect(0, -105, 300, 105, 18); panel.fill();
    panel.strokeColor = new Color('#d8c595'); panel.lineWidth = 2; panel.stroke();
    this.avatar = this.node2D(this.statusPanel, 'Portrait').addComponent(Sprite);
    this.avatar.sizeMode = Sprite.SizeMode.CUSTOM;
    this.avatar.node.setPosition(43, -40); this.avatar.node.getComponent(UITransform)!.setContentSize(70, 64);
    this.heroName = this.label(this.statusPanel, '刘备', 184, -21, 23, '#fff3d4');
    this.heroName.node.getComponent(UITransform)!.setContentSize(202, 34);
    this.playerBar = this.node2D(this.statusPanel, 'Health').addComponent(Graphics);
    this.healthText = this.label(this.statusPanel, '', 237, -88, 14, '#ffffff');this.healthText.node.getComponent(UITransform)!.setContentSize(100,24);
    this.drawPlayerHealth();
    const coinIcon = this.node2D(this.statusPanel, 'CoinIcon'); coinIcon.setPosition(103, -88);
    this.drawCoin(coinIcon.addComponent(Graphics)); coinIcon.setScale(0.75, 0.75, 1);
    this.coinLabel = this.label(this.statusPanel, '0', 142, -88, 20, '#ffdc78');
    this.pickupText = this.label(this.hero, '', 0, 91, 20, '#d89122');
    this.hud = this.label(this.ui, '加载中…', 0, 335, 22, '#394b30');
    this.xpBar = this.node2D(this.statusPanel, 'Experience').addComponent(Graphics); this.xpBar.node.active = false;
    this.bossBar = this.node2D(this.ui, 'BossHealth').addComponent(Graphics);
    this.bossLabel = this.label(this.ui, '', 0, 274, 18, '#613f29');
    this.joystick = this.node2D(this.ui, 'FixedJoystick').addComponent(Graphics);
    this.difficultyLabel=this.label(this.ui,'',0,105,42,'#fff0b9');this.difficultyLabel.isBold=true;
    this.hintText = this.label(this.ui,'',0,-240,20,'#5b5232');
    this.weaponHud = this.node2D(this.ui,'EquippedWeapons');
    this.skillButton = this.node2D(this.ui,'HeroSkill'); this.skillButton.addComponent(UITransform).setContentSize(128,128);
    this.skillGraphic = this.skillButton.addComponent(Graphics);
    this.skillIcon=this.node2D(this.skillButton,'CarriedSkillIcon').addComponent(Sprite);this.skillIcon.sizeMode=Sprite.SizeMode.CUSTOM;this.skillIcon.node.getComponent(UITransform)!.setContentSize(70,70);
    this.skillLabel = this.label(this.skillButton,'',0,-62,20,'#fff1bb'); this.skillLabel.node.getComponent(UITransform)!.setContentSize(170,40);
    this.skillButton.on(Node.EventType.TOUCH_END,()=>this.castSkill());
    this.menu = this.node2D(this.ui, 'PauseMenu');
    const shade = this.menu.addComponent(Graphics); shade.fillColor = new Color(20, 30, 20, 220);
    shade.roundRect(-180, -300, 360, 455, 24); shade.fill();
    this.label(this.menu, GAME_NAME, 0, 110, 30, '#fff3d4');
    this.button('继续战斗', 0, 40, () => { if (this.playerHp > 0) { this.paused = false; this.menu.active = false; this.drawStick(); this.unlockAudio(); this.music.resume(); } }, this.menu);
    this.button('返回选人', 0, -35, () => this.showMainMenu(), this.menu);
    this.soundButton = this.button('音效：开启', 0, -110, () => {
      this.unlockAudio(); this.muted = !this.muted;
      this.soundButton.string = this.muted ? '音效：关闭' : '音效：开启';
      try { sys.localStorage.setItem('taoyuan-muted', String(this.muted)); } catch (_) { /* storage may be disabled */ }
      if (this.muted) this.stopSounds();
    }, this.menu);
    this.musicButton = this.button('音乐：开启', 0, -185, () => {
      this.unlockAudio(); this.musicMuted = !this.musicMuted;
      this.music.setEnabled(!this.musicMuted);
      this.musicButton.string = this.musicMuted ? '音乐：关闭' : '音乐：开启';
      try { sys.localStorage.setItem('taoyuan-music-muted', String(this.musicMuted)); } catch (_) { /* optional */ }
      if (!this.musicMuted) this.loadMusic();
    }, this.menu);
    this.menu.active = false;
    this.pauseLabel = this.button('Ⅱ', 0, 0, () => {
      if (this.phase !== 'battle') return;
      this.paused = true; this.clearInput(); this.stopSounds(); this.music.pause(); this.menu.active = true;
    }, this.ui, 58);
    const pause=this.pauseLabel.node.parent!;pause.name='PauseButton';pause.getComponent(UITransform)!.setContentSize(64,64);
    this.pauseLabel.string='';const pg=pause.getComponent(Graphics)!;pg.clear();pg.fillColor=new Color('#355e40');pg.strokeColor=new Color('#d7c58f');pg.lineWidth=1.5;pg.circle(0,0,24);pg.fill();pg.stroke();
    pg.fillColor=new Color('#fff0d2');pg.roundRect(-7,-9,4,18,1);pg.roundRect(3,-9,4,18,1);pg.fill();
    this.trainingButton=this.button('演武配置',0,0,()=>this.openTrainingPanel(),this.ui,160);
    this.trainingButton.node.parent!.name='OpenTrainingPanel';
    // No battlefield or HUD may be visible before the user chooses a hero and starts.
    this.setBattleVisible(false);
    this.loadingScreen = this.node2D(this.ui, 'LoadingScreen');
    this.loadingView=new LoadingView(this.loadingScreen);this.loadingText=this.loadingView.status;
    const startup=startupBridge();this.startupProgress=new StartupProgress(startup?.progress);
    if(startup?.image){
      this.startupImage=new ImageAsset(startup.image);const texture=this.startupTexture=new Texture2D();texture.image=this.startupImage;
      const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(0,0,startup.image.width,startup.image.height);
      this.artFrames.poster=frame;this.loadingView.setPoster(frame,startup.image.width,startup.image.height);this.markStartup('campaign:poster');
    }
    this.drawStartupProgress();
    this.layoutBattlefield();
    try {
      this.resources = await new Promise<AssetManager.Bundle>((resolve, reject) => {
        assetManager.loadBundle('battle', (error, bundle) => error ? reject(error) : resolve(bundle));
      });
      if (!this.isValid) return;
      this.markStartup('battle');
    } catch (error) {
      this.failStartup('资源下载失败，请重新进入'); console.error(error); return;
    }
    for (let i = 0; i < SFX_VOICES; i++) {
      const source = this.node2D(this.root, `Voice${i}`).addComponent(AudioSource);
      source.playOnAwake = false; this.soundSources.push(source);
      if (DEBUG) source.node.on(AudioSource.EventType.STARTED, () => {
        const name = source.clip?.name;
        if (name && !this.loggedSounds.has(name)) { this.loggedSounds.add(name); console.info('[sfx] started', name); }
      });
    }
    for (const name of ['sandal-hit-pcm'] as const) {
      this.resources.load(`audio/${name}`, AudioClip, (error, clip) => {
        if (!this.isValid) return;
        if (error) { this.soundButton.string = '音效加载失败'; console.warn('音效加载失败', name, error); return; }
        this.clips[name] = clip;
        if (this.audioUnlocked && !this.muted) this.soundButton.string = '音效：开启';
      });
    }
    this.loadMusic(); this.loadWeaponSounds(); this.loadOrchardArt();
    input.on(Input.EventType.TOUCH_START, this.touchStart, this);
    input.on(Input.EventType.TOUCH_MOVE, this.touchMove, this);
    input.on(Input.EventType.TOUCH_END, this.touchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.touchEnd, this);
    input.on(Input.EventType.KEY_DOWN, this.keyDown, this);
    input.on(Input.EventType.KEY_UP, this.keyUp, this);
    this.detachKeyboard = attachDesktopKeyboard(
      typeof window === 'undefined' ? undefined : window as unknown as KeyboardSurface,
      typeof wx === 'undefined' ? undefined : wx,
      () => this.phase === 'battle' && !this.paused && !this.trainingPanel?.root.active && this.playerHp > 0,
      code => this.keyDown({ keyCode: code } as EventKeyboard),
      code => this.keyUp({ keyCode: code } as EventKeyboard), () => this.clearInput(),
    );
    game.on(Game.EVENT_HIDE, this.onBackground, this);
    game.on(Game.EVENT_SHOW, this.onForeground, this);
    ['sickle', 'hoe'].forEach((kind, index) => {
      this.resources.load(`characters/soldier-${kind}-actions/texture`, Texture2D, (error, texture) => {
        if (!this.isValid) return;
        if (error) { this.failStartup('小兵资源加载失败，请重新进入'); console.error(error); return; }
        const frames: SpriteFrame[] = [];
        for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
          const frame = new SpriteFrame(); frame.texture = texture;
          frame.rect = new Rect(col * texture.width / 4, row * texture.height / 3, texture.width / 4, texture.height / 3);
          frames.push(frame);
        }
        this.soldierFrames[index] = frames;
        this.markStartup('soldier:'+kind);
        this.enemies.forEach(e => this.drawEnemy(e));
        this.checkReady();
      });
    });
    this.resources.load('characters/liubei-bean-body/texture', Texture2D, (error, texture) => {
      if (!this.isValid) return;
      if (error) { this.failStartup('角色资源加载失败，请重新进入'); console.error(error); return; }
      const frame = new SpriteFrame(); frame.texture = texture;
      // 新图仅含大头和短袍，手臂、握鞋和小脚豆独立驱动。
      frame.rect = new Rect(0, 0, texture.width, texture.height);
      this.bodyFrame = frame; this.artFrames.liubei_body = frame; this.body.spriteFrame = frame;
      this.avatarFrame = new SpriteFrame(); this.avatarFrame.texture = texture;
      this.avatarFrame.rect = new Rect(0, 0, texture.width, texture.height * 0.78);
      this.avatar.spriteFrame = this.avatarFrame; this.markStartup('liubei-body'); this.checkReady();
    });
    try {
      const bundle = await new Promise<AssetManager.Bundle>((resolve, reject) => assetManager.loadBundle('campaign', (error, b) => error ? reject(error) : resolve(b)));
      if(!this.isValid)return;this.markStartup('campaign');
      await Promise.all(CAMPAIGN_ART.filter(name=>name!=='poster'||!this.artFrames.poster).map(name => new Promise<void>((resolve, reject) => {
        bundle.load(`${name}/texture`, Texture2D, (error, texture) => {
          if (error) { reject(error); return; }
          if (!this.isValid) { resolve(); return; }
          const frame = new SpriteFrame(); frame.texture = texture; frame.rect = new Rect(0, 0, texture.width, texture.height); this.artFrames[name] = frame;
          if(name==='poster')this.loadingView.setPoster(frame,texture.width,texture.height);
          if (name === 'camp-paper') { frame.insetLeft = 44; frame.insetRight = 44; frame.insetTop = 44; frame.insetBottom = 44; }
          if (name === 'camp-stats') ['hp', 'power', 'damage', 'haste', 'speed', 'armor', 'crit', 'range', 'regen', 'pickup', 'area', 'coin'].forEach((key, index) => {
            const icon = new SpriteFrame(); icon.texture = texture;
            icon.rect = new Rect(index % 4 * texture.width / 4, Math.floor(index / 4) * texture.height / 3, texture.width / 4, texture.height / 3);
            this.artFrames['ui-' + key] = icon;
          });
          if (name === 'camp-titles') ['upgrade', 'shop'].forEach((key, index) => {
            const title = new SpriteFrame(); title.texture = texture;
            title.rect = new Rect(index * texture.width / 2, texture.height * (index ? .35 : .28), texture.width / 2, texture.height * (index ? .3 : .46));
            this.artFrames['title-' + key] = title;
          });
          if (name === 'items') for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
            const icon = new SpriteFrame(); icon.texture = texture; icon.rect = new Rect(col * texture.width / 4, row * texture.height / 3, texture.width / 4, texture.height / 3); this.itemFrames.push(icon);
          }
          this.markStartup('campaign:'+name);resolve();
        });
      })));
      const enemyBundle = await new Promise<AssetManager.Bundle>((resolve, reject) => assetManager.loadBundle('enemies', (error, b) => error ? reject(error) : resolve(b)));
      if(!this.isValid)return;this.markStartup('enemies');
      await Promise.all(ENEMY_ART.map(([kind, name]) => new Promise<void>((resolve, reject) => {
        enemyBundle.load(`${name}/texture`, Texture2D, (error, texture) => {
          if (error) { reject(error); return; }
          if (!this.isValid) { resolve(); return; }
          const frames: SpriteFrame[] = [];
          for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
            const frame = new SpriteFrame(); frame.texture = texture;
            frame.rect = new Rect(col * texture.width / 4, row * texture.height / 3, texture.width / 4, texture.height / 3); frames.push(frame);
          }
          this.enemyFrames[kind] = frames;this.markStartup('enemy:'+kind); resolve();
        });
      })));
      if (!this.isValid) return;
      await loadChronicleArt(this.artFrames,()=>this.isValid);this.markStartup('chronicles');
      await Promise.all([
        this.loadResultArt(),
        this.loadPresentationArt(),
        this.loadHeroMenuArt().catch(error=>{this.startupProgress.skipMenuArt();this.drawStartupProgress();console.warn('选角素材加载失败，使用基础布局',error);}),
      ]);
      if(!this.isValid)return;
      this.artFrames.liubei_body = this.bodyFrame!;
      this.screens = new CampaignView(this.ui, this.artFrames, this.itemFrames);
      this.screens.resize(this.halfWidth * 2, this.halfHeight * 2);
      try { this.bestClear=Number(sys.localStorage.getItem('taoyuan-chronicle-clear-best-v4'))||0; this.bestSurvival = Number(sys.localStorage.getItem('taoyuan-survival-best')) || 0; this.bestWave = Number(sys.localStorage.getItem('taoyuan-best')) || 0; this.muted = sys.localStorage.getItem('taoyuan-muted') === 'true'; this.musicMuted = sys.localStorage.getItem('taoyuan-music-muted') === 'true'; } catch (_) { /* optional local persistence */ }
      this.soundButton.string = this.muted ? '音效：关闭' : '音效：开启';
      this.musicButton.string = this.musicMuted ? '音乐：关闭' : '音乐：开启'; this.music.setEnabled(!this.musicMuted);
      this.checkReady();
    } catch (error) { this.failStartup('角色资源加载失败，请重新进入'); console.error(error); }
  }

  private async loadHeroMenuArt():Promise<void> {
    const bundle=await new Promise<AssetManager.Bundle>((resolve,reject)=>assetManager.loadBundle('hero-menu',(error,b)=>error?reject(error):resolve(b)));
    if(!this.isValid)return;this.markStartup('hero-menu');
    await Promise.all(['background','atlas','logo'].map(name=>new Promise<void>((resolve,reject)=>{
      bundle.load((name==='background'?'training-ground':name)+'/texture',Texture2D,(error,texture)=>{
        if(error){reject(error);return;}if(!this.isValid){resolve();return;}
        if(name==='background'||name==='logo'){const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(0,0,texture.width,texture.height);this.artFrames['hero-menu-'+name]=frame;}
        else{
          const cw=texture.width/3,ch=texture.height/2;
          ['liubei','guanyu','zhangfei','logo','title','start'].forEach((key,i)=>{if(key==='logo')return;const frame=new SpriteFrame();frame.texture=texture;frame.rect=i<3?new Rect(i*cw,0,cw,ch):new Rect((i-3)*cw,ch+ch*.25,cw,ch*.5);this.artFrames['hero-menu-'+key]=frame;});
        }this.markStartup('menu:'+name);resolve();
      });
    })));
  }

  private async loadResultArt():Promise<void> {
    const bundle=await new Promise<AssetManager.Bundle>((resolve,reject)=>assetManager.loadBundle('results',(error,b)=>error?reject(error):resolve(b)));
    if(!this.isValid)return;this.markStartup('results');
    const texture=await new Promise<Texture2D>((resolve,reject)=>bundle.load('portraits/texture',Texture2D,(error,t)=>error?reject(error):resolve(t)));
    if(!this.isValid)return;
    const width=texture.width/3,height=texture.height/2;
    (['liubei','guanyu','zhangfei'] as const).forEach((id,i)=>{
      for(const [row,prefix] of [[0,'hero-select-'],[1,'result-']] as const){const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(i*width,row*height,width,height);this.artFrames[prefix+id]=frame;}
    });
    this.markStartup('results:portraits');
  }

  private async loadPresentationArt():Promise<void> {
    const bundle=await new Promise<AssetManager.Bundle>((resolve,reject)=>assetManager.loadBundle('presentation',(error,b)=>error?reject(error):resolve(b)));
    if(!this.isValid)return;this.markStartup('presentation');
    await Promise.all(['icons','weapon-revision','butcher-knife','heroes'].map(name=>new Promise<void>((resolve,reject)=>{
      bundle.load((name==='background'?'training-ground':name)+'/texture',Texture2D,(error,texture)=>{
        if(error){reject(error);return;}if(!this.isValid){resolve();return;}
        const frame=(key:string,rect:number[]):void=>{const f=new SpriteFrame();f.texture=texture;f.rect=new Rect(rect[0],rect[1],rect[2],rect[3]);this.artFrames[key]=f;};
        if(name==='icons')Object.keys(WEAPON_ICON_RECTS).forEach(id=>frame('icon-'+id,WEAPON_ICON_RECTS[id as WeaponId]!));
        else if(name==='weapon-revision')for(const id of ['pole'] as const)frame('icon-'+id,WEAPON_ICON_PATCH_RECTS[id]);
        else if(name==='butcher-knife')frame('icon-cleaver',BUTCHER_ICON_RECT);
        else Object.keys(HERO_PART_RECTS).filter(id=>['liubei','guanyu','zhangfei'].indexOf(id)>=0).forEach(id=>HERO_PART_RECTS[id].forEach((rect,i)=>frame('hero-'+id+'-'+['open','closed','torso'][i],rect)));
        this.markStartup('presentation:'+name);resolve();
      });
    })));
  }

  private applyHeroPresentation():void {
    const id=this.run.heroId;
    this.body.spriteFrame=this.artFrames['hero-'+id+'-torso'];
    this.headOpen=this.artFrames['hero-'+id+'-open'];this.headClosed=this.artFrames['hero-'+id+'-closed'];this.head.spriteFrame=this.headOpen!;
    const rect=HERO_PART_RECTS[id];
    this.body.node.getComponent(UITransform)!.setContentSize(49,49*rect[2][3]/rect[2][2]);
    this.head.node.getComponent(UITransform)!.setContentSize(100,100*rect[0][3]/rect[0][2]);
    this.head.node.setPosition(0,id==='guanyu'?24:id==='zhangfei'?25:26);
    this.animateWalk(0,0,0,0,0);
  }

  private tintHero(color:string):void {
    if(this.heroTint===color)return;this.heroTint=color;
    const tint=new Color(color);this.body.color=tint;if(this.head)this.head.color=tint;
  }

  private checkReady(): void {
    if (this.ready || this.startupCanEnter || this.startupProgress.error || !this.startupProgress.allSettled || !this.screens || !this.bodyFrame || !this.soldierFrames[0] || !this.soldierFrames[1]) return;
    this.startupProgress.complete();this.startupCanEnter=true;this.drawStartupProgress();
  }

  private drawStartupProgress():void {
    this.loadingView.setProgress(this.startupProgress.value,this.startupProgress.error);
    const startup=startupBridge();if(startup)startup.progress=this.startupProgress.value;
  }
  private markStartup(id:string):void {this.startupProgress.mark(id);this.drawStartupProgress();}
  private failStartup(message:string):void {this.startupProgress.fail(message);this.drawStartupProgress();}

  /** Local browser art review only; release WeChat builds remove this DEBUG branch. */
  private openCampReview(): void {
    const params = new URLSearchParams(window.location.search), screen = params.get('camp');
    if (params.get('weapons') === 'review') {
      this.restart(true); this.run.weapons = WEAPONS.filter(w=>['smg','shotgun','rocket','sword','thunder','gourd'].indexOf(w.id)>=0).map((w, i) => ({ id: w.id, tier: 2, uid: i + 1 })); this.run.nextWeaponUid = 7;
      this.refreshStats(); this.syncWeapons(); return;
    }
    if (params.get('enemies') === 'review') { this.openEnemyReview(params.get('pose') || ''); return; }
    if (screen !== 'upgrade' && screen !== 'shop') return;
    const id = params.get('hero'); this.run = createRun(id === 'guanyu' || id === 'zhangfei' ? id : 'liubei');
    this.run.wave = 2; this.run.level = 6; this.run.gold = 150; this.run.survivalSeconds = screen === 'upgrade' ? 90 : 30;
    this.run.supplyCount = screen === 'upgrade' ? 3 : 1; this.run.supplyMode = screen === 'upgrade' ? 'major' : 'normal';
    this.run.weapons.push({ id: 'peach', tier: 1, uid: 2 }); this.run.nextWeaponUid = 3;
    if (params.get('weapons') === 'full') { this.run.weapons = WEAPONS.filter(w=>['smg','shotgun','rocket','sword','thunder','gourd'].indexOf(w.id)>=0).map((w, i) => ({ id: w.id, tier: 2, uid: i + 1 })); this.run.nextWeaponUid = 7; }
    this.stats = this.currentStats(); this.clearBattle(); this.setBattleVisible(true); rollSupply(this.run); this.showShop();
  }

  /** Separate local QA route; normal startup always stays on the hero selection screen. */
  private openEnemyReview(pose: string): void {
    this.restart(); this.clearBattle(); this.run.wave = 2;
    this.run.bonus.hp = 90; this.refreshStats(); this.playerHp = this.stats.maxHp;
    this.cooldown = 999; this.spawnClock = 999; this.px = -120; this.py = -100; this.hero.setPosition(this.px, this.py);
    const entries: [EnemyKind, number, number, number][] = [['spearman', -400, 60, .8], ['cavalry', 330, -100, 2.2], ['chief', 100, 140, 3]];
    for (const [kind, x, y, cooldown] of entries) {
      this.spawnNext(kind); const e = this.enemies.find(v => v.hp > 0 && v.kind === kind)!;
      e.x = x; e.y = y; e.born = 0; e.attackCooldown = pose ? 0 : cooldown; e.node.setPosition(x, y);
    }
    if (pose === 'warning' || pose === 'impact') {
      for (let i = 0; i < (pose === 'warning' ? 36 : 112); i++) this.simulate(1 / 120);
      this.updateEffects(0); this.paused = true; this.menu.active = false;
    }
    this.drawPlayerHealth(); this.drawProgress();
  }

  update(delta: number): void {
    this.layoutBattlefield();
    if(this.ready&&this.phase==='battle'&&!this.paused&&!this.backgrounded){
      this.health?.frame(delta);
      if(this.pressureSeconds>0){this.pressureSeconds=Math.max(0,this.pressureSeconds-Math.min(delta,.08));if(!this.pressureSeconds)this.combatFx.particles.trailsEnabled=true;}
    }
    if(!this.ready&&this.phase==='loading'){
      if(this.startupCanEnter){
        if(this.startupCompletePainted){
          this.ready=true;this.loadingScreen.active=false;this.showMainMenu();
          const startup=startupBridge();if(startup)delete startup.image;
          if(DEBUG&&sys.isBrowser)this.openCampReview();
        }else this.startupCompletePainted=true;
      }
      return;
    }
    if(this.ready&&this.phase==='menu'){if(!this.backgrounded)this.screens.update(delta);return;}
    if(this.ready&&this.phase==='battle'&&this.finishVictory())return;
    if(this.ready&&(this.phase==='defeat'||this.phase==='victory')){this.screens.update(delta);return;}
    // The music clock continues while shopping/counting down; combat remains frozen.
    if(this.ready&&!this.paused&&!this.backgrounded&&(this.phase==='battle'||this.phase==='shop'))
      this.music.update(Math.min(Math.max(delta,0),.08));
    if (!this.ready || this.paused || this.backgrounded || this.phase !== 'battle' || this.trainingPanel?.root.active) return;
    // Only simulated foreground time counts; stalls and returning from background never skip danger.
    const elapsed = Math.min(Math.max(delta, 0), .08);
    if (this.resumeCountdown > 0) {
      this.resumeCountdown = Math.max(0, this.resumeCountdown - elapsed);
      this.hud.string = this.resumeCountdown > .4 ? this.powerNotice : '开打！';
      if (this.resumeCountdown === 0) this.music.resume();
      return;
    }
    this.soundGate.update(elapsed);
    let remaining = elapsed;
    while (remaining > .000001 && this.phase === 'battle') {
      const boundary = this.testMode ? remaining : this.run.wave === 1 ? this.remaining : this.nextSupply - this.run.survivalSeconds;
      if (boundary <= .000001) { if (this.run.wave === 1) this.finishWave(); else this.openSupply(); break; }
      const dt = Math.min(remaining, 1 / 120, boundary);
      if (!this.testMode) { if (this.run.wave === 1) this.remaining = Math.max(0, this.remaining - dt); else this.run.survivalSeconds += dt; }
      this.presentSubstep=remaining-dt<=.000001||boundary-dt<=.000001;
      if(!this.testMode){this.run.elapsed+=dt;this.run.chapterTime+=dt;}
      this.simulate(dt); remaining -= dt;
      if (this.playerHp <= 0) break;
    }
    this.presentSubstep=true;
    if (this.phase !== 'battle') return;
    if (!this.testMode && this.run.wave === 1 && this.remaining <= .000001) { this.finishWave(); return; }
    if (!this.testMode && this.run.wave === 2 && this.run.survivalSeconds + .000001 >= this.nextSupply) { this.openSupply(); return; }
    this.followCamera(elapsed); this.updateEffects(elapsed); this.drawProgress();
    const order=this.depthNodes;order.length=0;
    for(const e of this.enemies)if(e.node.active)order.push(e.node);
    for(const p of this.projectiles)if(p.remaining>0)order.push(p.node);
    for(const p of this.enemyShots)if(p.remaining>0)order.push(p.node);
    for(const c of this.coins)if(c.active)order.push(c.node);
    order.push(this.hero);order.sort(DEPTH_ORDER);
    for(let i=0;i<order.length;i++)if(order[i].getSiblingIndex()!==i)order[i].setSiblingIndex(i);
    for(const [node,previous]of [[this.fx.node,this.world],[this.dangerFx.node,this.fx.node],[this.spellFx.node,this.dangerFx.node]]){
      const index=previous.getSiblingIndex()+1;if(node.getSiblingIndex()!==index)node.setSiblingIndex(index);
    }
  }

  private simulate(dt: number): void {
    this.combatFx.update(dt);
    this.updateSkill(dt);this.updateExtraFields(dt);if(this.finishVictory())return;this.updateWildlife(dt);
    this.difficultyNotice=Math.max(0,this.difficultyNotice-dt);if(this.difficultyLabel)this.difficultyLabel.string=this.difficultyNotice>0?(this.run.bossEncounter?chapterFor(this.run.chapter).boss+'来袭':'难度升级'):'';
    this.age += dt; this.peachBurstCooldown = Math.max(0, this.peachBurstCooldown - dt);
    const rule = this.testMode ? TEST_SPAWN : waveRule(this.run.wave);
    this.respite = Math.max(0, this.respite - dt);
    if(!this.trainingMode)this.spawnClock -= dt;
    if (!this.trainingMode && this.spawnClock <= 0) {
      const alive = this.enemies.filter(e => e.hp > 0 && !e.animal).length;
      if (this.testMode) { this.spawnClock = rule.interval; if (alive < rule.cap) this.spawnTestEnemy(); }
      else if (this.run.wave === 1) { this.spawnClock = rule.interval; if (alive < rule.cap){const id=this.run.chapter===1?'E01':this.pickArchetype(0);if(id)this.spawnNext(archetypeFor(id).kind,id);} }
      else {
        const id=this.pickArchetype(Math.min(3,this.run.wavesCleared+1));
        if(alive<80&&id)this.spawnNext(archetypeFor(id).kind,id);
        this.spawnClock=(id?archetypeFor(id).cost:1)/chapterThreat(this.run.chapter,Math.min(3,this.run.wavesCleared+1),this.run.bossEncounter)*(this.respite>0?1.3:1);
      }
    }
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.protectionTime = Math.max(0, this.protectionTime - dt);
    const blink = this.hurtTime > 0 && Math.floor(this.hurtTime * 18) % 2 === 0;
    this.tintHero(blink ? '#ff8479' : '#ffffff');
    this.hurtText.string = this.hurtTime > 0.45 ? `-${this.lastDamage}` : '';
    this.hurtText.node.setPosition(0, 116 + (1.2 - this.hurtTime) * 40);
    let x = this.stick.x, y = this.stick.y;
    if (this.keys.size) {
      x = Number(this.keys.has(KeyCode.KEY_D) || this.keys.has(KeyCode.ARROW_RIGHT))
        - Number(this.keys.has(KeyCode.KEY_A) || this.keys.has(KeyCode.ARROW_LEFT));
      y = Number(this.keys.has(KeyCode.KEY_W) || this.keys.has(KeyCode.ARROW_UP))
        - Number(this.keys.has(KeyCode.KEY_S) || this.keys.has(KeyCode.ARROW_DOWN));
    }
    const direction = movement(this.commonSkill.dashing?0:x,this.commonSkill.dashing?0:y);
    const oldX = this.px, oldY = this.py;
    this.px = this.clamp(this.px + (direction.x * this.stats.speed * (this.playerSlowUntil>this.age?.9:1) * (this.hurtTime > Math.max(0,1.2-this.perks.hurtDuration) ? 1+this.perks.hurtSpeed : 1) * (this.commonSkill.speedFor(this.stats.speed,heroFor(this.run).speed)/this.stats.speed) + this.playerVx) * dt, -WORLD.halfWidth + 45, WORLD.halfWidth - 45);
    this.py = this.clamp(this.py + (direction.y * this.stats.speed * (this.playerSlowUntil>this.age?.9:1) * (this.hurtTime > Math.max(0,1.2-this.perks.hurtDuration) ? 1+this.perks.hurtSpeed : 1) * (this.commonSkill.speedFor(this.stats.speed,heroFor(this.run).speed)/this.stats.speed) + this.playerVy) * dt, -WORLD.halfHeight + 40, WORLD.halfHeight - 50);
    this.playerVx *= Math.exp(-12 * dt); this.playerVy *= Math.exp(-12 * dt);
    if(Math.hypot(direction.x,direction.y)>.05) this.heading=Math.atan2(direction.y,direction.x);
    if (Math.abs(direction.x) > 0.05) this.facing = direction.x > 0 ? 1 : -1;
    this.run.moving=Math.hypot(this.px-oldX,this.py-oldY)>dt*32;
    this.hero.setPosition(this.px, this.py);
    this.animateWalk(dt, this.px - oldX, this.py - oldY, direction.x, direction.y);
    for (const e of this.enemies) {
      const center = this.enemyHitCenter(e);
      e.previousHitX = center.x; e.previousHitY = center.y;
      const previousAttack=e.attack;this.updateEnemy(e,dt);this.commonSkill.enemyUpdated(e,previousAttack);
    }
    // 软分离防止小兵重叠成一个点。
    for (let i = 0; i < this.enemies.length; i++) for (let j = i + 1; j < this.enemies.length; j++) {
      const a = this.enemies[i], b = this.enemies[j];
      if (a.hp <= 0 || b.hp <= 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, squared = dx*dx+dy*dy;
      if (squared < 1764 && squared > .000001) {
        const d=Math.sqrt(squared);
        const push = (42 - d) * 3 * dt / d;
        a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
      }
    }
    for (const e of this.enemies) {
      if (e.hp > 0 && !e.animal && (e.born || 0) <= 0 && Math.hypot(e.x - this.px, e.y - this.py) < (e.kind === 'chief' ? 42 : 24) * (1-this.perks.hitbox)) this.hurtPlayer(e.x, e.y, e.damage);
    }
    if (this.playerHp <= 0) return;
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const w of this.weapons) {
      if (!w.equipped || !w.stats) { if (w === this.weapons[1]) this.updateFreeHand(); continue; }
      if(w.equipped.id==='sword'){this.updateWeapon(w,dt);continue;}
      if(['star-lamps','wood-ox'].indexOf(w.equipped.id)>=0){this.updateExtraOrbit(w,dt*this.commonSkill.hasteMultiplier);continue;}
      w.cooldown = Math.max(0, w.cooldown - dt*this.commonSkill.hasteMultiplier);
      if (this.cooldown <= 0 && w.cooldown <= 0 && w.time >= w.duration) {
        let target: Enemy | undefined, nearest = w.stats.range;
        for (const e of this.enemies) {
          const distance = Math.hypot(e.x - this.px, e.y - this.py);
          if (e.hp > 0 && (e.born || 0) <= 0 && (!e.animal || this.playerHp < 5) && distance < nearest) { nearest = distance; target = e; }
        }
        if (!target) target = this.enemies.find(e=>e.animal && e.hp>0 && (e.born||0)<=0 && Math.hypot(e.x-this.px,e.y-this.py)<w.stats!.range);
        if (target) {
          w.strikes = (w.strikes || 0)+1;
          w.stats = weaponStatsFor(this.run, w.equipped);
          if (w.equipped.id === 'cleaver' && this.perks.cleaverThird > 0 && w.strikes % 3 === 0) {
            w.stats.range *= 1.4; w.stats.arc *= 1.4; w.stats.damage *= 1+this.perks.cleaverThird;
          }
          w.time = 0; w.extraPhase=0;w.hit.clear();w.strikeStarted=false;w.impactPlayed=false; w.duration = Math.min(.38, w.stats.interval * .8);
          const aim = this.enemyHitCenter(target); w.aimX = aim.x; w.aimY = aim.y;
          w.angle = Math.atan2(target.y - this.py, target.x - this.px);
          w.damage = Math.round(w.stats.damage * (Math.random() < w.stats.crit ? w.stats.critMultiplier : 1));
          w.cooldown = w.stats.interval;
        }
      }
      this.updateWeapon(w,dt*this.commonSkill.hasteMultiplier);
    }
    if(this.finishVictory())return;
    this.updateProjectiles(dt);if(this.finishVictory())return;
    this.updateEnemyShots(dt);
    if (this.playerHp <= 0) return;
    this.updateEnemyZones(dt);
    if (this.playerHp <= 0) return;
    this.updateCoins(dt);
    this.weaponFreeze = Math.max(0, this.weaponFreeze - dt);
  }

  private drawPlayerHealth(): void {
    const g = this.playerBar; g.clear(); this.healthText.string = this.trainingMode ? '生命 ∞' : this.testMode ? '生命'+Math.ceil(this.playerHp) : '';
    for (let i = 0; i < 5; i++) {
      const x = 106 + i * 37, y = -55, full = this.playerHp > i;
      g.fillColor = new Color(full ? '#ef665b' : '#63705b'); g.strokeColor = new Color(full ? '#ffb393' : '#9a9f80'); g.lineWidth = 1.5;
      g.moveTo(x, y - 10); g.bezierCurveTo(x - 23, y + 5, x - 9, y + 22, x, y + 9); g.bezierCurveTo(x + 9, y + 22, x + 23, y + 5, x, y - 10); g.close(); g.fill(); g.stroke();
    }
  }

  // 接触伤害与后续敌方攻击共用同一受伤入口。
  private hurtPlayer(sourceX: number, sourceY: number, raw = 2): void {
    if (this.phase!=='battle'||this.victoryPending||this.playerHp <= 0 || this.hurtTime > 0 || this.protectionTime > 0 ) return;
    if(this.commonSkill.block())return;
    if(this.trainingMode)return;
    this.lastDamage = 1;
    this.playerHp = Math.max(0, this.playerHp - this.lastDamage); this.hurtTime = 1.2 + this.perks.invincible;
    this.refreshStats(); this.pushNearbyEnemies();
    const dx = this.px - sourceX, dy = this.py - sourceY, distance = Math.hypot(dx, dy);
    this.playerVx = (distance > 0.001 ? dx / distance : -this.facing) * 230 * (1-this.perks.resist);
    this.playerVy = (distance > 0.001 ? dy / distance : 0) * 230 * (1-this.perks.resist);
    this.tintHero('#ff8479');
    this.hurtText.string = `-${this.lastDamage}`; this.drawPlayerHealth();
    this.shake = Math.max(this.shake, 0.055);
    this.playSound('sandal-hit-pcm', 0.48, 2);
    if (this.playerHp === 0) {
      this.clearInput(); this.hero.angle = -18;
      this.weapons.forEach(w => w.trail.clear());
      this.endRun(false);
    }
  }

  private animateWalk(dt: number, dx: number, dy: number, moveX: number, moveY: number): void {
    this.idleTime += dt;
    const distance = Math.hypot(dx, dy);
    const moving = distance > 0.0001;
    const speed = moving && dt>0 ? Math.min(1, distance / (heroFor(this.run).speed * dt)) : 0;
    const smoothing = 1 - Math.exp(-16 * dt);
    this.walkBlend += (speed - this.walkBlend) * smoothing;
    // 步频由实际路程驱动，慢推摇杆走小步；贴墙不再原地跑。
    this.walkPhase += distance / 84 * Math.PI * 2;
    this.lean += ((moving ? -moveX * 4 : 0) - this.lean) * smoothing;
    const pose=heroIdlePose(this.run.heroId,this.idleTime,this.walkBlend,this.hurtTime>0);
    const sweep=this.commonSkill?.sweepPose||0,cast=this.commonSkill?.castPose;
    this.handBob=pose.handBob+sweep*2+(cast?.hand||0);
    this.torsoBob = Math.abs(Math.sin(this.walkPhase)) * 1.8 * this.walkBlend + pose.headY*.45-Math.abs(sweep)*1.5+(cast?.bob||0);
    const sway = Math.sin(this.walkPhase) * 1.4 * this.walkBlend;
    this.body.node.setPosition(sway, -1 + this.torsoBob);
    this.body.node.angle = this.lean + Math.sin(this.walkPhase) * 2.5 * this.walkBlend + pose.bodyAngle+(sweep*12+(cast?.body||0))*this.facing;
    const squash = Math.cos(this.walkPhase * 2) * 0.025 * this.walkBlend - pose.breath+Math.abs(sweep)*.025+(cast?.squash||0);
    this.body.node.setScale(this.facing * (1 + squash), 1 - squash, 1);
    if(this.headPivot){
      this.headPivot.setPosition(sway+pose.headX+sweep*2*this.facing,18+this.torsoBob+pose.headY);
      this.headPivot.angle=this.lean*.6+Math.sin(this.walkPhase)*1.8*this.walkBlend+(pose.headAngle-sweep*5+(cast?.head||0))*this.facing;
      this.headPivot.setScale(this.facing,1,1);
      const frame=pose.eyesClosed?this.headClosed:this.headOpen;if(frame&&this.head.spriteFrame!==frame)this.head.spriteFrame=frame;
    }
    if(this.presentSubstep)this.updateRestingArms();
    this.feet.forEach((foot, index) => {
      const side = index === 0 ? -1 : 1;
      const phase = this.walkPhase + index * Math.PI;
      const stride = Math.sin(phase) * this.walkBlend;
      const lift = Math.max(0, Math.cos(phase)) * 3 * this.walkBlend;
      foot.setPosition(side * 9 + stride * (Math.abs(moveX) > 0.1 ? moveX * 4 : 1.5),
        -19 + stride * (Math.abs(moveY) > 0.1 ? moveY * 4 : 1.5) + lift);
      foot.angle = -stride * 9 * (moveX < -0.1 ? -1 : 1);
      foot.setScale(1 + Math.max(0, -Math.cos(phase)) * 0.07 * this.walkBlend,
        1 - lift * 0.014, 1);
    });
  }

  private placeArmBehindHead(node:Node):void {
    if(!this.headPivot)return;
    const head=this.headPivot.getSiblingIndex(),current=node.getSiblingIndex();
    const target=head-(current<head?1:0);if(current!==target)node.setSiblingIndex(target);
  }

  private updateRestingArms():void {
    const arms=this.idleArms;if(!arms||!this.presentSubstep)return;
    const active=this.run.weapons.length>1||this.run.weapons[0]?.id==='sword';arms.node.active=active;
    this.naturalHands.forEach(hand=>hand.node.active=active);
    if(!active)return;arms.clear();
    this.placeArmBehindHead(arms.node);
    for(let i=0;i<2;i++){
      const side=(i===0?-1:1)*this.facing,wrist=relaxedWrist(side,this.torsoBob,this.handBob,this.walkPhase,this.walkBlend);
      drawHeroSleeve(arms,side,wrist,this.torsoBob,heroFor(this.run).color,this.run.heroId);
      const hand=this.naturalHands[i];if(hand){drawHeroFist(hand,this.run.heroId,side,false);hand.node.setPosition(wrist.x,wrist.y);if(hand.node.getSiblingIndex()!==this.hero.children.length-1)hand.node.setSiblingIndex(this.hero.children.length-1);}
    }
  }

  private createWeapon(side: number): Weapon {
    const limb = this.node2D(this.hero, 'WeaponArm'), arm = limb.addComponent(Graphics);
    const node = this.node2D(this.hero, 'Grip'), shoe = this.node2D(node, 'HeldWeapon'); shoe.addComponent(Graphics);
    node.addComponent(Graphics); // Root remains available for the sword/orbit renderer.
    const fist=this.node2D(node,'GripFist').addComponent(Graphics);drawHeroFist(fist,this.run.heroId,side,true);
    const offhand = this.node2D(limb, 'ThrowingHand'), smallFist = offhand.addComponent(Graphics);
    smallFist.fillColor = new Color('#f2c69c'); smallFist.strokeColor = new Color('#493522'); smallFist.lineWidth = 2;
    smallFist.circle(0, 0, 7); smallFist.fill(); smallFist.stroke(); offhand.active = false;
    const trail = this.node2D(this.hero, 'SwingTrail').addComponent(Graphics);
    return { node, shoe, fist, offhand, arm, trail, time: .38, duration: .38, cooldown: 0, damage: 0, angle: 0, side, hit: new Set(), lastX: 0, lastY: 0 };
  }

  private syncWeapons(): void {
    const uids=new Set(this.run.weapons.map(w=>w.uid));this.friendlyFields=this.friendlyFields.filter(f=>uids.has(f.uid));this.pendingShots=this.pendingShots.filter(s=>uids.has(s.weapon.uid));for(const uid of this.trapHits.keys())if(!uids.has(uid))this.trapHits.delete(uid);
    const old = this.menu.children.find(n => n.name === 'PauseWeapons'); if (old) { old.removeFromParent(); old.destroy(); }
    const bar = this.node2D(this.menu, 'PauseWeapons');
    this.run.weapons.forEach((equipped, i) => {
      const n = this.node2D(bar, 'PauseWeapon' + i); n.setPosition(-130 + i * 52, -253); n.setScale(.65, .65, 1);
      addWeaponIcon(n,this.artFrames,equipped.id,equipped.tier,64);
    });
    this.weapons.forEach((w, i) => {
      for(const blade of w.orbitBlades||[]){blade.removeFromParent();blade.destroy();}w.orbitBlades=[];w.orbitPrevious=undefined;w.orbitHits=new Map();
      w.equipped = this.run.weapons[i]; w.arm.node.active = this.run.weapons.length===1 && (!!w.equipped || i===1); w.trail.node.active = !!w.equipped;
      w.node.getComponent(Graphics)!.clear();w.fist.node.active=this.run.weapons.length===1&&w.equipped?.id!=='sword';
      drawHeroFist(w.fist,this.run.heroId,w.side*this.facing,!!w.equipped);
      w.offhand.active = false; w.trail.clear();w.strikeStarted=false;w.impactPlayed=false; w.node.active=!!w.equipped || (i===1 && this.run.weapons.length===1); w.time = w.duration; w.cooldown = i * .06;
      if (!w.equipped) { w.stats = undefined; w.shoe.active = false; return; }
      w.stats = weaponStatsFor(this.run, w.equipped);
      drawWeaponArt(w.shoe.getComponent(Graphics)!, w.equipped.id, w.equipped.tier);
      const existing=w.shoe.children.find(n=>n.name==='WeaponSprite');if(existing){existing.removeFromParent();existing.destroy();}
      const frame=this.artFrames['weapon-'+w.equipped.id];if(frame){w.shoe.getComponent(Graphics)!.clear();const n=this.node2D(w.shoe,'WeaponSprite'),sp=n.addComponent(Sprite);sp.spriteFrame=frame;sp.sizeMode=Sprite.SizeMode.CUSTOM;n.getComponent(UITransform)!.setContentSize(78,78);n.setPosition(0,18);if(['smg','shotgun','rocket'].indexOf(w.equipped.id)>=0||isExtraWeapon(w.equipped.id))n.angle=45;}
      w.shoe.setPosition(0, 0); w.shoe.active = true;
    });
    for (const w of this.weapons) if (w.equipped) this.updateWeapon(w, 0);
    this.updateFreeHand();this.updateRestingArms();if(this.weaponHud){this.weaponHudKey='';this.drawWeaponHud();}
  }

  /** An empty equipment slot is not a missing arm. Only the first pair are anatomical hands. */
  private updateFreeHand(): void {
    if (!this.presentSubstep||this.run.weapons.length !== 1) return;
    const hand = this.weapons[1], held = this.weapons[0]; if (!hand || !held) return;
    if(held.equipped?.id==='sword'){hand.arm.node.active=false;hand.node.active=false;return;}
    const side=this.facing,wrist=relaxedWrist(side,this.torsoBob,this.handBob,this.walkPhase,this.walkBlend);
    const {x,y}=wrist;
    hand.arm.node.active = true; hand.shoe.active = false; hand.offhand.active = false;
    const g = hand.arm;g.clear();drawHeroSleeve(g,side,wrist,this.torsoBob,heroFor(this.run).color,this.run.heroId);
    if(hand.fist){hand.fist.node.active=true;drawHeroFist(hand.fist,this.run.heroId,side,false);}
    hand.node.setPosition(x, y); hand.node.setScale(.85, .85, 1);
    hand.node.angle = -side*8;
    this.placeArmBehindHead(hand.arm.node);
    if(hand.node.getSiblingIndex()!==this.hero.children.length-1)hand.node.setSiblingIndex(this.hero.children.length-1);
  }

  private updateWeapon(w: Weapon, dt: number): void {
    if (!w.equipped || !w.stats) return;
    if(w.equipped.id==='sword'){this.updateOrbitSword(w,dt);return;}
    if(['star-lamps','wood-ox'].indexOf(w.equipped.id)>=0){this.updateExtraOrbit(w,dt);return;}
    const index = this.weapons.indexOf(w), def = weaponFor(w.equipped.id), melee = def.category === 'melee';
    const oldTime = w.time; w.time = Math.min(w.duration, w.time + dt); const t = w.time / w.duration;
    const side=w.side*this.facing;
    const sway = Math.sin(this.walkPhase + index * 1.3) * this.walkBlend * 3 + Math.sin(this.idleTime * 2 + index) * 1.2;
    const orbit = this.run.weapons.length>1, anchor = orbitAnchor(index,this.run.weapons.length,this.age);
    const idleX = orbit ? anchor.x : side*HERO_ARMS.heldX, idleY = orbit ? anchor.y + this.torsoBob : HERO_ARMS.heldY+this.torsoBob+sway;
    const active = t < 1;
    const extend = active ? Math.sin(t * Math.PI) * (melee ? HERO_ARMS.meleeReach : HERO_ARMS.rangedReach) : 0;
    const sweep = w.angle + (melee ? (t - .45) * w.stats.arc * Math.PI / 180 : 0);
    const hx = idleX + Math.cos(sweep) * extend, hy = idleY + Math.sin(sweep) * extend;
    const arm = w.arm;
    if(this.presentSubstep&&!orbit){arm.clear();drawHeroSleeve(arm,side,{x:hx,y:hy},this.torsoBob,heroFor(this.run).color,this.run.heroId);}
    arm.node.active=!orbit;
    w.node.setPosition(hx, hy); w.node.angle = active ? sweep * 180 / Math.PI - 90 : w.side * -12;
    w.node.setScale(orbit ? .78 : .85,orbit ? .78 : .85,1); const layer=orbit&&anchor.behind?1:this.hero.children.length-1;if(w.node.getSiblingIndex()!==layer)w.node.setSiblingIndex(layer);
    if(!orbit)this.placeArmBehindHead(w.arm.node);
    if(w.fist){w.fist.node.active=!orbit;drawHeroFist(w.fist,this.run.heroId,side,true);}
    if(this.presentSubstep&&melee)w.trail.clear();
    if (this.presentSubstep && melee && t > .2 && t < .7) {
      const r = w.stats.range * .78; w.trail.strokeColor = new Color(255, 238, 182, 165); w.trail.lineWidth = 4;
      for (let i = 0; i <= 8; i++) {
        const a = sweep - .42 + i * .105, x = Math.cos(a) * r, yy = 16 + Math.sin(a) * r;
        if (!i) w.trail.moveTo(x, yy); else w.trail.lineTo(x, yy);
      } w.trail.stroke();
    }
    const release = w.duration * .35;
    if(melee&&isExtraWeapon(w.equipped.id))this.extraMelee(w,oldTime);else if(melee&&oldTime<w.duration*.7&&w.time>=w.duration*.2)this.meleeStrike(w);
    w.offhand.active = false;
    if (w.offhand.active) w.offhand.setPosition(hx - w.side * (14 + extend), hy + 19);
    if (oldTime < release && w.time >= release) {
      if (!melee) {
        const x = this.px + hx, yy = this.py + hy + 15;
        const angle = Math.atan2((w.aimY ?? yy) - yy, (w.aimX ?? x) - x);
        this.releaseWeapon(x,yy,angle,w);
      }
    }
    w.shoe.active = w.equipped.id !== 'sandal' || w.time < release || w.time >= w.duration;
    w.lastX = this.px + hx; w.lastY = this.py + hy;
  }

  private updateOrbitSword(w:Weapon,dt:number):void {
    const stats=w.stats!,equipped=w.equipped!,count=Math.min(6,stats.shotCount||3),radius=stats.range;
    w.orbitBlades=w.orbitBlades||[];w.orbitHits=w.orbitHits||new Map();
    while(w.orbitBlades.length<count){const n=this.node2D(w.node,'OrbitSword');if(!this.battleSprites.add(n,'weapon-sword'))drawWeaponArt(n.addComponent(Graphics),'sword',equipped.tier,true);w.orbitBlades.push(n);}
    while(w.orbitBlades.length>count){const n=w.orbitBlades.pop()!;n.removeFromParent();n.destroy();}
    w.arm.node.active=false;w.offhand.active=false;w.shoe.active=false;
    w.node.setPosition(0,35);w.node.setScale(1,1,1);w.node.angle=0;if(w.node.getSiblingIndex()!==this.hero.children.length-1)w.node.setSiblingIndex(this.hero.children.length-1);
    const trail=w.trail;if(this.presentSubstep)trail.clear();const points=w.orbitPrevious||(w.orbitPrevious=[]);let connected=false;
    for(let i=0;i<count;i++){
      const a=this.age*(stats.orbitSpeed||4.2)+i*Math.PI*2/count+equipped.uid*2.39996;
      const x=Math.cos(a)*radius,y=Math.sin(a)*radius,n=w.orbitBlades[i];n.setPosition(x,y);n.angle=a*180/Math.PI;n.setScale(.88,.88,1);
      const cx=this.px+x,cy=this.py+35+y,previous=points[i]||{x:cx,y:cy};
      // A short, bright cutting arc follows each rigid blade; no soft homing trail.
      if(this.presentSubstep)drawSwordTrail(trail,a,radius,equipped.tier);
      if(dt<=0){previous.x=cx;previous.y=cy;points[i]=previous;continue;}
      for(const e of this.enemies){
        if(e.hp<=0||(e.born||0)>0||(w.orbitHits.get(e)||0)>this.age)continue;
        const center=this.enemyHitCenter(e),large=e.kind==='chief'?1.65:e.kind==='cavalry'?1.2:1;
        const hit=sweepEllipseTime(previous.x-(e.previousHitX??center.x),previous.y-(e.previousHitY??center.y),cx-center.x,cy-center.y,28*large+14,31*large+14);
        if(hit===null)continue;
        w.orbitHits.set(e,this.age+stats.interval/this.commonSkill.hasteMultiplier);connected=true;
        const damage=stats.damage*(Math.random()<stats.crit?stats.critMultiplier:1);
        this.hitEnemy(e,Math.atan2(e.y-this.py,e.x-this.px),damage,stats.knockback,'sword',false);
      }
      previous.x=cx;previous.y=cy;points[i]=previous;
    }
    points.length=count;
    w.orbitPrevious=points;
    for(const [enemy,next]of w.orbitHits)if(enemy.hp<=0||next<this.age-2)w.orbitHits.delete(enemy);
    if(connected)this.playWeaponSound('sword','hit');
  }

  private meleeStrike(w: Weapon,multiplier=1,hitSet=w.hit): void {
    const stats = w.stats!, weaponId = w.equipped!.id;
    if(!w.strikeStarted){this.combatFx.slash(weaponId,this.px,this.py+16,w.angle,stats.range,stats.arc);this.playWeaponSound(weaponId,'attack');w.strikeStarted=true;}
    let hit = false;
    for (const e of this.enemies) {
      if (e.hp <= 0 || (e.born || 0) > 0 || hitSet.has(e)) continue;
      const at=this.enemyHitCenter(e),dx=at.x-this.px,dy=at.y-this.py-16;
      const angle = Math.atan2(dy,dx),radius=e.animal?18:e.kind==='chief'?48:e.kind==='cavalry'?34:26;
      if (sectorHitsCircle(dx,dy,stats.range,w.angle,stats.arc,radius)) {
        hitSet.add(e); hit = true; this.hitEnemy(e, angle, w.damage*multiplier*(weaponId==='ancient-saber'&&(!e.firstHits?.has(w.equipped!.uid)||this.age-(e.firstHits.get(w.equipped!.uid)||0)>=2)?[1.15,1.2,1.25,1.3][w.equipped!.tier-1]:1), stats.knockback, weaponId, false,false,stats.quality);if(weaponId==='ancient-saber'){e.firstHits=e.firstHits||new Map();e.firstHits.set(w.equipped!.uid,this.age);}
      }
    }
    if (hit&&!w.impactPlayed){this.playWeaponSound(weaponId,'hit');w.impactPlayed=true;}
  }

  private launchProjectile(x: number, y: number, angle: number, weapon: EquippedWeapon, stats: WeaponStats, damage: number, secondary = false, group?: {hits:Map<Enemy,number>;max:number}): void {
    let shot = this.projectiles.find(p => p.remaining <= 0);
    if (!shot) {
      if (this.projectiles.length >= 160) return;
      const node = this.node2D(this.world, 'HeroProjectile');if(!this.battleSprites.ready)node.addComponent(Graphics);
      shot = { node, x, y, angle, remaining: 0, damage, weaponId: weapon.id, stats: { ...stats }, hit: new Set() }; this.projectiles.push(shot);
    }
    const artKey=weapon.id+':'+weapon.tier;if(shot.artKey!==artKey){if(this.battleSprites.ready){if(shot.atlasArt)this.battleSprites.set(shot.atlasArt,'weapon-'+weapon.id);else shot.atlasArt=this.battleSprites.add(shot.node,'weapon-'+weapon.id);}else drawWeaponArt(shot.node.getComponent(Graphics)!,weapon.id,weapon.tier,true);shot.artKey=artKey;}
    const scale = weapon.id === 'sandal' || weapon.id === 'firecracker' ? .7 : 1;
    shot.node.setScale(scale, scale, 1); shot.weaponId = weapon.id; shot.stats = { ...stats }; shot.hit.clear();
    shot.returning=weapon.id==='hand-halberd';shot.returnLeg=false;shot.ownerUid=weapon.uid;shot.secondary=secondary;shot.group=group;
    shot.bounceLeft = stats.bounce||0; shot.bounced = false;
    shot.damage = damage; shot.x = x; shot.y = y; shot.angle = angle; shot.remaining = stats.range;
    shot.fxClock = 0;
    shot.node.active = true; shot.node.angle = angle * 180 / Math.PI - 90; shot.node.setPosition(x, y);
    this.playWeaponSound(weapon.id, 'attack');

  }

  private explodeProjectile(shot: Projectile, x: number, y: number, direct?: Enemy): void {
    if(shot.weaponId==='oil-jar'){this.addFriendlyField('oil-jar',shot.ownerUid||0,x,y,shot.stats.area,1.2,shot.damage*.4,shot.stats);shot.remaining=0;return;}
    this.playWeaponSound(shot.weaponId, 'hit');
    this.combatFx.burst(shot.weaponId,x,y,shot.stats.area);
    for (const e of this.enemies) {
      if (e.hp <= 0 || (e.born || 0) > 0) continue;
      const at = this.enemyHitCenter(e);
      if (e === direct || Math.hypot(at.x - x, at.y - y) <= shot.stats.area) {
        if(shot.group){const hits=shot.group.hits.get(e)||0;if(hits>=shot.group.max)continue;shot.group.hits.set(e,hits+1);}
        this.hitEnemy(e, Math.atan2(at.y - y, at.x - x), shot.damage*(e===direct?1:shot.stats.splashFactor||.55), shot.stats.knockback, shot.weaponId, false,!!shot.secondary);
      }
    }
    shot.remaining = 0;
  }

  private updateProjectiles(dt: number): void {
    for (const shot of this.projectiles) {
      if (shot.remaining <= 0) continue;
      const step = Math.min(shot.remaining, shot.stats.speed * dt);
      const nx = shot.x + Math.cos(shot.angle) * step, ny = shot.y + Math.sin(shot.angle) * step;
      const contacts=this.projectileContacts;let contactCount=0;
      for (const e of this.enemies) {
        if (e.hp <= 0 || (e.born || 0) > 0 || shot.hit.has(e)) continue;
        const center = this.enemyHitCenter(e), large = e.kind === 'chief' ? 1.65 : e.kind === 'cavalry' ? 1.2 : 1;
        const t = sweepEllipseTime(shot.x - (e.previousHitX ?? center.x), shot.y - (e.previousHitY ?? center.y), nx - center.x, ny - center.y, 33 * large, 47 * large);
        if(t!==null){const slot=contacts[contactCount]||(contacts[contactCount]={e,t});slot.e=e;slot.t=t;contactCount++;}
      }
      for(let i=1;i<contactCount;i++){const item=contacts[i];let j=i-1;while(j>=0&&contacts[j].t>item.t){contacts[j+1]=contacts[j];j--;}contacts[j+1]=item;}
      shot.remaining = Math.max(0, shot.remaining - step);
      let travel = 1, exploded = false;
      for(let i=0;i<contactCount;i++){const contact=contacts[i];
        const target = contact.e; if (target.hp <= 0) continue;
        if(shot.group && (shot.group.hits.get(target)||0)>=shot.group.max){shot.hit.add(target);continue;}
        if (shot.stats.area > 0) {
          const center = this.enemyHitCenter(target); this.explodeProjectile(shot, center.x, center.y, target);
          exploded = true; travel = contact.t; break;
        }
        if(shot.group)shot.group.hits.set(target,(shot.group.hits.get(target)||0)+1);
        this.hitEnemy(target, shot.angle, Math.max(1, Math.round(shot.damage * (shot.hit.size && !shot.bounced ? shot.stats.pierceFactor||.7 : 1))), shot.stats.knockback, shot.weaponId,true,!!shot.secondary);
        shot.hit.add(target);
        if ((shot.bounceLeft || 0) > 0) {
          const hx = shot.x + (nx - shot.x) * contact.t, hy = shot.y + (ny - shot.y) * contact.t;
          let next:Enemy|undefined,nearest=260*260;for(const e of this.enemies){if(e.hp<=0||(e.born||0)>0||shot.hit.has(e))continue;const d=(e.x-hx)**2+(e.y+34-hy)**2;if(d<nearest){nearest=d;next=e;}}
          if (next) {
            const at = this.enemyHitCenter(next); shot.angle = Math.atan2(at.y - hy, at.x - hx); shot.bounceLeft!--;
            if (!shot.bounced) { shot.damage = Math.max(1, Math.round(shot.damage * (shot.stats.bounceFactor||.6))); shot.bounced = true; }
            shot.remaining = 260; travel = contact.t; break;
          }
        }
        if (shot.hit.size > shot.stats.pierce) { shot.remaining = 0; travel = contact.t; break; }
      }
      shot.x += (nx - shot.x) * travel; shot.y += (ny - shot.y) * travel;
      shot.fxClock=(shot.fxClock||0)+dt;
      if(shot.remaining>0&&shot.fxClock>=.045){this.combatFx.trail(shot.weaponId,shot.x,shot.y,shot.angle);shot.fxClock=0;}
      if (!exploded && shot.remaining === 0 && !contactCount && (shot.weaponId === 'firecracker'||shot.weaponId==='rocket'||shot.weaponId==='oil-jar'||shot.weaponId==='thunder-bomb')) this.explodeProjectile(shot, shot.x, shot.y);
      shot.node.setPosition(shot.x, shot.y);
      if(shot.weaponId==='sandal')shot.node.angle+=dt*780;
      else if(shot.weaponId==='peach'||shot.weaponId==='firecracker')shot.node.angle+=dt*100;
      else shot.node.angle=shot.angle*180/Math.PI-90;
      if(shot.remaining<=0&&shot.returning&&!shot.returnLeg){shot.returnLeg=true;shot.hit.clear();shot.angle=Math.atan2(this.py+24-shot.y,this.px-shot.x);shot.remaining=shot.stats.range;}
      shot.node.active = shot.remaining > 0;
    }
  }

  private drawBirth(e:Enemy,p:number):void {
    if(!e.birthRig){e.birthRig=this.node2D(e.node,'BirthEffect');e.birthRig.setSiblingIndex(0);e.birthSprites=[];
      for(let i=0;i<6;i++){const n=this.node2D(e.birthRig,'BirthPart'+i),sp=this.battleSprites.add(n,i?'birth-dot':'birth-ring');if(sp)e.birthSprites.push(sp);}}
    e.birthRig.active=true;const parts=e.birthSprites!;
    for(let i=0;i<parts.length;i++){const sp=parts[i],n=sp.node.parent!;if(!i){n.setScale((28+p*18)/10,(12+p*8)/10,1);sp.color=BIRTH_RING_TINTS[Math.max(0,Math.min(32,Math.round((1-p)*32)))];}
      else {const a=(i-1)*1.257,r=(3+p*3)/10;n.setPosition(Math.cos(a)*30,Math.sin(a)*12+12*p);n.setScale(r,r,1);sp.color=BIRTH_DOT_TINTS[Math.max(0,Math.min(32,Math.round((1-p)*32)))];}}
  }

  private enemyHitCenter(e: Enemy): { x: number; y: number } {
    const pose = e.art?.node.position;
    const at=e.hitCenter||(e.hitCenter={x:0,y:0});at.x=e.x+(pose?.x??0);at.y=e.y+(e.animal?18:e.kind==='chief'?60:e.kind==='cavalry'?42:34)+(pose?.y??0);return at;
  }

  private createEnemy(index: number): Enemy {
    const node = this.node2D(this.world, `Soldier${index}`);
    const art = this.node2D(node, 'SoldierArt').addComponent(Sprite);
    art.sizeMode = Sprite.SizeMode.CUSTOM;
    art.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0.06);
    art.node.getComponent(UITransform)!.setContentSize(78, 78);
    const e: Enemy = { node, art, weaponKind: 0, direction: 0, walk: 0, attack: -1, attackCooldown: 0, attackAngle: 0,
      text: this.label(node, '', 0, 70, 21, '#b64e2a'),
      x: 0, y: 0, hp: 50, flash: 0, dead: 0, vx: 0, vy: 0, speed: 35 + index * 3, feedback: 0 };
    e.text.node.getComponent(UITransform)!.setContentSize(112,34);e.text.cacheMode=Label.CacheMode.CHAR;
    e.warning = this.node2D(node, 'AttackWarning').addComponent(Graphics); e.warning.node.setSiblingIndex(0);
    e.hp = 0; e.node.active = false; return e;
  }

  private spawnEnemy(e: Enemy, index: number): void {
    let at=spawnPoint(this.px,this.py,e.kind||'soldier',Math.random,this.heading);for(let attempt=0;attempt<10&&this.terrainNodes.some(n=>Math.hypot(n.position.x-at.x,n.position.y-at.y)<85);attempt++)at=spawnPoint(this.px,this.py,e.kind||'soldier',Math.random,this.heading);const point=[at.x,at.y];
    e.rigTint=undefined;e.art.enabled=true;e.art.spriteFrame=null;e.rigParts?.forEach(sp=>sp.node.active=false);
    if(e.birthRig)e.birthRig.active=false;
    e.animal=undefined; e.animalArt && (e.animalArt.node.active=false); e.art.node.active=true; e.farAge=0;
    e.direction = 0; e.walk = 0; e.moving = false; e.chargeHit = false; e.attack = -1;
    e.attackCooldown = initialEnemyCooldown(e.kind || 'soldier', index); e.attackAngle = 0;
    e.weaponKind = Math.random() < 0.5 ? 0 : 1;
    const s = e.kind==='chief'?{hp:chapterFor(e.encounterChapter||this.run.chapter).bossHp,speed:chapterFor(e.encounterChapter||this.run.chapter).bossSpeed,damage:1}:e.archetype?scaledEnemy(e.archetype,e.encounterChapter||this.run.chapter,this.run.wave===1?0:Math.min(3,this.run.wavesCleared+1),this.run.bossEncounter):enemyStats(e.kind || 'soldier', this.run.wave, this.run.survivalSeconds);
    e.x = point[0]; e.y = point[1]; e.hp = s.hp; e.maxHp = s.hp; e.speed = s.speed; e.damage = s.damage; e.bornTotal = e.kind==='chief'?1.5:e.kind==='cavalry'?1.1:.9; e.born=e.bornTotal; e.skill = 0; e.dead = 0; e.flash = 0;e.stagger=0;e.staggerCooldown=0;e.elite=false;e.object=undefined;e.bossTimers=[0,1.4,2.8];e.bossMove=undefined;e.bossNext=0;e.bossAge=0;e.fired=false;e.slowUntil=0;e.slowFactor=0;e.nextCycleUntil=0;e.firstHits=new Map();e.specialCooldown=2.8;e.sidestepLeft=0;
    e.warning?.clear();e.warningDrawn=false;e.visualHit=undefined;
    e.feedback = 0; e.vx = 0; e.vy = 0; e.node.active = true; e.text.string = '';
    e.node.setScale(1, 1, 1); e.art.node.angle = 0; e.art.node.setPosition(0, 0); e.art.node.setScale(1, 1, 1); e.text.node.setScale(1, 1, 1);
    e.node.angle = 0; e.node.setPosition(e.x, e.y);
    const size = e.kind === 'chief' ? 145 : e.kind === 'cavalry' ? 100 : 78;
    e.art.node.getComponent(UITransform)!.setContentSize(size, size);
    e.previousHitX = e.x; e.previousHitY = e.y + 34;
    // A pooled enemy can spawn on a non-presenting physics substep. Initialize its
    // new sprite/rig once now; the birth branch does not otherwise redraw the body.
    this.drawEnemy(e,true);e.art.node.active=false;
  }

  private updateEnemy(e: Enemy, dt: number): void {
    if((e.hp<=0||(e.born||0)<=0)&&e.birthRig)e.birthRig.active=false;
    if (e.hp <= 0) {
      if(e.dead<=0){e.node.active=false;return;}
      e.dead=Math.max(0,e.dead-dt);e.node.active=e.dead>1.15;
      if(!e.node.active)return;
      // 击败后仍沿命中方向滑出，小兵侧倒后消失。
      e.x = this.clamp(e.x + e.vx * dt, -WORLD.halfWidth + 30, WORLD.halfWidth - 30);
      e.y = this.clamp(e.y + e.vy * dt, -WORLD.halfHeight + 20, WORLD.halfHeight - 80);
      e.vx *= Math.exp(-12 * dt); e.vy *= Math.exp(-12 * dt);
      e.node.setPosition(e.x, e.y);
      const collapse = Math.min(1, (1.5 - e.dead) / 0.25);
      e.art.node.angle = (e.vx < 0 ? 1 : -1) * collapse * 75;
      e.art.node.setScale(1 - collapse * 0.15, 1 - collapse * 0.15, 1);
      if(e.warningDrawn){e.warning?.clear();e.warningDrawn=false;}
      return;
    }
    if ((e.born || 0) > 0) {
      e.born = Math.max(0,(e.born||0)-dt); const p=1-e.born/(e.bornTotal||.9), g=e.warning!;
      if(this.presentSubstep&&this.battleSprites.ready)this.drawBirth(e,p);
      else if(this.presentSubstep){g.clear();e.warningDrawn=true;
      g.strokeColor=new Color(211,173,84,Math.round(190*(1-p)));g.lineWidth=2;g.ellipse(0,0,28+p*18,12+p*8);g.stroke();
      g.fillColor=new Color(219,190,119,Math.round((1-p)*140));for(let i=0;i<5;i++){const a=i*1.257;g.circle(Math.cos(a)*30,Math.sin(a)*12+12*p,3+p*3);g.fill();}}
      // Summoned clones/eyes set their final identity after spawnNext; prepare that
      // identity before the first visible birth frame, never after materializing.
      if(!e.animal&&p>.32&&!e.art.node.active)this.drawEnemy(e,true);
      e.art.node.active=!e.animal&&p>.32;if(e.animalArt)e.animalArt.node.active=!!e.animal&&p>.32;e.node.setScale(.75+.25*p,.75+.25*p,1);
      if(e.born===0){e.art.node.active=!e.animal;if(e.warningDrawn){g.clear();e.warningDrawn=false;}e.attackCooldown=Math.max(.2,e.attackCooldown);}
      return;
    }
    if(e.animal){this.updateAnimal(e,dt);return;}
    e.stagger=Math.max(0,(e.stagger||0)-dt);e.staggerCooldown=Math.max(0,(e.staggerCooldown||0)-dt);
    const far=Math.hypot(e.x-this.px,e.y-this.py)>1400;e.farAge=far?(e.farAge||0)+dt:0;
    if((e.farAge||0)>8 && e.kind==='soldier' && e.attack<0){const at=spawnPoint(this.px,this.py,'soldier',Math.random,this.heading);e.x=at.x;e.y=at.y;e.born=.9;e.bornTotal=.9;e.farAge=0;e.node.setPosition(e.x,e.y);return;}
    e.node.setScale(1, 1, 1);
    if(e.archetype||e.kind==='chief'&&e.bossSkin){this.updateChronicleEnemy(e,dt);return;}
    if (e.kind && e.kind !== 'soldier') { this.updateSpecialEnemy(e, dt); return; }
    const aim=this.enemyAim(e),dx=aim.x-e.x,dy=aim.y-e.y,distance=Math.hypot(dx,dy);
    e.moving = false;
    e.attackCooldown = Math.max(0, e.attackCooldown - dt);
    if ((e.stagger||0) > 0) { e.attack = -1; e.attackCooldown = Math.max(e.attackCooldown, 0.3); }
    if (e.attack < 0) {
      if (distance > 1) e.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      if (distance < 66 && e.attackCooldown <= 0 && (e.stagger||0) <= 0) {
        e.attack = 0; e.attackAngle = Math.atan2(dy, dx);
      } else if (distance > 45 && (e.stagger||0) <= 0) {
        e.x += dx / distance * e.speed * dt; e.y += dy / distance * e.speed * dt;
        e.walk += e.speed * dt / 12;
        e.moving = true;
      }
    }
    if (e.attack >= 0) {
      const previous = e.attack; e.attack += dt;
      // 先蓄力0.32秒；出手只判定一次，锁定方向，允许玩家走出攻击扇区。
      if (previous < 0.32 && e.attack >= 0.32 && this.enemyStrikeHits(e)) this.hurtPlayer(e.x, e.y, e.damage);
      if (e.attack >= 0.65) { e.attack = -1; e.attackCooldown = e.weaponKind === 0 ? 0.65 : 0.9; }
    }
    e.x = this.clamp(e.x + e.vx * dt, -WORLD.halfWidth + 30, WORLD.halfWidth - 30); e.y = this.clamp(e.y + e.vy * dt, -WORLD.halfHeight + 20, WORLD.halfHeight - 80);
    e.vx *= Math.exp(-12 * dt); e.vy *= Math.exp(-12 * dt);
    const flashing = e.flash > 0; e.flash = Math.max(0, e.flash - dt);
    if (flashing && e.flash === 0) this.drawEnemy(e);
    e.node.setPosition(e.x, e.y);
    e.feedback = Math.max(0, e.feedback - dt);
    e.text.node.setPosition(0, 65 + (0.45 - e.feedback) * 45);
    const pop = 1 + Math.max(0, e.feedback - 0.25) * 3;
    e.text.node.setScale(pop, pop, 1);
    const hitAge = 0.45 - e.feedback;
    const wobble = e.feedback > 0 ? Math.cos(hitAge * 32) * Math.exp(-hitAge * 10) * 0.08 : 0;
    const idle = Math.sin(this.age * 7 + e.speed) * 0.015;
    e.art.node.setScale((e.direction === 3 ? -1 : 1) * (1 + wobble + idle), 1 - wobble - idle, 1);
    const lunge = e.attack >= 0.32 ? Math.sin(Math.min(1, (e.attack - 0.32) / 0.33) * Math.PI) * 7 : 0;
    e.art.node.setPosition(Math.cos(e.attackAngle) * lunge, Math.sin(e.attackAngle) * lunge);
    this.drawEnemy(e);
    e.art.node.angle = e.feedback > 0 ? Math.sin(hitAge * 32) * Math.exp(-hitAge * 10) * -9 : 0;
    if (e.feedback === 0) e.text.string = '';
  }

  private hitEnemy(e: Enemy, angle: number, damage = this.stats.damage, knockback = weaponStatsFor(this.run, this.run.weapons[0]).knockback, weaponId: WeaponId = this.run.weapons[0].id, audible = true, secondary = false,quality?:Tier): void {
    if (e.hp <= 0||this.victoryPending) return;
    if(e.animal&&e.animal!=='tree') damage *= 1+this.perks.animalDamage;
    else if(!secondary) damage *= 1+(e.kind==='chief'||e.elite?this.perks.elite:0)+(e.hp<e.maxHp!*.3?this.perks.execute:0)+(Math.hypot(e.x-this.px,e.y-this.py)<180?this.perks.close:0);
    damage=this.chronicleDamage(e,angle,damage*this.commonSkill.damageMultiplier,weaponId,quality);
    damage=Math.max(1,Math.round(damage)); e.hp = Math.max(0,e.hp-damage); e.flash = 0.1; e.feedback = 0.45; e.text.string = `-${damage}`; this.hits++;
    const charging = e.kind === 'cavalry' && e.attack >= CAVALRY.windup && e.attack < CAVALRY.windup + CAVALRY.duration;
    if(!e.animal&&e.kind!=='chief'&&!charging&&(e.staggerCooldown||0)<=0){e.stagger=weaponId==='smg'?.018:e.kind==='cavalry'?.025:.07;e.staggerCooldown=e.kind==='cavalry'?.5:.28;}
    if(weaponId==='chain-hook'&&Math.hypot(e.x-this.px,e.y-this.py)>90)angle+=Math.PI;
    const force = knockback * (e.archetype&&archetypeFor(e.archetype).group==='重装'?.55:e.archetype==='E25'?.15:e.archetype&&archetypeFor(e.archetype).group.indexOf('器械')>=0?.1:e.kind === 'chief' ? .06 : e.kind==='cavalry' ? (charging?.10:.35) : 1);
    e.vx = Math.cos(angle) * force; e.vy = Math.sin(angle) * force;
    this.drawEnemy(e);
    this.weaponFreeze = 0.035;
    this.shake = Math.max(this.shake, e.hp <= 0 ? 0.055 : 0);
    const at=this.enemyHitCenter(e);this.combatFx.hit(weaponId,at.x,at.y,angle,e.hp<=0);
    if (audible) this.playWeaponSound(weaponId, 'hit');
    if (e.hp <= 0) {
      if(e.animal){e.dead=1.5; e.art.node.active=false; if(e.animalArt)e.animalArt.node.active=false; this.dropHeart(e.x,e.y,e.animal==='tree'?'peach':'heart'); return;}
      if(!e.object){this.kills++;if(e.kind!=='chief')this.skillCharge=Math.min(this.skillRequirement(),this.skillCharge+1);} e.dead = 1.5; e.text.string = `-${damage}`; e.warning?.clear();
      const reward = e.object?{coins:0,xp:0}:e.kind==='chief'?{coins:Math.round(35*chapterInflation(this.run.chapter)),xp:0}:e.archetype?{coins:archetypeFor(e.archetype).coins,xp:0}:enemyStats(e.kind || 'soldier', this.run.wave, this.run.survivalSeconds);
      if (gainXp(this.run, reward.xp) > 0) this.refreshStats();
      this.run.economyRemainder += reward.coins * (this.perks.income + ((this.run.augments.indexOf('rich') >= 0) ? .3 : 0));
      const extra = Math.floor(this.run.economyRemainder); this.run.economyRemainder -= extra;
      for (let i = 0; i < reward.coins + extra; i++) this.dropCoin(e.x + Math.sin(i * 2.4) * i * 4, e.y + Math.cos(i * 2.4) * i * 4);
      if (!secondary && weaponId === 'peach' && (this.run.augments.indexOf('chain-peach') >= 0 || this.perks.peachChain>0) && this.chainDepth === 0 && this.peachBurstCooldown <= 0) {
        this.peachBurstCooldown = .12; this.chainDepth++;
        const radius=90*(1+Math.min(.5,Math.max(0,this.perks.peachChain-1)*.04)); this.combatFx.burst('peach',e.x,e.y+34,radius);
        for (const other of this.enemies) if (other.hp > 0 && (other.born || 0) <= 0 && Math.hypot(other.x - e.x, other.y - e.y) <= radius) this.hitEnemy(other, Math.atan2(other.y - e.y, other.x - e.x), Math.max(1, Math.round(damage * (this.perks.peachFactor+(this.run.augments.indexOf('chain-peach')>=0&&this.perks.peachChain>0?.1:0)))), knockback * .5, 'peach', false, true);
        this.chainDepth--;
      }
      if (e.kind === 'chief'){this.chiefDead=true;if(this.run.bossEncounter&&!this.testMode)this.victoryPending=true;}
      let kept=0;for(const zone of this.enemyZones)if(zone.source!==e)this.enemyZones[kept++]=zone;this.enemyZones.length=kept;
    }
  }

  private drawCoin(g: Graphics): void {
    g.fillColor = new Color('#efb938'); g.strokeColor = new Color('#97601f'); g.lineWidth = 2;
    g.circle(0, 0, 11); g.fill(); g.stroke();
    g.strokeColor = new Color('#ffe799'); g.lineWidth = 2; g.circle(0, 0, 7.5); g.stroke();
    g.fillColor = new Color('#97601f'); g.rect(-3, -3, 6, 6); g.fill();
  }

  private dropCoin(x: number, y: number): void {
    let coin = this.coins.find(c => !c.active);
    if(!coin&&this.coins.length>=MAX_COIN_NODES){
      let nearest=this.coins[0],distance=Infinity;for(const c of this.coins){const d=(c.x-x)**2+(c.y-y)**2;if(d<distance){distance=d;nearest=c;}}
      nearest.value=(nearest.value||1)+1;return;
    }
    if (!coin) {
      const node = this.node2D(this.world, 'DroppedCoin');
      if(!this.battleSprites.add(node,'coin-shadow')){const shadow=node.addComponent(Graphics);shadow.fillColor=new Color(74,64,24,55);shadow.ellipse(0,-3,10,3);shadow.fill();}
      const art=this.node2D(node,'CopperCoin');if(!this.battleSprites.add(art,'coin'))this.drawCoin(art.addComponent(Graphics));
      coin = { node, art, x, y, age: 0, active: false, attracted: false }; this.coins.push(coin);
    }
    coin.value=1;coin.x = x; coin.y = y; coin.age = 0; coin.active = true; coin.attracted = false;
    coin.node.active = true; coin.node.setPosition(x, y); coin.art.setPosition(0, 0); coin.art.setScale(1, 1, 1);
  }

  private updateCoins(dt: number): void {
    this.coinPulse = Math.max(0, this.coinPulse - dt);
    for (const coin of this.coins) {
      if (!coin.active) continue;
      coin.age += dt;
      const dx = this.px - coin.x, dy = this.py - coin.y, distance = Math.hypot(dx, dy);
      // 先弹出落地，再吸附；吸附锁定后不会因玩家跑开而突然停住。
      if (coin.age >= 0.28 && distance <= this.stats.pickup) coin.attracted = true;
      if (coin.attracted) {
        const step = Math.min(distance, 560 * dt);
        if (distance > 0) { coin.x += dx / distance * step; coin.y += dy / distance * step; }
        if (distance - step <= 14) {
          coin.active = false; coin.node.active = false;this.lastPickupValue=coin.value||1;this.coinTotal+=this.lastPickupValue; this.coinPulse = 0.45;
          this.coinLabel.string = `${this.coinTotal}`;
          continue;
        }
      }
      coin.node.setPosition(coin.x, coin.y);
      const bounce = coin.age < 0.28 ? Math.sin(coin.age / 0.28 * Math.PI) * 26 : 3 + Math.sin(coin.age * 4) * 2;
      coin.art.setPosition(0, bounce);
      coin.art.setScale(0.65 + Math.abs(Math.cos(coin.age * 4)) * 0.35, 1, 1);
    }
    const scale = 1 + this.coinPulse / 0.45 * 0.12;
    this.coinLabel.node.setScale(scale, scale, 1);
    this.pickupText.string = this.coinPulse > 0 ? '+'+this.lastPickupValue : '';
    this.pickupText.node.setPosition(0, 91 + (0.45 - this.coinPulse) * 30);
  }

  private enemyStrikeHits(e: Enemy): boolean {
    const dx=this.px-e.x,dy=this.py-e.y,distance=Math.hypot(dx,dy);
    const reach = e.weaponKind === 0 ? 70 : 78;
    return distance <= reach && (distance < 1 || (dx * Math.cos(e.attackAngle) + dy * Math.sin(e.attackAngle)) / distance >= 0.5);
  }

  private drawEnemy(e: Enemy, initialize=false): void {
    if(!this.presentSubstep&&!initialize)return;
    if((e.born||0)<=0)e.art.node.active=!e.animal;
    const kind = e.kind || 'soldier', cell = enemyAnimationCell(kind, e.direction, e.walk, e.moving !== false, e.attack);
    if(e.archetype||e.bossSkin){this.drawChronicleEnemy(e);return;}
    const frame=kind==='soldier'?this.soldierFrames[e.weaponKind]?.[cell]||null:this.enemyFrames[kind]?.[cell]||null;
    if(e.art.spriteFrame!==frame)e.art.spriteFrame=frame;
    const hit=e.flash>0;if(e.visualHit!==hit){e.art.color=hit?ENEMY_HIT:ENEMY_NORMAL;e.visualHit=hit;}
  }

  private spawnNext(kind: EnemyKind = enemyKind(this.run.wave, Math.random, this.run.survivalSeconds),archetype?:string,encounterChapter?:number): Enemy {
    let e = this.enemies.find(v => v.hp <= 0 && v.dead <= 0);
    if (!e) { e = this.createEnemy(this.enemies.length); this.enemies.push(e); }
    e.kind = kind;e.encounterChapter=encounterChapter;e.archetype=archetype;e.bossSkin=kind==='chief'?chapterFor(encounterChapter||this.run.chapter).bossId:undefined; this.spawnEnemy(e, this.testMode ? Math.floor(Math.random() * 8) : this.spawnSerial++); return e;
  }

  private spawnTestEnemy(): void {
    const bossAlive = this.enemies.some(e => e.hp > 0 && e.kind === 'chief');
    const kinds = TEST_ENEMIES.filter(kind => kind !== 'chief' || !bossAlive);
    this.spawnNext(kinds[Math.floor(Math.random() * kinds.length)]);
  }

  private updateSpecialEnemy(e: Enemy, dt: number): void {
    const aim=this.enemyAim(e),dx=aim.x-e.x,dy=aim.y-e.y,distance=Math.hypot(dx,dy);
    const oldX = e.x, oldY = e.y, kind = e.kind!;
    const boss = kind === 'chief', cavalry = kind === 'cavalry';
    const windup = attackWindup(kind), g = e.warning!;
    if(this.presentSubstep&&e.warningDrawn){g.clear();e.warningDrawn=false;}e.moving=false;
    e.attackCooldown = Math.max(0, e.attackCooldown - dt);
    // A committed shot/cast is not reset by each damage flash. Death still cancels it.
    if (e.attack < 0) {
      e.direction = enemyDirection(dx, dy, e.direction);
      const range = boss ? ZHANGJIAO.range : cavalry ? CAVALRY.range : ARCHER.range;
      let activeSpecial=0;for(const other of this.enemies)if(other!==e&&other.hp>0&&other.kind===kind&&other.attack>=0)activeSpecial++;
      const mayAttack = boss || activeSpecial < (cavalry ? 2 : 4);
      if (distance < range && e.attackCooldown <= 0 && mayAttack) {
        e.attack = 0; e.attackAngle = Math.atan2(dy, dx); e.chargeHit = false;
        if (boss) { e.skill = (e.skill || 0) + 1; this.beginLightning(e); }
      } else if (distance > 1 && (e.stagger||0) <= 0) {
        const direction = boss ? (distance > 230 ? 1 : 0) : cavalry ? (distance > 65 ? 1 : 0) : distance > 290 ? 1 : distance < 165 ? -1 : 0;
        e.x += dx / distance * e.speed * dt * direction; e.y += dy / distance * e.speed * dt * direction;
        if (direction) e.direction = enemyDirection(dx * direction, dy * direction, e.direction);
      }
    }
    if (e.attack >= 0) {
      const previous = e.attack; e.attack += dt;
      e.direction = enemyDirection(Math.cos(e.attackAngle), Math.sin(e.attackAngle), e.direction);
      // Archers only play their brief draw/release animation: no aiming line.
      if(this.presentSubstep&&boss&&e.attack<windup){drawTaoistCast(g,this.age,e.attack/windup);e.warningDrawn=true;}
      if (!boss && !cavalry && previous < windup && e.attack >= windup) this.fireEnemyShot(e, e.attackAngle, ARCHER.speed);
      if (cavalry) {
        const chargeTime = Math.max(0, Math.min(e.attack, windup + CAVALRY.duration) - Math.max(previous, windup));
        if (chargeTime > 0) {
          e.x = this.clamp(e.x + Math.cos(e.attackAngle) * CAVALRY.speed * chargeTime, -WORLD.halfWidth + 35, WORLD.halfWidth - 35);
          e.y = this.clamp(e.y + Math.sin(e.attackAngle) * CAVALRY.speed * chargeTime, -WORLD.halfHeight + 24, WORLD.halfHeight - 85);
          if (!e.chargeHit && sweepEllipseTime(oldX - this.px, oldY - this.py, e.x - this.px, e.y - this.py, 34, 30) !== null) {
            e.chargeHit = true; this.hurtPlayer(e.x, e.y, e.damage);
          }
          if(this.presentSubstep){e.warningDrawn=true;g.fillColor = new Color(173, 139, 87, 105);
          for (let i = 0; i < 3; i++) { const r = 14 + i * 12; g.ellipse(-Math.cos(e.attackAngle) * r, -Math.sin(e.attackAngle) * r, 7 - i, 4); g.fill(); }}
        }
      }
      const duration = cavalry ? CAVALRY.duration + CAVALRY.recovery : boss ? ZHANGJIAO.recovery : ARCHER.recovery;
      if (e.attack >= windup + duration) {
        e.attack = -1;
        e.attackCooldown = boss ? (e.hp < e.maxHp! * .5 ? ZHANGJIAO.enragedCooldown : ZHANGJIAO.cooldown) : cavalry ? CAVALRY.cooldown : ARCHER.cooldown;
      }
    }
    const travel = Math.hypot(e.x - oldX, e.y - oldY);
    e.moving = travel > .0001; e.walk += travel / (cavalry ? 22 : 12);
    e.x = this.clamp(e.x + e.vx * dt, -WORLD.halfWidth + 35, WORLD.halfWidth - 35);
    e.y = this.clamp(e.y + e.vy * dt, -WORLD.halfHeight + 24, WORLD.halfHeight - 85);
    e.vx *= Math.exp(-12 * dt); e.vy *= Math.exp(-12 * dt); e.flash = Math.max(0, e.flash - dt); e.feedback = Math.max(0, e.feedback - dt);
    e.node.setPosition(e.x, e.y);
    const sign = e.direction === 3 ? -1 : 1, step = Math.sin(e.walk * Math.PI);
    const charging = cavalry && e.attack >= windup && e.attack < windup + CAVALRY.duration;
    const gathering = cavalry && e.attack >= 0 && e.attack < windup;
    const brace = gathering ? Math.sin(e.attack / windup * Math.PI * .5) : 0;
    const hit = e.feedback > 0 ? Math.sin((.45 - e.feedback) * 32) * e.feedback * .13 : 0;
    const breath = Math.sin(this.age * 4 + e.speed) * .008;
    const bob = e.moving ? Math.abs(step) * (cavalry ? (charging ? 3 : 1.8) : 1.2) : 0;
    const recoil = !cavalry && e.attack >= windup ? Math.sin(Math.min(1, (e.attack - windup) / (boss ? .4 : .16)) * Math.PI) * (boss ? 3 : 4) : 0;
    e.art.node.setPosition(-Math.cos(e.attackAngle) * (recoil + brace * 5), bob - Math.sin(e.attackAngle) * recoil - brace * 3);
    e.art.node.setScale(sign * (1 + hit + breath + brace * .04), 1 - hit - breath - brace * .06, 1);
    e.art.node.angle = charging ? -7 * sign : gathering ? 5 * sign * brace : e.moving ? step * 1.8 * sign : 0;
    e.text.node.setPosition(0, (boss ? 140 : 90) + (.45 - e.feedback) * 35);
    if (!e.feedback) e.text.string = ''; this.drawEnemy(e);
  }

  private beginLightning(e: Enemy): void {
    const triple = (e.skill || 0) % 2 === 0;
    const nx = -Math.sin(e.attackAngle), ny = Math.cos(e.attackAngle);
    const offsets = triple ? [0, -155, 155] : [0];
    offsets.forEach((offset, i) => {
      if (this.enemyZones.length >= 12) return;
      const radius = triple ? ZHANGJIAO.tripleRadius : ZHANGJIAO.radius;
      // Freeze world positions immediately; the player can leave the marked circles.
      const x = this.clamp(this.px + nx * offset, -WORLD.halfWidth + radius, WORLD.halfWidth - radius);
      const y = this.clamp(this.py + ny * offset, -WORLD.halfHeight + radius, WORLD.halfHeight - radius - 60);
      if (this.enemyZones.some(z => z.source === e && !z.fired && Math.hypot(z.x - x, z.y - y) < radius * 1.4)) return;
      this.enemyZones.push({ source: e, x, y, radius, age: 0, delay: ZHANGJIAO.windup + i * .16, damage: e.damage || 4, fired: false });
    });
  }

  private updateEnemyZones(dt:number):void {
    for(const z of this.enemyZones){if(z.source.hp<=0)continue;z.age+=dt;if(z.age<z.delay)continue;
      if(z.moveX||z.moveY){z.x+=(z.moveX||0)*dt;z.y+=(z.moveY||0)*dt;}
      const due=!z.fired||!!z.duration&&z.age>=(z.tick||0);if(!due)continue;z.fired=true;z.tick=z.age+1.2;
      const dx=this.px-z.x,dy=this.py-z.y,a=z.angle||0,along=dx*Math.cos(a)+dy*Math.sin(a),across=-dx*Math.sin(a)+dy*Math.cos(a);
      const r=Math.hypot(dx,dy),angle=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-a),Math.cos(Math.atan2(dy,dx)-a)));
      const hit=z.shape==='ring'?r>=(z.innerRadius||0)&&r<=z.radius&&angle>=(z.arc||0)*Math.PI/360:z.shape==='sector'?sectorHitsCircle(dx,dy,z.radius,a,z.arc||120,0):z.shape==='line'?Math.abs(along)<=(z.length||260)/2&&Math.abs(across)<=z.radius:r<=z.radius;
      if(hit&&!z.fake)this.hurtPlayer(z.x,z.y,1);if(this.playerHp<=0)break;
    }
    let kept=0;for(const z of this.enemyZones)if(z.source.hp>0&&z.age<z.delay+(z.duration||LIGHTNING_AFTERGLOW))this.enemyZones[kept++]=z;this.enemyZones.length=kept;
  }
  private drawEnemyZones():void {
    this.dangerFx.clear();this.spellFx.clear();
    for(const z of this.enemyZones){if(z.theme==='thunder'&&(!z.shape||z.shape==='circle')){drawLightningSpell(this.dangerFx,this.spellFx,z);continue;}
      const g=z.age<z.delay?this.dangerFx:this.spellFx,warning=z.age<z.delay,progress=Math.min(1,z.age/z.delay),fire=z.theme==='fire';g.lineWidth=warning?2.5:4;g.strokeColor=new Color(z.fake?'#bdac8c':fire?'#f59d49':'#ffce79');g.fillColor=new Color(fire?220:188,fire?75:76,fire?35:92,warning?45+progress*35:75);
      if(z.shape==='ring'){const start=(z.angle||0)+(z.arc||0)*Math.PI/360,sweep=Math.PI*2-(z.arc||0)*Math.PI/180;for(let i=0;i<=40;i++){const b=start+sweep*i/40,x=z.x+Math.cos(b)*z.radius,y=z.y+Math.sin(b)*z.radius;if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}for(let i=40;i>=0;i--){const b=start+sweep*i/40,r=z.innerRadius||0;g.lineTo(z.x+Math.cos(b)*r,z.y+Math.sin(b)*r);}g.close();g.fill();g.stroke();}
      else if(z.shape==='sector'){const a=z.angle||0,arc=(z.arc||120)*Math.PI/180;g.moveTo(z.x,z.y);for(let i=0;i<=24;i++){const b=a-arc/2+arc*i/24;g.lineTo(z.x+Math.cos(b)*z.radius,z.y+Math.sin(b)*z.radius);}g.close();g.fill();g.stroke();}
      else if(z.shape==='line'){const a=z.angle||0,half=(z.length||260)/2,c=Math.cos(a),s=Math.sin(a);for(const [i,j]of [[-1,-1],[1,-1],[1,1],[-1,1]]){const x=z.x+c*half*i-s*z.radius*j,y=z.y+s*half*i+c*z.radius*j;if(i===-1&&j===-1)g.moveTo(x,y);else g.lineTo(x,y);}g.close();g.fill();g.stroke();}
      else {g.circle(z.x,z.y,z.radius);g.fill();g.stroke();g.strokeColor=new Color(z.fake?'#c0b59a':'#ffd68a');g.lineWidth=z.fake?1:3;g.circle(z.x,z.y,z.radius*.82);g.stroke();if(!warning){for(let i=0;i<6;i++){const a=i*Math.PI/3+z.age*2,r=z.radius*.5;g.moveTo(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r);g.lineTo(z.x+Math.cos(a+.3)*z.radius*.8,z.y+Math.sin(a+.3)*z.radius*.8);g.stroke();}}}
    }
  }

  private fireEnemyShot(e: Enemy, angle: number, speed: number): void {
    let shot = this.enemyShots.find(s => s.remaining <= 0);
    if (!shot) {
      if (this.enemyShots.length >= 80) return;
      const node = this.node2D(this.world, 'EnemyArrow');
      if(!this.battleSprites.ready){const g=node.addComponent(Graphics);
      g.strokeColor = new Color('#75472b'); g.lineWidth = 3; g.moveTo(-16, 0); g.lineTo(14, 0); g.stroke();
      g.strokeColor = new Color('#e5cf94'); g.lineWidth = 2; g.moveTo(-15, 0); g.lineTo(-20, 5); g.moveTo(-15, 0); g.lineTo(-20, -5); g.stroke();
      g.fillColor = new Color('#ebc482'); g.strokeColor = new Color('#b0492d'); g.lineWidth = 2;
      g.moveTo(21, 0); g.lineTo(12, 4); g.lineTo(12, -4); g.close(); g.fill(); g.stroke();
      }
      shot = { node, x: 0, y: 0, angle, speed, damage: 10, remaining: 0 }; this.enemyShots.push(shot);
    }
    shot.style=e.archetype||e.bossSkin||'';shot.originX=e.x;shot.originY=e.y;shot.returning=e.bossSkin==='zhurong';
    if(shot.styleKey!==shot.style){
      if(this.battleSprites.ready){
        const n=Number(e.archetype?.slice(1)||0),key=e.bossSkin==='dongzhuo'?'coin':n===31||n===32?'bullet':n===28?'poison':n===17||e.bossSkin==='zhurong'?'knife':n===18?'axe':'arrow';
        if(shot.atlasArt)this.battleSprites.set(shot.atlasArt,'enemy-'+key);else shot.atlasArt=this.battleSprites.add(shot.node,'enemy-'+key);
      }else {const g=shot.node.getComponent(Graphics)!;g.clear();g.lineWidth=2;g.strokeColor=new Color('#6f392b');g.fillColor=new Color('#ffe5af');
      const n=Number(e.archetype?.slice(1)||0);
      if(e.bossSkin==='dongzhuo'){g.fillColor=new Color('#f7c35b');g.circle(0,0,9);g.fill();g.stroke();g.strokeColor=new Color('#a8752e');g.rect(-3,-3,6,6);g.stroke();}
      else if(n===31||n===32){g.strokeColor=new Color('#f2c767');g.lineWidth=3;g.moveTo(-15,0);g.lineTo(0,0);g.stroke();g.fillColor=new Color('#fff0a5');g.ellipse(4,0,8,4);g.fill();}
      else if(n===28){g.fillColor=new Color('#c1d67a');g.circle(2,0,4);g.fill();g.stroke();}
      else if(n===17||e.bossSkin==='zhurong'){g.fillColor=new Color('#e4edf0');g.moveTo(17,0);g.lineTo(-6,6);g.lineTo(-2,0);g.lineTo(-6,-4);g.close();g.fill();g.stroke();g.strokeColor=new Color('#8c4d30');g.lineWidth=4;g.moveTo(-12,0);g.lineTo(-3,0);g.stroke();}
      else if(n===18){g.strokeColor=new Color('#915c35');g.lineWidth=4;g.moveTo(-12,0);g.lineTo(8,0);g.stroke();g.fillColor=new Color('#d7e1de');g.moveTo(5,0);g.lineTo(2,12);g.lineTo(16,8);g.lineTo(16,-8);g.close();g.fill();g.stroke();}
      else {g.moveTo(-18,0);g.lineTo(15,0);g.stroke();g.moveTo(22,0);g.lineTo(11,5);g.lineTo(11,-5);g.close();g.fill();g.stroke();}
      }shot.styleKey=shot.style;
    }
    shot.x = e.x; shot.y = e.y + 24; shot.angle = angle; shot.speed = speed; shot.damage = 1; shot.remaining = e.archetype?archetypeFor(e.archetype).range:650;
    shot.node.active = true; shot.node.angle = angle * 180 / Math.PI; shot.node.setPosition(shot.x, shot.y);
  }

  private updateEnemyShots(dt: number): void {
    for(const s of this.pendingEnemyShots){s.delay-=dt;if(s.delay<=0&&s.source.hp>0)this.fireEnemyShot(s.source,s.angle,s.speed);}let pending=0;for(const s of this.pendingEnemyShots)if(s.delay>0&&s.source.hp>0)this.pendingEnemyShots[pending++]=s;this.pendingEnemyShots.length=pending;
    for (const s of this.enemyShots) {
      if (s.remaining <= 0) continue;
      const travel = Math.min(s.remaining, s.speed * dt), x = s.x + Math.cos(s.angle) * travel, y = s.y + Math.sin(s.angle) * travel;
      if(this.commonSkill.interceptShot(s.x,s.y,x,y,s.style)){s.returning=false;s.remaining=0;}
      else if (sweepEllipseTime(s.x - this.px, s.y - this.py - 24, x - this.px, y - this.py - 24, 23, 29) !== null) {
        const before=this.playerHp;this.hurtPlayer(s.x,s.y-24,1);if(s.style==='E28'&&this.playerHp<before)this.playerSlowUntil=this.age+1;s.returning=false;s.remaining=0;
      } else s.remaining -= travel;
      s.x=x;s.y=y;if(s.remaining<=0&&s.returning){s.returning=false;s.remaining=650;s.angle=Math.atan2((s.originY||0)-s.y,(s.originX||0)-s.x);s.node.angle=s.angle*180/Math.PI;}s.node.setPosition(x,y);s.node.active=s.remaining>0;
      if (this.playerHp <= 0) break;
    }
  }

  private loadWeaponSounds(): void {
    assetManager.loadBundle('sfx', (error, bundle) => {
      if (!this.isValid) return;
      if (error) { console.warn('武器音效分包加载失败', error); return; }
      for (const name of GENERATED_SOUNDS) bundle.load(name, AudioClip, (loadError, clip) => {
        if (!this.isValid) return;
        if (loadError) { console.warn('武器音效加载失败', name, loadError); return; }
        this.clips[name] = clip;
      });
    });
  }

  private loadMusic(): void {
    if (this.musicLoading || this.musicLoaded) return;
    this.musicLoading = true;
    assetManager.loadBundle('music', (error, bundle) => {
      if (!this.isValid) return;
      if (error) { this.musicLoading = false; console.warn('音乐分包加载失败', error); return; }
      bundle.load('taoyuan-kaida', AudioClip, (loadError, clip) => {
        if (!this.isValid) return;
        this.musicLoading = false;
        if (loadError) { console.warn('战斗音乐加载失败', loadError); return; }
        this.musicLoaded = true;
        this.musicSource = this.node2D(this.root, 'BattleMusic').addComponent(AudioSource);
        this.musicSource.playOnAwake = false; this.musicSource.clip = clip;
        if (DEBUG) this.musicSource.node.on(AudioSource.EventType.STARTED, () => {
          console.info('[music] 桃园开打 started', this.musicSource!.currentTime.toFixed(2), 'duration', this.musicSource!.duration);
        });
        this.music.attach(this.musicSource);
      });
    });
  }
  private unlockAudio(): void { this.audioUnlocked = true; this.music.unlock(); }

  private playWeaponSound(weapon: WeaponId, event: SoundEvent): void {
    const name = weaponSound(weapon, event);
    if (name) this.playSound(name, SOUND_CUES[name].volume);
  }
  private playSound(name: SoundId, volume: number, priority: number = SOUND_CUES[name].priority): void {
    const clip = this.clips[name];
    if (!this.audioUnlocked || this.muted || !clip || !this.soundSources.length) return;
    const index = this.soundGate.acquire(name, priority); if (index === undefined) return;
    const source = this.soundSources[index];
    source.stop(); source.clip = clip; source.volume = volume; source.play();
  }
  private stopSounds(): void { for (const source of this.soundSources) source.stop(); this.soundGate.reset(); }
  private onBackground(): void { this.health?.record('background');this.backgrounded = true; this.clearInput(); this.stopSounds(); this.music.pause(); if (this.phase === 'battle') { this.paused = true; this.drawStick(); this.menu.active = true; } }
  private onForeground(): void {
    this.backgrounded = false;this.health?.record('foreground');
    if(this.trainingMode&&this.trainingPanel?.root.active){this.paused=false;this.menu.active=false;this.music.resume();}
    else if(this.phase==='shop'&&!this.paused)this.music.resume();
    else if (this.paused || this.phase !== 'battle') { this.music.pause(); this.stopSounds(); }
  }

  private updateEffects(dt: number): void {
    this.shake = Math.max(0, this.shake - dt);
    const intensity = Math.min(1, this.shake / 0.055) * 1.2;
    // 只震动战场层，摇杆和UI保持稳定，触摸坐标不受影响。
    this.world.setPosition(Math.sin(this.age * 170) * intensity, Math.cos(this.age * 135) * intensity * 0.65);
    this.fx.node.setPosition(this.world.position);
    this.dangerFx.node.setPosition(this.world.position); this.spellFx.node.setPosition(this.world.position); this.drawEnemyZones();
    this.friendlyGroundFx.node.setPosition(this.world.position);
    this.fx.clear(); this.friendlyGroundFx.clear();
    for(const f of this.friendlyFields){const g=this.friendlyGroundFx;g.fillColor=new Color(f.id==='oil-jar'?230:77,f.id==='oil-jar'?111:163,f.id==='oil-jar'?40:122,45);g.strokeColor=new Color(f.id==='oil-jar'?'#f1ab60':'#9cdbac');g.lineWidth=2;g.circle(f.x,f.y,f.radius);g.fill();g.stroke();if(f.id==='caltrops'){g.moveTo(f.x-8,f.y-5);g.lineTo(f.x,f.y+12);g.lineTo(f.x+8,f.y-5);g.stroke();}}
    this.commonEffects.draw(this.friendlyGroundFx,this.fx,this.cameraX,this.cameraY,this.halfWidth,this.halfHeight,this.px,this.py);
    this.combatFx.draw(this.friendlyGroundFx,this.fx,this.cameraX,this.cameraY,this.halfWidth,this.halfHeight,true);
    this.particleSprites.draw(this.combatFx.particles,this.cameraX,this.cameraY,this.halfWidth,this.halfHeight);
    for(const shot of this.projectiles)if(shot.remaining>0 && Math.abs(shot.x-this.cameraX)<this.halfWidth+80 && Math.abs(shot.y-this.cameraY)<this.halfHeight+80)
      this.combatFx.flight(this.fx,shot.weaponId,shot.x,shot.y,shot.angle);
  }

  private localPoint(event: EventTouch): Vec3 {
    // getUILocation 是左下角原点的 UI 坐标，不能直接当作世界坐标。
    // 使用摄像机投影，兼容居中的 Canvas、屏幕比例和像素比。
    const p = event.getLocation();
    const world = this.camera.screenToWorld(new Vec3(p.x, p.y, 0));
    return this.root.getComponent(UITransform)!.convertToNodeSpaceAR(world);
  }
  private touchStart(event: EventTouch): void {
    if (this.touchId !== null || this.paused || this.trainingPanel?.root.active || this.playerHp <= 0 || this.phase !== 'battle') return;
    const p = this.localPoint(event);
    if (Math.abs(p.x) > this.halfWidth || Math.abs(p.y) > this.halfHeight) return;
    const center=joystickCenter(this.halfWidth,this.halfHeight);
    if(Math.hypot(p.x-center.x,p.y-center.y)>JOYSTICK.activation)return;
    this.unlockAudio();
    this.touchId=event.getID();this.origin=center;
    this.stick=joystickVector(p.x-center.x,p.y-center.y);this.drawStick();
  }
  private touchMove(event: EventTouch): void {
    if (event.getID() !== this.touchId) return;
    const p = this.localPoint(event);
    this.stick=joystickVector(p.x-this.origin.x,p.y-this.origin.y);this.drawStick();
  }
  private touchEnd(event: EventTouch): void { if (event.getID() === this.touchId) this.clearTouch(); }
  private keyDown(event: EventKeyboard): void {
    this.unlockAudio();
    if (!this.muted && this.clips['sandal-hit-pcm']) this.soundButton.string = '音效：开启';
    if (this.paused || this.phase !== 'battle') return;
    if(event.keyCode===32 || event.keyCode===69){this.castSkill();return;}
    if ([KeyCode.KEY_W, KeyCode.KEY_A, KeyCode.KEY_S, KeyCode.KEY_D,
      KeyCode.ARROW_UP, KeyCode.ARROW_LEFT, KeyCode.ARROW_DOWN, KeyCode.ARROW_RIGHT].indexOf(event.keyCode) !== -1) {
      this.keys.add(event.keyCode);
    }
  }
  private keyUp(event: EventKeyboard): void { this.keys.delete(event.keyCode); }
  private clearTouch(): void { this.touchId = null; this.stick = { x: 0, y: 0 }; if (this.joystick) this.drawStick(); }
  private clearInput(): void { this.keys.clear(); this.clearTouch(); }
  private drawStick(): void {
    const g=this.joystick;g.clear();
    g.node.active=this.phase==='battle'&&!this.paused&&!this.trainingPanel?.root.active;
    if(!g.node.active)return;
    const active=this.touchId!==null,center=joystickCenter(this.halfWidth,this.halfHeight);this.origin=center;
    const {x,y}=center;
    g.fillColor=new Color(34,52,38,active?130:90);g.circle(x,y,JOYSTICK.radius);g.fill();
    g.strokeColor=new Color(245,225,177,active?190:105);g.lineWidth=2;g.circle(x,y,JOYSTICK.radius);g.stroke();
    g.strokeColor=new Color(154,185,122,active?145:65);g.lineWidth=1;g.circle(x,y,JOYSTICK.radius*.88);g.stroke();
    for(let i=0;i<4;i++){const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a),r=JOYSTICK.radius*.76;g.fillColor=new Color(243,229,195,active?160:95);
      g.moveTo(x+c*(r+5),y+s*(r+5));g.lineTo(x+c*(r-3)-s*4,y+s*(r-3)+c*4);g.lineTo(x+c*(r-3)+s*4,y+s*(r-3)-c*4);g.close();g.fill();}
    const kx=x+this.stick.x*JOYSTICK.travel,ky=y+this.stick.y*JOYSTICK.travel;
    g.fillColor=new Color(28,43,31,90);g.circle(kx+2,ky-4,JOYSTICK.knob+2);g.fill();
    g.fillColor=new Color(active?'#d9e5ba':'#d3d8b9');g.strokeColor=new Color('#fff0c8');g.lineWidth=2;g.circle(kx,ky,JOYSTICK.knob);g.fill();g.stroke();
    g.strokeColor=new Color('#99ad7c');g.lineWidth=2;g.circle(kx,ky,JOYSTICK.knob*.76);g.stroke();
  }
  private layoutBattlefield(): void {
    const size = view.getVisibleSize();
    const hw = size.width / 2, hh = size.height / 2;
    if (this.layoutReady && this.halfWidth === hw && this.halfHeight === hh) return;
    this.layoutReady = true;
    this.halfWidth = hw; this.halfHeight = hh;resizeWorld(size.width,size.height);
    this.root.getComponent(UITransform)!.setContentSize(size.width, size.height);
    this.statusPanel.setPosition(-hw + 32, hh - 25);
    this.hud.node.setPosition(0, hh - 42);
    // Left status card is 305 wide; leave a 16px gap before the 48px pause circle.
    this.pauseLabel.node.parent!.setPosition(-hw + 32 + 305 + 16 + 24, hh - 25 - 56);
    this.trainingButton?.node.parent!.setPosition(hw-134,hh-160);this.trainingPanel?.resize(size.width,size.height);
    this.bossLabel.node.setPosition(0,hh-86); this.skillButton.setPosition(hw-100,joystickCenter(hw,hh).y); this.weaponHud.setPosition(0,-hh+96); this.hintText.node.setPosition(0,-hh+148);
    this.screens?.resize(size.width, size.height);
    this.loadingView?.resize(size.width,size.height);
    this.origin=joystickCenter(hw,hh);this.clearInput();
    this.rebuildMeadow();
  }

  private setBattleHudVisible(visible:boolean):void {
    if(this.trainingButton)this.trainingButton.node.parent!.active=visible&&this.trainingMode;
    this.statusPanel.active=visible;this.hud.node.active=visible;this.xpBar.node.active=false;
    this.skillButton.active=visible;this.weaponHud.active=visible;this.hintText.node.active=visible;this.difficultyLabel.node.active=visible;
    this.bossBar.node.active=visible;this.bossLabel.node.active=visible;this.pauseLabel.node.parent!.active=visible;
  }

  private setBattleVisible(visible: boolean): void {
    this.ground.node.active=visible;this.dangerFx.node.active=visible;this.spellFx.node.active=visible;this.world.active=visible;this.fx.node.active=visible;this.battlefield.active=visible;
    this.setBattleHudVisible(visible);this.menu.active=false;this.clearInput();
  }

  private showMainMenu(): void {
    if (!this.ready) return;
    this.trainingPanel?.hide();this.trainingMode=false;
    this.phase = 'menu'; this.testMode = false; this.paused = false; this.stopSounds(); this.clearBattle(); this.setBattleVisible(false);
    this.screens.menu(this.run.heroId,(id,skill)=>{
      if(this.phase!=='menu')return;
      this.unlockAudio();this.run=createRun(id,starterFor(id),skill);this.restart(false);
    },()=>this.screens.codex(()=>this.showMainMenu()),this.run.skillId,(id,skill)=>this.startTraining(id,skill));
  }

  private startTraining(id:HeroId,skill:string):void {
    if(this.phase!=='menu')return;
    this.trainingMode=true;this.unlockAudio();this.run=createRun(id,starterFor(id),skill);this.restart(true);this.openTrainingPanel();
  }
  private trainingAlive():number {return this.enemies.filter(e=>e.hp>0&&!e.animal).length;}
  private openTrainingPanel():void {
    if(!this.trainingMode||this.phase!=='battle')return;
    if(this.paused){this.paused=false;this.music.resume();}
    if(!this.trainingPanel)this.trainingPanel=new TrainingView(this.ui,this.artFrames,{
      snapshot:()=>({weapons:this.run.weapons,skillId:this.run.skillId,alive:this.trainingAlive()}),
      spawn:(id,count,boss)=>this.addTrainingEnemies(id,count,boss),
      equip:(id,tier,slot)=>this.equipTrainingWeapon(id,tier,slot),
      remove:slot=>{
        if(!this.trainingMode||!Number.isInteger(slot)||!this.run.weapons[slot]||this.run.weapons.length<=1)return '至少保留一把武器';
        this.run.weapons.splice(slot,1);this.syncWeapons();this.refreshStats();return '武器已卸下';
      },
      skill:id=>{
        if(!this.trainingMode||!COMMON_SKILLS.some(s=>s.id===id))return '技能不存在';
        this.commonSkill.reset();this.run.skillId=id;this.run.skillHealChapter=0;this.skillCharge=this.skillRequirement();this.skillDrawKey='';this.drawSkillButton();return '已装配 '+commonSkillFor(id).name;
      },
      clear:()=>{if(!this.trainingMode)return '';this.clearBattle(true);this.syncWeapons();this.drawProgress();return '战场已清空，装备保留';},
      refill:()=>{if(!this.trainingMode)return '';this.skillCharge=this.skillRequirement();this.run.skillHealChapter=0;this.skillDrawKey='';this.drawSkillButton();return '主动技能已就绪';},
      close:()=>{if(!this.trainingMode)return;this.trainingPanel?.hide();this.setBattleHudVisible(true);this.clearInput();},
      exit:()=>this.showMainMenu(),
    });
    this.trainingPanel.resize(this.halfWidth*2,this.halfHeight*2);this.trainingPanel.show();this.menu.active=false;this.setBattleHudVisible(false);this.clearInput();
  }
  private addTrainingEnemies(id:string,count:number,boss:boolean):string {
    if(!this.trainingMode||!Number.isInteger(count)||count<1||count>80)return '数量需在1至80之间';
    const chapter=boss?CHAPTERS.find(c=>String(c.id)===id):undefined,d=boss?undefined:CHRONICLE_ENEMIES.find(e=>e.id===id);
    if(boss?!chapter:!d)return '目标不存在';
    const amount=Math.min(count,80-this.trainingAlive());
    for(let i=0;i<amount;i++)this.spawnNext(boss?'chief':d!.kind,boss?undefined:d!.id,chapter?.id);
    this.drawProgress();return amount?`已加入 ${chapter?.boss||d!.name} ×${amount}`:'战场已满（80名），请先清空或击败敌军';
  }
  private equipTrainingWeapon(id:string,tier:Tier,slot:number):string {
    const d=WEAPONS.find(w=>w.id===id);
    if(!this.trainingMode||!d||[1,2,3,4].indexOf(tier)<0||!Number.isInteger(slot)||slot<0||slot>5||slot>this.run.weapons.length)return '请选择有效的武器、品级和装备槽';
    const weapon={id:d.id,tier,uid:this.run.nextWeaponUid++};
    if(slot<this.run.weapons.length)this.run.weapons[slot]=weapon;else this.run.weapons.push(weapon);
    this.syncWeapons();this.refreshStats();this.drawWeaponHud();return `已装备 ${d.name} · ${['I','II','III','IV'][tier-1]}`;
  }

  private restart(testMode = this.testMode): void {
    const id = this.run.heroId, starter = this.run.starter;
    this.testMode = testMode; this.run = createRun(id,starter,this.run.skillId);
    if (testMode) this.run.wave = 2;
    this.stats = this.currentStats(); this.playerHp = this.stats.maxHp;
    this.kills = 0; this.hits = 0; this.roundKills = 0; this.chiefDead = false;
    this.applyHeroPresentation();
    this.avatar.spriteFrame = this.artFrames['hero-select-'+id]||this.artFrames[id]; this.heroName.string = heroFor(this.run).name;
    this.syncWeapons();
    this.updateOrnaments(); this.startWave();this.chapterEntry=this.savePoint();this.saveCheckpoint('battle');
  }

  private clearBattle(keepMusic=false): void {
    this.victoryPending=false;this.depthNodes.length=0;
    this.coins.forEach(c => { c.active = false; c.node.active = false; });
    this.projectiles.forEach(p => { p.remaining = 0; p.node.active = false; });
    this.enemyShots.forEach(p => { p.remaining = 0; p.node.active = false; });
    this.enemies.forEach(e => { e.hp = 0; e.dead = 0; e.node.active = false; if(e.birthRig)e.birthRig.active=false;e.warning?.clear(); });
    this.commonSkill.reset();this.combatFx.clear(); this.particleSprites.clear(); this.fx.clear(); this.friendlyGroundFx.clear();
    this.enemyZones = []; this.dangerFx.clear(); this.spellFx.clear();
    this.stopSounds(); if(!keepMusic)this.music.stop(); this.weaponFreeze = 0; this.shake = 0; this.world.setPosition(0, 0);
    this.hurtTime=0;this.protectionTime=0;this.tintHero('#ffffff');this.hurtText.string='';
    this.hearts.forEach(h=>{h.active=false;h.node.active=false;});this.gourdCasts=[];this.weaponHudKey='';this.difficultyNotice=0;this.difficultyLabel.string='';
    this.playerSlowUntil=0;this.pendingEnemyShots=[];this.formationUntil=0;this.oilHits.clear();this.trapHits.clear();this.friendlyFields=[];this.pendingShots=[];
    this.clearInput();
  }

  private startWave(): void {
    this.clearBattle(); this.phase = 'battle'; this.paused = false; this.screens.hide(); this.setBattleVisible(true);
    this.px = 0; this.py = 0; this.cameraX=0;this.cameraY=0;this.skillCharge=this.skillRequirement();this.animalClock=25+Math.random()*15;this.treeClock=8+Math.random()*4; this.hero.setPosition(0, 0); this.cooldown = .1;
    this.hurtTime = 0; this.regenCharge = 0; this.idleTime = 0; this.playerVx = 0; this.playerVy = 0; this.hero.angle = 0; this.tintHero('#ffffff'); this.hurtText.string = '';
    this.coinPulse = 0; this.coinLabel.string = `${this.coinTotal}`; this.coinLabel.node.setScale(1, 1, 1); this.pickupText.string = '';
    this.walkPhase = 0; this.walkBlend = 0; this.lean = 0; this.torsoBob = 0;
    this.animateWalk(0,0,0,0,0);
    this.syncWeapons();
    this.weapons.forEach(w => { w.hit.clear(); w.trail.clear(); });
    this.remaining = WAVE_SECONDS; this.roundKills = this.kills;
    this.resumeCountdown = 0; this.respite = 0;
    if (this.run.wave === 2) { this.nextSupply = 30; this.nextEvent = 90; this.queuedKind = 'soldier'; }
    this.cleaverCounter = 0;
    if(this.trainingMode){this.spawnClock=Infinity;}else if (this.testMode) {
      this.spawnClock = TEST_SPAWN.interval;
      // All types appear immediately; subsequent types and spawn edges are random.
      for (const kind of randomSample(TEST_ENEMIES, TEST_ENEMIES.length)) this.spawnNext(kind);
      for (let i = 0; i < 2; i++) this.spawnTestEnemy();
    } else {
      this.spawnClock = waveRule(this.run.wave).interval;
      for (let i = 0; i < waveRule(this.run.wave).initial; i++) this.spawnNext();

      this.bestWave = Math.max(this.bestWave, this.run.wave);
      try { sys.localStorage.setItem('taoyuan-best', String(this.bestWave)); } catch (_) { /* optional */ }
    }
    this.drawPlayerHealth(); this.drawProgress(); this.music.begin();
  }

  private collectAllCoins(): void {
    for(const c of this.coins)if(c.active)this.coinTotal+=c.value||1;
    this.coins.forEach(c => { c.active = false; c.node.active = false; });
    this.coinLabel.string = String(this.coinTotal);
  }

  private pushNearbyEnemies(): void {
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - this.px, dy = e.y - this.py, d = Math.hypot(dx, dy);
      if (d < 125 && !(e.kind === 'cavalry' && e.attack >= 0)) { e.vx = (d > .001 ? dx / d : 1) * 340; e.vy = (d > .001 ? dy / d : 0) * 340; }
    }
  }

  private finishWave(): void {
    if(this.phase!=='battle'||this.run.wave!==1)return;
    if(this.run.chapter>1){this.run.wave=2;this.nextSupply=this.run.survivalSeconds+30;this.spawnClock=.8;this.protectionTime=.8;return;}
    this.collectAllCoins();this.coinTotal+=stipendFor(this.run);this.coinLabel.string=String(this.coinTotal);this.playerHp=5;
    // Freeze the existing battlefield for preparation before increasing difficulty.
    this.run.supplyMode='departure';this.run.supplyCount=0;this.run.purchasedOffers=[];this.run.rerolls=0;
    this.clearInput();this.stopSounds();this.refreshStats();rollSupply(this.run);this.showShop();
  }

  private openSupply(): void {
    if (this.phase !== 'battle' || this.run.wave !== 2||this.run.bossEncounter) return;
    this.collectAllCoins(); const stipend=this.stats.stipend+this.run.economyRemainder,paid=Math.floor(stipend);this.run.economyRemainder=stipend-paid;this.coinTotal += Math.round(12*Math.sqrt(chapterInflation(this.run.chapter)))+paid;
    this.run.supplyCount++;
    this.run.wavesCleared=Math.min(BOSS_EVERY_WAVES,this.run.wavesCleared+1);
    this.run.supplyMode = this.run.wavesCleared === 3 ? 'major' : 'normal';
    this.run.purchasedOffers = []; this.run.rerolls = 0;
    this.clearInput(); this.stopSounds(); rollSupply(this.run); this.showShop();
  }

  private showUpgradesOrShop(): void { this.showShop(); }

  private resumeSupply(notice: string): void {
    if(this.phase!=='shop')return;
    this.unlockAudio();
    if(this.run.chapterShop){this.run.chapterShop=false;this.remaining=15;this.run.wave=1;this.chapterEntry=this.savePoint();}
    else if (this.run.supplyMode === 'departure') {
      // Continue in place: no spawn reset, teleport or free weapon.
      this.run.wave=2;this.run.survivalSeconds=0;this.run.wavesCleared=0;this.run.bossEncounter=false;this.run.supplyMode='normal';this.nextSupply=SUPPLY_SECONDS;this.nextEvent=BOSS_EVERY_WAVES*SUPPLY_SECONDS;this.queuedKind='soldier';
      this.difficultyNotice=0;this.difficultyLabel.string='';this.spawnClock=Math.min(this.spawnClock,1.2);
    } else {
      if(bossDue(this.run.wavesCleared))this.beginBossEncounter();
      else this.nextSupply += SUPPLY_SECONDS;
    }
    this.refreshStats(); this.syncWeapons(); this.screens.hide(); this.phase = 'battle'; this.paused = false; this.setBattleVisible(true);
    this.powerNotice = notice; this.resumeCountdown = 1.2; this.protectionTime = Math.max(1.2, this.protectionTime); this.respite = 8;
    this.pushNearbyEnemies(); this.clearInput(); this.drawProgress();this.saveCheckpoint('battle');
  }

  private beginBossEncounter():void {
    if(this.run.bossEncounter)return;
    this.run.bossEncounter=true;this.nextSupply=Infinity;
    // Zhang Jiao joins the existing battlefield; surviving minions and their attacks remain.
    if(!this.enemies.some(e=>e.hp>0&&e.kind==='chief'))this.spawnNext('chief');
    this.difficultyNotice=2.6;this.difficultyLabel.string=chapterFor(this.run.chapter).boss+'来袭';
  }

  private finishVictory():boolean {
    if(!this.victoryPending||this.phase!=='battle')return false;
    if(this.run.chapter<CHAPTERS.length)this.completeChapter();else this.endRun(true);return true;
  }

  private refreshStats(): void {
    this.perks=passiveBonuses(this.run.inventory);
    const previous = this.stats.maxHp; this.stats = this.currentStats();
    this.playerHp = Math.min(this.stats.maxHp, this.playerHp + Math.max(0, this.stats.maxHp - previous));
    this.drawPlayerHealth(); this.updateOrnaments();
    this.weapons.forEach(w => { if (w.equipped) w.stats = weaponStatsFor(this.run, w.equipped); });
  }

  private currentStats(): Stats {
    const stats = statsFor(this.run);
    if (this.testMode&&!this.trainingMode) stats.maxHp = TEST_HP;
    return stats;
  }

  private showShop(): void {
    this.phase = 'shop';this.clearInput();this.setBattleHudVisible(false);this.menu.active=false;this.coinLabel.string=String(this.coinTotal);this.saveCheckpoint('shop');
    this.screens.supply(this.run, (id,replaceUid) => {
      if (this.phase !== 'shop') return;
      if (buySupply(this.run, id, replaceUid)) {
        this.refreshStats(); this.syncWeapons(); repairSupply(this.run); this.showShop();
      }
    }, () => { if (this.phase === 'shop' && rerollSupply(this.run)) this.showShop(); }, () => {
      if (this.phase === 'shop') this.resumeSupply('准备迎敌');
    }, () => {
      if (this.phase !== 'shop' || this.run.supplyMode !== 'major') return;
      this.run.supplyMode = 'normal'; rollSupply(this.run); this.showShop();
    }, (action, uid) => {
      if (this.phase !== 'shop') return;
      if (action === 'combine' ? combineWeapon(this.run, uid) : recycleWeapon(this.run, uid)) { repairSupply(this.run); this.refreshStats(); this.syncWeapons(); this.showShop(); }
    });
  }

  private endRun(won: boolean): void {
    if (this.phase !== 'battle'||this.trainingMode) return;
    this.phase = won?'victory':'defeat'; this.collectAllCoins();
    const elapsed=this.run.elapsed;
    const record=won&&!this.testMode&&(!this.bestClear||elapsed<this.bestClear);
    if(record){this.bestClear=elapsed;try{sys.localStorage.setItem('taoyuan-chronicle-clear-best-v4',String(this.bestClear));}catch(_){} }
    if(won){try{sys.localStorage.removeItem(SAVE_KEY);}catch(_){}}else if(this.chapterEntry){this.savedPoint=copyPoint(this.chapterEntry);this.savedPoint.run.elapsed=Math.max(this.savedPoint.run.elapsed,this.run.elapsed);this.savedPoint.run.retries=(this.run.retries||0)+1;this.writeSave('battle',this.savedPoint);}
    this.clearBattle(); this.setBattleVisible(false); this.paused = false;
    this.screens.survivalResult(this.run,this.kills,this.bestClear,record,()=>won?this.restart():this.retryChapter(),()=>this.showMainMenu(),this.testMode,WAVE_SECONDS-this.remaining,won);
  }

  private updateOrnaments(): void {
    this.ornaments.forEach(n => { n.removeFromParent(); n.destroy(); }); this.ornaments = [];
    this.run.acquired.slice(-3).forEach((id, order) => {
      const index = ITEMS.findIndex(i => i.id === id), item = ITEMS[index];
      if(!item) return;
      const n = this.node2D(this.hero, 'Equipped-' + id), sprite = n.addComponent(Sprite);
      sprite.spriteFrame = this.itemFrames[index] || this.artFrames['ui-power']; sprite.sizeMode = Sprite.SizeMode.CUSTOM; n.getComponent(UITransform)!.setContentSize(25, 25);
      n.setPosition(item.slot === 'head' ? (order - 1) * 24 : item.slot === 'feet' ? 17 : (order - 1) * 24, item.slot === 'head' ? 87 : item.slot === 'feet' ? -15 : item.slot === 'back' ? 10 : -2);
      this.ornaments.push(n);
    });
  }

  private drawProgress(): void {
    this.hud.string=this.trainingMode?`演武场 · 敌军 ${this.trainingAlive()}`:this.testMode?'测试模式 · 不限时':this.run.wave===1?`战斗  ${Math.ceil(this.remaining)}s`:this.run.bossEncounter?`首领战 · ${chapterFor(this.run.chapter).boss}  ${clockText(Math.max(0,this.run.chapterTime-WAVE_SECONDS-BOSS_EVERY_WAVES*SUPPLY_SECONDS))}`:`战斗  ${Math.ceil(Math.max(0,this.nextSupply-this.run.survivalSeconds))}s`;
    this.heroName.string = heroFor(this.run).name;
    this.xpBar.node.active=false;this.drawSkillButton();
    const boss = this.enemies.find(e => e.kind === 'chief' && e.hp > 0);
    const bossKey=`${boss?.hp||0}:${boss?.maxHp||0}:${boss?.encounterChapter||this.run.chapter}:${this.halfHeight}`;
    if(bossKey===this.bossDrawKey)return;this.bossDrawKey=bossKey;this.bossBar.clear();
    this.bossLabel.string = boss ? `${chapterFor(boss.encounterChapter||this.run.chapter).boss}  ${Math.ceil(boss.hp)}/${boss.maxHp}` : '';
    if (boss) {
      this.bossBar.fillColor = new Color('#63483a'); this.bossBar.rect(-180, this.halfHeight - 111, 360, 12); this.bossBar.fill();
      this.bossBar.fillColor = new Color('#d97745'); this.bossBar.rect(-180, this.halfHeight - 111, 360 * boss.hp / boss.maxHp!, 12); this.bossBar.fill();
    }
  }
  private followCamera(dt: number): void {
    const at=cameraTarget(this.px,this.py,this.halfWidth,this.halfHeight), blend=1-Math.exp(-10*dt);
    this.cameraX+=(at.x-this.cameraX)*blend;this.cameraY+=(at.y-this.cameraY)*blend;
    this.battlefield.setPosition(-this.cameraX,-this.cameraY);
    this.terrainNodes.forEach(n=>{n.active=Math.abs(n.position.x-this.cameraX)<this.halfWidth+230 && Math.abs(n.position.y-this.cameraY)<this.halfHeight+280;});
  }

  private drawTerrainFallback():void {
    const g=this.ground;g.clear();
    if(!this.artFrames['world-ground']){g.fillColor=new Color('#b7ca8f');g.rect(-WORLD.halfWidth,-WORLD.halfHeight,WORLD.width,WORLD.height);g.fill();}
    // Sparse ground-level flowers only; no roads, fences, boulders or permanent large props.
    const count=Math.round(WORLD.width*WORLD.height/45000);
    for(let i=0;i<count;i++){
      const x=-WORLD.halfWidth+35+(i*281+93)%(WORLD.width-70),y=-WORLD.halfHeight+35+(i*173+41)%(WORLD.height-70);
      g.strokeColor=new Color(101,145,78,120);g.lineWidth=1.5;g.moveTo(x,y-3);g.lineTo(x+1,y+4);g.stroke();
      g.fillColor=new Color(i%3===0?'#efb3c0':'#fff0c4');for(let j=0;j<4;j++){const a=j*Math.PI/2;g.circle(x+Math.cos(a)*2.7,y+3+Math.sin(a)*2.7,2);g.fill();}
      g.fillColor=new Color('#e2be60');g.circle(x,y+3,1.4);g.fill();
    }
  }

  private rebuildMeadow():void {
    for(const n of this.meadowTiles){n.removeFromParent();n.destroy();}this.meadowTiles=[];
    const frame=this.artFrames['world-ground'];if(frame){
      const cols=Math.ceil(WORLD.width/520),rows=Math.ceil(WORLD.height/470),w=WORLD.width/cols,h=WORLD.height/rows;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const n=this.node2D(this.battlefield,'MeadowTile'),sp=n.addComponent(Sprite);sp.spriteFrame=frame;sp.sizeMode=Sprite.SizeMode.CUSTOM;n.getComponent(UITransform)!.setContentSize(w+.5,h+.5);
        n.setPosition(-WORLD.halfWidth+(col+.5)*w,-WORLD.halfHeight+(row+.5)*h);n.setSiblingIndex(0);this.meadowTiles.push(n);
      }
    }this.ground.node.setSiblingIndex(this.meadowTiles.length);this.drawTerrainFallback();
  }

  private loadOrchardArt(): void {
    // Independent small bundles keep the WeChat main package within its limit.
    const load=(bundle:string,name:string,apply:(t:Texture2D)=>void):void=>{
      assetManager.loadBundle(bundle,(err,b)=>{if(err){console.warn('桃园素材加载失败',bundle,err);return;}b.load(name+'/texture',Texture2D,(error,t)=>{if(error||!this.isValid)return;apply(t);});});
    };
    load('meadow','ground',t=>{const f=new SpriteFrame();f.texture=t;this.artFrames['world-ground']=f;this.rebuildMeadow();});
    load('orchard','decor',t=>{const f=new SpriteFrame();f.texture=t;f.rect=new Rect(0,0,t.width/3,t.height/2);this.artFrames['peach-tree']=f;});
    load('talismans','items',t=>{for(let i=0;i<48;i++){const f=new SpriteFrame();f.texture=t;f.rect=new Rect(i%8*t.width/8,Math.floor(i/8)*t.height/6,t.width/8,t.height/6);this.artFrames['item-'+PASSIVE_ITEMS[i].id]=f;}if(this.phase==='shop')this.showShop();});
    load('arsenal','weapons',t=>{
      ['smg','shotgun','rocket','sword','thunder','gourd'].forEach((id,i)=>{const f=new SpriteFrame();f.texture=t;f.rect=new Rect(i%3*t.width/3,Math.floor(i/3)*t.height/2,t.width/3,t.height/2);this.artFrames['weapon-'+id]=f;});
      if(this.ready){this.syncWeapons();if(this.phase==='shop')this.showShop();}
    });
  }

  private releaseWeapon(x:number,y:number,angle:number,w:Weapon):void {
    const id=w.equipped!.id,stats=w.stats!;
    if(id==='sword')return;
    if(isExtraWeapon(id)){this.releaseExtraWeapon(x,y,angle,w);return;}
    this.combatFx.muzzle(id,x,y,angle);
    if(id==='thunder'){
      this.playWeaponSound(id,'attack');let from={x,y};const used=new Set<Enemy>();
      for(let i=0;i<(stats.chainTargets||3);i++){
        const e=this.enemies.filter(e=>e.hp>0 && !e.animal && (e.born||0)<=0 && !used.has(e) && Math.hypot(e.x-from.x,e.y+34-from.y)<(i?260:stats.range)).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];
        if(!e)break;used.add(e);this.combatFx.beam('thunder',from.x,from.y,e.x,e.y+34);this.hitEnemy(e,angle,Math.round(w.damage*(i?.5:1)),stats.knockback,id,false);from={x:e.x,y:e.y+34};
      }this.playWeaponSound(id,'hit');return;
    }
    if(id==='gourd'){
      const pulses=stats.pulses||6;this.gourdCasts.push({life:pulses*.1,next:0,ticks:0,maxTicks:pulses,maxTargets:stats.targets||6,damage:w.damage,range:stats.range,angle});this.playWeaponSound(id,'attack');return;
    }
    const n=stats.shotCount||1,spread=(id==='shotgun'?.68/Math.max(1,n-1):id==='peach'?.22:0)*(stats.spread||1),group={hits:new Map<Enemy,number>(),max:id==='shotgun'?4:1};
    for(let i=0;i<n;i++)this.launchProjectile(x,y,angle+(i-(n-1)/2)*spread,w.equipped!,stats,w.damage,false,group);

  }

  private gourdCasts:{life:number;next:number;ticks:number;maxTicks:number;maxTargets:number;damage:number;range:number;angle:number}[]=[];
  private updateGourds(dt:number):void {
    for(const cast of this.gourdCasts){cast.life-=dt;cast.next-=dt;if(cast.ticks>=cast.maxTicks || cast.next>0)continue;cast.ticks++;cast.next+=.1;
      const targets=this.enemies.filter(e=>e.hp>0&&(e.born||0)<=0&&Math.hypot(e.x-this.px,e.y-this.py)<cast.range).slice(0,cast.maxTargets);if(cast.ticks===1&&targets.length)this.playWeaponSound('gourd','hit');
      for(const e of targets){const dx=e.x-this.px,dy=e.y-this.py,d=Math.hypot(dx,dy);this.hitEnemy(e,Math.atan2(dy,dx),cast.damage,0,'gourd',false);
        if(e.kind!=='chief'&&d>90){e.vx=-dx/d*Math.min(150,80*this.perks.pull);e.vy=-dy/d*Math.min(150,80*this.perks.pull);}
        this.combatFx.beam('gourd',e.x,e.y+28,this.px+Math.cos(cast.angle)*70,this.py+30);
      }
    }let kept=0;for(const c of this.gourdCasts)if(c.life>0&&c.ticks<c.maxTicks)this.gourdCasts[kept++]=c;this.gourdCasts.length=kept;
  }

  private initCommonSkill():void {
    const g=this;this.commonEffects=new CommonSkillEffects(this.combatFx.particles);
    this.commonSkill=new CommonSkillRuntime({get x(){return g.px;},get y(){return g.py;},get angle(){return g.heading;},get age(){return g.age;},enemies:()=>g.enemies,
      move:(dx,dy)=>{g.px=g.clamp(g.px+dx,-WORLD.halfWidth+45,WORLD.halfWidth-45);g.py=g.clamp(g.py+dy,-WORLD.halfHeight+40,WORLD.halfHeight-50);},
      protect:seconds=>g.protectionTime=Math.max(g.protectionTime,seconds),clearSlow:()=>g.playerSlowUntil=0,
      hit:(e,angle,damage,knockback,style)=>g.hitEnemy(e,angle,damage,knockback,style,false,true),
      impact:()=>{g.shake=Math.max(g.shake,.035);},
      canHeal:()=>g.trainingMode||g.playerHp<5&&g.run.skillHealChapter!==g.run.chapter,
      heal:()=>{g.playerHp=Math.min(5,g.playerHp+1);g.run.hearts=g.playerHp;g.run.skillHealChapter=g.run.chapter;g.refreshStats();g.drawPlayerHealth();},sound:style=>g.playWeaponSound(style,'hit'),
    },this.commonEffects);
  }
  private enemyAim(e:Enemy):{x:number;y:number}{this.playerAim.x=this.px;this.playerAim.y=this.py;return this.commonSkill?.decoyFor(e)||this.playerAim;}
  private skillRequirement():number{return skillKillRequirement(this.run.skillId||DEFAULT_SKILL,this.perks.skillHaste+(this.run.heroId==='kongming'?.1:0));}
  private castSkill():void {
    if(this.phase!=='battle'||this.paused||this.trainingPanel?.root.active||this.backgrounded||this.resumeCountdown>0||this.playerHp<=0||this.skillCharge<this.skillRequirement())return;
    this.unlockAudio();let power=0;for(const w of this.run.weapons)power+=weaponDps(this.run,w);power*=1+this.perks.skillDamage;
    if(this.commonSkill.cast(this.run.skillId,power)){this.skillCharge=0;this.skillDrawKey='';this.drawSkillButton();}
  }
  private updateSkill(dt:number):void {this.commonSkill.update(dt);this.updateGourds(dt);}
  private drawSkillButton():void {
    if(!this.skillGraphic)return;const def=commonSkillFor(this.run.skillId),need=this.skillRequirement(),charge=Math.min(need,this.skillCharge),ready=charge>=need;
    if(this.skillIcon){const frame=this.artFrames['skill-'+def.icon];if(this.skillIcon.spriteFrame!==frame)this.skillIcon.spriteFrame=frame;const scale=ready?1+Math.sin(this.age*3)*.025:1;this.skillIcon.node.setScale(scale,scale,1);}
    const key=def.id+':'+charge+':'+need;if(key===this.skillDrawKey)return;this.skillDrawKey=key;const g=this.skillGraphic;g.clear();g.fillColor=new Color(40,66,48,235);g.strokeColor=new Color(ready?'#ffdc83':'#879375');g.lineWidth=3;g.circle(0,0,51);g.fill();g.stroke();
    g.strokeColor=new Color(ready?'#ffeabc':'#d8bd6e');g.lineWidth=4;if(charge>0){g.arc(0,0,46,Math.PI/2,Math.PI/2+Math.PI*2*charge/need,false);g.stroke();}
    this.skillLabel.string=def.name+' · '+(ready?'就绪':charge+'/'+need);
  }

  private drawWeaponHud():void {
    const key=this.run.weapons.map(w=>w.uid+':'+w.id+':'+w.tier).join('|');if(key===this.weaponHudKey&&this.weaponHud.children.length===6)return;this.weaponHudKey=key;
    for(const n of [...this.weaponHud.children]){n.removeFromParent();n.destroy();}
    for(let i=0;i<6;i++){const w=this.run.weapons[i],n=this.node2D(this.weaponHud,'Slot'+i);n.setPosition((i-2.5)*75,0);const g=n.addComponent(Graphics);g.fillColor=w?new Color(255,239,205,235):new Color(40,61,42,180);g.strokeColor=new Color(w?TIER_COLORS[w.tier-1]:'#80916c');g.lineWidth=w?2.5:1.5;g.roundRect(-33,-29,66,58,10);g.fill();g.stroke();
      if(w){addWeaponIcon(n,this.artFrames,w.id,w.tier,50);this.label(n,['I','II','III','IV'][w.tier-1],25,-20,11,'#674c31').node.getComponent(UITransform)!.setContentSize(20,16);const title=({smg:'突突枪',shotgun:'霰弹枪',rocket:'火箭筒'} as Partial<Record<WeaponId,string>>)[w.id]||weaponFor(w.id).name;const label=this.label(n,title,0,-42,13,'#fff0c4');label.node.getComponent(UITransform)!.setContentSize(80,22);}
    }
  }

  private spawnAnimal(kind:'chicken'|'rabbit'|'pig'=['chicken','rabbit','pig'][Math.floor(Math.random()*3)] as 'chicken'|'rabbit'|'pig'):Enemy {
    const e=this.spawnNext('soldier'),a=Math.random()*Math.PI*2,r=270+Math.random()*250;
    e.animal=kind;e.x=this.clamp(this.px+Math.cos(a)*r,-WORLD.halfWidth+70,WORLD.halfWidth-70);e.y=this.clamp(this.py+Math.sin(a)*r,-WORLD.halfHeight+70,WORLD.halfHeight-70);e.hp=Math.max(4,Math.round(scaledEnemy('E01',this.run.chapter,1).hp*.4));e.maxHp=e.hp;e.born=.5;e.bornTotal=.5;e.ttl=25;e.art.node.active=false;
    if(!e.animalArt)e.animalArt=this.node2D(e.node,'Animal').addComponent(Graphics);e.animalArt.node.active=true;this.drawAnimal(e);e.node.setPosition(e.x,e.y);return e;
  }

  private drawAnimal(e:Enemy):void {
    const g=e.animalArt!;g.clear();const old=g.node.children.find(n=>n.name==='TreeSprite');if(old){old.removeFromParent();old.destroy();}
    if(e.animal==='tree'){
      const frame=this.artFrames['peach-tree'];if(frame){const n=this.node2D(g.node,'TreeSprite'),sp=n.addComponent(Sprite);sp.spriteFrame=frame;sp.sizeMode=Sprite.SizeMode.CUSTOM;n.getComponent(UITransform)!.setContentSize(82,86);n.setPosition(0,28);}
      else{g.strokeColor=new Color('#6e5132');g.lineWidth=9;g.moveTo(0,0);g.lineTo(0,36);g.stroke();g.fillColor=new Color('#83ad6b');g.circle(-16,37,20);g.circle(16,38,20);g.circle(0,53,18);g.fill();g.fillColor=new Color('#f0a1b8');for(const [x,y]of [[-17,39],[11,49],[16,32]]){g.circle(x,y,6);g.fill();}}
      return;
    }g.lineWidth=2.5;g.strokeColor=new Color('#65513b');g.fillColor=new Color(e.animal==='pig'?'#efa5aa':'#fff3d3');
    g.ellipse(0,13,e.animal==='pig'?24:18,17);g.fill();g.stroke();g.circle(10,29,12);g.fill();g.stroke();
    if(e.animal==='chicken'){g.fillColor=new Color('#d45843');g.circle(6,42,5);g.circle(13,43,5);g.fill();g.fillColor=new Color('#dfad49');g.moveTo(21,32);g.lineTo(30,28);g.lineTo(21,25);g.close();g.fill();g.stroke();g.lineWidth=3;g.moveTo(-7,0);g.lineTo(-9,-7);g.moveTo(8,0);g.lineTo(10,-7);g.stroke();}
    else if(e.animal==='rabbit'){g.fillColor=new Color('#fff3d3');g.ellipse(6,47,5,15);g.ellipse(19,45,5,15);g.fill();g.stroke();g.fillColor=new Color('#edb9b7');g.ellipse(6,48,2,9);g.ellipse(19,46,2,9);g.fill();}
    else{g.fillColor=new Color('#e18b98');g.ellipse(22,25,9,7);g.fill();g.stroke();g.ellipse(-12,-1,6,5);g.ellipse(10,-1,6,5);g.fill();}
    g.fillColor=new Color('#493123');g.circle(14,33,2);g.fill();
  }

  private updateAnimal(e:Enemy,dt:number):void {
    e.ttl=(e.ttl||0)-dt;if(e.ttl<=0){e.hp=0;e.dead=0;e.node.active=false;return;}
    if(e.animal==='tree'){e.flash=Math.max(0,e.flash-dt);e.animalArt!.node.angle=e.flash>0?Math.sin(e.flash*90)*7:Math.sin(this.age*1.6+e.x)*1.5;e.node.setPosition(e.x,e.y);e.art.node.active=false;return;}
    const d=Math.hypot(e.x-this.px,e.y-this.py),flee=d<180||e.flash>0,angle=flee?Math.atan2(e.y-this.py,e.x-this.px):Math.sin(this.age*.7+e.x*.01)*Math.PI;
    const speed=flee?105:22;e.x=this.clamp(e.x+Math.cos(angle)*speed*dt,-WORLD.halfWidth+40,WORLD.halfWidth-40);e.y=this.clamp(e.y+Math.sin(angle)*speed*dt,-WORLD.halfHeight+40,WORLD.halfHeight-40);e.flash=Math.max(0,e.flash-dt);e.node.setPosition(e.x,e.y);
    e.animalArt!.node.setPosition(0,Math.abs(Math.sin(this.age*(flee?15:5)))*3);e.art.node.active=false;
    if(e.text)e.text.string='';
  }

  private spawnPeachTree():Enemy|undefined {
    if(this.enemies.filter(e=>e.hp>0&&e.animal==='tree').length>=2)return;
    let point:{x:number;y:number}|undefined;
    for(let i=0;i<12;i++){const a=Math.random()*Math.PI*2,r=180+Math.random()*220,x=this.clamp(this.px+Math.cos(a)*r,-WORLD.halfWidth+70,WORLD.halfWidth-70),y=this.clamp(this.py+Math.sin(a)*r,-WORLD.halfHeight+70,WORLD.halfHeight-70);
      if(Math.hypot(x-this.px,y-this.py)<150||this.enemies.some(e=>e.hp>0&&Math.hypot(x-e.x,y-e.y)<(e.animal==='tree'?180:60)))continue;point={x,y};break;
    }if(!point)return;
    const e=this.spawnAnimal('pig');e.animal='tree';e.x=point.x;e.y=point.y;e.hp=Math.max(8,Math.round(scaledEnemy('E01',this.run.chapter,1).hp*.45));e.maxHp=e.hp;e.ttl=35;e.born=.6;e.bornTotal=.6;this.drawAnimal(e);e.node.setPosition(e.x,e.y);return e;
  }

  private dropHeart(x:number,y:number,kind:'heart'|'peach'='heart'):void {
    if(this.hearts.filter(h=>h.active).length>=4)return;let h=this.hearts.find(h=>!h.active);
    if(!h){const node=this.node2D(this.world,'LifeHeart');node.addComponent(Graphics);h={node,x,y,age:0,active:false,attracted:false};this.hearts.push(h);}
    const g=h.node.getComponent(Graphics)!;g.clear();g.strokeColor=new Color('#fff1cf');g.lineWidth=2.5;
    if(kind==='peach'){
      g.fillColor=new Color('#f1a3b1');g.moveTo(0,1);g.bezierCurveTo(-27,9,-17,36,0,27);g.bezierCurveTo(17,36,27,9,0,1);g.close();g.fill();g.stroke();
      g.strokeColor=new Color('#d77c98');g.lineWidth=1.5;g.moveTo(0,5);g.bezierCurveTo(5,14,4,21,0,27);g.stroke();g.fillColor=new Color('#78ad60');g.moveTo(0,27);g.bezierCurveTo(0,39,14,40,17,36);g.bezierCurveTo(13,29,7,28,0,27);g.fill();
    }else{g.fillColor=new Color('#f17c75');g.moveTo(0,0);g.bezierCurveTo(-30,18,-10,42,0,26);g.bezierCurveTo(10,42,30,18,0,0);g.close();g.fill();g.stroke();}
    h.node.name=kind==='peach'?'HealingPeach':'LifeHeart';Object.assign(h,{kind,x,y,age:0,active:true,attracted:false});h.node.active=true;h.node.setPosition(x,y);
  }

  private updateWildlife(dt:number):void {
    if(this.trainingMode)return;
    this.treeClock-=dt;if(this.treeClock<=0){this.treeClock=40+Math.random()*20;this.spawnPeachTree();}
    if(this.run.wave===2){this.animalClock-=dt;if(this.animalClock<=0){this.animalClock=45+Math.random()*20;if(this.enemies.filter(e=>e.animal&&e.animal!=='tree'&&e.hp>0).length<2&&this.hearts.filter(h=>h.active).length<2)this.spawnAnimal();}}
    for(const h of this.hearts){if(!h.active)continue;h.age+=dt;if(h.age>this.perks.heartLife){h.active=false;h.node.active=false;continue;}
      const dx=this.px-h.x,dy=this.py-h.y,d=Math.hypot(dx,dy);if(h.age>.25&&d<this.perks.heartPickup)h.attracted=true;
      if(h.attracted){const step=Math.min(d,500*dt);if(d>0){h.x+=dx/d*step;h.y+=dy/d*step;}if(d-step<20){this.playerHp=Math.min(this.stats.maxHp,this.playerHp+1);h.active=false;h.node.active=false;this.refreshStats();this.playWeaponSound('peach','hit');continue;}}
      h.node.setPosition(h.x,h.y+Math.sin(h.age*4)*4);const s=1+Math.sin(h.age*5)*.08;h.node.setScale(s,s,1);
    }
    const target=this.hearts.find(h=>h.active&&this.playerHp<5)||this.enemies.find(e=>e.hp>0&&e.animal&&this.playerHp<5);
    this.hintText.string=target&&Math.hypot(target.x-this.px,target.y-this.py)>350?'回血目标 '+(target.x>this.px?'→':'←'):'';
  }

  onDestroy(): void {
    this.health?.destroy();
    input.off(Input.EventType.TOUCH_START, this.touchStart, this); input.off(Input.EventType.TOUCH_MOVE, this.touchMove, this);
    input.off(Input.EventType.TOUCH_END, this.touchEnd, this); input.off(Input.EventType.TOUCH_CANCEL, this.touchEnd, this);
    input.off(Input.EventType.KEY_DOWN, this.keyDown, this); input.off(Input.EventType.KEY_UP, this.keyUp, this);
    this.detachKeyboard?.();
    game.off(Game.EVENT_HIDE, this.onBackground, this);
    game.off(Game.EVENT_SHOW, this.onForeground, this);
    this.stopSounds(); this.music.stop();
    this.enemies.forEach(e => e.art.spriteFrame = null);
    this.soldierFrames.forEach(frames => frames.forEach(frame => frame.destroy()));
    Object.keys(this.enemyFrames).forEach(kind => this.enemyFrames[kind as EnemyKind]?.forEach(frame => frame.destroy()));
    if (this.avatar) this.avatar.spriteFrame = null; this.avatarFrame?.destroy();
    if (this.body) this.body.spriteFrame = null; this.bodyFrame?.destroy();
    if(this.head)this.head.spriteFrame=null;
    Object.keys(this.artFrames).forEach(key => { if (this.artFrames[key] !== this.bodyFrame) this.artFrames[key].destroy(); }); this.itemFrames.forEach(f => f.destroy());
    this.particleSprites?.destroy();this.battleSprites?.destroy();
    this.startupTexture?.destroy();this.startupImage?.destroy();
  }
  private clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }
  private node2D(parent: Node, name: string): Node { const n = new Node(name); n.layer = Layers.Enum.UI_2D; parent.addChild(n); return n; }
  private label(parent: Node, text: string, x: number, y: number, size: number, color = '#37432c'): Label {
    const n = this.node2D(parent, text); n.setPosition(x, y); n.addComponent(UITransform).setContentSize(700, size * 1.5);
    const label = n.addComponent(Label); label.string = text; label.fontSize = size; label.lineHeight = size * 1.3;
    label.color = new Color(color); label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER;
    return label;
  }
  private button(text: string, x: number, y: number, action: () => void, parent: Node = this.root, width = 230): Label {
    const n = this.node2D(parent, text); n.setPosition(x, y); n.addComponent(UITransform).setContentSize(width, 58);
    const g = n.addComponent(Graphics); g.fillColor = new Color('#456442'); g.roundRect(-width / 2, -29, width, 58, 14); g.fill();
    const label = this.label(n, text, 0, 0, 26, '#fff9e8'); label.node.getComponent(UITransform)!.setContentSize(width, 58);
    n.on(Node.EventType.TOUCH_END, action, this); return label;
  }
  private pickArchetype(stage:number):string|undefined{if(this.formationUntil>this.age){const ranged=this.formationUntil-this.age>8,pool=chapterFor(this.run.chapter).roster.filter(id=>archetypeFor(id).kind===(ranged?'spearman':'soldier'));if(pool.length)return pool[Math.floor(Math.random()*pool.length)];}const counts:Record<string,number>={};for(const e of this.enemies)if(e.hp>0&&e.archetype)counts[e.archetype]=(counts[e.archetype]||0)+1;return pickChapterEnemy(this.run.chapter,stage,this.run.bossEncounter,counts);}
  private savePoint():SavePoint{return {run:JSON.parse(JSON.stringify(this.run)),x:this.px,y:this.py,skill:this.skillCharge,remaining:this.remaining,kills:this.kills,nextSupply:Number.isFinite(this.nextSupply)?this.nextSupply:-1};}
  private writeSave(phase:'shop'|'battle',point:SavePoint){if(this.testMode||!this.chapterEntry)return;try{sys.localStorage.setItem(SAVE_KEY,JSON.stringify({schema:4,phase,point,entry:this.chapterEntry}));}catch(error){console.warn('征程保存失败',error);}}
  private saveCheckpoint(phase:'shop'|'battle'){this.savedPoint=this.savePoint();this.writeSave(phase,this.savedPoint);}
  private restoreCampaign(save:ChronicleSave){this.unlockAudio();this.clearBattle();const p=copyPoint(save.point);this.run=p.run;this.run.moving=false;this.chapterEntry=copyPoint(save.entry);this.savedPoint=p;this.stats=this.currentStats();this.applyHeroPresentation();this.refreshStats();this.syncWeapons();this.px=p.x;this.py=p.y;this.skillCharge=p.skill;this.remaining=p.remaining;this.kills=p.kills;this.nextSupply=p.nextSupply<0?Infinity:p.nextSupply;this.spawnClock=1;this.phase='battle';this.paused=false;this.protectionTime=1.2;this.setBattleVisible(true);this.screens.hide();this.hero.setPosition(this.px,this.py);this.avatar.spriteFrame=this.artFrames['hero-select-'+this.run.heroId];this.music.begin();if(save.phase==='shop')this.showShop();else if(this.run.bossEncounter)this.spawnNext('chief');this.drawProgress();}
  private retryChapter(){if(!this.chapterEntry){this.restart();return;}const p=copyPoint(this.chapterEntry);p.run.elapsed=Math.max(p.run.elapsed,this.run.elapsed);p.run.retries=(this.run.retries||0)+1;this.restoreCampaign({schema:4,phase:'battle',point:p,entry:p});this.saveCheckpoint('battle');}
  private completeChapter(){this.victoryPending=false;this.collectAllCoins();this.playerHp=Math.min(5,this.playerHp+1);const cooldown=this.skillCharge;this.clearBattle(true);this.skillCharge=cooldown;this.run.chapter++;this.run.chapterTime=0;this.run.wavesCleared=0;this.run.bossEncounter=false;this.run.wave=1;this.remaining=15;this.nextSupply=this.run.survivalSeconds+30;this.run.chapterShop=true;this.run.supplyMode='normal';this.run.rerolls=0;this.run.purchasedOffers=[];this.chapterEntry=this.savePoint();this.spawnClock=1;this.refreshStats();this.syncWeapons();rollSupply(this.run);this.showShop();this.music.resume();}

  private drawChronicleEnemy(e:Enemy){
    const back=e.direction===2,key=e.object==='eye'?'skill-19':e.bossSkin?(['lvbu','xiahoudun','machao'].indexOf(e.bossSkin)>=0?'mount-'+e.bossSkin+'-'+(back?'back':'front'):'boss-'+e.bossSkin):'enemy-'+e.archetype+'-'+(back?'back':'front'),frame=this.artFrames[key];if(!frame)return;
    if(!e.rigParts){e.rigParts=[];for(let i=0;i<4;i++){const n=this.node2D(e.art.node,'Rig'+i),sp=n.addComponent(Sprite);sp.sizeMode=Sprite.SizeMode.CUSTOM;e.rigParts.push(sp);}}
    if(e.rigKey!==key){let parts=this.rigFrames[key];if(!parts){const r=frame.rect;parts=[[0,0,1,.65],[0,.65,1,.2],[0,.85,.5,.15],[.5,.85,.5,.15]].map(([x,y,w,h])=>{const f=new SpriteFrame();f.texture=frame.texture;f.rect=new Rect(r.x+x*r.width,r.y+y*r.height,w*r.width,h*r.height);return f;});this.rigFrames[key]=parts;}e.rigKey=key;e.rigParts.forEach((sp,i)=>sp.spriteFrame=parts[i]);}
    e.art.enabled=false;const size=e.kind==='chief'?145:e.kind==='cavalry'||e.archetype&&archetypeFor(e.archetype).group.indexOf('器械')>=0?100:78;
    const step=e.moving?Math.sin(e.walk*Math.PI):0,resize=e.rigSize!==size;
    const tint=(e.flash>0?'hit':e.object==='clone'?'clone':'normal')+':'+(e.encounterChapter||this.run.chapter)+':'+!!e.bossSkin,recolor=e.rigTint!==tint;
    for(let i=0;i<4;i++){const sp=e.rigParts[i];sp.node.active=true;
      if(resize){sp.node.getComponent(UITransform)!.setContentSize(size*(i<2?1:.5),size*(i===0?.65:i===1?.2:.15));}
      sp.node.setPosition(i<2?0:(i===2?-.25:.25)*size,(i===0?.615:i===1?.19:.015)*size+(i>=2?Math.max(0,step*(i===2?1:-1))*2.4:0));
      sp.node.angle=i===0?Math.sin(this.age*2+e.speed)*.9:i===1&&e.attack>=0?Math.sin(e.attack*8)*3:0;
      if(recolor)sp.color=e.flash>0?ENEMY_HIT:e.object==='clone'?CLONE_TINT:i===1&&!e.bossSkin?FACTION_TINTS[chapterFor(e.encounterChapter||this.run.chapter).volume-1]:ENEMY_NORMAL;
    }e.rigSize=size;e.rigTint=tint;
  }
  private chronicleDamage(e:Enemy,angle:number,damage:number,id:WeaponId,quality?:Tier):number{
    if(e.archetype==='E04'){const front=Math.abs(Math.atan2(Math.sin(angle+Math.PI-e.attackAngle),Math.cos(angle+Math.PI-e.attackAngle)))<Math.PI/3;const ignore=id==='qinggang'?[.2,.3,.4,.5][(quality||this.run.weapons.find(w=>w.id===id)?.tier||1)-1]:0;if(front)damage*=1-.4*(1-ignore);}
    if(e.archetype==='E27'){const fire=['firecracker','rocket','oil-jar','thunder-bomb'].indexOf(id)>=0;damage*=fire?1.25:weaponFor(id).category!=='magic'?.7:1;}
    return damage;
  }
  private updateChronicleEnemy(e:Enemy,dt:number){
    const d=e.archetype?archetypeFor(e.archetype):undefined,n=Number(e.archetype?.slice(1)||0);
    const aim=this.enemyAim(e),dx=aim.x-e.x,dy=aim.y-e.y,dist=Math.max(.001,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx),oldX=e.x,oldY=e.y;
    e.bossAge=(e.bossAge||0)+dt;e.attackCooldown=Math.max(0,e.attackCooldown-dt);e.moving=false;
    if(e.object==='flag'||e.object==='eye'){
      e.attack=-1;if(e.object==='eye'&&e.attackCooldown<=0){this.addEnemyZone(e,this.px,this.py,85,1,{theme:'thunder'});e.attackCooldown=3.5;}
    }else if(e.kind==='chief')this.updateChronicleBoss(e,dt,dist,angle);
    else if(n===9||n===10){
      if(e.attackCooldown<=0){e.attackCooldown=4;if(n===10){let healed=0;for(const other of this.enemies)if(other!==e&&other.hp>0&&other.kind!=='chief'&&!other.animal&&Number(other.archetype?.slice(1)||0)<35&&Math.hypot(other.x-e.x,other.y-e.y)<200&&healed<3){other.hp=Math.min(other.maxHp!,other.hp+other.maxHp!*.04);healed++;}}}
      if(dist>260){e.x+=dx/dist*e.speed*dt;e.y+=dy/dist*e.speed*dt;}
    }else{
      const mountedBow=n===22||n===23,charge=d?.kind==='cavalry'&&!mountedBow,ranged=d?.kind==='spearman'||mountedBow,range=d?.range||70,windup=n===34?.9:d?.windup||.32;
      const chargeDuration=n===25?.9:n===20?.75:n===21?.6:n===24?.45:.62,chargeSpeed=n===25?420:n===20?480:n===21?580:n===24?620:540;
      e.specialCooldown=Math.max(0,(e.specialCooldown||0)-dt);
      if(n===5&&e.attack<0&&e.specialCooldown<=0){e.sidestepLeft=.3;e.specialCooldown=2.8;}
      if((e.sidestepLeft||0)>0){const t=Math.min(dt,e.sidestepLeft!);e.sidestepLeft!-=t;e.x-=Math.sin(angle)*70/.3*t;e.y+=Math.cos(angle)*70/.3*t;}
      else if(e.attack<0){
        e.direction=enemyDirection(dx,dy,e.direction);e.attackAngle=angle;
        let active=0;for(const other of this.enemies)if(other!==e&&other.hp>0&&other.attack>=0&&(charge?other.kind==='cavalry':other.kind==='spearman'))active++;
        const visible=Math.abs(e.x-this.cameraX)<this.halfWidth+100&&Math.abs(e.y-this.cameraY)<this.halfHeight+100;
        if(dist<range&&e.attackCooldown<=0&&(charge?active<2:ranged?active<4:true)&&(!ranged||visible)){
          e.attack=0;e.fired=false;e.chargeHit=false;
          if(n===6||n===7)this.addEnemyZone(e,e.x,e.y,range,windup,{theme:'slash'});
          if(n===25){const x=e.x+Math.cos(angle)*chargeSpeed*chargeDuration,y=e.y+Math.sin(angle)*chargeSpeed*chargeDuration;this.addEnemyZone(e,x,y,100,windup+chargeDuration,{theme:'slash'});}
          if(n===30)this.addEnemyZone(e,e.x,e.y,200,windup,{shape:'sector',angle,arc:100,duration:.8,theme:'fire'});
          else if([29,33,34,36,37,38,39,40].indexOf(n)>=0){
            const radius=n===33?90:n===34?95:n===36?110:n===37?100:n===38?90:n===40?70:80;
            const delay=n===33?.9:n===36||n===38||n===40?1:n===39?.85:Math.max(.8,windup);
            this.addEnemyZone(e,n===34?e.x:this.px,n===34?e.y:this.py,radius,delay,{duration:n===29?2:n===38?3:undefined,theme:n>=39?'thunder':'fire'});
            if(n===38)this.addEnemyZone(e,this.px+120,this.py,90,delay+.5,{duration:3,theme:'fire'});
            if(n===40)this.addEnemyZone(e,this.px+120,this.py,70,1,{theme:'thunder'});
          }
        }else if((e.stagger||0)<=0){
          const slow=(e.slowUntil||0)>this.age?1-(e.slowFactor||0):1,aura=this.enemies.some(v=>v.hp>0&&v.archetype==='E09'&&Math.hypot(v.x-e.x,v.y-e.y)<180)?1.1:1;
          if(dist>(ranged?Math.min(300,range*.7):50)){e.x+=dx/dist*e.speed*dt*slow*aura;e.y+=dy/dist*e.speed*dt*slow*aura;}
          if(n===22&&dist<range){e.x-=Math.sin(angle)*e.speed*.65*dt;e.y+=Math.cos(angle)*e.speed*.65*dt;}
        }
      }
      if(e.attack>=0){const previous=e.attack;e.attack+=dt;
        if(charge){
          const t=Math.max(0,Math.min(e.attack,windup+chargeDuration)-Math.max(previous,windup));
          if(t>0){e.x+=Math.cos(e.attackAngle)*chargeSpeed*t;e.y+=Math.sin(e.attackAngle)*chargeSpeed*t;if(!e.chargeHit&&sweepEllipseTime(oldX-this.px,oldY-this.py,e.x-this.px,e.y-this.py,34,30)!==null){e.chargeHit=true;this.hurtPlayer(e.x,e.y,1);}}
          const recovery=n===19?.4:.35;if(e.attack>windup+chargeDuration+recovery){e.attack=-1;e.attackCooldown=Math.max(.35,(d?.cycle||4)-windup-chargeDuration-recovery);}
        }else{
          if(n===23&&e.attack<.3){const t=Math.min(dt,.3-previous);e.x-=Math.sin(e.attackAngle)*120/.3*t;e.y+=Math.cos(e.attackAngle)*120/.3*t;}
          if(n===2&&previous<windup&&e.attack>=windup){e.x+=Math.cos(e.attackAngle)*35;e.y+=Math.sin(e.attackAngle)*35;}
          if(previous<windup&&e.attack>=windup&&!e.fired){
            e.fired=true;
            if(ranged&&[29,30,33,34,36,37,38,39,40].indexOf(n)<0)this.fireChronicleVolley(e,n);
            else if(!ranged&&n!==6&&n!==7){
              const x=this.px-e.x,y=this.py-e.y,a=e.attackAngle,along=x*Math.cos(a)+y*Math.sin(a),across=-x*Math.sin(a)+y*Math.cos(a);
              const hit=n===3?along>=0&&along<=range&&Math.abs(across)<=22.5:sectorHitsCircle(x,y,range,a,n===2?110:n===8?140:120,18);
              if(hit)this.hurtPlayer(e.x,e.y,1);
            }
            if(n===34){this.combatFx.burst('firecracker',e.x,e.y,95);if(Math.hypot(this.px-e.x,this.py-e.y)<95)this.hurtPlayer(e.x,e.y,1);e.hp=0;e.dead=1.5;}
          }
          const recovery=n===6?.65:n===11?.16:n===30?.8:.3;
          if(e.attack>=windup+recovery){e.attack=-1;e.attackCooldown=Math.max(.25,(d?.cycle||1.4)-windup-recovery);}
        }
      }
    }
    e.x=this.clamp(e.x+e.vx*dt,-WORLD.halfWidth+35,WORLD.halfWidth-35);e.y=this.clamp(e.y+e.vy*dt,-WORLD.halfHeight+24,WORLD.halfHeight-85);e.vx*=Math.exp(-12*dt);e.vy*=Math.exp(-12*dt);e.flash=Math.max(0,e.flash-dt);e.feedback=Math.max(0,e.feedback-dt);
    const travel=Math.hypot(e.x-oldX,e.y-oldY);e.moving=travel>.001;e.walk+=travel/(e.kind==='cavalry'?22:12);if(e.moving)e.direction=enemyDirection(e.x-oldX,e.y-oldY,e.direction);
    e.node.setPosition(e.x,e.y);e.art.node.setPosition(0,e.moving?Math.abs(Math.sin(e.walk*Math.PI))*1.4:0);e.art.node.setScale(e.direction===3?-1:1,1,1);e.art.node.angle=e.attack>=0?Math.sin(e.attack*9)*2:e.moving?Math.sin(e.walk*Math.PI)*1.8:0;if(e.feedback===0)e.text.string='';this.drawEnemy(e);
  }
  private fireChronicleVolley(e:Enemy,n:number){
    const count=[13,17,22,32,35].indexOf(n)>=0?3:n===16||n===23?2:1;
    const speed=n===14?560:n===31?650:n===13||n===23?380:n===12||n===17||n===35?420:n===15?360:n===16?390:n===18?310:n===22?350:n===28?300:n===32?520:330;
    const spacing=(n===16||n===35?10:n===17?15:n===32?25:n===22?3:0)*Math.PI/180;
    for(let i=0;i<count;i++){
      const angle=e.attackAngle+(i-(count-1)/2)*spacing,delay=n===13?i*.13:n===23?i*.2:0;
      if(delay&&this.pendingEnemyShots.length<24)this.pendingEnemyShots.push({source:e,angle,speed,delay});else this.fireEnemyShot(e,angle,speed);
    }
  }
  private updateChronicleBoss(e:Enemy,dt:number,dist:number,angle:number){
    const bossChapter=e.encounterChapter||this.run.chapter,actions=BOSS_ACTIONS[bossChapter-1],timers=e.bossTimers!;for(let i=0;i<timers.length;i++)timers[i]=Math.max(0,timers[i]-dt*(this.enemies.some(v=>v.hp>0&&v.object==='flag')?1.15:1));
    if(e.attack<0){const enabled=e.hp<e.maxHp!*(bossChapter===15?.7:.5)?3:2;let choice=-1;for(let j=0;j<enabled;j++){const k=((e.bossNext||0)+j)%enabled;if(timers[k]<=0&&actions[k].kind!=='enrage'&&(actions[k].kind!=='sector'||dist<=(actions[k].range||230)+80)&&(!(actions[k].kind==='zones'&&actions[k].range===0)||dist<=(actions[k].radius||100)+80)){choice=k;break;}}
      if(choice>=0){const a=actions[choice];e.bossMove=a;e.bossNext=(choice+1)%enabled;e.attack=0;e.fired=false;e.attackAngle=angle;timers[choice]=(choice===0&&e.bossSkin==='zhangjiao'&&e.hp<e.maxHp!*.5?2:a.cd)/((e.bossAge||0)>90?1.2:1)/(e.bossSkin==='menghuo'&&e.hp<e.maxHp!*.35?1.15:1);if(a.kind==='zones'||a.kind==='lines'||a.kind==='waves'||a.kind==='moving'||a.kind==='sector'||a.kind==='ring'&&a.range)this.prepareBossZones(e,a);}
      else if(dist>240){e.x+=Math.cos(angle)*e.speed*dt;e.y+=Math.sin(angle)*e.speed*dt;}return;
    }
    const a=e.bossMove!,old=e.attack;e.attack+=dt;
    if(old<a.windup&&e.attack>=a.windup){e.fired=true;this.executeBossAction(e,a);}
    if(a.kind==='charge'){const duration=a.duration||.6,t=Math.max(0,Math.min(e.attack,a.windup+duration)-Math.max(old,a.windup));if(t>0){const x=e.x,y=e.y;e.x+=Math.cos(e.attackAngle)*(a.range||360)/duration*t;e.y+=Math.sin(e.attackAngle)*(a.range||360)/duration*t;if(sweepEllipseTime(x-this.px,y-this.py,e.x-this.px,e.y-this.py,40,30)!==null)this.hurtPlayer(e.x,e.y,1);}}
    const finish=a.windup+(a.kind==='charge'?(a.duration||.6):.35);if(e.attack>finish){if(a.kind==='charge'&&(a.count||1)>1&&!e.chargeHit){e.chargeHit=true;e.attack=0;e.attackAngle=Math.atan2(this.py-e.y,this.px-e.x);e.bossMove={...a,count:1};return;}e.chargeHit=false;e.attack=-1;e.attackCooldown=.5;timers.forEach((t,i)=>timers[i]=Math.max(.5,t));}
  }
  private prepareBossZones(e:Enemy,a:BossAction){if(a.kind==='ring'&&a.range){this.addEnemyZone(e,this.px,this.py,a.range+(a.radius||48),a.windup,{shape:'ring',innerRadius:a.range-(a.radius||48),arc:a.gap||100,angle:e.attackAngle,theme:'fire',duration:1});return;}if(a.kind==='sector'){for(let i=0;i<(a.count||1);i++)this.addEnemyZone(e,e.x,e.y,a.range||230,a.windup+i*(a.delay||.55),{shape:'sector',angle:e.attackAngle+(a.gap===Math.PI?Math.PI:0)+(a.count===4?i*Math.PI/2:0),arc:Math.min(220,(a.arc||150)+(a.count===3?i*45:0)),theme:'slash'});return;}const count=Math.min(3,a.count||1),nx=-Math.sin(e.attackAngle),ny=Math.cos(e.attackAngle);for(let i=0;i<count;i++){const center=a.range===0?{x:e.x,y:e.y}:{x:this.px+nx*(i-(count-1)/2)*155,y:this.py+ny*(i-(count-1)/2)*155};this.addEnemyZone(e,center.x,center.y,a.radius||80,a.windup+i*(a.delay||.16),{theme:['zhouyu','luxun','xiahoudun'].indexOf(e.bossSkin||'')>=0?'fire':'thunder',shape:a.kind==='lines'?'line':'circle',angle:e.attackAngle,length:a.range||260,duration:a.duration,fake:a.gap===1&&i===0,moveX:a.kind==='moving'?Math.cos(e.attackAngle)*70:0,moveY:a.kind==='moving'?Math.sin(e.attackAngle)*70:0});}}
  private executeBossAction(e:Enemy,a:BossAction){
    if(a.kind==='shots'||a.kind==='ring'&&!a.range){const count=a.count||3,gap=a.gap||0;for(let i=0;i<count;i++){const angle=a.kind==='ring'?e.attackAngle+(gap*Math.PI/180)/2+(Math.PI*2-gap*Math.PI/180)*(i+.5)/count:e.attackAngle+(i-(count-1)/2)*(a.arc||30)*Math.PI/180/Math.max(1,count-1);if(a.delay&&i&&this.pendingEnemyShots.length<24)this.pendingEnemyShots.push({source:e,angle:e.attackAngle,speed:a.speed||330,delay:i*a.delay});else this.fireEnemyShot(e,a.delay?e.attackAngle:angle,a.speed||330);}}
    if(a.name==='烈刃跳击'){const z=this.enemyZones.find(z=>z.source===e&&!z.fired);if(z){e.x=z.x;e.y=z.y;}}
    if(a.name==='号令变阵')this.formationUntil=this.age+16;
    if(a.kind==='summon'){for(const id of a.units||[])this.spawnReinforcement(id,e.encounterChapter);}
    if(a.kind==='flag'||a.kind==='clone'){for(let i=0;i<(a.count||1);i++){if(this.enemies.filter(v=>v.hp>0&&!v.animal).length>=80)break;const unit=this.spawnNext('soldier',a.kind==='flag'?'E09':'E05',e.encounterChapter);unit.object=a.kind==='clone'?'clone':(e.encounterChapter||this.run.chapter)===17?'eye':'flag';unit.hp=unit.maxHp=e.maxHp!*(unit.object==='eye'?.04:a.kind==='clone'?.03:.02);if(a.kind==='clone')unit.bossSkin=e.bossSkin;unit.x=this.clamp(e.x+(i?120:-120),-WORLD.halfWidth+60,WORLD.halfWidth-60);unit.y=e.y;unit.born=1;unit.bornTotal=1;this.spawnClock+=2/chapterThreat(this.run.chapter,3,true);}}
  }
  private spawnReinforcement(id:string,chapter?:number){if(this.enemies.filter(e=>e.hp>0&&!e.animal).length>=80)return;const d=archetypeFor(id);if(d.kind==='cavalry'&&this.enemies.filter(e=>e.hp>0&&e.kind==='cavalry').length>=8)return;if(id==='E25'&&this.enemies.some(e=>e.hp>0&&e.archetype==='E25'))return;this.spawnNext(d.kind,id,chapter);this.spawnClock+=d.cost/chapterThreat(this.run.chapter,3,true);}
  private addEnemyZone(source:Enemy,x:number,y:number,radius:number,delay:number,extra:Partial<EnemyZone>={}){const boss=source.kind==='chief';if(this.enemyZones.length>=6||!boss&&this.enemyZones.filter(z=>z.source.kind!=='chief').length>=3)return;const pad=35;x=this.clamp(x,-WORLD.halfWidth+pad,WORLD.halfWidth-pad);y=this.clamp(y,-WORLD.halfHeight+pad,WORLD.halfHeight-pad);this.enemyZones.push({source,x,y,radius,delay:Math.max(extra.shape==='sector'||extra.shape==='circle'&&source.archetype==='E06'?.08:.75,delay),age:0,damage:1,fired:false,...extra});}

  private extraMelee(w:Weapon,oldTime:number){const id=w.equipped!.id,q=w.equipped!.tier-1,stats=w.stats!,t=w.time/w.duration,previous=oldTime/w.duration;let factors=[1];
    if(id==='silver-spear')factors=q===0?[1]:q===3?[.45,.45,.45]:q===2?[.6,.6]:[.55,.55];
    if(id==='serpent-spear'&&q>=2)factors=q===2?[.65,.65]:[.75,.75];
    if(id==='twin-halberds')factors=Array(2).fill([.55,.6,.65,.7][q]);
    if(id==='halberd'&&q>=2)factors=[1,q===2?.25:.4];
    factors.forEach((m,i)=>{const at=.2+i*(factors.length===3?.2:.4);if(previous<at&&t>=at){w.hit.clear();w.impactPlayed=false;if(i)this.combatFx.slash(id,this.px,this.py+16,w.angle,stats.range,stats.arc);this.meleeStrike(w,m);
      if(i===0){const wave=id==='guandao'&&q>=2&&(w.strikes||0)%3===0?[.35,.5][q-2]:id==='yitian'&&(w.strikes||0)%4===0?[.3,.4,.5,.65][q]:0;if(wave)this.launchProjectile(this.px,this.py+24,w.angle,w.equipped!,{...stats,speed:600,range:300,area:0,pierce:3},w.damage*wave,true);
      if(id==='seven-saber'&&(w.strikes||0)%7===0){const group={hits:new Map<Enemy,number>(),max:2};for(let j=0;j<7;j++)this.launchProjectile(this.px,this.py+24,w.angle+(j-3)*.22,w.equipped!,{...stats,speed:480,range:280,area:0,pierce:0},w.damage*[.12,.16,.2,.25][q],true,group);}
      if(id==='trident'&&q>=2){const group={hits:new Map<Enemy,number>(),max:1};for(const side of [-1,1])this.launchProjectile(this.px,this.py+24,w.angle+side*.35,w.equipped!,{...stats,speed:550,range:260,area:0,pierce:1},w.damage*(q===2?.2:.3),true,group);}}
    }});
  }
  private releaseExtraWeapon(x:number,y:number,angle:number,w:Weapon){const id=w.equipped!.id,stats=w.stats!,q=w.equipped!.tier-1;this.combatFx.muzzle(id,x,y,angle);this.playWeaponSound(id,'attack');
    if(id==='caltrops'||id==='bagua'){this.addFriendlyField(id,w.equipped!.uid,w.aimX||x,w.aimY||y,id==='caltrops'?35:stats.area||100,id==='caltrops'?3:1,w.damage,stats);return;}
    if(id==='taiping-book'){const group={hits:new Map<Enemy,number>(),max:1};const targets=this.enemies.filter(e=>e.hp>0&&(e.born||0)<=0&&Math.hypot(e.x-this.px,e.y-this.py)<stats.range).sort((a,b)=>Math.hypot(a.x-this.px,a.y-this.py)-Math.hypot(b.x-this.px,b.y-this.py)).slice(0,stats.chainTargets||1);for(const e of targets)this.addFriendlyField(id,w.equipped!.uid,e.x,e.y+34,70,.45,w.damage,stats,group,.25);return;}
    const count=stats.shotCount||1,max=id==='repeater'?[2,2,3,3][q]:id==='hand-halberd'?2:id==='wood-kite'?count:1,group={hits:new Map<Enemy,number>(),max};
    const mult=id==='hand-halberd'?[.55,.6,.65,.7][q]:id==='wood-kite'?(q===2?.6:q===3?.75:1):1;
    for(let i=0;i<count;i++){const spread=id==='repeater'?0:(i-(count-1)/2)*(id==='feather-fan'?.22:.15),delay=id==='repeater'?i*Math.min(.1,stats.interval/Math.max(1,count)*.8):0;
      const shotStats={...stats};if(id==='chain-hook'){shotStats.bounce=q;shotStats.bounceFactor=1;}if(id==='hand-halberd')shotStats.pierce=3;
      if(delay&&this.pendingShots.length<36)this.pendingShots.push({delay,x,y,angle:angle+spread,weapon:w.equipped!,stats:shotStats,damage:w.damage*mult,group});else this.launchProjectile(x,y,angle+spread,w.equipped!,shotStats,w.damage*mult,false,group);
    }
  }
  private addFriendlyField(id:WeaponId,uid:number,x:number,y:number,radius:number,life:number,damage:number,stats:WeaponStats,group?:{hits:Map<Enemy,number>;max:number},delay=0){const cap=id==='caltrops'?12:id==='bagua'?8:id==='taiping-book'?8:12,per=id==='caltrops'?[3,4,5,6][(stats.quality||1)-1]:id==='bagua'?2:3;const same=this.friendlyFields.filter(f=>f.id===id),own=same.filter(f=>f.uid===uid);if(own.length>=per)this.friendlyFields.splice(this.friendlyFields.indexOf(own[0]),1);else if(same.length>=cap)this.friendlyFields.splice(this.friendlyFields.indexOf(same[0]),1);this.friendlyFields.push({id,uid,x,y,radius,life,next:delay,damage,stats,hit:new Map(),group});}
  private updateExtraFields(dt:number){
    for(const shot of this.pendingShots){shot.delay-=dt;if(shot.delay<=0){this.launchProjectile(shot.x,shot.y,shot.angle,shot.weapon,shot.stats,shot.damage,false,shot.group);shot.delay=-99;}}let pending=0;for(const s of this.pendingShots)if(s.delay>-90)this.pendingShots[pending++]=s;this.pendingShots.length=pending;
    for(const [e,v]of this.oilHits)if(e.hp<=0||v.until<this.age-1)this.oilHits.delete(e);
    for(const f of this.friendlyFields){f.life-=dt;f.next-=dt;if(f.life<0||f.next>0)continue;const persistent=f.id==='oil-jar'||f.id==='caltrops';f.next+=f.id==='oil-jar'?.5:f.id==='caltrops'?1:f.id==='bagua'?.03:10;
      for(const e of this.enemies){const center=this.enemyHitCenter(e);if(e.hp<=0||(e.born||0)>0||Math.hypot(center.x-f.x,center.y-f.y)>f.radius)continue;if(!persistent&&f.hit.has(e))continue;if(f.id==='caltrops'&&(this.trapHits.get(f.uid)?.get(e)||0)>this.age)continue;
        if(f.id==='oil-jar'){const h=this.oilHits.get(e);if(h&&h.until>this.age+.000001&&h.count>=2)continue;}
        if(f.group&&(f.group.hits.get(e)||0)>=f.group.max)continue;if(f.group)f.group.hits.set(e,(f.group.hits.get(e)||0)+1);
        if(f.id==='oil-jar'){let h=this.oilHits.get(e);if(!h||h.until<=this.age+.000001){h={until:this.age+.5,count:0};this.oilHits.set(e,h);}h.count++;}if(f.id==='caltrops'){let map=this.trapHits.get(f.uid);if(!map){map=new Map();this.trapHits.set(f.uid,map);}map.set(e,this.age+1);}f.hit.set(e,this.age+(f.id==='caltrops'?1:99));
        if(f.id==='bagua'){e.slowUntil=this.age+1;e.slowFactor=e.kind==='chief'?.1:[.2,.25,.3,.35][(f.stats.quality||1)-1];}
        this.hitEnemy(e,Math.atan2(e.y-f.y,e.x-f.x),f.damage,f.stats.knockback,f.id,false,true);
      }if(f.id==='taiping-book')this.combatFx.burst('thunder',f.x,f.y,f.radius);
    }let kept=0;for(const f of this.friendlyFields)if(f.life>0)this.friendlyFields[kept++]=f;this.friendlyFields.length=kept;
  }
  private updateExtraOrbit(w:Weapon,dt:number){const id=w.equipped!.id,q=w.equipped!.tier-1,stats=w.stats!;w.arm.node.active=false;w.fist.node.active=false;w.shoe.active=false;w.node.setPosition(0,24);w.node.angle=0;w.node.setScale(1,1,1);w.orbitBlades=w.orbitBlades||[];
    let count=stats.shotCount||1;if(id==='wood-ox'){const earlier=this.weapons.slice(0,this.weapons.indexOf(w)).filter(v=>v.equipped?.id==='wood-ox').reduce((n,v)=>n+(v.stats?.shotCount||1),0);count=Math.max(0,Math.min(count,12-earlier));}
    while(w.orbitBlades.length<count){const n=this.node2D(w.node,'ExtraOrbit-'+id),sp=n.addComponent(Sprite);sp.spriteFrame=this.artFrames['icon-'+id];sp.sizeMode=Sprite.SizeMode.CUSTOM;n.getComponent(UITransform)!.setContentSize(id==='wood-ox'?42:25,id==='wood-ox'?42:25);w.orbitBlades.push(n);}for(let i=0;i<w.orbitBlades.length;i++){const n=w.orbitBlades[i];n.active=i<count;const a=this.age*(id==='star-lamps'?1.2:.3)+i*Math.PI*2/Math.max(1,count)+w.equipped!.uid*2.4;n.setPosition(Math.cos(a)*(id==='star-lamps'?stats.range:110),Math.sin(a)*(id==='star-lamps'?stats.range:80));}
    w.cooldown=Math.max(0,w.cooldown-dt);if(w.cooldown>0||dt<=0)return;w.cooldown=stats.interval;
    if(id==='star-lamps'){for(const e of this.enemies)if(e.hp>0&&(e.born||0)<=0&&Math.hypot(this.enemyHitCenter(e).x-this.px,this.enemyHitCenter(e).y-this.py-24)<stats.range)this.hitEnemy(e,Math.atan2(e.y-this.py,e.x-this.px),stats.damage,stats.knockback,id,false);this.combatFx.burst(id,this.px,this.py+24,stats.range);}
    else {const target=this.enemies.find(e=>e.hp>0&&(e.born||0)<=0&&Math.hypot(e.x-this.px,e.y-this.py)<stats.range);if(!target||!count)return;const group={hits:new Map<Enemy,number>(),max:count},mult=[1,.55,.6,.45][q];for(let i=0;i<count;i++){const n=w.orbitBlades[i],x=this.px+n.position.x,y=this.py+24+n.position.y;this.launchProjectile(x,y,Math.atan2(target.y+34-y,target.x-x),w.equipped!,stats,stats.damage*mult,false,group);}}
  }

}
