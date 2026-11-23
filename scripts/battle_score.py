"""Original offline battle scores and close-miked weapon Foley, at the runtime's 24 kHz."""
import numpy as np

RATE = 24000
TAU = 2 * np.pi


def clock(seconds):
    return np.arange(round(seconds * RATE)) / RATE


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def air(t, rng, width):
    """Correlated noise: a soft skin, string or fabric transient."""
    white = rng.standard_normal(len(t))
    return np.convolve(white, np.ones(width) / np.sqrt(width), 'same')


def pluck(note, length, rng, muted=False):
    t = clock(length)
    hz = frequency(note)
    phase = TAU * hz * (t + .00010 * (1 - np.exp(-t * 85)))
    string = sum(np.sin(h * phase * (1 + .000012 * h*h)) *
                 np.sin(h * .89) ** 2 / h**1.12 * np.exp(-t * (4 + h * 1.7 + 8 * muted))
                 for h in range(1, 11))
    pick = air(t, rng, 5) * np.exp(-t * 165) * .09
    return (string + pick) * np.minimum(t / .002, 1) * np.minimum((length-t)/.022, 1)


def horn(note, length, rng):
    t = clock(length)
    # A brief upward lip slur, then breath and a restrained vibrato at the tail.
    vibrato = .0034 * np.sin(TAU*4.7*t) * np.minimum(t/.38, 1)
    pitch = frequency(note) * (1 - .028*np.exp(-t*22) + vibrato)
    phase = TAU * np.cumsum(pitch) / RATE
    breath = .014 * air(t, rng, 12)
    body = np.sin(phase) + .46*np.sin(2*phase) + .30*np.sin(3*phase) + .12*np.sin(5*phase)
    return (body + breath) * np.minimum(t/.055, 1) * np.minimum((length-t)/.105, 1)


def skin(hz, length, rng):
    t = clock(length)
    phase = TAU * hz * (t + .009*(1-np.exp(-t*52)))
    body = (np.sin(phase) + .57*np.sin(1.54*phase) + .33*np.sin(2.24*phase)) * np.exp(-t*9)
    rim = .38 * air(t, rng, 8) * np.exp(-t*55)
    return (body + rim) * np.minimum(t/.002, 1) * np.minimum((length-t)/.025, 1)


