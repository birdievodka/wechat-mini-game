# 工程、构建与验证

## 文件职责

| 文件 | 当前职责 |
| --- | --- |
| `GameBootstrap.ts` | 引擎组件、正式入口、阶段流转、移动、战斗、敌军技能、碰撞、掉落、音频与素材生命周期 |
| `CampaignView.ts` | 五英雄菜单、半透明商店、武器替换/背包、结算；也保留未接入的旧升级/商店UI |
| `campaign.ts` | Run、角色、属性合成、禁用经验、旧兼容敌人曲线、装备合成回收；下半有旧八关/商店兼容函数 |
| `survival.ts` | 现行货架、价格、资格、交易、刷新、版本号与出兵预算 |
| `weapons.ts`、`passive-items.ts` | 36武器定义、品质、60被动及适配/收益递减/上限 |
| `world-rules.ts`、`combat-math.ts` | 地图、出生采样、相机、普通武器锚点、英雄技能常量、连续碰撞数学 |
| `enemy-behavior.ts`、`enemy-spell-effects.ts` | 敌兵攻击阶段/面向/帧索引与张角雷阵表现 |
| `weapon-art.ts`、`weapon-sound.ts`、`battle-music.ts` | 绘制武器、声音路由与限频、独立BGM生命周期 |
| `combat-particles.ts`、`combat-effects.ts` | 固定粒子/表现池、专属随机数、36武器与五英雄分层绘制；无伤害判定 |
| `joystick-input.ts` | 左下固定摇杆布局、12%死区、模拟量限长 |
| `LoadingView.ts`、`startup-progress.ts` | 海报/进度UI、关键启动资源完成计数、加载失败与就绪门槛 |
| `ResultView.ts` | 通关/失败结算布局、哭泣角色与轻微抽泣动作、统计/六格武器和单次导航提交 |
| `presentation-art.ts`、`hero-idle.ts` | 36武器UI插画/实测裁格、五英雄分层头袍裁格与纯表现待机节奏 |
| `ParticleSprites.ts`、`BattleSpriteAtlas.ts` | 280槽共享粒子四边形、启动烘焙金币/出生标记/双方弹体，免除逐对象Graphics大缓冲 |
| `common-skills.ts`、`CommonSkillRuntime.ts`、`CommonSkillEffects.ts`、`SkillSelectView.ts` | 24通用技能同源定义/排序/击杀门槛、真实机制与有限表现、选人搭配面板 |
| `HeroShowcase.ts` | 选人专用分层木偶、五种武器亮相、独立菜单时钟；不调用战斗 |
| `hero-arms.ts` | 新短袍肩腕基准、弯袖/袖口/皮肤和独立握拳绘制；不参与伤害 |
| `chronicles-data.ts`、`chronicles.ts` | 40兵/17章/24只读技能、固定强度、分段编组、Boss动作 |
| `extra-weapons.ts`、`chronicle-art.ts` | 新25四阶武器/机制、十小图集加载与裁格 |
| `CodexView.ts`、`chronicle-save.ts` | 只读图鉴、schema4检查点保存/恢复 |
| `build-templates/wechatgame/first-screen.js` | 游戏引擎启动之前的海报与WebGL进度渲染，替代默认Cocos标识 |
| `desktop-keyboard.ts` | 浏览器及微信桌面按键兼容、失焦清理 |
| `config/build-wechat.json`、`scripts/build-wechat.cjs` | 正式微信构建及包大小/引擎依赖检查 |

现行 `showShop` 连接 `survival.buySupply`，不是旧 `campaign.buyItem`。新增武器不能只加一行定义：还要覆盖实际攻击路由、绘制、音效、适配、交易/合成/回收、碰撞及实体池上限。

## 环境与常规检查

Cocos Creator 3.8.8，TypeScript 5.4.5，npm脚本见 `package.json`。本机Node在 `/Users/bytedance/.nvm/versions/node/v22.19.0/bin`；PATH缺Node时补该目录或使用当前环境实际Node，不改用户全局shell配置。

```bash
npm run skill:sync
npm run skill:check
npm run typecheck
npm test
npm run check
npm run build:wechat
```

按改动选择验证，不因文档改动重新打游戏包；已有检查通过后，无新变更/失败/顾虑不反复跑。生成器/维护检查改动要验证其生成、幂等与过期检测。

