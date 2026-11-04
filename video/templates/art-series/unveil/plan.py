"""The unveil cut's timeline, fitted to the soundtrack's beats and drop.
python3 -I plan.py <config.json> <beats.json> <out plan.json>

The story (the owner's concept, 4 Nov):
  hook   0 → ~2.2 s   the strongest process shot, full screen, with the "by hand, no AI" chip
  open   → ~4.6 s     one-word lines on black ("They knocked it down." …)
  build  → drop-0.7   the video wall: the finished piece veiled in the centre, the progress clips cut on the beat in
                      the side panels (in session order), short lines over the veil; the veil clears a little each session
  drop   ±1.6 s       the panels fly into the centre and break into a photomosaic of the progress frames that forms the
                      castle; a negative frame on the drop; the mosaic turns into the real photo; the piece fills the frame
  hero   → end-5      the title, then a beat-cut montage: details of the piece, the artist with it, the whole journey
                      rushed in a second ("From a blank page" → "To this.")
  end    last ~5 s    the artist beside the piece, then the end card
Every cut lands on a beat (or a hit); the config can pin anything by hand."""
import json, sys
cfg = json.load(open(sys.argv[1])); B = json.load(open(sys.argv[2])); OUT = sys.argv[3]
FPS = 30
off = cfg.get('track_in', 0.0)                                   # video t = track t - off
beats = [b - off for b in B['beats'] if b - off > 0.2]
hits = [h - off for h in B['hits'] if h - off > 0.2]
drop = cfg.get('drop', B['drop'] - off)
P = B['period']
near = lambda t, pool=None: min(pool or beats, key=lambda b: abs(b - t))
after = lambda t: next((b for b in beats if b >= t - 1e-3), t)
clips = cfg['clips']                                             # id -> {dur, orient}
plan = {'fps': FPS, 'W': 1920, 'H': 1080, 'drop': round(drop, 3), 'period': P, 'art': cfg['art'], 'art_wh': cfg['art_wh'],
        'handle': cfg.get('handle', ''), 'tag': cfg.get('tag', '#Gamdom100kRound2'), 'segs': [], 'text': [], 'tiles': cfg.get('tiles')}
seg = lambda **k: plan['segs'].append(k)
# ---- hook and open
h1 = near(cfg.get('hook_len', 2.2))
hk = cfg['hook']
seg(slot='full', clip=hk['clip'], t0=0.0, t1=round(h1, 3), src=hk['from'], speed=hk.get('speed', 1.0), focus=hk.get('focus', [.5, .5]), kind='hook')
plan['text'].append({'k': 'chip', 't0': 0.15, 't1': round(h1, 3), 'text': cfg.get('chip', 'Charcoal on paper · by hand · no AI')})
o1 = near(cfg.get('open_len', 4.8) + h1 - 2.2)
words = cfg.get('open_words', ['They', 'knocked', 'it', 'down.'])
step = (o1 - h1) / len(words)
for i, w in enumerate(words):
    a = h1 + i * step
    plan['text'].append({'k': 'word', 't0': round(a, 3), 't1': round(a + step, 3), 'text': w})
# ---- build: the wall
b0, b1 = o1, drop - cfg.get('fly', 0.7)
plan['build'] = [round(b0, 3), round(b1, 3)]
bb = [b for b in beats if b0 - 1e-3 <= b < b1 - P * .5]
cuts = bb[::cfg.get('beats_per_cut', 2)]                          # one panel cut every N beats, left and right alternating
order = cfg['build_clips']                                        # [{clip, label, from, to}] in session order
# share the cuts out over the clips in order (by how much footage each has), each side taking the next range
total = sum((c.get('to', clips[c['clip']]['dur']) - c.get('from', 0)) for c in order)
n_cuts = len(cuts)
alloc, acc = [], 0.0
for c in order:
    d = c.get('to', clips[c['clip']]['dur']) - c.get('from', 0)
    alloc.append(d / total)
bounds, s = [], 0
for i, a in enumerate(alloc):
    k = max(1, round(a * n_cuts)) if i < len(alloc) - 1 else n_cuts - s
    bounds.append((s, s + k)); s += k
side_end = {'L': b0, 'R': b0}
for ci, (c, (i0, i1)) in enumerate(zip(order, bounds)):
    n = max(1, i1 - i0)
    a0, a1 = c.get('from', 0.0), c.get('to', clips[c['clip']]['dur'])
    for j in range(i0, min(i1, n_cuts)):
        slot = 'L' if j % 2 == 0 else 'R'
        t0 = cuts[j]; t1 = cuts[j + 2] if j + 2 < n_cuts else b1      # each panel holds until its next cut
        frac0 = (j - i0) / n
        span = (t1 - t0) * c.get('speed', 1.0)
        src = a0 + (a1 - a0 - span) * frac0 if a1 - a0 > span else a0
        seg(slot=slot, clip=c['clip'], t0=round(t0, 3), t1=round(t1, 3), src=round(max(a0, src), 3), speed=c.get('speed', 1.0),
            focus=c.get('focus', [.5, .5]), label=c.get('label', ''), kind='panel')
