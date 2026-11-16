# v9.5 资源按需与无损农兵图集

运行版本 `stage-v9.5-lossless-assets`，正式微信AppID仍为 `wxbddcb8f0462f58cc`。本次只改分发、打包与资源生命周期；三少年外观、敌人数值、12帧农兵动作与时钟不变。v9.4来源检查点为1ee84bc，采用版图片在Git及当前源目录可恢复。

## 按需加载

- 两张赵云/孔明原图连同meta UUID整体移到 `assets/remote-content/hidden-heroes`，像素/布局不变；不参与首页就绪。`ensureHiddenHeroArt` 原子加载头袍、头像/哭泣帧；演武隐藏ID工程入口或未来正式开放时 `prepareHero` 先准备再进入。首页仍只显示小刘/小关/小张。
- 原三英雄3×2肖像保持一份完整采用源 `art/runtime-youth/portraits.png`，无缩放/无调色拆成两行：上行 `presentation/hero-hud.png` 供现有头像和胜利图使用，下行 `results/portraits.png` 仅哭泣，改为远程Bundle。每一行与原图对应区域RGBA逐字节相同，保持384像素方格。
- 哭泣图在正式生命≤2时预取；若突然死亡还未就绪，冻结结算并显示战报准备/重试/返回，下载成功后显示真实哭脸。胜利本就使用现行动态分层英雄，不为胜利下载哭泣图。返回备战先移除结算UI，再释放三哭脸帧及纹理；本地HUD图不受影响。
- `deferred-art` 按场景WeakMap合并并发，整组成功才发布帧，20秒超时，取消/死亡/返回都有存活与世代校验；失败不会留半张角色或污染下一次重试。准备过程复用ResourcePrepareView，结束销毁其子树。

## 海报仅一份

当前JPG原样移出Asset Bundle，唯一采用文件 `art/runtime-youth/poster.jpg`。`build:wechat` 在构建后复制为主包 `startup-poster.jpg`；引擎前仍立即显示，Cocos阶段复用共享原图。无前置桥的Web版通过 `assetManager.loadRemote('startup-poster.jpg')` 读取同一份产物，`npm run build:review` 负责复制。不再把同图同时打进campaign。全流程保持两帧交接、标题稳定、真实资源进度与加载后海报释放。

`pack-youth-heroes` 重建海报到新源路径，并在完成后调用 `pack-deferred-art`，不能恢复assets/campaign里的重复图。裸Creator Web构建后需复制该原图；推荐统一用build:review。源JPG SHA不变。

## 农兵逐像素无损

原镰刀/锄头采用PNG移到 `art/runtime-grunts/{sickle,hoe}.png`，旧meta和此前PNG压缩源指纹保留。`pack-grunt-art` 将已有256种RGB编码成8位索引，另存原始8位alpha，再用zlib压缩；不是再做一次颜色量化。16字节TYI1头保存尺寸/色数/格式及RGBA FNV校验，带原RGB表。

运行读取Cocos BufferAsset后，由 `indexed-art` 还原完整1448×1086 RGBA，校验通过才上传两张Texture2D。仍按4×3、362×362裁成原12帧；站立/行走/抬手/释放/收招、正侧背面、左右镜像和握持锚点全部不改。原采样尺寸和LINEAR滤波保持，不减帧、不裁掉低alpha描边、不用JPEG或有损WebP。没有每帧解码或额外材质/绘制次数。

源合计1,574,900 bytes，编码合计1,120,483 bytes，实际按manifest计算；两图RGBA与各12帧逐字节相等，透明度1–255亦保留。GPU纹理尺寸和约12MiB预算不变；加载临时数组在上传后不保留，BufferAsset立即释放，自建纹理在组件销毁时释放。不能把压缩后文件更小当成GPU内存同步减小。

解压使用MIT授权fflate 0.8.3，只运行本地同步解压。Creator3.8把其npm .js ESM入口识别成CJS，`vendor-inflate` 据固定依赖生成带完整MIT声明的TS模块；原文件指纹在codec-source.json。该第三方生成文件保留ts-nocheck，项目自己的解析器仍严格类型检查；不能为规避编译失败关闭整个项目类型检查。源码生成记录与采用源必须一起维护。

## 验证与构建

- `test-lossless-art`：全RGBA和24帧SHA/字节对照、尺寸、损坏头/像素校验、肖像切行精确、首屏不依赖隐藏/哭泣、结算等待/失败恢复、原海报SHA。
- 原全动作、受击、农兵四向、出生、结算哭泣、成长、商店、正式六关测试保持；老兼容夹具显式准备可选结果/隐藏资源，不能因此恢复生产启动全载。
- `capture-lossless-review` 在独立真实Cocos/WebGL里用RenderTexture对比原PNG与还原纹理24帧，并检查延迟结算哭脸、退场释放和隐藏孔明首次准备。工程夹具不改用户微信进度，也不代表手机FPS。
- `npm run build:wechat` 后 `npm run cdn:publish` 上传新不可变版本，校验116文件；先确保release/published一致再预览。微信所有JS留本地，远程15组静态数据。主包及各本地分包预算检查保留。

最终微信预览统计：8,722,193 bytes（8.32MiB），较v9.4的10,142,463 bytes（9.67MiB）减少14.00%；主包2,333,257 bytes（2.23MiB）。构建目录磁盘总量8.34MiB，远程静态资源8.66MiB。预览统计与目录文件大小口径不同，以validation.json随附记录为准。


真实WebGL验证已完成（art/reviews/lossless-resources/validation.json）：原PNG与还原纹理两套24帧全部像素差0，RenderTexture预热后每套首格显隐差均大于1000个分量，避免空画面假通过。首屏无哭脸/隐藏帧，延迟失败结算显示384×384真实哭泣，回首页哭脸释放，孔明首次准备两图成功，运行异常0。农兵文件精确从1,574,900降至1,120,483 bytes（−28.85%）；渲染尺寸不变。此为桌面真实Cocos测试，不代表iPhone帧率。

编辑器Preview不经过构建后复制步骤，缺少根JPG时复用本地训练场背景并保持加载流程，不阻断编辑器调试；正式微信/Web构建仍要求海报真实就绪，缺失时错误提示不放行。解压采用已知大小输出缓冲，避免inflate扩容的额外临时副本。

微信正式号验收：stage-v9.5-lossless-assets首页ready，两套1448×1086纹理有效、各12帧，初始无隐藏/哭脸帧；新版CDN哭脸首次准备后384×384帧有效，回首页释放，profile逐字串相同。相关运行错误匹配为空。发布包扫描同SHA海报仅startup-poster.jpg一份，CDN116文件已HTTP/SHA256验证，版本v95-996129359b44c659。
