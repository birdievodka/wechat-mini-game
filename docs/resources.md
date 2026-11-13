# 当前资源索引与保留规则

本项目仅保留每类当前采用的设计、当前可用验证和必要生成源图。旧方案可从Git提交06f7d1f及此前历史恢复；不再在工作目录累积archive或重复版本。

| 目录 | 保留内容 |
| --- | --- |
| assets | 全部当前游戏运行素材与meta |
| art/branding | 当前小游戏头像、标题Logo源图、游戏名与简介及完整提示词；头像不进入运行包，Logo导出至hero-menu |
| art/runtime-lvbu | 当前吕布20帧动作的两张源图、生成提示及裁格manifest，运行图由pack-lvbu-art重建 |
| art/reviews/lvbu | 当前吕布三招真实Cocos工程帧、合成GIF和平台验证记录 |
| art/concepts/boss-seven | 七Boss三招概念，吕布已采用，其余六位待实现 |
| art/runtime-v4 | 当前战役十张源图、prompt与裁格manifest |
| art/runtime-sources/png | 38张当前PNG的压缩前原图及哈希清单，避免重复量化失真 |
| art/concepts/presentation-v3.0 | 当前三英雄分层与武器图标的生成源图 |
| art/concepts/weapons-v3.1 | 当前尖刀、扁担、肖像与加载海报修订源图 |
| art/concepts/hero-select-v4.2 | 当前桃园演武场背景源图与提示 |
| art/concepts/sweep-v5.1 | 已采用的横扫A稿与提示 |
| art/reviews/golden-sweep-v5.1 | 最新横扫微信合成GIF、峰值与菜单截图 |
| art/reviews/performance-v4.3 | 最新可用桌面渲染A/B基线截图与清单，非v5.1手机FPS |
| art/audio | 当前音乐母带/配方/试听及武器声音总览 |
| docs/design | 一套当前战役、兵种、武器、英雄、经济与验证说明 |
| docs/skill-review | 当前12技能机制与一张总览，原飞书快照链接 |

当前报告：[战役交易模型](chronicle-balance.json)、[Node压力采样](performance-node.json)、[桌面微信渲染基线](performance-wechat-baseline.json)、[横扫A取帧记录](golden-sweep-v5.1-validation.json)。每种测量独立保留最新可用一份，不能把旧基线当作当前手机实测。

生成中间件使用内存或项目外临时目录；当前构建build/wechatgame不受本次清理影响。生成链与后续更新要求见[skill资源维护](../.agents/skills/taoyuan-game/references/resources.md)。
