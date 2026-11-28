import sys
from faster_whisper import WhisperModel
import soundfile as sf, numpy as np
m = WhisperModel('medium.en', device='cpu', compute_type='int8')
for f in sys.argv[1:]:
    x, sr = sf.read(f)
    if x.ndim > 1: x = x.mean(1)
    for a, b in [(30.5, 34.0), (55.5, 63.5)]:
        s, _ = m.transcribe(x[int(a*sr):int(b*sr)].astype(np.float32), language='en', beam_size=5, word_timestamps=True)
        print(f.split('/')[-1], a, '|', ' '.join(f'{w.word.strip()}@{a+w.start:.2f}' for t in s for w in t.words))
