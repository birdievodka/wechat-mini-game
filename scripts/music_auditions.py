"""Render the two approved brass themes (macOS)."""
import json
import subprocess
import uuid
import wave
from pathlib import Path
import numpy as np
from battle_score import RATE, TAU, clock, frequency, skin, pluck, air

ROOT = Path(__file__).resolve().parents[1]
# Pulse lengths are in quarter notes; a rest is written as 0. Each phrase occupies two bars.
SCORES = {
    'brass-oath': (120, [[(60,.75),(65,.25),(69,1.5),(67,.5),(65,1),(70,1),(69,.5),(67,.5),(65,1.5),(0,.5)],
                                 [(65,.5),(67,.5),(69,1),(72,1.5),(74,.5),(72,1),(67,1),(65,1.5),(0,.5)]]),
    'brass-rally': (152, [[(62,.75),(62,.25),(69,.75),(67,.25),(65,1),(62,1),(70,.75),(69,.25),(67,.5),(65,.5),(69,1),(0,1)],
                                  [(65,.5),(67,.5),(69,.75),(72,.25),(74,1.5),(72,.5),(70,.75),(69,.25),(67,.5),(65,.5),(62,2)]]),
}


def lead(note, length, rng):
    t = clock(length)
    vibrato = .004*np.sin(TAU*5.5*t)*np.minimum(t/.16,1)
    hz = frequency(note)*(1-.016*np.exp(-t*34)+vibrato)
    phase = TAU*np.cumsum(hz)/RATE
    signal = np.sin(phase)+.59*np.sin(2*phase)+.31*np.sin(3*phase)+.20*np.sin(4*phase)
    signal += .22*np.sin(phase*.998)+.13*np.sin(phase*1.002*3)
    envelope=np.minimum(t/.031,1)*np.minimum((length-t)/.043,1)
    return (signal+.022*air(t,rng,5))*envelope


def metal(rng, low, mute):
    t=clock(.19 if mute else .72)
    base=220 if low else 595
    # A broad falling big luo, and a climbing small luo, alternate in the percussion answers.
    phase=TAU*base*(t+(.032 if low else -.013)*(1-np.exp(-t*11)))
    bell=sum(v*np.sin(phase*r)*np.exp(-t*(5+i*2)*(3 if mute else 1))
             for i,(r,v) in enumerate([(1,.67),(1.42,.52),(2.37,.43),(3.61,.21),(5.12,.16)]))
    return (bell+.14*air(t,rng,2)*np.exp(-t*45))*np.minimum(t/.002,1)*np.minimum((len(t)/RATE-t)/.024,1)


def render(name,bpm,phrases):
    rng=np.random.default_rng(sum(name.encode()))
    beat=60/bpm
    mix=np.zeros(round(16*4*beat*RATE))
    def put(at, signal, gain, room=False):
        for lag,v in ([(0,1),(.068,.105),(.129,.044)] if room else [(0,1)]):
            start=round((at*beat+lag)*RATE)%len(mix)
            n=min(len(signal),len(mix)-start)
            mix[start:start+n]+=signal[:n]*gain*v
            if n<len(signal): mix[:len(signal)-n]+=signal[n:]*gain*v
    for phrase in range(8):
        notes=phrases[(phrase//2+phrase%2)%2] if phrase<4 else phrases[(phrase+1)%2]
        assert abs(sum(length for _,length in notes)-8)<.001,name
        pos=8*phrase
        for i,(note,length) in enumerate(notes):
            if note:
                high=phrase in (5,7)
                put(pos,lead(note,length*beat*.91,rng),.245,True)
                if length>=1 or high:
                    put(pos+.016,lead(note-(5 if i%3 else 12),length*beat*.84,rng),.135,True)
            pos+=length
    roots={'brass-oath':[41,46,38,36],'brass-rally':[38,34,36,33]}
    for b in range(16):
        at=b*4
        root=roots[name][b%4]
        for k in [0,1.5,2,3.5]:
            put(at+k,pluck(root+(7 if k==1.5 else 0),.34,rng),.52)
        for k in [0,2]: put(at+k,skin(81,.43,rng),.63)
        for k in [1,3]:
            t=clock(.15);snare=(.58*air(t,rng,2)+.38*np.sin(TAU*194*t))*np.exp(-t*31)*np.minimum(t/.002,1)
            put(at+k,snare,.49,True)
        if b%4==0: put(at,metal(rng,False,False),.19)
        if b%4==3:
            for j,k in enumerate([3.125,3.375,3.625,3.875]):
                put(at+k,skin(168+j*15,.15,rng),.16+j*.06)
    # Match audition loudness so the loudest entry does not win the comparison.
    mix=np.tanh(mix*1.1)
    return mix*min(.87/np.max(abs(mix)),.173/np.sqrt(np.mean(mix**2)))


if __name__=='__main__':
    tmp=ROOT/'local/audio-review-masters';tmp.mkdir(exist_ok=True,parents=True)
    target=ROOT/'assets/music'
    for name,(bpm,phrases) in SCORES.items():
        signal=render(name,bpm,phrases)
        master=tmp/(name+'.wav')
        with wave.open(str(master),'wb') as f:
            f.setparams((1,2,RATE,0,'NONE','not compressed'));f.writeframes(np.round(signal*32767).astype('<i2').tobytes())
        out=tmp/(name+'.m4a');out.unlink(missing_ok=True)
        subprocess.run(['afconvert','-f','m4af','-d','aac','-b','64000',str(master),str(out)],check=True)
        out.replace(target/out.name)
        meta={'ver':'1.0.0','importer':'audio-clip','imported':True,'files':['.json','.m4a'],'subMetas':{},'userData':{'downloadMode':0}}
        meta['uuid']=str(uuid.uuid5(uuid.NAMESPACE_URL,'taoyuan-music-room/'+name))
        (target/(name+'.m4a.meta')).write_text(json.dumps(meta,indent=2)+'\n')
