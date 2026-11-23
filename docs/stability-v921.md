# v9.21 无尽战斗退出的诊断交付

v9.20商店资源优化后，用户在iPhone15ProMax无尽第6分钟、多武器和较多敌兵战斗时仍整微信退出；本次没有确认新的具体泄漏或终止机制，不能说已修复。此前商店静态资源减少仍有效，但不能由退出时间变长推断原机稳定性改善。

## 设备记录结论

用户提供JetsamEvent-2026-11-17-042206.000.ips，时间为11月17日04:22:06 +0800。WeChat是largestProcess，rpages19419、pageSize16384，约303.42MiB；lifetimeMax29032页，约453.63MiB。微信条目无reason，其他服务/Widget有per-process-limit。这份旧记录不能证明微信当时因内存超限被杀，也不能对应11月19日六分钟退出。原始日志不入库，避免收录设备标识。

[Apple Jetsam判读说明](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports)：largestProcess仅表示该快照最大进程；须核对进程reason及日期。

## 新增观测

- 原5秒周期保留最近18条紧凑趋势、运行时间戳和资源峰值，仍最多8类聚合事件、previous一层，无新周期。
- 当前快照包含兵/友弹/敌弹的池大小和活动数、在场Boss、装备/技能、待发弹/场域、图形设备缓冲/纹理、drawCalls/triangles。
- render-diagnostics只遍历现有节点和Graphics已分配模型，保留缓冲最多6项，帮助区分实际持续增长和高水位缓存；不分配模型、不修改引擎。
- 设置→运行诊断→复制运行诊断，用户点击后才写剪贴板，无自动上传。包含上一战斗与当前观测；仅重进菜单查看诊断不会把上一战斗冲掉。

不改变敌数/伤害/特效/音频预算，不注入生命、自动购物或站桩。Cocos设备计数不是iOS进程RSS，报告也不是系统崩溃日志。待同时间系统记录或手机上局报告再定位，不能把新增日志当作闪退修复。

## 18:14 微信崩溃日志：修正排查方向

用户随后提供WeChat-2026-11-19-181403.ips。captureTime为18:14:00 +0800，微信8.0.80（8.0.80.34）、iPhone OS27.3（24C5037i）；faultingThread181名称含正式AppID与桃园小英雄，能够明确关联当前游戏。

- exception为EXC_BAD_ACCESS / SIGSEGV，KERN_INVALID_ADDRESS at 0x8；termination为SIGNAL11，而非Jetsam终止。
- 顶部三帧为JavaScriptCore的JSRopeString::resolveToBuffer<char16_t>、resolveRopeToExistingAtomString、llint_slow_path_get_by_val，后续为解释器与微信原生调用。
- 结论：本次可确认是小游戏JS服务线程中的原生非法内存访问，字符串解析/属性访问是崩溃位置。不能再把本次当作已证实的内存超限退出。也不能直接把正常字符串拼接认定为TypeScript错误，或断言为某个已知iOS/微信缺陷；日志不含项目JS函数/源码行号。
- 后续审查包括战斗中频繁的贴图键拼接、NPC/坐骑/宠物动画索引、Label文字缓存和JS/原生边界；任何规避修改需注明推断与实际验证边界。未修改Cocos或JSC源码，不用try/catch假装能捕获SIGSEGV。

虚拟内存vmSummary的TOTAL包含保留地址空间，不是进程物理占用，不能据其中数百GiB数字宣称内存泄漏。原始日志含设备与安装路径标识，不纳入Git。

## v9.21.1 诊断出口可用性修订

用户反馈“复制失败，请重试”。旧report在当前快照异常时直接返回空字符串，剪贴板缺失/抛错/fail又都返回false，同一提示掩盖多种失败；未收到原机具体errMsg，不能断定为哪一种。

改为打开诊断即展示上局/当前/异常分页摘要，可直接截图。复制完整报告失败显示具体微信错误或接口缺失；当前采集异常也保留上局导出。可选Graphics原生字段缺失逐模型隔离并计unavailable，不能阻断全部快照。没有上传、读剪贴板或清记录。

短独立故障检查scripts/test-runtime-report.cjs覆盖采集异常保上局、菜单重开、复制拒绝/缺失/同步抛错/浏览器异步以及残缺IA；不跑游戏长测，不操作真实剪贴板/存档。这是诊断功能修订，不是JSC崩溃修复证明。
