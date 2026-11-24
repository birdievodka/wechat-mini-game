# 桃园小英雄项目约定

本项目是 Cocos Creator 3.8.8 + TypeScript 横屏微信小游戏《桃园小英雄》。

处理本项目代码、玩法、角色、美术、界面、武器、道具、数值、音效、资源及构建变更前，读取 `.agents/skills/taoyuan-game/SKILL.md`，按任务索引阅读相关参考。

设计或评审兵器打法、四档升阶、商店购买理由及打击反馈时，使用[桃园兵器设计 skill](.agents/skills/taoyuan-weapon-design/SKILL.md)。该入口分别指向现行机制和逐件重制提案。

设计或实现技能/武器/命中战斗特效时，再读取 `.agents/skills/cocos-game-vfx/SKILL.md`；它包含概念到真实调用链、性能预算、运行验收和横扫六合A版案例。按任务读取其中的设计、实现或验证参考；只出图时不擅自改代码，已获准实现时完成构建与实际画面核对。

用户明确要求：**后续项目变更也要同步更新这套 skill，不能留到另一次任务。**

- 规则、流程或表现变化：更新对应人工参考，再运行 `npm run skill:sync`。
- 源码、资源、配置变化：同步目录/来源指纹，并执行 `npm run skill:check`。
- `npm run check` 包含同步检查；不要删除来源记录或关闭检查来掩盖未同步。
- 纯问答、阅读、试玩没有项目变更时，不必重写 skill。
- 最新用户需求优先；实现新规则后更新规范，不把旧约定当作拒绝变更的理由。

当前v8.2为三少年小刘/小关/小张（liubei/guanyu/zhangfei ID保持，赵云/孔明隐藏）、6独立关卡×5波。1/2波45秒、第4波60秒，第3波小Boss全灭立即结束，第5波杀大Boss；无热身。每英雄关卡进度独立，36武器/60被动/12技能的内容资格与发现全账号共享；固定初始3基础武器，其余解锁武器只进商店。每关满5/5/6心、28币、一把白I、一个就绪技能，关间/死亡重试构筑全清。四商品可全买，刷新封顶20，每店重置，C05首刷优惠；所有主动15真实小兵击杀重置，演武免充能保持。Boss入场保兵并持续援军，BGM购物续播；胜利展示共享解锁差集和个人下一关。未知图鉴匿名剪影，仅露轮廓不显示原色和详情。永久档taoyuan-stage-profile-v8，旧schema4不自动解释为通关记录。正式入口stage-data/stage-progress＋GameBootstrap的stageBoundary/resumeStage/endStage；旧chronicles七章表是首领形态/演武/兼容数据。见skill与docs/stage-challenge-v8/实现说明.md。

现行商店在 `survival.ts`，不要切回 `campaign.ts` 的旧 `rollShop/buyItem` 路径。按变更范围执行 `npm test`、`npm run typecheck`、`npm run check`；需要微信体验时构建并确认目标运行时版本。

v7七Boss各三招已接入；新六位使用boss-roster/boss-battle/boss-effects，共享4主招、6危险区、80敌方移动物、12首领随从/6战兽/2器械。艺术与回归入口见docs/seven-bosses.md和skill七Boss参考。章表压缩为7，不能恢复旧17场。

v8.1最新修订：开始直接进第一波，不设出发商店；黄巾第三波3只2400HP冲锋精英，轮流.7秒蓄力/760速度锁向冲锋，三只全灭立即过波，一次回血奖励；选关与首页关卡卡按批准稿还原手绘玉绿金边/大图/首领图标/状态。

v8.2：第三波中Boss全灭即购物；固定赏金25+5×(关−1)只发一次。波出兵倍率.75/.95/.60/1.20/1.20；正式Boss召唤不再延迟普通援军，既有80敌军和分关普通兵人数/成本上限保持。

v8.3稳定性：进入战斗后必须释放隐藏选人/商店/演武UI子树，重建时保留Run/profile中的选择；六武器槽共用图集，禁止恢复六份独立Graphics。真实Cocos绘图内存对照与原机闪退结论分开报告，见性能skill。

