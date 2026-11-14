# 桃园小英雄

正式游戏名为**桃园小英雄**，原名桃园乱斗。

Cocos Creator **3.8.8** + TypeScript 横屏微信小游戏。当前v8：搞笑三国、小脚豆Q版，移动＋自动攻击＋一个自由搭配通用技能；三位可选少年英雄、六关五波独立挑战、7位名将Boss、40类敌兵、36种武器、60被动及9种天命。

七位Boss均已按批准稿与吕布高饱和样板重制：雷法、赤兔冲锋、金印酒火、军阵弓弩、疑兵银锋、三类兽群、棋阵双龙。[机制与实现](docs/seven-bosses.md) · [实际Cocos预览](art/reviews/bosses/README.md)。

[完整设计与实装索引](docs/design/README.md) · [实装和验证记录](docs/design/07-implementation-and-validation.md) · [项目skill](.agents/skills/taoyuan-game/SKILL.md)

## 开始游玩

1. 用Creator3.8.8打开此目录及`assets/scenes/Main.scene`预览；微信体验先`npm run build:wechat`，再在微信开发者工具编译根项目（指向build/wechatgame）。
2. 上方动态英雄＋个人关卡卡，下方小刘/小关/小张头像、基础武器方钮和技能圆钮，开始挑战居中。初始武器固定草鞋/扁担/杀猪尖刀，其他33把解锁后只进商店；技能初始3项，首通共享解锁。
3. 六关各五波：1/2波45秒，第3波小Boss全灭立即结束，第4波60秒，第5波杀大Boss。无热身，开局持基础武器直接战斗，45秒后首次补给。关卡按英雄独立依次开放，武器/道具/技能资格全英雄共享。
4. 手机左下摇杆、右下主动技能水平对齐；电脑WASD/方向键、Space/E。自动攻击，六武器环绕、被动无限叠加但递减，购物冻结但BGM续播。
5. 小刘5心/300移速/正常攻速，小关5心/345/慢攻速，小张6心/270/快攻速；敌方每次有效攻击1心。所有技能统一击杀15名真实小兵重置，演武无限生命且免充能。
6. 商店每次4件可全买，售罄保留；刷新5/8/11/14/17/20封顶，下店重置（C05首刷优惠）。武器合成/出售/满槽净额替换保留，升阶收差价。
7. Boss入场保兵/弹幕并持续援军。通关展示新增武器道具技能、全英雄共享和个人下一关；下一关先回备战，每关重新满心/28币/一把白I/一个就绪技能，清空旧构筑。失败哭脸，“再战本关”全新开始。
8. 永久记录英雄通关、共享解锁和图鉴发现；旧v7档保留、不自动转成新通关。首页无继续弹窗，杀进程后回备战。未知图鉴匿名问号占位；演武全内容自由配置且不写正式发现/通关。

[当前分关实现与验证范围](docs/stage-challenge-v8/实现说明.md) · [完整策划](docs/stage-challenge-v8/方案.md)

购物冻结战斗但BGM继续，菜单/结算停止，后台暂停，音乐/音效开关独立。角色待机有独立眨眼、摇头和呼吸。所有规则以当前源码和skill为准，旧八关/无尽/单张角方案通过Git追溯，文档保留当前规则。

## 构建与预览

```sh
npm ci
npm run typecheck
npm test
npm run skill:sync
npm run check
npm run build:wechat
```

首次需Creator导入项目生成引擎类型。标准macOS安装路径自动识别；自定义可设置`COCOS_CREATOR`指向编辑器可执行文件。构建输出`build/wechatgame`，AppID`wxbf455170a0f5ea11`，根project.config.json已指向产物；不要手改产物。

微信开发者工具点“编译”，再“预览”扫码。本AppID当前服务端源码包限制20MB，本地安全预算19.5MiB、主包/每分包4MiB；构建脚本验证尺寸及引擎导出依赖。以最新构建和服务端结果为准，生成二维码不等于iOS战斗实测。

