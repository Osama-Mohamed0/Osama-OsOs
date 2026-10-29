"""Procedural audio toolkit: instruments, drums, SFX generators, reverb.
Everything is synthesized with numpy/scipy (no samples, no services)."""
import json
import re

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 48000
rng = np.random.default_rng(1402)


# ----------------------------------------------------------------- helpers
def secs(n):
    return np.arange(int(n * SR)) / SR


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(n, s, np.float32)
    a = min(a, n)
    e[:a] = np.linspace(0, 1, a)
    dd = min(d, max(0, n - a))
    e[a:a + dd] = np.linspace(1, s, dd)
    rr = min(r, n)
    e[n - rr:] *= np.linspace(1, 0, rr)
    return e


def bp(x, lo, hi, order=2):
    sos = butter(order, [max(20, lo), min(hi, SR / 2 - 100)], 'band', fs=SR, output='sos')
    return sosfilt(sos, x)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, max(20, f), 'high', fs=SR, output='sos'), x)


def noise(n):
    return rng.standard_normal(n).astype(np.float32)


def pan(x, p=0.0):
    """mono -> stereo with constant-power pan p in [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1).astype(np.float32)


def place(buf, sig, t, gain=1.0):
    """Add stereo (n,2) or mono signal at time t (seconds)."""
    if sig.ndim == 1:
        sig = pan(sig)
    i = int(t * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x * (peak / m)


def reverb_ir(seconds=2.6, predelay=0.02, damp=4000, seed=3):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        e = r.standard_normal(n) * np.exp(-t * (6.9 / seconds))
        e = lp(e, damp, 1)
        e[: int(predelay * SR)] = 0
        out.append(e)
    ir = np.stack(out, 1)
    return (ir / np.sqrt(np.sum(ir ** 2, 0))).astype(np.float32)


def reverb(x, wet=0.3, seconds=2.6, damp=4000):
    ir = reverb_ir(seconds, damp=damp)
    if x.ndim == 1:
        x = pan(x)
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return (x * (1 - wet) + y * wet * 1.6).astype(np.float32)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ----------------------------------------------------------------- maqamat
MAQAM = {
    'hijaz': [0, 1, 4, 5, 7, 8, 10],
    'nahawand': [0, 2, 3, 5, 7, 8, 11],
    'nahawand_down': [0, 2, 3, 5, 7, 8, 10],
    'kurd': [0, 1, 3, 5, 7, 8, 10],
    'ajam': [0, 2, 4, 5, 7, 9, 11],
}


def degree(maqam, d, tonic=62):
    sc = MAQAM[maqam]
    o, k = divmod(d, len(sc))
    return tonic + 12 * o + sc[k]


# ----------------------------------------------------------------- instruments
def oud(f, dur, vel=0.8, bright=0.55, decay=0.9965):
    """Karplus-Strong double-course plucked string with body resonance."""
    n = int((dur + 0.6) * SR)
    out = np.zeros(n, np.float32)
    for det in (1.0, 1.0018):
        N = max(2, int(round(SR / (f * det))))
        x = np.zeros(n)
        burst = rng.uniform(-1, 1, N)
        k = max(1, int((1 - bright) * 8))
        burst = np.convolve(burst, np.ones(k) / k, 'same')
        x[:N] = burst
        a = np.zeros(N + 2)
        a[0] = 1
        a[N] = -decay * 0.5
        a[N + 1] = -decay * 0.5
        out += lfilter([1], a, x).astype(np.float32)
    body = bp(out, 180, 2600) * 0.8 + bp(out, 90, 250) * 0.6
    e = np.ones(n, np.float32)
    rel = int(0.08 * SR)
    end = int(dur * SR)
    e[end:] = 0
    e[max(0, end - rel):end] = np.linspace(1, 0, min(rel, end))
    return (body * e * vel * 0.5).astype(np.float32)


def bowed(f, dur, vel=0.6, nasal=0.4, vib=5.2, depth=0.006, attack=0.12, bright=1.0, slide_from=None):
    """Kemence / zurna-like sustained tone (additive), with vibrato and optional glide."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    fv = np.full(n, f)
    if slide_from:
        s = min(n, int(0.08 * SR))
        fv[:s] = np.linspace(slide_from, f, s)
    vibenv = np.clip((t - 0.25) / 0.3, 0, 1)
    fv = fv * (1 + depth * vibenv * np.sin(2 * np.pi * vib * t + rng.uniform(0, 6)))
    ph = 2 * np.pi * np.cumsum(fv) / SR
    y = np.zeros(n)
    for k in range(1, 14):
        if f * k > 9000:
            break
        amp = (1 / k ** (1.35 / bright)) * (1 + nasal * (k % 2 == 1) * (k > 1))
        y += amp * np.sin(k * ph)
    y += bp(noise(n), f * 1.5, min(f * 6, 9000)) * 0.03
    e = env_adsr(n, attack, 0.15, 0.85, min(0.25, dur * 0.3))
    return (y * e * vel * 0.18).astype(np.float32)


