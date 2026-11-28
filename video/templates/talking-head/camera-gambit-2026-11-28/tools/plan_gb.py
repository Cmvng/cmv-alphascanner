"""The plan for the owner's 28 Nov Gambit recording: NO cuts (the take to 94.4 s, as they made it; CapCut's outro after
it is left out), the captions in their words, their word times, and where they look at their screen.
  python3 -I plan_gb.py <work dir>   reads words.json (CTC-aligned), writes plan.json, plan.js, segs.json"""
import json, sys
K = sys.argv[1]
W = json.load(open(f'{K}/words.json'))
FPS, END, ENDCARD = 30, 2832 / 30, 4.0
CAPS = [(0, 5, "I want to showcase to you"), (6, 9, "an *opportunity* on *Gambit*"), (10, 17, "that I don't think I have mentioned yet."),
 (18, 24, "On Gambit, you can earn *$250*"), (25, 29, "weekly in *cash giveaway* if"), (30, 39, "you make the *top of the leaderboard* for your agent."),
 (40, 46, "If your agent is *profitable* and is"), (47, 51, "the *highest* on the leaderboard"), (52, 56, "in terms of *P&L,*"),
 (57, 64, "you have the chance to earn *$250.*"), (65, 69, "On the website, I think"), (70, 75, "it's for the *top-ranked agents,*"),
 (76, 80, "which is only *one winner.*"), (81, 91, "Your agent can be *automated* or you can do it *manually.*"),
 (92, 98, "You can make your agent be *manual,*"), (99, 106, "which means you can take your picks *manually.*"),
 (107, 112, "On Gambit's prediction market, which is on *Robinhood,*"), (113, 119, "it's a layout of *Kalshi* and *Polymarket,*"),
 (120, 126, "which means they are available in liquidity markets."), (127, 135, "You can be able to trade that on *Gambit.*"),
 (136, 146, "If you think that your way to *rank up the leaderboard*"), (147, 150, "is through your combo picks,"),
 (151, 157, "you can make your *combo picks* on Gambit."), (158, 164, "If your agent, either *manual* or *automated,*"),
 (165, 168, "*ranks up* the leaderboard,"), (169, 176, "then you are eligible to get *$250*"), (177, 184, "in *cash reward* and also some *Gambit points.*"),
 (185, 190, "This is one thing I need"), (191, 196, "you to know for today's video.")]
assert CAPS[0][0] == 0 and CAPS[-1][1] == len(W) - 1 and all(CAPS[i][1] + 1 == CAPS[i + 1][0] for i in range(len(CAPS) - 1)), 'captions must cover every word once'
words = [{'w': w['w'], 's': round(w['s'], 3), 'e': round(w['e'], 3)} for w in W]
caps = [{'a': a, 'b': b, 'o0': words[a]['s'], 'o1': words[b]['e'], 't': t} for a, b, t in CAPS]
# where they look down at their screen (faces checked by eye once a second): 21.5-25.8, 29, 32, 38-94.4; joined under 6 s
# into one stretch, its start moved out to the middle of the pause before "If" (word 40). From there to the end the
# video is a screen recording of Gambit's real app; their face is shown only from 0 to that point.
gaps = [((words[i]['e'] + words[i + 1]['s']) / 2, words[i]['e'], words[i + 1]['s']) for i in range(len(words) - 1) if words[i + 1]['s'] - words[i]['e'] >= .1]
a = max(g[0] for g in gaps if g[0] <= words[40]['s'] + .01)
SCR = [[round(a, 3), END]]
plan = {'fps': FPS, 'flip': False, 'end': END, 'endcard': ENDCARD, 'total': END + ENDCARD, 'pieces': [{'s': 0, 'e': END, 'o': 0}], 'removed': [],
        'words': words, 'caps': caps, 'wt': [w['s'] for w in words], 'we': [w['e'] for w in words], 'screen': SCR}
json.dump(plan, open(f'{K}/plan.json', 'w')); json.dump([{'s': 0, 'e': END}], open(f'{K}/segs.json', 'w'))
open(f'{K}/plan.js', 'w').write('window.PLAN = ' + json.dumps(plan) + '\n')
print(len(words), 'words', len(caps), 'captions; end', round(END, 3), 'total', round(END + ENDCARD, 3), 'screen', SCR)
