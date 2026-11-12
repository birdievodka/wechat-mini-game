#!/usr/bin/env python3
"""Render the original 桃园开打 score; no sampled music or external instruments.

Dev dependencies: numpy, scipy. Run from any directory. Runtime only uses the WAV.
128 BPM, D minor with a playful plucked hook, 32 bars / 60 seconds. Deterministic seed.
"""
from pathlib import Path
import json
import wave
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parents[1]
SR, BPM, SECONDS = 48000, 128, 60
BEAT = 60 / BPM
N = SR * SECONDS
rng = np.random.default_rng(20261112)
tracks = {key: np.zeros((N, 2)) for key in ['pluck', 'flute', 'chords', 'strings', 'bass', 'drums', 'wood']}
events = []

def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)

def env(t, attack, hold, release):
    return np.minimum(1, t / attack) * np.exp(-np.maximum(0, t - hold) / release)

def pluck(note, seconds, soft=False):
    t = np.arange(round((seconds + .28) * SR)) / SR
    f = hz(note)
    # Bright pick attack, quickly darkening string, small downward pitch settle.
    phase = 2 * np.pi * f * (t + .00014 * (1 - np.exp(-t / .012)))
    sound = np.zeros(len(t))
    for k in range(1, 12):
        strength = np.sin(k * .67) ** 2 / k ** (1.3 if soft else .96)
        sound += strength * np.sin(phase * k + .12 * k) * np.exp(-t * (3.4 + k * (2.4 if soft else 1.5)))
    sound *= np.minimum(t / .002, 1) * np.minimum(np.maximum(seconds + .28 - t, 0) / .04, 1)
    return sound * 1.45

def flute(note, seconds):
    t = np.arange(round((seconds + .12) * SR)) / SR
    vibrato = .0022 * np.sin(2 * np.pi * 5.3 * t) * np.minimum(t / .15, 1)
    phase = np.cumsum(2 * np.pi * hz(note) * (1 + vibrato) / SR)
    signal = np.sin(phase) + .28 * np.sin(2 * phase) + .08 * np.sin(3 * phase)
    breath = sosfilt(butter(2, [1200, 5500], btype='bandpass', fs=SR, output='sos'), rng.normal(0, 1, len(t)))
    return (signal * .72 + breath * .025) * env(t, .026, max(.025, seconds - .045), .027)

def bass(note, seconds):
    t = np.arange(round((seconds + .08) * SR)) / SR
    phase = 2 * np.pi * hz(note) * t
    signal = np.sin(phase) + .38 * np.sin(2 * phase) * np.exp(-t * 5) + .15 * np.sin(3 * phase) * np.exp(-t * 12)
    return np.tanh(signal * 1.3) * env(t, .005, seconds * .55, .045)

def strings(note, seconds):
    t = np.arange(round((seconds + .12) * SR)) / SR
    # A short bowed ensemble pulse, darker than the plucked foreground.
    signal = np.zeros(len(t))
    for detune in [-.0025, .0025]:
        phase = 2 * np.pi * hz(note) * (1 + detune) * t
        for k in range(1, 10):
            signal += np.sin(k * phase) / k ** 1.35 * .36
    signal = sosfilt(butter(2, 1800, fs=SR, output='sos'), signal)
    return signal * env(t, .018, seconds * .6, .035)

