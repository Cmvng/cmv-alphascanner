"""Subtitles for the Bagel edit: the captions, already in output time, without the colour marks.
  python3 -I srt.py <work dir> <out.srt>"""
import json, sys
K, OUT = sys.argv[1:3]
caps = json.load(open(f'{K}/plan.json'))['caps']
def ts(x):
    ms = int(round(x * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
with open(OUT, 'w') as f:
    for i, c in enumerate(caps, 1):
        b = min(c['o1'], caps[i]['o0']) if i < len(caps) else c['o1']
        f.write(f"{i}\n{ts(c['o0'])} --> {ts(b)}\n{c['t'].replace('*', '')}\n\n")
print(len(caps), 'cues')
