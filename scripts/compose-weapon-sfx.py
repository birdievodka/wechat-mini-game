#!/usr/bin/env python3
"""Original short weapon effects, rendered offline. Requires NumPy and SciPy.
The user-supplied sandal impact is only read for auditions, never modified.
"""
from pathlib import Path
from math import gcd
import json
import wave
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parents[1]
SR = 24000
rng = np.random.default_rng(612021)

def timeline(seconds): return np.arange(round(seconds * SR)) / SR
def noise(t, low, high):
    return sosfilt(butter(2, [low, high], btype='bandpass', fs=SR, output='sos'), rng.normal(0, 1, len(t)))
def modes(t, frequencies, decay):
    return sum(a * np.sin(2*np.pi*f*t) * np.exp(-t*d) for (f,a),d in zip(frequencies,decay))
def tick(t, at, frequency, amplitude, decay=140):
    age=np.maximum(0,t-at)
    return (t>=at)*amplitude*np.sin(2*np.pi*frequency*age)*np.exp(-age*decay)*np.minimum(age/.0008,1)
def render(name):
    if name=='beans-attack':
        t=timeline(.10); s=noise(t,950,5000)*.09*np.exp(-t*65)
        for at,f,a in [(0,1450,.7),(.014,2100,.38),(.037,1700,.24)]: s+=tick(t,at,f,a)
    elif name=='beans-hit':
        t=timeline(.085); s=modes(t,[(790,.7),(1670,.5),(2730,.12)],[70,110,150])+noise(t,500,4200)*.2*np.exp(-t*150)
    elif name=='peach-attack':
        t=timeline(.18); phase=2*np.pi*(560*t+210*t*t)
        s=(np.sin(phase)+.25*np.sin(phase*2))*np.exp(-t*26)
        s+=tick(t,.024,1120,.25,55)+noise(t,2200,6500)*.045*np.exp(-t*30)
    elif name=='peach-hit':
        t=timeline(.26); s=modes(t,[(660,.6),(990,.30),(1650,.18)],[20,26,34])
        s+=np.sin(2*np.pi*180*t)*np.exp(-t*60)*.3+noise(t,900,5000)*.15*np.exp(-t*55)
    elif name=='cleaver-attack':
        t=timeline(.07); s=noise(t,1400,6200)*.45*np.exp(-t*65)
        s+=modes(t,[(1230,.28),(2271,.16)],[75,100])
    elif name=='cleaver-hit':
        t=timeline(.15); s=noise(t,170,3200)*.65*np.exp(-t*65)
        s+=np.sin(2*np.pi*(170*t+.4*(1-np.exp(-t*60))))*np.exp(-t*55)*.55
        s+=modes(t,[(1260,.19),(2073,.1)],[35,50])
    elif name=='rollingpin-attack':
        t=timeline(.08); s=modes(t,[(370,.7),(820,.2)],[70,110])+noise(t,350,1900)*.09*np.exp(-t*80)
    elif name=='rollingpin-hit':
        t=timeline(.20); s=modes(t,[(195,.8),(470,.55),(870,.20)],[28,42,65])
        s+=noise(t,220,2600)*.36*np.exp(-t*110)+tick(t,.007,640,.3,75)
    elif name=='firecracker-attack':
        t=timeline(.14); s=noise(t,2000,6700)*.24*np.exp(-t*23)
        for at in [0,.013,.022,.048,.075]: s+=tick(t,at,3100,.22,200)
    elif name=='firecracker-hit':
        t=timeline(.33); s=noise(t,120,7400)*np.exp(-t*60)*.95
        s+=np.sin(2*np.pi*(80*t+1.2*(1-np.exp(-t*24))))*np.exp(-t*22)*.65
        for at,a in [(.023,.30),(.057,.19),(.092,.11)]:
            age=np.maximum(0,t-at); s+=(t>=at)*noise(t,700,4700)*a*np.exp(-age*130)
    else: raise ValueError(name)
    # Millisecond attack/release ramps suppress codec-independent edge clicks.
    s*=np.minimum(t/.0008,1)*np.minimum((t[-1]-t)/.009,1)
    s-=np.mean(s)
    s*=np.minimum(t/.0008,1)*np.minimum((t[-1]-t)/.009,1)
    s*=10**(-3/20)/max(np.max(np.abs(s)),1e-8)
    return s

def save(path, data):
    path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(np.round(np.clip(data,-1,1)*32767).astype('<i2').tobytes())

def read(path):
    with wave.open(str(path),'rb') as f:
        assert f.getsampwidth()==2
        rate=f.getframerate(); channels=f.getnchannels()
        data=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float).reshape(-1,channels).mean(axis=1)/32768
    d=gcd(rate,SR)
    return resample_poly(data,SR//d,rate//d)

names=['beans','peach','cleaver','rollingpin','firecracker']
clips={}
report=[]
for name in names:
    for event in ['attack','hit']:
        key=f'{name}-{event}'; data=render(key); clips[key]=data
        path=ROOT/f'assets/sfx/{key}.wav'; save(path,data)
        report.append({'id':key,'seconds':len(data)/SR,'bytes':path.stat().st_size,
                       'peakDbFS':round(float(20*np.log10(np.max(np.abs(data)))),2),
                       'rmsDbFS':round(float(20*np.log10(np.sqrt(np.mean(data**2)))),2)})

clips['sandal-hit-pcm']=read(ROOT/'assets/battle/audio/sandal-hit-pcm.wav')
montage=np.zeros(SR*18)
for i,name in enumerate(['sandal']+names):
    preview=np.zeros(SR*3)
    cast=clips.get(f'{name}-attack')
    hit=clips['sandal-hit-pcm' if name=='sandal' else f'{name}-hit']
    for beat in [.10,1.5]:
        if cast is not None:
            at=round(beat*SR); preview[at:at+len(cast)]+=cast*.36
        at=round((beat+.28)*SR); preview[at:at+len(hit)]+=hit*.70
    save(ROOT/f'art/audio/weapon-previews/{name}.wav',preview)
    montage[i*SR*3:(i+1)*SR*3]=preview
save(ROOT/'art/audio/weapon-sfx-preview.wav',montage)
(ROOT/'art/audio/weapon-sfx-manifest.json').write_text(json.dumps({'format':'PCM16 mono 24000 Hz','generated':report,
    'previewOrder':['草鞋','绿豆袋','桃枝','杀猪刀','擀面杖','爆竹'],'previewSectionSeconds':3,
    'origin':'All generated effects use original synthesis. Sandal impact is the unchanged user-supplied clip.'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'clips':len(report),'totalBytes':sum(c['bytes'] for c in report),'preview':'art/audio/weapon-sfx-preview.wav'},ensure_ascii=False))
