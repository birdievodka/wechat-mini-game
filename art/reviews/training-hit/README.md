# 演武受击反馈 v9.2.1

capture-training-hit.mjs在独立真实Cocos WebGL走演武入口、关闭配置、让E01实际AI抬手攻击；只停用英雄自动攻击以保留敌人，没有手动推进attack或直接调用hurtPlayer。

training-hit.gif连续4秒模拟/60采样帧，accepted-hit.jpg捕获实际红闪/−1飘字，recovered.jpg显示1.2秒后退闪；trace全程HP5/phase battle/training true，验证会受击而不死。声音代码仍原命中采样，静态图不能证明手机扬声器实际播放。

validation.json记录版本、每帧状态、0运行错误及profile/localStorage恢复。独立评审/240秒watchdog/finally，不改微信玩家战局，不代表iOS帧率或真实通关。
