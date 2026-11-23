#!/usr/bin/env python3
"""Pack the audition cues, current martial scores and material Foley for Cocos.

Multi-release arrows/thunder/meteor/volley cues are single-event assets. The
simulation supplies timing; never play an uncancellable whole cast montage.
"""
from pathlib import Path
import json, wave, uuid, shutil, hashlib
import numpy as np
from battle_score import TIMBRES, weapon_sample

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / 'art/audio/review-v1'
m = json.loads((REVIEW / 'manifest.json').read_text())
target = ROOT / 'assets/sfx'
meta = {'ver':'1.0.0','importer':'audio-clip','imported':True,'files':['.json','.wav'],'subMetas':{},'userData':{'downloadMode':0}}

def metadata(path, extension):
    p = Path(str(path)+'.meta')
    if p.exists(): return
    core=ROOT/'assets/sfx-core'/p.name
    if path.parent.name=='sfx' and core.exists(): shutil.copyfile(core,p); return
    uid = str(uuid.uuid5(uuid.NAMESPACE_URL, 'taoyuan-audio-v10/' + path.relative_to(ROOT).as_posix()))
    d = dict(meta, uuid=uid, files=['.json', extension])
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')

def read(path):
    with wave.open(str(path),'rb') as f:
        assert f.getframerate()==24000 and f.getnchannels()==1
        return np.frombuffer(f.readframes(f.getnframes()),'<i2').astype(float)/32768

