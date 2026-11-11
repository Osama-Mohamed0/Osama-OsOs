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
THEME_F = [(0, 1), (1, .5), (2, .5), (3, 1), (4, 1), (5, .5), (4, .5), (3, .5), (2, .5), (3, 2), (4, .5), (5, .5), (7, 1), (5, .5), (4, .5), (3, 1), (2, 1), (1, .5), (0, 2.5)]
CHANT = [(0, 2), (1, 1), (2, 2), (1, 1), (0, 2), (-1, 1), (0, 3)]


def score():
    # ================= ACT I — the dream
    t = S('S01')  # night before the assault
    pad(t, E('S01') + 1, tonic=38, vel=0.65, seed=1)
    heartbeat(S('S01', 1), E('S01') - 1, 56, 0.45, accel_to=72)
    melody(S('S01', 3), LAMENT[:8], 46, instr='ney', maqam='hijaz', tonic=62, vel=0.42, p=-0.3, t_end=E('S01') - 1)
    hit(C('S01', 'سيتغير', 0, 20), 'kos', 0.9)
    t = S('S02')  # title
    pad(t, E('S02') + 1, tonic=50, vel=0.9, bright=8, seed=2)
    rhythm(t + 0.4, E('S02') - 0.6, 96, DUYEK, 0.7)
    melody(t + 0.6, THEME_F[:10], 96, instr='brass', maqam='hijaz', tonic=50, vel=0.75, t_end=E('S02') - 0.5)
    melody(t + 0.6, THEME_F[:10], 96, instr='zurna', maqam='hijaz', tonic=62, vel=0.4, p=0.3, t_end=E('S02') - 0.5)
    hit(E('S02') - 0.5, 'kos', 1.0)
    t = S('S03')  # the city that never falls: byzantine chant colour
    pad(t, E('S03') + 1, tonic=45, vel=0.55, seed=3)
    theme_loop(t + 2, E('S03') - 0.5, CHANT, 54, instr='bowed', maqam='nahawand', tonic=57, vel=0.4, p=0.1)
    t = S('S04')  # map: half a century after Ankara
    pad(t, E('S04') + 1, tonic=45, vel=0.5, seed=4)
    taqsim(t + 0.5, E('S04') - 0.5, 'nahawand', 45, 0.4, seed=4, density=0.7)
    t = S('S05')  # the young prince, Varna
    pad(t, E('S05') + 1, tonic=50, vel=0.45, seed=5)
    melody(t + 0.5, THEME_F, 70, instr='oud', maqam='hijaz', tonic=50, vel=0.45, t_end=C('S05', 'فارنا', 0, 15) - 1)
    rhythm(C('S05', 'فارنا', 0, 15) - 1, C('S05', 'خليل', 0, 21), 112, BATTLE, 0.45)
    hit(C('S05', 'فارنا', 0, 15), 'kos', 0.9)
    pad(C('S05', 'خليل', 0, 21), E('S05') + 1, tonic=45, vel=0.4, fifth=False, seed=55)
    t = S('S06')  # formative years
    pad(t, E('S06') + 1, tonic=50, vel=0.42, seed=6)
    taqsim(t + 0.5, E('S06') - 0.5, 'hijaz', 50, 0.42, seed=6, density=0.8)
    melody(C('S06', 'لتفتحن', 0, 25), THEME_F, 60, instr='ney', maqam='hijaz', tonic=62, vel=0.34, t_end=E('S06') - 0.5)
    t = S('S07')  # the young sultan
    pad(t, E('S07') + 1, tonic=50, vel=0.65, bright=8, seed=7)
    rhythm(t + 0.3, C('S07', 'أكبر', 0, 18), 88, DUYEK, 0.55)
    melody(t + 0.4, THEME_F, 88, instr='brass', maqam='hijaz', tonic=50, vel=0.55, t_end=C('S07', 'أكبر', 0, 18))
    hit(C('S07', 'أكبر', 0, 18), 'kos', 0.9)
    t = S('S08')  # Constantine
    pad(t, E('S08') + 1, tonic=45, vel=0.5, seed=8)
    theme_loop(t + 0.5, E('S08') - 0.5, CHANT, 60, instr='bowed', maqam='nahawand', tonic=57, vel=0.4)
    t = S('S09')  # Rumeli Hisari
    pad(t, E('S09') + 1, tonic=50, vel=0.55, seed=9)
    rhythm(t + 0.3, E('S09') - 0.5, 112, BATTLE, 0.42)
    ostinato(t + 0.3, E('S09') - 0.5, 112, [0, 0, 1, 0, 4, 0, 3, 2], 'hijaz', 50, 0.33)
    hit(C('S09', 'قاطعة', 0, 22), 'kos', 0.9)
    t = S('S10')  # first message: the sunk ship
    pad(t, E('S10') + 1, tonic=45, vel=0.5, fifth=False, seed=10)
    heartbeat(t + 0.5, C('S10', 'أغرقتها', 0, 9), 64, 0.4, accel_to=90)
    hit(C('S10', 'أغرقتها', 0, 9), 'kos', 1.0)
    t = S('S11')  # Orban
    pad(t, E('S11') + 1, tonic=45, vel=0.5, seed=11)
    ostinato(t + 0.3, E('S11') - 0.5, 92, [0, None, 3, 2, 1, None, 2, 0], 'kurd', 45, 0.35)
    rhythm(t + 0.3, E('S11') - 0.5, 92, FRAME, 0.4)
    hit(C('S11', 'نعم', 0, 23), 'kos', 0.9)
    t = S('S12')  # Orban's cannon
    pad(t, E('S12') + 1, tonic=38, vel=0.6, seed=12)
    rhythm(t + 0.3, E('S12') - 1, 56, SLOW, 0.6)
    hit(E('S12') - 1.2, 'kos', 1.0)
    # ================= ACT II — the siege
    t = S('S13')
    riser(t + 0.2, 3, 0.5)
    hit(t + 0.2, 'kos', 1.0)
    pad(t, E('S13') + 1, tonic=50, vel=0.6, seed=13)
    rhythm(t + 2.5, E('S13') - 0.5, 84, DUYEK, 0.5)
    theme_loop(t + 2.5, E('S13') - 0.5, THEME_F, 84, instr='zurna', maqam='hijaz', tonic=62, vel=0.38, p=0.2)
    t = S('S14')  # walls
    pad(t, E('S14') + 1, tonic=45, vel=0.5, seed=14)
    theme_loop(t + 0.5, E('S14') - 0.5, CHANT, 60, instr='bowed', maqam='nahawand', tonic=57, vel=0.35)
    t = S('S15')  # bombardment
    pad(t, E('S15') + 1, tonic=38, vel=0.6, seed=15)
    rhythm(t + 0.3, C('S15', 'والمدافعون', 0, 11), 72, SLOW, 0.55)
    heartbeat(C('S15', 'والمدافعون', 0, 11), E('S15') - 0.5, 60, 0.4)
    t = S('S16')  # naval battle
    pad(t, E('S16') + 1, tonic=50, vel=0.55, seed=16)
    rhythm(t + 0.3, E('S16') - 2, 124, BATTLE, 0.5, crescendo=(0.6, 1.0))
    theme_loop(t + 0.3, E('S16') - 2, THEME_F, 124, instr='zurna', maqam='hijaz', tonic=62, vel=0.34, p=-0.2)
    hit(C('S16', 'فرسه', 0, 20), 'kos', 1.0)
    t = S('S17')  # the idea
    pad(t, E('S17') + 1, tonic=50, vel=0.45, fifth=False, seed=17)
    taqsim(t + 0.5, E('S17') - 0.5, 'hijaz', 50, 0.4, seed=17, density=0.6)
    riser(C('S17', 'البر', 0, 7) + 0.3, 4, 0.5)
    t = S('S18')  # ships over land
    pad(t, E('S18') + 1, tonic=50, vel=0.6, bright=7, seed=18)
    rhythm(t + 0.3, E('S18') - 0.5, 96, DUYEK, 0.55, crescendo=(0.5, 1.0))
    theme_loop(t + 0.5, E('S18') - 0.5, THEME_F, 96, instr='brass', maqam='hijaz', tonic=50, vel=0.5)
    theme_loop(t + 0.5, E('S18') - 0.5, THEME_F, 96, instr='bowed', maqam='hijaz', tonic=62, vel=0.3, p=0.3)
    hit(C('S18', 'الصباح', 0, 18), 'kos', 1.0)
    t = S('S19')  # tunnels
    pad(t, E('S19') + 1, tonic=38, vel=0.55, seed=19)
    ostinato(t + 0.3, E('S19') - 0.5, 80, [0, None, 1, None, 0, None, -1, None], 'kurd', 45, 0.35)
    hit(C('S19', 'فأحرقه', 0, 17), 'kos', 0.8)
    t = S('S20')  # omens
    pad(t, E('S20') + 1, tonic=45, vel=0.5, fifth=False, seed=20)
    melody(t + 0.5, CHANT, 44, instr='bowed', maqam='nahawand', tonic=57, vel=0.38, t_end=E('S20') - 0.5)
    t = S('S21')  # the refusal
    pad(t, E('S21') + 1, tonic=45, vel=0.45, seed=21)
    taqsim(t + 0.5, E('S21') - 0.5, 'nahawand', 45, 0.42, seed=21, density=0.7)
    t = S('S22')  # council
    pad(t, E('S22') + 1, tonic=50, vel=0.5, seed=22)
    heartbeat(t + 0.5, C('S22', 'الهجوم', 0, 17), 60, 0.4, accel_to=84)
    hit(C('S22', 'الهجوم', 0, 17), 'kos', 1.0)
    t = S('S23')  # last day: two prayers
    pad(t, E('S23') + 1, tonic=45, vel=0.5, seed=23)
    melody(t + 0.5, LAMENT, 48, instr='ney', maqam='hijaz', tonic=62, vel=0.38, t_end=C('S23', 'المدينة', 0, 10))
    melody(C('S23', 'المدينة', 0, 10), CHANT, 48, instr='bowed', maqam='nahawand', tonic=57, vel=0.36, t_end=E('S23') - 0.5)
    # ================= ACT III — the conquest
    t = S('S24')
    riser(t + 0.2, 3, 0.55)
    hit(t + 0.2, 'kos', 1.0)
    pad(t, E('S24') + 1, tonic=50, vel=0.6, seed=24)
    rhythm(t + 2, E('S24') - 0.5, 132, BATTLE, 0.55, crescendo=(0.6, 1.0))
    theme_loop(t + 2, E('S24') - 0.5, THEME_F, 132, instr='zurna', maqam='hijaz', tonic=62, vel=0.36, p=0.2)
    t = S('S25')  # janissaries march
    pad(t, E('S25') + 1, tonic=50, vel=0.6, seed=25)
    rhythm(t + 0.2, C('S25', 'أصيب', 0, 10), 100, DUYEK, 0.65)
    theme_loop(t + 0.2, C('S25', 'أصيب', 0, 10), THEME_F, 100, instr='brass', maqam='hijaz', tonic=50, vel=0.5)
    hit(C('S25', 'أصيب', 0, 10), 'kos', 1.0)
    heartbeat(C('S25', 'أصيب', 0, 10) + 1, E('S25') - 0.5, 72, 0.45, accel_to=96)
    t = S('S26')  # the banner
    pad(t, E('S26') + 1, tonic=50, vel=0.6, bright=7, seed=26)
    taqsim(t + 0.5, C('S26', 'حسن', 0, 9), 'hijaz', 50, 0.35, seed=26, density=0.6)
    rhythm(C('S26', 'حسن', 0, 9), E('S26') - 0.5, 96, DUYEK, 0.6, crescendo=(0.5, 1.0))
    melody(C('S26', 'لحظات', 0, 16), THEME_F, 96, instr='brass', maqam='hijaz', tonic=50, vel=0.6, t_end=E('S26') - 0.3)
    hit(C('S26', 'لحظات', 0, 16), 'kos', 1.0)
    t = S('S27')  # the emperor's end
    pad(t, E('S27') + 1, tonic=45, vel=0.5, fifth=False, seed=27)
    melody(t + 0.5, CHANT, 40, instr='bowed', maqam='nahawand', tonic=57, vel=0.4, t_end=E('S27') - 0.5)
    t = S('S28')  # Hagia Sophia
    pad(t, E('S28') + 1, tonic=50, vel=0.55, bright=8, seed=28)
    melody(t + 0.5, THEME_F, 60, instr='ney', maqam='hijaz', tonic=62, vel=0.4, t_end=C('S28', 'الفاتح', 0, 20))
    riser(C('S28', 'الفاتح', 0, 20), 4, 0.55)
    hit(C('S28', 'الفاتح', 0, 20), 'kos', 1.0)
    melody(C('S28', 'الفاتح', 0, 20) + 0.2, THEME_F, 80, instr='brass', maqam='hijaz', tonic=50, vel=0.55, t_end=E('S28') - 0.5)
    t = S('S29')  # Istanbul
    pad(t, E('S29') + 1, tonic=50, vel=0.5, seed=29)
    rhythm(t + 0.3, E('S29') - 0.5, 92, FRAME, 0.4)
    theme_loop(t + 0.3, E('S29') - 0.5, THEME_F, 92, instr='oud', maqam='hijaz', tonic=50, vel=0.42)
    hit(C('S29', 'إسطنبول', 0, 18), 'kos', 0.8)
    t = S('S30')  # later conquests, death
    cD = C('S30', 'مات', 0, 16)
    pad(t, cD, tonic=50, vel=0.55, seed=30)
    rhythm(t + 0.3, cD - 2, 112, DUYEK, 0.5)
    for w, fb in (('صربيا', 2), ('والموره', 3), ('وطرابزون', 4), ('والبوسنة', 5), ('أوترانتو', 8)):
        hit(C('S30', w, 0, fb) - 0.05, 'kos', 0.6)
    pad(cD - 1, E('S30') + 1, tonic=45, vel=0.45, fifth=False, seed=31)
    melody(cD, LAMENT[:7], 44, instr='ney', maqam='hijaz', tonic=62, vel=0.35, t_end=E('S30') - 0.5)
    t = S('S31')  # end of an era
    pad(t, E('S31') + 1, tonic=45, vel=0.5, seed=32)
    taqsim(t + 0.5, C('S31', 'عالم', 0, 19) - 2, 'nahawand', 45, 0.38, seed=32, density=0.7)
    riser(C('S31', 'عالم', 0, 19), 5, 0.55)
    pad(C('S31', 'عالم', 0, 19) - 1, E('S31') + 1, tonic=50, vel=0.6, bright=8, seed=33)
    melody(C('S31', 'عالم', 0, 19), THEME_F, 70, instr='bowed', maqam='hijaz', tonic=62, vel=0.42, t_end=E('S31') - 0.5)
    t = S('S32')  # the lesson
    pad(t, E('S32') + 1, tonic=50, vel=0.6, bright=7, seed=34)
    melody(t + 0.3, THEME_F, 76, instr='brass', maqam='hijaz', tonic=50, vel=0.5, t_end=E('S32') - 0.3)
    melody(t + 0.3, THEME_F, 76, instr='bowed', maqam='hijaz', tonic=62, vel=0.35, p=0.3, t_end=E('S32') - 0.3)
    rhythm(t + 0.3, E('S32') - 0.3, 76, SLOW, 0.5)
    t = S('S33')  # closing
    pad(t, E('S33') + 1, tonic=50, vel=0.5, seed=35)
    melody(t + 0.5, THEME_F, 56, instr='ney', maqam='hijaz', tonic=62, vel=0.42, t_end=E('S33') - 1)
    taqsim(t + 2, E('S33') - 0.5, 'hijaz', 50, 0.32, seed=35, density=0.7)
    t = S('S34')
    pad(t, E('S34') + 0.5, tonic=50, vel=0.55, seed=40)
    melody(t + 0.3, THEME_F, 66, instr='bowed', maqam='hijaz', tonic=62, vel=0.42, t_end=E('S34') - 4)
    melody(t + 0.3, THEME_F, 66, instr='oud', maqam='hijaz', tonic=50, vel=0.4, p=-0.3, t_end=E('S34') - 4)
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