- `test-campaign.cjs` 通过轻量Cocos桩实际启动组件，覆盖真实菜单与阶段、热身先购物、无尽事件、保护反馈、装备、掉落、敌兵技能和音乐。
- `test-combat.cjs` 覆盖触摸、位移、攻击方向、连续碰撞、掉落/受击边界。
- `test-combat-effects.cjs` 覆盖固定容量/限频/技能预留、寿命回收、11武器/三技能绘制与屏外裁剪；`test-campaign.cjs` 还验证真实攻击接入和暂停/清场的表现生命周期。
- `test-startup.cjs` 验证前置WebGL启动画面、跨阶段进度不回退、图片失败/资源释放；组件回归额外验证关键资源延迟/失败、100%完成帧后进入选人。测试调用 `await start()` 后需驱动两帧完成就绪切换，不能把异步函数返回等同首帧已显示菜单。
- `test-result-art.cjs` 校验选人/哭泣图集3×2裁格、真实alpha/边缘留白、最大2048纹理和独立分包；组件回归覆盖三英雄哭脸、成绩、热身时长、布局、重开/返回和防连点。
- `test-presentation-art.cjs` 检查图标与分层英雄裁格/透明/边缘和眨眼对齐；组件回归验证三英雄实际眨眼/摇头、受击与暂停状态，以及11武器在战斗/商店/结算的统一等比插画。
- 其余独立覆盖纯装备交易/数值、声音限频/文件、音乐生命周期。仍有历史接口测试，不能从“旧测试通过”推断旧流程仍在正式入口。

## 微信包与启动

`npm run build:wechat` 调用Creator CLI，退出码0或36都视为成功，再检查发布文件、包体和引擎依赖。输出 `build/wechatgame`，根 `project.config.json` 的 `miniprogramRoot` 指向这里；不要导入错误目录或只改源码却忘了重建。

当前项目检查阈值来自 `scripts/check-package-size.cjs`：主包和每个分包<4MiB，总资源安全预算<19MiB。2026-11-12当前AppID在开发者工具2.02.2609250预览实际拒绝超过20MB的源码包；旧30MiB门槛不足以保证这个项目可预览，已移除，预留至少1MiB打包余量。主包/分包4MiB是本项目保守门槛，不据此推断所有平台通用限制。

实际构建还会把引擎相关发布依赖拆入战斗分包，`check-engine-imports.cjs` 验证所有运行时import都存在；不能只删大文件把启动页卡死。

构建最后复制本地主包 `startup-poster.jpg`，校验自定义 `first-screen.js` 已覆盖默认模板，并确认引擎第二层 `splashScreen.totalTime=0`；详情见 `startup-loading.md`。只改 `build/wechatgame` 会在重建后丢失，模板与构建脚本才是源。

素材由独立Bundle加载：battle、campaign、enemies、arsenal、talismans、meadow、orchard、hero-menu、results、presentation、music、sfx、chronicle-ui、chronicle-units。新增图片写正确 `.meta` 和Bundle配置，避免资源被重复打进主包。哭泣图在results包，图标/分层英雄在presentation包；新增素材必须按实际构建重新计量。

关键素材需等加载后再进入菜单；可选选人图加载失败会退回可操作基础布局。不要把“点击开始”接到素材加载完成之前，或让异步回调在组件销毁后继续改节点。

## 微信开发者工具

优先本机 `wechatide` purpose-built CLI；其技能入口为 `/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/wechatide-skill/SKILL.md`。按该技能检查登录/版本/所需授权，一次会话已通过的门禁不重复请求。小游戏不使用页面栈/WXML自动化工具。

项目路径必须绝对，client保持 `Codex`，从实际仓库取 `PROJECT`，不要把例子当固定跨机器路径。

```bash
wechatide -c Codex simulator_refresh --project "$PROJECT"
wechatide -c Codex simulator_screenshot --project "$PROJECT" --path /tmp/taoyuan-check.jpg
wechatide -c Codex get_simulator_console --project "$PROJECT" --command 'grep -Ei "error|TypeError|ReferenceError|素材加载失败"'
```

