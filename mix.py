#!/usr/bin/env python3
"""The Ostrich, Plate VII — final mix: room tone, foley (from events.json), score, narration.
Voice rides ~10 dB over music; music and foley duck under the voice; a true silence at the eye.
Writes out/mix.wav (48 kHz stereo)."""
import json, math, os, sys
import numpy as np
import soundfile as sf

LIB = os.environ.get('LIB', '/home/z/my-project/lemo-opuscar')
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, limit, compress, noise, brown, bp, hp, lp, env_exp, t_, norm, thump, whoosh, click, clack, rumble, ding

PROJ = os.path.dirname(os.path.abspath(__file__))

def mix_in(dst, src, at, gain=1.0):
    """drop a pre-rendered stereo buffer into a stereo buffer"""
    s = int(at * SR); e = min(len(dst), s + len(src))
    if e <= s: return
    dst[s:e] += src[:e - s] * gain

def comp2(x, **kw):
    return np.stack([compress(x[:, 0], **kw), compress(x[:, 1], **kw)], 1).astype(np.float32)

def limit2(x, **kw):
    return np.stack([limit(np.ascontiguousarray(x[:, 0]), **kw), limit(np.ascontiguousarray(x[:, 1]), **kw)], 1).astype(np.float32)
DUR = json.load(open(f'{PROJ}/timeline.json'))['dur']
EV = json.load(open(f'{PROJ}/events.json'))['ev']
N = int((DUR + 0.2) * SR)

room = np.zeros((N, 2), np.float32)     # ambience bed
foley = np.zeros((N, 2), np.float32)    # material sounds
music = sf.read(f'{PROJ}/out/music.wav', always_2d=True)[0].astype(np.float32)
M = min(N, len(music)); music = np.concatenate([music, np.zeros((N - M, 2), np.float32)])[:N]

# ------------------------------------------------------------- room tone beds
# workroom with a faint clock until the press pass; paper room afterwards (no clock)
PRESS = next(e['t'] for e in EV if e['type'] == 'press' and e['t'] > 30)
air = lp(brown(DUR + 1), 900) * 0.012
add(room, air, 0, 1.0)
tick_int = 1.0
tt = 0.35
while tt < PRESS - 0.2:
    add(room, click(0.62, 0.16), tt, 0.5, -0.35)      # the clock, quiet, left of frame
    tt += tick_int
air2 = lp(brown(DUR + 1), 700) * 0.009
add(room, air2, PRESS, 1.0)

