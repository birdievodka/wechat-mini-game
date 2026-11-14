# v9.1 iOS闪退后的内存排查

这是独立桌面Chrome/Cocos WebGL工程夹具，非手机游戏录像/正常战绩，不把GPU计数当进程RSS、iOS FPS或原机闪退根因。版本stage-v9.1-memory，对照版本stage-v9-hero-growth。用户尚未提供机型/系统终止日志。

pressure-before/after：相同80混编兵、成长5骑乘本命＋五件IV武器、星落五丈原，600模拟帧，每帧提交；默认视口相同。battle-before/after是真实画布，不做重绘。两个加载页模型已消失；核心特效、出兵/伤害/CCD/池容量保留。

session-before/after：在上述战斗预热后，菜单→战斗→四卡商店→返回菜单循环4次。检查模型/节点/纹理/缓冲，并完整恢复Run、profile和localStorage。循环后数量稳定；不会把缓存保留和真实泄漏混为一谈。session-ui-control是在同一新版本禁用共享按钮/武器格缓存、走原Graphics回退的控制组，排除其他改动影响。shop-graphics-control/shop-cached用于同尺度核对缓存边框/阴影/按键/文字，都是当前真实引擎画面；黑屏导出未用于证据。

pressure-long：300秒模拟、18,000次更新、每20帧实际提交；3首领为吕布/孟获/司马懿，加混合兵种仍总80，成长骑乘＋六件IV武器，测试长期池/缓冲有界。此稀疏提交不代表连续60Hz峰值或真实手机运行300秒；0脚本异常、存储恢复。原诊断脚本使用10分钟watchdog/finally恢复，只接入独立8766/9336，不碰微信玩家对局。

具体量化在docs/performance-v91.json；纹理上传后清理源图的CPU内存收益未计入GPU数字。未减少图像源分辨率、敌人数或特效预算。
