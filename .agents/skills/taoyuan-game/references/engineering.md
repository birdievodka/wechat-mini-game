# 工程、构建与验证

## 文件职责

| 文件 | 当前职责 |
| --- | --- |
| `GameBootstrap.ts` | 引擎组件、正式入口、阶段流转、移动、战斗、敌军技能、碰撞、掉落、音频与素材生命周期 |
| `TrainingView.ts` | 演武配置面板与分页，调用GameBootstrap受模式保护的生成/装备方法 |
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
| `common-skills.ts`、`CommonSkillRuntime.ts`、`CommonSkillEffects.ts`、`SkillSelectView.ts` | 12通用技能同源定义/排序/击杀门槛、真实机制与有限表现、选人搭配面板 |
| `skill-vfx-art.ts`、`sweep-effects.ts` | v5.2通用技能纯绘制与保留的G03 A金锋回旋；无伤害/时钟/节点创建 |
| `HeroShowcase.ts` | 选人专用分层木偶、五种武器亮相、独立菜单时钟；不调用战斗 |
| `hero-arms.ts` | 新短袍肩腕基准、弯袖/袖口/皮肤和独立握拳绘制；不参与伤害 |
| `chronicles-data.ts`、`chronicles.ts` | 40兵/7章/12技能定义、固定强度、分段编组、Boss动作 |
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

- `test-training.cjs` 覆盖演武全量配置、独立Boss形态、数量/槽位/输入边界、免伤、清场、正式存档与成绩隔离和退出恢复。
- `test-enemy-birth.cjs` 覆盖40兵种、旧兵/骑兵/Boss跨类型复用，非显示子步出生、首次显形到出生结束贴图一致、召唤分身/天眼最终身份和共享出生标记清理；普通绘制仍按显示子步限频。
- `test-ui-layout.cjs` 通过真实组件验证购物HUD隐藏/恢复、音乐续播、只读余额、六槽管理、替换未选/退款不足/取消/净额成交，以及武器与道具弹层。
- `test-campaign.cjs` 通过轻量Cocos桩实际启动组件，覆盖真实菜单与阶段、有旧档/坏档均直接新开、英雄/技能选择与章内重试、热身先购物、无尽事件、保护反馈、装备、掉落、敌兵技能和音乐。
- `test-combat.cjs` 覆盖触摸、位移、攻击方向、连续碰撞、掉落/受击边界。
- `test-combat-effects.cjs` 覆盖固定容量/限频/技能预留、寿命回收、11武器/三技能绘制与屏外裁剪；`test-campaign.cjs` 还验证真实攻击接入和暂停/清场的表现生命周期。
- `test-startup.cjs` 验证前置WebGL启动画面、跨阶段进度不回退、图片失败/资源释放；组件回归额外验证关键资源延迟/失败、100%完成帧后进入选人。测试调用 `await start()` 后需驱动两帧完成就绪切换，不能把异步函数返回等同首帧已显示菜单。
- `test-result-art.cjs` 校验选人/哭泣图集3×2裁格、真实alpha/边缘留白、最大2048纹理和独立分包；组件回归覆盖三英雄哭脸、成绩、热身时长、布局、重开/返回和防连点。
- `test-presentation-art.cjs` 检查图标与分层英雄裁格/透明/边缘和眨眼对齐；组件回归验证三英雄实际眨眼/摇头、受击与暂停状态，以及11武器在战斗/商店/结算的统一等比插画。
- 其余独立覆盖纯装备交易/数值、声音限频/文件、音乐生命周期。仍有历史接口测试，不能从“旧测试通过”推断旧流程仍在正式入口。

## 微信包与启动

`npm run build:wechat` 调用Creator CLI，退出码0或36都视为成功，再检查发布文件、包体和引擎依赖。输出 `build/wechatgame`，根 `project.config.json` 的 `miniprogramRoot` 指向这里；不要导入错误目录或只改源码却忘了重建。

当前项目检查阈值来自 `scripts/check-package-size.cjs`：主包和每个分包<4MiB，总资源安全预算<19.5MiB。2026-11-12当前AppID在开发者工具2.02.2609250预览实际拒绝超过20MB的源码包；旧30MiB门槛不足以保证这个项目可预览，已移除，预留至少0.5MiB打包余量。主包/分包4MiB是本项目保守门槛，不据此推断所有平台通用限制。

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

用户已明确选择“无需解锁，改完发预览二维码，由自己在手机测试”。在该交付范围内，回归和构建完成后直接生成最新预览二维码，不把Mac解锁或桌面截图验收作为交付前置；保留未完成的桌面/iOS验证事实。二维码生成走create_preview_qrcode的image输出，不要求先打开项目窗口；实际返回成功才交付，不沿用旧二维码。

## 试玩和交付

用户要求“玩一局”时使用普通开局、正常摇杆/键盘/技能/付费购买，不通过evaluate改生命、金币、模拟时间、敌兵或阶段。保持连续输入与及时转向；实时游戏会在思考与工具往返时继续运行，避免长时间保持朝墙移动。使用短控制循环、阶段改变即停手，看当前截图/位置确认确实变向。