v8.5：仅E01黄巾农兵先做近战动作样板，现有镰刀/锄头12帧四向、.48秒抬手锁向后一次挥击，取消普通E01接触伤害，周期1.3秒/范围70/一次1心。其他39兵/Boss保持；预警和短刃痕共享spellFx，不能逐兵加Graphics。


v8.6：全40兵与7Boss接入可读起手/出招/收招。E01保留12帧；其他兵同四张480×1248模块图集，NpcActionRig只用Sprite，无逐兵新增Graphics；身体、袖手、装备独立，机器上装/轮组分层。正式archetype/bossSkin/bossUnit取消被动接触伤害，只按实际招式判伤；锁向与动作共用attack。短前摇下限见enemy-actions/readableWindup，HP/速度/周期/范围/掉落不改。Boss原21招与数值不改，仅强化姿态/回正。见skill全敌军动作参考。


v9英雄成长已实施：有效连续首通数按英雄独立派生，仅前两关首通各+1心（最终7/7/8，v9.16）；S01本命双股剑/青龙刀/蛇矛，S02白马/赤兔/黑猪基础速度+30%，S03本命三连第三击1.5倍，S04固定二技能6秒冲刺Q/Shift，S05最终短甲，S06留名。双股剑合计占六槽之一，标记本命持握/其他五件环绕；升阶/合成保留、卖替换当局失效。成长前初始三基础任选，成长后固定自己白I本命；共享商店解锁不变。本命免费投资0不产退款。关间/重试清构筑保留成长；演武成长0–6切换且不写正式进度。复用少年头与g.fx/w.trail，growth.png一张768×512约130KiB，无逐敌新增Graphics。详见skill成长v9与docs/hero-growth-proposal.md。


v9.1内存：start加载前禁用dynamicAtlasManager、启用macro.CLEANUP_IMAGE_CACHE；加载成功两帧后销毁LoadingScreen/释放专用海报。旧成人身体和5张campaign图不再请求，别名到现行少年帧，SpriteFrame销毁去重。商店Pill/6装备格共用BattleSpriteAtlas九宫格（62格1024²/4MiB），禁止恢复13份独立Graphics或额外2048²动态图集。敌数/伤害/源图清晰度/特效预算不变。性能A/B及300秒稀疏渲染夹具见docs/performance-v91.json，不能当原iOS闪退根因/手机FPS。


v9.2：StageClearView改场景背景/大动态英雄/纸卡实物奖励，账号已共享也展示图标，仅差集标新；CTA复用BattleSpriteAtlas。爱心5–12永不换行，超过6心.8倍、间距26并横向扩statusWidth，暂停随宽度避让。近战E03/E06/E07/E08/E26/E27范围105/85/95/110/85/65，E02前跨18；戟卫100°/.8起手/.5收招/2.8周期；官渡戟将150长18半宽、.85/1.35/1.85三刺。远程成本份额24/30/38/40/38/42%，射手权重1.5；保留普通远程并发4/原箭速/总80敌80箭/分关预算。见skill与art/reviews/kiting-results-v92。


v9.2.1演武受击：仅跳过扣血，不跳过闪红/退闪/击退/飘字/音效/命中状态。hurtPlayer返回是否接受命中boolean，BossBattle.hit、吕布接触效果与E28减速消费bool，不依赖HP差。正式扣血死亡不变；格挡/冲刺及受击短保护、暂停/后台/配置仍阻止命中。


v9.3音频：三场景menu/battle/boss，音乐单源懒加载/世代号/切场释放旧解码；购物续播、后台暂停、首触解锁。86段新音效＋原草鞋，六声道、按类限频、受伤危险优先；8箭/4雷/5星/4轮箭雨由真实释放发声。audio-catalog由pack-game-audio.py生成，不能把整段试听连击当cast音效。来源/预算/验证见docs/audio-integration-v93.md与skill声音参考。


