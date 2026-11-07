#!/usr/bin/env python3
"""House voice: Kokoro-82M (Apache-2.0) with the channel's delivery profile imposed inside the model.

The delivery targets (pace, pauses by punctuation, phrase melody, emphasis, energy) come from
templates/voice/lara-delivery/profile.json (tts_targets). Only DELIVERY is reproduced; the timbre is a stock
Kokoro voice and nothing here is trained on, matched to or derived from any reference recording.

  python house_voice.py --text script.txt --out out.wav [--voice af_heart] [--profile profile.json]
                        [--project "Primus,Bagel"] [--plain] [--knobs '{"rate": 4.5}'] [--words out.words.json]

Writes a 24 kHz mono wav at -20 LUFS and <out>.words.json ([{"s", "e", "w"}], from Kokoro's own durations).
--plain renders the same text with stock Kokoro (no prosody edits) for baselines.
Script markup: blank line or line break = new paragraph, "..." or "…" = ellipsis, *word* = key word (emphasis),
(parentheses) = aside. Runs in the TTS venv (kokoro>=0.9.4, torch CPU); needs ffmpeg for the loudness pass.

How (per sentence chunk, all inside KModel):
  1. misaki G2P -> phoneme ids; the duration predictor gives float frames (25 ms each) per phoneme.
  2. Durations: one global scale to the target articulation rate, pre-pause word stretched (last rhyme most),
     asides and numbers faster, punctuation tokens set to the pause class (comma rule is deterministic).
  3. F0/N predictor runs on the edited alignment, so the model re-plans its own melody for the new timing.
  4. F0 (12.5 ms frames, log domain): per phrase the model's linear trend is swapped for the profile template
     (onset -> early peak on the first content / emphasised word -> steady fall -> class-dependent end),
     the model's own local movement is kept (scaled), emphasis bumps added, re-centred on the voice's own median.
  5. Decoder -> audio; word gain envelope (emphasis up, phrase-final word down); pauses made exact by cutting in
     the silent part of each pause token and inserting digital silence (faded, no clicks); -20 LUFS.
"""
import argparse, hashlib, json, math, os, re, subprocess, sys, tempfile, time

os.environ.setdefault('HF_HUB_OFFLINE', '1')
import numpy as np
import soundfile as sf
import torch

SR = 24000
HOP = 600            # audio samples per duration frame (25 ms)
FHOP = 300           # samples per F0/N frame (12.5 ms)
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PROFILE = os.path.join(HERE, '..', '..', 'templates', 'voice', 'lara-delivery', 'profile.json')

# Knobs (final tuned values; override with --knobs JSON). Pauses/rates default from the profile.
KNOBS = dict(
    rate=4.51,             # target articulation, syllables/s (profile); rate_trim corrects our syllable proxy
    rate_trim=0.93,
    final_stretch=1.55,    # duration factor on the pre-pause word's last rhyme (Kokoro already lengthens some)
    final_pre_stretch=1.05,  # rest of the pre-pause word
    aside_speed=1.15,      # asides / parentheses faster
    number_speed=1.08,     # numbers spoken at or above the rate of other content words
    pause_jitter=0.6,      # deterministic pause jitter, fraction of the profile sd
    pause_trim_ms=0.0,     # added to every real pause (calibration for silence detection)
    comma_min_words=4,     # comma pauses when the clause before has >= this many words, or before a number/name
    micro_gap_frames=2,    # 50 ms micro gap at commas that do not pause
    model_pause_cap_ms=250,  # pause length the model itself sees (rest is inserted as exact silence)
    tail_keep_ms=30, head_keep_ms=20,  # faded pads kept around each real word edge (below the edge threshold)
    edge_db=48.0,          # word edge = envelope this far under the chunk's p95 frame
    last_phone_cap=4.0,    # frames; Kokoro parks the punctuation pause inside the last phoneme
    space_cap=2.0,         # frames; word gap where there is no punctuation
    # pitch template, semitones re the voice's own median (profile: onset .83, peak 7.41 @ .235, end -1.92)
    onset_st=2.0, peak_st=6.2, later_phrase_drop_st=1.3, end_stop_st=-3.8, end_comma_st=-1.3,
    end_ellipsis_mid_st=1.2, end_colon_st=-3.0, question_rise_st=4.0, aside_drop_st=1.5,
    resid_scale=1.25,      # keep the model's own local movement, slightly enlarged
    final_resid=0.3,       # ... but only this much of it at the end of a falling / level / question phrase
    post_peak_frac=0.3, mid_st=1.5,  # after the peak: quick fall to mid_st over this share of the rest, then slow decline
    template_mix=0.7,      # 1 = profile template replaces the model's phrase trend, 0 = model trend kept
    final_fall_st=4.0,     # extra fall across the last word of falling phrases
    template_smooth_ms=60,
    range_scale=1.08,      # whole contour (template + model movement) around the voice median
    phrase_offset_sd=1.0,  # deterministic phrase-to-phrase level variation, st
    creak_share=0.3, creak_st=-5.0,  # share of full stops ending in a low tail, and its depth
    sent_rate_sd=0.08,     # deterministic sentence-to-sentence rate variation
    emph_st=dict(project=1.0, name=0.0, number=0.5, contrast=0.0),  # extra bumps on non-anchor words
    emph_db=dict(project=3.0, name=2.0, number=1.75, contrast=1.0),
    final_word_db=-0.5,    # phrase-final word gain (Kokoro already drops ~5 dB on its own)
    lufs=-20.0,
    lead_ms=150, trail_ms=350,
)

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
NUMW = set("""zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen
eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion half dozen
percent""".split())
VOWELS = set('aeiouæɑɐɒɔəɚɛɜɝɪʊʌᵊɨʉAIOWYQ')
PUNCT = set(',.!?…:;—–-')


