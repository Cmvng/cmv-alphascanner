"""Shared helpers for plans written against a narrator take (the tactical board and the 3D stage):
  C = Cues(words)        words = [{"s","e","w"}] from script_words.py
  C.S('phrase'), C.E('phrase', nth)   start / end time of a phrase, matched on whole words; warns if it crosses a
                                      sentence end the phrase itself doesn't have (a cue once matched "over. Chelsea"),
                                      and if it is said more than once and no nth was given
  captions(words, key=set(), fix={})  caption lines split by phrase, [[start, end, html], ...]"""
import re

class Cues:
    def __init__(self, W):
        self.W = W; self.norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower()); self.C = ''; self.own = []; self.seen = set()
        for i, w in enumerate(W):
            n = self.norm(w['w']); self.C += n; self.own += [i] * len(n)
    def at(self, phrase, nth=0, edge='start'):
        W, C, own = self.W, self.C, self.own; P = self.norm(phrase); pos = 0
        while True:
            k = C.find(P, pos)
            if k < 0: raise SystemExit(f'phrase not found: {phrase!r}')
            a, b = own[k], own[k + len(P) - 1]
            if (k == 0 or own[k - 1] != a) and (k + len(P) == len(C) or own[k + len(P)] != b):
                if nth == 0:
                    if len(re.findall(r'[.?!]', phrase.rstrip('.?!”" '))) < sum(bool(re.search(r'[.?!]["”]?$', W[j]['w'])) for j in range(a, b)):
                        print(f'WARNING cue crosses a sentence end: {phrase!r} -> ' + ' '.join(W[j]['w'] for j in range(a, b + 1)))
                    return round(W[a]['s'] if edge == 'start' else W[b]['e'], 3)
                nth -= 1
            pos = k + 1
    def count(self, phrase):
        C, own, P, n, pos = self.C, self.own, self.norm(phrase), 0, 0
        while (k := C.find(P, pos)) >= 0:
            n += (k == 0 or own[k - 1] != own[k]) and (k + len(P) == len(C) or own[k + len(P)] != own[k + len(P) - 1]); pos = k + 1
        return n
    def pick(self, p, n, edge):            # no nth given and the phrase is said more than once: say so (a cue once took "one" from "for one yes or no")
        if n is None:
            if p not in self.seen and self.count(p) > 1: print(f'WARNING cue said {self.count(p)} times, using the first: {p!r} (pass nth, or a longer phrase)')
            self.seen.add(p); n = 0
        return self.at(p, n, edge)
    def S(self, p, n=None): return self.pick(p, n, 'start')
    def E(self, p, n=None): return self.pick(p, n, 'end')

SMALL = {'a', 'an', 'the', 'in', 'of', 'to', 'and', 'on', 'from', 'at', 'for', 'with', 'but', 'his', 'their', 'one', 'as',
         'by', 'he', 'it', 'is', 'was', 'that', 'up', 'le', 'him', 'into', 'than', 'between', 'about', 'or', 'your', 'its', 'you'}
def captions(W, key=(), fix=None, maxc=50):
    end_of = lambda w: w['w'].rstrip('"”’\'')[-1:]
    text_of = lambda ws: ' '.join(w['w'] for w in ws)
    def split_line(ws):
        if len(text_of(ws)) <= maxc or len(ws) < 4: return [ws]
        best = None
        for k in range(2, len(ws) - 1):
            L, R = ws[:k], ws[k:]
            sc = abs(len(text_of(L)) - len(text_of(R))) / 6
            if end_of(L[-1]) in (',', ';'): sc -= 7
            elif re.sub(r'[^a-z]', '', L[-1]['w'].lower()) in SMALL: sc += 9
            sc -= min(R[0]['s'] - L[-1]['e'], .4) * 8          # a pause is a natural break
            if L[-1]['w'][:1].isupper() and R[0]['w'][:1].isupper() and end_of(L[-1]) not in (',', '.', ':'): sc += 9   # a name
            if R[0]['w'] == 'and' and len(R) > 1 and L[-1]['w'][:1].isupper() and R[1]['w'][:1].isupper(): sc += 6
            if best is None or sc < best[0]: best = (sc, k)
        k = best[1]; return split_line(ws[:k]) + split_line(ws[k:])
    lines, sent = [], []
    for w in W:
        sent.append(w)
        if end_of(w) in ('.', '?', '!', ':'): lines += split_line(sent); sent = []
    if sent: lines += split_line(sent)
    caps = []
    for ln in lines:
        txt = ' '.join(f"<b>{w['w']}</b>" if w['w'] in key or w['w'].rstrip('.,:;!?"”') in key else w['w'] for w in ln)
        for a, b in (fix or {}).items(): txt = txt.replace(a, b)
        caps.append([round(ln[0]['s'], 2), round(ln[-1]['e'], 2), txt])
    for i in range(len(caps) - 1): caps[i][1] = round(min(caps[i + 1][0] - .02, caps[i][1] + .5), 2)
    return caps
