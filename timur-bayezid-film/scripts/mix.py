"""Final mix with ffmpeg: narration (always on top), music ducked under narration (sidechain),
SFX lightly ducked, then two-pass loudnorm to -14 LUFS / -1.5 dBTP.
Outputs audio/soundtrack.wav (+ copy in public/audio for the Main composition)."""
import json
import os
import shutil
import subprocess
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from audio_lib import SR, place, pan

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOTAL = 900.0


def build_narration():
    tim = json.load(open('story/timing.json'))
    buf = np.zeros((int(TOTAL * SR), 2), np.float32)
    for s in tim['scenes']:
        p = f'audio/narration/{s["id"]}.wav'
        if not os.path.exists(p):
            continue
        x, sr = sf.read(p, dtype='float32')
        assert sr == SR, (p, sr)
        if x.ndim > 1:
            x = x.mean(1)
        place(buf, pan(x, 0) * 1.414, (s['from'] + s['narrFrom']) / 30)
    peak = np.max(np.abs(buf))
    buf *= 0.9 / peak
    sf.write('audio/stems/narration.wav', buf, SR, subtype='PCM_24')


FILTER = (
    '[0:a]asplit=2[nmix][nsc];'
    '[1:a]volume=1.3[mus];[2:a]volume=1.1[sfx];'
    # background bus: glue compression so battles never swamp the voice
    '[mus][sfx]amix=inputs=2:normalize=0,acompressor=threshold=0.06:ratio=4:attack=20:release=300:makeup=1[bus];'
    # ducking keyed by the narration
    '[bus][nsc]sidechaincompress=threshold=0.025:ratio=6:attack=35:release=650:makeup=1:knee=3,volume=2.0[bduck];'
    '[nmix]equalizer=f=2800:t=q:w=1.4:g=1.5[voice];'
    '[voice][bduck]amix=inputs=2:normalize=0,alimiter=limit=0.95:level=false[mix]'
)


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def main():
    build_narration()
    ins = ['-i', 'audio/stems/narration.wav', '-i', 'audio/stems/music.wav', '-i', 'audio/stems/sfx.wav']
    run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', FILTER, '-map', '[mix]', '-c:a', 'pcm_s24le', 'audio/work/premix.wav'])
    # loudnorm pass 1 (measure)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'audio/work/premix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    txt = r.stderr
    m = json.loads(txt[txt.rindex('{'): txt.rindex('}') + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json")
    r = subprocess.run(['ffmpeg', '-hide_banner', '-y', '-i', 'audio/work/premix.wav', '-af', af, '-ar', '48000', '-c:a', 'pcm_s24le', 'audio/soundtrack.wav'],
                       capture_output=True, text=True)
    txt = r.stderr
    m2 = json.loads(txt[txt.rindex('{'): txt.rindex('}') + 1])
    os.makedirs('public/audio', exist_ok=True)
    shutil.copy('audio/soundtrack.wav', 'public/audio/soundtrack.wav')
    print('pass1 input I', m['input_i'], '-> output I', m2['output_i'], 'TP', m2['output_tp'], 'LRA', m2['output_lra'])


if __name__ == '__main__':
    os.makedirs('audio/work', exist_ok=True)
    main()
