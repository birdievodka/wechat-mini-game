# 少年五英雄实际画面

版本chronicles-v7.1-youth-heroes，独立本地Cocos WebGL，1500×750逻辑视野。不是概念合成，不是微信/iOS手机性能验证。

- menu.png：当前选人页完整画布，刘备草鞋已缩小下移，保留表情。
- five-heroes.png：五英雄选人亮相，头像、短袍、握持和亮相动作统一。
- battle.png：上排默认单武器/行走姿态，下排六武器/反向/实际闭眼帧；每格裁自原画布，角色仍为正常战斗尺寸，无放大角色节点。
- results.png：上排真实哭泣结算、下排开心通关，所有成绩均为工程示例。
- showcase.gif：五英雄亮相工程帧串接（120帧、8fps），非连续游戏录像，不用于判断手机帧率。
- validation.json：25个实际状态、0运行时异常、恢复菜单与存档未变。

复现：构建config/build-camp-review.json，用独立Chrome本地8766/9336运行scripts/capture-youth-review.mjs。仅菜单可安装夹具，120秒自动恢复，禁止在用户对局中执行。
