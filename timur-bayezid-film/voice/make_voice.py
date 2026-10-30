"""استبدال صوت التعليق في الفيلم دون إعادة رسم أي مشهد.

الاستخدام (من داخل مجلد voice):
  python make_voice.py                      # يولّد الصوت بـ edge-tts (ar-SA-HamedNeural) ثم يركّبه
  python make_voice.py --voice ar-EG-ShakirNeural --rate -5%
  python make_voice.py --from-folder clips  # يستخدم تسجيلاتك/ملفات ElevenLabs: clips/S01.mp3 ...
الناتج: ..\\final\\Timur_vs_Bayezid_newvoice.mp4
"""
import argparse, asyncio, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
VIDEO = os.path.join('..', 'final', 'Timur_vs_Bayezid.mp4')
OUT = os.path.join('..', 'final', 'Timur_vs_Bayezid_newvoice.mp4')
SLOTS = json.load(open('slots.json'))
SCRIPT = {s['id']: s for s in json.load(open(os.path.join('..', 'story', 'script.json'), encoding='utf-8'))['scenes']}


def sh(cmd):
    subprocess.run(cmd, check=True)


def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]))


async def edge(voice, rate, pitch, folder):
    import edge_tts
    for sid in SLOTS:
        text = re.sub(r'[ً-ْٰ]', '', SCRIPT[sid]['narration'])  # edge-tts يشكّل وحده
        out = os.path.join(folder, f'{sid}.mp3')
        if not os.path.exists(out):
            print('توليد', sid)
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(out)


def build(folder):
    os.makedirs('work', exist_ok=True)
    inputs, filt, labels = [], [], []
    for i, (sid, s) in enumerate(SLOTS.items()):
        src = next((os.path.join(folder, f'{sid}.{e}') for e in ('wav', 'mp3', 'm4a', 'flac') if os.path.exists(os.path.join(folder, f'{sid}.{e}'))), None)
        if not src:
            sys.exit(f'ملف المشهد {sid} غير موجود في {folder}')
        clean = os.path.join('work', f'{sid}.wav')
        sh(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af',
            'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
            '-ar', '48000', '-ac', '1', clean])
        d = dur(clean)
        tempo = d / s['max'] if d > s['max'] else 1.0
        if tempo > 1.0:
            print(f'{sid}: المقطع أطول من المشهد ({d:.1f}ث > {s["max"]:.1f}ث) — تسريع ×{tempo:.2f}')
        inputs += ['-i', clean]
        filt.append(f'[{i}:a]atempo={tempo:.4f},adelay={int(s["start"] * 1000)}:all=1[v{i}]')
        labels.append(f'[v{i}]')
    filt.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0,apad=whole_dur=900[narr]')
    sh(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[narr]', '-t', '900', '-ar', '48000', 'work/narration.wav'])
    mix = ('[0:a]loudnorm=I=-18:TP=-3,asplit=2[nmix][nsc];'
           '[bg][nsc]sidechaincompress=threshold=0.025:ratio=6:attack=35:release=650:makeup=1:knee=3,volume=2.0[bd];'
           '[nmix][bd]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,apad=whole_dur=900[a]').replace('[bg]', '[1:a]')
    sh(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'work/narration.wav', '-i', 'background.m4a', '-filter_complex', mix, '-map', '[a]', '-t', '900', '-ar', '48000', 'work/soundtrack.wav'])
    sh(['ffmpeg', '-y', '-loglevel', 'error', '-i', VIDEO, '-i', 'work/soundtrack.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '900', OUT])
    print('تم:', os.path.abspath(OUT))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', default='ar-SA-HamedNeural')
    ap.add_argument('--rate', default='-5%')
    ap.add_argument('--pitch', default='-2Hz')
    ap.add_argument('--from-folder')
    a = ap.parse_args()
    folder = a.from_folder
    if not folder:
        folder = 'clips_' + a.voice
        os.makedirs(folder, exist_ok=True)
        asyncio.run(edge(a.voice, a.rate, a.pitch, folder))
    build(folder)
