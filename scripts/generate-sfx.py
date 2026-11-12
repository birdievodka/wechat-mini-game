"""合成鞋底干拍短音：无风声、无音高滑落、无爆炸低音。"""
import math, random, struct, wave
from pathlib import Path
random.seed(71)
rate = 44100
out = Path(__file__).resolve().parent.parent / 'art/archive/audio'
out.mkdir(parents=True, exist_ok=True)
duration = .075
samples = []
low = 0.; body = 0.
for i in range(int(rate * duration)):
    t = i / rate
    noise = random.uniform(-1, 1)
    # 中频宽面拍击：柔化高频尖刺，接触和鞋底形变分开衰减。
    low += .17 * (noise - low)
    body += .035 * (noise - body)
    contact = (1 - math.exp(-t * 3500)) * math.exp(-t * 220)
    sole = (1 - math.exp(-t * 1000)) * math.exp(-t * 110)
    value = .65 * (low - body) * contact + 1.4 * body * sole
    value *= min(1, (duration - t) / .008)
    samples.append(value)
peak = max(abs(v) for v in samples)
data = b''.join(struct.pack('<h', int(v / peak * 22000)) for v in samples)
with wave.open(str(out / 'slap.wav'), 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate); f.writeframes(data)
print('slap.wav: 75ms dry sole-slap, no whoosh or pitched thump')
