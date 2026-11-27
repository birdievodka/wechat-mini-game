# 桃园小英雄适配与横扫六合案例

先定位包含`assets/scripts/GameBootstrap.ts`的仓库，读取根`AGENTS.md`和`.agents/skills/taoyuan-game/SKILL.md`。下列路径均相对于**项目根目录**，不是skill目录；不依赖本机用户名。

## 快速读取当前事实

```bash
node /path/to/cocos-game-vfx/scripts/inspect-taoyuan.cjs --project /path/to/wechat-mini-game --skill G03
```

脚本只解析TypeScript字面量/比较表达式并读文件哈希，不执行游戏模块。定义字段不证明机制已被消费；必须继续沿真实Runtime路径看时点、控制和目标过滤。新项目布局不同应改适配器，不猜测或默默使用默认技能。

## 当前代码地图

| 问题 | 源码或验证入口 |
| --- | --- |
| ID、基础值、形状元数据 | `assets/scripts/chronicles-data.ts` 的 `GENERIC_SKILLS` |
| 统一排序、查找、击杀需求 | `assets/scripts/common-skills.ts` |
| 真实施法、排程、一次/多次命中、姿态时钟 | `assets/scripts/CommonSkillRuntime.ts` |
| Visual槽位、粒子事件、寿命与共享绘制 | `assets/scripts/CommonSkillEffects.ts` |
| 横扫以外11项通用技能纯绘制 | `assets/scripts/skill-vfx-art.ts`；当前机制与表现说明见`docs/common-skills.md` |
| 横扫实体刃、拖尾、接触楔形 | `assets/scripts/sweep-effects.ts` |
| 吕布Boss三招、骑马动作与共享特效 | `lvbu-boss.ts`纯状态/CCD、`lvbu-effects.ts`纯绘制、`GameBootstrap.updateLvbuBoss/drawLvbuEnemy`绑定；详见`docs/lvbu-red-hare.md` |
| 施法入口、Host绑定、伤害/反馈与动作合成 | `assets/scripts/GameBootstrap.ts` 的 `castSkill/initCommonSkill/hitEnemy/animateWalk/updateEffects` |
| 原命中样式和缓存颜色 | `assets/scripts/combat-effects.ts` |
| 粒子物理、容量、私有RNG | `assets/scripts/combat-particles.ts` |
| 共享粒子/弹体渲染 | `assets/scripts/ParticleSprites.ts`、`assets/scripts/BattleSpriteAtlas.ts` |
| 版本与构建 | `assets/scripts/survival.ts` 的 `SURVIVAL_VERSION`；`npm run build:wechat` |
| 行为与压力 | `scripts/test-common-skills.cjs`、`scripts/test-skill-vfx.cjs`、`scripts/test-performance.cjs` |
| 浏览器工程真实帧 | `scripts/fixtures/browser-skill-vfx-review.js`：menu/watchdog/restore；变更Graphics需上传后再取完整画布，普通视口可能裁切或陈旧 |

不要把旧英雄专属技能或`combat-effects.ts`内未调用的历史原型当成当前入口。现有12通用技能全英雄选1个，开局就绪，击杀真实小兵充能；优化特效不恢复专属技能或秒数CD。

## 画风与预算

搞笑三国、小脚豆Q版、暖棕描边、平涂手绘；头部/眉眼突出，短躯干与极简脚。金白、玉绿、桃粉可作友方识别色，敌方危险边缘始终可读。不要长腿写实化、霓虹MMO化或生成第三只手。

当前基线：280粒子、32技能Visual、36技能任务，以及原通用表现池。`FX_LIMITS`还区分普通粒子、发射令牌和优先级，以当前代码和检查脚本输出为准。复用两层Graphics与粒子Sprite，不为每个小物创建大缓冲。正式包检查当前主/分包各<4MiB、总安全预算<19MiB；依据仓库检查脚本复核，不当作所有微信应用的通用政策。

## 已确认的横扫六合 A

机制保持：G03、0.80S、半径250、最多10敌各一次、击退300、基础22击杀。S是已装备武器理论单目标DPS合计乘技能加成。总表现0.4秒、接触闪0.19秒；当前伤害在第一次模拟更新结算，不因美术起手延后。