def drum(kind):
    duration = {'kick': .22, 'rim': .10, 'hat': .055, 'wood': .12, 'gong': .65, 'war': .45, 'tom': .24}[kind]
    t = np.arange(round(duration * SR)) / SR
    noise = rng.normal(0, 1, len(t))
    if kind == 'kick':
        phase = 2 * np.pi * (52 * t + 82 * .021 * (1 - np.exp(-t / .021)))
        s = np.sin(phase) * np.exp(-t * 23) + .035 * noise * np.exp(-t * 250)
    elif kind in ['war', 'tom']:
        f = 68 if kind == 'war' else 118
        phase = 2 * np.pi * (f * t + 55 * .023 * (1 - np.exp(-t / .023)))
        body = (np.sin(phase) + .32*np.sin(1.51*phase) + .18*np.sin(2.04*phase)) * np.exp(-t * (12 if kind == 'war' else 23))
        skin = sosfilt(butter(2, [180, 2100], btype='bandpass', fs=SR, output='sos'), noise)
        s = body * .8 + skin * .28 * np.exp(-t * 65)
    elif kind == 'rim':
        s = (.55 * np.sin(2 * np.pi * 410 * t) + .3 * np.sin(2 * np.pi * 970 * t)) * np.exp(-t * 95)
        s += .14 * sosfilt(butter(1, 2200, btype='highpass', fs=SR, output='sos'), noise) * np.exp(-t * 85)
    elif kind == 'hat':
        s = sosfilt(butter(2, 6200, btype='highpass', fs=SR, output='sos'), noise) * np.exp(-t * 100)
    elif kind == 'wood':
        s = (np.sin(2 * np.pi * 760 * t) + .6 * np.sin(2 * np.pi * 1240 * t)) * np.exp(-t * 65)
    else:
        s = sum(np.sin(2 * np.pi * f * t) * a * np.exp(-t * d) for f, a, d in [(510, .4, 7), (821, .25, 9), (1237, .12, 11), (1771, .08, 14)])
    return s * np.minimum(t / .0015, 1)

def put(track, signal, beat, gain, pan=0):
    start = round(beat * BEAT * SR)
    pan = np.clip(pan, -.8, .8)
    stereo = np.column_stack((signal * np.sqrt((1-pan)/2), signal * np.sqrt((1+pan)/2))) * gain
    # Wrap note/reverb tails, so the 60-second test-mode loop has no cut-off.
    room = min(len(stereo), N-start)
    tracks[track][start:start+room] += stereo[:room]
    if room < len(stereo):
        tracks[track][:len(stereo)-room] += stereo[room:]

def note(track, pitch, beat, length, gain, pan=0):
    synth = {'pluck': pluck, 'flute': flute, 'bass': bass, 'strings': strings, 'chords': lambda n, d: pluck(n, d, True)}[track]
    put(track, synth(pitch, length * BEAT), beat, gain, pan)
    events.append([track, round(beat, 3), pitch, length])

# Four bars of a deliberately short, syncopated question/answer hook.
# Lower F# to F and B to C; retain C# only for the dominant turn back to D.
A = [
    [(0,74,.5),(.75,78,.25),(1.25,81,.5),(2,78,.5),(2.75,76,.25),(3.25,74,.5)],
    [(0,71,.5),(.75,74,.25),(1.25,78,.75),(2.5,76,.25),(3,74,.75)],
    [(0,79,.5),(.75,81,.25),(1.25,83,.5),(2,81,.25),(2.5,78,.5),(3.25,76,.5)],
    [(0,76,.5),(.75,78,.25),(1.25,81,.5),(2.25,73,.25),(2.75,76,.25),(3.5,74,.25)],
]
B = [
    [(0,81,.75),(1,78,.5),(2,76,.5),(3,74,.75)],
    [(.25,78,.75),(1.25,81,.5),(2.25,83,.75),(3.25,81,.5)],
    [(0,83,.5),(.75,81,.5),(1.5,79,.5),(2.5,78,.5),(3.25,76,.5)],
    [(0,76,.5),(.75,73,.5),(1.5,76,.5),(2.25,81,.5),(3.25,73,.5)],
]
roots = [38, 34, 43, 33]  # D2 Bb1 G2 A1
chords = [[62,65,69,72], [58,62,65,69], [58,62,67,69], [61,64,67,69]]
for bar in range(32):
    base, pos, section = bar * 4, bar % 4, bar // 8
    riff = B[pos] if section == 2 else A[pos]
    for step, pitch, length in riff:
        pitch = {78:77, 71:72, 83:84}.get(pitch, pitch)
        # Middle section drops the hook one octave, keeping tension rather than a flute solo.
        if section == 2:
            pitch -= 12
        note('pluck', pitch, base+step, length, .27, -.13)
    # The second four-bar phrase answers an octave lower, rather than just repeating.
    if bar % 8 == 7 and section != 2:
        for step, pitch, length in [(1.75, chords[pos][1]+12, .3), (3.65, chords[pos][0]+12, .25)]:
            note('flute', pitch, base+step, length, .075, .24)
    for j, step in enumerate([.5, 1.5, 2.5, 3.5]):
        for k, pitch in enumerate(chords[pos][:3]):
            note('chords', pitch, base+step+k*.018, .23, .055 if section == 2 else .07, -.32+j*.16)
    for step in ([0,.75,1.5,2,2.75,3.5] if section == 3 else [0,1.5,2,3.5]):
        for pitch in [chords[pos][0]-12, chords[pos][2]-12]:
            note('strings', pitch, base+step, .30 if step%1 == 0 else .18, .15 if section == 3 else .115, -.12 if pitch == chords[pos][0]-12 else .12)
    root = roots[pos]
    for step, pitch, length, gain in [(0,root,.65,.30),(.75,root,.18,.21),(1.5,root+12,.27,.22),(2,root+7,.4,.26),(2.75,root+12,.2,.20),(3.5,root+7,.3,.23)]:
        note('bass', pitch, base+step, length, gain)
    for step in ([0,1.5,2,3.25] if section == 3 else [0,1.5,2]):
        put('drums', drum('kick'), base+step, .20)
    for step in [0,2]:
        put('drums', drum('war'), base+step, .29 if section == 3 else .23, -.05)
    for step in [1,3]:
        put('drums', drum('rim'), base+step, .15, -.08)
        put('drums', drum('tom'), base+step, .10, .10)
    for j in range(8):
        put('drums', drum('hat'), base+j*.5+.025*(j%2), .027 if j%2 else .038, .25)
    if section == 3:
        for step in [.75, 2.75, 3.75]:
            put('drums', drum('hat'), base+step, .022, -.25)
    if bar % 4 == 3:
        for step, gain in [(2.75,.12),(3.25,.15),(3.5,.13),(3.75,.17)]:
            put('drums', drum('tom'), base+step, gain * (1.25 if section == 3 else 1), .2 if step%1 else -.2)
    if bar in [7,23]:
        put('wood', drum('wood'), base+3.75, .055, .2)
    if bar in [15,31]:
        put('wood', drum('gong'), base+3.5, .06, -.20)

