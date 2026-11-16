# 资源维护：每类只保留当前版本

用户要求清理推理/生成产生的过期资源，仅保留最新。该规则用于本项目；不延伸到用户Downloads、其他项目、全局Codex缓存或飞书文档。

- assets为当前运行素材；先核对加载、裁格、meta、bundle及测试引用，不能凭版本号或文件修改时间删除。
- art/runtime-v4保留八张活跃共享图集和两张必要身份参考的生成源图、提示词；manifest仅列八张活跃运行图集。当前PNG无损alpha压缩备份在art/runtime-sources/png，按活跃assets维护；未量化源图防止重复压缩失真。
- 当前三英雄分层/武器图标、尖刀/肖像/海报修订、演武场各保留最终源图与提示词。它们和运行PNG不是可互换的重复文件。
- 同一设计只留采用版；横扫仅保留A。旧候选图、before图、重复预览、过期二维码/控制台dump删除；不为删除源图而留下失效的生成脚本。
- 每类保留一个最新报告或当前可用基线，明确版本和测量范围；Node压力、桌面渲染、微信特效定帧不是同类测试，不能互相替代。GIF已含原帧时不重复保留逐帧JPEG。
- 技能评审稳定输出docs/skill-review，只存README、机制JSON、一张总览及原飞书链接；单卡与拼图中间数据在内存或项目外临时目录生成。不默认生成Word或向飞书同步。
- 音频保留当前作曲母带/配方、当前试听与runtime文件；淘汰的曲风和逐武器重复试听删除。
- 新一轮修改直接更新当前文件，完成引用替换后删除被替代产物；历史用Git追溯，不再复制archive目录或按版本堆评审文件。清理前应有可恢复的Git检查点；本轮为06f7d1f，不改写历史。

完成后检查本地链接、生成链与manifest，同步skill目录，运行适当资源/行为检查。纯资源整理不刷新微信、不重置用户对局；不得通过删运行素材来声称包体减小。

吕布当前动作源图/提示/manifest在art/runtime-lvbu，运行图集assets/remote-content/boss-lvbu/lvbu-actions.png由pack-lvbu-art.cjs确定性重建；新PNG直接从源图缩放量化，不再次从量化成品处理。当前三招工程预览统一art/reviews/lvbu，后续覆盖而非堆积旧版。

v7只保留七Boss运行身份，六Boss16帧、吕布20帧、战兽24格与道具16格；新源图/提示/manifest在art/runtime-bosses。旧14Boss/3坐骑两张PNG和meta退出assets，v4原始身份源图作必要美术参考保留；pack-chronicle-art不再输出这两张，pack-lvbu元信息模板使用presentation/icons。七Boss最新画面覆盖art/reviews/bosses，不另建旧版截图目录。

五英雄当前源图/提示/manifest在art/runtime-youth（头像源在art/branding）。运行四张分层/肖像PNG保持原路径和meta UUID，三英雄分层缩为768²。pack-chronicle-art跳过两张成人英雄源，最后调用pack-youth-heroes，不能恢复旧头袍；原武器、士兵和Boss生成链不变。真实工程预览统一art/reviews/heroes。

v8用pack-stage-art.cjs从已批准themes.png裁出960×640共享stage-themes.jpg（约173KB，解码2.34MiB），每格上128为缩略图、下192为可复用地表；六关共一张纹理，不引入六张全屏图。stage-theme.ts补低矮边缘小旗/河岸/阔叶/星纹。StageViews复用现有图标，源图仍在art不进包；隐藏赵云/孔明保留资产UUID和旧记录。

v8.1新增stage-jade.png九宫格皮肤480×300，约87KB、解码0.55MiB，源art/runtime-stage-ui/jade-panel-source.png及prompts.json；pack-stage-art重建并保留alpha。原stage-themes共用图的缩略图改取已批准stage-picker稿，地面不改。

## v8.6兵种模块素材

art/runtime-enemy-actions保留四张内置image_gen生成的无手持武器身体源图、prompts.json、原四张troops基线、gear.png和manifest。四张运行图仍用原UUID，格96、5×13；0–19完整待机、20–39身体、40–59器械、60袖、61拳、62盾。旧pack-chronicle-art不得把它们恢复成5×4旧图；它在发现新manifest时跳过这四张。重建流程见enemy-actions参考。Boss人物/战兽原图未替换。


## v9英雄成长更新

