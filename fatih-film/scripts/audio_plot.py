"""Plot RMS envelope + spectrogram of an audio file, with scene boundaries: audio_plot.py in.wav out.png [t0 t1]"""
import sys, json
import numpy as np, soundfile as sf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.signal import spectrogram
x, sr = sf.read(sys.argv[1], dtype='float32')
if x.ndim > 1: x = x.mean(1)
t0 = float(sys.argv[3]) if len(sys.argv) > 3 else 0
t1 = float(sys.argv[4]) if len(sys.argv) > 4 else len(x) / sr
x = x[int(t0 * sr):int(t1 * sr)]
hop = int(sr * 0.1)
rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
db = 20 * np.log10(rms + 1e-6)
fig, ax = plt.subplots(2, 1, figsize=(22, 8), sharex=True)
ax[0].plot(t0 + np.arange(len(db)) * 0.1, db, lw=0.8)
ax[0].set_ylim(-70, 0); ax[0].set_ylabel('dBFS')
f, tt, S = spectrogram(x[::4], sr / 4, nperseg=2048, noverlap=1024)
ax[1].pcolormesh(t0 + tt, f, 10 * np.log10(S + 1e-12), shading='auto', cmap='magma', vmin=-110, vmax=-30)
ax[1].set_ylim(0, 6000)
tim = json.load(open('story/timing.json'))
for s in tim['scenes']:
    a = s['from'] / 30
    if t0 <= a <= t1:
        for k in ax: k.axvline(a, color='c', lw=0.6)
        ax[0].text(a + 0.5, -5, s['id'], fontsize=8)
plt.tight_layout(); plt.savefig(sys.argv[2], dpi=60)
