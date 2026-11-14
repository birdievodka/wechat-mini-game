# 少年英雄运行素材

批准稿：art/concepts/hero-youth/design.png。内置image_gen生成；完整四份提示在prompts.json。战斗分层/开心哭泣源在sources，资料头像源在art/branding/avatar-source.png。

运行资源沿用现有路径和meta UUID，只替换五英雄：presentation/heroes、chronicle-ui/hero-parts、results/portraits、chronicle-ui/hero-portraits、campaign/poster。PNG由scripts/pack-youth-heroes.cjs重建，海报由sources/poster.png缩放1334×750并以85质量mozjpeg输出。角色属性、默认武器、技能、Boss与小兵均不变。

parts源的模糊RGB位于透明区；提取真实alpha连通体，去除12像素以下噪点，配对注册头部，保留精确缩放alpha与透明边。禁止把预览器显示的透明区RGB当成实底重绘。每次重建先跑test-presentation-art和test-youth-heroes。

manifest.json记录当前源/运行资源，protected.json锁定换英雄前a848884中的Boss/小兵。当前真实Cocos工程画面见art/reviews/heroes，不是概念板，也不是手机性能证明。
