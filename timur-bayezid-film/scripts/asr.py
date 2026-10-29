"""Offline Arabic ASR check (Whisper turbo via sherpa-onnx). Used to QA narration intelligibility."""
import sys, re, numpy as np, soundfile as sf, sherpa_onnx
from scipy.signal import resample_poly

M = '.cache/asr/sherpa-onnx-whisper-turbo'
_rec = None

def rec():
    global _rec
    if _rec is None:
        _rec = sherpa_onnx.OfflineRecognizer.from_whisper(
            encoder=f'{M}/turbo-encoder.int8.onnx', decoder=f'{M}/turbo-decoder.int8.onnx',
            tokens=f'{M}/turbo-tokens.txt', language='ar', task='transcribe', num_threads=4)
    return _rec

def transcribe(path):
    x, sr = sf.read(path, dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != 16000: x = resample_poly(x, 16000, sr).astype('float32'); sr = 16000
    out = []
    for i in range(0, len(x), 16000 * 28):  # whisper window 30 s
        s = rec().create_stream(); s.accept_waveform(sr, x[i:i + 16000 * 28]); rec().decode_stream(s)
        out.append(s.result.text)
    return ' '.join(out)

def norm(t):
    t = re.sub(r'[ً-ْٰـ]', '', t)
    t = re.sub('[إأآا]', 'ا', t).replace('ة', 'ه').replace('ى', 'ي').replace('چ', 'ج')
    return re.sub(r'[^ء-ي ]', ' ', t).split()

def cer(ref, hyp):
    a, b = ' '.join(norm(ref)), ' '.join(norm(hyp))
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return d[len(b)] / max(1, len(a))

if __name__ == '__main__':
    print(transcribe(sys.argv[1]))
