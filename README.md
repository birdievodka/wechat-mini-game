# 桃园小英雄

正式游戏名为**桃园小英雄**，原名桃园乱斗。

Cocos Creator **3.8.8** + TypeScript 横屏微信小游戏。当前v7：搞笑三国、小脚豆Q版，移动＋自动攻击＋一个自由搭配通用技能；五英雄、六卷7章、7位Boss的7场战役、40类敌兵、36种武器、60被动及9种天命。

七位Boss均已按批准稿与吕布高饱和样板重制：雷法、赤兔冲锋、金印酒火、军阵弓弩、疑兵银锋、三类兽群、棋阵双龙。[机制与实现](docs/seven-bosses.md) · [实际Cocos预览](art/reviews/bosses/README.md)。

[完整设计与实装索引](docs/design/README.md) · [实装和验证记录](docs/design/07-implementation-and-validation.md) · [项目skill](.agents/skills/taoyuan-game/SKILL.md)

## 开始游玩

1. 用Creator3.8.8打开此目录及`assets/scenes/Main.scene`预览；微信体验先`npm run build:wechat`，再在微信开发者工具编译根项目（指向build/wechatgame）。
2. 上方展示选中英雄的分层动态模型，下方头像选择刘备/关羽/张飞/赵云/孔明，点居中的“开始”。默认白武器为草鞋/扁担/杀猪尖刀/龙胆银枪/白羽扇；没有开局武器选择或旧随机测试入口。首页右下“演武场”可用所选英雄进入独立配置战场：任意小兵/Boss及数量、36武器四品级六槽、12通用技能，生命无限、主动技能无冷却免击杀充能；支持清场与技能效果重置，不影响正式存档和纪录。首页图鉴可查敌兵、Boss、四阶武器和技能；12通用技能全部开放，可点击英雄头像列表右侧的技能图标独立选择，按综合威力升序。
3. 手机左下固定摇杆、右下携带技能，二者水平对齐。电脑支持方向键/WASD，Space/E放技能；先点击游戏区域获取焦点。松手停止、切后台清输入并暂停。
4. 每章15秒第零段＋三波各30秒/波后购物＋Boss。首章15秒后收入补足28，保证可买一把新武器；不自动赠送。后续章间先补给，15秒整队后直接继续，避免双商店。
5. 五颗心，每次有效受伤扣一心。六武器位周身环绕，被动可无限叠加且递减；三张商品可全买，刷新5/8/11……，同款同阶可免费合成，至少保留一把。没有经验条、等级或隐藏等级成长。
6. Boss入场保留小兵和在途弹幕，并继续援军。击败后回1心、章间继承装备/金币/技能充能；第7章司马懿才总通关。失败哭脸，可重试本章入口；失败所得不继承，战斗用时/重试次数保留。
7. 自动保存最近整备点和每笔商店交易，首页“开始”始终按当前英雄和技能开启第1章新局，不读取旧局或弹出继续选择；章内失败仍可重试本章，不逐帧保存敌兵。地图宽高各视野1.5倍，草地小花为主，小桃树/动物掉回血物，满心也可拾取但不会溢出加血。

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
| `campaign.ts`、`weapons.ts` | Run、五英雄、属性/品质、装备交易；旧八关函数仅兼容 |
| `chronicles-data.ts`、`chronicles.ts` | 7章/40兵/12技能、固定曲线、逐段编组与Boss动作 |
| `extra-weapons.ts` | 新25武器、四阶机制、整组输出系数 |
| `survival.ts` | 现行货架、资格、价格、购买/刷新、版本号 |
| `TrainingView.ts` | 独立演武配置，40小兵/7场Boss、数量、六武器位与主动技能 |
| `CampaignView.ts`、`CodexView.ts`、`ResultView.ts` | 五英雄/补给、只读图鉴、胜败战报 |
| `chronicle-art.ts`、`presentation-art.ts`、`hero-idle.ts` | 共享素材裁格、统一图标、分层眨眼与待机 |
| `chronicle-save.ts`、`runtime-health.ts` | 检查点存档、限长本地故障/内存告警记录 |
| `combat-math.ts`、`combat-effects.ts`、`combat-particles.ts` | 连续碰撞与有预算的程序特效 |
| `world-rules.ts`、`joystick-input.ts`、`desktop-keyboard.ts` | 1.5倍地图/相机/出生、固定摇杆、电脑输入 |

所有源码位于assets/scripts；资源.meta随源文件保存。完整说明按skill索引阅读。**后续变更必须同任务更新对应skill参考，再skill:sync/check，不绕过来源指纹检查。**

## 验证范围

npm test覆盖真实组件状态流转、交易/保存、所有武器品质真实命中、7场Boss动作、40类AI与正背面、共享池预算、连续碰撞、前期经济、启动/暂停/后台/音乐和胜败导航；工程夹具可加速阶段，不是真人通关成绩。

`node scripts/report-chronicle-balance.cjs`输出150条五英雄购物路径模型（65%清兵/命中假设），结果为docs/chronicle-balance.json；不是生存胜率。`npm run profile:battle -- docs/performance-node.json`为Node/Cocos桩CPU和绘图调用，不是iOS FPS。v4.3进一步将粒子、金币、出生光圈、双方弹体与剑阵本体改为共享Sprite缓存，保留判定/数量；微信渲染工程对照见docs/performance-wechat-baseline.json。手机完整征程、峰值内存及历史iOS闪退回归仍需设备实测。

资源只保留当前采用版本，见[资源索引](docs/resources.md)；原始飞书方案保留[飞书文档](https://www.feishu.cn/docx/Xb21d7jXnoLvUixnxu1cWSAXnIc)，不覆盖当前v5规则。
