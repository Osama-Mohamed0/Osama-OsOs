"""Intelligibility of the narration inside the final mix: Whisper CER per scene (compare with narration-only CER)."""
import json, sys, os, subprocess
sys.path.insert(0, 'scripts')
import asr
tim = {s['id']: s for s in json.load(open('story/timing.json'))['scenes']}
sc = {s['id']: s for s in json.load(open('story/script.json'))['scenes']}
qa = json.load(open('audio/narration/qa.json'))
ids = sys.argv[1:] or [k for k in tim if sc[k]['narration']]
res = {}
for sid in ids:
    s = tim[sid]
    t0 = (s['from'] + s['narrFrom']) / 30
    d = s['narrFrames'] / 30
    p = f'audio/work/mixqa_{sid}.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t0:.2f}', '-t', f'{d:.2f}', '-i', 'audio/soundtrack.wav', p], check=True)
    c = asr.cer(sc[sid]['narration'], asr.transcribe(p))
    res[sid] = round(c, 3)
    print(sid, 'mix CER', res[sid], 'voice-only CER', qa[sid]['cer'], flush=True)
json.dump(res, open('audio/work/mix_qa.json', 'w'), indent=1)
