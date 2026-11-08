"""Word times for a narrator take, written with the script's own words (names, digits, punctuation as written).

  python3 -P -E video/lib/script_words.py <take.wav> <script.txt> <out_dir> [--map-only]
    -> <out_dir>/whisper_words.json   faster-whisper medium.en word times
    -> <out_dir>/words_ctc.json       the same, snapped to the audio (align_words.py, CTC)
    -> <out_dir>/words_script.json    the script's words carrying those times  [{"s","e","w"}]
  and prints the hear-back: every script word whisper did not hear, in context.
"""
import difflib, json, os, re, subprocess, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
wav, script, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
if '--map-only' not in sys.argv:                 # re-map only: keep the whisper + CTC files already in out_dir
    from faster_whisper import WhisperModel
    m = WhisperModel('medium.en', device='cpu', compute_type='int8')
    segs, _ = m.transcribe(wav, word_timestamps=True, language='en', beam_size=5)
    W = [{'s': round(w.start, 3), 'e': round(w.end, 3), 'w': w.word.strip()} for s in segs for w in s.words]
    json.dump(W, open(f'{out}/whisper_words.json', 'w'))
    subprocess.run([sys.executable, '-I', f'{HERE}/align_words.py', wav, f'{out}/whisper_words.json', f'{out}/words_ctc.json'], check=True)
W = json.load(open(f'{out}/whisper_words.json'))
C = []
for w in json.load(open(f'{out}/words_ctc.json')):  # whisper splits "4-2-3-1" / "side-by-side" / "38 %": join the pieces
    if C and (w['w'].startswith('-') or w['w'] in ('%', '-')): C[-1] = {'s': C[-1]['s'], 'e': w['e'], 'w': C[-1]['w'] + w['w']}
    else: C.append(dict(w))
NUM = {'twonil': '20', 'twoone': '21', 'threeone': '31', 'centrebacks': 'centerbacks', 'centreback': 'centerback', 'kilometres': 'kilometers', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'}
norm = lambda w: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', w).encode('ascii', 'ignore').decode().lower())
toks = open(script).read().split()
key = lambda w: NUM.get(norm(w), norm(w))
a = [key(t) for t in toks]; b = [key(w['w']) for w in C]
tm = [None] * len(toks)
for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
    if op == 'equal':
        for k in range(i2 - i1): tm[i1 + k] = (C[j1 + k]['s'], C[j1 + k]['e'])
    elif op == 'replace' and j2 > j1:          # match letters inside the block ("Two-nil." ~ "2-0", "half-volley" ~ "half volley")
        A, B = a[i1:i2], b[j1:j2]; ownB = [j1 + k for k, t in enumerate(B) for _ in t]; m = {}
        for blk in difflib.SequenceMatcher(None, ''.join(A), ''.join(B), autojunk=False).get_matching_blocks():
            for q in range(blk.size): m[blk.a + q] = ownB[blk.b + q]
        p0 = 0
        for k, t in enumerate(A):
            js = [m[q] for q in range(p0, p0 + len(t)) if q in m]; p0 += len(t)
            if len(js) >= max(1, len(t) // 3): tm[i1 + k] = (C[min(js)]['s'], C[max(js)]['e'])
        if all(tm[i1 + k] is None for k in range(i2 - i1)) or i2 - i1 == j2 - j1:     # nothing in common, or one to one
            for k in range(i2 - i1):
                jj = j1 + round(k * (j2 - j1) / (i2 - i1)); tm[i1 + k] = (C[jj]['s'], C[min(j2 - 1, jj + max(0, round((j2 - j1) / (i2 - i1)) - 1))]['e'])
        print('REPLACED  script:', ' '.join(toks[i1:i2]), '| heard:', ' '.join(w['w'] for w in C[j1:j2]))
    elif op == 'delete':
        print('NOT HEARD script:', ' '.join(toks[max(0, i1 - 3):i2 + 3]), ' <<', ' '.join(toks[i1:i2]), '>>')
    elif op == 'insert':
        print('EXTRA     heard:', ' '.join(w['w'] for w in C[j1:j2]), 'after', ' '.join(toks[max(0, i1 - 3):i1]))
i = 0                                           # words with no time: share the gap between their neighbours
while i < len(toks):
    if tm[i] is None:
        j = i
        while j < len(toks) and tm[j] is None: j += 1
        a0 = tm[i - 1][1] if i else 0.0; b0 = tm[j][0] if j < len(toks) else a0 + 0.3 * (j - i)
        a0 = min(a0 + 0.04, b0); n = j - i
        d = max((b0 - a0) / n, 0.08)
        for k in range(n): tm[i + k] = (round(a0 + d * k, 3), round(a0 + d * (k + 1) - 0.02, 3))
        i = j
    i += 1
json.dump([{'s': s, 'e': e, 'w': t} for t, (s, e) in zip(toks, tm)], open(f'{out}/words_script.json', 'w'), ensure_ascii=False)
print('heard:', ' '.join(w['w'] for w in W))
