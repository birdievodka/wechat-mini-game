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
