"""Download the offline models used by the pipeline into .cache/ (voice + ASR for QA).
Voice: Piper ar_JO-kareem-medium (packaged by k2-fsa/sherpa-onnx on GitHub releases)."""
import json, os, tarfile, urllib.request

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = 'https://github.com/k2-fsa/sherpa-onnx/releases/download'
ITEMS = [('tts-models', 'vits-piper-ar_JO-kareem-medium', '.cache/voices'),
         ('asr-models', 'sherpa-onnx-whisper-turbo', '.cache/asr')]
for rel, name, dest in ITEMS:
    if os.path.isdir(f'{dest}/{name}'):
        continue
    os.makedirs(dest, exist_ok=True)
    tmp = f'{dest}/{name}.tar.bz2'
    print('downloading', name)
    urllib.request.urlretrieve(f'{BASE}/{rel}/{name}.tar.bz2', tmp)
    tarfile.open(tmp).extractall(dest)
    os.remove(tmp)
# make the sherpa-packaged voice config readable by piper-tts
for root, _, files in os.walk('.cache/voices'):
    for fn in files:
        if fn.endswith('.onnx.json'):
            p = os.path.join(root, fn)
            d = json.load(open(p, encoding='utf-8'))
            d.setdefault('espeak', {'voice': 'ar'})
            d.setdefault('audio', {}).setdefault('sample_rate', 22050)
            d['phoneme_id_map'] = {k: (v if isinstance(v, list) else [v]) for k, v in d['phoneme_id_map'].items()}
            json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('models ready')
