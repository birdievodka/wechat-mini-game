#!/usr/bin/env python3
"""Offline audition pack only. Never writes assets/ or changes the runtime.

Original deterministic modal synthesis/composition; NumPy/SciPy and macOS afconvert.
The approved shoe sample is copied byte-for-byte with its existing provenance.
Lossless music masters are reproducible and stay under ignored local/.
"""
from pathlib import Path
import hashlib
import json
import math
import re
import shutil
import subprocess
import wave
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art/audio/review-v1'
MASTER = ROOT / 'local/audio-review-masters'
SR = 32000
SEED = 2026111401
rng = np.random.default_rng(SEED)
for p in [OUT / 'music', OUT / 'sfx', OUT / 'mix', MASTER]:
    p.mkdir(parents=True, exist_ok=True)
catalog = json.loads((ROOT / '.agents/skills/taoyuan-game/references/catalog.json').read_text())
entries, signals, metrics = [], {}, []


def time(seconds):
    return np.arange(round(seconds * SR)) / SR


def bp(x, low=130, high=8500):
    return sosfilt(butter(2, [low, high], fs=SR, btype='bandpass', output='sos'), x)


def noise(t, low=300, high=6500):
    return bp(rng.normal(0, 1, len(t)), low, high)


def modal(seconds, tones, decay=18, attack=.0015):
    t = time(seconds)
    return sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * decay * d)
               for f, a, d in tones) * np.minimum(t / attack, 1)


