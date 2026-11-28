"""The plan for the owner's 28 Nov Entropy recording: NO cuts (the whole take to 288.03 s, as they made it; only CapCut's outro after it is left out), the captions
in their words, their word times, and the stretches where they look at their screen (their face is not shown there).
  python3 -I plan_en.py <work dir>   reads words.json (CTC-aligned), writes plan.json, plan.js, segs.json
The take is a phone export at 30 frames a second, not mirrored."""
import json, sys
K = sys.argv[1]
W = json.load(open(f'{K}/words.json'))
FPS, END, ENDCARD = 30, 8641 / 30, 4.0      # the take ends at 288.033 s; CapCut's black outro after it is left out
CAPS = [(0, 5, "All right, so in today's video,"), (6, 11, "I'm going to be talking about *Entropy.*"), (12, 18, "I think, I think two days ago,"),
 (19, 23, "I gave a breakdown about"), (24, 28, "how the exchange looks like,"), (29, 33, "how to, like, navigate it."),
 (34, 42, "Like, it's more or less like a *trading platform.*"), (43, 52, "More or less, you can call it like a *perp DEX.*"),
 (53, 59, "Anyways bro, like a trading platform whereby"), (60, 67, "you can trade *stocks,* *pre-IPOs,* um, IPOs,"),
 (68, 71, "some *crypto perps,* some *forex perps*"), (72, 76, "and other things like that."), (77, 85, "Like, I also explained in the last video about,"),
 (86, 93, "um, I think what I said was like"), (94, 101, "the *simple mode,* was it the simple mode,"), (102, 110, "so how cool it was and everything like that."),
 (111, 120, "But in today's video, I'm going to be talking about"), (121, 126, "the *new program* that was launched."),
 (127, 137, "More or less, like, you can actually basically *earn up to*"), (138, 145, "*$2,500* by generating *volume* on the platform."),
 (146, 153, "So let me break it down to you."), (154, 164, "So more or less, like, the *team launched* a new program"),
 (165, 173, "on the platform, called, like, a new trade,"), (174, 182, "like a *new opportunity* to actually, like, *trade volume.*"),
 (183, 190, "So basically, like, it has like *several plans.*"), (191, 201, "It has the *Starter* plan, the *Bronze* plan, the *Silver* plan,"),
 (202, 211, "the *Gold* plan, the *Diamond* plan and the *Mythic* plan."), (212, 223, "Basically, on the Starter plan, if you actually trade *$10,000,*"),
 (224, 229, "you actually earn, like, *$10.*"), (230, 239, "And that's if you actually go to the *Bronze* plan:"),
 (240, 246, "if you actually trade *$50,000,*"), (247, 251, "you actually earn *$20.*"), (252, 259, "On the *Silver* plan, you earn *$100,*"),
 (260, 267, "which is about *$250,000* in trading volume."), (268, 274, "On the *Gold* plan, you earn *$750*"),
 (275, 285, "if you can actually successfully trade *$3 million* in volume."), (286, 295, "On the *Diamond* plan, if you can actually trade from"),
 (296, 304, "*$6 million to $10 million* in trading volume,"), (305, 313, "you are eligible to actually get *$1,500* in rewards."),
 (314, 324, "Then on the *Mythic* plan, which is actually for *top whales,*"), (325, 337, "if you can actually trade *$10 million* to actually *$100 million,*"),
 (338, 347, "you actually are eligible to actually get *$2,500* in rewards."), (348, 357, "I don't think there's any platform, any *perp DEX* platform"),
 (358, 366, "that actually offers this right now in the markets."), (367, 376, "So basically, like, the Starter plan puts you in *Tier 1,*"),
 (377, 385, "the Bronze, the Bronze plan and the Silver plan"), (386, 391, "puts you in, also in *Tier 1.*"),
 (392, 400, "The Gold and the Diamond: Gold is *Tier 2,*"), (401, 406, "Diamond is what's called *Tier 3,*"),
 (407, 413, "which is actually like, Diamond is actually"), (414, 425, "the one that gives you *$1,500* in rewards."),
 (426, 433, "The *Mythic* plan is actually in *Tier 4.*"), (434, 438, "So basically, like, you trade."), (439, 443, "I think the only platform"),
 (444, 450, "that I think I've seen this done,"), (451, 457, "I think it's only on…"), (458, 467, "but I don't think, like, it's *as juicy as this.*"),
 (468, 475, "I don't think it's as juicy as this."), (476, 484, "So basically, also they also have another program again,"),
 (485, 490, "like, they have another program again,"), (491, 495, "which you can benefit from,"), (496, 502, "and it's actually called the *Creator Program.*"),
 (503, 509, "But in this, in this program, basically,"), (510, 517, "you have to actually have the *Discord roles.*"),
 (518, 528, "Like, you have to have the *Entropy Voices* role on Discord."), (529, 535, "You have to have the *Entropy Council,*"),
 (536, 544, "you have to have the *Genesis badge* on Discord."), (545, 551, "And this gives you eligibility to qualify"),
 (552, 562, "for one… *$2,500* in *weekly rewards.*"), (563, 568, "So basically, like… basically, like,"),
 (569, 575, "you have the potential of actually earning"), (576, 579, "by being a *creator.*"), (580, 587, "But you have to first hold the *badge*"),
 (588, 592, "or the *role* on Discord."), (593, 599, "And basically, there are *different metrics* in"),
 (600, 610, "which you can actually be eligible to actually have these roles."), (611, 617, "Basically, like, once you have the roles,"),
 (618, 623, "you have to actually *make content*"), (624, 634, "specific to what they require from creators on a *weekly basis.*"),
 (635, 640, "So this is another method again:"), (641, 644, "*top 25 creators* weekly"), (645, 651, "get eligible to actually get benefit from"),
 (652, 655, "*$2,500* in *weekly rewards.*"), (656, 663, "And also, once you trade on the platform,"),
 (664, 672, "you know, you are also getting *bonuses,* like, bonuses."), (673, 676, "So basically… so basically,"),
 (677, 683, "*Entropy* is actually like *alpha* right now,"), (684, 690, "like, in a *bear market* like this,"),
 (691, 698, "you can actually make *passive income* doing this."), (699, 704, "You can set up your *bots,*"),
 (705, 713, "like, you can actually, like, go to *Grok,*"), (714, 718, "let's set up your *bots*"), (719, 725, "that can actually be *trading for you.*"),
 (726, 730, "Put your *strategy* in place,"), (731, 737, "or you can do it *manually* yourself"), (738, 742, "if you have the skill,"),
 (743, 751, "or you can use *delta neutral* with other platforms"), (752, 754, "and *generate volume,*"),
 (755, 768, "or you can make as much as *$2,500* from trading."), (769, 776, "So I hope this is something that actually"),
 (777, 780, "*excites you* this weekend."), (781, 786, "You can look into the *platform,*"), (787, 794, "you can look into the *opportunities* on Entropy"),
 (795, 799, "and feel good about it."), (800, 800, "*Peace.*")]