| 确认方案中的视觉 | 实装位置与注意点 |
| --- | --- |
| 金白厚刃月牙 | `drawGoldenSweep`的赭色背沿/实体金刃/暖白刃面/细锋；首尾收尖 |
| 双层拖尾 | 偏移角度、较小半径和低透明轮廓，不是第二段攻击 |
| 前后层 | `ribbon`按上下半面拆分；同alpha和连贯端点避免硬接缝 |
| 笔触与切向细屑 | 48段预计算弧、四个共享TypedArray；粒子从专用RNG发射 |
| 真实接触火花 | Runtime有效命中后创建`sweep-hit`，不是沿圆周固定撒火花 |
| 暖色受击 | G03复用`cleaver`命中样式；需留意样式ID也可能参与伤害分类 |
| 角色拧身回正 | `sweepPose`在`animateWalk`合成，头身反向偏移；不改玩家位置/朝向 |
| 微震 | 第一个有效命中借用既有世界层震动，HUD不震，无实际停帧 |

案例索引：

- 已选图和提示词：`art/concepts/sweep-v5.1/01-golden-cleave.png`、`prompts.json`。仅保留已采用A稿，其他候选通过Git追溯。
- 实装说明：`docs/golden-sweep-v5.1.md`。
- 微信工程关键帧和GIF：`art/reviews/golden-sweep-v5.1/`。
- 版本、取帧、还原和源码哈希：`docs/golden-sweep-v5.1-validation.json`。
- 可复用布景模式：`scripts/fixtures/wechat-golden-sweep-review.js`。

这些是案例，不将金色月牙、48段、0.4秒、22击杀或某个历史版本号套用到其他技能。参考旧图后要再看当前源码和用户新指令。

## 工程闭环

v9.22命中数字由BattleNumber接在GameBootstrap.hitEnemy的enemy.text结构端口，数字占BattleSpriteAtlas空余第88格而非额外纹理/逐命中Label测字。不要为修改命中飘字重新引入逐敌Graphics或破坏原node/string、根位置/弹跳/清场时序。此为JSC字符串栈后的针对性规避，不是已确认原机根因；验证见test-battle-text与docs/stability-v922.md。

```bash
npm run typecheck
node scripts/test-common-skills.cjs
node scripts/test-performance.cjs
# 若改动跨越战斗/生命周期，按范围补 npm test
npm run skill:sync
npm run check
# 需要运行体验时
npm run build:wechat
```

用当前安装的wechatide skill读取工具能力后刷新模拟器，再通过`automation_evaluate`读取`globalThis.__gameContextWindow.cc`中的GameBootstrap，确认`buildVersion/ready/phase`；不要直接假设顶层`cc`存在。截图用`simulator_screenshot`，小游戏交互用`automation_game_action`的画布/图片坐标，不用WXML自动化。

正常体验使用真实输入。工程布景仅在menu等允许阶段运行，带恢复/watchdog并确认存档未变化；不要把布景成绩当真实存活或通关。只改本skill或文档不重建/刷新用户当前游戏。

后续实现同步本skill受影响条目和`taoyuan-game`的`common-skills/combat-effects/engineering`，再运行目录同步与检查；不只刷新哈希而保留失效规则。

## 吕布样板补充

`art/concepts/boss-seven/02-lvbu.png`为批准概念，`art/runtime-lvbu`保留内置imagegen的浅暖色12攻击/驻马姿态与8独立小跑帧源图/提示/裁格manifest。仅运行768×960图集进入chronicle-units。三招已接入C02/C05，不把其他六Boss提案说成实装，也不擅自删17章。

实际渲染曾抓到同类型对象复用时的尺寸回退：spawn把主Sprite尺寸重置，旧rigSize缓存却仍命中，造成首帧大、后续小。修复是在每次spawn使尺寸缓存失效，再在首次显形前按最终身份初始化；定帧夹具读回每个阶段300×300，测试连续复用5次。新动作不能只测第一次生成。

`scripts/fixtures/lvbu-review.js`支持独立Cocos与微信上下文，菜单守卫、120秒恢复、存档核对。微信裁剪后的全局cc未必导出UITransform；工程检查可只读已有Node的_uiProps.uiTransformComp，不因调试需求把引擎模块重新整包导出。不同阶段截图哈希完全相同必须判为旧帧、丢弃，不以运行时阶段变化推断图像已更新。当前平台限制与预览见art/reviews/lvbu/validation.json。

v6.4小跑修复案例：移动速度提高后不能沿用按travel/12再floor(walk*1.5)切整身冲锋帧。独立步态按140世界单位一循环，腿部四帧，上身在打包时统一注册；alpha边界包含腿部运动，逐帧bbox居中会使头身抽搐。加减速、近身追赶区间和朝向滞回与帧选择分开验证。

## v9.16首领强化案例

