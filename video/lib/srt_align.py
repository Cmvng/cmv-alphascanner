"""Subtitles for a finished edit when its caption text is known but its output times are not: the captions of a talking-
head edit list (cold open first, then the clips, in the order they play) are aligned word by word to faster-whisper's
words of the finished video (words.json: [{s, e, w}]). Each caption gets the time from its first to its last matched
word; long captions are split at about 84 characters.
  python3 -I video/lib/srt_align.py <edl.json> <words.json> <out.srt>"""
import difflib, json, re, sys

EDL, WORDS, OUT = sys.argv[1:4]
d = json.load(open(EDL))
caps = [c['cap'] for c in d.get('cold', []) if c.get('cap')] + [c['cap'] for c in d['clips'] if c.get('cap')]
words = json.load(open(WORDS))
norm = lambda s: re.sub(r"[^a-z0-9]", '', s.lower())
heard = [norm(w['w']) for w in words]

# every caption word, with the caption it belongs to
toks, owner = [], []
for i, c in enumerate(caps):
    for w in c.split():
        if norm(w):
            toks.append(norm(w)); owner.append(i)
sm = difflib.SequenceMatcher(None, toks, heard, autojunk=False)
first, last = {}, {}
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        i = owner[a + k]
        first.setdefault(i, b + k); last[i] = b + k


def ts(x):
    ms = int(round(x * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def split(text, n=84):
    """Pieces of at most about n characters, cut at a comma or a full stop where possible."""
    if len(text) <= n:
        return [text]
    parts, cur = [], ''
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > n:
            parts.append(cur); cur = w
        else:
            cur = (cur + ' ' + w).strip()
    return parts + ([cur] if cur else [])


cues, missing = [], []
for i, c in enumerate(caps):
    if i not in first:
        missing.append(c); continue
    t0, t1 = words[first[i]]['s'], words[last[i]]['e']
    pieces = split(c)
    tot = sum(len(p) for p in pieces)
    t = t0
    for p in pieces:                                       # each piece gets its share of the caption's time
        dt = (t1 - t0) * len(p) / tot
        cues.append((t, t + dt, p)); t += dt
cues.sort()


def two_lines(p, n=42):
    if len(p) <= n:
        return p
    mid = len(p) // 2
    cut = min((i for i, ch in enumerate(p) if ch == ' '), key=lambda i: abs(i - mid))
    return p[:cut] + '\n' + p[cut + 1:]


with open(OUT, 'w') as f:
    for k, (a, b, p) in enumerate(cues, 1):
        if k < len(cues):          # a number the transcript splits ("90" ",000") can end a cue early: hold it to the next
            b = min(max(b, min(cues[k][0] - .05, b + 1.5)), cues[k][0])
        f.write(f'{k}\n{ts(a)} --> {ts(b)}\n{two_lines(p)}\n\n')
print(f'{len(cues)} cues from {len(caps)} captions' + (f'; not found: {missing}' if missing else ''))
