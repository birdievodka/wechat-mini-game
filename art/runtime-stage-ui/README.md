# v8.1 关卡界面手绘皮肤

使用内置 image_gen，以已批准的stage-picker.png为画风参考制作空白玉绿金边面板，真实文字、角色、选中状态与按钮均由Cocos运行时绘制。

- 生成源图：art/runtime-stage-ui/jade-panel-source.png
- 提示词与模式：art/runtime-stage-ui/prompts.json（built-in image_gen）
- 运行资源：assets/chronicle-ui/stage-jade.png，480×300、真实alpha、约87KB
- 九宫格：left/right64、top/bottom48，由chronicle-art.ts统一注册
- 重建：node scripts/pack-stage-art.cjs；原批准选关稿裁出大场景缩略图，地表沿现有themes稿
- 实际Cocos画面：art/reviews/stages/menu.png与stage-picker.png；不是将概念图当运行截图
