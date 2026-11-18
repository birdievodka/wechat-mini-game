# v9.12 战斗闪退排查与修复

当前未取得原iPhone的机型、系统终止日志与精确复现组合，因此不声称已确定原机闪退的唯一根因。已修复以下可复现或由本机固定版本引擎调用链证实的问题，并给出复测构建。

## 原生音频实例与异步加载

Cocos Creator 3.8.8的cocos/audio/audio-downloader.ts通过AudioPlayer.load为每个AudioClip生成播放器；pal/audio/minigame/player-minigame.js进一步创建InnerAudioContext。audio-source.ts更换clip时也异步创建播放器。因此原来的六声道规则不能限制“缓存音效元数据＋频繁切换”的原生实例总量。

微信音效改由native-sfx.ts固定六实例复用，沿用原音色、优先级、限频和危险声压低规则。所有短音效（包括原草鞋）串行获取元数据；提取与Cocos 3.8.8 AudioSource相同的缓存url后立即释放AudioClip及其附带播放器。缓存路径不可用时才退公共nativeUrl；不删除下载文件。重试退避30秒，迟到回调和销毁均释放，stop失败也不能阻止destroy。错误风暴只每秒写一次故障事件，实际onPlay次数与错误累计数进入原有五秒快照。音乐仍单源、购物续播，浏览器保留Cocos路径。

纯主机接口回归覆盖66物理音色/万次切换仍六实例、缓存路径、加载并发一、元数据及时释放、错误/初始化失败/迟到/销毁以及监听解绑。这是接口与真实组件回归，不是iPhone原生进程内存测量。最终微信模拟器构建进入正常第一波已确认native-fixed、六实例、加载队列清空，29次真实onPlay回调、0音频错误；console筛选error无命中。证据见native-health.json，不能当成原iPhone测试。

## 小物件绘图缓冲

本机graphics.ts::clear仅把既有模型IA计数归零，activeSubModel为非空模型分配65535顶点和索引缓冲。对象inactive或clear并不销毁这些GPU缓冲。真实工程夹具中三动物、四回血物、三个精英冠会新增23,595,160字节缓冲，清场仍留在池中。

将原程序轮廓抽到world-prop-art.ts，在原BattleSpriteAtlas增加七个格子；模型改共用Sprite，桃树原贴图继续使用。图集63→70格、1024×1152约4.5MiB，只多0.5MiB；造型/摇摆/浮动、伤害/敌数/掉落均保留。对照额外缓冲降到1,068字节，模型20→10，缓冲加纹理139.10→117.10MiB，净减22.00MiB。该数值限于同条件工程场景，不当成全游戏峰值或iOS RSS。

## 验证边界

完整npm test及类型检查通过，最后音频/启动路径另做回归。真实Cocos/WebGL长测为80混合敌军（40兵种）、实际预加载吕布与董卓、成长5/六件IV武器/主动技能，18000模拟帧、300秒模拟时间、每帧GPU提交。不是手机连续300秒或手机FPS；缓冲/纹理稳定区间、无异常和存档恢复记录见performance-v912.json和art/reviews/stability-v912/pressure.json。中性物件前后是独立夹具，不冒充正常出兵限制或通关成绩。

微信构建与预览已使用本轮版本stage-v9.12-stability，主包2.25MiB、总包8.69MiB；预览二维码生成成功。CDN静态内容未变，cdn:check验证当前导出/已发布版本一致（v95-996129359b44c659）。仍需原iPhone复测；若再退出，优先核对低频故障记录和iOS系统终止日志，区分JS异常、WebGL上下文丢失、原生音频错误与系统内存终止。
