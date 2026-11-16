# 面板关闭与对齐 v9.9

本目录为真实Cocos/WebGL当前画面：技能、初始武器、图鉴、演武配置、暂停、替换武器。捕获入口scripts/capture-panel-review.mjs，端口9336/8766为独立测试浏览器，不操作用户微信存档。

validation.json记录实际浏览器触屏关闭：技能/初始武器/图鉴/演武/暂停/替换均复用同一ui-panel-close SpriteFrame，64×64触区，1024²图集，无各自Graphics。暂停连续开关两次；演武X收起回战场；替换X不扣钱、不改装备；退出后profile和持久存档未变，运行异常0。商店满六槽及金币是显式工程夹具，不是正常试玩或手机性能验证。

同任务npm test、typecheck、check通过，Web与微信均重新构建。微信预览任务成功：9,080,092 bytes，主包2,338,110 bytes；CDN沿用已发布v95-996129359b44c659，本任务不增加远程图片。不宣称iPhone已实测。