工程验证可以用明确的测试夹具或测试路由加速，但报告时不能冒充真实存活成绩。不要在用户正在玩时重置局面做额外QA；必要的重建刷新提前说明。最终区分自动回归、微信模拟器、手机实测，以及理论DPS与真人成绩。

v3.1全部品级的真实攻击验证位于test-campaign（11×4），不仅检查配置；进化表/同敌多弹上限与资源替换规则见[武器升阶规则](weapon-evolution.md)。

历史v3.3曾仅三波各30秒与首个张角；v4见expansion-v4，验证三波边界、首领唯一性/持续刷兵、击败即胜利/状态冻结/最好通关独立纪录，完整横扫时间窗口与前期货架分布。详见[首章通关规则](chapter-zhangjiao.md)。

v3.3.1组件回归覆盖张角入场保留三类小兵生命/位置/行动及在途箭，商店音乐时钟推进/战斗冻结、商店切后台恢复、购物结束不重新播放、静音后加入当前乐句。

## PNG源图与生成链

`npm run assets:optimize`锁定sharp，把RGB量化后保存RGBA PNG；尺寸、裁格、每个alpha值不变，可见RGB误差有门槛，压缩更大则保留原文件。当前38张运行PNG的未量化源图与哈希保存在art/runtime-sources/png；重复生成从源图处理，不能累计量化失真。源图不进入assets或微信包。

art/runtime-v4保留十张生成源图与prompts/manifest，供pack-chronicle-art和素材回归使用。不能因文件名带v4就删除。源图、压缩备份、运行图属于不同工序，保留规则见[资源维护](resources.md)。

## 当前验证记录

- 最新v5.2通用特效：`docs/skill-vfx-v5.2.md`与`scripts/test-skill-vfx.cjs`；23项概念/真实Cocos浏览器画布保存在本次主交付目录。新增夹具`browser-skill-vfx-review.js`仅menu安装，120秒watchdog，保存/恢复Run引用与移动/待机状态，不写进度；上传后至少两次0dt渲染再导出完整GameCanvas。关键帧合成不是连续录屏；这次不证明手机FPS或微信客户端已刷新。
- 当前技能程序评审：docs/skill-review已按v6当前12项重新生成，仅总览、机制JSON、README与飞书快照链接；生成命令node scripts/review-common-skills.cjs。未经重采集不称最新v5.2还原证据。
- 最新微信横扫A：docs/golden-sweep-v5.1.md与validation.json；GIF为代表帧合成，非连续录像或手机帧率测试。夹具只从菜单执行，有watchdog，结束恢复原存档和菜单。
- 最新Node压力：docs/performance-node.json；最新保留的真实桌面渲染A/B：docs/performance-wechat-baseline.json。测量范围不能混用，详见performance.md。
- 最新战役模型：docs/chronicle-balance.json，150条真实交易路径；无受伤/死亡模拟，不是生存胜率。

运行assets和现有微信构建未在资源清理任务中改动；清理文档不重编、不刷新用户对局。改动游戏后需按最新源码重新构建，不拿旧二维码或旧截图证明新版已加载。

### v5.4演武验收

见art/reviews/training：真实界面配置和独立模式战斗，正式进度不改。优化截图曾重复返回旧帧而引擎实际正常；对不上运行时阶段时，使用simulator_screenshot --optimize false与新路径核对原始画面，不能据旧帧判定代码失败或无依据要求解锁。版本、阶段、模拟时钟和截图一起判断。

v6技能重制：新增test-skill-recast，G03单独锁定既有定义与渲染SHA；其余12项按新机制回归，不能用改快照替代8箭/火线/箭雨/眩晕/格挡行为测试。构建版本chronicles-v6-skill-recast。

v6.3吕布样板已接入C02/C05：lvbu-boss.ts负责独立状态与连续碰撞、lvbu-effects.ts负责共享绘制、chronicle-art加载12帧动作；test-lvbu纳入npm test。scripts/fixtures/lvbu-review.js在菜单守卫下进行工程定帧，120秒恢复/存档校验；scripts/capture-lvbu-review.mjs只连接独立本地WebGL评审环境。真实平台结果见art/reviews/lvbu/validation.json，不混称iOS实测。

v6.4吕布追赶与画风修订：20帧、768×960，独立四步小跑、220/230速度、加减速/追赶滞回。test-lvbu增加步频/停步/面向与上身锚点回归；capture-lvbu-review包含小跑工程GIF。本轮用户选择手机自行测试，直接构建后发新二维码，不等待解锁。

v6.5吕布采纳高饱和/大横扫稿：20帧仅改配色、原注册步态保留；半径300、1秒前摇，test-lvbu验证285/317/320内外边界、60°缺口、四向、绘制外缘与只读性、HSV饱和值/色值而非用灰度把鲜红误判黑块。微信预览直接交用户手机测试。

v7七Boss和七章均已完成；boss-roster为纯契约，boss-battle真实模拟、boss-effects共享渲染，入口与96/24/16动作素材在seven-bosses参考。旧14人静态/坐骑运行图已退出assets，主包/分包4MiB、总包19.5MiB安全线保持。微信与独立WebGL分别构建核对，取证脚本捕获54帧/792张动画帧且恢复存档；iOS由用户手机体验。
