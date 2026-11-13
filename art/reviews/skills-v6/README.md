# v6 技能实装验收

版本：chronicles-v6-skill-recast。

[12项实装总览](实装总览.png) · [重点技能关键帧GIF](重点技能.gif) · [验证与源码指纹](validation.json)

这些是实际Cocos WebGL浏览器中的工程布景：18名高生命静止敌兵、1500×750画布、正常技能施法入口和实际命中路径，非微信截图、真人战斗或iOS FPS测试。GIF由96个代表帧合成，展示火线、箭雨、剑阵和眩晕，非连续录屏。采集未捕获运行异常，结束恢复菜单，正式进度键未变。

源码：scripts/capture-skill-review.mjs与scripts/fixtures/browser-skill-vfx-review.js。使用独立Chrome测试profile/CDP9336与本地8766网页构建；menu守卫、120秒恢复watchdog。逐帧中间PNG已清理，只保留总览、GIF和报告。

自动验证：npm test、npm run typecheck、npm run check；test-skill-recast覆盖8箭/双倍攻速/火线/箭雨边界、三次格挡、40兵种和Boss5秒控制恢复、80敌连放回收。G03定义与sweep-effects SHA基线保持。

取帧后补充同种持续场地替换规则，纯绘制代码未变；相关行为/图形/演武回归、类型检查与微信构建通过，差异及运行源码指纹记录在validation.json。

说明：这是v6重制时的历史工程画面，包含现已在v6.1删除的金蝉脱壳，不代表当前技能名单或强度顺序。当前12项以docs/common-skills.md及docs/skill-review为准。
