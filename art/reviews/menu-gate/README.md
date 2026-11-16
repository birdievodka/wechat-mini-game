# 通用城门入口与首页分组 v9.11

menu.png是当前真实Cocos/WebGL首页：卷轴/布底/红绳/关名和六关环境配图保持；右下圆玉印由精确编辑后的纸面替换，通用城门为独立128²透明Sprite。三英雄头像与武器技能之间有短金线＋菱形，无新说明；首页演武入口隐藏，内部训练运行能力保留。

stage-picker/weapon-selection/skill-selection/battle均为当前运行截图。scripts/capture-menu-gate-review.mjs使用隔离浏览器9347/8777，实际浏览器触摸城门，按压缩放.94，只出现一个选关面板；整卡点击、初始武器、技能选择和开始进入第一波均通过。打开/关闭不改profile/storage，战斗中菜单子树0，运行异常0。仅WebGL检查，不宣称iPhone性能或听感实测。

本任务类型检查、分关挑战/演武/英雄成长/吕布/资源/加载回归与check通过；Web/微信已重新构建，运行版本stage-v9.11-menu-gate。CDN沿用已发布v95-996129359b44c659，不增加远程资源。通用城门源/输出指纹在art/runtime-stage-ui/switch-icon-source.json；去玉印源提示journey-no-seal-prompt.txt。

微信预览任务成功：总包9,092,364 bytes（8.67MiB），主包2,341,170 bytes。二维码在local/menu-gate-preview.jpg。
