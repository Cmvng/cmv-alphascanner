# Kokoro (Apache-2.0, local, free): read a text in one voice -> wav (24 kHz).  python3 kok.py <voice> <text file> <out.wav> [speed]
import sys, numpy as np, soundfile as sf
from kokoro import KPipeline
GAP = 0.35
voice, src, out = sys.argv[1], sys.argv[2], sys.argv[3]; speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
pipe = KPipeline(lang_code='a' if voice[0] == 'a' else 'b', repo_id='hexgrad/Kokoro-82M')
paras = [p.strip() for p in open(src).read().split('\n\n') if p.strip()]
gap = np.zeros(int(24000 * GAP), dtype=np.float32); parts = []
for p in paras:
    for _, _, audio in pipe(p, voice=voice, speed=speed):
        parts.append(audio.numpy() if hasattr(audio, 'numpy') else np.asarray(audio))
    parts.append(gap)
sf.write(out, np.concatenate(parts[:-1]), 24000); print(out, round(sum(len(x) for x in parts[:-1]) / 24000, 2), 's')
