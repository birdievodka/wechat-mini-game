# 启动与加载

当前 v2.8：启动画面和游戏Loading统一为刘关张战斗海报＋加载进度条；不显示默认Cocos Creator标识。加载后进入“选择英雄”，不自动进入战斗。

## 两个阶段

1. **引擎之前**：`build-templates/wechatgame/first-screen.js`，由微信 `game.js` 先调用 `start/setProgress/end`。主包本地 `startup-poster.jpg` 不依赖分包或Cocos；同一主WebGL画布绘制海报和金边绿芯进度条，禁止先拿主画布2D上下文再给引擎WebGL。
2. **资源准备**：`GameBootstrap`＋`LoadingView`＋`StartupProgress`。通过共享 `__taoyuanStartup` 接过海报原图和22%进度，转成Cocos纹理，继续准备角色/敌军/选人/结算哭泣素材；跳过重复加载campaign海报。浏览器没有前置画面时，从campaign包加载海报降级。results、presentation分包与选人美术并行获取，哭泣图、十一武器UI图标、三英雄分层图都属于关键资源，加载完才可开始游戏；presentation对应bundle、icons、weapon-revision、butcher-knife、heroes五个完成任务。

引擎启动里程碑占2–22%；关键资源回调按任务数推进22–98%，全部关键资源及UI就绪后才100%。这表示资源准备进度，不是网络字节百分比；不能按时间伪造匀速加载、缺资源先到100%、或切换阶段从100回0。重复回调幂等。关键资源列表来自 `STARTUP_TASKS`，机器目录同步保存。

`checkReady`只标记完成，不立刻隐藏海报；`update`保留至少一个100%完成帧，再转选人。无强制数秒等待。Cocos组件异步 `start()` 返回不等于菜单已绘制；回归需要驱动完成帧。

关键贴图/分包失败时保留海报与明确错误，不显示假100%也不强行进场。可选hero-menu美术失败按既定基础菜单降级，对应任务显式结算；音乐/音效及既有非阻塞装饰加载不冒充此资源进度的网络总量。

## 视觉与布局

- 海报来源：`assets/campaign/poster.jpg`，已有刘关张合影，约342KiB；复用既定美术，不新增一套角色画风。
- 等比cover铺满、顶部对齐，宽屏优先保留人物头部，裁底部空白；不要拉扁人物。
- 引擎前置画面仅海报与进度条；Cocos Loading补“桃园乱斗”标题与“正在集结三兄弟… n%”。文字由UI绘制，未烘入海报。
- 横屏逻辑高度750；进度宽 `min(520,视野宽−112)`、中心距底为视野高10%，轨道20高，绿芯12高。前后画面位置衔接，避免重排跳动。
- Loading盖住战场与HUD，不显示测试、选武器或其他跳转按钮。完毕再展示选人。

## Cocos标识与构建

这里最早的标识来自微信默认 `first-screen.js`，与引擎 `settings.splashScreen` 是两套。该项目后者原本已是0秒，仅调后者不能去掉前者。

使用 [Cocos项目自定义构建模板](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/custom-project-build-template.html) 的标准覆盖路径；不修改Creator安装文件、不伪造 `information.json` 的功能完成状态。默认生成的game.js保留原启动调用，项目模板实现相同三个接口。

`scripts/build-wechat.cjs` 在构建后：

- 从原始海报复制 `startup-poster.jpg` 到发布主包；运行时无需等待下载分包才能显示。
- 校验发布 `first-screen.js` 与项目模板完全一致，防止重建后默认标识回归。
- 校验引擎 `splashScreen.totalTime=0`，避免第二层插屏；相关设置参见 [Cocos构建选项](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/build-options.html)。
- 复制完再检查包大小，新增约342KiB要算主包，不允许先检查后塞大海报。

启动GL驱动在交接前结束RAF、删除自身纹理/缓冲/程序，保留原图供Cocos上传；菜单就绪后清理共享原图引用。Cocos专有纹理/图像对象随组件销毁回收，不释放资源管理器拥有的普通素材。

验证需区分：启动模板渲染、真实资源回调/失败测试、微信加载到新版本菜单，以及定帧UI构图。用62%测试夹具拍预览可以验证布局，不能声称那就是实机某次真实下载进度。
