"""The plan for the owner's 20 Nov Probly recording: NO cuts (the whole take, 92.78 s, as they made it), the captions
and their word times.   python3 -I plan_pb.py <work dir>   reads words.json (CTC-aligned), writes plan.json, plan.js, segs.json
The take is a phone export at 60 frames a second, not mirrored (the "USA" on the T-shirt reads the right way)."""
import json, sys
K = sys.argv[1]
W = json.load(open(f'{K}/words.json'))
FPS, END, ENDCARD = 60, 5567 / 60, 3.8
CAPS = [(0, 10, "Yeah, so in today's video, I'm going to be talking about"), (11, 17, "a *prediction market* called *Probly.* Like, Probly."),
 (18, 28, "So basically, on Probly, it does like any regular prediction market."), (29, 38, "You can predict *sports,* *politics,* any other thing on Probly."),
 (39, 46, "But the good thing about Probly is that"), (47, 53, "they give you the opportunity to actually"), (54, 60, "earn a *trading bonus* up to *$25.*"),
 (61, 68, "All you simply need to do is to"), (69, 76, "*predict and trade $50* worth of any market."), (77, 87, "So simply, like, you can also like deposit *$50 in crypto*"),
 (88, 96, "on *Solana,* from Solana, from *Base,* from *any chain.*"), (97, 103, "And so like, if it were me,"), (104, 113, "I would also put *$50 on Bayern Munich* to win"),
 (114, 122, "today, like *this evening,* in a couple of hours."), (123, 132, "And I will simply get *$25* worth of trading bonus,"),
 (133, 141, "because you have the opportunity to put that $50"), (142, 145, "in any *3 days,*"), (146, 153, "because it ends on the *24th of November.*"),
 (154, 161, "So when I actually like put that prediction"), (162, 168, "on *Bayern Munich* to win, they win,"), (169, 173, "I get *$25 in bonus.*"),
 (174, 184, "I use that *$25* to put it on *Arsenal* to win,"), (185, 192, "and then I win, win, and I *withdraw.*"), (193, 198, "And I'm happy and everybody's happy."),
 (199, 207, "So it's an opportunity to make use of this."), (208, 215, "Like, the *link is on this post* too."), (216, 223, "So basically, go to *Probly,* make your predictions,"),
 (224, 231, "make use of the *bonus* and be happy."), (232, 243, "At least the *weekend* is coming, so you can get some money"),
 (244, 252, "to buy some *burger,* *pizza,* maybe watch some *movies*"), (253, 261, "with your girl, your woman, your wife, and *smile.*")]
words = [{'w': w['w'], 's': round(w['s'], 3), 'e': round(w['e'], 3)} for w in W]
caps = [{'a': a, 'b': b, 'o0': words[a]['s'], 'o1': words[b]['e'], 't': t} for a, b, t in CAPS]
plan = {'fps': FPS, 'flip': False, 'end': END, 'endcard': ENDCARD, 'total': END + ENDCARD, 'pieces': [{'s': 0, 'e': END, 'o': 0}], 'removed': [],
        'words': words, 'caps': caps, 'wt': [w['s'] for w in words], 'we': [w['e'] for w in words]}
json.dump(plan, open(f'{K}/plan.json', 'w')); json.dump([{'s': 0, 'e': END}], open(f'{K}/segs.json', 'w'))
open(f'{K}/plan.js', 'w').write('window.PLAN = ' + json.dumps(plan) + '\n')
print(len(words), 'words', len(caps), 'captions; end', round(END, 3), 'total', round(END + ENDCARD, 3))