# the right panel opens with the wall too: a short first shot from the first clip, until its first cut
firstR = next((x for x in plan['segs'] if x['slot'] == 'R'), None)
if firstR and firstR['t0'] > b0 + 1e-3:
    c = order[0]; a0, a1 = c.get('from', 0.0), c.get('to', clips[c['clip']]['dur'])
    plan['segs'].append(dict(slot='R', clip=c['clip'], t0=round(b0, 3), t1=firstR['t0'], src=round(a0 + (a1 - a0) * .55, 3), speed=c.get('speed', 1.0),
                             focus=c.get('focus', [.5, .5]), label=c.get('label', ''), kind='panel'))
lines = cfg.get('lines', [])
if lines:
    lb = [b for b in bb if b > b0 + P]
    stepn = max(1, len(lb) // len(lines))
    for i, ln in enumerate(lines):
        a = lb[min(len(lb) - 1, i * stepn)]; z = lb[min(len(lb) - 1, (i + 1) * stepn)] - .1 if i < len(lines) - 1 else b1 - .05
        plan['text'].append({'k': 'line', 't0': round(a, 3), 't1': round(z, 3), 'text': ln})
# ---- drop
plan['fly'] = [round(b1, 3), round(drop, 3)]
plan['wave'] = [round(drop + .12, 3), round(drop + cfg.get('wave', 1.0), 3)]
plan['grow'] = [round(drop + .8, 3), round(drop + 1.6, 3)]
t_title = after(drop + 1.55)
t_hero = after(t_title + cfg.get('title_len', 2.0))
plan['text'].append({'k': 'title', 't0': round(t_title, 3), 't1': round(t_hero, 3), 'text': cfg.get('title', 'Must fight back'),
                     'glitch': [round(b, 3) for b in beats if t_title - 1e-3 <= b < t_hero]})
plan['art_full'] = [round(drop + 1.6, 3), round(t_hero, 3)]
# ---- hero montage on the beat, then the end
end_len = cfg.get('end_len', 5.0)
total = cfg.get('total') or round(near(t_hero + cfg.get('hero_len', 16.0)) + end_len, 3)
e0 = near(total - end_len)
hbeats = [b for b in beats if t_hero - 1e-3 <= b < e0 - P * .5]
items = cfg['hero']                                              # [{kind: art|clip|rush, beats, line}] in order; then the plain ones again
again = [it for it in items if it['kind'] != 'rush' and not it.get('line')] or items
hb, k, n = [], 0, 0
while k < len(hbeats):
    it = items[n] if n < len(items) else again[(n - len(items)) % len(again)]
    hb.append((hbeats[k], it)); k += it.get('beats', cfg.get('hero_beats_per_cut', 2)); n += 1
bounds = [x[0] for x in hb] + [e0]
for i, ((a, it), z) in enumerate(zip(hb, bounds[1:])):
    if it['kind'] == 'art':
        seg(slot='artcrop', t0=round(a, 3), t1=round(z, 3), crop0=it['crop0'], crop1=it['crop1'], kind='hero')
    else:
        seg(slot='full', clip=it['clip'], t0=round(a, 3), t1=round(z, 3), src=it.get('from', 0.0),
            speed=it.get('speed', 1.0) if it['kind'] == 'clip' else (it.get('to', clips[it['clip']]['dur']) - it.get('from', 0)) / (z - a),
            focus=it.get('focus', [.5, .5]), kind='rush' if it['kind'] == 'rush' else 'hero')
    if it.get('line'): plan['text'].append({'k': 'line2', 't0': round(a + .05, 3), 't1': round(z - .02, 3), 'text': it['line']})
ec = cfg['end_clip']
seg(slot='full', clip=ec['clip'], t0=round(e0, 3), t1=round(total, 3), src=ec.get('from', 0.0), speed=ec.get('speed', 1.0), focus=ec.get('focus', [.5, .5]), kind='end')
plan['text'].append({'k': 'end', 't0': round(max(e0 + 1.2, total - cfg.get('card_len', 2.6)), 3), 't1': round(total, 3), 'text': plan['tag'], 'sub': cfg.get('sub', '18+ | Gamble responsibly'), 'handle': plan['handle']})
plan['total'] = total
plan['audio'] = {'src': cfg['track'], 'in': off, 'fade': [round(total - 1.4, 3), 1.4]}
json.dump(plan, open(OUT, 'w'), indent=1)
print(f'total {total:.2f} s; hook→{h1:.2f}; open→{o1:.2f}; build {b0:.2f}–{b1:.2f} ({len(cuts)} panel cuts); drop {drop:.2f}; title {t_title:.2f}; hero {t_hero:.2f}–{e0:.2f} ({len(hb)} cuts); end {e0:.2f}')
