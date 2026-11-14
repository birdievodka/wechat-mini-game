# 性能与 iOS 战斗稳定性

用户反馈iOS战斗中闪退，未获得机型或系统终止日志。下面是已经验证的性能热点和减压措施，不能据此断言已查明那次闪退根因，也不能用桌面测试保证所有iPhone稳60帧。

## 保留的体验与边界

- 敌兵数量、属性、武器伤害、持续碰撞、技能范围和战斗计时不变，物理仍按最多1/120秒子步进。
- 原有11武器、三英雄分层特效、剑阵切割弧、张角预警和落雷保持。粒子280槽/表现36槽及优先级不变，不通过删技能或降伤害换速度。
- 每个显示帧仅最后一个物理子步重画动态袖子、挥击线、剑阵尾弧和出生/施法图形。小兵对象池每次复用的贴图/分层初始化、首次显形前的最终身份确认例外：即使在非显示子步也执行一次，防止出生时沿用上个兵种；不是恢复每个物理子步重画。中间子步仍做移动、出手、命中和技能逻辑。单独调用simulate的工程测试默认照常表现。
- 拳头按英雄/左右/握持状态缓存；投射物按武器/品级缓存绘制；隐藏袖子和空警告层不反复clear。敌军帧只在变化时赋值，受击色只在状态变化时切换。
- Cocos 3.8.8本机源码`graphics/webgl/impl.ts:clear`会移除MeshRenderData；对应`render-data.ts`清理/重建顶点缓冲和TypedArray。因此减少无效Graphics.clear是减少缓冲分配/回收，不只是减少几行JS。未改引擎内部实现。
- 主场景深度排序使用复用数组，只在节点索引改变时setSiblingIndex；英雄袖子和手掌也不重复写相同层级。
- 圆碰撞先比较平方距离；投射物命中排序使用复用槽，仍按首次接触时间稳定排序；命中中心及剑阵连续碰撞点复用。不能删除连续碰撞或改成只判断帧末距离。
- 剑阵点复用必须先完成所有命中，再改写previous坐标，不能把本步位置当上步位置。
- 临时技能/雷圈列表原地压缩；不无限保留已死亡对象的动画更新。

## 内存和掉落