v9.4资源：8本地核心包＋13远程静态Bundle，六后续Boss按关/演武准备，张角和40兵模块本地；源码/JS全本地。build:wechat导出不可变CDN版本，cdn:publish上传并逐文件SHA256验证，预览前release/published版本相同。86逻辑声复用66物理PCM＋草鞋。cdn-assets清单入Git，releases导出忽略；清理旧运行成人/旧曲风资源，采用版源图保留。域名lf3-static.bytednsdoc.com需用户后台downloadFile白名单，未配置不能宣称手机远程验证。见docs/resources-cdn-v94.md与资源skill。


2026-11-16账号绑定：用户确认正式AppID为wxbddcb8f0462f58cc（原wxbf455170a0f5ea11为旧测试号）。根project.config与Creator构建配置/产物须一致；downloadFile域名按正式AppID核验，不能用旧测试号列表判断新后台。旧存档不删除/跨号搬迁，新号包限制以实际预览为准。


v9.5资源：results和hidden-heroes也远程，首页不等隐藏英雄/哭脸；HUD原尺寸无损切行本地，低血预取哭脸/死亡等就绪，回备战释放。唯一poster在art/runtime-youth/poster.jpg，微信和build:review各复制一份到目标根。农兵用TYI1无损索引RGB＋原alpha BufferAsset，解码同1448×1086/12帧/全部RGBA，绝不再量化/缩图/删帧；原PNG/meta及指纹留art/runtime-grunts。fflate固定MIT来源由vendor-inflate生成本地TS兼容Creator，项目解析器严格类型。见docs/resources-lossless-v95.md，test-lossless-art与真实像素渲染对照必查。


v9.6草鞋：采用红绳短椭圆草鞋与露拳稿，握拳独立前层，鞋带后跟在掌后；菜单/单草鞋战斗两手握鞋，备鞋纯装饰不占槽不增射击。多武器仍环绕/自然手，本命双剑不变。复用BattleSpriteAtlas原草鞋格2倍密度，UI/飞行/持握同形，无新纹理；见docs/sandal-grip-v96.md。


v9.6.1图鉴：未发现四类条目改真实alpha轮廓剪影（Sprite RGB0、alpha108），列表/详情去问号；姓名/原色/数值/机制/具体获取条件仍隐藏，发现与资格分离，浏览不写进度。复用本地现有帧，不额外载入远程Boss/纹理。


v9.7首页关卡卡简化：单层500×280，大图＋底部关名/切换，无成长题签/五波/首领徽章。六关缩略图采用runtime-stage-ui/battlefields.png的无字无旗战场环境，pack-stage-art复用stage-themes原纹理；原地面裁格不变。手机摇杆6%死区、80%行程全速、.7响应幂，摇杆头独立跟实际指位，无移动惯性，角色最高速度不变。

v9.7触摸实际接入必须是Canvas节点TOUCH_START/MOVE/END/CANCEL捕获监听；仅input.on会被UI吞事件，禁止恢复。首触点ID/技能第二指/暂停与出店倒数/后台保护保持，root销毁对称off。


v9.8行军地图：StageBrief640×400，600×400透明纸/布/红绳皮肤，原stage-map六帧＋动态纸签/箭头，1份菜单Stencil随菜单销毁；微信/Web includeModules必须含mask，真实渲染验收。技能选择列表与详情未解锁/未知剪影，名字详情资格不变。微信读取静音设置后tryAutoplay，静默受阻首触重试一次；播放中不重启、音效仍首触。见skill表现/工程参考。


v9.9：普通面板统一panel-ui.addPanelClose右上圆形X，64触区、共享BattleSpriteAtlas第63格，仍1024²；遮罩不关闭。演武X回战场，返回首页独立底部导航。技能标题与内容两边对齐、去排序说明；地图移除两侧装饰箭头，仅保留玉印入口。结算/主商店/加载保留明确操作按钮。


v9.10：第一关地面720×540目标格，相邻行列镜像使原非周期裁图边缘连续，保留.5像素覆盖；其他关/演武保持。复用stage-ground-1，无新纹理/材质/逐帧处理。


v9.11：首页演武入口暂隐藏，startTraining/演武逻辑保留。头像与武器技能之间短金线＋菱形分组。原卷轴去烘焙圆玉印，改128²共用城门图标stage-switch，所有关一致；94视觉/100触区，按压.94，触摸只冒泡一次到原选关守卫。pack-stage-art确定性导出，地图本体/六关配图保持。