def h01(*key):
    """Deterministic uniform [0,1) from a key (same text -> same take)."""
    return int(hashlib.sha1('|'.join(map(str, key)).encode()).hexdigest()[:8], 16) / 2 ** 32


def hgauss(*key):
    u1, u2 = max(h01(*key, 'a'), 1e-9), h01(*key, 'b')
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


# ------------------------------------------------------------------ script parsing
def parse_script(text):
    """-> list of sentences {text, para_start, end_punct, aside} in reading order."""
    text = text.replace('\r', '')
    text = re.sub(r'\.\.\.+', '…', text)
    paras = [p.strip() for p in re.split(r'\n+', text) if p.strip()]
    out = []
    for pi, p in enumerate(paras):
        p = re.sub(r'\s+', ' ', p)
        # split after . ! ? … when followed by space + capital/digit/quote, always after ? !
        parts, start = [], 0
        for m in re.finditer(r'([.!?…])(\s+)', p):
            nxt = p[m.end():m.end() + 1]
            punct = m.group(1)
            if punct in '?!' or (nxt and (nxt.isupper() or nxt.isdigit() or nxt in '"“$')):
                # do not split inside dotted acronyms like F.H.E.
                if punct == '.' and re.search(r'(?:\b[A-Z]\.){2,}$', p[start:m.end(1)]):
                    continue
                parts.append(p[start:m.end(1)].strip()); start = m.end()
        if p[start:].strip(): parts.append(p[start:].strip())
        for si, s in enumerate(parts):
            s_clean = s.replace('*', '')
            ep = s_clean.rstrip()[-1] if s_clean.rstrip()[-1] in '.!?…' else '.'
            low = s_clean.lower().lstrip('"“ ')
            out.append(dict(text=s, para_start=si == 0, para=pi, end_punct=ep,
                            opener=any(re.match(re.escape(o) + r"\b", low) for o in OPENERS),
                            aside=bool(re.match(r'(by the way|btw)\b', low))))
    return out


def word_cat(core, prev_core, sent_initial, projects):
    lc = core.lower().strip("'’")
    if not lc: return 'punct'
    if any(lc == p.lower() or lc.startswith(p.lower() + "'") for p in projects): return 'project'
    if re.search(r'\d', core) or lc in NUMW or core.startswith('$'): return 'number'
    if lc in CONTRAST: return 'contrast'
    if lc in FUNC: return 'function'
    if (core[:1].isupper() and not sent_initial) or re.fullmatch(r'[A-Z][A-Z0-9.\-]+', core): return 'name'
    return 'content'


# ------------------------------------------------------------------ Kokoro internals
class Engine:
    def __init__(self, voice):
        from kokoro import KPipeline, KModel
        torch.set_num_threads(int(os.environ.get('HV_THREADS', '4')))
        self.model = KModel(repo_id='hexgrad/Kokoro-82M').eval()
        self.pipe = KPipeline(lang_code='a', model=self.model, repo_id='hexgrad/Kokoro-82M')
        self.voice_name = voice
        self.pack = self.pipe.load_voice(voice)
        self.vocab = self.model.vocab

    @torch.no_grad()
    def predict(self, ids, ref_s):
        m = self.model
        input_ids = torch.LongTensor([[0, *ids, 0]])
        L = input_ids.shape[1]
        input_lengths = torch.full((1,), L, dtype=torch.long)
        text_mask = torch.gt(torch.arange(L).unsqueeze(0) + 1, input_lengths.unsqueeze(1))
        bert_dur = m.bert(input_ids, attention_mask=(~text_mask).int())
        d_en = m.bert_encoder(bert_dur).transpose(-1, -2)
        s = ref_s[:, 128:]
        d = m.predictor.text_encoder(d_en, s, input_lengths, text_mask)
        x, _ = m.predictor.lstm(d)
        dur = torch.sigmoid(m.predictor.duration_proj(x)).sum(axis=-1).squeeze(0)
        t_en = m.text_encoder(input_ids, input_lengths, text_mask)
        return dict(d=d, t_en=t_en, dur=dur.numpy().astype(np.float64), s=s, ref_s=ref_s)

    @torch.no_grad()
    def f0n(self, st, pred_dur):
        m = self.model
        L = st['d'].shape[1]
        pd = torch.as_tensor(pred_dur, dtype=torch.long)
        idx = torch.repeat_interleave(torch.arange(L), pd)
        aln = torch.zeros((L, idx.shape[0])); aln[idx, torch.arange(idx.shape[0])] = 1
        aln = aln.unsqueeze(0)
        en = st['d'].transpose(-1, -2) @ aln
        F0, N = m.predictor.F0Ntrain(en, st['s'])
        asr = st['t_en'] @ aln
        return F0, N, asr

    @torch.no_grad()
    def decode(self, asr, F0, N, ref_s, seed=0):
        torch.manual_seed(seed)
        return self.model.decoder(asr, F0, N, ref_s[:, :128]).squeeze().numpy()


