"""Narration synthesis, scene by scene.

Default engine: Piper (offline, voice ar_JO-kareem-medium) because the cloud build
environment blocks speech.platform.bing.com. On a machine with internet access you can
switch to edge-tts (ar-SA-HamedNeural):  python scripts/tts.py --engine edge
Outputs audio/narration/<ID>.wav (48 kHz mono, mastered) and story/narration_durations.json.
"""
import argparse, asyncio, json, os, re, subprocess, sys, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
OUT = 'audio/narration'
RAW = 'audio/work/narr_raw'
KAREEM = '.cache/voices/vits-piper-ar_JO-kareem-medium/ar_JO-kareem-medium.onnx'

# Voice chain: rumble cut, warmth, presence, gentle compression, small room, 48 kHz.
VOICE_FX = ('highpass=f=75,equalizer=f=140:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=2,'
            'equalizer=f=7500:t=q:w=2:g=-2.5,acompressor=threshold=0.12:ratio=3:attack=8:release=120:makeup=1.6,'
            'aecho=0.8:0.55:38|61:0.12|0.07,aresample=48000')


VOWELS = '\u064B\u064C\u064D\u064E\u064F\u0650'  # tanween + short vowels


def waqf(text):
    """Apply classical pause rules (waqf) before punctuation: drop case endings,
    taa marbuta -> haa, -an -> -aa. Gives the natural rhythm of Arabic documentary narration."""
    def fix(m):
        w, p = m.group(1), m.group(2)
        if w.endswith('\u064B\u0627') or w.endswith('\u0627\u064B'):
            return w.replace('\u064B', '') + p
        core = w.rstrip(VOWELS + '\u0651')
        shadda = '\u0651' if '\u0651' in w[len(core):] else ''
        if core.endswith('\u0629'):
            return core[:-1] + '\u0647\u0652' + p
        if len(core) < len(w):
            return core + shadda + '\u0652' + p
        return w + p
    return re.sub(r'(\S+?)([\u060C\u061B\u061F.:!…,])', fix, text)


def piper_synth(scenes, length_scale):
    from piper import PiperVoice, SynthesisConfig
    v = PiperVoice.load(KAREEM)
    v.use_tashkeel = False  # the script is fully diacritized by hand
    cfg = SynthesisConfig(length_scale=length_scale, noise_scale=0.6, noise_w_scale=0.7)
    for s in scenes:
        with wave.open(f'{RAW}/{s["id"]}.wav', 'wb') as w:
            v.synthesize_wav(waqf(s['narration']), w, syn_config=cfg)


async def edge_synth(scenes):
    import edge_tts
    for s in scenes:
        await edge_tts.Communicate(s['narration'], 'ar-SA-HamedNeural', rate='-8%', pitch='-4Hz').save(f'{RAW}/{s["id"]}.mp3')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--engine', default='piper', choices=['piper', 'edge'])
    ap.add_argument('--only', nargs='*')
    ap.add_argument('--length-scale', type=float, default=0.85)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True); os.makedirs(RAW, exist_ok=True)
    scenes = [s for s in json.load(open('story/script.json', encoding='utf-8'))['scenes'] if s['narration']]
    if a.only: scenes = [s for s in scenes if s['id'] in a.only]
    if a.engine == 'piper': piper_synth(scenes, a.length_scale); ext = 'wav'
    else: asyncio.run(edge_synth(scenes)); ext = 'mp3'
    dpath = 'story/narration_durations.json'
    durs = json.load(open(dpath)) if os.path.exists(dpath) else {}
    for s in scenes:
        out = f'{OUT}/{s["id"]}.wav'
        # trim leading/trailing silence, then voice chain
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{RAW}/{s["id"]}.{ext}', '-af',
                        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
                        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,' + VOICE_FX + ',apad=pad_dur=0.25',
                        '-ac', '1', '-c:a', 'pcm_s16le', out], check=True)
        d = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]))
        durs[s['id']] = round(d, 3)
        print(s['id'], durs[s['id']])
    json.dump(durs, open(dpath, 'w'), indent=1)
    print('narration total', round(sum(durs.values()), 1), 's')


if __name__ == '__main__':
    main()
