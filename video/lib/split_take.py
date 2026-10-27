"""Cut one recorded take of the whole script (ElevenLabs, or the owner reading it) into one file per line.

  python3 -P -E lib/split_take.py take.mp3 out/<render>/sentences.json voice_lines/   -> voice_lines/<line id>.wav

The renderer then uses them with "voice": "dir:voice_lines" and "voice_fx": false. The cuts go in the pauses between
sentences: of all the silences in the take, it picks the run that best matches each line's length (from its letters,
at the take's own speed). Whisper then hears each piece back against its line; any piece that doesn't match is listed,
so check those before rendering.
"""
import json, math, os, re, subprocess, sys
import numpy as np

SR = 48000
FF = os.environ.get('FFMPEG', 'ffmpeg')
HOP = 0.01


def read(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def write(path, a):
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', path], input=a.astype(np.float32).tobytes(), check=True)


def silences(a, min_len=0.12):
    """Quiet runs (start, end) in seconds, quiet meaning 38 dB under the loud parts of the take."""
    n = int(HOP * SR)
    rms = np.sqrt(np.mean(a[:len(a) // n * n].reshape(-1, n) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    quiet = db < np.percentile(db, 95) - 38
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) * HOP >= min_len: out.append((i * HOP, j * HOP))
            i = j
        else:
            i += 1
    return out, db


def letters(t):
    return len(re.sub(r'[^A-Za-z]', '', t))


def cut(take, sentences, out_dir):
    a = read(take)
    sil, db = silences(a)
    loud = np.where(db >= np.percentile(db, 95) - 38)[0]
    t0, t1 = loud[0] * HOP, (loud[-1] + 1) * HOP
    inner = [s for s in sil if s[0] > t0 and s[1] < t1]
    N = len(sentences)
    if len(inner) < N - 1:
        sys.exit(f'only {len(inner)} pauses for {N} lines: the take has no clear pause between some sentences')
    w = [letters(s['text']) for s in sentences]
    gaps = sorted((e - s for s, e in inner), reverse=True)[:N - 1]     # the sentence pauses are the longest ones
    rate = (t1 - t0 - sum(gaps)) / sum(w)                               # seconds per letter
    pause = sum(gaps) / (N - 1)
    mids = [(s + e) / 2 for s, e in inner]
    lens = [e - s for s, e in inner]
    C = len(inner)
    INF = float('inf')
    # best[k][c]: lowest cost with boundary k (after line k) at pause c
    best = [[INF] * C for _ in range(N - 1)]
    back = [[-1] * C for _ in range(N - 1)]

    def piece(L, k):
        exp = w[k] * rate + pause                                       # a piece runs from pause middle to pause middle
        return (math.log(max(L, 0.05) / exp) / 0.3) ** 2

    def bonus(c):
        return 3.0 * min(lens[c], 0.7) / 0.7

    for c in range(C):
        best[0][c] = piece(mids[c] - t0, 0) - bonus(c)
    for k in range(1, N - 1):
        for c in range(k, C):
            for p in range(k - 1, c):
                if best[k - 1][p] == INF: continue
                v = best[k - 1][p] + piece(mids[c] - mids[p], k) - bonus(c)
                if v < best[k][c]: best[k][c], back[k][c] = v, p
    last = min(range(C), key=lambda c: best[N - 2][c] + piece(t1 - mids[c], N - 1) if best[N - 2][c] < INF else INF)
    chosen = [last]
    for k in range(N - 2, 0, -1):
        chosen.append(back[k][chosen[-1]])
    chosen = chosen[::-1]
    edges = [t0 - 0.05] + [mids[c] for c in chosen] + [t1 + 0.05]
    os.makedirs(out_dir, exist_ok=True)
    report = []
    for k, s in enumerate(sentences):
        seg = a[int(max(edges[k], 0) * SR): int(edges[k + 1] * SR)]
        write(os.path.join(out_dir, s['id'] + '.wav'), seg)
        report.append((s['id'], edges[k], edges[k + 1]))
    return report


def hear(out_dir, sentences):
    """Whisper each piece; list the ones whose words don't match their line."""
    from faster_whisper import WhisperModel
    m = WhisperModel('small.en', device='cpu', compute_type='int8')
    nums = set('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen '
               'eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion '
               'percent dollars point and'.split())                    # whisper writes these as digits
    norm = lambda t: [x for x in re.sub(r"[^a-z' ]", ' ', t.lower()).split() if len(x) > 2 and x not in nums]
    bad = []
    for s in sentences:
        segs, _ = m.transcribe(os.path.join(out_dir, s['id'] + '.wav'), beam_size=5)
        heard = ' '.join(x.text.strip() for x in segs)
        want, got = norm(s['text']), set(norm(heard))
        score = sum(1 for x in want if x in got) / max(len(want), 1)
        print(f"  {s['id']:6} {score:4.0%}  {heard}")
        if score < 0.6: bad.append(s['id'])
    return bad


if __name__ == '__main__':
    take, sent, out = sys.argv[1:4]
    sentences = json.load(open(sent))
    for sid, a, b in cut(take, sentences, out):
        print(f'{sid:6} {a:7.2f} → {b:7.2f}  ({b - a:4.2f} s)')
    if '--no-hear' not in sys.argv:
        bad = hear(out, sentences)
        print('every piece matches its line' if not bad else f'CHECK THESE: {", ".join(bad)}')