v9.12稳定性：微信SFX固定NativeSfx六原生实例，Cocos音效元数据单并发、取缓存src即释放，30秒退避/迟到及销毁保护；浏览器继续Cocos AudioSource。BGM独立单源/购物续播。7类中性小物件加入共用BattleSpriteAtlas，70格1024×1152/4.5MiB，动物/回血/精英冠不逐个Graphics。规则、出兵及核心特效不改。新增test-native-sfx、道具GPU前后对照与长压力，见skill性能v9.12；无iOS系统日志不能宣称确诊原机闪退。

v9.13审查落实：load-lifetime/asset-scope统一截止与场景/发布租约；核心阶段18秒、Boss/deferred整组20秒、音乐18秒、音效/队列30秒，取消/迟到/多订阅隔离。原草鞋同通用加载，微信原生池失败30秒退避，禁止Cocos全库回退；最后无人引用AudioClip立即释放metadata。arsenal只refreshWeaponArt，不重置攻击；RuntimeHealth同类聚合限频（写失败也限频）、逐监听/析构隔离。组件销毁解除Sprite/派生帧/自建Canvas/资源；NpcActionRig最终值缓存，四共享FX空清理跟踪；保守CCD筛选和原配对顺序、不可见尸体复用/演武配置退休。未减特效/敌数/画质或用硬满池丢兵。见docs/review-stability-v913.md及skill性能参考；真实GPU工程数据不能当iPhone闪退结论。

v9.14六关地面：正式stage-ground全部720×540目标格、列X/行Y交替镜像，SpriteFrame全部内缩2px为316×188，保留.5px覆盖。第二至六关由15→9静态块（1440×750视口），首关保持9；同960×640纹理/原六主题色调，无新图、材质或每帧处理，缩略图和演武不改。见skill画风参考及art/reviews/grounds；不要再仅对第一关开启镜像/防串色。


v9.16当前覆盖：单武器首波保持，多武器后频率最多×1.4；逐波远程份额/并发递增，七骑兵HP约×1.6、南中统领加两护卫。袁绍/曹操远程和范围招强化、孟获冲锋无敌结束恢复、E40改棋阵、司马懿提速。五雷符全部伤害减半，商店远程优先/第二位12%升阶/价格与金币密度联动、金币拾取静音。三骑冲刺420/.28、420/.28、360/.32，6秒冷却。详细见docs/balance-v916.md；宠物与多英雄奖励表仅设计、未接战斗/schema，不能提前宣称实装。


v9.17灵宠/武器奖励已实装并与并行v9.18入口合并：S05个人首通自动获得桃桃兔/小青蛟/橘虎崽，独立伤害/不占武器位/不可受击挡弹；15帧同512²远程pets图集/1MiB，首屏不载。普通弹＋宠物2弹共享160活跃额度。每关公共1武器＋各英雄个人首通1、S01本命另属成长，共享资格仍只进商店；新档16/23/30把，6预留，profile.version2迁移legacyWeapons保留v1所有已得，不补其他英雄通关。见skill pets与docs/pets-and-unlocks-v917.md。构建入口共用cocos-build-lock，禁止并行Creator CLI构建。

演武英雄形态页：三英雄×0–6阶段可直接选择，右侧动态预览后应用；替换首槽本命并保留品级/其他五槽/敌军，清旧友弹和临时技能、同步头像身体/坐骑/冲刺/宠物。5/6资源就绪后原子应用；退出恢复进入前备战选择，不写正式成长/发现/新英雄偏好。见training参考。

分配热点维护：无尽刷兵一次遍历统计并复用40项计数/候选；保持随机次数、候选顺序与原密度。演武形态页仅活动内复用FormSurface/HeroShowcase，按钮读当前选择，切页/收起必须销毁清引用，不能缓存隐藏Graphics进入战斗。详见performance/training。

v9.19音乐恢复：canplay仅首次补seek/仍需且未实际起播才补play，pause/stop撤销意图。原生play/src/onError通知当前曲失效、仅删该曲临时路径、5秒退避重载；仍固定6音效＋1音乐、零AudioClip元数据，不能每次失败新建播放器。原音源/音量/购物续播保持。

