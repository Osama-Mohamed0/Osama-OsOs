"""Compose the film score (900 s, 48 kHz stereo) -> audio/stems/music.wav

Themes
- Bayezid «the Thunderbolt»: maqam Hijaz on D — mehter brass/zurna, davul, zil.
- Timur «the Lame»: maqam Nahawand on A (low) — kemence, kos (great kettle drum).
- Lament: maqam Kurd on D — ney.
Each scene gets a cue built from these materials and the scene timing (story/timing.json),
with hits synced to narration word cues (src/data/cues.ts)."""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from audio_lib import (SR, bowed, brass, cue_time, degree, drone, drum, env_adsr, load_timeline, midi, ney, norm, oud, pan, place,
                       reverb, rng, sfx_riser)

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TIM, START, LEN, CUES = load_timeline()
TOTAL = 900.0
BUF = np.zeros((int(TOTAL * SR) + SR * 4, 2), np.float32)
DRY_DRUMS = np.zeros_like(BUF)  # drums get less reverb

THEME_B = [(4, 1), (5, .5), (4, .5), (3, .5), (2, .5), (1, 1), (2, 1), (0, 2), (0, .5), (1, .5), (2, 1), (3, .5), (4, .5), (5, 1), (4, .5), (3, .5), (4, 2)]
THEME_T = [(0, 2), (2, 1), (3, 1), (4, 2), (5, 1), (4, 1), (3, 1), (2, 1), (1, 2), (0, 3)]
LAMENT = [(4, 2), (3, 1), (2, 1), (3, 1.5), (2, .5), (1, 1), (0, 3), (2, 1), (1, 1), (0, 1), (-1, 1), (0, 3)]


def S(sid, rel=0.0):
    return START[sid] + rel


def E(sid):
    return START[sid] + LEN[sid]


def C(sid, word, nth=0, fb=None):
    return cue_time(CUES, START, sid, word, nth, fb)


# ------------------------------------------------------------ building blocks
def pad(t0, t1, tonic=50, vel=0.5, fifth=True, bright=6, seed=0):
    dur = t1 - t0
    if dur <= 0.5:
        return
    y = drone(midi(tonic), dur, vel, bright=bright, seed=seed)
    if fifth:
        y = y + drone(midi(tonic + 7), dur, vel * 0.5, bright=bright - 2, seed=seed + 1)
    place(BUF, pan(y, 0), t0)


def melody(t0, notes, bpm, instr='bowed', maqam='hijaz', tonic=62, vel=0.6, p=0.0, octave=0, legato=1.05, t_end=None):
    beat = 60 / bpm
    t = t0
    prev = None
    for d, b in notes:
        if t_end and t > t_end:
            break
        m = degree(maqam, d, tonic) + 12 * octave
        f = midi(m)
        dur = b * beat * legato
        if instr == 'bowed':
            y = bowed(f, dur, vel, slide_from=prev and prev * 0.97)
        elif instr == 'ney':
            y = ney(f, dur + 0.2, vel)
        elif instr == 'brass':
            y = brass(f, dur, vel)
        elif instr == 'zurna':
            y = bowed(f, dur, vel, nasal=1.6, bright=1.6, vib=6.5, depth=0.009, attack=0.04)
        else:
            y = oud(f, b * beat, vel)
            if b * beat > 0.9:  # tremolo (risha) on long oud notes
                k = 0.12
                while k < b * beat - 0.1:
                    place(BUF, pan(oud(f, 0.15, vel * 0.55), p), t + k)
                    k += 0.12
        place(BUF, pan(y, p), t)
        prev = f
        t += b * beat
    return t


def theme_loop(t0, t1, theme, bpm, **kw):
    t = t0
    while t < t1 - 1:
        t = melody(t, theme, bpm, t_end=t1 - 0.5, **kw)


def taqsim(t0, t1, maqam='nahawand', tonic=57, vel=0.55, p=-0.2, instr='oud', seed=0, density=1.0):
    r = np.random.default_rng(seed)
    t = t0 + 0.2
    d = 2
    while t < t1 - 0.6:
        d = int(np.clip(d + r.choice([-2, -1, -1, 0, 1, 1, 2]), -2, 9))
        if r.random() < 0.15:
            d = 0
        dur = r.choice([0.25, 0.25, 0.5, 0.5, 0.75, 1.0, 1.5]) / density
        m = degree(maqam, d, tonic)
        if instr == 'oud':
            y = oud(midi(m), dur, vel * r.uniform(0.75, 1))
        else:
            y = ney(midi(m + 12), dur + 0.3, vel * r.uniform(0.7, 1))
        place(BUF, pan(y, p), t)
        t += dur
        if r.random() < 0.12:
            t += r.uniform(0.3, 0.9)


