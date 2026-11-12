# 桃园开打 · 战斗版 v2

2026-11-12。用户试听第一版后反馈“太欢快”，本版保留弹拨主题，加入战鼓和弦乐短奏，旋律改为 D 小调色彩，并减少短笛。音符和音色由项目内脚本原创编排、合成，未使用外部音乐或采样。属于合成音色配乐，不是民乐实录。

| 项目 | 设定 |
|---|---|
| 速度与结构 | 128 BPM，4/4，32小节，整60秒 |
| 0–15秒 | 弹拨主题，低沉战鼓，短奏弦乐和切分低音建立战斗节奏 |
| 15–30秒 | 主题再现，保留少量短笛回应 |
| 30–45秒 | 主旋律下降八度，低音与弦乐保持紧张感 |
| 45–60秒 | 加密弦乐节奏、底鼓和过门鼓，增强战斗压力 |
| 幽默感 | 弹拨主题和稀疏木质打击回应，避免持续高音唢呐 |
| 音量 | 游戏音乐0.26，0.45秒淡入；命中音效继续使用用户提供的啪声 |
| 循环 | 尾音和延迟回卷到开头；测试模式60秒循环 |

正常回合点击出发后从头播放；暂停/切后台时停止计时并暂停声音，回来必须点击继续；商店内战斗冻结但音乐继续播放，准备倒数也推进音乐时钟；商店切后台暂停，返回商店自动接续。菜单与结算停止。关闭音乐时回合仍计时，再开启接入当前音乐段落。新回合重置到开头。音乐与音效独立开关、分别持久化，音乐下载不阻塞菜单和战斗；延迟完成后加入当前时间点，退出后完成不会误播。

## 文件与再生成

- 游戏资源：`assets/music/taoyuan-kaida.wav`，独立 `music` 本地分包，24 kHz / 单声道 / PCM16，2,880,044 bytes。每个分包仍需低于4 MiB。
- 试听：`art/audio/taoyuan-kaida-battle.m4a`，48 kHz立体声AAC，不参与游戏打包。
- 母带：`art/audio/taoyuan-kaida-master.wav`；音序和检测数据：`art/audio/taoyuan-kaida-score.json`。
- 第一版留档：`art/audio/taoyuan-kaida-light-v1.m4a`，仅供比较。
- 原创编曲脚本：`scripts/compose-battle-music.py`，依赖Python、NumPy和SciPy，固定随机种子。

```sh
python3 -m venv /tmp/taoyuan-audio-env
/tmp/taoyuan-audio-env/bin/pip install numpy scipy
/tmp/taoyuan-audio-env/bin/python scripts/compose-battle-music.py
afconvert -f m4af -d aac -b 128000 art/audio/taoyuan-kaida-master.wav art/audio/taoyuan-kaida-battle.m4a
```

## 验证

`npm test` 包含手势解锁、淡入、暂停/继续、独立开关、循环、换关、延迟下载与停止竞态，以及真实游戏菜单/商店持续播放及后台恢复/死亡的播放状态；并检测资源时长、体积、峰值、均方电平和循环接点。实际手机外放与耳机听感仍以真机试听为准。
