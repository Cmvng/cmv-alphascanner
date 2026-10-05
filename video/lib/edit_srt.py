# Subtitles for an edit of the owner's recording, from the plan's caption words (output times):
#   python3 video/lib/edit_srt.py video/out/<edit>/plan.json <out.srt>
# Cues of up to two lines of 42 characters, at most 6 s, broken after a sentence end (or a comma, once a cue is long),
# each on screen from its first word to its last (plus a short hold that never runs into the next cue).
import json, sys

def ts(t):
    ms = int(round(t * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'

def lines(words, width=42):
    out, cur = [], ''
    for w in words:
        if cur and len(cur) + 1 + len(w) > width: out.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    return out + ([cur] if cur else [])

def cues(segs, width=42, maxdur=6.0):
    res = []
    for s in segs:
        ws = [w for w in s.get('words') or [] if w['w'].strip()]
        group = []
        for i, w in enumerate(ws):
            group.append(w)
            text = [x['w'] for x in group]
            end_sentence = w['w'][-1] in '.?!…' and len(' '.join(text)) > 24 or w['w'][-1] in ',;:' and len(' '.join(text)) > 52
            nxt = ws[i + 1] if i + 1 < len(ws) else None
            too_long = nxt and (len(lines(text + [nxt['w']], width)) > 2 or nxt['t1'] - group[0]['t0'] > maxdur)
            if end_sentence or too_long or not nxt:
                res.append([group[0]['t0'], w['t1'], '\n'.join(lines(text, width))]); group = []
    for a, b in zip(res, res[1:]): a[1] = min(max(a[1] + 0.25, a[0] + 0.8), b[0] - 0.02)
    if res: res[-1][1] += 0.25
    return res

if __name__ == '__main__':
    P = json.load(open(sys.argv[1]))
    C = cues([s for s in P['segments'] if s.get('words')])
    open(sys.argv[2], 'w').write('\n'.join(f'{i}\n{ts(a)} --> {ts(b)}\n{t}\n' for i, (a, b, t) in enumerate(C, 1)))
    print(len(C), 'cues')