v9.21诊断：v9.20后用户仍反馈无尽第6分钟高负载整微信退出，根因未定。设置→运行诊断可显式复制本机上一战斗/当前记录，18条5秒紧凑趋势＋峰值/8类聚合事件/单层previous，菜单重开不冲掉战斗记录。render-diagnostics只读已有节点/Graphics模型/IA，不能调用会分配的getRenderDataList或改引擎缓冲容量；无自动上传/新常驻战斗Graphics。11月17日旧Jetsam中WeChat仅largestProcess、无reason，不能认定为本次被杀证据。

18:14实际WeChat日志确认：正式AppID的WAJSGameService线程出现EXC_BAD_ACCESS/SIGSEGV、0x8，顶部为JavaScriptCore JSRopeString解析/属性读取；此记录非Jetsam。日志未给项目JS行号，字符串/Label/贴图键/JS原生桥仅为后续排查方向，不能把v9.21诊断包称为已修复，不把vmSummary虚拟地址空间当RSS。原始日志不入Git，详见docs/stability-v921.md。

v9.21.1诊断页支持分页摘要截图＋复制完整报告，剪贴板失败显示真实errMsg/errCode；可选绘图字段缺失逐模型隔离，safeSnapshot异常仍保上局导出，禁止空报告/统一boolean吞原因。短夹具test-runtime-report只测导出故障，无真实剪贴板/用户档/战斗长测；不宣称修复JSC SIGSEGV。

v9.22伤害数字：BattleNumber接enemy.text(node/string)，同BattleSpriteAtlas原空余第88格烘焙13字；尺寸仍1024×1408/5.5MiB，节点惰性复用/24格坏输入界，颜色/字号/根动作/时序/伤害不变。数字失败只回退Label，不可禁用原图集；Sprite解除后销毁共享帧。作为JSC字符串/属性栈的规避，未确诊源行或根治。NativeMusic未赋源不发stop/pause/play，后续错误含曲目/操作/原始码，保留6+1/原曲/购物续播/两次恢复。用户旧快照326s/第10轮、13活敌/23池，0警告/JS错及每会话1音乐错不等同根因；见docs/stability-v922.md。
BattleNumber.string仅缓存值/dirty，GameBootstrap.lateUpdate每帧绘制前合并flush，避免同帧霰弹/持续伤害多次改Sprite；不得移回每次hit立即排版。

v9.20无尽内存：商店卡片/品质条/玉绿面板/遮罩/部分图标共用87格1024×1408/5.5MiB同BattleSpriteAtlas；菱形独立Sprite，禁止恢复独立卡片Graphics常态。无尽确认继续先销毁商店子树再准备Boss，Run购买状态保留。前台商店纳入5秒故障快照并标mode/tier/Boss图集；静态Cocos11→0个Shop Graphics与约23.75MiB图形资源下降不等于原机根因或手机实测。

v9.20音乐恢复上限：同曲播放失败只自动重试两次（5秒/30秒），临时文件仅额外刷新一次；超额等实际切曲/明确重开/用户手动开启，不能因同曲无尽补给清额度或无限5秒换路径。固定6+1源不变。


v10.0全量特效：用户已授权133项方案全面实施。运行stage-v10.0-material-vfx；36武器/12主动/21Boss/40兵/成长骑宠与八反馈/七精英沿真实入口换表现，数值/碰撞/充能不变。vfx-brush连续凸条＋vfx-materials四共享层96总/64普通/28-4-32-32分层，新增一张1024²4MiB透明材质，本命连招共用世界层，禁止逐兵/逐命中新Graphics/Canvas。原横扫renderer仍A版；原PNG身份与Boss逻辑哈希保留。原概念册仅docs，新运行源/提示/哈希art/runtime-vfx-v10；真实132帧与两组加速GPU平台在art/reviews/vfx-v10，不当iPhoneFPS/旧闪退根治。包10.06MiB、presentation2.35，原CDN版本未变。见docs/vfx-upgrade-v10/实现说明.md。