def normalize(x, peak=.7):
    x = np.nan_to_num(x)
    if np.max(np.abs(x)) > 0:
        x = x * peak / np.max(np.abs(x))
    n = min(round(.004 * SR), len(x) // 4)
    if n:
        x[:n] *= np.linspace(0, 1, n)
        x[-n:] *= np.linspace(1, 0, n)
    return x


def save(path, x, rate=SR):
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1 if x.ndim == 1 else x.shape[1])
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(np.round(np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def overlay(base, x, at, gain=1, pan=0, wrap=False):
    i = round(at * SR)
    if base.ndim == 2 and x.ndim == 1:
        x = np.column_stack([x * math.sqrt((1 - pan) / 2), x * math.sqrt((1 + pan) / 2)])
    x = x * gain
    if wrap:
        idx = (np.arange(len(x)) + i) % len(base)
        np.add.at(base, idx, x)
    else:
        lo, hi = max(0, i), min(len(base), i + len(x))
        if hi > lo:
            base[lo:hi] += x[lo - i:hi - i]


def stack(seconds, events):
    s = np.zeros(round(seconds * SR))
    for at, x, gain in events:
        overlay(s, x, at, gain)
    return s


def tone(note, duration, kind='lute'):
    f = 440 * 2 ** ((note - 69) / 12)
    t = time(duration + (.55 if kind == 'lute' else .12))
    phase = 2 * np.pi * f * t
    if kind == 'lute':
        # Stretched inharmonic partials and a soft pick produce a warm short string,
        # rather than a hard sine beep or a GM harpsichord substitution.
        x = sum(np.sin(k * phase * math.sqrt(1 + .000025 * k * k) + .23 * k)
                * math.sin(k * .71) ** 2 / k ** 1.25
                * np.exp(-t * (2.6 + k * 1.2)) for k in range(1, 16))
        x += noise(t, 1600, 6000) * .024 * np.exp(-t * 95)
        x *= np.minimum(t / .003, 1)
    elif kind == 'bass':
        x = (np.sin(phase) + .23 * np.sin(2 * phase) + .08 * np.sin(3 * phase))
        x *= np.minimum(t / .012, 1) * np.exp(-t * 3.8)
    elif kind == 'bowed':
        x = sum((np.sin(k * phase * .9991) + np.sin(k * phase * 1.0009))
                / k ** 1.65 for k in range(1, 9)) * .25
        x *= np.minimum(t / .055, 1) * np.minimum(np.maximum(duration + .1 - t, 0) / .12, 1)
    else:
        vib = .003 * np.sin(2 * np.pi * 5.1 * t) * np.minimum(t / .22, 1)
        phase = np.cumsum(2 * np.pi * f * (1 + vib) / SR)
        x = np.sin(phase) + .20 * np.sin(2 * phase) + .06 * np.sin(3 * phase)
        x += noise(t, 1800, 6000) * .025
        x *= np.minimum(t / .045, 1) * np.minimum(np.maximum(duration + .1 - t, 0) / .12, 1)
    x[-round(.015 * SR):] *= np.linspace(1, 0, round(.015 * SR))
    return x


def drum(kind='low'):
    t = time(.65 if kind == 'gong' else .36)
    if kind == 'gong':
        return modal(.65, [(380, .5, 1), (547, .25, 1.3), (829, .1, 1.6), (1273, .06, 2)], 6)
    if kind == 'wood':
        return modal(.36, [(710, .7, 1), (1263, .35, 1.4), (2271, .07, 2)], 65)
    f = 78 if kind == 'low' else 147
    p = 2 * np.pi * (f * t + 53 * .018 * (1 - np.exp(-t / .018)))
    x = (np.sin(p) + .37 * np.sin(1.59 * p) + .15 * np.sin(2.14 * p)) * np.exp(-t * 15)
    x += noise(t, 200, 4200) * .22 * np.exp(-t * 75)
    return x * np.minimum(t / .0015, 1)


def impact(kind):
    t = time(.16 if kind in ['light', 'wood'] else .30)
    if kind == 'wood':
        x = modal(len(t) / SR, [(180, .8, 1), (462, .38, 1.6), (837, .16, 2.3)], 28)
        x += noise(t, 400, 3400) * .4 * np.exp(-t * 95)
    elif kind in ['light', 'heavy']:
        heavy = kind == 'heavy'
        x = modal(len(t) / SR, [(155 if heavy else 240, .65, 1), (1421, .15, 3), (2877, .065, 3.7)], 22)
        x += noise(t, 450, 7800) * .65 * np.exp(-t * (60 if heavy else 105))
    elif kind == 'gun':
        x = noise(t, 250, 6000) * np.exp(-t * 80) * .7
        x += modal(len(t) / SR, [(110, .6, 1), (275, .25, 2)], 40)
    else:
        x = noise(t, 90, 4800) * np.exp(-t * 19)
        x += modal(len(t) / SR, [(77, .8, 1), (132, .35, 1.8)], 14)
    return normalize(x)


def gesture(kind='blade'):
    t = time(.12)
    # Extremely short, restrained movement texture; NO sustained wind sweep.
    x = noise(t, 750 if kind == 'blade' else 220, 5800 if kind == 'blade' else 1900)
    x *= (t / .018) * np.exp(-t * 95)
    if kind == 'blade':
        x += modal(.12, [(1700, .04, 1), (2930, .025, 1.5)], 75)
    return normalize(x, .45)


def sparkle(notes=(74, 81), seconds=.40):
    return normalize(stack(seconds, [(i * .045, tone(n, .08), .5) for i, n in enumerate(notes)]), .58)


def fire(seconds=.65):
    t = time(seconds)
    env = np.minimum(t / .025, 1) * np.exp(-t * 6)
    x = noise(t, 180, 3400) * env * .4
    for at in [.01, .07, .17, .29]:
        overlay(x, impact('light') * .22, at)
    return normalize(x)


def water():
    t = time(.65)
    f = 320 + 850 * np.exp(-t * 9)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 13) * .3
    x += noise(t, 350, 4200) * np.minimum(t / .05, 1) * np.exp(-t * 7) * .55
    return normalize(x)


def lightning():
    t = time(.62)
    x = noise(t, 160, 7600) * np.exp(-t * 34)
    x += modal(.62, [(65, .75, 1), (111, .3, 1.3)], 9)
    overlay(x, noise(time(.11), 1700, 9000) * np.exp(-time(.11) * 75), .09, .22)
    return normalize(x)


def register(key, title, group, x, description, gain=.5, priority=1, gap=.1, rate=24000):
    x = normalize(x, .72)
    signals[key] = x
    path = OUT / 'sfx' / (key + '.wav')
    s = resample_poly(x, rate, SR)
    save(path, s, rate)
    entries.append(dict(id=key, title=title, group=group, file=str(path.relative_to(OUT)),
                        description=description, gain=gain, priority=priority, gap=gap,
                        seconds=round(len(x) / SR, 3), origin='原创离线音色合成'))


# Eleven sound families cover all 36 current weapons, with no per-target chorus.
shoe = ROOT / 'assets/battle/audio/sandal-hit-pcm.wav'
shutil.copyfile(shoe, OUT / 'sfx/sandal-hit.wav')
with wave.open(str(shoe), 'rb') as f:
    channels, rate = f.getnchannels(), f.getframerate()
    x = np.frombuffer(f.readframes(f.getnframes()), '<i2').astype(float).reshape(-1, channels).mean(1) / 32768
signals['sandal-hit'] = resample_poly(x, SR, rate)
entries.append(dict(id='sandal-hit', title='草鞋 · 已确认的啪声', group='武器', file='sfx/sandal-hit.wav',
                    description='原文件逐字节保留；只在命中响，不增加挥鞋风声。', gain=.48,
                    priority=2, gap=.09, seconds=round(len(x) / rate, 3), origin='用户指定爱给网音源；沿用现有文件，授权待发布前核实'))
families = [
    ('wood', '木器', ['pole', 'wood-ox'], gesture('wood'), impact('wood'), '短木质咚声，突出扁担的弹韧，机关共用木壳音色。'),
    ('blade', '轻刃', ['cleaver', 'twin-swords', 'qinggang', 'yitian', 'seven-saber', 'ancient-saber', 'hand-halberd', 'chain-hook'], gesture(), impact('light'), '清楚的切击＋极短金属尾音，不做电影式长刀风。'),
    ('heavy', '长兵重刃', ['guandao', 'serpent-spear', 'halberd', 'silver-spear', 'twin-halberds', 'trident'], gesture('wood') * .5 + gesture() * .5, impact('heavy'), '低中频厚斩，枪尖多一点金属敲击，合击也只报一次命中。'),
    ('bow', '弓弩暗器', ['repeater', 'phoenix-bow', 'heavy-crossbow', 'caltrops'], sparkle([57], .15), impact('wood')[:round(.11 * SR)], '干净弦扣＋短促入靶，连弩不逐弹持续轰鸣。'),
    ('gun', '机关火器', ['smg', 'shotgun', 'wood-kite'], impact('gun')[:round(.10 * SR)], impact('light') * .6, '紧致短点射，不采用现代写实刺耳枪响；霰弹按一次开火触发。'),
    ('blast', '爆破火器', ['firecracker', 'rocket', 'oil-jar', 'thunder-bomb'], fire(.18), impact('blast'), '脆头＋受控低频，避免多次爆炸拖成长时间轰鸣。'),
    ('petal', '桃花', ['peach'], sparkle([81, 86], .28), sparkle([74, 81, 86], .36), '木质拨弦＋很轻的花瓣散落亮点，不用电子激光。'),
    ('spirit', '仙剑', ['sword'], sparkle([74, 81], .22), stack(.25, [(0, impact('light'), .55), (.025, sparkle([86], .21), .2)]), '清亮短金鸣，环绕飞剑无常驻嗡声。'),
    ('thunder', '雷法', ['thunder', 'taiping-book'], sparkle([50, 62], .23), lightning(), '紧短电裂后接低沉雷心，同轮连锁只播放一次。'),
    ('ritual', '阵法灵器', ['gourd', 'feather-fan', 'star-lamps', 'bagua'], sparkle([62, 69], .28), sparkle([74, 79, 81], .45), '玉石木器的空灵短响，不加无限吸气或法阵循环声。'),
]
weapon_map = {'sandal': 'sandal'}
for key, title, ids, attack, hit, desc in families:
    weapon_map.update({i: key for i in ids})
    register(key + '-attack', title + ' · 出手', '武器', attack, desc, .22, 0, .14)
    register(key + '-hit', title + ' · 命中', '武器', hit, desc, .48, 2, .11)

# Damage, pickups and results have separate identities; player hurt never sounds like a weapon.
register('player-hurt', '主角受伤', '反馈', stack(.30, [(0, impact('wood'), .6), (.015, modal(.22, [(280, .45, 1), (195, .3, 1.4)], 18), .6)]), '低中频钝击＋短促下坠，抢在普通攻击前；无惨叫。', .72, 4, .4)
register('enemy-hit', '敌兵轻受击', '反馈', impact('light')[:round(.085 * SR)], '轻肉感短拍，只作武器无专用命中时的回退，不与武器命中叠播。', .20, 0, .14)
register('enemy-fall', '普通兵倒下', '反馈', stack(.2, [(0, impact('wood'), .5), (.065, gesture('wood'), .25)]), '短塌落，不给每名小兵加喊叫，密集击杀限频。', .22, 0, .25)
register('crit', '暴击强调', '反馈', stack(.20, [(0, impact('heavy'), .8), (.015, sparkle([86], .13), .18)]), '替代普通命中，加厚一次；不再额外叠一层。', .53, 2, .2)
register('coin', '铜钱拾取', '反馈', sparkle([88], .13), '温润铜铃一响，批量拾取合并，不逐枚扫音阶。', .22, 1, .12)
register('heal', '桃子回血', '反馈', sparkle([74, 78, 81], .48), '三音温暖上行，满血消耗也只轻响。', .45, 3, .3)
register('block', '剑阵格挡', '反馈', stack(.3, [(0, impact('light'), .5), (.01, sparkle([86, 93], .25), .45)]), '清脆金石回弹；格挡成功才响，和主角受伤互斥。', .58, 4, .18)
register('skill-ready', '技能就绪', '反馈', sparkle([81, 86], .33), '短而明确的两音提醒，击杀计数期间不滴滴响。', .38, 3, .8)
register('dash', '坐骑冲刺', '反馈', stack(.35, [(0, drum('low'), .65), (.06, gesture('wood'), .22)]), '一个短促蹬地重拍，不加持续风声。', .40, 2, .4)
register('hoof', '坐骑蹄步', '反馈', stack(.21, [(0, impact('wood'), .4), (.085, impact('wood'), .3)]), '仅近景主角移动按步点极低音量；密集战斗可省略。', .08, 0, .3)
register('footstep', '少年草地脚步', '反馈', gesture('wood')[:round(.08 * SR)], '柔软短沙沙，低优先且可关闭，不逐敌播放。', .07, 0, .26)
register('spawn', '敌军出生', '敌军', stack(.24, [(0, gesture('wood'), .5), (.055, impact('wood'), .18)]), '同批出生合并一声，远处不响，不盖住攻击起手。', .13, 0, .35)
register('melee-commit', '近战兵出招', '敌军', gesture('wood'), '只在近处真正出手时轻响，前摇仍以动作识别。', .20, 1, .18)
register('enemy-bow', '射手放箭', '敌军', stack(.18, [(0, sparkle([55], .13), .6), (.02, gesture(), .2)]), '弦扣清楚、无尖哨；一轮箭只响一次。', .25, 1, .18)
register('charge-warn', '骑兵冲锋蓄势', '敌军', stack(.60, [(0, drum('mid'), .5), (.18, drum('mid'), .6), (.37, drum('low'), .7)]), '三拍加重蹄鼓，给冲锋一个可听的预警，无语音。', .50, 3, .55)
register('danger', '危险区即将落下', '敌军', stack(.54, [(0, modal(.2, [(560, .5, 1), (1120, .15, 1.5)], 23), .6), (.24, modal(.2, [(560, .5, 1), (1120, .15, 1.5)], 23), .7)]), '统一低中音双敲，聚合同时危险区，避免每个圈各报一次。', .5, 4, .5)
register('siege', '炮车开火', '敌军', stack(.55, [(0, impact('blast'), .8), (.04, impact('wood'), .5)]), '闷炮＋木架后坐，只近场播放，不铺持续轰鸣。', .45, 2, .35)

# All twelve current skills get event-shaped auditions, not one generic magic chime.
skill_audio = {
    'G01': stack(.70, [(0, drum('mid'), .55), (.12, drum('low'), .7), (.24, sparkle([62, 69, 74], .4), .6)]),
    'G03': stack(.85, [(0, gesture(), .25), (.09, impact('heavy'), 1), (.14, modal(.65, [(392, .22, 1), (587, .13, 1.3), (1174, .07, 1.8)], 7), .5)]),
    'G07': stack(.65, [(0, drum('low'), .7), (.10, drum('mid'), .6), (.23, sparkle([62, 69, 74], .35), .5)]),
    'G08': stack(1.2, [(i * .135, sparkle([57 + i % 2 * 2], .12), .36 + .04 * (i % 2)) for i in range(8)]),
    'G10': stack(1.1, [(0, fire(.6), .8), (.16, fire(.6), .5), (.32, fire(.6), .35)]),
    'G12': water(),
    'G18': stack(.9, [(0, drum('wood'), .35), (.08, sparkle([62, 69, 74, 81], .7), .7)]),
    'G19': stack(1.7, [(i * .3, lightning(), [.65, .72, .8, .9][i]) for i in range(4)]),
    'G20': stack(1.9, [(i * .27, stack(.6, [(0, sparkle([86 - i * 2], .3), .25), (.14, impact('blast'), .7)]), .8) for i in range(5)]),
    'G22': stack(1.6, [(i * .3, stack(.45, [(0, gesture(), .55), (.08, impact('wood'), .5), (.13, impact('light'), .3)]), .75) for i in range(4)]),
    'G25': stack(.8, [(i * .09, stack(.4, [(0, sparkle([74 + i * 2], .3), .45), (.03, impact('light'), .2)]), .6) for i in range(4)]),
    'G26': stack(.95, [(0, drum('low'), .8), (.12, drum('low'), .7), (.24, modal(.65, [(196, .5, 1), (294, .25, 1.2), (392, .1, 1.6)], 5), .65)]),
}
skill_descriptions = {
    'G01': '枪阵破空的双重鼓点＋短亮尾；不做长时间风噪。',
    'G03': '金刃蓄势→一次厚斩→金色弧光短余响，匹配横扫六合A版。',
    'G07': '开战鼓点＋上扬弦响，5秒攻速增益期间保持安静，不铺循环声。',
    'G08': '八个有节奏的弦扣，听得清八箭，但不叠八次尖啸。',
    'G10': '一条火线依次燃起的三段脆裂，灼烧期间不逐目标重复。',
    'G12': '水头冲击→层叠浪沫→自然收尾，避开电流般尖锐水声。',
    'G18': '木令落地与玉锁扣合，阵法持续时无电子嗡鸣。',
    'G19': '四道递进电裂与低雷，落雷按实际命中时序触发，响度封顶。',
    'G20': '五颗星的下坠亮点与短落地震动，不做五声巨大爆炸。',
    'G22': '四轮密箭成束落地，靠密度区别百步穿杨，不逐箭叠声。',
    'G25': '四剑依次亮起的清金鸣，持续环绕静默；成功挡击另用格挡声。',
    'G26': '两声沉鼓接低沉号令共鸣，眩晕5秒期间不循环提示。',
}
skills = catalog['chronicles']['genericSkills']
assert set(s['id'] for s in skills) == set(skill_audio), 'Review must cover exact current skills'
for s in sorted(skills, key=lambda s: s['powerRank']):
    register('skill-' + s['id'], s['name'], '技能', skill_audio[s['id']], skill_descriptions[s['id']], .62, 3, .4)

# Distinct boss motifs; warning is one shared cue, unique release textures below.
bosses = [
    ('zhangjiao', '张角 · 符雷', lightning(), '纸符脆裂＋低雷，避开尖锐电流常驻声。'),
    ('lvbu', '吕布 · 骑战重斩', stack(.85, [(0, drum('low'), .6), (.12, impact('heavy'), .8), (.24, impact('wood'), .4)]), '蹄鼓推动重戟，冲锋结束短刹地。'),
    ('dongzhuo', '董卓 · 狮印酒火', stack(.8, [(0, impact('blast'), .7), (.15, fire(.6), .5)]), '印落的沉击＋酒火短燃，不加入夸张人声。'),
    ('yuanshao', '袁绍 · 弩阵', skill_audio['G22'] * .75, '成束弩弦，尾部更干；不为每箭加声。'),
    ('caocao', '曹操 · 银锋纸影', stack(.65, [(0, gesture(), .45), (.08, impact('light'), .55), (.17, gesture('wood'), .3)]), '利落银刃与薄纸折响，召唤分身不叠人声。'),
    ('menghuo', '孟获 · 兽群冲阵', stack(1.1, [(i * .15, drum('low' if i % 2 == 0 else 'mid'), .5 + .04 * i) for i in range(6)]), '群兽蹄地的滚动鼓点；不逐只嘶吼，兼容现有美术。'),
    ('simayi', '司马懿 · 星棋', stack(.9, [(0, sparkle([50, 57], .3), .5), (.20, impact('wood'), .6), (.26, sparkle([74, 81, 86], .6), .4)]), '低棋子落盘＋星光短鸣，与桃花保持明暗差异。'),
]
boss_moves = {
    'zhangjiao': [('黄符定雷', lightning()),
                 ('三才雷阵', stack(1.6, [(i * .45, lightning(), .7) for i in range(3)])),
                 ('太平雷狱', stack(1.2, [(0, sparkle([50, 62, 69], .5), .5), (.36, lightning(), .65)]))],
    'lvbu': [('赤兔破军', stack(.95, [(i * .13, drum('low' if i % 2 == 0 else 'mid'), .6) for i in range(5)])),
             ('画戟回旋', skill_audio['G03']),
             ('无双三连冲', stack(3.1, [(i * 1.27, stack(.5, [(0, drum('low'), .65), (.13, impact('wood'), .4)]), .7) for i in range(3)]))],
    'dongzhuo': [('金印镇地', stack(.75, [(0, impact('blast'), .8), (.10, drum('gong'), .25)])),
                 ('赤铜横财', stack(.9, [(i * .15, modal(.28, [(415, .6, 1), (789, .2, 1.6)], 20), .5) for i in range(4)])),
                 ('酒池焚阵', stack(1.4, [(i * .4, fire(.6), .55) for i in range(3)]))],
    'yuanshao': [('四世箭阵', stack(.5, [(0, gesture(), .45), (.1, impact('wood'), .35)])),
                 ('官渡弩阵', stack(1.05, [(0, impact('wood'), .6), (.35, sparkle([50], .15), .4), (.65, impact('wood'), .5)])),
                 ('万军齐射', skill_audio['G22'])],
    'caocao': [('倚天连刃', stack(1.15, [(0, impact('light'), .6), (.65, impact('light'), .6)])),
               ('疑兵换影', stack(.55, [(0, gesture('wood'), .5), (.13, gesture('wood'), .4), (.2, sparkle([69], .25), .18)])),
               ('虎豹合围', stack(2.2, [(0, drum('low'), .6), (.13, drum('mid'), .5), (1.3, drum('low'), .6), (1.6, impact('light'), .4)]))],
    'menghuo': [('猪突猛进', stack(.9, [(i * .12, drum('low'), .6) for i in range(5)])),
                ('群狼围猎', stack(.8, [(i * .20, gesture('wood'), .6) for i in range(3)])),
                ('万象开道', stack(2.0, [(0, drum('low'), .8), (.13, impact('wood'), .4), (1.5, drum('low'), .8)]))],
    'simayi': [('落子成灾', stack(1.3, [(i * .4, impact('wood'), .5) for i in range(3)])),
               ('阴阳双龙', stack(.9, [(0, sparkle([50, 57], .6), .55), (.18, sparkle([74, 81], .6), .5)])),
               ('五丈星劫', stack(1.9, [(i * .55, stack(.7, [(0, sparkle([86 - i * 3], .3), .25), (.14, impact('blast'), .6)]), .6) for i in range(3)]))],
}
for key, title, _, desc in bosses:
    # Earlier scratch renders used one undifferentiated cue per boss. This pack
    # retains only the current three-move set, never accumulates stale auditions.
    (OUT / 'sfx' / ('boss-' + key + '.wav')).unlink(missing_ok=True)
    for i, (move, clip) in enumerate(boss_moves[key]):
        register('boss-' + key + '-' + str(i + 1), title.split(' · ')[0] + ' · ' + move,
                 '首领', clip, desc + ' 此为本招时序合成试听，接入时按真实释放事件分段触发。', .56, 3, .4)

ui = [
    ('ui-click', '按钮轻点', sparkle([74], .10), '短木扣，避免所有按钮都叮铃。'),
    ('ui-hero', '切换少年英雄', sparkle([69, 74], .23), '轻拨两音，快速切人合并。'),
    ('ui-equip', '装备武器／技能', stack(.3, [(0, impact('wood'), .25), (.05, sparkle([81], .2), .4)]), '一个落槽扣合，和购买区分。'),
    ('ui-buy', '购买成功', sparkle([74, 78, 81], .36), '温润三音与实物落袋感，无收银机声音。'),
    ('ui-refresh', '刷新商店', stack(.33, [(0, gesture('wood'), .4), (.055, drum('wood'), .2)]), '翻纸＋木签短响，不加硬币拾取声。'),
    ('ui-sell', '卖出武器', sparkle([81, 74], .28), '短下行铜扣，与购买上行区别。'),
    ('ui-upgrade', '武器升阶／合成', stack(.65, [(0, impact('light'), .35), (.08, sparkle([74, 81, 86], .5), .65)]), '一次金属扣合接品质亮点，不随品质无限增响。'),
    ('ui-open', '商店／图鉴／弹窗打开', stack(.22, [(0, gesture('wood'), .4), (.04, sparkle([69], .16), .15)]), '轻翻纸，和攻击音色错开。'),
    ('ui-close', '关闭／返回／暂停', gesture('wood') * .4, '轻收纸，后台切换不自动发声。'),
    ('ui-denied', '铜钱不足／不可操作', sparkle([65, 62], .24), '低音两敲，轻而清楚，不刺耳报警。'),
    ('ui-start', '开始挑战／继续战斗', stack(.75, [(0, drum('low'), .6), (.10, sparkle([62, 69, 74], .5), .65)]), '短出阵鼓与主题上行，快速交还战场。'),
    ('boss-arrive', '首领登场', stack(1.3, [(0, drum('low'), .7), (.22, drum('mid'), .55), (.44, drum('gong'), .5)]), '克制三段战鼓，音乐短压低，无长号角。'),
    ('wave-clear', '波次结束', sparkle([69, 74, 81], .65), '轻回收提示，下一步购物；和正式通关不同。'),
    ('victory', '关卡通关', stack(2.6, [(0, drum('low'), .6), (0, sparkle([62, 69, 74], .8), .6), (.45, sparkle([78, 81, 86], 1.2), .7), (1.0, drum('gong'), .25)]), '主题动机上扬，短促有成就感，不用庆典喇叭。'),
    ('defeat', '挑战失败', stack(1.8, [(0, tone(69, .4), .5), (.27, tone(65, .4), .5), (.55, tone(62, .65), .6)]), '温柔下行，配哭脸；不嘲讽、不做滑稽失败音。'),
    ('unlock', '新内容解锁', sparkle([74, 81, 86, 90], .85), '轻巧四音徽记，仅真实新解锁响一次。'),
]
for key, title, x, desc in ui:
    register(key, title, '界面', x, desc, .40 if key not in ['victory', 'defeat'] else .60, 3, .15)


def compose(kind, bpm, bars):
    beat = 60 / bpm
    duration = bars * 4 * beat
    tracks = {k: np.zeros((round(duration * SR), 2), dtype=np.float64)
              for k in ['lute', 'answer', 'bass', 'strings', 'drum']}
    notes = []
    menu = kind == 'menu'
    boss = kind == 'boss'

    def n(track, pitch, b, length, gain, pan=0, instrument='lute'):
        # Fixed humanization; phrase structure stays on-grid.
        at = b * beat + rng.uniform(-.005, .005)
        overlay(tracks[track], tone(pitch, length * beat, instrument), at,
                gain * rng.uniform(.92, 1.06), pan, True)
        notes.append([track, pitch, round(b, 3), length])

    # Question/answer from one shared D-centred motif. Sparse major-pentatonic
    # menu, minor-pentatonic battle. No stock tune, vocals or endless lead solo.
    phrases = [
        [(0, 74, .7), (1, 81, .5), (1.75, 83, .5), (2.5, 81, .6)],
        [(.5, 78, .6), (1.5, 76, .5), (2.5, 74, 1)],
        [(0, 76, .5), (.75, 78, .5), (1.5, 81, .5), (2.5, 78, .7)],
        [(.5, 76, .6), (1.5, 73, .4), (2.5, 74, 1)],
    ]
    roots = [38, 35 if menu else 36, 43, 33]
    voicings = [[50, 57, 64], [47, 54, 62], [55, 62, 69], [45, 52, 59]] if menu else [[50, 57, 65], [48, 55, 62], [55, 62, 69], [45, 52, 61]]
    for bar in range(bars):
        base, pos, section = bar * 4, bar % 4, bar // 4
        motif = phrases[pos]
        # Leave a whole answer bar in each phrase: useful negative space for play.
        if bar % 8 not in [3, 7]:
            for b, pitch, length in motif:
                if not menu:
                    pitch = {78: 77, 83: 84, 73: 72}.get(pitch, pitch)
                if section % 4 == 2:
                    pitch -= 12
                n('lute', pitch, base + b, length, .21 if menu else .18, -.18)
        if bar % 4 == 3:
            for b, pitch in [(1, 69), (2, 74), (3, 76 if menu else 77)]:
                n('answer', pitch, base + b, .55, .075 if menu else .045, .18, 'flute')
        # Open voicings, not dense block chords.
        for j, pitch in enumerate(voicings[pos]):
            n('lute', pitch, base + .25 + .19 * j, .7, .095 if menu else .055, -.32 + j * .3)
            if not menu:
                n('strings', pitch, base + .5, .37, .07 if not boss else .09, -.22 + j * .22, 'bowed')
                n('strings', pitch, base + 2.5, .30, .06 if not boss else .08, -.22 + j * .22, 'bowed')
        for b in ([0, 2.5] if menu else [0, 1.5, 2, 3.5]):
            n('bass', roots[pos] + (12 if b == 3.5 else 0), base + b, .65, .19 if menu else .23, 0, 'bass')
        drum_beats = [0] if menu else [0, 1.5, 2]
        if boss:
            drum_beats += [2.75, 3.5]
        for b in drum_beats:
            overlay(tracks['drum'], drum(), (base + b) * beat, .09 if menu else .27, 0, True)
        if not menu:
            for b in [1, 3]:
                overlay(tracks['drum'], drum('mid'), (base + b) * beat, .135, .16, True)
        for b in ([1.5, 3.25] if menu else [.5, 1.25, 2.5, 3.25]):
            overlay(tracks['drum'], drum('wood'), (base + b) * beat, .026 if menu else .04, -.25, True)
        if bar % 8 == 7:
            for j, b in enumerate([2.75, 3.25, 3.5, 3.75]):
                overlay(tracks['drum'], drum('mid'), (base + b) * beat, (.025 if menu else .09) * (1 + j * .15), .12, True)
            if not menu:
                overlay(tracks['drum'], drum('gong'), (base + 3.5) * beat, .035, -.15, True)
    # Restrained small-room field. Time wrapping makes the loop musically closed.
    for key in ['lute', 'answer', 'strings']:
        dry = tracks[key].copy()
        for delay, level in [(.043, .06), (.079, .04), (.137, .025), (beat * .75, .055)]:
            tracks[key] += np.roll(dry[:, ::-1], round(delay * SR), axis=0) * level
    mix = sum(tracks.values())
    # Circular filtering from a warm-up copy; no startup transient at loop splice.
    filt = butter(2, [62, 10200], fs=SR, btype='bandpass', output='sos')
    mix = sosfilt(filt, np.concatenate([mix[-SR:], mix]), axis=0)[SR:]
    mix = np.tanh(mix * 1.1) / 1.1
    target_rms = 10 ** ((-22 if menu else -20) / 20)
    mix *= min(target_rms / np.sqrt(np.mean(mix * mix)), .79 / np.max(np.abs(mix)))
    # Remove only the few-sample discontinuity, preserving full loop pickup/tails.
    edge = 80
    mix[:edge] += (mix[-1] - mix[0])[None, :] * np.linspace(1, 0, edge)[:, None]
    return mix, dict(bpm=bpm, bars=bars, seconds=round(duration, 3), notes=notes)


music_data = {}
for key, title, bpm, bars, desc in [
    ('menu', '桃园小聚 · 备战', 96, 16, '暖木弹拨、稀疏笛答句、轻木扣；有少年气，留出呼吸，不走儿歌或喜庆庙会路线。'),
    ('battle', '少年出阵 · 战斗', 128, 32, '同一主题转小调五声色彩，沉战鼓、拨弦和短弓弦推动；紧张但不过分悲壮，旋律主动留白。'),
    ('boss', '阵前争锋 · 首领变奏', 128, 16, '同速同调的战斗变奏，鼓句更密、音区下沉；依靠节奏升级压力，不靠整体加大音量。'),
]:
    mix, score = compose(key, bpm, bars)
    music_data[key] = mix
    master = MASTER / (key + '.wav')
    save(master, mix)
    dst = OUT / 'music' / (key + '.m4a')
    dst.unlink(missing_ok=True)
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '128000', str(master), str(dst)], check=True)
    (OUT / 'music' / (key + '-score.json')).write_text(json.dumps(score, ensure_ascii=False, indent=2) + '\n')
    entries.append(dict(id=key, title=title, group='配乐', file='music/' + key + '.m4a', description=desc,
                        gain=1, seconds=score['seconds'], bpm=bpm, origin='原创编曲／离线音色合成；非民乐实录'))
    metrics.append(dict(id=key, peakDbFS=float(20 * np.log10(np.max(np.abs(mix)))),
                        rmsDbFS=float(20 * np.log10(np.sqrt(np.mean(mix * mix)))) ,
                        loopBoundaryDelta=float(np.max(np.abs(mix[-1] - mix[0])))))
    print('Rendered music:', key, flush=True)