# Small stereo space and tempo delay only on melodic instruments, preserving attacks.
for key in ['pluck', 'flute', 'chords']:
    dry = tracks[key].copy()
    tracks[key] += np.roll(dry[:, ::-1], round(BEAT*.75*SR), axis=0) * .10
    for milliseconds, gain in [(31,.065),(53,.045),(79,.035),(113,.025)]:
        tracks[key] += np.roll(dry[:, ::-1], round(milliseconds/1000*SR), axis=0) * gain
mix = sum(tracks.values())
mix = sosfilt(butter(2, 42, btype='highpass', fs=SR, output='sos'), mix, axis=0)
mix = np.tanh(mix * 1.15) / 1.15
mix *= 10 ** (-1.5 / 20) / np.max(np.abs(mix))

def save(path, data, rate):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1 if data.ndim == 1 else data.shape[1]); f.setsampwidth(2); f.setframerate(rate)
        f.writeframes(np.round(np.clip(data, -1, 1) * 32767).astype('<i2').tobytes())

save(ROOT/'art/audio/taoyuan-kaida-master.wav', mix, SR)
mono = resample_poly(mix.mean(axis=1), 1, 2)
# Preserve a sample-continuous boundary after the causal high-pass / resampler.
edge = 120
correction = mono[-1] - mono[0]
mono[:edge] += correction * np.linspace(1, 0, edge)
save(ROOT/'assets/music/taoyuan-kaida.wav', mono, 24000)
report = {'title':'桃园开打 · 战斗版', 'version':2, 'bpm':BPM, 'bars':32, 'seconds':SECONDS,
          'origin':'Original score and synthesized instruments; no external samples',
          'runtimeFormat':'PCM16 / 24000 Hz / mono', 'peakDbFS':round(float(20*np.log10(np.max(np.abs(mono)))),2),
          'rmsDbFS':round(float(20*np.log10(np.sqrt(np.mean(mono**2)))),2),
          'loopBoundaryDelta':float(abs(mono[-1]-mono[0])),
          'sectionRmsDbFS':[round(float(20*np.log10(np.sqrt(np.mean(mono[i*360000:(i+1)*360000]**2)))),2) for i in range(4)],
          'notes':len(events), 'runtimeBytes':(ROOT/'assets/music/taoyuan-kaida.wav').stat().st_size}
(ROOT/'art/audio/taoyuan-kaida-score.json').write_text(json.dumps({'info':report,'events':events}, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
