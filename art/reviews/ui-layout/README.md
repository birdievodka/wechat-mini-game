# v5.3 界面运行验收

目标版本：`chronicles-v5.3-supply-ui`。微信开发者工具模拟器截图，1280×592；不是手机实测。

- [首页](menu-wechat.jpg)：已移除“选择英雄”标题，保留正式Logo、动态英雄、五头像、技能小图标与居中开始。
- [补给](shop-wechat.jpg)：三商品、只读余额、六槽与道具入口、同基线刷新/继续；底层战斗控件隐藏。
- [替换](replacement-wechat.jpg)：真实触摸选中稀有III尖刀；换入精良II桃花枝，28＋40−32＝36；品质、图标、选中态、账单、取消和确认各自分区。
- [武器管理](weapon-manage-wechat.jpg)、[道具背包](inventory-wechat.jpg)：共享玉绿弹层、浅色文字和圆形关闭。
- [战斗HUD](battle-hud-wechat.jpg)：左上状态栏右侧圆形暂停，左下摇杆和右下技能保持同基线。

以上补给/替换/管理/战斗HUD为工程画面夹具，只为检验布局，金币/武器配置是样例，不是正常试玩记录。调用`scripts/fixtures/wechat-ui-layout-review.js`，只从菜单进入、有120秒看门狗、不写进度；验收后已恢复首页，`taoyuan-chronicle-v4`存档内容保持不变。暂停键命中区64、可见直径48。

自动验证：完整npm test、typecheck、check通过；微信构建18.70MiB，各分包低于4MiB；模拟器版本确认一致，TypeError/ReferenceError/素材加载失败日志查询为空。没有新增运行时位图或修改战斗、价格与存档规则。