def audition_mix(key, title, events, desc, bg='battle', seconds=28):
    music = music_data[bg][:round(seconds * SR)].copy()
    mix = music * .78
    attenuation = np.ones(len(mix))
    accepted = []
    active, next_time = [], {}
    for at, cue, gain, priority in sorted(events):
        duration = len(signals[cue]) / SR
        # Offline demonstration of the proposed six-voice cap and priority gates.
        active = [(end, p) for end, p in active if end > at]
        gap = next(e['gap'] for e in entries if e['id'] == cue)
        if at < next_time.get(cue, 0) or len(active) >= 6:
            continue
        active.append((at + duration, priority))
        next_time[cue] = at + gap
        if priority >= 3:
            lo, hi = round(at * SR), min(len(mix), round((at + duration + .22) * SR))
            # Smooth .03s attack, .22s recovery; no pumping from ordinary hits.
            if hi > lo:
                t = np.arange(hi - lo) / SR
                a = np.clip(t / .03, 0, 1)
                r = np.clip((duration + .22 - t) / .22, 0, 1)
                attenuation[lo:hi] = np.minimum(attenuation[lo:hi], 1 - .48 * a * r)
        accepted.append([round(at, 3), cue])
    mix *= attenuation[:, None]
    for at, cue, gain, priority in events:
        if [round(at, 3), cue] in accepted:
            overlay(mix, signals[cue], at, gain * .42, rng.uniform(-.3, .3))
    # A transparent global reduction, not per-event destructive normalization.
    peak = np.max(np.abs(mix))
    if peak > .87:
        mix *= .87 / peak
    mix[:round(.1 * SR)] *= np.linspace(0, 1, round(.1 * SR))[:, None]
    mix[-round(.5 * SR):] *= np.linspace(1, 0, round(.5 * SR))[:, None]
    master = MASTER / (key + '.wav')
    save(master, mix)
    dst = OUT / 'mix' / (key + '.m4a')
    dst.unlink(missing_ok=True)
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '128000', str(master), str(dst)], check=True)
    entries.append(dict(id=key, title=title, group='混音', file='mix/' + key + '.m4a', seconds=seconds,
                        gain=1, description=desc, timeline=accepted, origin='离线示意混音；非游戏实录'))
    metrics.append(dict(id=key, peakDbFS=float(20 * np.log10(np.max(np.abs(mix)))), acceptedEvents=len(accepted)))


