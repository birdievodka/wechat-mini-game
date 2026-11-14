# 英雄成长v9真实Cocos工程评审

由scripts/capture-growth-review.mjs在独立Chrome真实Cocos WebGL运行时生成；不是概念重绘、不是微信手机截图，也不代表真人通关成绩或iOS帧率。夹具预置3英雄×0–6连续通关记录，经正常菜单开始入口派生成长，验证21状态；初始/本命/骑乘/冲刺/最终短甲分别截图。

三份combo.gif各是实际自动选敌/攻击时钟驱动的完整三连循环，不手工设置连段阶段；每份90帧，截图关键阶段0/1/2。six-weapons-dash展示本命一槽+普通五件与Q冲刺。first-clear-growth-reward是工程首通结算，展示新增永久成长与共享解锁。

validation.json记录版本stage-v9-hero-growth、状态/三连、运行异常及档案/存储完整恢复。脚本覆盖原update/存储前备份，finally和240秒看门狗恢复；不接入玩家微信会话。

pressure.json/pressure.png由diagnose-stability.mjs生成：80个混合40兵种、六件IV武器、成长5骑乘本命与主动技能；600模拟帧、5段采样。真实绘图缓冲首段49722576至末段49728168字节，纹理155185632字节保持，场上80敌、Graphics144/活动模型21保持，运行错误0。堆包含GC波动，采样不构成手机进程内存或长战斗稳定性证明；未报告手机FPS。