def ney(f, dur, vel=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fv = f * (1 + 0.004 * np.clip((t - 0.3) / 0.4, 0, 1) * np.sin(2 * np.pi * 4.6 * t))
    ph = 2 * np.pi * np.cumsum(fv) / SR
    y = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    breath = bp(noise(n), f * 0.8, f * 4) * 0.35 + hp(noise(n), 3000) * 0.05
    e = env_adsr(n, 0.18, 0.2, 0.8, min(0.35, dur * 0.4))
    return ((y * 0.7 + breath) * e * vel * 0.25).astype(np.float32)


def brass(f, dur, vel=0.6):
    """Karnay / mehter horn: buzzy saw with slow attack."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.003 * np.sin(2 * np.pi * 5 * t))) / SR
    y = np.zeros(n)
    for k in range(1, 20):
        if f * k > 8000:
            break
        y += np.sin(k * ph) / k
    y = lp(y, 2200) + bp(y, 900, 1600) * 0.6
    return (y * env_adsr(n, 0.25, 0.2, 0.9, 0.3) * vel * 0.22).astype(np.float32)


def drone(f, dur, vel=0.5, bright=6, lfo=0.07, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    y = np.zeros(n)
    for ratio, a in ((1, 1), (1.5, 0.45), (2, 0.5), (0.5, 0.6), (3, 0.15)):
        for det in (-0.12, 0.13):
            fr = f * ratio * 2 ** (det / 12)
            ph = 2 * np.pi * fr * t + r.uniform(0, 6)
            for k in range(1, bright + 1):
                y += a * np.sin(k * ph) / (k ** 1.6)
    m = 0.75 + 0.25 * np.sin(2 * np.pi * lfo * t + r.uniform(0, 6))
    e = env_adsr(n, min(3, dur / 3), 0.5, 1, min(3, dur / 3))
    return (lp(y, 1800) * m * e * vel * 0.05).astype(np.float32)


# ----------------------------------------------------------------- drums
def _drum(f0, f1, decay, n_amt, n_decay, lpf, dur=1.2):
    t = secs(dur)
    fr = f1 + (f0 - f1) * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / decay)
    nz = lp(noise(len(t)), lpf) * np.exp(-t / n_decay) * n_amt
    return (body + nz).astype(np.float32)


DRUMS = {}


def drum(kind):
    if kind not in DRUMS:
        if kind == 'davul':
            DRUMS[kind] = norm(_drum(130, 58, 0.28, 0.6, 0.05, 2500, 1.0), 0.9)
        elif kind == 'kos':
            DRUMS[kind] = norm(_drum(85, 36, 0.9, 0.5, 0.25, 900, 3.0), 0.95)
        elif kind == 'tek':
            t = secs(0.25)
            DRUMS[kind] = norm((hp(noise(len(t)), 1800) * np.exp(-t / 0.035) + np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.05) * 0.5).astype(np.float32), 0.6)
        elif kind == 'dum':
            DRUMS[kind] = norm(_drum(110, 70, 0.18, 0.3, 0.03, 1500, 0.6), 0.8)
        elif kind == 'zil':
            t = secs(1.6)
            y = hp(noise(len(t)), 5000) * np.exp(-t / 0.5)
            for fr in (3350, 4720, 5900, 7330):
                y += np.sin(2 * np.pi * fr * t) * np.exp(-t / 0.7) * 0.15
            DRUMS[kind] = norm(y.astype(np.float32), 0.35)
        elif kind == 'heart':
            t = secs(0.9)
            b = _drum(70, 40, 0.09, 0.1, 0.02, 400, 0.9)
            b2 = np.zeros_like(b)
            s = int(0.24 * SR)
            b2[s:] = b[: len(b) - s] * 0.7
            DRUMS[kind] = norm(lp(b + b2, 300).astype(np.float32), 0.9)
    return DRUMS[kind]


# ----------------------------------------------------------------- SFX generators
def sfx_wind(dur, strength=0.5, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    base = noise(n)
    m = 0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t + r.uniform(0, 6)) * np.sin(2 * np.pi * 0.037 * t + r.uniform(0, 6))
    y = bp(base, 250, 1200) * (0.4 + 0.6 * m) + bp(base, 1500, 4000) * 0.15 * m
    y = np.stack([y, np.roll(y, int(0.013 * SR))], 1)
    return (y * env_adsr(n, 1.5, 0.1, 1, 1.5)[:, None] * strength * 0.25).astype(np.float32)


def sfx_thunder(seed=0, dist=0.0):
    r = np.random.default_rng(seed)
    t = secs(5)
    crack = hp(noise(len(t)), 1200) * np.exp(-t / 0.08) * (1 - dist)
    rumble = lp(noise(len(t)), 180) * (np.exp(-t / 1.6)) * (1 + 0.5 * np.sin(2 * np.pi * 1.7 * t))
    rumble2 = lp(noise(len(t)), 90) * np.exp(-((t - 0.6) ** 2) / 0.5)
    y = crack * 0.6 + rumble * 2.2 + rumble2 * 2.5
    return norm(y.astype(np.float32), 0.95 * (1 - dist * 0.5))


def sfx_boom():
    t = secs(3)
    fr = 30 + 70 * np.exp(-t / 0.15)
    y = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.9) + lp(noise(len(t)), 300) * np.exp(-t / 0.4) * 0.5
    return norm(y.astype(np.float32), 0.95)


def sfx_clash(seed=0):
    r = np.random.default_rng(seed)
    t = secs(1.2)
    y = hp(noise(len(t)), 3000) * np.exp(-t / 0.02) * 0.8
    for _ in range(7):
        fr = r.uniform(1800, 7500)
        y += np.sin(2 * np.pi * fr * t + r.uniform(0, 6)) * np.exp(-t / r.uniform(0.08, 0.35)) * r.uniform(0.1, 0.35)
    return norm(y.astype(np.float32), 0.7)


def sfx_hoof(seed=0):
    r = np.random.default_rng(seed)
    t = secs(0.12)
    y = lp(noise(len(t)), r.uniform(600, 1100)) * np.exp(-t / 0.018) + np.sin(2 * np.pi * r.uniform(90, 140) * t) * np.exp(-t / 0.03)
    return y.astype(np.float32)


def sfx_gallop(dur, rate=2.4, n_horses=4, seed=0, strength=0.6):
    """Many horses: three-beat gallop per stride with jitter."""
    r = np.random.default_rng(seed)
    out = np.zeros((int(dur * SR) + SR, 2), np.float32)
    for h in range(n_horses):
        p = r.uniform(-0.8, 0.8)
        t = r.uniform(0, 0.4)
        while t < dur:
            for k, off in enumerate((0, 0.09, 0.17)):
                place(out, pan(sfx_hoof(r.integers(1e6)) * r.uniform(0.5, 1), p), t + off + r.uniform(-0.01, 0.01))
            t += 1 / rate * r.uniform(0.95, 1.05)
    out = out[: int(dur * SR)]
    return (lp(out.T, 3000).T * strength * 0.5 * env_adsr(len(out), 0.6, 0.1, 1, 0.8)[:, None]).astype(np.float32)


def sfx_neigh(seed=0):
    r = np.random.default_rng(seed)
    t = secs(1.5)
    contour = 520 + 380 * np.exp(-t / 0.25) - 120 * t
    f = contour * (1 + 0.06 * np.sin(2 * np.pi * 11 * t) * np.clip(t / 0.3, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.zeros(len(t))
    for k in range(1, 12):
        y += np.sin(k * ph) / k ** 0.9
    y = bp(y, 400, 3500) + bp(noise(len(t)), 900, 3000) * 0.15
    e = np.clip(t / 0.05, 0, 1) * np.exp(-((t - 0.5) ** 2) / 0.35)
    return norm((y * e).astype(np.float32), 0.5)


def sfx_trumpet_elephant(seed=0):
    t = secs(1.8)
    f = 330 + 140 * np.sin(np.pi * t / 1.8)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.02 * np.sin(2 * np.pi * 23 * t))) / SR
    y = np.zeros(len(t))
    for k in range(1, 16):
        y += np.sin(k * ph) / k ** 0.7
    y = bp(y, 300, 4000) + hp(noise(len(t)), 2000) * 0.2
    e = np.clip(t / 0.15, 0, 1) * np.clip((1.8 - t) / 0.5, 0, 1)
    return norm((y * e).astype(np.float32), 0.5)


def sfx_crowd(dur, intensity=0.6, seed=0):
    """Battle roar: overlapping formant-shaped noise voices + low rumble."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    out = np.zeros((n, 2), np.float32)
    for v in range(10):
        lo = r.uniform(250, 700)
        hi = lo * r.uniform(2.2, 4)
        y = bp(noise(n), lo, hi) * (0.5 + 0.5 * np.sin(2 * np.pi * r.uniform(0.2, 0.8) * t + r.uniform(0, 6))) ** 2
        out += pan(y.astype(np.float32), r.uniform(-0.9, 0.9))
    out[:, 0] += lp(noise(n), 200) * 0.8
    out[:, 1] += lp(noise(n), 200) * 0.8
    return (out * intensity * 0.12 * env_adsr(n, 1.2, 0.1, 1, 1.5)[:, None]).astype(np.float32)


def sfx_arrows(seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros((int(1.6 * SR), 2), np.float32)
    for k in range(14):
        tt = secs(0.5)
        f0 = r.uniform(2500, 4500)
        y = bp(noise(len(tt)), f0 * 0.6, f0 * 1.4) * np.sin(np.pi * tt / 0.5) ** 2
        place(out, pan(y.astype(np.float32), r.uniform(-1, 1)), r.uniform(0, 1.0), r.uniform(0.2, 0.5))
    return out


def sfx_whoosh(dur=0.9):
    t = secs(dur)
    f = 300 + 2500 * (t / dur) ** 2
    y = np.zeros(len(t))
    nz = noise(len(t))
    for i in range(0, len(t), 2400):
        seg = slice(i, min(len(t), i + 2400))
        y[seg] = bp(nz[seg], f[i] * 0.6, f[i] * 1.6)
    e = np.sin(np.pi * t / dur) ** 2
    return (y * e * 0.6).astype(np.float32)


def sfx_fire(dur, seed=0, strength=0.5):
    n = int(dur * SR)
    r = np.random.default_rng(seed)
    y = lp(noise(n), 700) * 0.25
    clicks = np.zeros(n)
    idx = r.integers(0, n, int(dur * 40))
    clicks[idx] = r.uniform(-1, 1, len(idx))
    y += hp(np.convolve(clicks, np.exp(-np.arange(200) / 30), 'same'), 1500) * 0.6
    return (pan(y.astype(np.float32), 0) * strength * env_adsr(n, 0.8, 0.1, 1, 0.8)[:, None] * 0.6).astype(np.float32)


def sfx_chains(seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(int(1.5 * SR), np.float32)
    for k in range(6):
        t = secs(0.4)
        y = np.zeros(len(t))
        for _ in range(4):
            y += np.sin(2 * np.pi * r.uniform(2500, 6500) * t) * np.exp(-t / r.uniform(0.03, 0.1))
        place2 = int(r.uniform(0, 1.0) * SR)
        out[place2:place2 + len(y)] += (y * r.uniform(0.2, 0.5))[: len(out) - place2]
    return out


def sfx_scroll():
    t = secs(1.4)
    y = hp(noise(len(t)), 1500) * (0.3 + 0.7 * np.abs(np.sin(2 * np.pi * 3.5 * t))) * np.exp(-t / 0.8)
    return (y * 0.3).astype(np.float32)


def sfx_quill(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    strokes = (np.sin(2 * np.pi * 2.3 * t) > 0.2).astype(float)
    y = bp(noise(n), 2500, 7000) * strokes * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 13 * t)))
    return (lp(y, 8000) * 0.12).astype(np.float32)


def sfx_stamp():
    t = secs(0.6)
    y = np.sin(2 * np.pi * (90 + 120 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.12) + lp(noise(len(t)), 1200) * np.exp(-t / 0.03)
    return norm(y.astype(np.float32), 0.8)


def sfx_footsteps(dur, rate=1.6, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(int(dur * SR) + SR, np.float32)
    t = 0.2
    while t < dur:
        tt = secs(0.15)
        y = lp(noise(len(tt)), 500) * np.exp(-tt / 0.03) + hp(noise(len(tt)), 3000) * np.exp(-tt / 0.01) * 0.1
        i = int(t * SR)
        out[i:i + len(y)] += y * r.uniform(0.4, 0.7)
        t += 1 / rate * r.uniform(0.92, 1.08)
    return out[: int(dur * SR)] * 0.5


def sfx_march(dur, rate=1.9, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros((int(dur * SR) + SR, 2), np.float32)
    for k in range(10):
        place(out, pan(sfx_footsteps(dur, rate, seed + k), r.uniform(-0.8, 0.8)), r.uniform(0, 0.05))
    return out[: int(dur * SR)] * 0.6


def sfx_crickets(dur, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    out = np.zeros((n, 2), np.float32)
    for c in range(4):
        f = r.uniform(4200, 5600)
        rate = r.uniform(2.5, 4)
        gate = ((np.sin(2 * np.pi * rate * t + r.uniform(0, 6)) > 0.6) * (np.sin(2 * np.pi * 30 * t) > 0)).astype(float)
        y = np.sin(2 * np.pi * f * t) * lp(gate, 200)
        out += pan(y.astype(np.float32), r.uniform(-1, 1)) * 0.03
    return out


def sfx_water(dur, seed=0):
    n = int(dur * SR)
    r = np.random.default_rng(seed)
    y = bp(noise(n), 300, 2500) * 0.15
    for _ in range(int(dur * 25)):
        t = secs(0.05)
        f = r.uniform(400, 1400)
        b = np.sin(2 * np.pi * f * (1 + t * 8) * t) * np.exp(-t / 0.015)
        i = r.integers(0, max(1, n - len(t)))
        y[i:i + len(t)] += b * 0.2
    return y.astype(np.float32) * env_adsr(n, 0.8, 0.1, 1, 0.8)


def sfx_bell(f=180):
    t = secs(6)
    y = np.zeros(len(t))
    for ratio, a, d in ((0.5, 0.6, 3), (1, 1, 2.2), (1.19, 0.5, 1.6), (1.56, 0.4, 1.2), (2, 0.3, 1), (2.74, 0.2, 0.7)):
        y += a * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / d)
    return norm(y.astype(np.float32), 0.5)


def sfx_dig(dur, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(int(dur * SR) + SR, np.float32)
    t = 0.1
    while t < dur:
        tt = secs(0.3)
        y = lp(noise(len(tt)), 900) * np.exp(-tt / 0.05) + bp(noise(len(tt)), 2000, 6000) * np.exp(-tt / 0.12) * 0.2
        i = int(t * SR)
        out[i:i + len(y)] += y * r.uniform(0.3, 0.6)
        t += r.uniform(0.5, 0.9)
    return out[: int(dur * SR)]


def sfx_rumble(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (lp(noise(n), 120) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t)) * env_adsr(n, 0.5, 0.1, 1, 1.0) * 1.2).astype(np.float32)


def sfx_riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    nz = noise(n)
    for i in range(0, n, 4800):
        seg = slice(i, min(n, i + 4800))
        fc = 200 + 5000 * (i / n) ** 2
        y[seg] = bp(nz[seg], fc * 0.7, fc * 1.3)
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (2 * t / dur)) / SR) * 0.3
    e = (t / dur) ** 2
    return ((y * 0.6 + tone) * e * 0.5).astype(np.float32)


def sfx_heat(dur):
    n = int(dur * SR)
    return (hp(noise(n), 6000) * 0.015 * env_adsr(n, 1, 0.1, 1, 1)).astype(np.float32)


def sfx_candle(dur):
    n = int(dur * SR)
    y = lp(noise(n), 400) * 0.04
    return y.astype(np.float32) * env_adsr(n, 0.5, 0.1, 1, 0.5)


def sfx_spark():
    t = secs(0.5)
    return (hp(noise(len(t)), 4000) * np.exp(-t / 0.05) * 0.4).astype(np.float32)


# ----------------------------------------------------------------- timeline helpers
def load_timeline(root='.'):
    tim = json.load(open(f'{root}/story/timing.json'))
    starts = {s['id']: s['from'] / 30 for s in tim['scenes']}
    lens = {s['id']: s['frames'] / 30 for s in tim['scenes']}
    src = open(f'{root}/src/data/cues.ts', encoding='utf-8').read()
    cues = json.loads(src[src.index('= ') + 2: src.rindex(';')])
    return tim, starts, lens, cues


def cue_time(cues, starts, scene, word, nth=0, fallback=None):
    """Absolute seconds at which `word` is spoken in `scene`."""
    c = cues.get(scene)
    if c:
        k = 0
        for w, t in c['words']:
            if word in w:
                if k == nth:
                    return starts[scene] + c['offset'] / 30 + t
                k += 1
    return starts[scene] + (fallback if fallback is not None else 0)
