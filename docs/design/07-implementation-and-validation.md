# 07 当前实现与验证入口

当前版本 `chronicles-v5.1-golden-sweep`。五英雄、六卷17章、40类兵种、36武器、60被动、9天命与24通用技能已接入；不再以旧专属技能或仅图鉴方案描述现状。

## 资源与实际入口

- 正式状态机：`assets/scripts/GameBootstrap.ts`；商店：`survival.ts`；战役：`chronicles-data.ts/chronicles.ts`；整备点：`chronicle-save.ts`。
- 技能：`common-skills.ts`、`CommonSkillRuntime.ts`、`CommonSkillEffects.ts`；单个技能由选人搭配，击杀充能。横扫形状由`sweep-effects.ts`绘制，判定仍在真实Runtime。
- 原创源图、提示词与裁格清单在 `art/runtime-v4`；生成十张共享图集，分为chronicle-ui与chronicle-units。原图不进入assets。
- PNG保留尺寸与逐像素alpha，RGB量化源图存 `art/runtime-sources/png`；历史设计稿和生成中间件已按[资源规则](../resources.md)清理。

## 当前保留的证据

| 证据 | 范围与限制 |
| --- | --- |
| [横扫A说明](../golden-sweep-v5.1.md)、[机器记录](../golden-sweep-v5.1-validation.json) | 当前微信版本、ready、菜单与真实Cocos定帧；GIF为代表帧合成，非连续录像、手机帧率或真人关卡成绩 |
| [技能评审与总览](../skill-review/README.md) | 当前24项机制与程序定帧预览；不冒充微信截图，飞书链接标明远端快照版本 |
| [150条交易路径模型](../chronicle-balance.json) | 真实货架/购买/合成、五英雄路径；65%清兵/65%命中假设，不模拟来袭伤害、死亡或真人操作，因此不是通关率 |
| [当前Node压力采样](../performance-node.json) | Cocos桩CPU和绘图调用，无GPU或手机FPS结论 |
| [微信渲染对照基线](../performance-wechat-baseline.json) | 最新保留的v4.2→v4.3桌面模拟器工程A/B；不能套作v5.1手机实测 |

横扫A最近正式构建为18.51MiB，各分包低于4MiB；这是该次构建记录，不是永久包大小。本次清理不修改运行源码、assets或现有微信构建，不需要为文档清理重编游戏。

## 自动检查

`npm run typecheck`、`npm test`、`npm run check`覆盖类型、素材透明与裁格、启动、音乐/声音、武器品质真实攻击、CCD、掉落守恒、购物/存档、40类AI与17场Boss、通用技能充能/目标边界/暂停/清场以及固定池压力。工程加速阶段和夹具不是真人通关成绩。

目录与来源由 `npm run skill:sync` 生成；资源变更须检查当前使用链和源图，不可只依文件名版本号删除。

## 仍需设备验证

iOS完整征程、真实胜率、峰值纹理/系统内存、后台往返和原设备闪退回归仍需手机采样。未获得系统终止日志，不能仅凭桌面通过宣称闪退根因已定位或所有iPhone稳定60帧。