v9成长素材新增art/runtime-growth/source.png、prompt.json、manifest.json；完整内置imagegen来源、三概念参考与加工哈希保留。scripts/pack-growth-art.cjs清alpha杂点/统一六帧尺度脚底，原生SVG绘单剑/刀/矛后合入growth.png；不能直接把五节点概念切格当动画。运行仅768×512一张约130KiB，概念源不入微信包。坐骑/最终袍以运行atlas为准。


## v9.1内存修订

v9.1减少常驻解码：旧成人身体/五张campaign图停止请求（v9.4已清理这些退役运行资源）；别名复用现行少年帧。macro.CLEANUP_IMAGE_CACHE与禁用动态合图在首次加载前设置。BattleSpriteAtlas现在62格1024²/4MiB，新增9种原生Canvas按钮/武器格9宫格，无新增下载PNG。加载页poster专用资源在交接后释放。


v9.3音频保留art/audio/review-v1试听源/音序/manifest与art/audio/runtime-manifest.json采纳记录，母带可由固定seed脚本重建，ignored local不复制进包；旧taoyuan-kaida.wav与10个兼容音效从assets删除。三首运行AAC约1MiB，86段PCM加草鞋共87声源；微信实际分包以构建报告为准。无持续背景环绕声，不按敌数新增播放器。


## v9.4 CDN按需分发（当前）

完整规则见[资源分发说明](../../../../docs/resources-cdn-v94.md)与[发布目录](../../../../cdn-assets/README.md)。本次可恢复检查点1ee84bc；旧成人/豆体/旧敌PNG、旧曲风母带/试听/音序/脚本清理，采用版的源图/音序/UUID/用户草鞋原声保留。旧runtime描述以本节为准，不能重新生成退役成人图片入包。

本地保留battle/campaign/chronicle-ui/chronicle-units/hero-menu/presentation/results/sfx-core八包。后六Boss移到assets/remote-content/boss-ID（保留meta UUID与像素），每Boss一远程Bundle，孟获人物＋战兽一起。builder配置cdn-assets只对miniGame远程，web/native评审仍本地。旧enemies/arsenal/talismans/meadow/orchard/music/sfx也远程。张角/40兵模块/六主题共享地面和核心受伤反馈本地，无网也不阻塞首关。

loadGameBundle/ResourceGate合并并发/失败不缓存。ensureBossArt两图原子提交、20秒超时、页面世代守卫；prepareBosses下载时冻结模拟并提供重试/返回。返回备战先解除演员引用，再销毁非张角帧/纹理。不能恢复启动全Boss下载或首屏请求兼容敌兵。

cdn-assets/release.json与published.json入Git；二进制releases忽略。build:wechat只导出，cdn:publish才由bytedcli上传并逐文件HTTP/SHA256验证；预览前两清单version必须一致。内容哈希版本不可覆盖/手改，CDN不能有JS/源码/密钥/调试日志。删除本地旧导出，不删除仍被旧客户端使用的云端版本。所有脚本留本地src/bundle-scripts；check-package-size验证远程没有重复进包，不关闭4MiB/19.5MiB线。

发布域名https://lf3-static.bytednsdoc.com已由用户配置到正式AppID wxbddcb8f0462f58cc；旧wxbf455170a0f5ea11是测试号。2026-11-16保持urlCheck=true，实际wx.downloadFile HTTP200、远程音乐与吕布/孟获战兽图集加载及退出释放通过（art/reviews/resources/validation.json），手机未实测。不要用旧号列表判断正式后台，也不通过关闭校验冒充成功。当前静态106文件/7.89MiB已公开下载校验；微信构建总包9.69MiB/主包2.20MiB。86逻辑音效→66物理PCM，省303280字节；本地sfx-core与远程sfx由生成器SOUND_ASSETS维护，释放clip按对象去重。


## v9.5（当前，覆盖旧启动依赖）

完整说明见[无损资源v9.5](../../../../docs/resources-lossless-v95.md)。本地剩7包，results与hidden-heroes远程共15组；旧两隐藏原图移目录但保留UUID/像素。三英雄原3×2肖像源保留art/runtime-youth/portraits.png，无损切上行到presentation/hero-hud，下行到远程results/portraits；不能把HUD头像也绑到远程结果包。低血≤2预取，死亡未就绪显示战报准备/重试；胜利不下载哭脸，回菜单先销毁UI再释放哭脸纹理。

海报唯一JPG在art/runtime-youth/poster.jpg，由微信构建和build:review复制到产物根；前置桥可复用，Web无桥同URL加载，不再恢复campaign重复副本。pack-youth-heroes后调用pack-deferred-art，所有肖像384原尺寸和像素不变。

