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


def build():
    # S01 tent: wind outside, candle, footsteps, chains, thunder at «الصاعقة»
    bed(sfx_wind, 'S01', gain=0.5, strength=0.6)
    bed(sfx_candle, 'S01', gain=0.8)
    one(sfx_footsteps(8, 1.5), S('S01', 1), 0.7)
    one(sfx_chains(1), S('S01', 2.5), 0.35)
    one(sfx_chains(2), S('S01', 6.0), 0.3)
    one(sfx_thunder(1), C('S01', 'الصاعقة', 0, 13), 0.9)
    one(sfx_thunder(2, dist=0.5), F('S01', 0) + (C('S01', 'فكيف', 0, 23) - START['S01']) + 0.7, 0.7)
    # S02 title
    one(sfx_thunder(3), S('S02', 0.35), 1.0)
    one(sfx_boom(), S('S02', 0.4), 0.7)
    one(sfx_boom(), E('S02') - 0.5, 0.5)
    # S03 Kosovo
    bed(sfx_wind, 'S03', 2, gain=0.45, strength=0.7)
    one(sfx_whoosh(1.4), C('S03', 'مراد', 0, 6) + 0.6, 0.3)
    one(sfx_footsteps(3.5, 1.6, 3), C('S03', 'بايزيد', 0, 9) - 1.5, 0.6)
    # S04 lightning map
    for w in ('آيدين', 'وصاروخان', 'ومنتشا', 'وكرميان', 'قرمان'):
        one(sfx_whoosh(0.5), C('S04', w, 0, 5) - 0.45, 0.5)
    one(sfx_thunder(4), C('S04', 'يلدرم', 0, 21), 0.8)
    one(sfx_whoosh(2.5), C('S04', 'المخلوعين', 0, 26), 0.3)
    # S05 Nicopolis
    bed(sfx_gallop, 'S05', 0.6, C('S05', 'وسحقهم', 0, 14) - START['S05'] + 1, gain=0.7, rate=2.6, n_horses=10, seed=5)
    bed(sfx_crowd, 'S05', 3, C('S05', 'ستيفان', 0, 18) - START['S05'], gain=0.6, intensity=0.6, seed=5)
    for k in range(3):
        one(sfx_arrows(k), F('S05', 110 + k * 40), 0.6)
    clashes(C('S05', 'وسحقهم', 0, 14) - 1, C('S05', 'وسحقهم', 0, 14) + 3, 0.35, 0.5, 5)
    bed(sfx_wind, 'S05', C('S05', 'ستيفان', 0, 18) - START['S05'] - 1, gain=0.3)
    # S06 throne
    bed(sfx_wind, 'S06', gain=0.12, strength=0.3)
    one(sfx_whoosh(3), C('S06', 'الخطر', 0, 15) + 1, 0.25)
    # S07 Timur
    bed(sfx_wind, 'S07', gain=0.5, strength=0.7, seed=7)
    one(sfx_footsteps(10, 1.1, 7), S('S07', 0.5), 0.5)
    one(sfx_arrows(7), C('S07', 'السهام', 0, 8) - 0.5, 0.7)
    one(sfx_neigh(7), C('S07', 'يضحك', 0, 22) + 0.4, 0.35, 0.4)
    # S08 conquests
    for w in ('فارس', 'والعراق', 'الذهبية', 'دلهي'):
        one(sfx_fire(4, 8, 0.6), C('S08', w, 0, 10) + 1.0, 0.6)
    t = C('S08', 'الحرب', 1, 18)
    one(sfx_trumpet_elephant(1), t + 0.5, 0.5, -0.3)
    one(sfx_trumpet_elephant(2), t + 4.5, 0.4, 0.4)
    bed(sfx_fire, 'S08', t - START['S08'], gain=0.4, seed=8)
    bed(sfx_wind, 'S08', t - START['S08'], gain=0.35)
    # S09
    one(sfx_spark(), C('S09', 'تلامست', 0, 14), 0.8)
    one(sfx_boom(), C('S09', 'وملكان', 0, 18), 0.5)
    # S10 refugees
    one(sfx_gallop(9, 2.2, 3, 10, 0.6), C('S10', 'أمراء', 0, 4), 0.45)
    one(sfx_gallop(9, 2.0, 2, 11, 0.6), C('S10', 'أحمد', 0, 14), 0.45)
    bed(sfx_footsteps, 'S10', C('S10', 'فأكرمهما', 0, 23) - START['S10'], C('S10', 'فأكرمهما', 0, 23) - START['S10'] + 3, gain=0.4, rate=1.4)
    # S11 envoy walk
    one(sfx_footsteps(9.5, 1.1, 11), S('S11', 0.4), 0.8)
    bed(sfx_wind, 'S11', gain=0.1, strength=0.2)
    # S12 / S13 letters
    one(sfx_scroll(), S('S12', 0.3), 0.8)
    one(sfx_quill(LEN['S12'] - 7), C('S12', 'اعلم', 0, 5), 0.7)
    one(sfx_stamp(), E('S12') - 1.65, 0.8)
    one(sfx_scroll(), C('S13', 'وتقول', 0, 10), 0.8)
    one(sfx_quill(9), C('S13', 'وتقول', 0, 10) + 1, 0.9)
    one(sfx_stamp(), C('S13', 'بالدم', 0, 20) - 0.2, 1.0)
    one(sfx_thunder(13), C('S13', 'بالدم', 0, 20) - 0.15, 0.7)
    # S14 drums (music) + horns + marching
    one(sfx_scroll(), C('S14', 'أغلق', 0, 4), 0.6)
    t = C('S14', 'تحركت', 0, 10)
    one(sfx_march(LEN['S14'] - (t - START['S14']), 1.6, 14), t - 0.5, 0.6)
    one(sfx_gallop(E('S14') - t, 1.6, 8, 14, 0.6), t, 0.5)

    # S15 Sivas
    one(sfx_boom(), S('S15', 0.2), 0.6)
    bed(sfx_wind, 'S15', 2, gain=0.4, strength=0.6, seed=15)
    bed(sfx_dig, 'S15', C('S15', 'وحفر', 0, 8) - START['S15'], C('S15', 'تصدعت', 0, 12) - START['S15'], gain=0.8)
    one(sfx_rumble(3.5), C('S15', 'تصدعت', 0, 12) - 0.8, 0.9)
    one(sfx_boom(), C('S15', 'تصدعت', 0, 12) + 0.3, 0.6)
    bed(sfx_fire, 'S15', C('S15', 'دفنوا', 0, 20) - START['S15'], gain=0.45, seed=15)
    # S16
    bed(sfx_candle, 'S16', 0, C('S16', 'لكن', 0, 7) - START['S16'], gain=0.8)
    for w in ('حلب', 'دمشق', 'بغداد'):
        one(sfx_fire(4, 16, 0.6), C('S16', w, 0, 12) + 0.3, 0.55)
    # S17
    one(sfx_whoosh(1.0), C('S17', 'أرزنجان', 0, 2) - 0.6, 0.5)
    one(sfx_thunder(17, 0.4), C('S17', 'صفعة', 0, 6), 0.5)
    t = C('S17', 'صفعة', 0, 6) + 1.5
    bed(sfx_wind, 'S17', t - START['S17'], gain=0.6, strength=0.9, seed=17)
    one(sfx_neigh(17), t + 4, 0.3, -0.4)
    # S18 muster
    bed(sfx_march, 'S18', 0.2, C('S18', 'أبناؤه', 0, 21) - START['S18'], gain=0.5, rate=1.66, seed=18)
    bed(sfx_crowd, 'S18', 0.2, C('S18', 'أبناؤه', 0, 21) - START['S18'], gain=0.25, intensity=0.4, seed=18)
    one(sfx_gallop(8, 1.5, 6, 18, 0.5), C('S18', 'السباهية', 0, 6), 0.4)
    one(sfx_neigh(18), C('S18', 'التتار', 0, 9) + 0.5, 0.3, 0.3)
    # S19
    one(sfx_whoosh(1.2), C('S19', 'التف', 0, 11), 0.4)
    one(sfx_boom(), C('S19', 'فوجئت', 0, 20), 0.6)
    # S20 heat & water
    bed(sfx_heat, 'S20', gain=1.0)
    bed(sfx_march, 'S20', 0, C('S20', 'سبقهم', 0, 14) - START['S20'], gain=0.45, rate=1.1, seed=20)
    bed(sfx_wind, 'S20', gain=0.25, strength=0.4, seed=20)
    bed(sfx_water, 'S20', C('S20', 'سبقهم', 0, 14) - START['S20'], gain=0.6, seed=20)
    bed(sfx_dig, 'S20', C('S20', 'سبقهم', 0, 14) - START['S20'], C('S20', 'سبقهم', 0, 14) - START['S20'] + 6, gain=0.5, seed=21)
    # S21 night
    bed(sfx_crickets, 'S21', gain=1.0)
    bed(sfx_fire, 'S21', gain=0.3, seed=21)
    bed(sfx_wind, 'S21', gain=0.15, strength=0.3, seed=21)
    # S22 formation
    bed(sfx_wind, 'S22', gain=0.35, strength=0.5, seed=22)
    one(sfx_neigh(22), C('S22', 'وقبالتهم', 0, 17), 0.3, 0.5)
    one(sfx_trumpet_elephant(22), C('S22', 'الفيلة', 0, 23), 0.45, 0.5)
    # S23 the battle (after the held breath)
    t_in = S('S23', 1.8)
    bed(sfx_crowd, 'S23', 1.8, gain=0.85, intensity=0.9, seed=23)
    bed(sfx_gallop, 'S23', 1.8, gain=0.8, rate=2.7, n_horses=14, seed=23)
    for k in range(10):
        one(sfx_arrows(230 + k), t_in + 0.2 + k * 2.0, 0.6)
    clashes(t_in + 6, E('S23'), 0.5, 0.45, 23)
    for k in range(4):
        one(sfx_neigh(231 + k), t_in + 5 + k * 6.5, 0.3, (-1) ** k * 0.5)
    # S24 betrayal
    bed(sfx_crowd, 'S24', gain=0.75, intensity=0.85, seed=24)
    one(sfx_gallop(LEN['S24'] - 2, 2.7, 10, 24, 0.7), S('S24', 0.5), 0.7)
    clashes(S('S24', 1), E('S24'), 0.7, 0.35, 24)
    one(sfx_neigh(24), C('S24', 'استدار', 0, 4) + 0.3, 0.45, -0.3)
    # S25 Serbs
    cP = C('S25', 'وشق', 0, 17)
    bed(sfx_crowd, 'S25', 0, cP - START['S25'], gain=0.7, intensity=0.85, seed=25)
    clashes(S('S25', 0.5), cP, 0.4, 0.5, 25)
    one(sfx_gallop(cP - START['S25'], 2.6, 8, 25, 0.7), S('S25'), 0.6)
    bed(sfx_wind, 'S25', cP - START['S25'], gain=0.35, seed=25)
    # S26 scatter
    one(sfx_gallop(6, 2.5, 4, 26, 0.6), S('S26', 1), 0.5)
    bed(sfx_wind, 'S26', gain=0.5, strength=0.9, seed=26)
    # S27 last stand
    cM = C('S27', 'محمود', 0, 22)
    bed(sfx_crowd, 'S27', 0, C('S27', 'الفرار', 0, 16) - START['S27'], gain=0.6, intensity=0.8, seed=27)
    clashes(S('S27', 0.5), C('S27', 'الفرار', 0, 16), 0.55, 0.5, 27)
    one(sfx_gallop(cM - C('S27', 'الفرار', 0, 16), 2.6, 1, 271, 0.8), C('S27', 'الفرار', 0, 16) - 0.3, 0.8)
    one(sfx_neigh(272), C('S27', 'فتعثر', 0, 19) + 0.1, 0.55)
    one(sfx_rumble(2.0), C('S27', 'فتعثر', 0, 19) + 0.3, 0.8)
    one(sfx_gallop(3.5, 2.4, 8, 273, 0.7), cM - 0.2, 0.6)
    bed(sfx_wind, 'S27', cM - START['S27'] + 1, gain=0.55, strength=0.8, seed=27)
    one(sfx_chains(27), C('S27', 'سقطت', 0, 30) + 0.5, 0.4)

    # S28–S29 tent
    bed(sfx_candle, 'S28', gain=0.8)
    bed(sfx_wind, 'S28', gain=0.25, strength=0.4, seed=28)
    one(sfx_footsteps(2.5, 1.2, 28), C('S28', 'قام', 0, 4), 0.5)
    bed(sfx_candle, 'S29', 0, C('S29', 'ويرى', 0, 15) - START['S29'], gain=0.8)
    one(sfx_chains(29), C('S29', 'جزاؤك', 0, 13) - 0.9, 0.7)
    one(sfx_stamp(), C('S29', 'جزاؤك', 0, 13) - 0.2, 0.7)
    bed(sfx_footsteps, 'S29', C('S29', 'ويرى', 0, 15) - START['S29'], C('S29', 'الثابت', 0, 23) - START['S29'], gain=0.45, rate=1.4)
    one(sfx_fire(5, 29, 0.6), C('S29', 'بورصة', 0, 29), 0.6)
    # S30 death
    bed(sfx_wind, 'S30', gain=0.45, strength=0.7, seed=30)
    bed(sfx_candle, 'S30', 0, C('S30', 'مات', 0, 6) - START['S30'], gain=0.9)
    one(sfx_bell(150), C('S30', 'مات', 0, 6) + 0.2, 0.55)
    bed(sfx_footsteps, 'S30', C('S30', 'وأطلق', 0, 18) - START['S30'], gain=0.5, rate=1.0)
    # S31
    for w in ('عيسى', 'سليمان', 'موسى'):
        one(sfx_clash(31), C('S31', w, 1, 20), 0.35)
    # S32
    bed(sfx_wind, 'S32', 0, C('S32', 'وبعد', 0, 17) - START['S32'], gain=0.6, strength=1.0, seed=32)
    one(sfx_whoosh(3), C('S32', 'فمات', 0, 5) + 0.3, 0.3)
    one(sfx_bell(196), C('S32', 'وبعد', 0, 17) + 2, 0.35)
    # S33
    bed(sfx_wind, 'S33', gain=0.3, strength=0.4, seed=33)
    one(sfx_thunder(33, dist=0.7), C('S33', 'الصاعقة', 0, 14) + 0.4, 0.45)
    # S34
    one(sfx_boom(), E('S34') - 5.5, 0.35)


if __name__ == '__main__':
    build()
    out = reverb(BUF, wet=0.15, seconds=1.6, damp=6000)[: int(TOTAL * SR)]
    out = norm(out, 0.85)
    os.makedirs('audio/stems', exist_ok=True)
    sf.write('audio/stems/sfx.wav', out, SR, subtype='PCM_24')
    print('sfx done')