- 小兵伤害数字用共享CHAR缓存，区域112×34，不再使用默认700宽的独立整段文本。字体/颜色/字号固定；不启用大动态合图或BITMAP去换额外内存。[Cocos Label缓存说明](https://docs.cocos.com/creator/3.8/api/en/enumeration/CacheMode)
- 地面金币最多128个节点；满池时合并到最近金币的value，拾取与补给回收必须按value计价。正常拾取显示+1，堆叠显示纯数字+N，没有“铜钱”单位。万元突发掉落、吸附、回收和重复回收已验证价值守恒。不能满池直接丢奖励。
- 弹体160、敌箭80、回血物4、粒子280和表现36的现有上限保持。敌兵复用，未改每波出兵预算。
- PNG文件压缩只减少下载包，不等于减少RGBA贴图运行内存。本版不改变源图尺寸/裁格/alpha，也不擅自开启iOS高性能模式。

## 本地故障记录

`runtime-health.ts`可选注册wx.onMemoryWarning/onError/onUnhandledRejection，并在onDestroy精确注销。战斗每5秒低频保存`taoyuan-runtime-health`，最多8事件，含版本/阶段/模拟时间/武器/对象池数量和帧间隔统计；保留上一会话的末尾概况，不递归嵌套历史。无上传、无每帧storage写入，也不捕获后继续运行错误战斗。

内存告警后仅暂停15秒priority=0的装饰尾屑，保留核心粒子、出手/命中形状、技能、敌方危险提示与所有伤害判定。不是常态降特效或强制GC；恢复后自动重新发射尾屑。记录写入失败不阻断游戏。异常退出仍可能没有JS回调，需用iOS系统终止日志确认内存杀进程等原因。

[Cocos iOS内存诊断指南](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/ios/optimize.html)区分JS/GPU/Canvas/音频内存；不得只凭JS堆大小排除系统内存压力。

## 验证与指标

- `npm test`包括test-performance：静态拳头缓存失效、万元掉落守恒、128金币复用、CHAR伤害字、慢帧只画一次、80敌/六剑阵3600帧、弹体满载12轮、故障记录限长和监听注销、告警保留技能粒子。
- `npm run profile:battle -- docs/performance-node.json`保留当前Node/Cocos桩CPU与绘图调用采样，含六剑阵、六枪、混装和chronicle-mixed；这是CPU夹具，不是iOS FPS、GPU内存或真人通关成绩。
- 真实引擎核对需另记录版本、特效、素材/脚本错误、压力后池大小和恢复选人结果；工程夹具不冒充真人试玩。手机实际闪退是否消失仍需原设备复测。

## v4内容扩展后的约束

新增十个紧凑共享图集，RGBA解码约15MiB，PNG减包不抵消该内存开销；没有按章加载几十张大图。敌军最多4个Sprite动作层，缓存切帧，绘制只在显示子步，阵营色/受击色复用Color常量。UI与敌军各一个共享资源bundle，场上仍按章仅4～6类机制投放。

新增友方场地/随从共享预算：12陷阱/8阵/12木牛，36友方延迟弹、24敌方延迟弹；6危险区普通最多3，死亡/卖出/切章清理。160弹体/80敌箭/280粒子/36表现/128金币保持，碰撞不依赖特效池是否满。过多源实例要替换最旧同源，不允许数组无限涨。

test-performance含40类型混编与司马懿、孔明、六新武器1800帧；profile:battle的chronicle-mixed包含80敌+100金币。docs/performance-node.json仅Node桩CPU/绘图调用；测试时多个Node任务可能并行，不能与不同机器或负载的旧报告直接当A/B百分比。真实iOS完整征程、峰值GPU/纹理内存和闪退回归仍需用户设备复测。


## v4.3：密集敌兵与特效

用户确认敌人/特效多时卡顿。性能边界不变：80敌兵、160友弹、80敌箭、128金币、280粒子/36表现和物理子步/CCD、伤害/掉落/难度均保持。

- 本机3.8.8引擎graphics.ts的activeSubModel为每个非空Graphics分配65535顶点与双倍索引的固定缓冲；小金币也会占用大缓冲。不能给数百个金币、出生环、弹体分别保留Graphics。
- BattleSpriteAtlas只在启动时烘焙现有程序图形，46格共用1024×768纹理约3MiB，alpha紧裁并保存原握点；金币含投影、36武器弹体/剑阵本体、出生光圈/散点、6类敌箭改为共享Sprite。弹体池换武器或箭型只改帧，节点不反复建销。失败回退原图形绘制，组件销毁释放帧/纹理。
- ParticleSprites按固定280槽按需复用Sprite；6种抗锯齿形状共用96×64白色mask24KiB，只更新位置、角度、缩放与淡出色。命中/爆发、复杂技能、刀光/雷阵仍保留共享Graphics，危险提示优先级不变，不降分辨率、不减少粒子数量。
- 剑阵切割弧三层单位路径预计算，免除每帧每把剑30个临时坐标数组和重复三角计算；新兵分层尺寸和颜色只在切向/尺寸/受击/阵营变化时更新，脚步和头动保持；延迟敌弹/友弹与友方阵地列表原地压缩。
- test-performance补充280可见粒子不丢失/零重复上传/真实alpha/裁剪/清理/销毁、共享Sprite弹体切换复用/CCD命中、金币无Graphics和出生环/箭型复用；原3600帧六剑阵/1800帧混编/金币守恒等继续覆盖。Node无Canvas时用原矢量回退；额外提供确定性帧夹具覆盖Sprite实际分支。

微信渲染对照为单独**工程视觉夹具**：fresh menu启动、80兵＋100金币＋280粒子、300帧后240帧计量，没有战斗进度/生命/金币作弊成绩，也没有存档写入。代码scripts/fixtures/wechat-render-pressure.js；非menu/defeat/victory主动跳过，结束恢复界面并验证Run未变，18秒watchdog恢复。before为v4.2，after为v4.3；真实统计和截图见docs/performance-wechat-baseline.json与art/reviews/performance-v4.3。数字只代表微信桌面模拟器的gfx统计，不是iOS峰值内存、手机帧率或那次闪退的根因证明。

最终有效微信对照：Draw Call中位255→57（−77.65%），三角形29589→5623（−81.0%），gfx缓冲547467704→75639240字节（−86.18%，约522→72MiB）；纹理115715828→118886132字节（约+3MiB）。帧间隔中位仍18ms，P95仍19ms，不宣称桌面FPS提升。原始数据与范围说明在docs/performance-wechat-baseline.json。实际截图检查中修复过Canvas剪裁路径残留，必须保留alpha裁格断言和回归。


v5继续保留v4.3共享贴图优化；CommonSkillEffects≤32视觉、CommonSkillRuntime≤36任务，六剑阵＋箭雨3600帧和章17混编六武器＋流星1800帧验证上限。旧v4.3 A/B数字不直接套作v5手机帧率；当前仍需原iOS设备复测。

v6：缓存图集由46格增至48格，仍1024×768、约3MiB解码；两张技能图标不新增纹理。技能箭由36任务内的飞行任务结算，箭雨整片复用1视觉；控制标记最多80，不创建每兵Graphics。test-skill-recast覆盖80敌混技能1200子步的有界性，手机FPS仍需实测。

v6.2：背水一战五倍攻速沿真实武器冷却/动作与剑阵命中间隔生效，不加单次伤害。保留160友弹、80敌箭、280粒子、32技能视觉等固定预算，出手拖尾仍限70ms；回归验证五秒到期与高攻速混装压力，不将Node预算测试当iOS FPS。

v6.3吕布新增768×576共享图集（约130KiB文件、1.69MiB RGBA），每个实例最多3个Sprite、没有新增逐Boss Graphics或粒子池。绘制用缓存颜色/36段轮廓/共享TypedArray；80吕布压力验证最多4主招且与原危险区合计≤6。实际iOS帧率仍待原设备复测。

v6.4吕布将新增8帧小跑合入同一768×960纹理，约204KiB/2.81MiB RGBA，无新增材质或逐帧插值Sprite；注册与噪点过滤只在打包时执行。每帧只读gait与blend，不增加Graphics或扩大攻击/粒子池。

v6.5仅替换同尺寸20帧图集配色（约206KiB/2.81MiB RGBA），横扫半径300但仍36段共享轮廓、两个短拖尾，不新增Sprite/Graphics/粒子池。较大覆盖区域需原iOS用户体验，Node与独立Cocos结果不等于手机FPS。

v7新增八图集13.28125MiB RGBA，移出旧Boss/坐骑2.8125MiB，净纹理增量10.46875MiB；源概念不进包。260展示框只缩放Sprite，四步/alpha注册在打包时完成。BossEffects复用最多86材质Sprite、共享Graphics及颜色，深度排序统一，单位锚点/尺寸仅变化时更新；80混合Boss1200帧验证4主招/6危险区/80移动物/12召唤上限，不是iOS FPS。新模型与真实引擎定帧在docs/seven-bosses.md。

## v8.3：战斗时释放隐藏界面

用户再次反馈战斗闪退，仍未获取该手机的系统终止日志。真实Cocos WebGL复现确认：CampaignView.hide原先仅active=false，隐藏选人页仍持有23份Graphics GPU模型；隐藏商店和演武配置也会继续保留绘图缓冲。这是确认的额外内存占用，不能直接等同原机闪退根因。

CampaignView.hide/TrainingView.hide现销毁子树并清理视图引用，选择/道具/装备只存Run/profile或配置字段，返回时重建，不保留隐藏画面。resize不得访问已销毁的content，关闭商店的同帧正常恢复战斗。通用技能、敌兵强度/数量/刷兵速率和所有伤害不变。

六武器槽底板加入BattleSpriteAtlas的5个品级/空槽格，原程序轮廓颜色不变，共用53格1024×896（3.5MiB，较旧+0.5MiB）；消除6份独立Graphics GPU模型。缓存失败仍有原绘制回退，故障快照记录atlasReady，不能把Node无Canvas的回退路径视为手机图集已成功。

RuntimeHealth每5秒低频保存，增加stage/wave/hero/skill、武器品质、敌弹池、atlasReady、gfxBuffers/gfxTextures；错误保留至多1000字符栈，8事件和单层previous，仍仅本地、无上传。gfx计数不是iOS进程总内存，原机是否停止闪退需复测。

scripts/diagnose-stability.mjs只连接独立8766/9336评审环境，真实引擎80敌/6武器/星落五丈原2400帧，读device.memoryStatus与模型数量；结果见docs/performance-v83.json。不连接用户微信对局、不报告工程夹具为真人成绩或手机FPS。UI回归覆盖离店子树释放/resize/重建、演武反复展开收起和正式存档隔离；性能回归覆盖6槽Sprite分支及5秒故障记录/栈限长。

## v8.6动作预算

40兵共四张480×1248 RGBA纹理（约9.14MiB解码，替代旧四张约5MiB，并非PNG体积）；模块每池对象最多9个Sprite，器械仅3个可见。袖/拳/武器alpha紧裁与共纹理；方向帧和裁格按身份缓存，姿态对象复用，禁止新增逐兵Graphics。蓄势笔触/短刃痕继续共用spellFx，现有80敌/80敌弹/6区/280粒子不扩容。真实桌面与手机验证分开报告，不据Node回归声称iOS不卡/不闪退。


## v9英雄成长更新

v9成长渲染预算：一张768×512 RGBA growth.png，132987字节、解码1.5MiB；三坐骑×6姿势+最终袍/单件持握武器同图。每hero一个mount Sprite，刘追加Sprite复用原offhand Node，刀锋复用w.trail、冲刺复用g.fx；不逐敌新增Graphics/计时器。脚底同排统一注册、防alpha离散杂点；实际桌面压力证据见art/reviews/hero-growth，不能当iOS FPS/闪退结论。

本轮实际压力：80个混合兵种＋成长5骑乘／六件IV武器＋主动，600模拟帧。WebGL buffer 49722576→49728168 B，texture 155185632 B不变，Graphics 144、活动模型21，运行异常0；来源art/reviews/hero-growth/pressure.json。测试10秒模拟时长，不代替长战斗和原机iOS验证。微信构建主包2.17MiB/总19.17MiB，微信预览实际统计20073320B，低于20MB接口限制与19.5MiB项目安全线。


## v9.1：常驻图像与商店峰值减压

用户再次反馈闪退，仍无具体机型与iOS系统终止日志。已确认以下冗余并修复；这些是内存热点，不是原机闪退根因的证明：

1. 原生资源已共图集，但浏览器实际额外生成2048²动态合图。GameBootstrap.start在任何美术请求前设置dynamicAtlasManager.enabled=false、macro.CLEANUP_IMAGE_CACHE=true。前者避免额外纹理复制，后者依3.8.8 SimpleTexture._assignImage的公开macro流程上传后释放ImageAsset依赖，不改引擎内部。所有源图清晰度/alpha/裁格不变；依赖像素源做运行重打包的后续代码须重新审查。BattleSpriteAtlas用独立Canvas一次生成，不依赖已清理源图。
2. 加载页两帧交接后retireLoadingSurface，移出并销毁整个一次性UI树、清loadingView/Label引用，删除artFrames.poster并释放专用poster texture/bridge图。浏览器campaign海报用releaseAsset，微信专用startupTexture/ImageAsset显式销毁。加载失败时不释放错误画面；resize/晚到回调可处理已退场状态。
3. 旧liubei-bean-body与campaign的5张成人头像/身体不再请求。liubei-body启动任务改由已加载的少年torso与胜败肖像组装后完成；旧键指向当前少年帧。onDestroy对别名帧Set去重，只销毁一次。旧源图仍保留兼容来源/包，不把未加载资产当已从包删除。
4. 商店按钮底板和装备格复用BattleSpriteAtlas新增4种Pill/5种槽底板、SLICED九宫格，保留圆角、描边、阴影、按压/可购/售罄/替换行为。62格1024×1024 RGBA=4MiB，较53格只多0.5MiB；消除该商店13份独立Graphics模型（约29.25MiB缓冲），缓存失败/未知颜色仍原矢量回退。不能为每个按钮新建Texture，不能把九宫格边缘拉成直角。

真实独立桌面Cocos A/B，同视口/80混兵/成长5骑乘本命＋五件IV武器/星落、600帧且每帧提交：buffer+texture合计195.42→162.94MiB，少32.48MiB（16.62%）。先该战斗预热再4次菜单→战斗→商店→菜单，商店合计257.73→196.00MiB，少61.73MiB（23.95%）；同帧Draw Call均74，不宣称帧率提升。新版本关闭UI缓存的控制组与原Graphics画面另存，可分开验证UI缓存贡献。

额外300秒/18000帧模拟、每20帧提交一次，80混编含吕布/孟获/司马懿三个首领、六IV武器：buffer47360564–47361056B、texture125893800B不变、0脚本异常、profile/storage恢复。此稀疏提交验证长期有界，不是连续60Hz GPU峰值、手机300秒或真人通关。JSON与截图见docs/performance-v91.json、art/reviews/stability-v91。CPU解码源图减少未计入上述GPU计数。原设备是否停止闪退仍需用户复测。

新增diagnose-session-memory覆盖循环与UI缓存控制组；diagnose-stability支持STABILITY_FRAMES/RENDER_EVERY/BOSSES，带独立会话守卫、10分钟watchdog、finally完整存储恢复。test-performance验证未请求旧图/缓存策略、加载退场、resize、别名析构一次、商店六格/按钮Sprite分支；原280粒子/160友弹/80敌箭/80敌与CCD/伤害不变。


## v9.2结算与走位

v9.2结算复用现有hero-menu背景/少年/坐骑；米白/朱红CTA复用BattleSpriteAtlas九宫格，奖励全为现有Sprite，无逐奖励Graphics。心数最多12仍同一Graphics，未添分行模型；远程比例提高但80敌/80敌弹/4普通远程并发/原成本与器械限制保留，不取消v9.1图片清理与缓存。
