"""Subtitles for Sunderland 1-0 Chelsea: Lara's words in the same lines as the on-screen captions, at video time,
with the names spelled right (the script spells Le Fée as 'Le Fay' so Lara says it properly).
  python3 -I srt.py <words_script.json> <out.srt> [vo cut gap]"""
import json, re, sys
W = [w for w in json.load(open(sys.argv[1])) if w['e'] - w['s'] > 0.005]
vo, cut, gap = (float(x) for x in (sys.argv[3:6] if len(sys.argv) > 5 else (0.2, 9.73, 0.6)))
T = lambda s: s + vo + (gap if s >= cut else 0)
ts = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}'
FIX = [('Le Fay', 'Le Fée'), ('Sixty-nine percent', '69%'), ('sixty-three percent', '63%')]
lines, cur = [], []
for w in W:
    cur.append(w)
    end = w['w'].rstrip('"”’\'')[-1:]
    if end in ('.', '?', '!', ':') or (end == ',' and len(cur) >= 4) or len(cur) >= 7: lines.append(cur); cur = []
if cur: lines.append(cur)
with open(sys.argv[2], 'w') as f:
    for i, ln in enumerate(lines, 1):
        a, b = T(ln[0]['s']), T(ln[-1]['e'])
        if i < len(lines): b = min(T(lines[i][0]['s']) - 0.02, b + 0.5)
        txt = ' '.join(w['w'] for w in ln)
        for x, y in FIX: txt = txt.replace(x, y)
        f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{txt}\n\n")
print(len(lines), 'lines ->', sys.argv[2])
