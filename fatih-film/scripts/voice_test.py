import json, wave, sys, os, time
sys.path.insert(0, 'scripts')
from piper import PiperVoice, SynthesisConfig
import asr
V = '.cache/voices'
sc = {s['id']: s for s in json.load(open('story/script.json'))['scenes']}
text = sc['S01']['narration'] + ' ' + sc['S07']['narration']
voices = {'miro': 'vits-piper-ar_JO-SA_miro-high/ar_JO-SA_miro-high.onnx',
          'miroV2': 'vits-piper-ar_JO-SA_miro_V2-high/ar_JO-SA_miro_V2-high.onnx',
          'kareem': 'vits-piper-ar_JO-kareem-medium/ar_JO-kareem-medium.onnx'}
for name, p in voices.items():
    v = PiperVoice.load(f'{V}/{p}')
    for tk in (False, True):
        v.use_tashkeel = tk
        out = f'audio/work/voicetest/{name}_tk{int(tk)}.wav'
        with wave.open(out, 'wb') as w:
            v.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=1.05, noise_scale=0.6, noise_w_scale=0.7))
        import soundfile as sf
        dur = sf.info(out).duration
        hyp = asr.transcribe(out)
        print(f'{name} tashkeel={tk} dur={dur:.1f}s wps={len(asr.norm(text))/dur:.2f} CER={asr.cer(text, hyp):.3f}')
        print('   ', hyp[:160])