events = []
for at in np.arange(.6, 27, .65):
    events += [(float(at), 'sandal-hit', .48, 2)]
for at in np.arange(3, 27, .9):
    events += [(float(at), 'heavy-hit', .43, 2)]
for at in np.arange(8, 27, .16):
    events += [(float(at), 'gun-attack', .16, 0)]
for at in [2, 4.5, 6, 8.3, 12, 15, 20, 23, 25]:
    events += [(at, 'coin', .22, 1)]
events += [(5, 'enemy-bow', .25, 1), (9, 'charge-warn', .5, 3), (11, 'player-hurt', .72, 4),
           (14, 'skill-G03', .62, 3), (18, 'heal', .45, 3), (22, 'skill-G19', .62, 3)]
audition_mix('battle-mix', '先听这段 · 密集战斗混音', events,
             '0–8秒草鞋和重刃；8秒加入机关枪；9秒冲锋预警，11秒受伤；14秒横扫、18秒回血、22秒落雷。听受伤与预警能否从普通攻击中跳出来。')
events = [(1, 'ui-hero', .4, 3), (3, 'ui-hero', .4, 3), (5, 'ui-equip', .4, 3),
          (8, 'ui-click', .3, 1), (9.2, 'ui-buy', .4, 3), (12, 'ui-refresh', .4, 3),
          (15, 'ui-denied', .4, 3), (19, 'ui-start', .6, 3)]
