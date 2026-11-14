# 全敌军抬手/攻击/收招 · v8.6

本目录为**独立真实 Cocos WebGL 工程画面**，不是概念图、微信手机截图或真人成绩。版本stage-v8.6-enemy-actions。

- `all-{0,1,2,3}-{idle,windup,release}.jpg`：下/右/上/左，40兵种的待机、蓄势、释放；实际加载四张模块化图集，E01仍用原12格，其他兵使用身体/双脚/独立袖手/器械的Sprite动作。小编号仅工程标签，不进入游戏。
- `troops.gif`：6个代表兵的工程姿态动画，24fps模拟采样后缩至1000×500，不是手机帧率录像。
- `E02/E03/E11/E19/E37/E39-ai.gif`：朴刀、长枪、弓手、骑兵、炮车、符师的**真实AI时钟**，逐步调用真实更新与判伤/弹体/危险区，裁切放大合成；六种均观察到攻击和伤害或发弹。不是手动造攻击时刻的摆拍。
- `boss-{id}-{windup,cast|dash,recover}.jpg`：7Boss真实调度首招的起手、释放、收招，21张。全部21招的伤害与状态另由test-bosses/test-lvbu覆盖，不宣称每张图展示了三招。
- `validation.json`：12张全兵姿态/6种AI/21张Boss记录，0运行异常，恢复原Run/profile/localStorage并返回菜单。
- `pressure.json/png`：真实WebGL工程压力，40种各2只=80兵、六件武器与主动技能，600个模拟帧。节点/全局池不随帧数无界增长。此数据是绘图缓冲/纹理与场景实例，并非iOS进程内存、FPS或闪退原因。

角色动作与实际命中共用attack、windup、锁定attackAngle。全部正式命名敌兵/Boss取消碰撞偷扣心，仅真实攻击扣心。近战测试覆盖抬手无伤、一次释放与侧移/绕背；远程14类覆盖放弹边界；暂停/眩晕/出生池复用另有自动回归。Boss原招式、范围、速度与数值保留。

复取：构建config/build-camp-review.json并服务8766；独立Chrome profile调试端口9336；执行scripts/capture-enemy-actions.mjs。仅菜单允许安装，有240秒恢复watchdog和finally恢复。压力：STABILITY_ALL_ENEMIES=1 STABILITY_BATCHES=5 STABILITY_VERSION=stage-v8.6-enemy-actions STABILITY_OUTPUT=art/reviews/enemy-actions/pressure.json node scripts/diagnose-stability.mjs，120秒watchdog。不要连接用户正在玩的微信对局。

PNG采样帧转换为88质量JPEG保存以压缩评审资料，未改动人物/特效；GIF由真实画布帧合成。全部素材/技能规范见项目skill的enemy-actions参考。手机效果和流畅度需通过最新预览二维码实际体验，不能用本目录代替原机验收。
