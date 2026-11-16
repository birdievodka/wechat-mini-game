# 首关草地接缝与补给标题 v9.10

before.png在独立Cocos/WebGL用原520×470分格及原320×192裁格重现旧地面；after.png调用正式rebuildMeadow，首关720×540目标格/交替镜像/原格内缩2px采样，硬接缝与邻图串色细线消除。north-east/south-west为平移镜头检查，battle为带英雄/HUD画面。没有新增运行图片、纹理或材质；1440×750视野下地面Sprite由15降9，仍共享960×640纹理。

supply.png为四卡补给的标题/提示左对齐，二者边缘均与第一商品左缘-532一致。商品内容/金币为工程展示夹具，不是实机购买或通关取证；商店取消/购买由test-ui-layout行为回归覆盖。验证入口scripts/capture-meadow-review.mjs，等待异步草地准备后再重建旧版夹具，并防止加载回调使前后画面错误相同。

validation.json记录当前runtime、图集裁格、九块变换、后五关保持原图及原变换、标题对齐、profile/storage未变和异常0。类型检查、资源回归、商店回归与check通过，Web与微信构建完成。微信预览总量9,080,321 bytes，主包2,338,339 bytes，CDN沿用v95-996129359b44c659。不是iPhone FPS或画质实测。
