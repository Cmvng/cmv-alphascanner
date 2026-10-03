"""Split the owner's cleaned voice into phrases at real silences, so every cut lands between phrases, never inside one.

  python3 phrases.py <clean voice wav (src_df3.wav)> <words.json> <out phrases.json>

Prints one line per phrase (index, source seconds, the words in it). An edit list then takes whole phrases:
{ "t": [phrase.s, phrase.e] } ranges in "w". The owner asked for this after words were clipped (3 Oct): cut at
silences, keep pauses natural, and check every edge is quiet before rendering.
"""
import json, subprocess, sys
import numpy as np

SR = 16000
wav, words_path, out = sys.argv[1:4]
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
k = int(0.01 * SR); n = len(x) // k
e = 20 * np.log10(np.sqrt((x[:n * k].reshape(n, k) ** 2).mean(1)) + 1e-9)
sp = e > -52                                     # speech frames: the cleaned audio's silence sits near -75 dB
runs, i = [], 0
while i < n:
    if sp[i]:
        j = i
        while j < n and sp[j]: j += 1
        runs.append([i, j]); i = j
    else: i += 1
merged = []
for a, b in runs:                                # gaps under 220 ms stay inside a phrase; blips under 60 ms go
    if merged and a - merged[-1][1] < 22: merged[-1][1] = b
    else: merged.append([a, b])
merged = [r for r in merged if r[1] - r[0] >= 6]
W = json.load(open(words_path)); P = []
for a, b in merged:
    s, t = a / 100, b / 100
    ws = [j for j, w in enumerate(W) if s - 0.05 <= (w['s'] + w['e']) / 2 <= t + 0.05]
    P.append({'s': round(max(0, s - 0.06), 2), 'e': round(t + 0.08, 2), 'text': ' '.join(W[j]['w'] for j in ws)})
    print(f"P{len(P) - 1:03d} {P[-1]['s']:7.2f}-{P[-1]['e']:7.2f}  {P[-1]['text']}")
json.dump(P, open(out, 'w'), indent=0)
