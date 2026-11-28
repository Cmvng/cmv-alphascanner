"""Word-timed captions in the owner's sample style (bold white sans, centred on the chest, a few words at a time) and
the small "AI PARODY" tag, top left, for the whole video.
  python3 -I captions_ass.py <words.json> <out.ass> [W H] [--phrases phrases.txt]
  words.json: [{"w": "Sit", "s": 0.12, "e": 0.40}, ...]; phrases.txt: one caption per line, in order, its words the same
  as the words file's (the breaks set by hand, so a punchline is never shown before it is said)."""
import json, sys, re
args = [a for a in sys.argv[1:]]
PH = None
if '--phrases' in args: i = args.index('--phrases'); PH = args[i + 1]; del args[i:i + 2]
words = json.load(open(args[0])); out = args[1]
W, H = (int(args[2]), int(args[3])) if len(args) > 3 else (1080, 1920)
def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'
# chunks: break after sentence punctuation, after a comma once 2+ words, or at 3 words / 18 characters
chunks, cur = [], []
for w in words:
    cur.append(w); txt = ' '.join(x['w'] for x in cur)
    end_p = re.search(r'[.!?…]$', w['w']); comma = re.search(r'[,;:]$', w['w'])
    if end_p or (comma and len(cur) >= 2) or len(cur) >= 3 or len(txt) >= 18:
        chunks.append(cur); cur = []
if cur: chunks.append(cur)
if PH:
    lines = [l.strip() for l in open(PH, encoding='utf8') if l.strip()]
    chunks, k = [], 0
    norm = lambda x: re.sub(r'[^0-9a-z%-]', '', x.lower())
    for l in lines:
        n = len(l.split()); c = words[k:k + n]
        if [norm(x['w']) for x in c] != [norm(x) for x in l.split()]: sys.exit(f'phrase does not match the words: {l!r} vs {[x["w"] for x in c]}')
        for x, t in zip(c, l.split()): x['w'] = t
        chunks.append(c); k += n
    if k != len(words): sys.exit(f'{len(words) - k} words left over after the phrases')
dur = max(w['e'] for w in words) + 2
L = ['[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {W}', f'PlayResY: {H}', 'WrapStyle: 2', 'ScaledBorderAndShadow: yes', '',
     '[V4+ Styles]',
     'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
     f'Style: Cap,Inter ExtraBold,{round(H * 0.038)},&H00FFFFFF,&H00FFFFFF,&H00141414,&H64000000,0,0,0,0,100,100,0,0,1,{round(H*0.0022)},{round(H*0.0026)},5,60,60,0,1',
     f'Style: Tag,Inter ExtraBold,{round(H * 0.0135)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H78000000,0,0,0,0,100,100,1,0,1,{round(H*0.0008)},{round(H*0.0012)},7,{round(W*0.034)},0,{round(H*0.019)},1', '',
     '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
     f'Dialogue: 1,{ts(0)},{ts(dur)},Tag,,0,0,0,,AI PARODY']
cy = round(H * 0.64)
for i, c in enumerate(chunks):
    s = c[0]['s']; e = chunks[i + 1][0]['s'] if i + 1 < len(chunks) else c[-1]['e'] + 0.6
    e = min(e, c[-1]['e'] + 0.9)                                  # never linger past a pause
    txt = ' '.join(x['w'] for x in c).upper().replace('{', '(').replace('}', ')')
    # a quick pop on: 92% to 100% over 80 ms
    L.append(f'Dialogue: 0,{ts(s)},{ts(e)},Cap,,0,0,0,,{{\\an5\\pos({W // 2},{cy})\\fscx92\\fscy92\\t(0,80,\\fscx100\\fscy100)}}{txt}')
open(out, 'w').write('\n'.join(L) + '\n'); print(out, len(chunks), 'captions')
