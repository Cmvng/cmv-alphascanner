# the two clean-cut specs (main on template 1, short on template 4)
import json, sys
G, D = sys.argv[1], sys.argv[2]  # python3 specs.py <gamdom dir> <out dir>
HOOK = '<div class="a">Drawing the Gamdom castle</div><div class="b">SESSION 01</div>'
# main: template 1 speech, chunked like the template's own captions
W = json.load(open(f'{G}/cut01b/aud/words_t1.json'))
CH = [(0,3),(4,7),(8,12),(13,14),(15,18),(19,28),(29,30),(31,36),(37,41),(42,47),(48,59),(60,65),(66,73),(74,78),(79,85),(86,89),(90,94)]
ons = [W[a]['s'] - 0.05 for a, b in CH]
text = [{'t0': 0.15, 't1': 34.5, 'html': HOOK, 'pos': 'hook', 'fade': 0.3}]
for i, (a, b) in enumerate(CH):
    t1 = min(ons[i + 1] - 0.02 if i + 1 < len(CH) else 33.3, W[b]['e'] + 0.6) if i + 1 < len(CH) else 33.3
    text.append({'t0': max(0, round(ons[i], 3)), 't1': round(t1, 3), 'html': ' '.join(w['w'] for w in W[a:b + 1]), 'pos': 'cap'})
text.append({'t0': 33.35, 't1': 34.5, 'html': '#Gamdom100kRound2', 'pos': 'tag', 'fade': 0.15})
main = {'total': 34.5, 'audio': f'{G}/cut01b/aud/t1.wav', 'audio_fade': [33.25, 0.3], 'text': text, 'segments': [
    {'t0': 0.00, 't1': 6.87, 'src': [0.000, 6.967]},
    {'t0': 6.87, 't1': 10.60, 'src': [6.967, 10.000]},
    {'t0': 10.60, 't1': 15.40, 'src': [10.000, 14.333]},
    {'t0': 15.40, 't1': 18.70, 'src': [14.333, 17.300]},
    {'t0': 18.70, 't1': 31.50, 'src': [17.300, 26.800]},
    {'t0': 31.50, 't1': 34.50, 'hold': 26.76},
]}
json.dump(main, open(f'{D}/spec_main.json', 'w'), indent=1)
# short: template 4 speech, in that template's style (lines on black, footage on the track's hits)
short = {'total': 15.4, 'audio': f'{G}/cut01b/aud/t4.wav', 'audio_fade': [14.75, 0.3], 'segments': [
    {'t0': 0.00, 't1': 2.20}, {'t0': 2.20, 't1': 2.76, 'src': [4.20, 4.76]},
    {'t0': 2.76, 't1': 4.40}, {'t0': 4.40, 't1': 4.86, 'src': [6.70, 7.16]},
    {'t0': 4.86, 't1': 6.80}, {'t0': 6.80, 't1': 7.22, 'src': [9.95, 10.37]},
    {'t0': 7.22, 't1': 9.90},
    {'t0': 9.90, 't1': 11.80, 'src': [13.0, 14.9]}, {'t0': 11.80, 't1': 12.60, 'src': [17.3, 18.1]},
    {'t0': 12.60, 't1': 13.30, 'src': [20.0, 20.7]}, {'t0': 13.30, 't1': 14.00, 'src': [23.0, 23.7]},
    {'t0': 14.00, 't1': 15.40, 'src': [25.4, 26.8]},
], 'text': [
    {'t0': 0.02, 't1': 2.18, 'html': 'I am not like everybody else.', 'pos': 'card'},
    {'t0': 2.78, 't1': 4.38, 'html': 'I don&rsquo;t want to be<br>like everybody else.', 'pos': 'card'},
    {'t0': 4.88, 't1': 6.08, 'html': 'I have something inside', 'pos': 'card'},
    {'t0': 6.12, 't1': 6.78, 'html': 'burning.', 'pos': 'card'},
    {'t0': 7.24, 't1': 8.48, 'html': 'I&rsquo;m supposed to be', 'pos': 'card'},
    {'t0': 8.52, 't1': 9.88, 'html': 'something different.', 'pos': 'card'},
    {'t0': 9.90, 't1': 15.4, 'html': HOOK, 'pos': 'hook', 'fade': 0.2},
    {'t0': 10.09, 't1': 12.4, 'html': 'I have to be something different.', 'pos': 'cap'},
    {'t0': 14.20, 't1': 15.4, 'html': '#Gamdom100kRound2', 'pos': 'tag', 'fade': 0.15},
]}
json.dump(short, open(f'{D}/spec_short.json', 'w'), indent=1)
for x in main['text']: print(f"{x['t0']:6.2f} {x['t1']:6.2f} {x['pos']:5} {x['html'][:70]}")