def build_chunk(eng, sent, projects):
    """G2P one sentence -> ids with labels and word table."""
    raw = sent['text']
    stars = set(w.strip('*').strip(',.!?…:;').lower() for w in re.findall(r'\*[^*]+\*', raw))
    gs_text = re.sub(r'\.\.\.+', '…', raw.replace('*', ''))
    _, toks = eng.pipe.g2p(gs_text)
    # group misaki tokens into whitespace-delimited script words
    words, cur = [], None
    for ti, t in enumerate(toks):
        ph = t.phonemes or ''
        is_p = bool(ph) and all(c in PUNCT for c in ph) and not re.search(r'\w', t.text)
        if cur is None: cur = dict(toks=[], text='', punct=[])
        cur['text'] += t.text
        (cur['punct'] if is_p else cur['toks']).append(ti)
        if t.whitespace:
            words.append(cur); cur = None
    if cur is not None: words.append(cur)
    # phoneme string with labels (token index, kind)
    chars = []
    for ti, t in enumerate(toks):
        ph = t.phonemes or ''
        for c in ph: chars.append((c, ti))
        if t.whitespace: chars.append((' ', ti, 'sp'))
    while chars and chars[-1][0] == ' ': chars.pop()
    ps = ''.join(c[0] for c in chars)
    ids, lab = [], []
    for c in chars:
        v = eng.vocab.get(c[0])
        if v is None: continue
        ids.append(v); lab.append((c[1], 'sp' if len(c) > 2 else 'ph', c[0]))
    if len(ids) > 508: raise ValueError(f'sentence too long for one Kokoro chunk ({len(ids)} phonemes): {raw[:60]}')
    ref_s = eng.pack[len(ps) - 1]
    # positions in the model sequence (bos at 0)
    tokpos = {}
    for pos, (ti, kind, c) in enumerate(lab, start=1):
        tokpos.setdefault(ti, {'ph': [], 'sp': []})[kind].append(pos)
    wl = []
    first = True
    for wi, w in enumerate(words):
        core = re.sub(r'^[\s"“(]+|[\s"”),.!?…:;]+$', '', w['text'])
        ph_pos = [p for ti in w['toks'] for p in tokpos.get(ti, {}).get('ph', [])]
        sp_pos = [p for ti in w['toks'] + w['punct'] for p in tokpos.get(ti, {}).get('sp', [])]
        pu_pos = [p for ti in w['punct'] for p in tokpos.get(ti, {}).get('ph', [])]
        punct = ''.join(toks[ti].phonemes or '' for ti in w['punct'])
        if not ph_pos and not core:
            if wl:   # stray punctuation word: attach to previous word
                wl[-1]['pu_pos'] += pu_pos; wl[-1]['sp_pos'] += sp_pos; wl[-1]['punct'] += punct
            continue
        cat = word_cat(core, wl[-1]['core'] if wl else '', first, projects) if ph_pos else 'punct'
        vow = [p for p in ph_pos if lab[p - 1][2] in VOWELS]
        stress = [p for p in ph_pos if p >= 2 and lab[p - 2][2] == 'ˈ' and lab[p - 1][2] in VOWELS]
        wl.append(dict(text=w['text'].strip(), core=core, ph_pos=ph_pos, sp_pos=sp_pos, pu_pos=pu_pos, punct=punct,
                       cat=cat, syl=max(1, len(vow)) if ph_pos else 0, vow=vow, stress=stress[0] if stress else (vow[0] if vow else None),
                       key=core.lower() in stars, paren='(' in w['text'] or ')' in w['text']))
        first = False
    # aside state for parentheses
    inside = False
    for w in wl:
        if '(' in w['text']: inside = True
        w['aside'] = inside or sent['aside']
        if ')' in w['text']: inside = False
    return dict(ids=ids, lab=lab, ref_s=ref_s, words=wl, ps=ps, sent=sent)


# ------------------------------------------------------------------ planning: boundaries and durations
def boundary_class(w, nxt, clause_words, K):
    """Boundary after word w inside a sentence -> (class, pause_ms or None for micro/none)."""
    p = w['punct']
    if not p: return 'none', 0
    if '…' in p: return 'ellipsis_mid', None
    if ':' in p or '—' in p or '–' in p or p == '-': return 'colon_dash', None
    if ';' in p: return 'colon_dash', None
    if ',' in p:
        if nxt is not None and nxt['cat'] in ('number', 'name', 'project'): return 'comma_before_number_name', None
        if clause_words >= K['comma_min_words']: return 'comma', None
        return 'comma_micro', 0
    return 'none', 0