def ostinato(t0, t1, bpm, pattern, maqam='kurd', tonic=50, vel=0.5, p=0.3):
    beat = 60 / bpm
    t = t0
    i = 0
    while t < t1:
        d = pattern[i % len(pattern)]
        if d is not None:
            place(BUF, pan(oud(midi(degree(maqam, d, tonic)), beat * 0.9, vel), p), t)
        t += beat / 2
        i += 1


DUYEK = [(0, 'davul', 1.0), (0, 'zil', 0.6), (1.5, 'tek', 0.5), (2, 'davul', 0.8), (3, 'tek', 0.6), (3.5, 'davul', 0.6)]
BATTLE = [(0, 'davul', 1.0), (0, 'kos', 0.7), (0.75, 'tek', 0.5), (1, 'davul', 0.8), (1.5, 'davul', 0.7), (2, 'davul', 0.9), (2.75, 'tek', 0.6), (3, 'davul', 0.8), (3.5, 'tek', 0.5), (3.75, 'davul', 0.6)]
SLOW = [(0, 'kos', 1.0), (2, 'davul', 0.5)]
FRAME = [(0, 'dum', 0.8), (1, 'tek', 0.4), (1.5, 'tek', 0.3), (2, 'dum', 0.6), (3, 'tek', 0.4)]


def rhythm(t0, t1, bpm, pattern, vel=0.6, beats=4, accel_to=None, crescendo=None):
    t = t0
    while t < t1:
        frac = (t - t0) / max(1e-6, t1 - t0)
        b = bpm if accel_to is None else bpm + (accel_to - bpm) * frac
        g = vel if crescendo is None else vel * (crescendo[0] + (crescendo[1] - crescendo[0]) * frac)
        beat = 60 / b
        for pos, kind, v in pattern:
            tt = t + pos * beat + rng.uniform(-0.006, 0.006)
            if tt < t1:
                place(DRY_DRUMS, pan(drum(kind), rng.uniform(-0.15, 0.15)), tt, g * v)
        t += beats * beat


def hit(t, kind='kos', vel=1.0):
    place(DRY_DRUMS, pan(drum(kind), 0), t, vel)


def heartbeat(t0, t1, bpm=60, vel=0.7, accel_to=None):
    t = t0
    while t < t1:
        frac = (t - t0) / max(1e-6, t1 - t0)
        b = bpm if accel_to is None else bpm + (accel_to - bpm) * frac
        place(DRY_DRUMS, pan(drum('heart'), 0), t, vel)
        t += 60 / b


def riser(t_end, dur=6, vel=0.7):
    place(BUF, pan(sfx_riser(dur), 0), t_end - dur, vel)


def silence(t0, t1):
    """Hard duck everything placed so far in [t0, t1] (used for the breath before the clash)."""
    i0, i1 = int(t0 * SR), int(t1 * SR)
    fade = int(0.25 * SR)
    for b in (BUF, DRY_DRUMS):
        b[i0:i1] = 0
        b[max(0, i0 - fade):i0] *= np.linspace(1, 0, min(fade, i0))[:, None]


