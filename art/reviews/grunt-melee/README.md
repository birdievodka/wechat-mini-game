# 黄巾农兵近战样板 · v8.5

本目录为真实 Cocos WebGL 工程布景，不是概念图或手机录屏，不代表玩家通关成绩。`attack.gif`由72个24fps模拟步对应的渲染帧裁切并放大2倍合成，前半为镰刀、后半为锄头；完整画面保存在两组raise/hold/strike/recover.png。direction-0/1/2/3为下/右/上/左蓄势画面。

实际场景观察：抬手0.38秒时仍5心，挥下约0.51秒时4心；四朝向0.25秒蓄势均不扣血。具体时点见validation.json，行为边界见scripts/test-grunt-melee.cjs。取消E01接触伤害，伤害只在0.48秒释放一次，不能仅以贴身代替挥击；其他兵与Boss保持原规则。

资产直接复用assets/battle/characters/soldier-sickle-actions.png与soldier-hoe-actions.png，无新增角色贴图。全程同一身份，正/侧/背动作，左向镜像；小蓄势笔触和短刃痕在既有spellFx共享图层，不为每名小兵增加Graphics。

复取：独立本地WebGL构建服务8766、独立Chrome调试9336，执行scripts/capture-grunt-review.mjs。脚本仅在menu进入工程布景，保存并恢复Run/profile/localStorage，含120秒watchdog；禁止连接用户正在玩的微信对局。

后续v8.6已按用户授权推广到全40兵/7Boss；本目录仍保留v8.5样板原记录，当前行为与最新验收见../enemy-actions，不把这里“其他兵与Boss保持”当作现行限制。
