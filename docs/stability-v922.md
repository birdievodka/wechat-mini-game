# v9.22：根据原机记录规避高频文字缓存

## 已收到的证据

用户截图中上一会话为stage-v9.20-endless-memory：无尽326秒、第10轮，小张/G22万箭齐发，太平要术III、火油壶IV、霰弹枪III、爆竹IV、火油壶IV、霰弹枪IV。最后采样13活敌/23敌池、103粒子、21友弹池/9敌弹池、缓冲60.8MiB/纹理95.7MiB；旧版未记录活动弹数，界面“—”不是0。内存警告0、可捕获JS错误0。旧记录没有时间戳，不能严格绑定到18:14的系统日志，也不能拿最后一次采样代替崩溃瞬间或全局峰值。

异常页显示上一局和当前均audio-error×1、native-music playback error；当前菜单也有同类事件。音乐异常真实存在，但没有证据将它与已确认的JSC SIGSEGV建立因果关系。

18:14原生日志的有效结论见stability-v921.md：游戏JS服务线程在JSC字符串解析/属性访问发生原生非法内存访问。没有项目JS栈，不能声称某个TS表达式就是根因。

## 针对性规避

本机Creator3.8.8的cocos/2d/utils/text-utils.ts中safeMeasureText每次构建font＋Unicode分隔字符＋文字的键，LRUCache.get再用该键索引对象。包含UTF16字符串解析/属性读取，调用形态与原生栈相符，但不是已确认源行。

- 高频敌军伤害飘字由BattleNumber使用共享Sprite数字，绕过Label的运行时测字/字形缓存。不修改Cocos/JSC，不用异常捕获伪装能拦截SIGSEGV。
- 原BattleSpriteAtlas87格占用11行中的空余第88格绘制13字符（0–9、−、＋、/），39px Arial启动一次烘焙，按21px显示、原红色。仍同1024×1408/5.5MiB，没有新贴图/下载/材质/Graphics。备用数字烘焙单独容错，失败仍用原Label，不能导致整个战斗图集回退。
- 每敌保留原node位置/弹跳/时长与最后一次伤害文本语义；string setter只标记dirty，GameBootstrap.lateUpdate在绘制前每帧合并刷新一次，避免霰弹/持续伤害同帧多命中导致重复Sprite属性写入。数字子节点惰性生成、后续命中/清场复用，异常输入最多24格。原enemy.text仅消费node/string的结构端口，真实hitEnemy接入；HP、范围、击退、武器/技能伤害和敌数保持。
- 清场隐藏/复用、组件销毁先解除Sprite再销毁共享数字帧和图集，避免额外纹理引用。

## 音乐修订

确认原NativeMusic.src首次赋值前会调用stop()，此前无论是否已有音源都会向原生播放器发送stop；现在仅已分配音源才发送stop/pause/play，避免空音源命令。这个明确的调用缺口可能产生额外原生错误，但不能宣称它就是手机那条空错误的唯一来源或JSC崩溃原因。

后续音乐错误增加曲目menu/battle/boss、最近source/play/pause/stop操作、错误前就绪/播放意图及errCode/errMsg，空host事件明确标为empty host error。快照包含nativeMusicState与damageTextBackend。仍固定6音效＋1音乐源、原音量/音源/购物续播、同曲两次重试上限，不自动关闭音乐或多建context。

## 验证边界

短夹具test-battle-text覆盖真实hitEnemy数字接入、HP/命中次数保持、结束隐藏、根动画保持、复用/24格界及销毁；原生假host验证未赋音源零play/pause/stop命令、首曲不stop空播放器、错误操作及单context保持。test-runtime-report、test-native-audio-files与类型/工程/来源检查另行核对。

真实Cocos数字与原Label对照只为短UI工程画面，无站桩/百万生命/自动购物/长局。工程检查和结构性规避不能替代iPhone实测，不能宣称已根治。原机后续若仍退出，保留同时间WeChat系统日志与带时间戳的上一会话诊断。

微信Cocos对照位于art/reviews/battle-text-v922/comparison.jpg：左为原21px Arial CHAR Label，右为39px烘焙按21px显示的共享数字，均2倍放大展示。生产createEnemy生成UI-only对象，不入敌池/不生成/不模拟；结束后profile/Run/敌池均保持。setup.json确认13字与1024×1408，restore.json记录恢复守卫；不是伤害压力场景或手机FPS证据。

最终包重新构建后刷新微信模拟器，核对stage-v9.22-battle-text/menu/ready、13字就绪和lateUpdate合帧入口；NativeMusic在菜单为assigned/ready/wanted/audible均true、errors0的一次观察。包约8.77MiB，远程资源版本仍v95-5eb9f0730a24a17b，不新增下载美术；这些都是工程/模拟器结果，不是原iPhone的连续游戏或无闪退证明。
