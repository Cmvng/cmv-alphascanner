#!/usr/bin/env python3
"""Measure a narrator's delivery: pace, pauses, pitch, emphasis, energy, token handling and script style.

  One take:   python3 -I measure.py <audio> <words.json> <captions.json | script.txt> <out.json> [--compare profile.json]
              [--project "Primus,Bagel"] [--label name] [--aligner auto|ctc|whisper]
  Pool takes: python3 -I measure.py --pool <out1.json> <out2.json> ... --profile <profile.json> [--voice "Lara ..."]
              [--summary-out pooled_summary.json]

<words.json>  [{"s", "e", "w"}] word times from faster-whisper (words.py, large-v3). Zero-length words are dropped
              (whisper hallucinations), and whisper words after the end of the script are dropped too.
<captions>    {"caps": [[start, end, text], ...], "cut": s, "sc": {...} | [...], "project": [...]} in take seconds
              (cut / sc = where a new paragraph or scene starts; *word* marks an editor's key word), or the plain text
              sent to the TTS (blank lines = paragraphs, "..." = an ellipsis). The text sent to the TTS is better:
              captions can differ from it in punctuation.
--compare     prints and stores how this take differs from a profile made with --pool (z = difference / profile sd).
--aligner     auto (default) = CTC forced alignment with wav2vec2-base-960h (ONNX int8, 95 MB, fetched once into
              ~/.cache/huggingface via huggingface_hub; needs onnxruntime), falling back to whisper times + lag + DP.

How it works (all times in take seconds):
  1. Frames every 5 ms at 48 kHz: energy (dB re the take's 95th-percentile frame), spectral centroid, F0 (Praat AC,
     120-500 Hz, octave jumps removed, 5-frame median), a 50 Hz-floor F0 for creak, and HNR.
  2. Non-speech runs: silent frames (< -50 dB) plus unvoiced breath-like islands. A pause is a run >= 80 ms.
  3. Script tokens are matched to whisper words by a word-level DP (spelled-out numbers, char similarity). Whisper word
     times run early (onsets ~0.2 s on Lara's takes), so the spoken words are re-timed by CTC forced alignment and each
     non-speech run is given to the word gap it overlaps most. (Fallback: whisper times + estimated lag + a DP that
     matches pauses to boundaries with a punctuation prior.)
  4. Boundaries are classed by the script: ellipsis, question, new_topic, sentence, colon_dash, comma,
     before_number_name, none (one class each, in that priority; tags keep the overlaps). Phrases (IPs) split at
     punctuation or pauses >= 150 ms.
  5. Everything else (rates, contours, emphasis, energy, tokens, script style) is summarised from the four tables
     (units, pauses, phrases, sentences), which the pool mode concatenates across takes.
"""
import argparse, difflib, json, math, re, subprocess, sys
import numpy as np
import parselmouth
from parselmouth.praat import call
from scipy.signal import medfilt

CFG = dict(sr=48000, hop=0.005,          # 48 kHz so a 5 ms hop is a whole number of samples
           win=0.02,
           sil_db=-50.0,      # frame energy re the take's 95th-percentile frame below which a frame is silent
           min_sil=0.03,      # silent runs shorter than this are part of speech
           min_pause=0.08,    # pauses reported from 80 ms
           ip_pause=0.15,     # a pause this long always ends a phrase and is left out of articulation time
           f0_floor=120, f0_ceil=500, creak_floor=50,
           contour_st=1.5,    # final movement (st) needed to call a rise or a fall
           lag_max=0.8, sigma=0.15)
HOP = CFG['hop']
CLASSES = ['ellipsis', 'question', 'new_topic', 'sentence', 'colon_dash', 'comma', 'before_number_name', 'none']
PRIOR = dict(ellipsis=.95, question=.95, new_topic=.97, sentence=.95, colon_dash=.9, comma=.85, before_number_name=.25, none=.12)
OPENERS = ["if you're new", 'so', 'now', 'by the way', 'btw', "let's say", 'say', 'anyways', 'anyway', 'and yeah', 'okay',
           'ok', "here's", 'but here', 'first', 'next', 'finally', 'also', 'plus', 'then', 'and now', 'with', 'but']
FUNC = set("""a an the and or but so if then than that this these those there here it its it's i i'm i've i'll me my mine
you you're your yours you'll you've we we're our us they they're their them he she his her him is are was were be been
being am have has had do does did done to of in on at by for from with without into onto about as up down out over under
just also too very can could will would should may might must shall not no nor what which who whom whose when where why
how all any each every some such own same other more most much many few both either neither one ones yet still even ever
that's there's here's what's let's let isn't aren't wasn't weren't don't doesn't didn't can't won't wouldn't couldn't
like till until while because though although whether around after before again off only per via""".split())
CONTRAST = set("""not no never nothing nobody none only just every everything everyone all even both exactly still yet
actually really isn't aren't don't doesn't didn't can't won't wasn't weren't nah zero any each whole full real""".split())
AUX = set("is are was were be been being am have has had do does did can could will would should may might must shall 's".split())
VERBS = set("""ask need keep build show prove come came let use stay treat know get got upload connect read make made give
trade say said try tried close sit win pay lose lost wait hit sell hold settle matter run pull push spam put drop halve risk
watch score open tap pick see saw start mean think cost move jump concede go went take took find found look tell told feel
felt leave left call work seem want help talk turn play live believe bring happen write stand meet include continue set
learn change lead understand follow stop create speak allow add spend grow walk offer remember love consider appear buy
serve send expect fall cut reach remain suggest raise pass require report decide earn claim join check sign swap stake mint
bridge deposit withdraw lend borrow farm vote launch list ship hide verify protect share sit lock unlock store receive
own block fail break fix pump dump bet track rank miss beat lead end""".split())
NUMW = set("""zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen
eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion half dozen
percent cents dollars dollar""".split())
DET = set("the a an your my his her their our its every each any some no this that these those one".split())
SUBJ = set("i you we they he she it to can could will would should may might must don't doesn't didn't can't won't".split())

# ---------------------------------------------------------------- words, numbers, syllables
ONES = ('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen '
        'eighteen nineteen').split()
TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def int_words(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' ' + int_words(n % 100))
    for div, name in ((10 ** 9, 'billion'), (10 ** 6, 'million'), (1000, 'thousand')):
        if n >= div: return int_words(n // div) + ' ' + name + ('' if n % div == 0 else ' ' + int_words(n % div))


NUMRE = re.compile(r'([$£€]?)(\d[\d,]*)(\.\d+)?\s*([kKmMbB]|bn)?(%?)')


def spell(tok):
    """Digits as spoken words: '$8,200' -> 'eight thousand two hundred dollars'."""
    def rep(m):
        cur, ip, dec, suf, pct = m.groups()
        try: n = int(ip.replace(',', ''))
        except ValueError: return m.group(0)
        out = int_words(n) if n < 10 ** 12 else ip
        if dec: out += ' point ' + ' '.join(ONES[int(c)] for c in dec[1:])
        if suf: out += {'k': ' thousand', 'm': ' million', 'b': ' billion', 'bn': ' billion'}[suf.lower()]
        if pct: out += ' percent'
        if cur: out += ' dollar' if (n == 1 and not dec) else ' dollars'
        return ' ' + out + ' '
    return re.sub(r'\s+', ' ', NUMRE.sub(rep, tok.replace('%', '% ') if tok.strip() == '%' else tok)).strip() or tok


SYL = {'the': 1, 'every': 2, 'everything': 3, 'everyone': 3, 'business': 2, 'different': 3, 'interesting': 3, 'family': 3,
       'evening': 2, 'people': 2, 'little': 2, 'real': 1, 'really': 2, 'being': 2, 'going': 2, 'doing': 2, 'idea': 3,
       'area': 3, 'via': 2, 'video': 3, 'videos': 3, 'create': 2, 'created': 3, 'polymarket': 4, 'polymarkets': 4,
       'primus': 2, 'chelsea': 2, 'liverpool': 3, 'telegram': 3, 'agentics': 3, 'bagel': 2, 'onchain': 2, 'ok': 2,
       'okay': 2, 'grok': 1, 'techy': 2, 'techie': 2, 'maths': 1, 'anyways': 3, 'anyway': 3, 'confidential': 4,
       'verification': 5, 'privacy': 3, 'statement': 2, 'platform': 2, 'whatever': 3, 'basically': 4, 'exactly': 3,
       'actually': 4, 'usually': 4, 'science': 2, 'quiet': 2, 'fire': 1, 'hour': 1, 'our': 1, 'are': 1, 'were': 1,
       'there': 1, 'where': 1, 'here': 1, 'they': 1, 'their': 1, 'premier': 3, 'league': 1, 'liga': 2, 'percent': 2,
       'position': 3, 'concede': 2, 'losing': 2, 'waitlist': 2, 'prices': 2, 'settles': 2, 'closes': 2, 'some': 1,
       'come': 1, 'came': 1, 'one': 1, 'once': 1, 'done': 1, 'gone': 1, 'none': 1, 'someone': 2, 'sometimes': 2,
       'used': 1, 'uses': 2, 'before': 2, 'deposit': 3, 'credit': 2, 'record': 2, 'market': 2, 'markets': 2,
       'orders': 2, 'order': 2, 'yes': 1, 'eye': 1, 'ai': 2, 'labs': 1, 'proves': 1, 'locked': 1, 'asked': 1,
       'shares': 1, 'scores': 1, 'trades': 1, 'halves': 1, 'moves': 1, 'games': 1, 'needed': 2, 'stream': 1,
       'cuts': 1, 'yeah': 1, 'ahh': 1, 'nah': 1, 'zkp': 3, 'fhe': 3, 'tls': 3, 'nba': 3, 'acs': 3, 'btw': 5,
       'usd': 3, 'usdc': 4, 'nft': 3, 'dao': 3, 'defi': 2, 'web3': 2, 'airdrop': 2, 'telegrams': 3, 'wallet': 2,
       'hundred': 2, 'thousand': 2, 'dollars': 2, 'dollar': 2, 'seven': 2, 'eleven': 3, 'twenty': 2, 'thirty': 2,
       'forty': 2, 'fifty': 2, 'sixty': 2, 'seventy': 3, 'eighty': 2, 'ninety': 2, 'zero': 2, 'million': 2,
       'billion': 2, 'point': 1, 'five': 1, 'nine': 1, 'thirteen': 2, 'fourteen': 2, 'fifteen': 2, 'sixteen': 2,
       'seventeen': 3, 'eighteen': 2, 'nineteen': 2, 'cents': 1}
LETTER_SYL = {c: (3 if c == 'w' else 1) for c in 'abcdefghijklmnopqrstuvwxyz'}


NOT_ACRO = {'ok', 'live', 'sell', 'limit', 'close', 'yes', 'no', 'not', 'the', 'and', 'i'}


def is_acronym(raw):
    letters = re.sub(r'[^A-Za-z]', '', raw)
    return len(letters) >= 2 and (letters.isupper() or bool(re.fullmatch(r'[a-z]{1,3}[A-Z]{2,}', letters))) \
        and letters.lower() not in NOT_ACRO


def syl_word(w):
    raw = w
    w = w.lower().strip("'’").replace('’', "'")
    if not w: return 0
    if w in SYL: return SYL[w]
    if is_acronym(raw):
        return sum(LETTER_SYL.get(c, 1) for c in re.sub(r'[^A-Za-z]', '', raw).lower())   # acronyms are spelled out
    m = re.fullmatch(r"([a-z]+)'(s|re|ve|ll|d|m|t)", w)
    if m:
        base = m.group(1)
        if m.group(2) == 't' and base.endswith('n'):                       # isn't, doesn't
            return syl_word(base[:-1]) + (0 if base[:-1] in ('do', 'ca', 'wo', 'are', 'ai') else 1)
        return syl_word(base) + (1 if m.group(2) == 's' and base[-1] in 'sxz' else 0)
    w = re.sub(r'[^a-z]', '', w)
    if not w: return 0
    if len(w) <= 3: return 1 if re.search('[aeiouy]', w) else len(w)
    n = len(re.findall(r'[aeiouy]+', w))
    if w.endswith('e') and not w.endswith(('le', 'ee', 'ie', 'ye', 'oe')): n -= 1
    if w.endswith('es') and len(w) > 3 and w[-3] not in 'sxzcgaeiou' and w[-4:-2] not in ('ch', 'sh'): n -= 1
    if w.endswith('ed') and len(w) > 3 and w[-3] not in 'td': n -= 1
    n += len(re.findall(r'(?<![tcsgq])i[aou]|eo|ua(?!r)', w))
    return max(1, n)


def syl_said(text):
    return sum(syl_word(t) for t in spell(text).replace('-', ' ').split())


def norm_chars(s):
    return re.sub(r'[^a-z0-9]', '', spell(s).lower())


# ---------------------------------------------------------------- audio
def load_audio(path, sr):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def loudness(path):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    s = r[r.rfind('Summary:'):]
    g = lambda pat: (lambda m: float(m.group(1)) if m else None)(re.search(pat, s))
    return {'integrated_lufs': g(r'I:\s+(-?[\d.]+) LUFS'), 'lra_lu': g(r'LRA:\s+(-?[\d.]+) LU'),
            'true_peak_dbtp': g(r'Peak:\s+(-?[\d.]+) dBFS')}


def frames(x, sr):
    hop, win = int(round(HOP * sr)), int(round(CFG['win'] * sr))
    xp = np.pad(x, (win // 2, win // 2))
    fr = np.lib.stride_tricks.sliding_window_view(xp, win)[::hop]
    db = 10 * np.log10(np.mean(fr ** 2, axis=1) + 1e-12)
    ref = float(np.percentile(db, 95))
    spec = np.abs(np.fft.rfft(fr * np.hanning(win), axis=1)) ** 2
    fq = np.fft.rfftfreq(win, 1 / sr)
    cent = (spec @ fq) / (spec.sum(1) + 1e-12)
    return db - ref, ref, cent, spec, fq


def pitch_track(snd, n, floor, ceil):
    p = snd.to_pitch_ac(time_step=HOP, pitch_floor=floor, pitch_ceiling=ceil)
    f = np.zeros(n)
    k = np.clip(np.floor(p.xs() / HOP + 1e-6).astype(int), 0, n - 1)   # Praat frames sit on half-hops
    f[k] = p.selected_array['frequency']
    return f


def clean_f0(f0):
    st = np.where(f0 > 0, 12 * np.log2(np.maximum(f0, 1) / 100), np.nan)
    med = np.nanmedian(st)
    st[np.abs(st - med) > 13] = np.nan                                     # octave jumps / errors
    jump = np.abs(np.diff(st, prepend=np.nan)) > 5                          # a > 5 st step in 5 ms breaks the run
    v = ~np.isnan(st)
    v[jump] = False
    out = np.full_like(st, np.nan)
    i, n = 0, len(st)
    while i < n:                                                            # 5-frame median per voiced run, drop < 30 ms
        if not v[i]: i += 1; continue
        j = i
        while j < n and v[j]: j += 1
        if j - i >= 6: out[i:j] = medfilt(st[i:j], 5) if j - i >= 5 else st[i:j]
        i = j
    return out


def trim_blips(v, min_run=12):
    """Drop voiced fragments under 60 ms at the edges of a span (the short re-voiced blip after a creaky ending)."""
    v = v.copy()
    ok = ~np.isnan(v)
    runs, i = [], 0
    while i < len(v):
        if not ok[i]: i += 1; continue
        j = i
        while j < len(v) and ok[j]: j += 1
        runs.append((i, j)); i = j
    if len(runs) < 2 or max(b - a for a, b in runs) < min_run: return v
    while len(runs) > 1 and runs[-1][1] - runs[-1][0] < min_run:
        a, b = runs.pop(); v[a:b] = np.nan
    while len(runs) > 1 and runs[0][1] - runs[0][0] < min_run:
        a, b = runs.pop(0); v[a:b] = np.nan
    return v


# ---------------------------------------------------------------- script
def tokenize(text):
    toks, in_key = [], False
    for raw in text.split():
        star = '*' in raw
        key = in_key or star
        in_key ^= (raw.count('*') % 2 == 1)
        raw = raw.replace('*', '')
        m = re.match(r'^([(\["“‘]*)(.*?)([)\]"”’,.;:!?…—–-]*)$', raw)
        lead, core, trail = m.groups()
        if re.fullmatch(r'(?:[A-Za-z]\.){2,}', core + trail[:1]) and trail.startswith('.'):  # F.H.E.
            core, trail = core + '.', trail[1:]
        if not core:
            if toks: toks[-1]['trail'] += lead + trail
            continue
        toks.append({'core': core, 'lead': lead, 'trail': trail, 'key': key})
    return toks


def parse_script(path):
    if path.endswith('.json'):
        d = json.load(open(path))
        caps = d['caps']
        scene = []
        if 'cut' in d: scene.append(float(d['cut']))
        sc = d.get('sc')
        if isinstance(sc, dict): scene += [float(v) for v in sc.values()]
        elif isinstance(sc, list): scene += [float(v) for v in sc]
        para_caps = {0}
        for t in scene:
            later = [i for i, c in enumerate(caps) if c[0] >= t - 0.1]
            if later: para_caps.add(later[0])
        toks = []
        for i, c in enumerate(caps):
            tt = tokenize(c[2])
            for j, t in enumerate(tt):
                t['cap'] = i; t['cap_start'] = j == 0; t['para_start'] = j == 0 and i in para_caps
            toks += tt
        project = d.get('project', [])
        text = ' '.join(c[2] for c in caps).replace('*', '')
    else:
        raw = open(path).read().replace('...', '…')
        toks = []
        for i, para in enumerate(p for p in re.split(r'\n\s*\n', raw) if p.strip()):
            tt = tokenize(para)
            for j, t in enumerate(tt):
                t['cap'] = i; t['cap_start'] = j == 0; t['para_start'] = j == 0
            toks += tt
        project, text = [], raw
    return toks, project, text


def is_upper_start(t):
    return bool(re.match(r'^[A-Z@$0-9]', t['core']))


def annotate_script(toks, project):
    n = len(toks)
    # sentence ends
    for i, t in enumerate(toks):
        tr = t['trail']
        nxt = toks[i + 1] if i + 1 < n else None
        t['p_ellipsis'] = '…' in tr or '...' in tr
        t['p_question'] = '?' in tr
        t['p_stop'] = bool(re.search(r'[.!]', tr.replace('...', ''))) and not t['p_ellipsis']
        t['p_colon'] = bool(re.search(r'[:;—–]|-$', tr))
        t['p_comma'] = ',' in tr
        if ')' in tr and not (t['p_stop'] or t['p_question']):
            if nxt is not None and is_upper_start(nxt): t['p_stop'] = True
            else: t['p_comma'] = True
        end = t['p_stop'] or t['p_question']
        if t['p_ellipsis']:
            end = nxt is None or nxt['para_start'] or (is_upper_start(nxt) and nxt['core'] not in ('I', "I'm", "I've", "I'll"))
        t['sent_end'] = end or nxt is None or (nxt is not None and nxt['para_start'])
    sid, ss = 0, True
    for i, t in enumerate(toks):
        t['sent'] = sid; t['sent_start'] = ss
        ss = t['sent_end']
        if t['sent_end']: sid += 1
    # openers / new topic
    for i, t in enumerate(toks):
        nxt3 = ' '.join(x['core'].lower().replace('’', "'") for x in toks[i:i + 3])
        t['opener'] = None
        if t['sent_start']:
            for o in OPENERS:
                if nxt3 == o or nxt3.startswith(o + ' '):
                    t['opener'] = o; break
        t['topic_start'] = t['sent_start'] and (t['para_start'] or (t['opener'] is not None and t['opener'] not in ('with', 'but')))
    # asides: (...) and "by the way" / btw sentences
    in_par = False
    aside_sents = {t['sent'] for t in toks if t['sent_start'] and t['opener'] in ('by the way', 'btw')}
    for t in toks:
        if '(' in t['lead']: in_par = True
        t['paren'] = in_par
        t['aside'] = in_par or t['sent'] in aside_sents
        if ')' in t['trail']: in_par = False
    # names
    mid_caps = set()
    for i, t in enumerate(toks):
        c = t['core']
        prev_open = i > 0 and (toks[i - 1]['p_colon'] or toks[i - 1]['p_ellipsis'] or '"' in t['lead'] or '“' in t['lead'])
        if c.startswith('@') or len(re.findall(r'[A-Z]', c)) >= 2 or \
                (c[:1].isupper() and not t['sent_start'] and not prev_open and c not in ('I', "I'm", "I've", "I'll", "I'd")):
            mid_caps.add(re.sub(r"[’']s$", '', c).lower())
    proj = {p.lower() for p in project}
    for t in toks:
        if t['core'].startswith('@'):
            h = t['core'][1:].lower()
            proj |= set(h.split('_')) | {h}
    for t in toks:
        lc = re.sub(r"[’']s$", '', t['core']).lower()
        t['is_name'] = t['core'].startswith('@') or lc in mid_caps
        t['is_project'] = lc in proj or lc.lstrip('@') in proj
        t['is_number'] = bool(re.search(r'\d', t['core'])) or lc in (NUMW - {'percent', 'cents', 'dollars', 'dollar'})
        t['is_amount'] = bool(re.search(r'[$£€%]', t['core'])) or lc in ('cents', 'dollars', 'percent')
        t['is_contrast'] = lc in CONTRAST
        t['is_func'] = lc in FUNC and not t['is_contrast']
    for i, t in enumerate(toks):
        lc = t['core'].lower()
        prev = toks[i - 1]['core'].lower() if i else ''
        t['is_verb'] = False
        if lc in AUX or t['is_name'] or t['is_number']: continue
        stems = {lc, re.sub(r'(ies)$', 'y', lc), re.sub(r'(es|s|ed|ing|d)$', '', lc), re.sub(r'(s|d)$', '', lc),
                 re.sub(r'ing$', 'e', lc), re.sub(r'ed$', 'e', lc), re.sub(r'(.)\1(ed|ing)$', r'\1', lc)}
        if stems & VERBS and not (prev in DET or re.search(r'\d', prev)):
            t['is_verb'] = True if (prev in SUBJ or lc.endswith(('ed', 'ing')) or lc in VERBS or not lc.endswith('s')) else prev not in DET
    # lists: >= 2 adjacent short comma segments in one sentence
    for t in toks: t['list'] = False
    sents = {}
    for i, t in enumerate(toks): sents.setdefault(t['sent'], []).append(i)
    for idx in sents.values():
        segs, cur = [], []
        for i in idx:
            cur.append(i)
            if toks[i]['p_comma'] or toks[i]['p_colon'] or i == idx[-1]:
                segs.append(cur); cur = []
        short = [len(s) <= 4 for s in segs]
        for k, s in enumerate(segs):
            nb = (k > 0 and short[k - 1]) or (k + 1 < len(segs) and short[k + 1])
            lead_in = k == 0 and len(segs) > 1 and toks[s[-1]]['p_colon']
            if short[k] and nb and not lead_in and len(segs) >= 3:
                for i in s: toks[i]['list'] = True
    # key lines: short sentences and mid-sentence ellipses
    for idx in sents.values():
        kl = len(idx) <= 6 or any(toks[i]['p_ellipsis'] and not toks[i]['sent_end'] for i in idx)
        for i in idx: toks[i]['key_line'] = kl
    return toks


def boundary_class(toks, a, b):
    """Class of the boundary between script tokens a and b (b > a); tokens in between are untimed."""
    span = toks[a:b]
    nxt = toks[b]
    tags = []
    if any(t['p_ellipsis'] for t in span): tags.append('ellipsis')
    if any(t['p_question'] for t in span): tags.append('question')
    if any(t['sent_end'] for t in span):
        tags.append('sentence_end')
        if nxt['topic_start']: tags.append('new_topic')
        if nxt['para_start']: tags.append('paragraph')
    if any(t['p_colon'] for t in span): tags.append('colon_dash')
    if any(t['p_comma'] for t in span): tags.append('comma')
    if nxt['is_number'] or nxt['is_amount'] or nxt['is_name']: tags.append('before_number_name')
    if nxt['cap_start']: tags.append('caption_start')
    if nxt.get('list') or toks[a].get('list'): tags.append('list')
    if nxt['aside'] != toks[a]['aside']: tags.append('aside_edge')
    if 'ellipsis' in tags: c = 'ellipsis'
    elif 'question' in tags: c = 'question'
    elif 'new_topic' in tags: c = 'new_topic'
    elif 'sentence_end' in tags: c = 'sentence'
    elif 'colon_dash' in tags: c = 'colon_dash'
    elif 'comma' in tags: c = 'comma'
    elif 'before_number_name' in tags: c = 'before_number_name'
    else: c = 'none'
    return c, tags


# ---------------------------------------------------------------- whisper words -> script tokens
def load_words(path):
    ws = [dict(w) for w in json.load(open(path)) if w['e'] - w['s'] > 0.0]
    out = []
    for w in ws:
        w['w'] = w['w'].strip()
        if out and (re.match(r'^[,.]\d', w['w']) or re.fullmatch(r'%[,.!?…]*', w['w'])):
            out[-1]['w'] += w['w']; out[-1]['e'] = w['e']
        elif w['w']:
            out.append(w)
    return out


def numish(s):
    return bool(re.search(r'[\d$%]', s)) or any(w in NUMW for w in re.findall(r'[a-z]+', s.lower()))


def align(toks, words):
    """Word-level DP: each script token takes 0-3 consecutive whisper words (spelled-number char similarity);
    extra whisper words inside the script are insertions, after its end hallucinations. -> {token: [word idx]}"""
    N, M = len(toks), len(words)
    tn = [norm_chars(t['core']) for t in toks]
    wn = [norm_chars(w['w']) for w in words]
    tnum = [numish(t['core']) for t in toks]
    wnum = [numish(w['w']) for w in words]
    band = max(40, abs(N - M) + 20)
    NEG = -1e9
    D = np.full((N + 1, M + 1), NEG); D[0, :] = [-0.0 * j for j in range(M + 1)]   # leading whisper words are free
    bk = {}
    for i in range(N + 1):
        jc = int(i * M / max(N, 1))
        for j in range(max(0, jc - band), min(M, jc + band) + 1):
            d = D[i, j]
            if d <= NEG / 2: continue
            if i < N and d - 0.45 > D[i + 1, j]: D[i + 1, j] = d - 0.45; bk[(i + 1, j)] = (i, j, 0)
            if j < M:
                c = d + (0.0 if i == N else -0.45)                           # trailing whisper words are free
                if c > D[i, j + 1]: D[i, j + 1] = c; bk[(i, j + 1)] = (i, j, -1)
            if i < N:
                for r in (1, 2, 3):
                    if j + r > M: break
                    cat = ''.join(wn[j:j + r])
                    sim = difflib.SequenceMatcher(None, tn[i], cat, autojunk=False).ratio() if tn[i] and cat else 0
                    if tnum[i] and any(wnum[j:j + r]): sim = max(sim, 0.6)
                    sc = d + sim - 0.5 - 0.08 * (r - 1)
                    if sc > D[i + 1, j + r]: D[i + 1, j + r] = sc; bk[(i + 1, j + r)] = (i, j, r)
    i, j = N, M
    units, ins, trail = {}, [], 0
    while (i, j) in bk:
        pi, pj, r = bk[(i, j)]
        if r > 0: units[pi] = list(range(pj, pj + r))
        elif r == -1:
            if pi == N: trail += 1
            else: ins.append(pj)
        i, j = pi, pj
    return units, trail, sorted(ins)


def estimate_lag(speech, words, n):
    wh = np.zeros(n, bool)
    for w in words: wh[int(w['s'] / HOP):int(w['e'] / HOP) + 1] = True
    def score(a, b, L):
        if L >= 0: return np.mean(a[L:] == b[:len(b) - L]) if L < len(b) else 0
        return np.mean(a[:len(a) + L] == b[-L:])
    Lm = int(CFG['lag_max'] / HOP)
    g = max(range(-Lm, Lm + 1, 2), key=lambda L: score(speech, wh, L))
    win, step = int(20 / HOP), int(5 / HOP)
    cs, ls = [], []
    for a in range(0, max(1, n - win // 2), step):
        sl = slice(a, min(n, a + win))
        if sl.stop - sl.start < win // 2: break
        L = max(range(g - int(.2 / HOP), g + int(.2 / HOP) + 1, 2), key=lambda L: score(speech[sl], wh[sl], L))
        cs.append((sl.start + sl.stop) / 2 * HOP); ls.append(L * HOP)
    if len(ls) >= 3: ls = list(medfilt(np.array(ls), 3))
    if not ls: cs, ls = [0.0], [g * HOP]
    return g * HOP, (lambda t: float(np.interp(t, cs, ls))), list(zip([round(c, 1) for c in cs], [round(l, 3) for l in ls]))


def match_pauses(bounds, pauses):
    """DP: each pause either sits on one word boundary or is inside a word (stop closure); monotonic."""
    K, M = len(bounds), len(pauses)
    INF = 1e18
    D = np.full((M + 1, K + 1), INF); D[0, 0] = 0
    bp = np.zeros((M + 1, K + 1), np.int8)
    sk_b = [-math.log(1 - b['p']) for b in bounds]
    mt_b = [-math.log(b['p']) for b in bounds]
    U = [(1.0 + 40 * max(0.0, p['dur'] - 0.09)) * (5 if p['breath'] else 1) for p in pauses]
    for j in range(M + 1):
        for k in range(K + 1):
            d = D[j, k]
            if d >= INF: continue
            if j < M and d + U[j] < D[j + 1, k]: D[j + 1, k] = d + U[j]; bp[j + 1, k] = 1
            if k < K and d + sk_b[k] < D[j, k + 1]: D[j, k + 1] = d + sk_b[k]; bp[j, k + 1] = 2
            if j < M and k < K:
                dist = pauses[j]['c'] - bounds[k]['t']
                if abs(dist) < 0.7:
                    c = d + mt_b[k] + 0.5 * (dist / CFG['sigma']) ** 2
                    if c < D[j + 1, k + 1]: D[j + 1, k + 1] = c; bp[j + 1, k + 1] = 3
    j, k, m = M, K, {}
    while j > 0 or k > 0:
        b = bp[j, k]
        if b == 3: m[k - 1] = j - 1; j -= 1; k -= 1
        elif b == 1: j -= 1
        else: k -= 1
    return m



# ---------------------------------------------------------------- CTC forced alignment (wav2vec2-base-960h, ONNX int8, 95 MB)
LETTER_NAMES = dict(a='AY', b='BEE', c='SEE', d='DEE', e='EE', f='EF', g='GEE', h='AITCH', i='EYE', j='JAY', k='KAY', l='EL',
                    m='EM', n='EN', o='OH', p='PEE', q='CUE', r='AR', s='ESS', t='TEE', u='YOU', v='VEE', w='DOUBLE U', x='EX',
                    y='WHY', z='ZEE')


def ctc_words(raw):
    out = []
    for t in spell(raw).replace('-', ' ').replace('_', ' ').split():
        if is_acronym(t):
            out += ' '.join(LETTER_NAMES[c] for c in re.sub(r'[^A-Za-z]', '', t).lower()).split()
        else:
            c = re.sub(r"[^A-Za-z']", '', t.replace('’', "'")).upper().strip("'")
            if c: out.append(c)
    return out


def ctc_align(audio, said_words):
    """Viterbi alignment of the spoken words on wav2vec2 CTC posteriors -> [(start, end)] per word (None if empty)."""
    try:
        import onnxruntime as ort
        from huggingface_hub import hf_hub_download
        rep = 'Xenova/wav2vec2-base-960h'
        vocab = json.load(open(hf_hub_download(rep, 'vocab.json')))
        so = ort.SessionOptions(); so.log_severity_level = 3
        sess = ort.InferenceSession(hf_hub_download(rep, 'onnx/model_quantized.onnx'), so, providers=['CPUExecutionProvider'])
    except Exception as e:                                                  # no model: fall back to whisper + DP
        print('CTC aligner unavailable, using whisper times + lag + DP:', e, file=sys.stderr)
        return None
    x = load_audio(audio, 16000).astype(np.float32)
    N, hop = len(x), 320
    chunk, ctx = 1000 * hop, 100 * hop                                      # 20 s pieces with 2 s context each side
    T = N // hop
    lg = np.zeros((T, len(vocab)), np.float32)
    for a in range(0, N, chunk):
        lo, hi = max(0, a - ctx), min(N, a + chunk + ctx)
        seg = x[lo:hi]; seg = (seg - seg.mean()) / np.sqrt(seg.var() + 1e-7)
        out = sess.run(None, {'input_values': seg[None]})[0][0]
        f0, f1 = a // hop, min(T, (a + chunk) // hop)
        idx = np.clip(np.arange(f0, f1) - lo // hop, 0, len(out) - 1)
        lg[f0:f1] = out[idx]
    lp = lg - (np.log(np.exp(lg - lg.max(1, keepdims=True)).sum(1, keepdims=True)) + lg.max(1, keepdims=True))
    blank, sep = vocab['<pad>'], vocab['|']
    tok, owner = [], []
    for wi, w in enumerate(said_words):
        cw = ctc_words(w)
        for c_i, cword in enumerate(cw):
            if tok: tok.append(sep); owner.append(-1)
            for ch in cword:
                if ch in vocab: tok.append(vocab[ch]); owner.append(wi)
    L = len(tok)
    if L == 0 or L * 2 + 1 > T * 2: return None
    S = 2 * L + 1
    lab = np.full(S, blank); lab[1::2] = tok
    tk = np.array(tok)
    allow2 = np.zeros(S, bool); allow2[3::2] = tk[1:] != tk[:-1]
    NEG = -1e30
    alpha = np.full(S, NEG); alpha[0] = lp[0, blank]; alpha[1] = lp[0, tok[0]]
    bp = np.zeros((T, S), np.int8)
    ar = np.arange(S)
    for t in range(1, T):
        a1 = np.concatenate(([NEG], alpha[:-1]))
        a2 = np.where(allow2, np.concatenate(([NEG, NEG], alpha[:-2])), NEG)
        stk = np.vstack([alpha, a1, a2])
        b = np.argmax(stk, 0)
        alpha = stk[b, ar] + lp[t, lab]
        bp[t] = b
    s = int(S - 1 if alpha[S - 1] > alpha[S - 2] else S - 2)
    first, last = {}, {}
    for t in range(T - 1, -1, -1):
        if s % 2 == 1:
            w = owner[(s - 1) // 2]
            if w >= 0:
                first[w] = t
                last.setdefault(w, t)
        s = int(s) - int(bp[t, s])
    spans = [((first[w] * hop) / 16000, ((last[w] + 1) * hop) / 16000) if w in first else None for w in range(len(said_words))]
    return {'spans': spans}

# ---------------------------------------------------------------- stats helpers
def st(a, r=3):
    a = np.array([v for v in a if v is not None and not (isinstance(v, float) and math.isnan(v))], float)
    if len(a) == 0: return {'n': 0}
    return {'n': int(len(a)), 'mean': round(float(a.mean()), r), 'sd': round(float(a.std(ddof=1)) if len(a) > 1 else 0.0, r),
            'median': round(float(np.median(a)), r), 'p10': round(float(np.percentile(a, 10)), r),
            'p90': round(float(np.percentile(a, 90)), r)}


def rnd(v, r=3):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), r)


def frac(xs):
    xs = list(xs)
    return round(sum(xs) / len(xs), 3) if xs else None


# ---------------------------------------------------------------- one take
def measure(audio, words_path, script_path, project_cli=None, aligner='auto'):
    sr = CFG['sr']
    x = load_audio(audio, sr)
    dur_audio = len(x) / sr
    rel, ref_db, cent, spec, fq = frames(x, sr)
    n = len(rel)
    tf = np.arange(n) * HOP
    snd = parselmouth.Sound(x, sr)
    f0raw = pitch_track(snd, n, CFG['f0_floor'], CFG['f0_ceil'])
    f0low = pitch_track(snd, n, CFG['creak_floor'], CFG['f0_ceil'])
    stc = clean_f0(f0raw)                                                   # st re 100 Hz, NaN unvoiced
    med_st = float(np.nanmedian(stc))
    med_hz = 100 * 2 ** (med_st / 12)
    hn = snd.to_harmonicity_cc(time_step=0.01, minimum_pitch=CFG['f0_floor'])
    hnr = np.full(n, np.nan)
    hk = np.clip(np.floor(hn.xs() / HOP + 1e-6).astype(int), 0, n - 1)
    hv = hn.values[0]
    hnr[hk] = np.where(hv > -100, hv, np.nan)
    hnr = np.array(hnr)
    # fill HNR between its 10 ms frames
    ok = ~np.isnan(hnr)
    if ok.any(): hnr = np.interp(tf, tf[ok], hnr[ok]); hnr[np.isnan(stc)] = np.nan

    # ---- silences, breaths, pauses
    sil = rel < CFG['sil_db']
    runs, i = [], 0
    while i < n:
        j = i
        while j < n and sil[j] == sil[i]: j += 1
        runs.append([bool(sil[i]), i, j]); i = j
    for r in runs[1:-1]:
        if r[0] and (r[2] - r[1]) * HOP < CFG['min_sil']: r[0] = False
    mr = []
    for r in runs:
        if mr and mr[-1][0] == r[0]: mr[-1][2] = r[2]
        else: mr.append(list(r))
    isl = []                                                                # 'sil' | 'breath' | 'speech'
    for k, (s_, a, b) in enumerate(mr):
        if s_: isl.append(['sil', a, b, {}]); continue
        d = (b - a) * HOP
        v = np.mean(f0raw[a:b] > 0)
        c = float(np.median(cent[a:b]))
        silb = (mr[k - 1][2] - mr[k - 1][1]) * HOP if k > 0 and mr[k - 1][0] else 0
        br = v < 0.1 and c < 4500 and (d >= 0.3 or (d >= 0.2 and c < 2500 and silb >= 0.08))
        isl.append(['breath' if br else 'speech', a, b, {'dur': d, 'cent': c, 'max_db': float(rel[a:b].max()),
                                                          'mean_db': float(rel[a:b].mean())}])
    sp_idx = [k for k, s in enumerate(isl) if s[0] == 'speech']
    first_on, last_off = isl[sp_idx[0]][1] * HOP, isl[sp_idx[-1]][2] * HOP
    runs_ns = []                                                            # every non-speech run between speech
    k = sp_idx[0]
    while k < sp_idx[-1]:
        if isl[k][0] == 'speech': k += 1; continue
        a = k
        while isl[k][0] != 'speech': k += 1
        s0, s1 = isl[a][1] * HOP, isl[k][1] * HOP
        brs = [isl[q] for q in range(a, k) if isl[q][0] == 'breath']
        runs_ns.append({'s': s0, 'e': s1, 'dur': s1 - s0, 'c': (s0 + s1) / 2, 'breath': bool(brs),
                        'breath_dur': sum(b[3]['dur'] for b in brs), 'breath_db': max([b[3]['max_db'] for b in brs], default=None)})
    pauses = [r for r in runs_ns if r['dur'] >= CFG['min_pause']]
    pidx = {id(r): j for j, r in enumerate(pauses)}
    speech_mask = ~sil

    # ---- script + words
    toks, project, script_text = parse_script(script_path)
    if project_cli: project = list(project) + [p.strip() for p in project_cli.split(',') if p.strip()]
    toks = annotate_script(toks, project)
    words = load_words(words_path)
    umap, n_halluc, inserted = align(toks, words)
    glag, lagf, lag_tab = estimate_lag(speech_mask, words, n)
    for i, js in umap.items():                                              # restarts: "every Everything" -> "Everything"
        if len(js) > 1:
            core, last = norm_chars(toks[i]['core']), norm_chars(words[js[-1]]['w'])
            if last == core and all(core.startswith(norm_chars(words[j]['w'])) for j in js[:-1]):
                umap[i] = [js[-1]]
    timed = sorted(umap)
    items = []                                                              # whisper words, plus script tokens whisper missed
    for i in range(timed[0], timed[-1] + 1):
        if i in umap: items += [('w', j, words[j]['w']) for j in umap[i]]
        else: items.append(('t', i, toks[i]['core']))
    ctc = ctc_align(audio, [it[2] for it in items]) if aligner != 'whisper' else None
    span_of, tok_span = {}, {}
    if ctc:
        for it, sp in zip(items, ctc['spans']):
            if sp is not None: (span_of if it[0] == 'w' else tok_span)[it[1]] = sp
    units = []
    for i in sorted(set(umap) | set(tok_span)):
        if i in umap:
            js = umap[i]
            ws = [words[j] for j in js]
            said = ' '.join(w['w'] for w in ws)
            sp = [span_of[j] for j in js if j in span_of]
            if sp: a0, b0 = min(a for a, b in sp), max(b for a, b in sp)
            else:
                s0 = min(w['s'] for w in ws); e0 = max(w['e'] for w in ws)
                a0, b0 = s0 + lagf(s0), e0 + lagf(e0)
        else:
            said, sp = toks[i]['core'], [tok_span[i]]
            a0, b0 = tok_span[i]
        units.append({'tok': i, 'word': toks[i]['core'], 'said': said, 'ws': a0, 'we': b0, 'ctc': bool(sp),
                      'whisper_missed': i not in umap, 'syll': syl_said(re.sub(r'[^\w\s$%.,\'’-]', '', said))})
    used = sorted(span_of)
    # boundaries between consecutive timed units
    bounds = []
    for k in range(len(units) - 1):
        a, b = units[k]['tok'], units[k + 1]['tok']
        c, tags = boundary_class(toks, a, b)
        p = PRIOR[c]
        if c == 'none' and 'caption_start' in tags: p = 0.4
        g = units[k + 1]['ws'] - units[k]['we']
        if g >= 0.2: p = max(p, 0.8)
        elif g >= 0.1: p = max(p, 0.5)
        bounds.append({'k': k, 'cls': c, 'tags': tags, 'p': min(p, 0.99), 't': (units[k]['we'] + units[k + 1]['ws']) / 2})
    gap_run = {}
    if ctc:
        # each non-speech run goes to the word gap it overlaps most (CTC word spans are accurate to ~20-40 ms)
        best = {}
        for k in range(len(units) - 1):
            a, b = units[k]['we'] - 0.04, units[k + 1]['ws'] + 0.04
            if b - a < 0.08: a, b = (a + b) / 2 - 0.04, (a + b) / 2 + 0.04
            cands = [(min(b, r['e']) - max(a, r['s']), ri) for ri, r in enumerate(runs_ns) if r['e'] > a and r['s'] < b]
            if not cands: continue
            ov, ri = max(cands, key=lambda c: (c[0], runs_ns[c[1]]['dur']))
            if ri not in best or ov > best[ri][0]: best[ri] = (ov, k)
        gap_run = {k: runs_ns[ri] for ri, (ov, k) in best.items()}
        m = {k: pidx[id(r)] for k, r in gap_run.items() if id(r) in pidx}
        for k, u in enumerate(units):
            if k == 0: u['s'] = first_on if abs(u['ws'] - first_on) < 0.3 else u['ws'] - 0.02
            if k == len(units) - 1: u['e'] = last_off if abs(last_off - u['we']) < 0.5 else u['we'] + 0.05
            if k < len(units) - 1:
                v = units[k + 1]
                if k in gap_run: u['e'], v['s'] = gap_run[k]['s'], gap_run[k]['e']
                else: u['e'] = v['s'] = (u['we'] + v['ws']) / 2
        for k, u in enumerate(units):
            if u['e'] <= u['s']: u['e'] = u['s'] + 0.03
    else:
        m = match_pauses(bounds, pauses)
        gap_run = {k: pauses[j] for k, j in m.items()}
        # re-space unit times between anchors
        starts_ac = {0: first_on}
        ends_ac = {len(units) - 1: last_off}
        for k, j in sorted(m.items()):
            ends_ac[k] = pauses[j]['s']; starts_ac[k + 1] = pauses[j]['e']
        r0 = 0
        for u in range(len(units)):
            if u in ends_ac:
                A, B = starts_ac[r0], ends_ac[u]
                ws0, we1 = units[r0]['ws'], units[u]['we']
                span = max(we1 - ws0, 1e-3)
                if B <= A: B = A + 0.05
                for q in range(r0, u + 1):
                    units[q]['s'] = A + (units[q]['ws'] - ws0) / span * (B - A)
                    units[q]['e'] = A + (units[q]['we'] - ws0) / span * (B - A)
                for q in range(r0, u):
                    units[q]['e'] = units[q + 1]['s'] = max(units[q]['s'] + 0.02, min(units[q + 1]['s'], B))
                units[u]['e'] = B; units[r0]['s'] = A
                r0 = u + 1
    matched_p = set(m.values())
    whisper_minus_audio = None
    if ctc:
        dd = [words[j]['s'] - span_of[j][0] for j in used if j in span_of]
        whisper_minus_audio = float(np.median(dd)) if dd else None
    for k, u in enumerate(units):
        u['dur'] = max(u['e'] - u['s'], 0.02)
        u['pause_after'] = pauses[m[k]]['dur'] if k in m else 0.0
        u['pause_before'] = pauses[m[k - 1]]['dur'] if (k - 1) in m else 0.0
        u['gap_after'] = gap_run[k]['dur'] if k in gap_run else 0.0
        u['bound'] = bounds[k]['cls'] if k < len(bounds) else 'end'
        u['btags'] = bounds[k]['tags'] if k < len(bounds) else []
        t = toks[u['tok']]
        for f in ('sent', 'sent_start', 'is_name', 'is_project', 'is_number', 'is_amount', 'is_contrast', 'is_func',
                  'is_verb', 'list', 'aside', 'paren', 'key_line', 'key', 'opener', 'topic_start', 'para_start', 'cap'):
            u[f] = t[f]
        u['trail'] = t['trail']; u['lead'] = t['lead']
        u['cat'] = ('number_amount' if (t['is_number'] or t['is_amount']) else 'name' if t['is_name'] else
                    'contrast' if t['is_contrast'] else 'verb' if t['is_verb'] else 'function' if t['is_func'] else 'content')
        a, b = int(u['s'] / HOP), max(int(u['e'] / HOP), int(u['s'] / HOP) + 1)
        v = stc[a:b]; vv = v[~np.isnan(v)]
        u['nv'] = int(len(vv))
        u['f0_med'] = float(np.median(vv)) - med_st if len(vv) else None
        u['f0_p90'] = float(np.percentile(vv, 90)) - med_st if len(vv) >= 4 else None
        e_ = rel[a:b]; e_sp = e_[e_ > CFG['sil_db']]
        u['db_max'] = float(e_.max()) if len(e_) else None
        u['db_mean'] = float(10 * np.log10(np.mean(10 ** (e_sp / 10)))) if len(e_sp) else None
    # expected duration given syllables (units not followed by a pause), then stretch
    med_units = [u for u in units if u['pause_after'] < CFG['min_pause'] and u['bound'] != 'end' and u['syll'] > 0]
    xs = np.array([u['syll'] for u in med_units], float); ys = np.array([u['dur'] for u in med_units])
    A_ = np.vstack([np.ones_like(xs), xs]).T
    coef = np.linalg.lstsq(A_, ys, rcond=None)[0] if len(xs) > 3 else np.array([0.05, 0.18])
    for u in units:
        u['exp_dur'] = float(coef[0] + coef[1] * max(u['syll'], 1))
        u['stretch'] = u['dur'] / u['exp_dur']

    # ---- phrases (IPs)
    ips, cur = [], []
    for k, u in enumerate(units):
        cur.append(k)
        brk = k == len(units) - 1 or u['pause_after'] >= CFG['ip_pause'] or \
            u['bound'] in ('ellipsis', 'question', 'new_topic', 'sentence', 'colon_dash', 'comma')
        if brk: ips.append(cur); cur = []
    phrases = []
    T = CFG['contour_st']
    for pi, idx in enumerate(ips):
        us = [units[k] for k in idx]
        for u in us: u['ip'] = pi
        s0, e0 = us[0]['s'], us[-1]['e']
        a, b = int(s0 / HOP), int(e0 / HOP) + 1
        v = trim_blips(stc[a:b]); tv = tf[a:b]; okv = ~np.isnan(v)
        ph = {'ip': pi, 's': s0, 'e': e0, 'dur': e0 - s0, 'n_units': len(us), 'syll': sum(u['syll'] for u in us),
              'text': ' '.join(u['word'] for u in us), 'bound': us[-1]['bound'], 'btags': us[-1]['btags'],
              'pause_after': us[-1]['pause_after'], 'sent': us[0]['sent'], 'sent_first': us[0]['sent_start'],
              'list': frac(u['list'] for u in us) >= 0.5, 'aside': frac(u['aside'] for u in us) >= 0.5,
              'paren': frac(u['paren'] for u in us) >= 0.5,
              'key_line': us[0]['key_line'], 'has_number': any(u['cat'] == 'number_amount' for u in us),
              'has_name': any(u['cat'] == 'name' for u in us), 'topic_start': us[0]['topic_start']}
        ph['rate'] = ph['syll'] / max(ph['dur'], 0.05)
        for q, u in enumerate(us):                                          # a word's own syllable rate vs the rest of its phrase
            od, osy = ph['dur'] - u['dur'], ph['syll'] - u['syll']
            u['phrase_final'] = q == len(us) - 1
            u['rate_vs_phrase'] = (u['syll'] / u['dur']) / (osy / od) if od > 0.15 and osy >= 2 and u['syll'] > 0 else None
        e_ = rel[a:b]; sp_ = e_[e_ > CFG['sil_db']]
        ph['db_mean'] = float(10 * np.log10(np.mean(10 ** (sp_ / 10)))) if len(sp_) else None
        ph['db_range'] = float(np.percentile(sp_, 95) - np.percentile(sp_, 10)) if len(sp_) > 10 else None
        wpk = [u['db_max'] for u in us if u['db_max'] is not None and u['cat'] != 'function']
        ph['word_peak_range_db'] = float(max(wpk) - min(wpk)) if len(wpk) >= 2 else None
        la, lb = int(us[-1]['s'] / HOP), int(us[-1]['e'] / HOP) + 1
        lw = rel[la:lb]; lw = lw[lw > CFG['sil_db']]
        rest = rel[a:la]; rest = rest[rest > CFG['sil_db']]
        ph['final_drop_db'] = float(10 * np.log10(np.mean(10 ** (lw / 10))) - 10 * np.log10(np.mean(10 ** (rest / 10)))) \
            if len(lw) > 3 and len(rest) > 10 else None
        tail = rel[max(a, b - int(0.2 / HOP)):b]; tail = tail[tail > CFG['sil_db']]
        ph['last200_drop_db'] = float(10 * np.log10(np.mean(10 ** (tail / 10))) - ph['db_mean']) if len(tail) > 3 and ph['db_mean'] is not None else None
        if okv.sum() >= 10:
            vv, tt = v[okv], tv[okv]
            ph['f0_med'] = float(np.median(vv)) - med_st
            ph['f0_range'] = float(np.percentile(vv, 95) - np.percentile(vv, 5))
            ph['onset'] = float(np.median(vv[:8])) - med_st
            ph['end'] = float(np.median(vv[-8:])) - med_st
            pk = int(np.argmax(vv))
            ph['peak'] = float(vv[pk]) - med_st
            ph['peak_pos'] = float((tt[pk] - s0) / max(e0 - s0, 1e-3))
            ph['slope'] = float(np.polyfit(tt - tt[0], vv, 1)[0]) if tt[-1] - tt[0] > 0.25 else None
            pku = [k for k in idx if units[k]['s'] <= tt[pk] < units[k]['e'] + 1e-9]
            ph['peak_word'] = units[pku[0]]['word'] if pku else None
            # final contour over the last word (or the last 250 ms of voicing)
            lv = trim_blips(stc[la:lb]); lv = lv[~np.isnan(lv)]
            if len(lv) < 8: lv = vv[tt >= tt[-1] - 0.25]
            if len(lv) >= 6:
                k6 = max(2, min(6, len(lv) // 3))
                st0, st1 = float(np.median(lv[:k6])), float(np.median(lv[-k6:]))
                mn, mx = float(lv.min()), float(lv.max())
                dlt = st1 - st0
                if dlt >= T: c = 'fall-rise' if st0 - mn >= T else 'rise'
                elif dlt <= -T: c = 'rise-fall' if mx - st0 >= T else 'fall'
                elif st0 - mn >= T and st1 - mn >= T: c = 'fall-rise'
                elif mx - st0 >= T and mx - st1 >= T: c = 'rise-fall'
                else: c = 'level'
                ph['contour'] = c; ph['final_delta'] = dlt; ph['end_rel_ip'] = st1 - float(np.median(vv))
        # creak at the end: last 150 ms, sounding frames with F0 under 0.65 x median (50 Hz track) or aperiodic
        ca = max(a, b - int(0.15 / HOP))
        snd_fr = rel[ca:b] > -40
        low = (f0low[ca:b] > 0) & (f0low[ca:b] < 0.65 * med_hz)
        aper = np.isnan(stc[ca:b]) & (f0low[ca:b] > 0) & (cent[ca:b] < 2500)
        ph['creak_frames'] = int(np.sum(snd_fr & (low | aper)))
        ph['creak_end'] = ph['creak_frames'] >= 5
        ph['final_low'] = bool(ph['creak_end'] or (ph.get('end_rel_ip') is not None and ph['end_rel_ip'] <= -T))
        h_end = hnr[ca:b]; h_all = hnr[a:b]
        ph['hnr_end_drop'] = float(np.nanmean(h_end) - np.nanmean(h_all)) if np.sum(~np.isnan(h_end)) > 3 and np.sum(~np.isnan(h_all)) > 10 else None
        # emphasis inside the phrase
        cand = [k for k in idx if units[k]['f0_p90'] is not None]
        if len(idx) >= 3 and len(cand) >= 2:
            fk = max(cand, key=lambda k: units[k]['f0_p90'])
            ek = max([k for k in idx if units[k]['db_max'] is not None], key=lambda k: units[k]['db_max'])
            dbm = np.mean([units[k]['db_max'] for k in idx if units[k]['db_max'] is not None])
            for k in idx:
                u = units[k]
                u['f0_rel_ip'] = (u['f0_p90'] - ph['f0_med']) if (u['f0_p90'] is not None and 'f0_med' in ph) else None
                u['db_rel_ip'] = u['db_max'] - dbm if u['db_max'] is not None else None
                u['f0_peak'] = k == fk; u['db_peak'] = k == ek
            ph['f0_peak_word'] = units[fk]['word']; ph['db_peak_word'] = units[ek]['word']
            content = [k for k in idx if units[k]['cat'] != 'function']
            if content:
                units[content[0]]['first_content'] = True; units[content[-1]]['last_content'] = True
        phrases.append(ph)
    # composite prominence -> nucleus per phrase
    def z(vals):
        a = np.array([v for v in vals if v is not None], float)
        return (float(a.mean()), float(a.std() or 1)) if len(a) else (0, 1)
    zf, zd, zs = z(u.get('f0_rel_ip') for u in units), z(u.get('db_rel_ip') for u in units), z(math.log(u['stretch']) for u in units)
    for u in units:
        if u.get('f0_rel_ip') is not None and u.get('db_rel_ip') is not None:
            u['prom'] = ((u['f0_rel_ip'] - zf[0]) / zf[1] + (u['db_rel_ip'] - zd[0]) / zd[1] +
                         (math.log(u['stretch']) - zs[0]) / zs[1]) / 3
    for ph, idx in zip(phrases, ips):
        c = [k for k in idx if units[k].get('prom') is not None]
        if len(idx) >= 3 and c:
            nk = max(c, key=lambda k: units[k]['prom']); units[nk]['nucleus'] = True; ph['nucleus_word'] = units[nk]['word']

    # ---- sentences
    sents = []
    by_s = {}
    for u in units: by_s.setdefault(u['sent'], []).append(u)
    for sid in sorted(by_s):
        us = by_s[sid]
        s0, e0 = us[0]['s'], us[-1]['e']
        inner = sum(u['pause_after'] for u in us[:-1] if u['pause_after'] >= CFG['ip_pause'])
        allp = sum(u['pause_after'] for u in us[:-1])
        sy = sum(u['syll'] for u in us)
        sp_ = [p for p in phrases if p['sent'] == sid]
        sents.append({'sent': sid, 's': s0, 'e': e0, 'n_words': len([t for t in toks if t['sent'] == sid]),
                      'n_timed': len(us), 'syll': sy, 'artic_rate': sy / max(e0 - s0 - inner, 0.05),
                      'speak_rate': sy / max(e0 - s0, 0.05), 'inner_pause': allp, 'n_ips': len(sp_),
                      'text': ' '.join(t['core'] for t in toks if t['sent'] == sid),
                      'topic_start': us[0]['topic_start'], 'key_line': us[0]['key_line'], 'aside': us[0]['aside'],
                      'pause_after': us[-1]['pause_after'], 'bound_after': us[-1]['bound'],
                      'onset': sp_[0].get('onset') if sp_ else None, 'end': sp_[-1].get('end') if sp_ else None,
                      'first_med': sp_[0].get('f0_med') if sp_ else None, 'last_med': sp_[-1].get('f0_med') if sp_ else None})
    for i in range(1, len(sents)):
        a, b = sents[i - 1], sents[i]
        b['reset_vs_prev_end'] = (b['onset'] - a['end']) if (b['onset'] is not None and a['end'] is not None) else None
        b['reset_vs_prev_med'] = (b['first_med'] - a['last_med']) if (b['first_med'] is not None and a['last_med'] is not None) else None

    # ---- pause table
    ptab = []
    for k, b in enumerate(bounds):
        u, v = units[k], units[k + 1]
        ptab.append({'k': k, 'cls': b['cls'], 'tags': b['tags'], 'after': u['word'], 'before': v['word'],
                     'pause': pauses[m[k]]['dur'] if k in m else 0.0, 'breath': pauses[m[k]]['breath'] if k in m else False,
                     'gap': gap_run[k]['dur'] if k in gap_run else 0.0,
                     'breath_dur': pauses[m[k]]['breath_dur'] if k in m else 0.0,
                     't': units[k]['e'], 'last_stretch': u['stretch'], 'last_word': u['word'], 'last_syll': u['syll']})
    unmatched = [p for j, p in enumerate(pauses) if j not in matched_p]

    # ---- voice quality over the take
    voiced = ~np.isnan(stc) & (rel > -35)
    ltas = spec[voiced].mean(0) + 1e-20
    bands = [(lo, lo * 2) for lo in (88.4, 176.8, 353.6, 707.1, 1414.2, 2828.4, 5656.9)]
    bdb = [10 * np.log10(ltas[(fq >= lo) & (fq < hi)].mean()) for lo, hi in bands]
    tilt = float(np.polyfit(np.arange(len(bdb)), bdb, 1)[0])
    alpha = float(10 * np.log10(ltas[(fq >= 1000) & (fq < 5000)].sum() / ltas[(fq >= 50) & (fq < 1000)].sum()))
    hamm = float(10 * np.log10(ltas[(fq < 2000)].max() / ltas[(fq >= 2000) & (fq < 5000)].max()))
    pp = call(snd, 'To PointProcess (periodic, cc)', CFG['f0_floor'], CFG['f0_ceil'])
    jit = call(pp, 'Get jitter (local)', 0, 0, 0.0001, 0.02, 1.3)
    shim = call([snd, pp], 'Get shimmer (local)', 0, 0, 0.0001, 0.02, 1.3, 1.6)
    vq = {'hnr_db_mean': rnd(np.nanmean(hnr)), 'hnr_db_median': rnd(np.nanmedian(hnr)), 'jitter_local_pct': rnd(jit * 100),
          'shimmer_local_pct': rnd(shim * 100), 'tilt_db_per_octave': rnd(tilt), 'alpha_ratio_db': rnd(alpha),
          'hammarberg_db': rnd(hamm), 'centroid_hz_median': rnd(np.median(cent[voiced]), 0),
          'octave_bands_db_re_max': [rnd(b - max(bdb), 1) for b in bdb]}
    vf = stc[~np.isnan(stc)]
    pitch_take = {'median_hz': rnd(med_hz, 1), 'p5_hz': rnd(100 * 2 ** (np.percentile(vf, 5) / 12), 1),
                  'p95_hz': rnd(100 * 2 ** (np.percentile(vf, 95) / 12), 1),
                  'range_p5_p95_st': rnd(np.percentile(vf, 95) - np.percentile(vf, 5), 2),
                  'sd_st': rnd(np.std(vf), 2), 'voiced_frames': int(len(vf))}
    speech_time = last_off - first_on
    long_p = sum(p['dur'] for p in pauses if p['dur'] > CFG['ip_pause'])
    take = {'audio': audio, 'duration_s': rnd(dur_audio), 'speech_span_s': rnd(speech_time), 'first_onset': rnd(first_on),
            'last_offset': rnd(last_off), 'ref_dbfs_p95_frame': rnd(ref_db, 2), 'aligner': 'ctc' if ctc else 'whisper+lag+dp',
            'whisper_minus_audio_s': rnd(whisper_minus_audio), 'ctc_units': sum(u['ctc'] for u in units), 'whisper_lag_s': rnd(glag),
            'whisper_lag_windows': lag_tab, 'whisper_words': len(words), 'hallucinated_dropped': n_halluc,
            'whisper_insertions': [words[j]['w'] for j in inserted],
            'script_tokens': len(toks), 'timed_units': len(units), 'pauses_detected': len(pauses),
            'pauses_matched': len(m), 'pauses_unmatched_intra_word': len(unmatched), 'nonspeech_runs': len(runs_ns),
            'unmatched_pause_durs': [rnd(p['dur']) for p in unmatched],
            'syllables': int(sum(u['syll'] for u in units)), 'pause_total_gt150_s': rnd(long_p),
            'dur_model': {'a_s': rnd(coef[0]), 'b_s_per_syll': rnd(coef[1])},
            'loudness': loudness(audio), 'pitch': pitch_take, 'voice_quality': vq,
            'breaths': [{'s': rnd(p['s']), 'dur': rnd(p['breath_dur']), 'pause': rnd(p['dur']), 'db': rnd(p['breath_db'], 1)}
                        for p in pauses if p['breath']]}
    take['script_style'] = script_style(toks, script_text)
    for u in units:
        for kk in ('ws', 'we'): u.pop(kk, None)
    tables = {'units': [{k: (rnd(v, 4) if isinstance(v, float) else v) for k, v in u.items()} for u in units],
              'pauses': [{k: (rnd(v, 4) if isinstance(v, float) else v) for k, v in p.items()} for p in ptab],
              'phrases': [{k: (rnd(v, 4) if isinstance(v, float) else v) for k, v in p.items()} for p in phrases],
              'sentences': [{k: (rnd(v, 4) if isinstance(v, float) else v) for k, v in s.items()} for s in sents]}
    return take, tables


def script_style(toks, text):
    sents = {}
    for t in toks: sents.setdefault(t['sent'], []).append(t)
    lens = [len(v) for v in sents.values()]
    nw = len(toks)
    low = [t['core'].lower().replace('’', "'") for t in toks]
    openers = {}
    for v in sents.values():
        o = v[0]['opener'] or v[0]['core'].lower()
        openers[o] = openers.get(o, 0) + 1
    digits = sum(1 for t in toks if re.search(r'\d', t['core']))
    numwords = sum(1 for t in low if t in NUMW - {'percent', 'cents', 'dollars', 'dollar', 'half', 'dozen'} and t != 'one')
    caps = {}
    for t in toks: caps.setdefault(t['cap'], []).append(t)
    return {'words': nw, 'sentences': len(sents), 'words_per_sentence': st(lens, 2),
            'ellipses': sum(t['p_ellipsis'] for t in toks), 'ellipses_mid_sentence': sum(t['p_ellipsis'] and not t['sent_end'] for t in toks),
            'ellipses_per_100w': rnd(100 * sum(t['p_ellipsis'] for t in toks) / nw, 2),
            'commas_per_sentence': rnd(sum(t['p_comma'] for t in toks) / len(sents), 2),
            'questions': sum(t['p_question'] for t in toks), 'colons_dashes': sum(t['p_colon'] for t in toks),
            'parentheses': sum('(' in t['lead'] for t in toks),
            'you_per_100w': rnd(100 * sum(w in ('you', 'your', "you're", 'yours', "you'll", "you've") for w in low) / nw, 2),
            'i_my_per_100w': rnd(100 * sum(w in ('i', 'my', 'me', "i'm", "i've", "i'll", 'mine') for w in low) / nw, 2),
            'contractions_per_100w': rnd(100 * sum("'" in w for w in low) / nw, 2),
            'openers': dict(sorted(openers.items(), key=lambda kv: -kv[1])[:15]),
            'numbers_as_digits': digits, 'numbers_as_words': numwords,
            'money_tokens': [t['core'] for t in toks if re.search(r'[$%]', t['core'])],
            'handles': [t['core'] for t in toks if t['core'].startswith('@')],
            'acronyms': sorted({t['core'] for t in toks if len(re.findall(r'[A-Z]', t['core'])) >= 2}),
            'captions_or_paragraphs': len(caps), 'words_per_caption': st([len(v) for v in caps.values()], 2)}


# ---------------------------------------------------------------- summaries (one take or pooled)
def summarise(tables, takes):
    U, P, PH, S = tables['units'], tables['pauses'], tables['phrases'], tables['sentences']
    out = {}
    # A. pace
    span = sum(t['speech_span_s'] for t in takes)
    longp = sum(t['pause_total_gt150_s'] for t in takes)
    syl = sum(u['syll'] for u in U)
    ntok = sum(t['script_tokens'] for t in takes)
    nunits = len(U)
    reg = [s for s in S if s['n_timed'] >= 3]
    A = {'script_words_per_min': rnd(60 * ntok / span, 1), 'timed_words_per_min': rnd(60 * nunits / span, 1),
         'syllables_per_s_overall': rnd(syl / span, 2), 'articulation_syll_per_s': rnd(syl / (span - longp), 2),
         'pause_share_of_time': rnd(sum(p['pause'] for p in P) / span, 3),
         'sentence_artic_rate': st([s['artic_rate'] for s in reg], 2),
         'sentence_rate_cv': rnd(np.std([s['artic_rate'] for s in reg]) / np.mean([s['artic_rate'] for s in reg]), 3),
         'phrase_rate': st([p['rate'] for p in PH if p['n_units'] >= 2], 2)}
    pr = [p for p in PH if p['n_units'] >= 2]
    base = np.median([p['rate'] for p in pr])
    def ratio(sel):
        r = [p['rate'] for p in pr if sel(p)]
        return {'n': len(r), 'rate_median': rnd(np.median(r), 2) if r else None, 'vs_all': rnd(np.median(r) / base, 3) if r else None}
    A['phrase_rate_by_kind'] = {'all': ratio(lambda p: True), 'list_items': ratio(lambda p: p['list']),
                                'asides': ratio(lambda p: p['aside']), 'key_lines': ratio(lambda p: p['key_line']),
                                'with_number': ratio(lambda p: p['has_number']), 'with_name': ratio(lambda p: p['has_name']),
                                'plain': ratio(lambda p: not (p['list'] or p['aside'] or p['key_line'] or p['has_number'] or p['has_name'])),
                                'sentence_first_phrase': ratio(lambda p: p['sent_first']), 'later_phrase': ratio(lambda p: not p['sent_first']),
                                'short_1_3_units': ratio(lambda p: p['n_units'] <= 3), 'long_7plus_units': ratio(lambda p: p['n_units'] >= 7),
                                'hook_first_sentence': ratio(lambda p: p['sent'] == 0),
                                'parenthesis': ratio(lambda p: p.get('paren', False))}
    med = [u for u in U if u['pause_after'] < 0.08 and u['bound'] != 'end']
    def stretch_of(sel, pool=med):
        v = [u['stretch'] for u in pool if sel(u)]
        return {'n': len(v), 'stretch_median': rnd(np.median(v), 3) if v else None}
    A['word_stretch_mid_phrase'] = {c: stretch_of(lambda u, c=c: u['cat'] == c) for c in
                                    ('number_amount', 'name', 'contrast', 'verb', 'content', 'function')}
    A['word_stretch_mid_phrase']['project'] = stretch_of(lambda u: u['is_project'])
    mid_u = [u for u in U if not u.get('phrase_final') and u.get('rate_vs_phrase') is not None]
    def lr(sel):
        v = [u['rate_vs_phrase'] for u in mid_u if sel(u)]
        return {'n': len(v), 'median': rnd(np.median(v), 3) if v else None}
    A['word_rate_vs_rest_of_phrase'] = {c: lr(lambda u, c=c: u['cat'] == c) for c in
                                        ('number_amount', 'name', 'contrast', 'verb', 'content', 'function')}
    A['word_rate_vs_rest_of_phrase']['project'] = lr(lambda u: u['is_project'])
    A['word_rate_vs_rest_of_phrase']['multi_syllable_content'] = lr(lambda u: u['cat'] in ('content', 'verb') and u['syll'] >= 2)
    A['word_rate_vs_rest_of_phrase']['multi_syllable_number'] = lr(lambda u: u['cat'] == 'number_amount' and u['syll'] >= 2)
    A['word_stretch_mid_phrase']['key_marked'] = stretch_of(lambda u: u['key'])
    pre = [u for u in U if u['pause_after'] >= CFG['ip_pause']]
    A['pre_pause_lengthening'] = {
        'stretch_pre_pause_median': rnd(np.median([u['stretch'] for u in pre]), 3),
        'stretch_mid_median': rnd(np.median([u['stretch'] for u in med]), 3),
        'ratio': rnd(np.median([u['stretch'] for u in pre]) / np.median([u['stretch'] for u in med]), 3),
        'by_syllables': {str(k): {'pre': rnd(np.median([u['dur'] for u in pre if u['syll'] == k]), 3),
                                  'mid': rnd(np.median([u['dur'] for u in med if u['syll'] == k]), 3)}
                         for k in (1, 2, 3) if any(u['syll'] == k for u in pre) and any(u['syll'] == k for u in med)}}
    same = []
    wpre, wmid = {}, {}
    for u in pre: wpre.setdefault(u['word'].lower(), []).append(u['dur'])
    for u in med: wmid.setdefault(u['word'].lower(), []).append(u['dur'])
    for w in wpre:
        if w in wmid: same.append(np.median(wpre[w]) / np.median(wmid[w]))
    A['pre_pause_lengthening']['same_word_ratio'] = st(same, 3)
    A['pre_pause_lengthening']['by_class'] = {c: rnd(np.median([u['stretch'] for u in pre if u['bound'] == c]), 3)
                                              for c in CLASSES if sum(u['bound'] == c for u in pre) >= 3}
    out['A_pace'] = A
    # B. pauses
    B = {}
    for c in CLASSES:
        sel = [p for p in P if p['cls'] == c]
        if not sel: continue
        dd = [p['pause'] * 1000 for p in sel if p['pause'] > 0]
        B[c] = {'boundaries': len(sel), 'p_pause_ge80': rnd(len(dd) / len(sel), 3),
                'p_pause_ge150': rnd(sum(p['pause'] >= 0.15 for p in sel) / len(sel), 3),
                'ms_when_paused': st(dd, 0), 'ms_all_incl_zero': st([p['pause'] * 1000 for p in sel], 0),
                'p_gap_ge30': rnd(sum(p['gap'] >= 0.03 for p in sel) / len(sel), 3),
                'gap_ms_all_incl_zero': st([p['gap'] * 1000 for p in sel], 0),
                'gap_ms_when_present': st([p['gap'] * 1000 for p in sel if p['gap'] >= 0.03], 0)}
    tagB = {}
    for tg in ('sentence_end', 'new_topic', 'paragraph', 'ellipsis', 'comma', 'before_number_name', 'list', 'aside_edge', 'caption_start'):
        sel = [p for p in P if tg in p['tags']]
        if sel:
            tagB[tg] = {'boundaries': len(sel), 'p_pause_ge80': rnd(sum(p['pause'] > 0 for p in sel) / len(sel), 3),
                        'ms_when_paused': st([p['pause'] * 1000 for p in sel if p['pause'] > 0], 0)}
    # ellipsis split
    el = [p for p in P if p['cls'] == 'ellipsis']
    tagB['ellipsis_mid_sentence'] = {'n': sum('sentence_end' not in p['tags'] for p in el),
                                     'ms_when_paused': st([p['pause'] * 1000 for p in el if 'sentence_end' not in p['tags'] and p['pause'] > 0], 0)}
    tagB['ellipsis_sentence_end'] = {'n': sum('sentence_end' in p['tags'] for p in el),
                                     'ms_when_paused': st([p['pause'] * 1000 for p in el if 'sentence_end' in p['tags'] and p['pause'] > 0], 0)}
    cm = [p for p in P if p['cls'] == 'comma']
    tagB['comma_in_list'] = {'ms_when_paused': st([p['pause'] * 1000 for p in cm if 'list' in p['tags'] and p['pause'] > 0], 0),
                             'p_pause': frac(p['pause'] > 0 for p in cm if 'list' in p['tags'])}
    tagB['comma_not_list'] = {'ms_when_paused': st([p['pause'] * 1000 for p in cm if 'list' not in p['tags'] and p['pause'] > 0], 0),
                              'p_pause': frac(p['pause'] > 0 for p in cm if 'list' not in p['tags'])}
    tagB['comma_before_number_name'] = {'ms_when_paused': st([p['pause'] * 1000 for p in cm if 'before_number_name' in p['tags'] and p['pause'] > 0], 0)}
    B['_by_tag'] = tagB
    br = [b for t in takes for b in t['breaths']]
    B['_breaths'] = {'count': len(br), 'per_min': rnd(60 * len(br) / span, 2), 'items': br,
                     'paused_boundaries_with_breath': sum(p['breath'] for p in P)}
    B['_all_pauses_ms'] = st([p['pause'] * 1000 for p in P if p['pause'] > 0], 0)
    out['B_pauses'] = B
    # C. pitch
    phv = [p for p in PH if p.get('f0_med') is not None]
    C = {'take_pitch': [t['pitch'] for t in takes],
         'median_hz': rnd(np.mean([t['pitch']['median_hz'] for t in takes]), 1),
         'range_p5_p95_st': rnd(np.mean([t['pitch']['range_p5_p95_st'] for t in takes]), 2),
         'sd_st': rnd(np.mean([t['pitch']['sd_st'] for t in takes]), 2),
         'phrase_onset_st': st([p['onset'] for p in phv], 2), 'phrase_peak_st': st([p['peak'] for p in phv], 2),
         'phrase_end_st': st([p['end'] for p in phv], 2), 'phrase_peak_pos': st([p['peak_pos'] for p in phv], 3),
         'phrase_range_st': st([p['f0_range'] for p in phv], 2),
         'declination_st_per_s': st([p['slope'] for p in phv if p.get('slope') is not None], 2),
         'declination_long_phrases_st_per_s': st([p['slope'] for p in phv if p.get('slope') is not None and p['dur'] >= 1.0], 2)}
    groups = {'full_stop': lambda p: p['bound'] in ('sentence', 'new_topic'), 'comma': lambda p: p['bound'] == 'comma',
              'question': lambda p: p['bound'] == 'question', 'ellipsis_mid': lambda p: p['bound'] == 'ellipsis' and 'sentence_end' not in p['btags'],
              'ellipsis_end': lambda p: p['bound'] == 'ellipsis' and 'sentence_end' in p['btags'],
              'colon_dash': lambda p: p['bound'] == 'colon_dash', 'list_item': lambda p: p['list'] and p['bound'] == 'comma',
              'no_punct_pause': lambda p: p['bound'] in ('none', 'before_number_name'), 'take_end': lambda p: p['bound'] == 'end'}
    fc = {}
    for g, sel in groups.items():
        ps = [p for p in phv if sel(p) and p.get('contour')]
        if not ps: continue
        cnt = {}
        for p in ps: cnt[p['contour']] = cnt.get(p['contour'], 0) + 1
        fc[g] = {'n': len(ps), 'counts': cnt, 'probs': {k: rnd(v / len(ps), 3) for k, v in cnt.items()},
                 'p_low_or_creaky_end': frac(p['final_low'] for p in ps), 'p_creaky_end': frac(p['creak_end'] for p in ps),
                 'final_delta_st': st([p['final_delta'] for p in ps], 2), 'end_vs_phrase_median_st': st([p['end_rel_ip'] for p in ps], 2)}
    C['final_contours'] = fc
    dec = [p for p in phv if p['bound'] in ('sentence', 'new_topic') and p.get('contour')]
    C['upspeak_rate_full_stops'] = frac(p['contour'] in ('rise', 'fall-rise') and p['end_rel_ip'] > 0 for p in dec)
    C['rise_rate_all_phrases'] = frac(p.get('contour') in ('rise', 'fall-rise') for p in phv if p.get('contour'))
    rs = [s for s in S if s.get('reset_vs_prev_end') is not None]
    C['sentence_reset_st'] = {'onset_minus_prev_end': st([s['reset_vs_prev_end'] for s in rs], 2),
                              'first_phrase_minus_prev_last_phrase_median': st([s['reset_vs_prev_med'] for s in rs if s.get('reset_vs_prev_med') is not None], 2),
                              'at_new_topic': st([s['reset_vs_prev_end'] for s in rs if s['topic_start']], 2)}
    C['phrase_onset_first_vs_later_in_sentence'] = {'first': st([p['onset'] for p in phv if p['sent_first']], 2),
                                                    'later': st([p['onset'] for p in phv if not p['sent_first']], 2)}
    out['C_pitch'] = C
    # D. emphasis
    E_units = [u for u in U if u.get('f0_rel_ip') is not None and u.get('db_rel_ip') is not None]
    cats = ['number_amount', 'name', 'contrast', 'verb', 'content', 'function']
    D = {}
    nphr = len({(u.get('take'), u['ip']) for u in E_units if u.get('f0_peak')})
    for kind in ('f0_peak', 'db_peak', 'nucleus'):
        pk = [u for u in E_units if u.get(kind)]
        tab = {}
        for c in cats + ['project', 'first_content', 'last_content', 'key_marked']:
            sel = (lambda u, c=c: u['cat'] == c) if c in cats else (lambda u: u['is_project']) if c == 'project' else \
                (lambda u, c=c: u.get(c)) if c != 'key_marked' else (lambda u: u['key'])
            n_all = sum(1 for u in E_units if sel(u)); n_pk = sum(1 for u in pk if sel(u))
            if n_all == 0: continue
            tab[c] = {'share_of_peaks': rnd(n_pk / max(len(pk), 1), 3), 'base_share': rnd(n_all / len(E_units), 3),
                      'lift': rnd((n_pk / max(len(pk), 1)) / (n_all / len(E_units)), 2), 'p_word_is_peak': rnd(n_pk / n_all, 3)}
        D[kind] = {'n_phrases': len(pk), 'by_category': tab}
    strength = {}
    for c in cats + ['project', 'key_marked']:
        sel = (lambda u, c=c: u['cat'] == c) if c in cats else (lambda u: u['is_project']) if c == 'project' else (lambda u: u['key'])
        us = [u for u in E_units if sel(u)]
        if not us: continue
        strength[c] = {'n': len(us), 'f0_st_above_phrase_median': st([u['f0_rel_ip'] for u in us], 2),
                       'db_above_phrase_word_mean': st([u['db_rel_ip'] for u in us], 2),
                       'stretch': st([u['stretch'] for u in us if u['pause_after'] < 0.08], 3)}
    D['strength_by_category'] = strength
    pk = [u for u in E_units if u.get('nucleus')]
    D['nucleus_strength'] = {'f0_st_above_phrase_median': st([u['f0_rel_ip'] for u in pk], 2),
                             'db_above_phrase_word_mean': st([u['db_rel_ip'] for u in pk], 2),
                             'stretch': st([u['stretch'] for u in pk], 3)}
    # where in the phrase the F0 peak word sits (0 = first word, 1 = last)
    ph_units = {}
    for u in E_units: ph_units.setdefault((u.get('take'), u['ip']), []).append(u)
    rel_pos = []
    for k, us in ph_units.items():
        for i, u in enumerate(us):
            if u.get('f0_peak') and len(us) > 1: rel_pos.append(i / (len(us) - 1))
    D['f0_peak_word_position'] = st(rel_pos, 3)
    D['f0_and_db_peak_same_word'] = frac(u.get('db_peak') for u in E_units if u.get('f0_peak'))
    out['D_emphasis'] = D
    # E. energy
    E = {'loudness': [t['loudness'] for t in takes],
         'integrated_lufs_mean': rnd(np.mean([t['loudness']['integrated_lufs'] for t in takes]), 2),
         'phrase_db_range_p95_p10': st([p['db_range'] for p in PH if p.get('db_range') is not None], 2),
         'phrase_content_word_peak_range_db': st([p['word_peak_range_db'] for p in PH if p.get('word_peak_range_db') is not None], 2),
         'phrase_final_word_drop_db': st([p['final_drop_db'] for p in PH if p.get('final_drop_db') is not None], 2),
         'phrase_last200ms_drop_db': st([p['last200_drop_db'] for p in PH if p.get('last200_drop_db') is not None], 2),
         'final_drop_by_boundary': {c: st([p['final_drop_db'] for p in PH if p['bound'] == c and p.get('final_drop_db') is not None], 2)
                                    for c in CLASSES + ['end'] if sum(p['bound'] == c and p.get('final_drop_db') is not None for p in PH) >= 3},
         'phrase_level_db_sd': rnd(np.std([p['db_mean'] for p in PH if p.get('db_mean') is not None]), 2),
         'creaky_end_rate': frac(p['creak_end'] for p in PH),
         'creaky_end_by_boundary': {c: frac(p['creak_end'] for p in PH if p['bound'] == c) for c in CLASSES + ['end']
                                    if any(p['bound'] == c for p in PH)},
         'hnr_end_drop_db': st([p['hnr_end_drop'] for p in PH if p.get('hnr_end_drop') is not None], 2),
         'voice_quality': [t['voice_quality'] for t in takes]}
    out['E_energy'] = E
    out['F_tokens'] = token_report(U, P, PH, S)
    return out


def token_report(U, P, PH, S):
    F = {}
    def u_info(u):
        return {'take': u.get('take'), 'word': u['word'], 'said': u['said'], 'syll': u['syll'], 'dur': u['dur'],
                'stretch': u['stretch'], 'pause_before_ms': rnd(u['pause_before'] * 1000, 0), 'pause_after_ms': rnd(u['pause_after'] * 1000, 0),
                'f0_st_vs_phrase': u.get('f0_rel_ip'), 'db_vs_phrase': u.get('db_rel_ip'), 'f0_peak': bool(u.get('f0_peak')),
                'nucleus': bool(u.get('nucleus'))}
    F['money_percent'] = [u_info(u) for u in U if re.search(r'[$%]', u['word']) or re.search(r'cents|dollar|percent', u['said'], re.I)]
    F['plain_numbers'] = [u_info(u) for u in U if re.fullmatch(r'[\d.,]+', u['word'])]
    F['acronyms_terms'] = [u_info(u) for u in U if len(re.findall(r'[A-Z]', u['word'])) >= 2 and not u['word'].startswith('@')]
    F['handles'] = [u_info(u) for u in U if u['word'].startswith('@')]
    F['anyways'] = [u_info(u) for u in U if u['word'].lower().startswith('anyway')]
    so = [u for u in U if u['sent_start'] and u['word'].lower() == 'so']
    F['so_openers'] = [u_info(u) for u in so]
    ph = {(p.get('take'), p['ip']): p for p in PH}
    F['ellipses'] = [{'take': p.get('take'), 'before': p['text'][-40:], 'pause_ms': rnd(p['pause_after'] * 1000, 0),
                      'sentence_end': 'sentence_end' in p['btags'], 'contour': p.get('contour'), 'final_delta_st': rnd(p.get('final_delta'), 2),
                      'end_vs_phrase_st': rnd(p.get('end_rel_ip'), 2), 'final_drop_db': rnd(p.get('final_drop_db'), 2), 'creak': p['creak_end']}
                     for p in PH if p['bound'] == 'ellipsis']
    F['questions'] = [{'take': p.get('take'), 'text': p['text'], 'contour': p.get('contour'), 'final_delta_st': rnd(p.get('final_delta'), 2)}
                      for p in PH if p['bound'] == 'question']
    F['asides'] = [{'take': p.get('take'), 'text': p['text'], 'rate': rnd(p['rate'], 2), 'f0_med_st': rnd(p.get('f0_med'), 2),
                    'db_mean': rnd(p['db_mean'], 2), 'contour': p.get('contour')} for p in PH if p['aside']]
    F['list_items'] = [{'take': p.get('take'), 'text': p['text'], 'bound': p['bound'], 'pause_ms': rnd(p['pause_after'] * 1000, 0),
                        'contour': p.get('contour'), 'rate': rnd(p['rate'], 2)} for p in PH if p['list']]
    def ctx(sel):
        return {'f0_med_st': st([p['f0_med'] for p in PH if sel(p) and p.get('f0_med') is not None], 2),
                'db_mean': st([p['db_mean'] for p in PH if sel(p) and p.get('db_mean') is not None], 2),
                'rate': st([p['rate'] for p in PH if sel(p) and p['n_units'] >= 2], 2)}
    F['aside_vs_main'] = {'aside': ctx(lambda p: p['aside']), 'main': ctx(lambda p: not p['aside'])}
    return F


def compare(summary, prof):
    rows = []
    def add(name, val, tgt):
        if val is None or tgt is None: return
        if isinstance(tgt, dict):
            m, sd = tgt.get('mean', tgt.get('median')), tgt.get('sd', tgt.get('sentence_sd'))
        else: m, sd = tgt, None
        if m is None: return
        zz = (val - m) / sd if sd else None
        rows.append({'metric': name, 'take': rnd(val, 3), 'target': rnd(m, 3), 'sd': rnd(sd, 3), 'z': rnd(zz, 2)})
    A, B, C, D, E = (summary[k] for k in ('A_pace', 'B_pauses', 'C_pitch', 'D_emphasis', 'E_energy'))
    R = prof['rate']
    add('articulation syll/s', A['articulation_syll_per_s'], R['articulation_syll_per_s'])
    add('script words/min', A['script_words_per_min'], R['script_words_per_min'])
    add('pause share of time', A['pause_share_of_time'], R['pause_share_of_time'])
    for c, v in B.items():
        if c.startswith('_'): continue
        t = prof['pauses_ms'].get(c)
        if t and v['ms_when_paused'].get('n'):
            add(f'pause ms {c}', v['ms_when_paused']['mean'], t)
            add(f'p(pause) {c}', v['p_pause_ge80'], t['p_pause'])
    Pp = prof['pitch']
    add('F0 median Hz', C['median_hz'], Pp['median_hz'])
    add('F0 range p5-p95 st', C['range_p5_p95_st'], Pp['range_p5_p95_st'])
    add('F0 sd st', C['sd_st'], Pp['sd_st'])
    add('declination st/s', C['declination_st_per_s'].get('median'), Pp['declination_st_per_s'])
    for g in ('full_stop', 'comma', 'ellipsis_end', 'ellipsis_mid'):
        if g in C['final_contours'] and g in Pp['final_contours']:
            add(f'p(fall) {g}', C['final_contours'][g]['probs'].get('fall', 0), Pp['final_contours'][g].get('fall', 0))
    add('reset st', C['sentence_reset_st']['onset_minus_prev_end'].get('mean'), Pp['sentence_reset_st'])
    for c, v in D['strength_by_category'].items():
        t = prof['emphasis']['by_category'].get(c)
        if t: add(f'emphasis st {c}', v['f0_st_above_phrase_median'].get('mean'), t['f0_st'])
    En = prof['energy']
    add('final word drop dB', E['phrase_final_word_drop_db'].get('mean'), En['phrase_final_word_drop_db'])
    add('phrase dB range', E['phrase_db_range_p95_p10'].get('mean'), En['phrase_db_range_db'])
    add('creaky ends', E['creaky_end_rate'], En['creaky_end_rate'])
    add('LUFS', E['integrated_lufs_mean'], En['loudness_lufs'])
    return rows


def build_profile(summary, takes, voice):
    """Pooled summary -> compact, machine-readable delivery targets."""
    A, B, C, D, E, F = (summary[k] for k in ('A_pace', 'B_pauses', 'C_pitch', 'D_emphasis', 'E_energy', 'F_tokens'))
    pause = {}
    for c in CLASSES:
        if c in B:
            w = B[c]['ms_when_paused']
            pause[c] = {'n_boundaries': B[c]['boundaries'], 'p_pause': B[c]['p_pause_ge80'], 'mean': w.get('mean'), 'sd': w.get('sd'),
                        'median': w.get('median'), 'p10': w.get('p10'), 'p90': w.get('p90'),
                        'p_gap_ge30': B[c]['p_gap_ge30'], 'gap_mean_incl_zero': B[c]['gap_ms_all_incl_zero'].get('mean')}
    T = B['_by_tag']
    for k in ('ellipsis_mid_sentence', 'ellipsis_sentence_end', 'comma_in_list', 'comma_not_list', 'comma_before_number_name'):
        w = T[k]['ms_when_paused']
        if w.get('n'): pause[k] = {'mean': w['mean'], 'sd': w['sd'], 'median': w['median'], 'n': w['n'], 'p_pause': T[k].get('p_pause')}
    for k in ('paragraph', 'new_topic', 'sentence_end'):
        if k in T and T[k]['ms_when_paused'].get('n'):
            w = T[k]['ms_when_paused']; pause['any_' + k] = {'mean': w['mean'], 'sd': w['sd'], 'median': w['median'], 'n': w['n']}
    lr = A['word_rate_vs_rest_of_phrase']
    pk = A['phrase_rate_by_kind']
    cats = D['strength_by_category']
    def med(lst, key):
        v = [r[key] for r in lst if r.get(key) is not None]
        return rnd(np.median(v), 3) if v else None
    money = F['money_percent']; nums = F['plain_numbers']; acr = F['acronyms_terms']
    prof = {
        'voice': voice,
        'scope': 'Delivery only: pace, pauses, melody, emphasis, energy, phrasing, script style. Not timbre; do not clone the voice.',
        'takes': [{'label': t.get('label'), 'audio': t['audio'], 'duration_s': t['duration_s'], 'aligner': t.get('aligner')} for t in takes],
        'measured_with': 'templates/voice/lara-delivery/measure.py',
        'units': 'ms for pauses; st = semitones (pitch re the take median); dB re the take; stretch = duration / expected for its syllables',
        'rate': {
            'articulation_syll_per_s': {'mean': A['articulation_syll_per_s'], 'sentence_sd': A['sentence_artic_rate'].get('sd'),
                                        'sentence_p10': A['sentence_artic_rate'].get('p10'), 'sentence_p90': A['sentence_artic_rate'].get('p90')},
            'syllables_per_s_incl_pauses': A['syllables_per_s_overall'], 'script_words_per_min': A['script_words_per_min'],
            'pause_share_of_time': A['pause_share_of_time'], 'sentence_rate_cv': A['sentence_rate_cv'],
            'phrase_rate_factor': {k: v['vs_all'] for k, v in pk.items() if v['vs_all'] is not None and k != 'all'},
            'word_rate_vs_rest_of_phrase': {k: v['median'] for k, v in lr.items() if v['median'] is not None},
            'number_name_duration_factor': {
                'numbers_vs_multisyllable_content': rnd(lr['multi_syllable_content']['median'] / lr['multi_syllable_number']['median'], 3)
                if lr['multi_syllable_content']['median'] and lr['multi_syllable_number']['median'] else None,
                'names_vs_content': rnd(lr['content']['median'] / lr['name']['median'], 3) if lr['content']['median'] and lr['name']['median'] else None,
                'note': 'per-syllable duration of numbers / names mid-phrase vs comparable content words; 1 = same, < 1 = faster, > 1 = slowed'},
            'pre_pause_lengthening': {'stretch_ratio': A['pre_pause_lengthening']['ratio'],
                                      'same_word_ratio': A['pre_pause_lengthening']['same_word_ratio'].get('median'),
                                      'by_class': A['pre_pause_lengthening']['by_class'],
                                      'one_syllable_word_s': A['pre_pause_lengthening']['by_syllables'].get('1')}},
        'pauses_ms': pause,
        'breaths_per_min': B['_breaths']['per_min'],
        'pitch': {'median_hz': C['median_hz'], 'range_p5_p95_st': C['range_p5_p95_st'], 'sd_st': C['sd_st'],
                  'phrase_onset_st': C['phrase_onset_st'].get('median'), 'phrase_peak_st': C['phrase_peak_st'].get('median'),
                  'phrase_end_st': C['phrase_end_st'].get('median'), 'phrase_peak_position': C['phrase_peak_pos'].get('median'),
                  'phrase_range_st': C['phrase_range_st'].get('median'),
                  'declination_st_per_s': {'median': C['declination_st_per_s'].get('median'), 'sd': C['declination_st_per_s'].get('sd')},
                  'sentence_reset_st': {'mean': C['sentence_reset_st']['onset_minus_prev_end'].get('mean'),
                                        'sd': C['sentence_reset_st']['onset_minus_prev_end'].get('sd'),
                                        'at_new_topic': C['sentence_reset_st']['at_new_topic'].get('mean')},
                  'final_contours': {g: dict(v['probs'], n=v['n'], p_low_or_creaky_end=v['p_low_or_creaky_end'], p_creaky_end=v['p_creaky_end'],
                                             final_delta_st_median=v['final_delta_st'].get('median'),
                                             end_vs_phrase_median_st=v['end_vs_phrase_median_st'].get('median'))
                                     for g, v in C['final_contours'].items()},
                  'upspeak_rate_full_stops': C['upspeak_rate_full_stops']},
        'emphasis': {
            'by_category': {c: {'n': v['n'], 'p_is_phrase_f0_peak': D['f0_peak']['by_category'].get(c, {}).get('p_word_is_peak'),
                                'lift_f0_peak': D['f0_peak']['by_category'].get(c, {}).get('lift'),
                                'lift_energy_peak': D['db_peak']['by_category'].get(c, {}).get('lift'),
                                'f0_st': {'mean': v['f0_st_above_phrase_median'].get('mean'), 'sd': v['f0_st_above_phrase_median'].get('sd')},
                                'db': v['db_above_phrase_word_mean'].get('mean'), 'stretch': v['stretch'].get('median')}
                            for c, v in cats.items()},
            'position': {'first_content_word_is_f0_peak': D['f0_peak']['by_category'].get('first_content', {}).get('p_word_is_peak'),
                         'last_content_word_is_f0_peak': D['f0_peak']['by_category'].get('last_content', {}).get('p_word_is_peak'),
                         'f0_peak_word_position_median': D['f0_peak_word_position'].get('median')},
            'nucleus': {'f0_st': D['nucleus_strength']['f0_st_above_phrase_median'].get('mean'),
                        'db': D['nucleus_strength']['db_above_phrase_word_mean'].get('mean'),
                        'stretch': D['nucleus_strength']['stretch'].get('median')},
            'f0_and_energy_peak_same_word': D['f0_and_db_peak_same_word']},
        'energy': {'loudness_lufs': E['integrated_lufs_mean'], 'take_loudness': E['loudness'],
                   'phrase_db_range_db': {'mean': E['phrase_db_range_p95_p10'].get('mean'), 'sd': E['phrase_db_range_p95_p10'].get('sd')},
                   'phrase_content_word_peak_range_db': E['phrase_content_word_peak_range_db'].get('median'),
                   'phrase_final_word_drop_db': {'mean': E['phrase_final_word_drop_db'].get('mean'), 'sd': E['phrase_final_word_drop_db'].get('sd')},
                   'final_drop_by_boundary_db': {k: v.get('mean') for k, v in E['final_drop_by_boundary'].items()},
                   'phrase_last200ms_drop_db': E['phrase_last200ms_drop_db'].get('mean'),
                   'phrase_level_sd_db': E['phrase_level_db_sd'], 'creaky_end_rate': E['creaky_end_rate'],
                   'voice_quality_mean': {k: rnd(np.mean([vq[k] for vq in E['voice_quality']]), 2)
                                          for k in ('hnr_db_mean', 'jitter_local_pct', 'shimmer_local_pct', 'tilt_db_per_octave',
                                                    'alpha_ratio_db', 'hammarberg_db', 'centroid_hz_median')}},
        'tokens': {
            'money_percent': {'n': len(money), 'stretch_median': med(money, 'stretch'), 'f0_st_vs_phrase_median': med(money, 'f0_st_vs_phrase'),
                              'p_pause_before': frac((r['pause_before_ms'] or 0) > 0 for r in money),
                              'spoken': sorted({f"{r['word']} -> {r['said']}" for r in money})[:40]},
            'plain_numbers': {'n': len(nums), 'stretch_median': med(nums, 'stretch'), 'f0_st_vs_phrase_median': med(nums, 'f0_st_vs_phrase'),
                              'p_pause_before': frac((r['pause_before_ms'] or 0) > 0 for r in nums),
                              'spoken': sorted({f"{r['word']} -> {r['said']}" for r in nums})},
            'acronyms': {'n': len(acr), 'spoken': sorted({f"{r['word']} -> {r['said']}" for r in acr}), 'stretch_median': med(acr, 'stretch')},
            'handles': [{'written': r['word'], 'said': r['said'], 'pause_before_ms': r['pause_before_ms'], 'f0_st_vs_phrase': rnd(r['f0_st_vs_phrase'], 2)} for r in F['handles']],
            'anyways': [{'pause_before_ms': r['pause_before_ms'], 'dur_s': rnd(r['dur'], 2)} for r in F['anyways']],
            'so_openers': {'n': len(F['so_openers']), 'pause_before_ms_median': med(F['so_openers'], 'pause_before_ms'),
                           'pause_after_ms_median': med(F['so_openers'], 'pause_after_ms'), 'f0_st_vs_phrase_median': med(F['so_openers'], 'f0_st_vs_phrase')},
            'ellipses': {'n': len(F['ellipses']), 'pause_ms_median': med(F['ellipses'], 'pause_ms'),
                         'contours': {c: sum(r['contour'] == c for r in F['ellipses']) for c in {r['contour'] for r in F['ellipses']}},
                         'final_drop_db_median': med(F['ellipses'], 'final_drop_db')},
            'aside_vs_main': {k: {kk: vv.get('median') for kk, vv in v.items()} for k, v in F['aside_vs_main'].items()}},
    }
    pz, pi, em = prof['pauses_ms'], prof['pitch'], prof['emphasis']['by_category']
    g = lambda d, *ks: (lambda v: v)(d.get(ks[0], {}).get(ks[1]) if len(ks) == 2 else d.get(ks[0]))
    prof['tts_targets'] = {
        'note': 'The few numbers a synthesis pipeline needs; everything above is the evidence.',
        'break_ms': {'sentence': g(pz, 'sentence', 'median'), 'new_topic_or_paragraph': g(pz, 'any_new_topic', 'median'),
                     'ellipsis': g(pz, 'ellipsis', 'median'), 'colon_dash': g(pz, 'colon_dash', 'median'),
                     'comma': {'p_break': g(pz, 'comma', 'p_pause'), 'ms_when_break': g(pz, 'comma', 'median'),
                               'otherwise_micro_gap_ms': '30-80'},
                     'comma_before_number_or_name': g(pz, 'comma_before_number_name', 'median'),
                     'unpunctuated_word_gap': 0},
        'pause_sd_ms': {'sentence': g(pz, 'sentence', 'sd'), 'new_topic': g(pz, 'new_topic', 'sd'), 'ellipsis': g(pz, 'ellipsis', 'sd'),
                        'comma': g(pz, 'comma', 'sd')},
        'articulation_syll_per_s': prof['rate']['articulation_syll_per_s']['mean'],
        'script_words_per_min': prof['rate']['script_words_per_min'],
        'final_word_stretch_before_pause': prof['rate']['pre_pause_lengthening']['stretch_ratio'],
        'aside_rate_factor': prof['rate']['phrase_rate_factor'].get('asides'),
        'parenthesis_rate_factor': prof['rate']['phrase_rate_factor'].get('parenthesis'),
        'numbers_names_slow_down': 'none (spoken at or above the rate of other content words); mark them with pitch and level instead',
        'f0': {'range_p5_p95_st': pi['range_p5_p95_st'], 'sd_st': pi['sd_st'], 'phrase_peak_st_above_median': pi['phrase_peak_st'],
               'phrase_peak_position': pi['phrase_peak_position'], 'phrase_end_st': pi['phrase_end_st'],
               'declination_st_per_s': pi['declination_st_per_s']['median'], 'sentence_reset_st': pi['sentence_reset_st']['mean'],
               'reference_median_hz': pi['median_hz'], 'keep_target_voice_median': True},
        'final_contour_probs': {k: {kk: vv for kk, vv in v.items() if kk in ('fall', 'level', 'rise', 'fall-rise', 'rise-fall', 'p_low_or_creaky_end')}
                                for k, v in pi['final_contours'].items() if k in ('full_stop', 'comma', 'ellipsis_mid', 'ellipsis_end', 'list_item', 'colon_dash')},
        'emphasis_st_db': {c: {'st': v['f0_st']['mean'], 'db': v['db'], 'p_peak': v['p_is_phrase_f0_peak']} for c, v in em.items()},
        'emphasis_rule': 'pitch peak on the first content word of the phrase (or a project name / number / contrast word in it), then a steady fall',
        'phrase_final_drop_db': prof['energy']['phrase_final_word_drop_db']['mean'],
        'phrase_level_sd_db': prof['energy']['phrase_level_sd_db'],
        'creaky_end_rate': prof['energy']['creaky_end_rate'],
        'raw_voice_loudness_lufs': prof['energy']['loudness_lufs'],
        'breaths_per_min': prof['breaths_per_min']}
    return prof


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('args', nargs='*')
    ap.add_argument('--pool', action='store_true')
    ap.add_argument('--profile')
    ap.add_argument('--summary-out', dest='summary_out', help='pool mode: also write the full pooled summary here')
    ap.add_argument('--voice', default='unnamed voice')
    ap.add_argument('--compare')
    ap.add_argument('--project')
    ap.add_argument('--label')
    ap.add_argument('--aligner', default='auto', choices=['auto', 'ctc', 'whisper'])
    o = ap.parse_args()
    if o.pool:
        takes, tables = [], {'units': [], 'pauses': [], 'phrases': [], 'sentences': []}
        per = {}
        for i, path in enumerate(o.args):
            d = json.load(open(path))
            lab = d['take'].get('label') or f't{i}'
            d['take']['label'] = lab
            takes.append(d['take'])
            for k in tables:
                for row in d['tables'][k]: row['take'] = lab; tables[k].append(row)
            per[lab] = d['summary']
        summ = summarise(tables, takes)
        prof = build_profile(summ, takes, o.voice)
        prof['script_style'] = {t['label']: t['script_style'] for t in takes}
        prof['per_take'] = {lab: {'articulation_syll_per_s': v['A_pace']['articulation_syll_per_s'],
                                  'script_words_per_min': v['A_pace']['script_words_per_min'],
                                  'pause_share_of_time': v['A_pace']['pause_share_of_time'],
                                  'f0_median_hz': v['C_pitch']['median_hz'], 'f0_range_p5_p95_st': v['C_pitch']['range_p5_p95_st'],
                                  'f0_sd_st': v['C_pitch']['sd_st'], 'lufs': v['E_energy']['integrated_lufs_mean'],
                                  'pause_ms_median': {c: v['B_pauses'][c]['ms_when_paused'].get('median') for c in CLASSES if c in v['B_pauses']},
                                  'p_pause': {c: v['B_pauses'][c]['p_pause_ge80'] for c in CLASSES if c in v['B_pauses']}}
                            for lab, v in per.items()}
        json.dump(prof, open(o.profile, 'w'), indent=1)
        if o.summary_out: json.dump(summ, open(o.summary_out, 'w'), indent=1)
        print('profile ->', o.profile)
        return
    audio, words, script, out = o.args
    take, tables = measure(audio, words, script, o.project, o.aligner)
    take['label'] = o.label or re.sub(r'\.json$', '', out.split('/')[-1])
    for k in tables:
        for row in tables[k]: row['take'] = take['label']
    summ = summarise(tables, [take])
    res = {'take': take, 'summary': summ, 'tables': tables, 'config': CFG}
    if o.compare:
        prof = json.load(open(o.compare))
        res['compare'] = compare(summ, prof)
        print(f"{'metric':34s} {'take':>9s} {'target':>9s} {'z':>6s}")
        for r in res['compare']:
            print(f"{r['metric']:34s} {r['take']:>9} {r['target']:>9} {'' if r['z'] is None else r['z']:>6}")
    json.dump(res, open(out, 'w'), indent=1, default=lambda v: v.item() if hasattr(v, 'item') else str(v))
    A = summ['A_pace']; C = summ['C_pitch']
    print(f"{take['label']}: {take['timed_units']}/{take['script_tokens']} tokens timed ({take['aligner']}; whisper onsets {take['whisper_minus_audio_s']} s off), "
          f"{take['pauses_matched']} pauses matched, {take['pauses_unmatched_intra_word']} inside words; "
          f"artic {A['articulation_syll_per_s']} syl/s, {A['script_words_per_min']} wpm; F0 {C['median_hz']} Hz, "
          f"range {C['range_p5_p95_st']} st -> {out}")


if __name__ == '__main__':
    main()