assert CAPS[0][0] == 0 and CAPS[-1][1] == len(W) - 1 and all(CAPS[i][1] + 1 == CAPS[i + 1][0] for i in range(len(CAPS) - 1)), 'captions must cover every word once'
words = [{'w': w['w'], 's': round(w['s'], 3), 'e': round(w['e'], 3)} for w in W]
caps = [{'a': a, 'b': b, 'o0': words[a]['s'], 'o1': words[b]['e'], 't': t} for a, b, t in CAPS]
# where they look down at their screen (MediaPipe gaze + eye on frames): their face is not shown there. Gaps under 6 s
# between two such stretches are joined (no flash of the face); each edge moves OUT to the middle of the nearest pause
# (an edge that already falls inside a pause stays in it, 0.1 s before the pause ends).
RAW = [[51.7, 60.5], [63.1, 100.0], [101.5, 104.2], [112.1, 116.9], [127.1, 137.4], [144.4, 149.5], [159.4, 163.0], [174.1, 182.4], [187.2, 191.5], [262.4, 265.9], [267.4, 273.7]]
J = []
for a, b in RAW:
    if J and a - J[-1][1] < 6: J[-1][1] = b
    else: J.append([a, b])
gaps = [((words[i]['e'] + words[i + 1]['s']) / 2, words[i]['e'], words[i + 1]['s']) for i in range(len(words) - 1) if words[i + 1]['s'] - words[i]['e'] >= .1]
SCR = []
for a, b in J:
    s = [g for g in gaps if a - 1.6 <= g[0] <= a]; e = [g for g in gaps if b <= g[0] <= b + 1.6]
    ins = [g for g in gaps if g[1] <= b <= g[2]]
    SCR.append([round(max(s)[0] if s else a, 3), round(min(ins[0][2] - .1, b + .4) if ins else (min(e)[0] if e else b), 3)])
plan = {'fps': FPS, 'flip': False, 'end': END, 'endcard': ENDCARD, 'total': END + ENDCARD, 'pieces': [{'s': 0, 'e': END, 'o': 0}], 'removed': [],
        'words': words, 'caps': caps, 'wt': [w['s'] for w in words], 'we': [w['e'] for w in words], 'screen': SCR}
json.dump(plan, open(f'{K}/plan.json', 'w')); json.dump([{'s': 0, 'e': END}], open(f'{K}/segs.json', 'w'))
open(f'{K}/plan.js', 'w').write('window.PLAN = ' + json.dumps(plan) + '\n')
print(len(words), 'words', len(caps), 'captions; end', round(END, 3), 'total', round(END + ENDCARD, 3))
for a, b in SCR:
    wi = [i for i, w in enumerate(words) if a <= w['s'] < b]
    print(f'screen {a:7.2f} - {b:7.2f} ({b - a:5.1f} s)  words {wi[0]}-{wi[-1]}: "{" ".join(words[i]["w"] for i in wi[:5])} … {" ".join(words[i]["w"] for i in wi[-4:])}"')