# ------------------------------------------------------------- foley
for e in EV:
    ty, t = e['type'], e['t']
    if ty in ('vo', 'silence'):
        continue
    if ty == 'burin':                                  # band-passed hiss with chatter, until lift
        d = e['until'] - t
        x = bp(noise(d), 2600, 9000) * env_exp(d, d * 0.9)
        ch = np.zeros((int(d * SR), 2), np.float32)
        for i in range(int(d / 0.31)):
            add(ch, clack(1.3 + 0.3 * ((i * 7) % 3), 0.1), i * 0.31 + 0.05)
        add(foley, x * 0.5, t, 0.55, 0.08)
        mix_in(foley, ch * 0.6, t, 0.5)
    elif ty == 'lift':
        add(foley, clack(1.8, 0.5), t, 0.7)
        add(foley, ding(0.25) * 0.3, t + 0.01, 0.3)
    elif ty == 'press':
        add(foley, rumble(1.4, 0.8) * np.minimum(1, env_exp(1.4, 0.9)), t, 0.8)
        add(foley, thump(0.9, 62), t + 0.22, 0.8)
    elif ty == 'peel':
        d = 0.9
        cr = bp(noise(d), 1500, 7500) * (0.25 + 0.75 * np.abs(np.sin(t_(d) * 2 * math.pi * 13 + 1)))
        add(foley, cr * env_exp(d, 0.55), t, 0.5)
        add(foley, whoosh(0.5, 0.7), t + 0.1, 0.4)
    elif ty == 'roller':                               # the press pass, heavier
        d = e['until'] - t
        add(foley, rumble(d, 1.0), t, 0.9)
        add(foley, thump(0.7, 55), t + 0.05, 0.6)
    elif ty == 'hatch':                                # granular micro-scratches, density by d
        d = e['until'] - t
        dens = 90 * e.get('d', 1.0)
        rng = np.random.default_rng(7)
        x = np.zeros((int(d * SR), 2), np.float32)
        for i in range(int(d * dens)):
            at = rng.uniform(0, d - 0.02)
            sc = bp(noise(0.018), 3000, 9500) * rng.uniform(0.25, 1.0)
            add(x, sc, at, 0.5, rng.uniform(-0.4, 0.4))
        mix_in(foley, x, t, 0.42)
    elif ty == 'letters':
        d = e.get('dur', 0.6)
        for i in range(e.get('n', 6)):
            add(foley, click(1.1 + 0.2 * (i % 3), 0.16), t + d * i / max(1, e['n'] - 1), 0.5, 0.1)
    elif ty == 'title':
        d = e.get('dur', 0.9)
        for i in range(e.get('n', 12)):
            add(foley, click(1.0 + 0.15 * (i % 4), 0.2), t + d * i / max(1, e['n'] - 1), 0.55)
    elif ty == 'rule':
        add(foley, whoosh(e.get('dur', 0.8), 0.4), t, 0.35)
    elif ty == 'ring':
        d = 1.05
        x = bp(noise(d), 3200, 8200) * np.sin(t_(d) * 2 * math.pi * 2.2) ** 2
        add(foley, x, t, 0.5)
        add(foley, ding(0.4) * 0.35, t + 0.9, 0.4)
    elif ty == 'burnish':
        d = 0.7
        x = lp(noise(d), 1400) * np.sin(t_(d) * math.pi)
        add(foley, x, t, 0.4)
    elif ty == 'cut':
        d = e['until'] - t
        rng = np.random.default_rng(11)
        x = np.zeros((int(d * SR), 2), np.float32)
        for i in range(int(d * 60)):
            at = rng.uniform(0, d - 0.02)
            add(x, bp(noise(0.014), 3600, 9800) * rng.uniform(0.2, 0.8), at, 0.4, rng.uniform(-0.3, 0.3))
        mix_in(foley, x, t, 0.34)
    elif ty == 'travel':
        add(foley, whoosh(e['until'] - t, 0.9), t, 0.45)
    elif ty == 'land':
        add(foley, clack(0.9, 0.45), t, 0.6)
        add(foley, S.note('harp', 'D3', 1.2, 0.3), t + 0.02, 0.5, 0.2)
    elif ty == 'quill':
        d = e.get('dur', 1.0)
        rng = np.random.default_rng(5)
        x = np.zeros((int(d * SR), 2), np.float32)
        n = int(d * 4)
        for i in range(n):
            at = d * i / n
            sc = bp(noise(0.2), 1800, 6400) * np.sin(math.pi * min(1, (d - at) / 0.2)) * 0.5
            add(x, sc, at, 0.5, -0.2)
        mix_in(foley, x, t, 0.4)
    elif ty == 'plip':
        x = np.sin(t_(0.09) * 2 * math.pi * (900 - 3800 * t_(0.09))) * env_exp(0.09, 0.03)
        add(foley, x, t, 0.5)
    elif ty == 'brush':
        d = e.get('dur', 1.3)
        x = bp(noise(d), 900, 4200) * (0.35 + 0.65 * np.abs(np.sin(t_(d) * 2 * math.pi * 2.4)))
        add(foley, x * env_exp(d, d * 0.8), t, 0.3)
    elif ty == 'nest':
        d = e['until'] - t
        rng = np.random.default_rng(3)
        x = np.zeros((int(d * SR), 2), np.float32)
        for i in range(int(d * 26)):
            at = rng.uniform(0, d - 0.03)
            add(x, bp(noise(0.03), 1400, 5200) * rng.uniform(0.3, 1.0), at, 0.4, rng.uniform(-0.5, 0.5))
        mix_in(foley, x, t, 0.3)
    elif ty == 'lock':
        add(foley, clack(0.7, 0.5), t, 0.7)

# ------------------------------------------------------------- narration
duck = np.ones((N, 1), np.float32)
voice = np.zeros((N, 2), np.float32)
for e in EV:
    if e['type'] != 'vo':
        continue
    x, sr = sf.read(f"{PROJ}/voices/{e['id']}.wav")
    if x.ndim == 1: x = np.stack([x, x], 1)
    if sr != SR:
        import soxr
        x = soxr.resample(x, sr, SR)
    x = np.concatenate([x, np.zeros((int(0.05 * SR), 2), np.float32)])
    x = comp2(norm(x, 0.9), thr=.3, ratio=3.2)
    x = x / np.abs(x).max() * 0.82
    mix_in(voice, x[:N - int(e['t'] * SR)] if len(x) > N - int(e['t'] * SR) else x, e['t'], 1.0)
    # duck bed 55 % under the voice, smooth edges
    a, b = int((e['t'] - 0.3) * SR), int((e['t']) * SR)
    c, d2 = int((e['t'] + e['dur']) * SR), int((e['t'] + e['dur'] + 0.55) * SR)
    duck[a:b, 0] = np.linspace(1, 0.45, b - a)
    duck[c:d2, 0] = np.linspace(0.45, 1, d2 - c)
    duck[b:c, 0] = 0.45
duck = np.repeat(duck, 2, 1).astype(np.float32)

# ------------------------------------------------------------- true silence at the eye
sil = [e for e in EV if e['type'] == 'silence']
if sil:
    s0, s1 = int(sil[0]['t'] * SR), int(sil[0]['until'] * SR)
    duck[s0:s1] = 0.0
    room[s0:s1] *= np.linspace(1, 0, s1 - s0)[:, None] if False else 0
    foley[s0:s1] = 0

mix = room * 0.9 + foley * duck + music * duck * 0.62 + voice
mix = comp2(mix, thr=.5, ratio=2.5, att=.01, rel=.12)
mix = limit2(mix, ceil=.92)
sf.write(f'{PROJ}/out/mix.wav', mix[:N], SR)
print(f'mix.wav: {len(mix[:N])/SR:.2f}s, peak {20*np.log10(np.abs(mix[:N]).max()+1e-9):.1f} dBFS')
