# 七首领实装预览

版本`chronicles-v7-seven-bosses`。本目录六位新增重制首领，吕布当前样板见[吕布实装](../lvbu/README.md)。以下为实际Cocos WebGL的工程定帧与关键帧动画，非概念插画、微信截图或手机游玩录像。

| 首领 | 三招关键阶段 | 动画 |
| --- | --- | --- |
| 张角 | [黄符、三才阵、太平雷狱](zhangjiao.png) | [查看](zhangjiao.gif) |
| 董卓 | [金印、滚钱、酒池](dongzhuo.png) | [查看](dongzhuo.gif) |
| 袁绍 | [弓阵、弩车、三轮齐射](yuanshao.png) | [查看](yuanshao.gif) |
| 曹操 | [银锋、纸影、虎豹骑](caocao.png) | [查看](caocao.gif) |
| 孟获 | [野猪、狼扑、战象](menghuo.png) | [查看](menghuo.gif) |
| 司马懿 | [落子、双龙、星石](simayi.png) | [查看](simayi.gif) |

`node scripts/capture-bosses-review.mjs --motion`仅连接独立本地Chrome profile与8766/9336端口，不操作用户浏览器或微信对局。每位三招各取三张关键帧；GIF以10fps工程定帧拼接，每招取前4.4秒（每位132帧），长招的后续阶段用静态图另行补采；不是完整长招录像，无正常战斗随机AI或玩家输入。

机制和资源详见[实现说明](../../../docs/seven-bosses.md)，逐帧、异常与存档恢复结果见[validation.json](validation.json)。五心变化来自真实受伤入口；工程夹具不计正常战绩。微信预览上传成功和iOS用户测试分别记录。