袁绍rain与曹操sword-field必须进BossBattle共享6危险区，start先预留完整数量、add池化重置lockAt/locationLocked，渲染不推进时钟。E40未来棋子锁定前隐藏，锁定后完整.85秒预告。孟获护体金弧直接消费bossBeastCharging，与hitEnemy/技能候选/拉扯入口同源；收招撤盾，不能靠画面颜色当免伤状态。复用原2 Graphics与86Sprite。真实WebGL定帧art/reviews/balance-v916，capture-balance-review带隔离/恢复，不当手机性能证明。

## 待确认：v10全量材质与运动升级

2026-11-20用户视频仅2.80秒，提取有序样本用于观察实体刃身、收尖流动尾迹与重招主体，不据此推定对方技术或稳定性。设计源见[全量升级方案](../../../../docs/vfx-upgrade-v10/方案.md)，视频截帧是参考，不是本作概念图或实现验收。

提议从纯图形为主转为透明手绘主体/局部序列帧＋连续轨迹＋共享Sprite材质，原Graphics保留精确边界和少量连接。现有瞬发伤害与后续装饰尾迹分离，实际扫角判伤的Boss刀锋则与扫角同源。先用六个真实动态样板校准主形体、材质、运动、接触和生命周期，再铺开36武器/12主动/21Boss招式。

该方案仅待确认，当前G03 A版与v9.22代码未改。约20MiB新增纹理、固定渲染片和合批预算均未实测，不能当作批准后的常驻配额或原机稳定性结论。实施时复用已有池并逐项迁移，禁止整套旧新效果双播、逐命中Canvas/文字纹理生成及全量Boss/技能图集常驻。

首批三张image_gen概念关键帧已归档[concepts](../../../../docs/vfx-upgrade-v10/concepts/README.md)，分别为青龙刀、水淹七军、赤兔破军；均待审，不是实际引擎或动画验收。吕布板底部跑姿仅为意向，实施仍需驻马起势/真实刹停；概念击飞不能擅自改控制。不得直接将整张概念板打入运行包。

三张先导方向后获用户认可，全量设计扩为[133项独立图册](../../../../docs/vfx-upgrade-v10/full/完整设计方案.md)，包括各武器四档机制、12主动、21Boss招式、40兵、成长骑宠与精英变体/共通反馈；manifest保留完整提示、原图SHA与参考。新稿仍待审，本轮仅设计。实际源码优先于历史文案：普通军师两雷圈、精英军师三子/十字分列，重斧/巨锤按真实85/95半径。不得将概念生成器/HTML/PDF脚本当成运行时实现、将完整稿误称Cocos动态样板。

全量图册采用逐项身份/敌我关系/数量与空间核对：普通兵用“身份表→已纠正的单兵对主角样板→少年身份”减少整景串角色；三宠只由宠物攻击，旗手/军医仅作用友兵。骑乘小关必须绿帽青龙刀、小张必须红头带紫衣黑猪，不能借吕布参考把小刘或吕布混入；象兵统领仍是绿金E25。常驻飞剑/普通双剑与本命三连分列；张角三符三角、董卓四钱双侧通道/三独立酒池、袁绍四弓手/两弩车三连射、司马懿三子及双龙中间通道都要按实际机制构图。方案和原图、提示/来源同步，废弃初稿不进运行资源。

## v10全量实现

133项已获准实施，当前v10.0与逐项对应见docs/vfx-upgrade-v10/实现说明.md和implementation/coverage.json。真实入口CombatEffects→weapon-vfx、CommonSkillEffects→skill-vfx-v10、BossEffects/lvbu-effects、enemy-vfx-v10、growth/PetView；保留所有判定源。vfx-brush连续几何＋vfx-materials四共享层/96总64普通Sprite，16材质同一1024²4MiB；凹多边形原生对角楔形用12/24凸条处理。成长移到世界层避免新私有绘图模型，清场和析构解除Sprite引用。

132真实引擎帧（控制反馈共用G26）、两组各60秒加速资源检查、微信实际v10/16帧就绪，见art/reviews/vfx-v10；不是手机FPS/崩溃修复证明。回归中只更新授权的boss-effects/lvbu-effects/enemy-spell-effects表现哈希，逻辑/PNG保护仍在；剑阵接受实体fill，诊断夹具必须给真实战斗seconds，不能降低检查。

v10.4 横扫六合以已采用的 A 稿「金锋回旋」为表现基准，沿用原始月牙刃面、暖白锋边与真实命中的金色碎屑。设计原图见 art/concepts/sweep-v5.1/01-golden-cleave.png。v10.2 金线与 v10.3 游龙均已撤下；其他技能继续使用 v10 特效。

