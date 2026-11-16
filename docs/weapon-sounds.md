# 当前武器音效

36把武器按11类音色复用，实际出手与命中分别触发，草鞋继续使用用户原声且不加风声。受伤和危险反馈优先，最多六个音效声道；同次范围命中不按敌人数叠播。

现行路由在 `assets/scripts/weapon-sound.ts`，参数与物理文件别名由 `scripts/pack-game-audio.py` 生成到 `audio-catalog.ts`。86个逻辑事件共用66份PCM，草鞋另保留一份原声；核心反馈在 `assets/sfx-core` 本地，其他音效在 `assets/sfx` 远程。缺失音效可以预取，但不迟到补播。

详见[音频接入](audio-integration-v93.md)及[资源分发v9.4](resources-cdn-v94.md)。旧10段合成音效、逐武器试听、旧生成脚本已退役，可从 Git 检查点 `1ee84bc` 追溯。原绿豆/擀面杖的历史音色不代表仍有这些武器。
