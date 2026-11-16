# 行军地图与技能选择当前画面 v9.9

menu.png为真实Cocos/WebGL菜单；stage-picker.png为六关切换；skill-selection.png为未解锁技能剪影与禁止携带；battle.png检查进入演武后仍可触屏移动。validation记录真实浏览器触摸、第二指不抢摇杆与松手立停，正式profile/storage不变。不是iPhone听感/延迟/FPS测量。

行军地图采用批准的art/concepts/stage-journey/design.png，透明皮肤源/完整内置image_gen提示/指纹在art/runtime-stage-ui/journey-source.json。纸/布/红绳/纸签/玉印复用一张600×400 PNG（303230 bytes/0.92MiB），配图复用原stage-themes纹理的六个裁格；标签与玉印内箭头动态；两侧装饰箭头已移除。菜单遮罩需Web/微信显式包含mask模块。进入战斗释放菜单和遮罩，不保留整棵隐藏UI。

技能选择列表和详情使用RGB0/alpha108轮廓剪影，已发现与解锁资格不变。音乐检查覆盖微信无手势自动尝试、静默拒绝与抛错的首触重试、静音设置、前后台及迟到场景取消。默认浏览器仍首触，不能保证所有宿主都允许无手势音频。

全npm test/typecheck/构建/skill检查通过；最新微信预览总量9,080,092 bytes（8.66MiB），主包2,338,110 bytes。CDN静态内容未变，沿用已发布v95-996129359b44c659。

微信冷启动音频核验未完成：工具停留6帧/63%加载，未到选人页；后续加载帧驱动自动器超时。此为验证环境观察，不据此宣称微信首屏已播放，也不据此断言手机启动失败。手机由用户扫码体验，自动尝试及首触重试通过单元/组件回归。


v9.9当前截图已更新：技能页标题/内容左右对齐、去排序说明、右上共享关闭按钮。其他面板及真实触屏关闭校验见../panel-controls。此目录的WebGL验证不包含微信或iPhone音频/FPS；上文微信冷启动观察仍是v9.8历史取证。
