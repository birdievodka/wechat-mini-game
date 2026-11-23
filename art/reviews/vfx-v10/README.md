# v10真实引擎特效核对

运行版本stage-v10.0-material-vfx。PNG均从独立Cocos/WebGL画布采集，不是概念图或重新绘制截图。范围：36武器、12主动、21Boss、40兵、3连招/3冲刺/3宠、7精英和通用反馈；控制反馈复用G26。133项映射见docs/vfx-upgrade-v10/implementation/coverage.json。

validation.json保留各帧状态/槽位/版本/恢复检查。water-keyframes.gif为24个实际模拟时点重建，非连续录屏或实机FPS。pressure.json为两组60秒加速模拟/低频提交渲染，只观察资源是否有界，不能据此宣称原iOS闪退已根治。

只保留本次最终截图。生成器为scripts/capture-vfx-upgrade.mjs与scripts/profile-vfx-upgrade.mjs；夹具menu守卫、watchdog、存档不变检查与恢复必须保留。
