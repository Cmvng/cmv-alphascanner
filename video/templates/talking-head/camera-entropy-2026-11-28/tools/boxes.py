"""Ring boxes for the spoken words on each capture, from the word boxes the capture tools saved (DOM text, so exact).
  python3 -I boxes.py <cap dir> <out boxes.js>
BOXES[name][phrase] = [[x0, y0, x1, y1], ...] in the PNG's own pixels, one box per line the phrase runs over."""
import json, re, sys
C, OUT = sys.argv[1], sys.argv[2]
WANT = {
 'posts/athaya': ['6 tiers (Starter to Mythic) from $10 to $2,500 based on volume milestones', 'Trading Rewards', 'Creator Grants - $2,500 weekly pool', '(currently live for Partners in testing).'],
 'posts/launch': ['We are releasing the first liquid way to trade Anthropic.', "We’ve raised $14M led by Ribbit Capital"],
 'posts/grants': ['Get rewarded for building the Entropy community.', 'Creator Grants credited directly to your Entropy account.', 'discord.gg/entropyio'],
 'posts/aman': ['ENTROPY IS BUILDING A NEW WAY TO TRADE REAL WORLD ASSETS.'],
 'posts/feed': ['Post your thesis.', 'Introducing the Entropy Social Feed.'],
 'posts/redstone': ['HIP-3 perp markets for Anthropic\'s pre-IPO equity along with SNDK.'],
 'pages/markets': ['Stocks', 'Crypto', 'Market heatmap', 'Markets'],
 'pages/home': ['Long', 'Short', 'Anthropic', 'Trade'],
 'pages/discord': ['entropy.io', 'Members'],
 'pages/feed': ['Feed'],
}
norm = lambda s: re.sub(r'[^0-9a-z$%,.()-]', '', s.lower().replace('’', "'"))
B = {}
for name, phrases in WANT.items():
    d = json.load(open(f'{C}/{name}.words.json')); k = d['scale']; ws = d['words']
    B[name.split('/')[1] + ('P' if name.startswith('pages') else '')] = out = {}
    for ph in phrases:
        toks = [norm(t) for t in ph.split()]
        hit = None
        for i in range(len(ws)):
            if all(i + j < len(ws) and norm(ws[i + j][0]) == toks[j] for j in range(len(toks))): hit = ws[i:i + len(toks)]; break
        if not hit:
            # a token may be split or joined differently: match on the joined text
            flat = ''.join(norm(w[0]) for w in ws); tgt = ''.join(toks); p = flat.find(tgt)
            if p >= 0:
                acc, i0 = 0, None; sel = []
                for w in ws:
                    n = len(norm(w[0]))
                    if acc + n > p and acc < p + len(tgt): sel.append(w)
                    acc += n
                hit = sel
        if not hit: print('NOT FOUND', name, ph); continue
        lines = []
        for w in hit:
            if lines and abs(w[2] - lines[-1][1]) < 6: L = lines[-1]; L[0] = min(L[0], w[1]); L[2] = max(L[2], w[3]); L[3] = max(L[3], w[4]); L[1] = min(L[1], w[2])
            else: lines.append([w[1], w[2], w[3], w[4]])
        out[ph] = [[round(v * k, 1) for v in L] for L in lines]
        print(name, '|', ph[:40], '|', out[ph])
open(OUT, 'w').write('window.BOXES = ' + json.dumps(B) + '\n')
