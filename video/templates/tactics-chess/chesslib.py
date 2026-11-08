"""Helpers for a chessboard plan generator: phrase lookups over the take's script-word times, captions, pieces, and
writing page/plan.js + page/words.js for page/chess.html (all times in take seconds)."""
import json, re, unicodedata

norm = lambda s: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())


class Take:
    def __init__(self, path):
        self.W = [dict(w, e=max(w['e'], w['s'] + 0.04)) for w in json.load(open(path))]   # every script word stays (captions)
        self.C, self.own = '', []
        for i, w in enumerate(self.W):
            n = norm(w['w']); self.C += n; self.own += [i] * len(n)

    def at(self, phrase, nth=0, edge='start'):
        P, pos, C, own = norm(phrase), 0, self.C, self.own
        while True:
            k = C.find(P, pos)
            if k < 0: raise SystemExit(f'phrase not found: {phrase!r}')
            a, b = own[k], own[k + len(P) - 1]
            if (k == 0 or own[k - 1] != a) and (k + len(P) == len(C) or own[k + len(P)] != b):   # whole words only
                if nth == 0: return round(self.W[a]['s'] if edge == 'start' else self.W[b]['e'], 3)
                nth -= 1
            pos = k + 1

    def S(self, p, n=0): return self.at(p, n, 'start')
    def E(self, p, n=0): return self.at(p, n, 'end')

    FIX = {'twonil': '2-0', 'twoone': '2-1', 'threeone': '3-1'}   # spoken scores shown as digits

    def caps(self, key=(), maxw=7):
        caps, cur = [], []
        def show(w):
            t = re.sub(r"^([\w-]+)", lambda m: self.FIX.get(norm(m.group(1)), m.group(1)), w)
            return f'<b>{t}</b>' if norm(w) in key or re.search(r'\d', t) else t
        def flush():
            if cur: caps.append([round(cur[0]['s'], 2), round(cur[-1]['e'], 2), ' '.join(show(w['w']) for w in cur)])
            cur.clear()
        for w in self.W:
            cur.append(w)
            if w['w'][-1] in '.?!:' or (w['w'][-1] == ',' and len(cur) >= 3) or len(cur) >= maxw: flush()
        flush()
        for i in range(len(caps) - 1): caps[i][1] = round(min(caps[i + 1][0] - 0.02, caps[i][1] + 0.6), 2)
        return caps


def piece(pid, team, role, label, keys, on=None, hi=None, lab=None):
    p = {'id': pid, 'team': team, 'role': role, 'label': label, 'keys': [[round(k[0], 3)] + list(k[1:]) for k in keys]}
    if lab is not None: p['lab'] = [[round(a, 3), round(b, 3)] for a, b in lab]   # when the name shows (default: PLAN.names)
    if on: p['on'] = [round(on[0], 3), round(on[1], 3)]
    if hi: p['hi'] = [[round(a, 3), round(b, 3)] for a, b in hi]
    return p


def handoffs(panels, lead=.4):
    """A card that ends as another starts clears first (no two cards cross-fading over each other)."""
    for A in panels:
        for B in panels:
            if A is not B and A['t0'] < B['t0'] - .5 and abs(A['t1'] - B['t0']) < .45:
                A['t1'] = round(max(A['t0'] + .3, min(A['t1'], B['t0'] - lead)), 3)


def write(plan, out_dir, take, anchors=None):
    handoffs(plan.get('panels', []))
    js = json.dumps(plan, indent=1, ensure_ascii=False)
    for k, v in (anchors or {}).items(): js = js.replace(f'"ANCHOR": "{k}"', f'"anchor": {v}')
    open(f'{out_dir}/plan.js', 'w').write('// generated (take seconds; the page maps to video time)\nwindow.PLAN = ' + js + '\n')
    open(f'{out_dir}/words.js', 'w').write('window.WORDS = ' + json.dumps([[round(w['s'], 3), round(w['e'], 3), w['w']] for w in take.W], ensure_ascii=False) + '\n')
