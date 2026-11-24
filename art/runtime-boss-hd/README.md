# 战场首领高清母图

这里的 WebP 只供离线打包。每张来自同名原始透明动作母图，使用 Real-ESRGAN 官方 20220424 ncnn 的 realesr-animevideov3-x2 模型一次性修复色面与线条。透明边界、连通区域、动作注册和脚底位置始终由原图决定。吕布的暗部另外以原画色值约束。算法和模型说明见 [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN/blob/master/docs/anime_video_model.md)。

常规重打包直接使用已保存的高清母图，依次执行以下命令。

```sh
node scripts/pack-boss-art.cjs
node scripts/pack-lvbu-art.cjs
node scripts/pack-boss-portraits.cjs
```

需要从原始美术重制高清母图时，将 REALESRGAN_BIN 指向官方 20220424 可执行文件，旁边保留对应的 models 目录，再运行 `node scripts/remaster-boss-sources.cjs`。sources.json 记录原图、模型版本和输出指纹。首领形象的行为回归也固定了当前采用的运行图集哈希，改图时应核对同尺度画面后同步更新。
