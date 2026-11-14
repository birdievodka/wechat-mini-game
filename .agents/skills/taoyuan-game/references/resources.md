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

吕布当前动作源图/提示/manifest在art/runtime-lvbu，运行图集assets/chronicle-units/lvbu-actions.png由pack-lvbu-art.cjs确定性重建；新PNG直接从源图缩放量化，不再次从量化成品处理。当前三招工程预览统一art/reviews/lvbu，后续覆盖而非堆积旧版。

v7只保留七Boss运行身份，六Boss16帧、吕布20帧、战兽24格与道具16格；新源图/提示/manifest在art/runtime-bosses。旧14Boss/3坐骑两张PNG和meta退出assets，v4原始身份源图作必要美术参考保留；pack-chronicle-art不再输出这两张，pack-lvbu元信息模板使用presentation/icons。七Boss最新画面覆盖art/reviews/bosses，不另建旧版截图目录。

五英雄当前源图/提示/manifest在art/runtime-youth（头像源在art/branding）。运行四张分层/肖像PNG保持原路径和meta UUID，三英雄分层缩为768²。pack-chronicle-art跳过两张成人英雄源，最后调用pack-youth-heroes，不能恢复旧头袍；原武器、士兵和Boss生成链不变。真实工程预览统一art/reviews/heroes。

v8用pack-stage-art.cjs从已批准themes.png裁出960×640共享stage-themes.jpg（约173KB，解码2.34MiB），每格上128为缩略图、下192为可复用地表；六关共一张纹理，不引入六张全屏图。stage-theme.ts补低矮边缘小旗/河岸/阔叶/星纹。StageViews复用现有图标，源图仍在art不进包；隐藏赵云/孔明保留资产UUID和旧记录。

v8.1新增stage-jade.png九宫格皮肤480×300，约87KB、解码0.55MiB，源art/runtime-stage-ui/jade-panel-source.png及prompts.json；pack-stage-art重建并保留alpha。原stage-themes共用图的缩略图改取已批准stage-picker稿，地面不改。

## v8.6兵种模块素材

art/runtime-enemy-actions保留四张内置image_gen生成的无手持武器身体源图、prompts.json、原四张troops基线、gear.png和manifest。四张运行图仍用原UUID，格96、5×13；0–19完整待机、20–39身体、40–59器械、60袖、61拳、62盾。旧pack-chronicle-art不得把它们恢复成5×4旧图；它在发现新manifest时跳过这四张。重建流程见enemy-actions参考。Boss人物/战兽原图未替换。


## v9英雄成长更新

v9成长素材新增art/runtime-growth/source.png、prompt.json、manifest.json；完整内置imagegen来源、三概念参考与加工哈希保留。scripts/pack-growth-art.cjs清alpha杂点/统一六帧尺度脚底，原生SVG绘单剑/刀/矛后合入growth.png；不能直接把五节点概念切格当动画。运行仅768×512一张约130KiB，概念源不入微信包。坐骑/最终袍以运行atlas为准。


## v9.1内存修订

v9.1减少常驻解码：旧成人身体/五张campaign图停止请求，源码资源保留；别名复用现行少年帧。macro.CLEANUP_IMAGE_CACHE与禁用动态合图在首次加载前设置。BattleSpriteAtlas现在62格1024²/4MiB，新增9种原生Canvas按钮/武器格9宫格，无新增下载PNG。加载页poster专用资源在交接后释放。
