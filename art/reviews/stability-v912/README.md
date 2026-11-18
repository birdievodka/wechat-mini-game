# v9.12 闪退排查证据

- props-before/after.json：同视口真实Cocos/WebGL中性物件夹具，3动物＋4回血物＋3精英冠。记录绘制前/填池/清场后，缓冲加纹理净省22.00MiB；不是整游戏峰值或iOS RSS。
- props-after.png：原造型共享Sprite后的真实画面。
- pressure.json/png：80混合兵种、实际预加载吕布/董卓、成长5、六件IV武器与主动技能，18,000模拟帧、逐帧GPU提交；无异常，缓冲和纹理有界。桌面软件WebGL工程夹具，不是原机FPS或手机长测。
- native-health.json：最终微信模拟器正常第一波低频快照，6固定音效实例、29次onPlay、0音频错误、队列清空。只包含运行指标，不含账号/认证数据。
- native-result.jpg：上述普通战斗结束的真实模拟器画面；站立未操作导致失败，属于正常扣血，不是闪退。

完整结论与限制见docs/stability-v912.md；没有原iPhone系统终止日志，不将工程内存优化冒充已确认的原机崩溃根因。