def save(path,x):
    x=x.copy();edge=min(96,len(x)//4);x[:edge]*=np.linspace(0,1,edge);x[-edge:]*=np.linspace(1,0,edge)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(np.round(x*32767).astype('<i2').tobytes())

boss_sources={
 'zhangjiao':['thunder-hit','thunder-hit','ritual-attack'],
 'lvbu':['charge-warn','skill-G03','heavy-hit'],
 'dongzhuo':['heavy-hit','coin','blast-hit'],
 'yuanshao':['enemy-bow','bow-attack','bow-hit'],
 'caocao':['blade-attack','ui-open','charge-warn'],
 'menghuo':['charge-warn','melee-commit','wood-hit'],
 'simayi':['wood-hit','ritual-hit','blast-hit'],
}
cues={}; adopt=[]
for e in m['entries']:
    if e['group'] in ['配乐','混音'] or e['id']=='sandal-hit': continue
    name=e['id'];data=read(REVIEW/e['file'])
    if name=='skill-G08': data=data[:round(.095*24000)]
    if name=='skill-G19': data=read(REVIEW/'sfx/thunder-hit.wav')
    if name=='skill-G20':
        impact=read(REVIEW/'sfx/blast-hit.wav');chime=read(REVIEW/'sfx/ritual-hit.wav');data=np.zeros(max(len(impact),len(chime)))
        data[:len(impact)]+=impact*.72;data[:len(chime)]+=chime*.28
    if name=='skill-G22': data=data[:round(.29*24000)]
    # Boss release motifs are trimmed to a single release; repeat timing belongs
    # to live boss events. No future attack may be audible after interruption.
    if name.startswith('boss-') and name.count('-')==2:
        _,boss,move=name.split('-');data=read(REVIEW/'sfx'/(boss_sources[boss][int(move)-1]+'.wav'))
        data=data[:min(len(data),round(.60*24000))]
    path=target/(name+'.wav');save(path,data);metadata(path,'.wav');adopt.append(name)
    cues[name]={'volume':e['gain']*.9,'duration':round(len(data)/24000,6),'gap':e['gap'],'priority':e['priority']}
    if name=='skill-G08':cues[name]['gap']=.08
    if name in ['skill-G19','skill-G20','skill-G22']:cues[name]['gap']=.20
cues['sandal-hit-pcm']={'volume':.40,'duration':.444,'gap':.09,'priority':2}
# Remove only the obsolete ten compatibility effects, retained in Git history.
for stem in ['beans','peach','cleaver','rollingpin','firecracker']:
    for event in ['attack','hit']:
        for ext in ['.wav','.wav.meta']:(target/(stem+'-'+event+ext)).unlink(missing_ok=True)
# Content aliases retain event identity while sharing one physical clip.
core_ids=set(['player-hurt','coin','heal','block','skill-ready','dash','hoof','footstep','enemy-fall','enemy-bow','melee-commit','charge-warn','danger','spawn','ui-click','ui-hero','ui-equip','ui-close','ui-start','skill-G01','skill-G03','skill-G08'])
for family in ['wood','blade','heavy','bow','gun','blast','petal','spirit','thunder','ritual']:
    core_ids.update([family+'-attack',family+'-hit'])
groups={}
for name in adopt:
    path=target/(name+'.wav');groups.setdefault(hashlib.sha256(path.read_bytes()).hexdigest(),[]).append(name)
sound_assets={};physical=[]
for group in groups.values():
    canonical=group[0];bundle='sfx-core' if any(n in core_ids for n in group) else 'sfx'
    old=target/(canonical+'.wav');dest=ROOT/'assets'/bundle/(canonical+'.wav');dest.parent.mkdir(exist_ok=True)
    family,_,event=canonical.partition('-')
    if family in TIMBRES and event in ('attack','hit'):
        pcm=weapon_sample(family,event=='hit')
        save(old,pcm)
        for alias in group: cues[alias]['duration']=round(len(pcm)/24000,6)
    if old!=dest:
        for suffix in ['', '.meta']:
            Path(str(dest)+suffix).unlink(missing_ok=True);shutil.move(str(old)+suffix,str(dest)+suffix)
    for name in group:
        sound_assets[name]={'bundle':bundle,'name':canonical}
        if name!=canonical:
            for suffix in ['.wav','.wav.meta']:(target/(name+suffix)).unlink(missing_ok=True)
    physical.append({'bundle':bundle,'name':canonical,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size})
# Clear replaced physical artifacts only; all adopted sounds are listed above.
for bundle in ['sfx','sfx-core']:
    keep={r['name'] for r in physical if r['bundle']==bundle}
    for p in (ROOT/'assets'/bundle).glob('*.wav'):
        if p.stem not in keep:p.unlink();Path(str(p)+'.meta').unlink(missing_ok=True)

# The two approved AAC masters are rendered by music_auditions.py.
music=['brass-oath','brass-rally']
for name in music:
    if not (ROOT/'assets/music'/(name+'.m4a')).is_file():
        raise FileNotFoundError('Render the brass score with scripts/music_auditions.py')
families={w['id']:w['family'] for w in m['weapons']}
out='// Generated by scripts/pack-game-audio.py from the approved audition pack.\n'
out+='export const AUDIO_CUES = '+json.dumps(cues,ensure_ascii=False,indent=2)+' as const;\n'
out+='export const SOUND_ASSETS = '+json.dumps(sound_assets,ensure_ascii=False,indent=2)+' as const;\n'
out+='export const WEAPON_AUDIO_FAMILIES:Record<string,string> = '+json.dumps(families,ensure_ascii=False,indent=2)+';\n'
(ROOT/'assets/scripts/audio-catalog.ts').write_text(out)
(ROOT/'art/audio/runtime-manifest.json').write_text(json.dumps({'source':'review-v1/manifest.json','combatScoreAndFoley':'scripts/battle_score.py','status':'adopted','sfx':adopt,'music':music,'musicFormat':'AAC mono 24kHz 64kbps','physicalSounds':physical,'aliases':sound_assets,'skillSegmentation':['G08 per arrow','G19 one thunderclap per volley','G20 one impact accent per three meteors','G22 per volley'],'bossCueMaxSeconds':.6},ensure_ascii=False,indent=2)+'\n')
print('Packed',len(adopt),'effects and 2 compact music loops')