# ------------------------------------------------------------ the score
def score():
    # ---------------- ACT I
    # S01 hook: dark drone, heartbeat, ney lament
    pad(S('S01'), E('S01') + 1, tonic=38, vel=0.7, seed=1)
    heartbeat(S('S01', 1), C('S01', 'الصاعقة', 0, 13) - 0.5, 56, 0.55)
    melody(S('S01', 4), LAMENT[:7], 46, instr='ney', maqam='hijaz', tonic=62, vel=0.45, p=-0.3)
    hit(C('S01', 'الصاعقة', 0, 13), 'kos', 1.0)
    heartbeat(C('S01', 'شيخ', 0, 18), E('S01') - 1.5, 62, 0.5, accel_to=80)
    hit(E('S01') - 0.6, 'kos', 0.9)
    # S02 title
    t = S('S02')
    hit(t, 'kos', 1.0)
    pad(t, E('S02') + 1, tonic=50, vel=0.9, bright=8, seed=2)
    rhythm(t + 0.4, E('S02') - 0.6, 96, DUYEK, 0.7)
    melody(t + 0.6, THEME_B[:8], 96, instr='brass', maqam='hijaz', tonic=50, vel=0.75, t_end=E('S02') - 0.5)
    melody(t + 0.6, THEME_B[:8], 96, instr='zurna', maqam='hijaz', tonic=62, vel=0.4, p=0.3, t_end=E('S02') - 0.5)
    hit(E('S02') - 0.5, 'kos', 1.0)
    # S03 Kosovo: majestic theme
    t = S('S03')
    pad(t, E('S03') + 1, tonic=50, vel=0.55, seed=3)
    rhythm(t + 3.2, E('S03') - 0.5, 72, DUYEK, 0.45)
    theme_loop(t + 3.2, E('S03') - 0.5, THEME_B, 72, instr='zurna', maqam='hijaz', tonic=62, vel=0.42, p=0.2)
    melody(C('S03', 'التاسعة', 0, 20), THEME_B[8:], 72, instr='brass', maqam='hijaz', tonic=50, vel=0.5)
    # S04 lightning campaigns
    t = S('S04')
    pad(t, E('S04') + 1, tonic=50, vel=0.5, seed=4)
    rhythm(t + 0.3, E('S04') - 0.5, 112, DUYEK, 0.55)
    ostinato(t + 0.3, E('S04') - 0.5, 112, [0, 4, 3, 4, 1, 4, 3, 2], 'hijaz', 50, 0.35)
    for w in ('آيدين', 'وصاروخان', 'ومنتشا', 'وكرميان', 'قرمان'):
        hit(C('S04', w, 0, 5) - 0.05, 'kos', 0.7)
    hit(C('S04', 'يلدرم', 0, 21), 'kos', 1.0)
    melody(C('S04', 'يلدرم', 0, 21) + 0.3, THEME_B[:8], 112, instr='brass', maqam='hijaz', tonic=50, vel=0.6)
    # S05 Nicopolis
    t = S('S05')
    pad(t, E('S05') + 1, tonic=50, vel=0.5, seed=5)
    rhythm(t + 0.5, C('S05', 'وسحقهم', 0, 14) + 2, 124, BATTLE, 0.55, crescendo=(0.6, 1.0))
    theme_loop(t + 0.5, C('S05', 'وسحقهم', 0, 14) + 2, THEME_B, 124, instr='zurna', maqam='hijaz', tonic=62, vel=0.38, p=-0.2)
    hit(C('S05', 'وسحقهم', 0, 14), 'kos', 1.0)
    melody(C('S05', 'ستيفان', 0, 18) - 0.5, THEME_B, 66, instr='bowed', maqam='hijaz', tonic=62, vel=0.4, t_end=E('S05') - 1)
    # S06 throne -> danger
    t = S('S06')
    cDanger = C('S06', 'الخطر', 0, 15)
    pad(t, cDanger + 1, tonic=50, vel=0.45, seed=6)
    taqsim(t + 0.3, cDanger, 'hijaz', 50, 0.5, seed=6)
    melody(t + 1, THEME_B[:8], 60, instr='ney', maqam='hijaz', tonic=62, vel=0.35, p=0.3, t_end=cDanger)
    pad(cDanger - 0.5, E('S06') + 1, tonic=45, vel=0.6, bright=4, seed=7)
    hit(cDanger, 'kos', 0.6)
    heartbeat(cDanger + 2, E('S06') - 0.5, 58, 0.4)
    # S07 Timur theme
    t = S('S07')
    pad(t, E('S07') + 1, tonic=45, vel=0.6, seed=8)
    rhythm(t + 0.5, E('S07') - 0.5, 64, SLOW, 0.5)
    theme_loop(t + 1, E('S07') - 0.5, THEME_T, 64, instr='bowed', maqam='nahawand', tonic=57, vel=0.5, p=-0.1)
    # S08 conquests
    t = S('S08')
    pad(t, E('S08') + 1, tonic=45, vel=0.65, seed=9)
    rhythm(t + 0.3, E('S08') - 0.5, 84, [(0, 'kos', 1.0), (1, 'davul', 0.6), (2, 'kos', 0.8), (3, 'davul', 0.6), (3.5, 'davul', 0.5)], 0.55)
    theme_loop(t + 0.5, E('S08') - 0.5, THEME_T, 84, instr='brass', maqam='nahawand', tonic=45, vel=0.5)
    theme_loop(t + 0.5, E('S08') - 0.5, THEME_T, 84, instr='bowed', maqam='nahawand', tonic=57, vel=0.35, p=0.3)
    # S09 one land two kings
    t = S('S09')
    cEnd = C('S09', 'ومع', 0, 9)
    melody(t + 0.5, LAMENT[:7], 52, instr='ney', maqam='kurd', tonic=62, vel=0.4, t_end=cEnd)
    pad(cEnd - 1, E('S09') + 1, tonic=50, vel=0.55, fifth=False, seed=10)
    heartbeat(cEnd, E('S09') - 0.5, 60, 0.55, accel_to=96)
    hit(C('S09', 'تلامست', 0, 14), 'kos', 0.8)
    # S10 refugees: intrigue ostinato
    t = S('S10')
    pad(t, E('S10') + 1, tonic=50, vel=0.4, seed=11)
    ostinato(t + 0.3, E('S10') - 0.5, 92, [0, None, 3, 2, 1, None, 2, 0], 'kurd', 50, 0.4)
    rhythm(t + 0.3, E('S10') - 0.5, 92, FRAME, 0.45)
    # S11 envoy: slow heavy
    t = S('S11')
    pad(t, E('S11') + 1, tonic=45, vel=0.55, seed=12)
    rhythm(t + 0.2, E('S11') - 0.3, 40, [(0, 'kos', 0.8)], 0.7)
    melody(t + 1.5, THEME_T[:5], 44, instr='ney', maqam='nahawand', tonic=57, vel=0.4)
    # S12 Timur's letter: oud taqsim nahawand
    t = S('S12')
    pad(t, E('S12') + 1, tonic=45, vel=0.45, seed=13)
    taqsim(t + 0.5, E('S12') - 0.5, 'nahawand', 45, 0.5, seed=13, density=0.8)
    hit(E('S12') - 1.6, 'kos', 0.8)
    # S13 the reply: anger
    t = S('S13')
    pad(t, E('S13') + 1, tonic=50, vel=0.55, seed=14)
    ostinato(t + 0.2, E('S13') - 0.5, 132, [0, 0, 1, 0, 4, 0, 3, 2], 'hijaz', 50, 0.45)
    rhythm(C('S13', 'وتقول', 0, 10), E('S13') - 0.5, 132, DUYEK, 0.5, crescendo=(0.5, 1.0))
    hit(C('S13', 'بالدم', 0, 20) - 0.15, 'kos', 1.0)
    # S14 drums of war
    t = S('S14')
    cDr = C('S14', 'الطبول', 0, 6)
    pad(t, cDr, tonic=45, vel=0.45, seed=15)
    hit(C('S14', 'أغلق', 0, 4), 'kos', 0.6)
    rhythm(cDr, E('S14') + 0.2, 100, [(0, 'kos', 1.0), (1, 'davul', 0.7), (1.5, 'davul', 0.6), (2, 'kos', 0.9), (3, 'davul', 0.8), (3.5, 'davul', 0.7)], 0.9)
    pad(cDr, E('S14') + 1, tonic=45, vel=0.7, bright=8, seed=16)
    theme_loop(cDr + 2.4, E('S14') - 0.3, THEME_T, 100, instr='brass', maqam='nahawand', tonic=45, vel=0.6)

    # ---------------- ACT II
    t = S('S15')
    hit(t + 0.1, 'kos', 1.0)
    pad(t, E('S15') + 1, tonic=50, vel=0.6, seed=17)
    melody(t + 3.5, LAMENT, 50, instr='bowed', maqam='kurd', tonic=62, vel=0.45, p=-0.2, t_end=E('S15') - 1)
    rhythm(t + 3.5, C('S15', 'فاستسلمت', 0, 13), 50, [(0, 'kos', 0.7), (2, 'davul', 0.4)], 0.6)
    hit(C('S15', 'تصدعت', 0, 12), 'kos', 1.0)
    melody(C('S15', 'دفنوا', 0, 20), LAMENT, 46, instr='ney', maqam='kurd', tonic=62, vel=0.38, p=0.3, t_end=E('S15') - 1)
    # S16 grief then storm south
    t = S('S16')
    cT = C('S16', 'لكن', 0, 7)
    pad(t, cT + 0.5, tonic=50, vel=0.45, seed=18)
    melody(t + 0.3, LAMENT[:7], 54, instr='ney', maqam='kurd', tonic=62, vel=0.4, t_end=cT)
    hit(C('S16', 'وأقسم', 0, 5), 'kos', 0.8)
    pad(cT - 0.5, E('S16') + 1, tonic=45, vel=0.55, seed=19)
    ostinato(cT, E('S16') - 0.5, 116, [0, 3, 2, 3, 0, 4, 3, 2], 'nahawand', 45, 0.45)
    rhythm(cT, E('S16') - 0.5, 116, BATTLE, 0.45)
    for w in ('حلب', 'دمشق', 'بغداد'):
        hit(C('S16', w, 0, 12), 'kos', 0.8)
    # S17 Erzincan & winter
    t = S('S17')
    pad(t, E('S17') + 1, tonic=50, vel=0.45, seed=20)
    rhythm(t + 0.2, C('S17', 'صفعة', 0, 6) + 0.5, 120, DUYEK, 0.5)
    hit(C('S17', 'صفعة', 0, 6), 'kos', 0.9)
    melody(C('S17', 'قراباغ', 0, 10) - 1, THEME_T, 54, instr='bowed', maqam='nahawand', tonic=57, vel=0.4, t_end=E('S17') - 0.5)
    rhythm(C('S17', 'قراباغ', 0, 10), E('S17') - 0.5, 54, [(0, 'dum', 0.6), (2, 'dum', 0.4)], 0.5)
    # S18 the muster: full mehter march
    t = S('S18')
    pad(t, E('S18') + 1, tonic=50, vel=0.55, seed=21)
    rhythm(t + 0.2, E('S18') - 0.5, 100, DUYEK, 0.7)
    theme_loop(t + 0.2, E('S18') - 0.5, THEME_B, 100, instr='zurna', maqam='hijaz', tonic=62, vel=0.42, p=0.25)
    theme_loop(t + 0.2, E('S18') - 0.5, THEME_B, 100, instr='brass', maqam='hijaz', tonic=50, vel=0.5, p=-0.25)
    # S19 manoeuvre
    t = S('S19')
    pad(t, E('S19') + 1, tonic=45, vel=0.5, seed=22)
    ostinato(t + 0.2, E('S19') - 0.5, 108, [0, None, 0, 1, 0, None, 3, 2], 'kurd', 45, 0.45)
    heartbeat(C('S19', 'يأت', 0, 8), E('S19') - 0.5, 70, 0.4, accel_to=100)
    hit(C('S19', 'فوجئت', 0, 20), 'kos', 1.0)
    # S20 thirst
    t = S('S20')
    pad(t, E('S20') + 1, tonic=50, vel=0.55, bright=9, seed=23)
    rhythm(t + 0.3, E('S20') - 0.5, 50, [(0, 'davul', 0.6), (2, 'dum', 0.4)], 0.5)
    melody(t + 2, LAMENT, 46, instr='zurna', maqam='hijaz', tonic=62, vel=0.3, p=0.2, t_end=E('S20') - 0.5)
    # S21 the last night: near silence, heartbeat
    t = S('S21')
    pad(t, E('S21') + 1, tonic=38, vel=0.4, fifth=False, bright=3, seed=24)
    heartbeat(C('S21', 'التتار', 0, 15), E('S21') - 0.2, 54, 0.5, accel_to=72)
    # S22 formation: build-up
    t = S('S22')
    pad(t, E('S22') + 1, tonic=50, vel=0.55, seed=25)
    rhythm(t + 0.3, E('S22') - 0.2, 88, BATTLE, 0.5, accel_to=118, crescendo=(0.25, 0.95))
    melody(C('S22', 'وقبالتهم', 0, 17), THEME_T, 96, instr='brass', maqam='nahawand', tonic=45, vel=0.45)
    riser(E('S22') + 0.2, 8, 0.8)
    # S23 the clash (with a held breath at the start)
    t = S('S23')
    silence(t + 0.4, t + 1.78)
    t_in = t + 1.8
    hit(t_in, 'kos', 1.0)
    pad(t_in, E('S23') + 1, tonic=50, vel=0.75, bright=8, seed=26)
    rhythm(t_in, E('S23') + 0.1, 140, BATTLE, 0.85)
    ostinato(t_in, E('S23'), 140, [0, 1, 0, 3, 0, 4, 3, 1], 'hijaz', 50, 0.45)
    theme_loop(t_in + 3.4, E('S23'), THEME_B, 140, instr='brass', maqam='hijaz', tonic=50, vel=0.6)
    theme_loop(t_in + 3.4, E('S23'), THEME_B, 140, instr='zurna', maqam='hijaz', tonic=62, vel=0.35, p=0.3)
    # S24 betrayal
    t = S('S24')
    pad(t, E('S24') + 1, tonic=51, vel=0.7, bright=8, seed=27)
    rhythm(t, E('S24') - 0.3, 132, BATTLE, 0.75)
    for w, v in (('استدار', 1.0), ('عبروا', 0.9), ('انهار', 1.0)):
        tt = C('S24', w, 0, 8)
        hit(tt, 'kos', v)
        for dm in (63, 66, 69):
            place(BUF, pan(brass(midi(dm - 12), 1.6, 0.5), 0), tt)
    # S25 the Serbs: heroic-tragic
    t = S('S25')
    cP = C('S25', 'وشق', 0, 17)
    pad(t, E('S25') + 1, tonic=50, vel=0.6, seed=28)
    rhythm(t, cP, 120, BATTLE, 0.65)
    theme_loop(t + 0.3, cP, THEME_B, 60, instr='bowed', maqam='hijaz', tonic=62, vel=0.5, p=-0.2)
    melody(cP, LAMENT[:7], 52, instr='ney', maqam='kurd', tonic=62, vel=0.4, t_end=E('S25') - 0.5)
    hit(C('S25', 'فأبى', 0, 23), 'kos', 0.9)
    # S26 the sons scatter: drums gone
    t = S('S26')
    pad(t, E('S26') + 1, tonic=50, vel=0.5, fifth=False, seed=29)
    melody(t + 0.3, LAMENT, 56, instr='bowed', maqam='kurd', tonic=62, vel=0.4, t_end=E('S26') - 0.3)
    hit(C('S26', 'وبقي', 0, 14), 'kos', 0.7)
    # S27 last stand -> capture -> silence
    t = S('S27')
    cM = C('S27', 'محمود', 0, 22)
    pad(t, cM, tonic=50, vel=0.6, seed=30)
    rhythm(t + 0.2, cM - 0.2, 72, [(0, 'kos', 1.0), (1, 'davul', 0.7), (2, 'kos', 0.8), (3, 'davul', 0.7), (3.5, 'davul', 0.6)], 0.8)
    theme_loop(t + 0.5, cM - 0.5, THEME_B, 72, instr='bowed', maqam='hijaz', tonic=50, vel=0.45)
    hit(C('S27', 'فتعثر', 0, 19), 'kos', 1.0)
    silence(cM - 0.1, cM + 1.2)
    pad(cM + 1.0, E('S27') + 1, tonic=38, vel=0.45, fifth=False, bright=3, seed=31)
    melody(C('S27', 'سقطت', 0, 30), [(0, 4)], 30, instr='ney', maqam='kurd', tonic=62, vel=0.4)

    # ---------------- ACT III
    t = S('S28')
    pad(t, E('S28') + 1, tonic=45, vel=0.45, seed=32)
    taqsim(t + 3, E('S28') - 0.5, 'nahawand', 45, 0.45, seed=32, density=0.7)
    t = S('S29')
    cF = C('S29', 'الثابت', 0, 23)
    pad(t, E('S29') + 1, tonic=45, vel=0.45, seed=33)
    heartbeat(t + 0.5, C('S29', 'جزاؤك', 0, 13), 52, 0.35)
    hit(C('S29', 'جزاؤك', 0, 13), 'kos', 0.8)
    melody(cF - 0.5, THEME_T, 56, instr='bowed', maqam='nahawand', tonic=57, vel=0.4, t_end=E('S29') - 0.5)
    t = S('S30')
    pad(t, E('S30') + 1, tonic=50, vel=0.4, fifth=False, seed=34)
    melody(t + 0.5, LAMENT, 44, instr='ney', maqam='kurd', tonic=62, vel=0.42, t_end=C('S30', 'مات', 0, 6))
    melody(C('S30', 'وأطلق', 0, 18) - 0.5, LAMENT, 46, instr='bowed', maqam='kurd', tonic=62, vel=0.38, t_end=E('S30') - 0.5)
    t = S('S31')
    cU = C('S31', 'فأعاد', 0, 27)
    pad(t, E('S31') + 1, tonic=50, vel=0.5, seed=35)
    ostinato(t + 0.3, cU, 104, [0, 3, 2, 3, 0, 4, 3, 2], 'kurd', 50, 0.4)
    rhythm(t + 0.3, cU, 104, FRAME, 0.45, crescendo=(0.6, 1.0))
    for w in ('عيسى', 'سليمان', 'موسى'):
        hit(C('S31', w, 1, 20), 'kos', 0.7)
    hit(cU, 'kos', 1.0)
    rhythm(cU, E('S31') - 0.3, 96, DUYEK, 0.6)
    melody(cU + 0.2, THEME_B, 96, instr='brass', maqam='hijaz', tonic=50, vel=0.55, t_end=E('S31') - 0.3)
    t = S('S32')
    cH = C('S32', 'وبعد', 0, 17)
    pad(t, cH, tonic=45, vel=0.45, fifth=False, seed=36)
    melody(t + 0.5, THEME_T[:6], 50, instr='bowed', maqam='nahawand', tonic=57, vel=0.4, t_end=C('S32', 'فمات', 0, 5) + 1)
    hit(C('S32', 'فمات', 0, 5), 'kos', 0.8)
    riser(cH, 5, 0.6)
    hit(cH, 'kos', 1.0)
    pad(cH, E('S32') + 1, tonic=50, vel=0.75, bright=8, seed=37)
    rhythm(cH, E('S32') - 0.3, 92, DUYEK, 0.75)
    theme_loop(cH + 0.2, E('S32') - 0.3, THEME_B, 92, instr='brass', maqam='hijaz', tonic=50, vel=0.6)
    theme_loop(cH + 0.2, E('S32') - 0.3, THEME_B, 92, instr='zurna', maqam='hijaz', tonic=62, vel=0.35, p=0.3)
    t = S('S33')
    cD = C('S33', 'الفجر', 0, 20)
    pad(t, E('S33') + 1, tonic=50, vel=0.5, seed=38)
    melody(t + 0.5, THEME_B, 50, instr='ney', maqam='hijaz', tonic=62, vel=0.42, t_end=E('S33') - 1)
    taqsim(C('S33', 'الصاعقة', 0, 14), E('S33') - 0.5, 'hijaz', 50, 0.35, seed=38, density=0.8)
    pad(cD - 2, E('S33') + 1, tonic=55, vel=0.5, bright=7, seed=39)
    t = S('S34')
    pad(t, E('S34') + 0.5, tonic=50, vel=0.55, seed=40)
    melody(t + 0.3, THEME_B, 66, instr='bowed', maqam='hijaz', tonic=62, vel=0.42, t_end=E('S34') - 4)
    melody(t + 0.3, THEME_B, 66, instr='oud', maqam='hijaz', tonic=50, vel=0.4, p=-0.3, t_end=E('S34') - 4)
    hit(E('S34') - 5.5, 'kos', 0.9)


if __name__ == '__main__':
    score()
    wet = reverb(BUF, wet=0.32, seconds=2.8, damp=5000)
    drums = reverb(DRY_DRUMS, wet=0.18, seconds=1.8, damp=3000)
    out = wet + drums * 0.9
    out = out[: int(TOTAL * SR)]
    # global fades
    out[: int(0.5 * SR)] *= np.linspace(0, 1, int(0.5 * SR))[:, None]
    out[-int(4 * SR):] *= np.linspace(1, 0, int(4 * SR))[:, None]
    out = norm(out, 0.89)
    os.makedirs('audio/stems', exist_ok=True)
    sf.write('audio/stems/music.wav', out, SR, subtype='PCM_24')
    print('music', out.shape[0] / SR, 's')