v10.5 三少年共享的其余 11 招主动技能接入 skill-vfx-v10 的双侧收尖笔触，各自沿用真实弹道、火线、扩圈、剑轨与落点。主体用共享 Graphics 的实体色面与局部亮锋，复用箭形、受击碎锋和眩晕星；G03 继续使用独立 A 版与基线校验。武器及敌方特效仍按各自入口。

v10.6 大范围表现覆盖火烧连营、水淹七军、八门金锁、震军号令、星落五丈原、万箭齐发与雷霆万钧。以地面底色、移动主体和局部收尾形成前后层，仍由同一场景时钟和伤害节拍驱动。同层共享 Graphics，无额外纹理或逐弹新节点。详见战斗特效参考。

v10.7 雷霆万钧聚云0.20秒后四雷同帧判定，共用一次预声和雷鸣；独立入射方向在单目标重叠时仍可辨，同敌最多2雷、总18目标。v10.7.1 星落五丈原改为九颗陨石在0.35–1.47秒依次落地，间隔0.14秒，末颗触发终击星阵，每颗在下落开始时锁定落点。火烧连营改为横向点火、连续卷焰与随四次灼烧传递的亮锋，沿用480×80判定。

v10.8 覆盖36把武器和7位首领共21招。weapon-vfx 用于挥击、飞行、枪口、命中和场地；combat-effects 与 GameBootstrap 传入实际事件。吕布取 lvbu-effects，另六位取 boss-effects，阶段冲锋精英取 yellow-charge-effects。复用 vfx-brush 的 nib、crescent、sweepEdge、groundStrike。对照项目 skill 的 combat-effects 与 weapon-evolution 两份参考。实景夹具分别走 vfxUpgradeReview.weapon、bossesReview.show 与 lvbuReview.show；每次恢复菜单会释放远程首领图集，下一组须重新 prepareBosses。按表核对36/21项和箭雨、落印等连续动作，再用混装六武器与六剑阵压测；记录采样时长、对象池与纹理，真机帧率和系统闪退需在原机另行验证。

v10.9 的参考范围是全部十二招英雄主动技。映射表见项目 skill 的 combat-effects「以整套主动技为武器和首领的美术参照」。火烧连营、酒池和火油共用 vfx-brush.firePlume 的曲线；袁绍箭雨与万箭齐发共用 drawSkillArrow。武器法阵、各兵器挥击和首领冲锋直接读取自身时钟或位移。三组样本分别对照武器、首领与原英雄技能，避免只用最后一项落体改动概括整轮方向。

v10.10 雷霆万钧与星落五丈原。雷霆聚云0.20秒后同时轰击12处，每处半径65；星落分9轮、每轮3颗（共27颗），每颗下落0.35秒，从0.35秒起每0.14秒落一轮，第九轮在1.47秒落地。 每组三个独立落点共用一个调度任务与视觉槽，绘制和伤害读取同一批锁定坐标。落雷按次、陨石按轮发声。单敌命中上限分别为2和3，目标上限分别为18和20。

首领技能实体的清晰度以战场显示尺寸验收。董卓金印取 192² 帧，司马懿棋龙用 384×192 帧显示为 360×180，孟获战兽为 224²。宽帧裁切由 pack-boss-art 生成的 BOSS_PROP_RECTS 决定；相同相机与施法时刻核对轮廓、落点和预警。具体动作规格与显存预算见 taoyuan-game 的 seven-bosses 参考。

v11.0.8 的首领与战兽、金印和棋龙按同屏步兵与实际显示尺寸定像素。查看 taoyuan-game 的 seven-bosses 体型表。脚底注册、冲锋残影和技能落点使用原逻辑格，物理图集按可见轮廓紧凑排列；共用实体 Sprite 设 trim=false。验收用同一镜头、同一姿态和同一只农兵作参照，另外放大同一帧的局部检查线条与动画注册。

## v11.1 PixelFX

固定提交 `5294518`，生成器输出预烘焙裁片，由 `vfx-materials.pixel` 保留上游锚点接入已有四层。素材被裁剪、池淘汰或屏外时，真实几何继续绘制。G03 A 版曲线基线保留，伤害与人数采用新版。见 [战斗实装](../../../../docs/pixelfx-v111.md)。

v11.1.4 三把本命的前两击取现有武器槽的时钟和真实持握位置。刃光用共享前景层和原 PixelFX 斩／刺裁片。长矛的短光楔与普通刺击轴共用锁向和出手高度，命中火花经 `hitEnemy` 接受伤害后进入共享池。用 `test-hero-growth` 核对双向出手、真实闪红、空挥无命中和原第三击。
