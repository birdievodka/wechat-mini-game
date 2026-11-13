# 桃园乱斗适配与横扫六合案例

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
| 横扫实体刃、拖尾、接触楔形 | `assets/scripts/sweep-effects.ts` |
| 施法入口、Host绑定、伤害/反馈与动作合成 | `assets/scripts/GameBootstrap.ts` 的 `castSkill/initCommonSkill/hitEnemy/animateWalk/updateEffects` |
| 原命中样式和缓存颜色 | `assets/scripts/combat-effects.ts` |
| 粒子物理、容量、私有RNG | `assets/scripts/combat-particles.ts` |
| 共享粒子/弹体渲染 | `assets/scripts/ParticleSprites.ts`、`assets/scripts/BattleSpriteAtlas.ts` |
| 版本与构建 | `assets/scripts/survival.ts` 的 `SURVIVAL_VERSION`；`npm run build:wechat` |
| 行为与压力 | `scripts/test-common-skills.cjs`、`scripts/test-performance.cjs` |

不要把旧英雄专属技能或`combat-effects.ts`内未调用的历史原型当成当前入口。现有24通用技能全英雄选1个，开局就绪，击杀真实小兵充能；优化特效不恢复专属技能或秒数CD。

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