农兵原采用PNG/meta存art/runtime-grunts，12帧和RGB/alpha完全保留。pack-grunt-art输出TYI1 BufferAsset，indexed-art本地解压为同1448×1086 RGBA后上传两纹理，BufferAsset立即释放；禁止再量化/缩尺寸/减帧来冒充无损。源RGBA/每帧/损坏数据/真实RenderTexture都需验证。fflate固定0.8.3，vendor-inflate生成带MIT声明TS解决Creator npm ESM误判；仅第三方生成文件ts-nocheck，不关闭项目检查。原压缩源指纹仍保留，并指向采用PNG的新位置。

当前验收：两农兵共24帧真实WebGL原PNG对照像素差0；微信正式号BufferAsset载入/远程哭脸384格/回菜单释放与profile隔离通过。构建8.34MiB（原9.69），远程8.66MiB/116文件已发布校验；真实手机仍由用户预览测试。详见art/reviews/lossless-resources/validation.json。


v9.6草鞋采用概念仅art/concepts/sandal-grip/design.png＋来源说明；运行用既有原生绘制和BattleSpriteAtlas同一草鞋格，无新运行PNG/远程资源。图标使用该格2倍密度帧，纹理仍1024²，弹体/持握恢复原逻辑握点；其余图集无重压缩。


### v9.6正式战场纯色背景回归修复

按需加载后正式关卡不请求演武旧meadow，drawTerrainFallback仍只判断world-ground，导致把不透明兜底画在已加载的本地stage-ground上层。现改为只在没有实际MeadowTile时填兜底色；主题贴图仍留本地，无需恢复额外网络请求。六关回归覆盖正确主题/无旧meadow不遮盖/真缺图兜底，真实Cocos逐关隐藏地面贴图前后像素差验收见art/reviews/sandal-grip/validation.json。


## v9.7清爽关卡卡与无字战场图

首页StageBriefView改500×280单层轻描边玉绿卡，464×185.6战场大图＋底部关卡序号/名称＋“切换 ›”。去成长题签、五波重复说明、首领嵌套徽章和金色花纹；整卡仍可选关，独立英雄进度/锁定规则不变。选关弹窗仍3×2，使用相同六图。

六张配图来自art/runtime-stage-ui/battlefields.png（内置image_gen；完整提示/哈希在battlefields-source.json），仅乡野战场/关隘/军营/江战/密林/高原，不含文字、数字、旗帜、题字和UI。pack-stage-art按2×3源图逐格裁到原960×640共用stage-themes上部128，六关地面下部192的原源裁格/缩放保留。不增纹理或远程包，不恢复旧stage-picker概念里带字配图。关名只由界面Label显示。


## v9.8行军地图备战卡

采用art/concepts/stage-journey/design.png。StageBriefView为640×400触摸区：600×400透明纸张/布底/红绳/纸签/空白玉印皮肤，原stage-themes切264×128的stage-map六帧放在后层，纸签名字与三枚箭头由实时UI绘制。图片无文字无旗；不把整张菜单概念当贴图。采用源/完整内置image_gen提示/哈希在art/runtime-stage-ui/journey-source.json，pack-stage-art确定性导出stage-journey.png，alpha不重复量化。

镂空窗仅一份菜单Graphics stencil（Mask.Type.GRAPHICS_STENCIL），避免配图从红绳外侧漏出。微信与Web评审的includeModules必须含mask；仅2d/graphics不导出Mask，不能只看类型检查即称运行成功。进入战斗时CampaignView.hide销毁整个菜单/遮罩节点，纹理600×400约0.92MiB、下载303230 bytes，六张配图不复制、不改战斗地面。

技能选择页的列表/详情，未解锁或未发现都用同源alpha剪影（RGB0/alpha108）；未知姓名/强度/收益仍隐藏，已发现可读详情，未解锁不可携带。图鉴与选择页两条独立路径都要验证，不能只修CodexView。


v9.10首关地面SpriteFrame从原格内缩2px排除图集邻区串色（316×188），相邻行列静态镜像接同一边并加大分格；像素源和960×640 atlas不改。缩略图、后五关采样范围与演武旧草地不变。


v9.11通用城门独立Sprite，stage-switch.png本地chronicle-ui包128²/64KiB解码，含4px透明安全边；pack-stage-art由universal.png确定性导出。原stage-journey源图已去烘焙玉印，仍600×400；六主题图/地面与远程资源版本不变。源/提示/输出指纹分别在journey-source.json、journey-no-seal-prompt.txt、switch-icon-source.json。