def pause_ms(cls, key, tt, K):
    bm = tt['break_ms']; sd = tt.get('pause_sd_ms', {})
    base = {'sentence': bm['sentence'], 'new_topic': bm['new_topic_or_paragraph'], 'question': bm['sentence'],
            'ellipsis_end': max(bm['ellipsis'], 400.0), 'ellipsis_para': bm['new_topic_or_paragraph'],
            'ellipsis_mid': min(bm['ellipsis'], 355.0), 'colon_dash': bm['colon_dash'],
            'comma': bm['comma']['ms_when_break'], 'comma_before_number_name': bm['comma_before_number_or_name']}[cls]
    s = {'sentence': sd.get('sentence', 56), 'new_topic': sd.get('new_topic', 88), 'question': sd.get('sentence', 56),
         'ellipsis_end': sd.get('ellipsis', 65), 'ellipsis_para': sd.get('new_topic', 88), 'ellipsis_mid': sd.get('ellipsis', 65),
         'colon_dash': 40, 'comma': sd.get('comma', 87) * 0.6, 'comma_before_number_name': 20}[cls]
    j = max(-1.5, min(1.5, hgauss(key))) * s * K['pause_jitter']
    return max(120.0, base + j + K['pause_trim_ms'])


def round_frames(x):
    """Error-diffused rounding of float frames, min 1 per token."""
    out = np.zeros(len(x), dtype=np.int64); acc = 0.0; done = 0
    for i, v in enumerate(x):
        acc += v
        n = max(1, int(round(acc - done)))
        out[i] = n; done += n
    return out


def plan_chunks(chunks, preds, K, tt):
    """Edit float durations of every chunk in place -> per chunk: pred_dur, pauses inside, words with class info."""
    n_ch = len(chunks)
    # pass A: per-chunk boundaries and stretch factors (before the global rate scale)
    for ci, (ch, pr) in enumerate(zip(chunks, preds)):
        dur = pr['dur'].copy()
        fac = np.ones_like(dur)
        speech = np.zeros(len(dur), dtype=bool)
        wl = ch['words']
        clause = 0
        for w in wl:
            # Kokoro hides the punctuation pause inside the last phoneme before it (often 10-15 frames);
            # cap it so the pause lives in the punctuation token we control
            # (it also parks unpunctuated pauses there, e.g. after "layer" or "F.H.E."; the profile has none)
            if w['ph_pos']:
                lp = w['ph_pos'][-1]
                pr['dur'][lp] = min(pr['dur'][lp], K['last_phone_cap'])
                if not w['punct']:
                    for p in w['sp_pos']: pr['dur'][p] = min(pr['dur'][p], K['space_cap'])
        for wi, w in enumerate(wl):
            for p in w['ph_pos']: speech[p] = True
            for p in w['sp_pos']: speech[p] = True
            clause += 1 if w['ph_pos'] else 0
            nxt = wl[wi + 1] if wi + 1 < len(wl) else None
            if nxt is None:
                w['bclass'] = 'end'
            else:
                w['bclass'], _ = boundary_class(w, nxt, clause, K)
            if w['bclass'] not in ('none', 'comma_micro') or w['punct']:
                clause = 0
            w['pause_before_next'] = w['bclass'] in ('ellipsis_mid', 'colon_dash', 'comma', 'comma_before_number_name', 'end')
            # speed factors
            f = 1.0 / (1 + max(-0.15, min(0.15, K['sent_rate_sd'] * hgauss(ch['sent']['text'], 'rate'))))
            if w['aside']: f /= K['aside_speed']
            if w['cat'] == 'number': f /= K['number_speed']
            for p in w['ph_pos']: fac[p] *= f
            if w['pause_before_next'] and w['ph_pos']:
                lastv = w['vow'][-1] if w['vow'] else w['ph_pos'][0]
                for p in w['ph_pos']:
                    fac[p] *= K['final_stretch'] if p >= lastv else K['final_pre_stretch']
        pr['fac'] = fac; pr['speech'] = speech
    # global scale to the target articulation rate
    syl = sum(w['syl'] for ch in chunks for w in ch['words'])
    fr = sum(float(np.sum(pr['dur'][pr['speech']] * pr['fac'][pr['speech']])) for pr in preds)
    target = K['rate'] * K['rate_trim']
    scale = syl / (target * fr * HOP / SR)
    for ci, (ch, pr) in enumerate(zip(chunks, preds)):
        dur = pr['dur'] * np.where(pr['speech'], pr['fac'] * scale, 1.0)
        wl = ch['words']
        for wi, w in enumerate(wl):
            if w['bclass'] == 'end':
                # sentence-final punctuation: short natural release, the gap is made exact at assembly
                for p in w['pu_pos']: dur[p] = 6.0 / max(1, len(w['pu_pos']))
                for p in w['sp_pos']: dur[p] = min(dur[p], 1.0)
                continue
            if w['bclass'] in ('none',):
                continue
            if w['bclass'] == 'comma_micro':
                tot = K['micro_gap_frames']
                for p in w['pu_pos']: dur[p] = max(1.0, tot - len(w['sp_pos']))
                for p in w['sp_pos']: dur[p] = 1.0
                w['pause_ms'] = 0
                continue
            ms = pause_ms(w['bclass'], (ch['sent']['text'], wi), tt, K)
            w['pause_ms'] = ms
            mf = min(ms, K['model_pause_cap_ms']) / 25.0
            for p in w['pu_pos']: dur[p] = max(1.0, (mf - len(w['sp_pos'])) / max(1, len(w['pu_pos'])))
            for p in w['sp_pos']: dur[p] = 1.0
        dur[-1] = min(dur[-1], 2.0)   # bos silence is left alone (the decoder needs it) and trimmed at assembly
        pr['pred_dur'] = round_frames(dur)
        # frame spans
        cs = np.concatenate([[0], np.cumsum(pr['pred_dur'])])
        pr['cs'] = cs
        for w in wl:
            if w['ph_pos']:
                w['f0'] = (int(cs[w['ph_pos'][0]]), int(cs[w['ph_pos'][-1] + 1]))
                if w['stress'] is not None:
                    w['stress_fr'] = 0.5 * (cs[w['stress']] + cs[w['stress'] + 1])
                else:
                    w['stress_fr'] = 0.5 * sum(w['f0'])
            if w['pu_pos']:
                w['pu_span'] = (int(cs[w['pu_pos'][0]]), int(cs[w['pu_pos'][-1] + 1]))
    # boundaries between sentences
    for ci, ch in enumerate(chunks):
        s = ch['sent']
        if ci + 1 < n_ch:
            nx = chunks[ci + 1]['sent']
            if s['end_punct'] == '…':
                cls = 'ellipsis_para' if nx['para_start'] else 'ellipsis_end'
            elif s['end_punct'] == '?':
                cls = 'question'
            elif nx['para_start'] or nx['opener']:
                cls = 'new_topic'
            else:
                cls = 'sentence'
            ch['gap_cls'] = cls
            ch['gap_ms'] = pause_ms(cls, ('S', s['text'], nx['text']), tt, K)
        else:
            ch['gap_cls'] = 'end'; ch['gap_ms'] = K['trail_ms']
    return scale


