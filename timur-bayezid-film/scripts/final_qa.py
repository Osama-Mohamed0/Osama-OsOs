"""Final film QA: duration, A/V sync (cross-correlation of the muxed audio against the narration stem),
black frames, frozen shots > 3 s, and a frame every 10 s tiled into contact sheets (out/qa/)."""
import json
import os
import re
import subprocess

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FILM = 'final/Timur_vs_Bayezid.mp4'
os.makedirs('out/qa', exist_ok=True)
report = {}

info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,duration,nb_frames:format=duration,size,bit_rate', '-of', 'json', FILM]))
report['format'] = info['format']
report['streams'] = info['streams']

# --- A/V sync: extract muxed audio and correlate its envelope with the narration stem
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', FILM, '-vn', '-ac', '1', '-ar', '8000', 'out/qa/film_audio.wav'], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'audio/stems/narration.wav', '-ac', '1', '-ar', '8000', 'out/qa/narr8k.wav'], check=True)
a, _ = sf.read('out/qa/film_audio.wav')
b, _ = sf.read('out/qa/narr8k.wav')
hop = 80  # 10 ms
env = lambda x: np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
ea, eb = env(a), env(b)
n = min(len(ea), len(eb))
ea, eb = ea[:n] - ea[:n].mean(), eb[:n] - eb[:n].mean()
lags = range(-50, 51)
cc = [np.dot(ea[max(0, l):n + min(0, l)], eb[max(0, -l):n - max(0, l)]) for l in lags]
report['av_offset_ms'] = int(list(lags)[int(np.argmax(cc))] * 10)

# --- black frames & frozen shots
r = subprocess.run(['ffmpeg', '-i', FILM, '-vf', 'blackdetect=d=0.5:pix_th=0.06,freezedetect=n=0.0008:d=3', '-an', '-f', 'null', '-'], capture_output=True, text=True)
report['black_segments'] = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', r.stderr)
fs_ = re.findall(r'freeze_start: ([\d.]+)', r.stderr)
fe_ = re.findall(r'freeze_end: ([\d.]+)', r.stderr)
report['frozen_segments'] = list(zip(fs_, fe_))

# --- a frame every 10 s
W, H = 640, 360
frames = []
for t in range(5, 900, 10):
    p = f'out/qa/f_{t:03d}.png'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', FILM, '-frames:v', '1', '-s', f'{W}x{H}', p], check=True)
    frames.append((t, p))
for k in range(0, len(frames), 9):
    sheet = Image.new('RGB', (3 * W, 3 * H))
    for i, (t, p) in enumerate(frames[k:k + 9]):
        im = Image.open(p).convert('RGB')
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 80, 20], fill='black')
        d.text((4, 4), f'{t // 60}:{t % 60:02d}', fill='white')
        sheet.paste(im, ((i % 3) * W, (i // 3) * H))
    sheet.save(f'out/qa/sheet_{k // 9:02d}.png')
json.dump(report, open('out/qa/report.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in report.items() if k != 'streams'}, indent=1, ensure_ascii=False))