def score(boss):
    rng = np.random.default_rng(1142 if boss else 1141)
    beat = 60 / (160 if boss else 128)
    bars = 20 if boss else 32
    mix = np.zeros(round(RATE * beat * 4 * bars))
    # Fixed, wrapping early reflections let the downbeat follow the last drum pickup cleanly.
    def place(bar, pulse, signal, level, room=0):
        for delay, gain in [(0, 1), (.071, room), (.127, room*.5)]:
            if not gain:
                continue
            i = round(((bar*4+pulse)*beat + delay)*RATE) % len(mix)
            n = min(len(signal), len(mix)-i)
            mix[i:i+n] += signal[:n]*level*gain
            if n < len(signal):
                mix[:len(signal)-n] += signal[n:]*level*gain

    # D minor pentatonic. Four phrases move between pedal, answer, breakdown and rally.
    roots = [38, 38, 41, 36, 38, 43, 36, 33]
    horn_calls = [
        [(0, 62, 1.4), (2, 65, .55), (2.75, 67, .95)],
        [(.5, 69, .85), (2, 67, .6), (3, 62, .8)],
        [(0, 57, 1.5), (2.5, 60, .65), (3.25, 62, .65)],
        [(0, 67, .65), (1, 65, .65), (2, 62, 1.65)],
    ]
    for b in range(bars):
        phrase = (b // (5 if boss else 8)) % 4
        root = roots[b % 8]
        space = phrase == 2 and b % 4 < 2
        strong = [(0, 1), (1.5, .46), (2.5, .79)] if b%2==0 else [(0,.9),(1,.43),(2,.88),(3.5,.48)]
        if space:
            strong = [(0, .82), (2.5, .48)]
        for at, vel in strong:
            place(b, at, skin((82 if boss else 94)+rng.uniform(-2,2), .49, rng), .64*vel, .12)
        for at in ([.75,1.75,3,3.75] if boss else [1,3.5]):
            if not space:
                place(b, at, skin(173 + rng.uniform(-5,5), .22, rng), .27 if at==3 else .19, .07)
        for at, interval in [(0,0),(.75,7),(1.5,0),(2,0),(3,7),(3.5,12)]:
            if space and at not in (0,2):
                continue
            place(b,at,pluck(root+interval,.38,rng,True),.39 if interval==0 else .19)
        if b % 4 in (0,2):
            call=horn_calls[(phrase + (b%4)//2) % 4]
            for at,note,duration in call:
                place(b,at,horn(note-(5 if boss else 0),duration*beat,rng),.19 if boss else .145,.14)
        elif not space:
            for at, note in [(0.5,62),(1.25,65),(2.5,67),(3,65 if b%4==1 else 60)]:
                place(b,at,pluck(note,.36,rng),.24,.12)
        if b%4==3 or b==bars-1:
            for i,at in enumerate((3,3.25,3.5,3.75)):
                place(b,at,skin(146+i*7,.21,rng),.11+i*.045)
    return np.tanh(mix*1.05)*.87


# centre frequencies, relative decay and attack noise differ by material.
# Both cues share the same material, but the contact always has a lower, firmer body.
TIMBRES = {
    'wood':   ((365,790,1330),(188,462,815),  10,.17,.14),
    'blade':  ((1080,2010,3190),(415,1440,2365), 2,.21,.16),
    'heavy':  ((310,865,1360),(159,351,966),  9,.23,.19),
    'bow':    ((267,562,956),(268,625,1070),  5,.10,.105),
    'gun':    ((215,528,1275),(292,684,1170), 3,.61,.09),
    'blast':  ((190,428,900),(97,206,430),   12,.70,.23),
    'petal':  ((690,1225,1990),(570,990,1650),8,.09,.13),
    'spirit': ((760,1510,2505),(615,1380,2275),4,.11,.18),
    'thunder':((310,805,1380),(126,295,710),  4,.56,.22),
    'ritual': ((510,1005,1670),(448,887,1515),9,.08,.18),
}


def weapon_sample(family, hit):
    release, contact, width, noise_gain, sustain = TIMBRES[family]
    rng = np.random.default_rng(510 + list(TIMBRES).index(family)*2 + hit)
    length = sustain if hit else sustain*.64
    t = clock(length)
    decay = 5 / length
    phase = TAU * (t + (.0016 if hit else .0007)*(1-np.exp(-t*80)))
    body = sum(gain*np.sin(phase*freq)*np.exp(-t*decay*speed)
               for freq,gain,speed in zip(contact if hit else release,(1,.52,.23),(1,1.24,1.7)))
    grain = air(t,rng,width)*np.exp(-t*(75 if hit else 120))
    # Different excitation as well as pitch: taut bowstring, sliding steel,
    # dry wood contact, mechanical bolt, folded petals and trapped air.
    if family == 'bow' and not hit:
        body = pluck(60,.12,rng,True)[:len(t)] + .24*np.sin(phase*181)*np.exp(-t*48)
    elif family in ('blade','heavy','spirit'):
        scrape = np.diff(air(t,rng,4),prepend=0)
        grain += scrape*np.exp(-((t-(.01 if hit else .026))/.015)**2)*1.9
        if hit:
            body += .21*np.sin(TAU*contact[1]*1.013*t)*np.exp(-t*18)
    elif family == 'wood':
        body += .21*np.sin(phase*241)*np.exp(-((t-.014)/.011)**2)
    elif family in ('gun','thunder'):
        # A mechanical return / electric snap is shorter and higher than the body.
        grain += air(t,rng,2)*np.exp(-((t-(.022 if family=='gun' else .033))/.004)**2)*1.6
    elif family == 'blast':
        grain += air(t,rng,19)*(1-np.exp(-t*85))*np.exp(-t*19)*1.1
    elif family == 'petal':
        grain = air(t,rng,4)*np.exp(-t*31)*(.65+.35*np.cos(TAU*45*t))
        body *= .47
        noise_gain = .45
    elif family == 'ritual':
        body += .25*np.sin(TAU*release[1]*t)*np.exp(-((t-.022)/.012)**2)
    x = (.72*body+noise_gain*grain)*np.minimum(t/.0018,1)*np.minimum((length-t)/.008,1)
    return x*.69/np.max(np.abs(x))