素材先用imagegen制作透明源图，保存于`art/runtime-v4`；再运行`node scripts/pack-chronicle-art.cjs`切格，`npm run assets:optimize`在保留尺寸/精确alpha下压缩RGB。原图不进入assets。新增运行图集在chronicle-ui/chronicle-units两共享分包，现阶段不依赖CDN。不要只压PNG字节就认为GPU内存也减少。

## 代码入口

| 文件 | 用途 |
| --- | --- |
| `GameBootstrap.ts` | 正式状态机、输入、战斗/敌军/技能/掉落/保存与音频 |
| `campaign.ts`、`weapons.ts` | Run、角色属性、属性/品质、装备交易；旧八关函数仅兼容 |
| `chronicles-data.ts`、`chronicles.ts` | 7名将/40兵/12技能兼容资料与Boss动作 |
| `extra-weapons.ts` | 新25武器、四阶机制、整组输出系数 |
| `survival.ts` | 现行货架、资格、价格、购买/刷新、版本号 |
| `TrainingView.ts` | 独立演武配置，40小兵/7场Boss、数量、六武器位与主动技能 |
| `CampaignView.ts`、`CodexView.ts`、`ResultView.ts` | 三英雄/四卡补给、图鉴、失败战报 |
| `chronicle-art.ts`、`presentation-art.ts`、`hero-idle.ts` | 共享素材裁格、统一图标、分层眨眼与待机 |
| `stage-data.ts`、`stage-progress.ts`、`StageViews.ts` | 六关数值/奖励、永久进度与发现、选关/初始武器/通关界面 |
| `stage-theme.ts`、`chronicle-save.ts`、`runtime-health.ts` | 六主题静态地面、旧档兼容与运行健康记录 |
| `combat-math.ts`、`combat-effects.ts`、`combat-particles.ts` | 连续碰撞与有预算的程序特效 |
| `world-rules.ts`、`joystick-input.ts`、`desktop-keyboard.ts` | 1.5倍地图/相机/出生、固定摇杆、电脑输入 |

所有源码位于assets/scripts；资源.meta随源文件保存。完整说明按skill索引阅读。**后续变更必须同任务更新对应skill参考，再skill:sync/check，不绕过来源指纹检查。**

## 验证范围

npm test覆盖真实组件状态流转、交易/保存、所有武器品质真实命中、7场Boss动作、40类AI与正背面、共享池预算、连续碰撞、前期经济、启动/暂停/后台/音乐和胜败导航；工程夹具可加速阶段，不是真人通关成绩。

`node scripts/report-chronicle-balance.cjs`输出150条五英雄购物路径模型（65%清兵/命中假设），结果为docs/chronicle-balance.json；不是生存胜率。`npm run profile:battle -- docs/performance-node.json`为Node/Cocos桩CPU和绘图调用，不是iOS FPS。v4.3进一步将粒子、金币、出生光圈、双方弹体与剑阵本体改为共享Sprite缓存，保留判定/数量；微信渲染工程对照见docs/performance-wechat-baseline.json。手机完整征程、峰值内存及历史iOS闪退回归仍需设备实测。

资源只保留当前采用版本，见[资源索引](docs/resources.md)；原始飞书方案保留[飞书文档](https://www.feishu.cn/docx/Xb21d7jXnoLvUixnxu1cWSAXnIc)，不覆盖当前v5规则。

少年五英雄当前运行素材与完整提示见[art/runtime-youth](art/runtime-youth/README.md)，真实Cocos工程预览见[art/reviews/heroes](art/reviews/heroes/README.md)。本次仅更新英雄形象，Boss与小兵保持a848884基线，版本chronicles-v7.1-youth-heroes。

分关挑战v8当前仅为[待确认策划与设计稿](docs/stage-challenge-v8/README.md)，尚未替换上面的连续战役运行规则。


英雄成长v9已接入：个人首通+1心，本命→坐骑+30%→三连→固定冲刺→最终短甲；演武“成长”可切换0–6，Q/Shift冲刺。详见[成长实现](docs/hero-growth-proposal.md)。