刷新成功只是触发，不等于加载成功。读取引擎时位于 `globalThis.__gameContextWindow.cc`，不是顶层 `cc`；`director.getScene()` 加载期可能null，先保护判断，再找 `GameBootstrap`。检查 `buildVersion/phase/ready` 确认版本与阶段，不仅看旧截图。空grep只表示无匹配。

触控用 `automation_game_action --action tap|swipe|touchstart|touchmove|touchend`；按最新截图取坐标，带 `--coordinate-space image --image-width ... --image-height ...`。不要在新菜单继续用旧“选择武器”按钮坐标，也不要跨阶段一直保留旧摇杆输入。

截图长时间停在旧帧、运行时却在前进时，核对Mac是否锁屏；不要反复刷新或据旧图声称新画面已验证。需要电脑操作而Mac锁屏时请用户解锁，继续后再核验。CLI编译可完成与GUI画面可见是两件事。

## 试玩和交付

用户要求“玩一局”时使用普通开局、正常摇杆/键盘/技能/付费购买，不通过evaluate改生命、金币、模拟时间、敌兵或阶段。保持连续输入与及时转向；实时游戏会在思考与工具往返时继续运行，避免长时间保持朝墙移动。使用短控制循环、阶段改变即停手，看当前截图/位置确认确实变向。

工程验证可以用明确的测试夹具或测试路由加速，但报告时不能冒充真实存活成绩。不要在用户正在玩时重置局面做额外QA；必要的重建刷新提前说明。最终区分自动回归、微信模拟器、手机实测，以及理论DPS与真人成绩。

v3.1全部品级的真实攻击验证位于test-campaign（11×4），不仅检查配置；进化表/同敌多弹上限与资源替换规则见[武器升阶规则](weapon-evolution.md)。

历史v3.3曾仅三波各30秒与首个张角；v4见expansion-v4，验证三波边界、首领唯一性/持续刷兵、击败即胜利/状态冻结/最好通关独立纪录，完整横扫时间窗口与前期货架分布。详见[首章通关规则](chapter-zhangjiao.md)。

v3.3.1组件回归覆盖张角入场保留三类小兵生命/位置/行动及在途箭，商店音乐时钟推进/战斗冻结、商店切后台恢复、购物结束不重新播放、静音后加入当前乐句。

## PNG资源减包（v3.3.2）

`npm run assets:optimize` 使用锁定sharp版本，把PNG的RGB量化到256色后再保存RGBA PNG；不是改成索引PNG。宽高、裁格、所有alpha逐像素保持一致（包括软边），RGB可见像素RMSE必须<8/255，压缩更大时保留原文件。PNG总量22.92→10.70MiB，v3.3.2正式构建总包28.31→16.09MiB（主包2.04MiB），每个分包均低于4MiB。原图按SHA256备份在`art/runtime-sources/png`，清单记录原图/产物hash及误差；原图不进入assets或游戏包。重复运行从原图处理，防止累计量化失真。新增/替换图片后运行该命令，再检查alpha/裁格、实机画面及发布包尺寸，不能为了减包删除玩法或把检查上限调回30MiB。音乐仍为原60秒PCM，没有改曲或删音效。

资源变更后完成构建、微信运行时版本与菜单ready检查，并实际调用手机预览验证服务端包体校验；未收到预览成功时不能只凭本地<19MiB就宣称手机可打开。

v3.3.2原生核对：运行时版本orchard-v3.3.2-preview20m、menu/ready=true，压缩后选人画面正常。create_preview_qrcode成功，微信服务端统计总源码16,842,673字节、主包2,112,349字节，二维码在开发者工具窗口展示；详见docs/preview-v3.3.2.json。auto_preview自动推送先返回code 10，二维码方式成功，不把前者当手机推送成功，也不把二维码生成当手机实际战斗验证。

## 性能排查 v3.4

战斗重绘、缓存、掉落节点预算、本地故障记录和压力指标见[性能与稳定性](performance.md)。npm test加入test-performance，npm run profile:battle输出CPU/绘图调用夹具报告；不能当iOS帧率或闪退根因结论。

## v4扩展验证

