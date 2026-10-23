"""Full subtitles (every spoken line, graphics included) for the Kane edit."""
import json, sys
K, OUT = sys.argv[1:3]
plan = json.load(open(f'{K}/plan.json')); pieces = plan['pieces']
def T(t):
    for p in pieces:
        if p['s'] <= t <= p['e']: return p['o'] + t - p['s']
    return min(((abs(t - p['s']), p['o']) for p in pieces) + [(abs(t - p['e']), p['o'] + p['e'] - p['s']) for p in pieces])[1]
G = [  # spoken lines under the full-screen graphics (source seconds)
 (4.27, 8.47, 'Currently, he has about 77% chance'), (8.73, 12.23, "of winning the Ballon d'Or, ahead of Lamine Yamal"),
 (12.31, 13.85, 'and Kylian Mbappé,'), (14.16, 16.51, 'and on the outside, Lionel Messi.'),
 (17.84, 20.31, 'Previously, I think a couple of weeks ago,'), (20.56, 26.42, 'Lamine Yamal… the distance between both of them was not really much.'),
 (68.62, 73.42, 'And this season, he has 73 goals in 65 games.'), (73.55, 75.77, 'And when you actually weigh him against'),
 (81.23, 84.90, 'He can give a pass, he can give an assist,'), (85.16, 87.38, 'he can score,'),
 (87.54, 90.53, 'he can play in defence, he can play in midfield, he can play in attack.'),
 (128.38, 130.94, "And the Ballon d'Or comes up on Monday night,"), (130.94, 134.57, 'and I just believe he wins it on Monday night.'),
 (134.83, 137.46, 'And funny enough, it actually happens in London.'),
]
cues = [(c['o0'], c['o1'], c['t']) for c in plan['caps']] + [(T(a), T(b), t) for a, b, t in G]
cues.sort()
def ts(x):
    ms = int(round(x * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
with open(OUT, 'w') as f:
    for i, (a, b, t) in enumerate(cues, 1):
        b = min(b, cues[i][0]) if i < len(cues) else b
        f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{t}\n\n')
print(len(cues), 'cues')
