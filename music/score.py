#!/usr/bin/env python3
"""The Ostrich, Plate VII — original score. 88 BPM, D minor opening, D major turn at the iris.
Harpsichord + lute (dry, while lines are cut), harp after the turn, recorder at the finished plate.
Renders out/music.wav (48 kHz stereo). Read by mix.py, which ducks it under the narration."""
import json, sys, os
import numpy as np
import soundfile as sf

LIB = os.environ.get('LIB', '/home/z/my-project/lemo-opuscar')
sys.path.insert(0, LIB)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, limit

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(f'{PROJ}/timeline.json'))
BPM = TL['bpm']; B = 60.0 / BPM; DUR = TL['dur']

buf = np.zeros((int((DUR + 4) * SR), 2), np.float32)

def b(n):  # beat → seconds
    return n * B

def lute(t, pitch, dur=None, vel=.5, pan=0.0, **kw):
    add(buf, P.pluck('nylon_guitar', pitch, dur, vel, **kw), t, .9, pan)

def hsd(t, pitch, dur=.5, vel=.4, pan=0.0):
    add(buf, S.note('harpsichord', pitch, dur, vel), t, .9, pan)

def harp(t, pitch, vel=.4, pan=0.0):
    add(buf, S.note('harp', pitch, 2.5, vel), t, .9, pan)

def rec(t, pitch, dur=1.2, vel=.3, pan=-0.15):
    add(buf, S.note('recorder', pitch, dur, vel), t, .8, pan)

def ting(t, vel=.25):
    add(buf, S.hit('triangle', 'muted', vel, dur=.8), t, .7, .3)

# ---- s0: solo lute in the rests of the burin (0 – b9) -----------------------
for bb, p, v in [(0, 'D3', .5), (2, 'A3', .45), (3.5, 'F4', .4), (5, 'E4', .38), (6.5, 'D4', .42), (8, 'A3', .4)]:
    lute(b(bb), p, vel=v)

# ---- s1/s2: harpsichord + lute pulse (b9 – b38) -----------------------------
D_MIN = ['D4', 'F4', 'A4', 'F4']
for bar in range(9, 38, 2):           # 2-bear pattern, 8th-note pulse
    for k in range(4):                # four 8ths per bar (2 beats)
        bbp = bar + k * 0.5
        if bbp >= 38: break
        pitch = D_MIN[k % 4]
        if bbp >= 24 and k == 0:      # low octave weight in the legs section
            lute(b(bbp), 'D2' if (bar // 2) % 2 == 0 else 'A2', vel=.34)
            hsd(b(bbp), 'D3', dur=.42, vel=.3)
        else:
            hsd(b(bbp), pitch, dur=.4, vel=.3 + 0.05 * (k == 0))
    if bar % 4 == 1:                  # lute answers between bars
        lute(b(bar + 1.25), 'A3', vel=.3, pan=.25)

# ---- s3: the silence (b38 – b40.3), then pp re-entry ------------------------
hsd(b(40.35), 'D5', dur=.9, vel=.2)                      # first sound after the silence
ting(b(40.4), .22)                                        # the ring is scribed
for k, p in enumerate(['D4', 'F4', 'A4', 'D5']):          # rising harp as the roundel flies
    harp(b(45 + k * 0.7), p, vel=.3)
hsd(b(47.4), 'A4', dur=.6, vel=.2)

# ---- the iris: the turn to D major (b49.1) ----------------------------------
for k, p in enumerate(['D4', 'F#4', 'A4', 'D5']):
    harp(b(49.1) + k * 0.16, p, vel=.34)

# ---- s4: harp arpeggio up as the sheet peels (b53 – b59) --------------------
for k, p in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']):
    harp(b(53.2) + k * 0.42, p, vel=.3, pan=-.2 + k * .08)

# ---- s5: harp + lute, warm, thinning (b59 – b71) ----------------------------
for i, bbp in enumerate([59.5, 61, 62.5, 64, 66, 68]):
    lute(b(bbp), ['D2', 'A2', 'D3', 'A2', 'D2', 'D3'][i], vel=.3)
for i, p in enumerate(['D4', 'A4', 'F#4', 'A4', 'E4', 'D4']):
    harp(b(59.6 + i * 1.5), p, vel=.26)
harp(b(66.8), 'F#5', vel=.2, pan=.2)

# ---- s6: the finished plate (b71 – b85) -------------------------------------
rec(b(71.1), 'A4', dur=1.4, vel=.26)
rec(b(73), 'B4', dur=1.2, vel=.24)
rec(b(74.6), 'C#5', dur=1.2, vel=.24)
rec(b(76.4), 'D5', dur=1.8, vel=.26)
ting(b(79.05), .2)                                        # the lock
for p, v in [('D3', .4), ('A3', .34), ('D4', .3), ('F#4', .28)]:   # final chord, let ring
    hsd(b(79.1), p, dur=3.2, vel=v)
harp(b(79.3), 'D5', vel=.3)
rec(b(81), 'D5', dur=2.6, vel=.2)

mix = limit(buf[:int((DUR + 3.5) * SR)])
sf.write(f'{PROJ}/out/music.wav', mix, SR)
peak = 20 * np.log10(max(1e-9, np.abs(mix).max()))
print(f'music.wav written: {len(mix)/SR:.2f}s, peak {peak:.1f} dBFS')