新增test-chronicles检查40兵首登/正背面AI、17场Boss动作实际调度、25新武器×四阶真实命中、油火/陷阱共享上限、17章真实状态机流转、恢复原货架/拒绝坏存档；这些是工程夹具，不能充当真人通关。test-performance增加后期40类型混编、六把新武器、孔明/司马懿1800帧池预算；profile:battle增加chronicle-mixed场景。独立图鉴和五英雄原生核对需要刷新最终构建并读取buildVersion，锁屏旧帧不能判成功。

pack脚本只切既有imagegen素材；新增图集全局共享一次加载，复用SpriteFrame分层缓存，颜色常量缓存；没有按章重复全尺寸贴图、远程CDN或每对象贴图。素材生成后先pack→optimize→检查透明→构建。素材与阶段变化同任务同步所有当前参考，不只重新生成catalog。

## Mac锁屏时的补充渲染检查

v4用独立临时用户目录的Chrome headless＋本地web-desktop构建，核对真实Cocos WebGL渲染。选人/图鉴点击和赵云/孔明开局、WASD/技能使用普通CDP输入；后期Boss/六槽布景属于单独工程夹具，不能混作正常进度。截图在art/reviews/chronicle-v4，filename含fixture的都是工程场景。Web SwiftShader不代表微信原生或iOS性能；Mac解锁后的原生界面取证仍单独记录。不要为了锁屏问题跳过启动完成帧或改用户存档。

## v4解锁后原生补验

2026-11-13已完成微信原生五英雄/三图鉴、正常开局→15秒28金币补给→购买扁担→固定摇杆右/上/松手→赵云技能；吕布/周瑜/司马懿为单独工程定帧，不能冒充通卷。周瑜火环内圈/缺口/环面实际伤害调用为0/0/1。原存档及三项成绩恢复一致，最终menu/ready=true；机器记录docs/native-validation-v4.json。模拟器截图在未锁屏时也可能返回旧呈现帧，必须核对Boss名/重复hash和真实窗口；旧帧不得写入取证清单。原生截图在art/reviews/chronicle-v4的*-wechat.png；仍未做iOS手机性能或完整胜率验收。


## v4.2选人场景

首页改为独立桃园演武场，training-ground.jpg取代旧合影背景，移除暖纸圆盘；按真实宽高比等比铺满，模型缩放2.2，独立眨眼/武器亮相不推进Run。Loading状态用“英雄集结中… n%”，不要再次写死三兄弟。最终构建18.47MiB，类型检查、组件菜单动画/安全区回归、启动进度回归通过；微信原生menu/ready=true、Loading实际标签确认，刘备/孔明场景核对记录在docs/hero-select-v4.2-validation.json与art/reviews/hero-select-v4.2。zhangfei-first-review.jpg是移除底部条纹前的过程截图，不作为最终验收。没有手机帧率或战斗性能实测。


v4.3密集战斗优化必须用真实Canvas/微信渲染核对atlas.ready和46格，而不能只靠Node桩回退路径通过。渲染夹具只在非战斗阶段执行，恢复界面/校验Run不变；测试源和结果见performance参考。


v5加入test-common-skills：24种实际施法/特效/伤害、纸兵瞄准、盾次数、吸箭反击、一次回血/章、击杀过滤/防重复/无时间回复、独立选英雄与技能、schema4迁移。启动必须initCommonSkill；仅构造组件的战斗单测也应初始化控制器，不能用未初始化对象模拟真实运行。


v5.0.1选人技能入口简化为英雄头像列表右边的纯图标圆钮（84×84触摸区、位置406/−175、图标62）；名称/威力/充能说明只在技能选择面板查看。复用原选择回调，构建18.51MiB，24技能行为回归通过；界面核对见docs/compact-skill-v5.0.1.json。

v5.1横扫六合A实装说明与取帧在[golden-sweep-v5.1](../../../../docs/golden-sweep-v5.1.md)，版本`chronicles-v5.1-golden-sweep`。新增`sweep-effects.ts`仅绘制，不含判定；Runtime保留原一次面积伤害，真实命中后追加暖色接触表现。G03范围/目标上限/空放/只读绘制/0.4秒清理回归在test-common-skills；类型、最终技能与压力回归、18.51MiB构建已通过。微信工程定帧夹具`wechat-golden-sweep-review.js`只从menu运行，带watchdog并恢复菜单及校验原存档；GIF为真实引擎代表帧合成，不能说是连续录像或手机帧率验收。
