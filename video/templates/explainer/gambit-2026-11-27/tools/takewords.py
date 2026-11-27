"""Lara's take: transcribe it (small.en), compare with the script word by word (the hear-back), and give every SCRIPT
word a time from the recogniser's words (difflib), ready for CTC alignment.
  python3 -I takewords.py <work dir> <script.txt>   -> words_in.json, words_script.json, hear.txt"""
import json, re, sys, difflib
from faster_whisper import WhisperModel
K, SCRIPT = sys.argv[1], sys.argv[2]
m = WhisperModel('small.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(f'{K}/take16.wav', word_timestamps=True, vad_filter=False, beam_size=5, condition_on_previous_text=False)
W = [{'s': round(w.start, 3), 'e': round(w.end, 3), 'w': w.word.strip()} for s in segs for w in s.words]
json.dump(W, open(f'{K}/words_in.json', 'w'), indent=0)
norm = lambda s: re.sub(r"[^a-z0-9]", '', s.lower())
script = open(SCRIPT).read().split()
A, B = [norm(x) for x in script], [norm(w['w']) for w in W]
out, report = [], []
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
    if tag != 'equal': report.append(f"{tag:8s} script: {' '.join(script[i1:i2])!r:60s} heard: {' '.join(w['w'] for w in W[j1:j2])!r}")
    if tag == 'equal':
        for k in range(i2 - i1): out.append({'s': W[j1 + k]['s'], 'e': W[j1 + k]['e'], 'w': script[i1 + k]})
    elif i2 > i1:
        t0 = W[j1]['s'] if j2 > j1 else (out[-1]['e'] if out else 0.0)
        t1 = W[j2 - 1]['e'] if j2 > j1 else (W[j1]['s'] if j1 < len(W) else t0 + .4 * (i2 - i1))
        for k in range(i2 - i1):
            a = t0 + (t1 - t0) * k / (i2 - i1); b = t0 + (t1 - t0) * (k + 1) / (i2 - i1)
            out.append({'s': round(a, 3), 'e': round(max(b, a + .06), 3), 'w': script[i1 + k]})
json.dump(out, open(f'{K}/words_script.json', 'w'), indent=0)
open(f'{K}/hear.txt', 'w').write('\n'.join(report) + '\n')
print(len(script), 'script words,', len(W), 'heard;', len(report), 'differences')
print('\n'.join(report))
print('HEARD:', ' '.join(w['w'] for w in W))