audition_mix('menu-mix', '再听这段 · 备战与购物', events,
             '切英雄→装备→购买→刷新→余额不足→出阵。此为备战音乐搭配界面音的试听；正式商店将延续战斗音乐，保持既有规则。', 'menu', 22)

weapons = [{'id': w['id'], 'name': w['name'], 'family': weapon_map[w['id']]} for w in catalog['weapons']]
for e in entries:
    path = OUT / e['file']
    e['bytes'] = path.stat().st_size
    e['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
manifest = dict(version=1, status='原始试听源稿／已采纳为v9.3游戏试听版', seed=SEED,
                engine='NumPy/SciPy original modal synthesis; afconvert AAC', entries=entries,
                weapons=weapons, metrics=metrics,
                runtimeIntegration='Packed and event-segmented copies adopted by v9.3; this renderer does not write assets', shoeSourceSha256=hashlib.sha256(shoe.read_bytes()).hexdigest())
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
page = OUT / 'index.html'
if page.exists():
    html = page.read_text()
    html, count = re.subn(r'(<script id="review-data" type="application/json">)[\s\S]*?(</script>)',
                          lambda m: m[1] + json.dumps(manifest, ensure_ascii=False).replace('</', '<\\/') + m[2], html)
    assert count == 1, 'Review page must contain exactly one data island'
    page.write_text(html)
print(json.dumps({'clips': len(entries), 'music': 3, 'skills': len(skills), 'weaponFamilies': len(families) + 1,
                  'totalBytes': sum(e['bytes'] for e in entries), 'out': str(OUT)}, ensure_ascii=False), flush=True)