v10.1退出排查：NpcActionRig按身份/前后方向查帧，spec与材质键预建；共享FX脏封装固定0–6参数，禁止恢复逐指令rest数组。Boss条用数值状态比较。诊断保留同会话最近battleSnapshot，previous单层、18趋势/8事件保持，写盘失败原因/峰值趋势可截图；savedAt0不显示1970。用户两张图上局v9.22/248秒、当前v10菜单，不能据此认定v10导致退出；旧JSC SIGSEGV与本次是否同因未定。详见docs/stability-v101.md。

v10.4 横扫六合以已采用的 A 稿「金锋回旋」为表现基准，沿用原始月牙刃面、暖白锋边与真实命中的金色碎屑。设计原图见 art/concepts/sweep-v5.1/01-golden-cleave.png。v10.2 金线与 v10.3 游龙均已撤下；其他技能继续使用 v10 特效。

v10.5 三少年共享的其余 11 招主动技能接入 skill-vfx-v10 的双侧收尖笔触，各自沿用真实弹道、火线、扩圈、剑轨与落点。主体用共享 Graphics 的实体色面与局部亮锋，复用箭形、受击碎锋和眩晕星；G03 继续使用独立 A 版与基线校验。武器及敌方特效仍按各自入口。

v10.6 大范围表现覆盖火烧连营、水淹七军、八门金锁、震军号令、星落五丈原、万箭齐发与雷霆万钧。以地面底色、移动主体和局部收尾形成前后层，仍由同一场景时钟和伤害节拍驱动。同层共享 Graphics，无额外纹理或逐弹新节点。详见战斗特效参考。

v10.7 雷霆万钧聚云0.20秒后四雷同帧判定，共用一次预声和雷鸣；独立入射方向在单目标重叠时仍可辨，同敌最多2雷、总18目标。v10.7.1 星落五丈原改为九颗陨石在0.35–1.47秒依次落地，间隔0.14秒，末颗触发终击星阵，每颗在下落开始时锁定落点。火烧连营改为横向点火、连续卷焰与随四次灼烧传递的亮锋，沿用480×80判定。

v10.8 武器与首领表现按真实出手、弹道、命中、危险区分层。36把武器、7位首领21招与本命连招的维护入口见项目 skill 的 combat-effects、weapon-evolution，以及 cocos-game-vfx 的 implementation、taoyuan-adapter。延续共享绘制与既有对象上限。

v10.9 武器与首领全套特效参照十二个英雄主动技，按刃、冲锋、箭、火水、阵、雷、落体、状态与回波选择对应画法。具体映射与同尺度验收见 combat-effects；各招仍由自己的真实事件和时钟推进。

v10.9.1 演武配置底板复用已有 UI 九宫格；演武按模拟时间单独采样，零秒战斗仍保留，收起配置立即记录。演武高频重合的部分大招共用短时视觉，不改判伤或正式模式。见项目 skill 的 training 与 performance。


v10.15 现役兵器 33 件，新档可得 30 件、预留 3 件；现代枪械退出三模式、图鉴和奖励，旧资格映射及配套被动见武器升阶参考。兵器重制提案与已实施内容分列。

v11.0 手办风首批：营地、三少年基础形态、六关沙盘与地表、农兵镰刀/锄头两套动作、暗黑张角与新版补给卡已接入。33兵器/12技能/40兵/7首领采用新目录图。草鞋、手戟、贯石弩、火油壶走共用攻击路径；其他重制规则与完整动画见待办。源图与运行图由 pack-redesign-art 记录指纹，现役农兵直接加载新透明图集，旧TYI1基线保留。见 docs/redesign/implementation.md。

v11.0.2 采用新版首页、选关、补给和结算，以及已接入的新版武器和技能。刘关张、普通兵、七首领及对应头像、六关战斗地表使用原版。新版六关缩略图专供界面，不能覆盖旧战场地表帧。见 docs/redesign/implementation.md。

2026-11-24全量手办风重制按设计范围交付，见docs/redesign。新版首页沙盘、刘关张、黄巾农兵、暗黑张角与成套概念板放art/concepts/taoyuan-redesign。兵器详细使用本地taoyuan-weapon-design skill；设计板、原型起测值与现行运行机制分开引用。
