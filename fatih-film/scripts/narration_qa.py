"""ASR round-trip QA of narration: transcribe each scene with Whisper and report CER."""
import json, sys, os
sys.path.insert(0, 'scripts')
import asr
sc = [s for s in json.load(open('story/script.json'))['scenes'] if s['narration']]
only = sys.argv[1:]
res = {}
for s in sc:
    if only and s['id'] not in only: continue
    hyp = asr.transcribe(f'audio/narration/{s["id"]}.wav')
    res[s['id']] = {'cer': round(asr.cer(s['narration'], hyp), 3), 'asr': hyp}
    print(s['id'], res[s['id']]['cer'], flush=True)
old = json.load(open('audio/narration/qa.json')) if os.path.exists('audio/narration/qa.json') else {}
old.update(res)
json.dump(old, open('audio/narration/qa.json', 'w'), ensure_ascii=False, indent=1)
print('mean CER', round(sum(v['cer'] for v in old.values()) / len(old), 3))
