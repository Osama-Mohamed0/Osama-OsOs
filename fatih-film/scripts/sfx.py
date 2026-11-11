"""Sound-effects stem synced to scene timing and narration cues -> audio/stems/sfx.wav"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from audio_lib import (SR, cue_time, load_timeline, norm, pan, place, reverb, sfx_arrows, sfx_bell, sfx_boom, sfx_candle, sfx_chains, sfx_clash,
                       sfx_crickets, sfx_crowd, sfx_dig, sfx_fire, sfx_footsteps, sfx_gallop, sfx_heat, sfx_march, sfx_neigh, sfx_quill,
                       sfx_rumble, sfx_scroll, sfx_spark, sfx_stamp, sfx_thunder, sfx_trumpet_elephant, sfx_water, sfx_whoosh, sfx_wind)

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TIM, START, LEN, CUES = load_timeline()
TOTAL = 900.0
BUF = np.zeros((int(TOTAL * SR) + SR * 6, 2), np.float32)


def S(sid, rel=0.0):
    return START[sid] + rel


def E(sid):
    return START[sid] + LEN[sid]


def C(sid, word, nth=0, fb=None):
    return cue_time(CUES, START, sid, word, nth, fb)


def F(sid, frame):
    """Scene-local frame -> absolute seconds."""
    return START[sid] + frame / 30


def bed(fn, sid, t0=0.0, t1=None, gain=0.5, **kw):
    a = S(sid, t0)
    b = E(sid) if t1 is None else S(sid, t1) if t1 >= 0 else E(sid) + t1
    if b - a > 0.5:
        y = fn(b - a, **kw)
        place(BUF, y if y.ndim == 2 else pan(y, 0), a, gain)


def one(y, t, gain=0.6, p=0.0):
    place(BUF, y if y.ndim == 2 else pan(y, p), t, gain)


def clashes(t0, t1, every=0.7, gain=0.4, seed=0):
    r = np.random.default_rng(seed)
    t = t0
    while t < t1:
        one(sfx_clash(r.integers(1e6)), t, gain * r.uniform(0.5, 1), r.uniform(-0.8, 0.8))
        t += every * r.uniform(0.5, 1.5)


def cannon(t, gain=1.0, seed=0):
    one(sfx_boom(), t, gain)
    one(sfx_thunder(seed, dist=0.2), t + 0.05, 0.6 * gain)
    one(sfx_rumble(2.5), t + 0.1, 0.4 * gain)


def build():
    # ---------------- ACT I
    bed(sfx_wind, 'S01', gain=0.45, strength=0.6)
    bed(sfx_fire, 'S01', gain=0.35, seed=1)
    one(sfx_neigh(1), S('S01', 4), 0.3, 0.3)
    one(sfx_boom(), S('S02', 0.4), 0.8)
    one(sfx_thunder(3), S('S02', 0.35), 0.8)
    one(sfx_boom(), E('S02') - 0.5, 0.5)
    bed(sfx_wind, 'S03', 1, gain=0.4, strength=0.6)
    one(sfx_whoosh(1.5), C('S03', 'العرب', 0, 10) - 0.4, 0.3)
    one(sfx_whoosh(2.5), C('S04', 'والآن', 0, 12) - 1, 0.35)
    bed(sfx_crowd, 'S05', C('S05', 'فارنا', 0, 15) - START['S05'] - 1, C('S05', 'خليل', 0, 21) - START['S05'], gain=0.4, intensity=0.6, seed=5)
    clashes(C('S05', 'فارنا', 0, 15), C('S05', 'خليل', 0, 21) - 1, 0.6, 0.3, 5)
    bed(sfx_candle, 'S06', gain=0.8)
    one(sfx_scroll(), C('S06', 'تعلم', 0, 4), 0.6)
    one(sfx_scroll(), C('S06', 'آق', 0, 13), 0.5)
    bed(sfx_crowd, 'S07', 0.3, 6, gain=0.35, intensity=0.5, seed=7)
    one(sfx_quill(5), C('S08', 'يختبر', 0, 12), 0.6)
    bed(sfx_wind, 'S08', gain=0.15, strength=0.3)
    bed(sfx_dig, 'S09', C('S09', 'بدأ', 0, 5) - START['S09'], C('S09', 'ارتفعت', 0, 18) - START['S09'], gain=0.45, seed=9)
    bed(sfx_wind, 'S09', gain=0.35, strength=0.5, seed=9)
    bed(sfx_water, 'S10', gain=0.5, seed=10)
    cannon(C('S10', 'أغرقتها', 0, 9) - 0.13, 0.9, 10)
    one(sfx_water(2.5, 11), C('S10', 'أغرقتها', 0, 9) + 0.6, 0.6)
    bed(sfx_fire, 'S11', gain=0.5, seed=11, strength=0.7)
    for k in range(6):
        one(sfx_clash(110 + k), S('S11', 1.5 + k * 1.3), 0.25)
    bed(sfx_march, 'S12', 0.5, -1, gain=0.4, rate=1.2)
    bed(sfx_rumble, 'S12', 0.5, -1, gain=0.35)
    bed(sfx_wind, 'S12', gain=0.25, strength=0.4, seed=12)
    # ---------------- ACT II
    one(sfx_boom(), S('S13', 0.2), 0.6)
    bed(sfx_crowd, 'S13', 0.5, C('S13', 'جوفاني', 0, 25) - START['S13'] - 1, gain=0.45, intensity=0.55, seed=13)
    bed(sfx_march, 'S13', 0.5, C('S13', 'جوفاني', 0, 25) - START['S13'] - 1, gain=0.4, rate=1.8)
    bed(sfx_wind, 'S14', gain=0.3, strength=0.4, seed=14)
    one(sfx_chains(14), C('S14', 'سلسلة', 0, 14) + 0.3, 0.6)
    c1 = C('S15', 'ولأول', 0, 3)
    cN = C('S15', 'والمدافعون', 0, 11)
    for i, t in enumerate([F('S15', 30), c1 + 1.0, c1 + 4.33, cN - 1.33]):
        cannon(t, 1.0, 150 + i)
    bed(sfx_footsteps, 'S15', cN - START['S15'], cN - START['S15'] + 6, gain=0.4, rate=2.0)
    bed(sfx_dig, 'S15', cN - START['S15'] + 1, C('S15', 'وكان', 0, 19) - START['S15'], gain=0.3, seed=15)
    bed(sfx_fire, 'S15', C('S15', 'وكان', 0, 19) - START['S15'], gain=0.3, seed=15)
    cF = C('S16', 'فانقض', 0, 7)
    bed(sfx_water, 'S16', gain=0.5, seed=16)
    bed(sfx_crowd, 'S16', cF - START['S16'], C('S16', 'ودخلت', 0, 14) - START['S16'], gain=0.5, intensity=0.7, seed=16)
    for k in range(5):
        one(sfx_arrows(160 + k), cF + k, 0.5)
    for k in range(3):
        cannon(cF + 0.5 + k * 1.7, 0.5, 165 + k)
    cH = C('S16', 'فرسه', 0, 20)
    one(sfx_gallop(2.5, 2.6, 1, 16, 0.6), cH - 1.6, 0.6)
    one(sfx_neigh(16), cH + 0.4, 0.5)
    one(sfx_water(1.5, 17), cH + 0.9, 0.8)
    bed(sfx_candle, 'S17', gain=0.8)
    bed(sfx_wind, 'S18', gain=0.4, strength=0.5, seed=18)
    bed(sfx_rumble, 'S18', 0.5, C('S18', 'الصباح', 0, 18) - START['S18'], gain=0.4)
    bed(sfx_march, 'S18', 0.5, C('S18', 'الصباح', 0, 18) - START['S18'], gain=0.35, rate=1.0)
    bed(sfx_crowd, 'S18', C('S18', 'الصباح', 0, 18) - START['S18'] + 1, C('S18', 'السلسلة', 0, 28) - START['S18'], gain=0.35, intensity=0.5, seed=18)
    bed(sfx_dig, 'S19', 1, C('S19', 'برجا', 0, 14) - START['S19'], gain=0.5, seed=19)
    cB = C('S19', 'فأحرقه', 0, 17)
    one(sfx_fire(LEN['S19'] - (cB - START['S19']), 19, 0.8), cB, 0.7)
    bed(sfx_wind, 'S20', gain=0.45, strength=0.7, seed=20)
    one(sfx_bell(170), S('S20', 1), 0.4)
    one(sfx_thunder(20, dist=0.7), C('S20', 'أيقونة', 0, 7) + 0.8, 0.5)
    one(sfx_scroll(), S('S21', 0.2), 0.8)
    one(sfx_quill(6), C('S21', 'فجاء', 0, 9) + 0.4, 0.7)
    one(sfx_stamp(), E('S21') - 1.65, 0.8)
    bed(sfx_candle, 'S22', gain=0.8)
    one(sfx_stamp(), C('S22', 'الهجوم', 0, 17) - 0.05, 0.5)
    bed(sfx_crickets, 'S23', gain=0.35, seed=23)
    bed(sfx_candle, 'S23', gain=0.5)
    one(sfx_bell(196), C('S23', 'المدينة', 0, 10), 0.4)
    # ---------------- ACT III
    one(sfx_boom(), S('S24', 0.2), 0.7)
    c1 = C('S24', 'الأولى', 0, 10)
    bed(sfx_crowd, 'S24', c1 - START['S24'] - 1, -0.3, gain=0.6, intensity=0.8, seed=24)
    for k in range(6):
        one(sfx_arrows(240 + k), c1 + k * 1.33, 0.5)
    clashes(c1 + 2, C('S24', 'والسلطان', 0, 29), 0.6, 0.3, 24)
    cHit = C('S25', 'أصيب', 0, 10)
    bed(sfx_march, 'S25', 0.2, cHit - START['S25'], gain=0.55, rate=1.66)
    one(sfx_clash(250), cHit - 0.13, 0.8)
    bed(sfx_crowd, 'S25', cHit - START['S25'] + 1, -0.3, gain=0.55, intensity=0.8, seed=25)
    one(sfx_whoosh(2), S('S26', 1.3), 0.3)
    bed(sfx_crowd, 'S26', C('S26', 'حسن', 0, 9) - START['S26'] - 1, gain=0.45, intensity=0.7, seed=26)
    bed(sfx_wind, 'S26', C('S26', 'لحظات', 0, 16) - START['S26'], gain=0.45, strength=0.7, seed=26)
    bed(sfx_wind, 'S27', gain=0.5, strength=0.8, seed=27)
    one(sfx_clash(270), C('S27', 'واندفع', 0, 5) + 0.3, 0.3)
    bed(sfx_gallop, 'S28', 0, C('S28', 'حفنة', 0, 10) - START['S28'] - 2, gain=0.35, rate=1.3, n_horses=1, seed=28)
    bed(sfx_wind, 'S28', gain=0.2, strength=0.3, seed=28)
    one(sfx_bell(220), C('S28', 'الفاتح', 0, 20), 0.35)
    bed(sfx_crowd, 'S29', 0, C('S29', 'بطريركهم', 0, 10) - START['S29'], gain=0.3, intensity=0.4, seed=29)
    bed(sfx_dig, 'S29', 0.5, C('S29', 'بطريركهم', 0, 10) - START['S29'], gain=0.2, seed=29)
    bed(sfx_water, 'S29', C('S29', 'إسطنبول', 0, 18) - START['S29'] - 1, gain=0.35, seed=29)
    for w, fb in (('صربيا', 2), ('والموره', 3), ('وطرابزون', 4), ('والبوسنة', 5), ('أوترانتو', 8)):
        one(sfx_whoosh(0.8), C('S30', w, 0, fb) - 0.6, 0.45)
    cD = C('S30', 'مات', 0, 16)
    bed(sfx_candle, 'S30', cD - START['S30'] - 2, cD - START['S30'] + 1.3, gain=0.9)
    bed(sfx_wind, 'S30', cD - START['S30'] - 1, gain=0.35, strength=0.5, seed=30)
    bed(sfx_wind, 'S31', gain=0.25, strength=0.4, seed=31)
    bed(sfx_water, 'S31', C('S31', 'وهاجر', 0, 8) - START['S31'], gain=0.3, seed=31)
    bed(sfx_wind, 'S32', gain=0.35, strength=0.5, seed=32)
    bed(sfx_wind, 'S33', gain=0.3, strength=0.4, seed=33)
    bed(sfx_water, 'S33', gain=0.3, seed=33)
    one(sfx_boom(), E('S34') - 5.5, 0.35)


if __name__ == '__main__':
    build()
    out = reverb(BUF, wet=0.15, seconds=1.6, damp=6000)[: int(TOTAL * SR)]
    out = norm(out, 0.85)
    os.makedirs('audio/stems', exist_ok=True)
    sf.write('audio/stems/sfx.wav', out, SR, subtype='PCM_24')
    print('sfx done')