# ------------------------------------------------------------------ pitch template
def phrases_of(ch):
    """Split a chunk's words into phrases at every punctuation (as the measurement does)."""
    out, cur = [], []
    for w in ch['words']:
        if not w['ph_pos']: continue
        cur.append(w)
        if w['punct']:
            out.append(cur); cur = []
    if cur: out.append(cur)
    return out


def smooth(x, n):
    if n <= 1: return x
    k = np.ones(n) / n
    pad = np.pad(x, (n // 2, n - 1 - n // 2), mode='edge')
    return np.convolve(pad, k, mode='valid')


def interp_nans(x):
    x = x.copy(); ok = ~np.isnan(x)
    if ok.sum() == 0: return np.zeros_like(x)
    x[~ok] = np.interp(np.flatnonzero(~ok), np.flatnonzero(ok), x[ok])
    return x


def contour_choice(ch, ph_i, last_w, sent_end, K):
    """Final contour of a phrase -> (end_st, last-word shape)."""
    p = last_w['punct']
    key = (ch['sent']['text'], ph_i)
    if not sent_end:
        if '…' in p: return K['end_ellipsis_mid_st'], 'level' if h01(key) < 0.5 else 'rise'
        if ':' in p or '—' in p or ';' in p: return K['end_colon_st'], 'fall'
        u = h01(key)
        return K['end_comma_st'], ('fall' if u < 0.25 else 'rise' if u < 0.6 else 'level')
    ep = ch['sent']['end_punct']
    if ep == '?': return K['end_comma_st'], 'qrise'
    u = h01(key)
    if ep == '…':
        return K['end_stop_st'] + 0.6, ('fall' if u < 0.6 else 'level')
    return K['end_stop_st'], ('creak' if u < K['creak_share'] else 'fall' if u < 0.68 else 'level')   # the model adds its own rises


def edit_f0(ch, F0, med_hz, K):
    """F0: (n,) Hz at 12.5 ms. Returns edited F0 (n,)."""
    f = F0.copy()
    voiced = f > 60
    m = np.full(len(f), np.nan)
    m[voiced] = 12 * np.log2(f[voiced] / med_hz)
    tgt = np.full(len(f), np.nan)
    phs = phrases_of(ch)
    for k, ph in enumerate(phs):
        a, b = 2 * ph[0]['f0'][0], 2 * ph[-1]['f0'][1]
        if b - a < 6: continue
        seg = np.arange(a, b)
        vv = voiced[a:b]
        if vv.sum() < 5: continue
        t = seg.astype(float)
        cf = np.polyfit(t[vv], m[a:b][vv], 1)
        trend = np.polyval(cf, t)
        resid = m[a:b] - trend
        # anchor: first project/number/name/contrast/key word in the first 60% of words, else first content word
        nw = len(ph)
        anchor = None
        for w in ph[:max(1, int(math.ceil(nw * 0.6)))]:
            if w['cat'] in ('project', 'number', 'name', 'contrast') or w['key']:
                anchor = w; break
        if anchor is None:
            anchor = next((w for w in ph if w['cat'] in ('content', 'name', 'project', 'number', 'contrast')), ph[0])
        tp = 2 * anchor['stress_fr']
        kk = min(k, 2)
        onset = K['onset_st'] - 0.4 * kk
        peak = K['peak_st'] - K['later_phrase_drop_st'] * kk
        if ph[0]['aside']:
            peak -= K['aside_drop_st'] + 0.5; onset -= K['aside_drop_st']
        if nw <= 2:
            peak -= 1.5
        sent_end = k == len(phs) - 1
        end, shape = contour_choice(ch, k, ph[-1], sent_end, K)
        # last word span
        la = 2 * ph[-1]['f0'][0]
        tp = min(max(tp, a + 2), max(a + 3, la - 1)) if nw > 1 else a + 0.3 * (b - a)
        # onset -> early peak -> quick fall to a mid level -> slow decline to the class-dependent end
        vidx = np.flatnonzero(vv) + a
        be = int(vidx[-1]) + 1                      # end of voicing (the word span runs on into stop closures)
        tp = min(tp, be - 2)
        tm = tp + K['post_peak_frac'] * (be - 1 - tp)
        mid = min(K['mid_st'] - 0.4 * kk, peak - 1.0)
        if end > mid: mid = 0.5 * (mid + end) if '…' not in ph[-1]['punct'] else end
        xs = [a, tp, tm, be - 1]
        ys = [onset, peak, mid, end]
        temp = np.interp(t, xs, ys)
        rw = np.full(len(t), K['resid_scale'])
        # final word shape, over the voiced part of the last word
        lv = vidx[vidx >= la]
        if len(lv) >= 4:
            la_, lb_ = int(lv[0]), int(lv[-1]) + 1
            u = np.clip((t[la_ - a:] - la_) / max(1, lb_ - la_), 0, 1)
            sl = slice(la_ - a, None)
            if shape in ('fall', 'creak', 'level', 'qrise'):   # the model's own end movement must not undo the class contour
                rw[sl] = K['resid_scale'] + (K['final_resid'] - K['resid_scale']) * np.clip(u * 2, 0, 1)
            if shape in ('fall', 'creak'):
                temp[sl] += K['final_fall_st'] * (0.5 - u)
            if shape == 'creak':   # low, fry-like tail on the last ~90 ms of voicing
                nt = min(len(u), int(0.09 / 0.0125))
                temp[len(temp) - nt:] += np.linspace(0, K['creak_st'], nt) if nt > 1 else 0
            elif shape == 'rise':
                temp[sl] += 2.2 * (u - 0.4)
            elif shape == 'qrise':
                temp[sl] += K['question_rise_st'] * (u ** 1.5) - 0.5
        temp = smooth(temp, max(1, int(K['template_smooth_ms'] / 12.5)))
        new = K['template_mix'] * temp + (1 - K['template_mix']) * trend + rw * resid
        new = new * K['range_scale'] + K['phrase_offset_sd'] * max(-1.5, min(1.5, hgauss(ch['sent']['text'], k, 'off')))
        # emphasis bumps on other emphasised words
        for w in ph:
            if w is anchor: continue
            c = 'project' if w['cat'] == 'project' else w['cat']
            st = K['emph_st'].get(c, 0.0) + (1.0 if w['key'] else 0.0)
            if st <= 0: continue
            wa, wb = 2 * w['f0'][0], 2 * w['f0'][1]
            if wb - wa < 3: continue
            win = np.zeros(len(t)); idx = np.arange(max(a, wa), min(b, wb)) - a
            if len(idx) == 0: continue
            win[idx] = np.hanning(len(idx) + 2)[1:-1]
            new += st * win
        tgt[a:b] = np.where(vv, new, np.nan)
    return tgt, m


def apply_f0(F0, tgt, m, shift_st):
    d = tgt - m - shift_st
    d = interp_nans(np.where(np.isnan(tgt) | np.isnan(m), np.nan, d))
    d = smooth(d, 3)
    d = np.clip(d, -9, 11)
    f = F0.copy()
    on = f > 10
    f[on] = f[on] * 2 ** (d[on] / 12)
    return f


# ------------------------------------------------------------------ audio helpers
def gain_env(ch, pr, n_samples, K):
    g = np.zeros(int(pr['cs'][-1]) + 1)
    for ph in phrases_of(ch):
        for wi, w in enumerate(ph):
            db = K['emph_db'].get(w['cat'], 0.0) + (0.5 if w['key'] else 0.0)
            if wi == len(ph) - 1 and len(ph) >= 2: db += K['final_word_db']
            if db: g[w['f0'][0]:w['f0'][1]] += db
    gs = np.repeat(g, HOP)[:n_samples]
    if len(gs) < n_samples: gs = np.pad(gs, (0, n_samples - len(gs)), mode='edge')
    gs = smooth(gs, int(0.03 * SR))
    return 10 ** (gs / 20)


EH = 120  # 5 ms envelope hop


def env_db(audio):
    n = len(audio) // EH
    fr = audio[:n * EH].reshape(n, EH).astype(np.float64)
    return 10 * np.log10(np.mean(fr ** 2, axis=1) + 1e-12)


def fade(n, up=True):
    x = 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / max(1, n))
    return x if up else x[::-1]


def lufs_of(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    return float(m[-1]) if m else None


def normalise(audio, target):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    try:
        sf.write(tmp, audio, SR, subtype='FLOAT')
        cur = lufs_of(tmp)
    finally:
        os.unlink(tmp)
    if cur is None: return audio, None
    a = audio * 10 ** ((target - cur) / 20)
    pk = np.max(np.abs(a))
    if pk > 0.89:  # keep true-peak headroom (-1 dBFS); soft-knee only on the rare peaks
        a = np.where(np.abs(a) > 0.7, np.sign(a) * (0.7 + 0.19 * np.tanh((np.abs(a) - 0.7) / 0.19)), a)
    return a.astype(np.float32), cur


# ------------------------------------------------------------------ main render paths
def render_house(text, voice, profile, projects, knobs, log=print):
    K = json.loads(json.dumps(KNOBS)); K.update(knobs or {})
    tt = profile['tts_targets']
    if 'rate' not in (knobs or {}): K['rate'] = tt.get('articulation_syll_per_s', K['rate'])
    t0 = time.time()
    eng = Engine(voice)
    t_load = time.time() - t0
    sents = parse_script(text)
    chunks = [build_chunk(eng, s, projects) for s in sents]
    preds = [eng.predict(ch['ids'], ch['ref_s']) for ch in chunks]
    scale = plan_chunks(chunks, preds, K, tt)
    f0s = []
    for ch, pr in zip(chunks, preds):
        F0, N, asr = eng.f0n(pr, pr['pred_dur'])
        pr['F0'], pr['N'], pr['asr'] = F0, N, asr
        f0s.append(F0.squeeze(0).numpy())
    allf = np.concatenate(f0s); med_hz = float(np.median(allf[allf > 60]))
    # template targets, then one global shift so the voice keeps its own median
    tg = [edit_f0(ch, f, med_hz, K) for ch, f in zip(chunks, f0s)]
    pool = np.concatenate([t for t, _ in tg]); shift = float(np.nanmedian(pool))
    pieces, words = [], []
    pos = int(K['lead_ms'] * SR / 1000)
    pieces.append(np.zeros(pos, dtype=np.float32))
    tail_k, head_k = int(K['tail_keep_ms'] * SR / 1000), int(K['head_keep_ms'] * SR / 1000)
    for ci, (ch, pr, (tgt, m)) in enumerate(zip(chunks, preds, tg)):
        F0n = apply_f0(f0s[ci], tgt, m, shift)
        F0t = torch.from_numpy(F0n.astype(np.float32)).unsqueeze(0)
        audio = eng.decode(pr['asr'], F0t, pr['N'], pr['ref_s'], seed=ci)
        audio = audio * gain_env(ch, pr, len(audio), K)
        e = env_db(audio); thr = np.percentile(e, 95) - K['edge_db']
        wl = [w for w in ch['words'] if w['ph_pos']]
        cs = pr['cs']
        # nominal word spans in samples, half of the following space token given to each side
        spans = []
        for w in wl:
            s0, e0 = w['f0'][0] * HOP, w['f0'][1] * HOP
            spans.append([s0, e0])
        for i in range(len(spans) - 1):
            mid = (spans[i][1] + spans[i + 1][0]) // 2
            if not wl[i].get('pause_ms') and not wl[i]['punct']:
                spans[i][1] = mid; spans[i + 1][0] = mid
        # real edges at pauses (inside the chunk) and at the chunk edges, from the energy envelope
        def real_end(i, limit):
            a_, b_ = max(0, spans[i][1] - int(0.25 * SR)), min(len(audio), spans[i][1] + int(0.25 * SR), limit)
            fr = np.flatnonzero(e[a_ // EH:b_ // EH] > thr)
            return a_ + (fr[-1] + 1) * EH if len(fr) else spans[i][1]
        def real_start(i, limit):
            a_, b_ = max(0, spans[i][0] - int(0.15 * SR), limit), min(len(audio), spans[i][0] + int(0.45 * SR))
            fr = np.flatnonzero(e[a_ // EH:b_ // EH] > thr)
            return a_ + fr[0] * EH if len(fr) else spans[i][0]
        cut_after = [i for i in range(len(wl) - 1) if wl[i].get('pause_ms')]
        seg_a = max(0, real_start(0, 0) - head_k)
        bounds = []
        for i in cut_after:
            ns = real_start(i + 1, spans[i][1])
            we = real_end(i, ns - EH)
            bounds.append((seg_a, we, wl[i]['pause_ms'], i))
            seg_a = max(we + EH, ns - head_k)
        we = real_end(len(wl) - 1, len(audio))
        bounds.append((seg_a, we, ch['gap_ms'], len(wl) - 1))
        wi0 = 0
        for (sa, we, ms, last_i) in bounds:
            sb = min(len(audio), we + tail_k)
            seg = audio[sa:sb].astype(np.float32).copy()
            fi = min(head_k, len(seg) // 4); fo = min(tail_k, len(seg) // 4)
            if fi: seg[:fi] *= fade(fi, True)
            if fo: seg[-fo:] *= fade(fo, False)
            for i in range(wi0, last_i + 1):
                s0 = max(spans[i][0], sa + (head_k if i == wi0 else 0)); e0 = min(spans[i][1], we) if i == last_i else spans[i][1]
                words.append({'s': round((pos + s0 - sa) / SR, 3), 'e': round((pos + max(e0, s0 + EH) - sa) / SR, 3), 'w': wl[i]['text']})
            wi0 = last_i + 1
            pieces.append(seg); pos += len(seg)
            sil = int(ms * SR / 1000) - (sb - we) - head_k
            sil = max(int(0.02 * SR), sil)
            pieces.append(np.zeros(sil, dtype=np.float32)); pos += sil
    out = np.concatenate(pieces)
    out, raw_lufs = normalise(out, K['lufs'])
    info = dict(voice=voice, med_hz=round(med_hz, 1), template_shift_st=round(shift, 2), dur_scale=round(scale, 3),
                load_s=round(t_load, 1), synth_s=round(time.time() - t0 - t_load, 1), audio_s=round(len(out) / SR, 2),
                raw_lufs=raw_lufs, knobs=K, n_chunks=len(chunks))
    return out, words, info


def render_plain(text, voice, log=print):
    from kokoro import KPipeline, KModel
    torch.set_num_threads(int(os.environ.get('HV_THREADS', '4')))
    t0 = time.time()
    model = KModel(repo_id='hexgrad/Kokoro-82M').eval()
    pipe = KPipeline(lang_code='a', model=model, repo_id='hexgrad/Kokoro-82M')
    t_load = time.time() - t0
    text = re.sub(r'\.\.\.+', '…', text.replace('*', ''))
    pieces, words, pos = [], [], 0
    torch.manual_seed(0)
    for r in pipe(text, voice=voice, speed=1.0, split_pattern=r'\n+'):
        a = r.audio.numpy()
        if r.tokens:
            cur = None
            for t in r.tokens:
                if t.start_ts is not None and t.phonemes and re.search(r'\w', t.text):
                    if cur is None: cur = {'s': t.start_ts, 'e': t.end_ts, 'w': t.text}
                    else: cur['e'] = t.end_ts; cur['w'] += t.text
                elif cur is not None and t.text: cur['w'] += t.text
                if t.whitespace and cur is not None:
                    words.append({'s': round(pos / SR + cur['s'], 3), 'e': round(pos / SR + cur['e'], 3), 'w': cur['w']}); cur = None
            if cur is not None: words.append({'s': round(pos / SR + cur['s'], 3), 'e': round(pos / SR + cur['e'], 3), 'w': cur['w']})
        pieces.append(a); pos += len(a)
    out = np.concatenate(pieces)
    out, raw_lufs = normalise(out, KNOBS['lufs'])
    info = dict(voice=voice, plain=True, load_s=round(t_load, 1), synth_s=round(time.time() - t0 - t_load, 1),
                audio_s=round(len(out) / SR, 2), raw_lufs=raw_lufs)
    return out, words, info


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--text', required=True, help='script file (plain text)')
    ap.add_argument('--out', required=True)
    ap.add_argument('--voice', default='af_heart', help='Kokoro voice or blend, e.g. af_heart or af_heart,af_bella')
    ap.add_argument('--profile', default=DEFAULT_PROFILE)
    ap.add_argument('--project', default='', help='comma-separated project names (strongest emphasis)')
    ap.add_argument('--plain', action='store_true', help='stock Kokoro, no prosody edits (baseline)')
    ap.add_argument('--knobs', default='', help='JSON dict of knob overrides')
    ap.add_argument('--words', default='', help='words.json path (default <out>.words.json)')
    o = ap.parse_args()
    text = open(o.text, encoding='utf-8').read()
    projects = [p.strip() for p in o.project.split(',') if p.strip()]
    if o.plain:
        audio, words, info = render_plain(text, o.voice)
    else:
        prof = json.load(open(o.profile))
        audio, words, info = render_house(text, o.voice, prof, projects, json.loads(o.knobs) if o.knobs else {})
    sf.write(o.out, audio, SR, subtype='PCM_16')
    wp = o.words or re.sub(r'\.wav$', '', o.out) + '.words.json'
    json.dump(words, open(wp, 'w'), indent=0)
    info['words'] = wp
    print(json.dumps({k: v for k, v in info.items() if k != 'knobs'}))


if __name__ == '__main__':
    main()
