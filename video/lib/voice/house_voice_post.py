#!/usr/bin/env python3
"""House voice, post-processed delivery (builder B): Gradium Phonon-31M-en (Apache-2.0, via ptts) + Praat TD-PSOLA.

The delivery (pace, pauses by punctuation, phrase pitch shape, emphasis, energy) comes from the measured delivery
profile (templates/voice/lara-delivery/profile.json, block tts_targets). Only DELIVERY numbers are used: no timbre,
no audio of the reference voice, no training. The voice is a stock Phonon catalog voice.

  python3 house_voice_post.py render <script.txt> <out.wav> [--voice Zoey] [--plain] [--knobs knobs.json]
                                     [--set key=value ...] [--project "Primus,Bagel"] [--work DIR]

  --plain     Phonon as it comes: one synth call per paragraph, no edits, normalised to the same LUFS.
  --knobs     JSON with knob overrides (see KNOBS); --set k=v overrides one (numbers parsed as JSON).
  --project   project names (strongest emphasis), as in measure.py.

Pipeline (house):
  1. Script -> tokens/sentences/boundary classes with measure.py's own parser (same classes as the profile).
  2. One Phonon call per sentence (q8; mid-sentence ellipsis sent as a comma so the melody stays up), duration_delta
     sets the base pace. Run in the TTS venv (HOUSE_TTS_PY) as a subprocess.
  3. Word spans: CTC forced alignment (measure.py's wav2vec2 aligner) on the known text.
  4. Per sentence, Praat Manipulation (TD-PSOLA overlap-add), all pitch in st re the voice's own median:
       pitch    new = (1-w)*smooth(orig) + w*baseline + resid_scale*(orig-smooth) + max(accent, emphasis bumps)
                baseline per phrase: onset -> end value by boundary (stop / colon low with an extra dip over the
                last voiced half of the last word; comma / mid-ellipsis held level with a small lift).
                accent: the early peak, a raised-cosine pitch accent on the first project/number word in the first
                half of the phrase, else the first content word, reaching ~peak_st (scaled per word class).
                A soft ceiling, a +/- max_shift_st clamp, and a global shift that keeps the voice's median.
       duration the word before a pause: first 30 % untouched, the rest scaled so the word's mean factor is
                final_stretch[boundary] (Phonon already lengthens these words, so most values are <= 1);
                asides x 1/aside_rate.
     then gains (emphasis +dB, phrase-final word dB), a crisp phrase end (decay below tail_trim_db dropped),
     and every word gap that needs one cut / filled to the exact pause.
  5. Sentences evened in level, joined with exact silences per boundary class, normalised to -20 LUFS (TP <= -1).

  Synth cache: sentences are cached in --work by (text, voice, pace, seed), alignment by the sentence set, so
  re-renders that only change post knobs take a few seconds.
"""
import argparse, hashlib, json, math, os, re, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(os.path.dirname(HERE))
MEASURE_DIR = os.path.join(VIDEO, 'templates', 'voice', 'lara-delivery')
PROFILE = os.path.join(MEASURE_DIR, 'profile.json')
TTS_PY = os.environ.get('HOUSE_TTS_PY', '/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/'
                                         'scratchpad/venv_tts/bin/python')
MODEL = 'hf://gradium/phonon-31m-en'
SR = 24000

KNOBS = dict(
    voice='Zoey', quant='q8', duration_delta=None,   # None = VOICE_DD[voice]
    temperature=0.3, seed=4242424242424242,
    # pauses (ms): sentence / new topic / colon / comma from profile tts_targets; comma pause only when the clause
    # before has >= comma_min_words words or a number / name follows, else micro_gap_ms; deterministic jitter
    comma_min_words=4, micro_gap_ms=50, ellipsis_ms=dict(mid=340, end=375), none_gap_max_ms=30, pause_jitter_sd=0.4,
    lead_ms=250, tail_ms=500,
    # duration
    # mean duration factor of the word before a pause, by boundary (Phonon already lengthens a lot; measured)
    final_stretch=dict(sentence=1.05, new_topic=0.85, question=0.9, ellipsis_mid=1.0, ellipsis_end=1.0, colon_dash=1.0,
                       comma=0.6, end=1.0),
    aside_rate=1.08, global_rate=1.0,
    # pitch (st re the voice median)
    contour_weight=0.8, resid_scale=1.7, smooth_ms=260, onset_first_st=-0.5, onset_later_st=-0.5,
    peak_st=9.0, accent_half_min=0.12, accent_width=0.8, accent_attract=['project', 'number'],
    accent_cat_scale=dict(project=0.6, name=0.4, number=0.85, contrast=0.8), later_peak_drop_st=1.5,
    short_phrase_peak_scale=0.6, peak_pos_default=0.24, peak_pos_max=0.5,
    end_st=dict(sentence=-3.0, new_topic=-3.0, question=-2.0, colon_dash=-4.0, ellipsis_mid=0.0, ellipsis_end=-2.5,
                comma=-1.5, end=-3.0),
    held_final=dict(comma=0.5, ellipsis_mid=1.0),     # boundaries whose last word is held level, then lifts (st)
    final_dip_st=dict(sentence=-3.0, new_topic=-3.0, end=-3.0, colon_dash=-3.0, ellipsis_end=-2.0),  # low end (st)
    emph_st=dict(project=2.5, name=1.0, number=2.0, contrast=1.5, content=1.0),
    emph_db=dict(project=2.5, name=2.0, number=1.5, contrast=1.0, content=0.0),
    # energy: phrase-final word gain (Phonon's last words already sit ~5.7 dB down, the target is -4.9 dB)
    final_word_db=1.0, tail_trim_db=-35.0, max_shift_st=8.0, ceiling_over_peak_st=2.5, f0_floor=90, f0_ceil=520,
    # lexicon fixes for the synth text only (alignment and measuring still use the script words)
    rewrites={'Primus': 'Prymus'},
    # loudness
    sentence_level_even=True, lufs=-20.0, true_peak=-1.0, out_sr=48000,
)

# base pace per catalog voice: duration_delta that puts the articulation near 4.5 syl/s after the edits
# (Zoey and Harper measured; the others scaled from their dd=0 rate: +/-0.3 dd = +/-13 % length)
VOICE_DD = dict(Zoey=0.2, Harper=0.24, Delia=0.07, Everly=0.03, Juniper=-0.05, Hadley=-0.12)

SIL_DB = -50.0          # same silence threshold as measure.py (frame energy re the take's 95th-percentile frame)
HOP = 0.005
WIN = 0.02


# ------------------------------------------------------------------ helpers usable in both interpreters
def log(*a):
    print('[hv-post]', *a, file=sys.stderr, flush=True)


def _measure():
    sys.path.insert(0, MEASURE_DIR)
    import measure as M
    return M


def load_profile(path=PROFILE):
    return json.load(open(path))


def apply_rewrites(text, rw):
    for a, b in (rw or {}).items():
        text = re.sub(r'\b' + re.escape(a) + r'\b', b, text)
    return text


# ------------------------------------------------------------------ 1. script plan
def plan_script(path, project=None, knobs=None):
    """Sentences with tokens, the synth text, and the boundary after every token (class + target pause ms)."""
    M = _measure()
    k = dict(KNOBS, **(knobs or {}))
    prof = load_profile()
    tt = prof['tts_targets']['break_ms']
    pz = prof['pauses_ms']
    toks, proj, text = M.parse_script(path)
    proj = list(proj) + list(project or [])
    toks = M.annotate_script(toks, proj)
    n = len(toks)
    sents = {}
    for i, t in enumerate(toks): sents.setdefault(t['sent'], []).append(i)

    def pause_ms(i):
        """Target pause after token i (None = leave the TTS gap, but never more than none_gap_max)."""
        if i == n - 1: return None, 'end'
        c, tags = M.boundary_class(toks, i, i + 1)
        h = int(hashlib.md5(f"{i}:{toks[i]['core']}".encode()).hexdigest()[:8], 16) / 0xffffffff  # deterministic jitter
        jit = (h - 0.5) * 2 * 1.7320508 * k['pause_jitter_sd']              # uniform with sd = pause_jitter_sd
        sd = prof['tts_targets'].get('pause_sd_ms', {})
        if c == 'ellipsis':
            mid = not toks[i]['sent_end']
            ms = k['ellipsis_ms']['mid' if mid else 'end']
            return ms + jit * sd.get('ellipsis', 60), 'ellipsis_mid' if mid else 'ellipsis_end'
        if c == 'new_topic' or (c == 'question' and 'new_topic' in tags) or 'paragraph' in tags:
            return tt['new_topic_or_paragraph'] + jit * sd.get('new_topic', 80), 'new_topic' if c != 'question' else 'question'
        if c in ('sentence', 'question'):
            return tt['sentence'] + jit * sd.get('sentence', 56), c
        if c == 'colon_dash':
            return tt['colon_dash'] + jit * 40, 'colon_dash'
        if c == 'comma':
            j = i                                                           # words in the clause before the comma
            while j > 0 and not (toks[j - 1]['p_comma'] or toks[j - 1]['p_colon'] or toks[j - 1]['p_ellipsis']
                                 or toks[j - 1]['sent_end']):
                j -= 1
            nxt = toks[i + 1]
            before_nn = nxt['is_number'] or nxt['is_amount'] or nxt['is_name'] or nxt['is_project']
            if before_nn: return tt.get('comma_before_number_or_name', tt.get('comma_before_number_name', 250)) + jit * 30, 'comma'
            if i - j + 1 >= k['comma_min_words']: return tt['comma']['ms_when_break'] + jit * sd.get('comma', 80) * 0.5, 'comma'
            return float(k['micro_gap_ms']), 'comma_micro'
        return None, c                                                      # none / before_number_name: no pause

    out = []
    for sid in sorted(sents):
        idx = sents[sid]
        words = []
        for i in idx:
            t = toks[i]
            cat = ('project' if t['is_project'] else 'number' if (t['is_number'] or t['is_amount']) else
                   'name' if t['is_name'] else 'contrast' if t['is_contrast'] else 'function' if t['is_func'] else 'content')
            ms, cls = pause_ms(i)
            words.append(dict(tok=i, core=t['core'], lead=t['lead'], trail=t['trail'], cat=cat, pause_ms=ms, cls=cls,
                              aside=t['aside'], sent_end=t['sent_end']))
        # synth text: mid-sentence ellipsis -> comma (held melody), final ellipsis -> full stop
        parts = []
        for q, w in enumerate(words):
            tr = w['trail'].replace('...', '…')
            if '…' in tr:
                tr = tr.replace('…', '.' if q == len(words) - 1 else ',')
                tr = re.sub(r'[.,]{2,}', lambda m: m.group(0)[0], tr)
            parts.append(w['lead'] + w['core'] + tr)
        st_text = apply_rewrites(' '.join(parts), k['rewrites'])
        if st_text and st_text[0].islower(): st_text = st_text[0].upper() + st_text[1:]
        if not re.search(r'[.!?]$', st_text): st_text += '.'
        out.append(dict(sent=sid, words=words, text=st_text, aside=toks[idx[0]]['aside'],
                        topic_start=toks[idx[0]]['topic_start'], para=toks[idx[0]]['cap']))
    return out


# ------------------------------------------------------------------ 2. synthesis (runs in the TTS venv)
def synth_worker(job_path):
    import ptts, soundfile as sf
    job = json.load(open(job_path))
    ptts.set_num_threads(int(job.get('threads', 4)))
    tts = ptts.TTS(MODEL, lang='en', quant=job['quant'], temperature=job['temperature'], seed=job['seed'])
    if job.get('duration_delta'): tts.set_conditions({'duration_delta': job['duration_delta']})
    for it in job['items']:
        a = tts.synth(it['text'], voice=job['voice'])
        sf.write(it['out'], a, tts.sample_rate, subtype='FLOAT')
    print('ok', len(job['items']))


def synth(items, voice, k, work):
    job = dict(items=items, voice=voice, quant=k['quant'], temperature=k['temperature'], seed=k['seed'],
               duration_delta=k['duration_delta'])
    jp = os.path.join(work, 'synth_job.json')
    json.dump(job, open(jp, 'w'))
    r = subprocess.run([TTS_PY, os.path.abspath(__file__), '_synth', jp], capture_output=True, text=True)
    if r.returncode: raise RuntimeError('synth failed: ' + r.stderr[-2000:])


# ------------------------------------------------------------------ audio helpers (system python3)
def frame_db(x, sr):
    import numpy as np
    hop, win = int(round(HOP * sr)), int(round(WIN * sr))
    xp = np.pad(x, (win // 2, win // 2))
    fr = np.lib.stride_tricks.sliding_window_view(xp, win)[::hop]
    return 10 * np.log10(np.mean(fr ** 2, axis=1) + 1e-12)


def trim(x, sr, ref, margin=0.0):
    import numpy as np
    db = frame_db(x, sr) - ref
    on = np.where(db > SIL_DB)[0]
    if not len(on): return x[:0], 0
    a = max(0, int((on[0] * HOP - margin) * sr)); b = min(len(x), int(((on[-1] + 1) * HOP + margin) * sr))
    return x[a:b], a


def fade(x, sr, ms=4, side='both'):
    import numpy as np
    n = min(len(x) // 2, int(sr * ms / 1000))
    if n <= 1: return x
    r = 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, n))
    x = x.copy()
    if side in ('both', 'in'): x[:n] *= r
    if side in ('both', 'out'): x[-n:] *= r[::-1]
    return x


def lufs_of(path):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    s = r[r.rfind('Summary:'):]
    m = re.search(r'I:\s+(-?[\d.]+) LUFS', s); p = re.search(r'Peak:\s+(-?[\d.]+) dBFS', s)
    return float(m.group(1)), float(p.group(1)) if p else None


def write_norm(y, sr, out, k):
    """Linear gain to the target LUFS (dynamics untouched); a 1-pass limiter only if the true peak would exceed."""
    import numpy as np, soundfile as sf
    tmp = out + '.tmp.wav'
    sf.write(tmp, y.astype(np.float32), sr, subtype='FLOAT')
    L, P = lufs_of(tmp)
    g = k['lufs'] - L
    af = f'volume={g:.3f}dB'
    if P is not None and P + g > k['true_peak']:
        af += f",alimiter=limit={10 ** (k['true_peak'] / 20):.4f}:attack=2:release=40:level=disabled"
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', tmp, '-af', af, '-ar', str(k['out_sr']),
                    '-c:a', 'pcm_s16le', out], check=True)
    os.remove(tmp)
    return lufs_of(out)


# ------------------------------------------------------------------ 3. alignment
def align_sentences(wavs, plans, sr, work):
    """CTC forced alignment of every sentence in one pass -> per sentence [(s, e)] per word (seconds, sentence time)."""
    import numpy as np, soundfile as sf
    M = _measure()
    gap = np.zeros(int(0.6 * sr))
    cat, offs, said = [], [], []
    t = 0.0
    for x, p in zip(wavs, plans):
        offs.append(t); cat += [x, gap]; t += (len(x) + len(gap)) / sr
        said += [w['core'] for w in p['words']]
    fn = os.path.join(work, 'align_cat.wav')
    sf.write(fn, np.concatenate(cat), sr)
    res = M.ctc_align(fn, said)
    if not res: raise RuntimeError('CTC aligner unavailable')
    spans = res['spans']
    out, q = [], 0
    for x, p, o in zip(wavs, plans, offs):
        sp = []
        for w in p['words']:
            s = spans[q]; q += 1
            sp.append(None if s is None else (max(0.0, s[0] - o), min(len(x) / sr, s[1] - o)))
        # fill gaps for words the aligner left empty
        for i in range(len(sp)):
            if sp[i] is None:
                a = sp[i - 1][1] if i and sp[i - 1] else 0.0
                b = next((sp[j][0] for j in range(i + 1, len(sp)) if sp[j]), len(x) / sr)
                sp[i] = (a, max(a + 0.02, b))
        out.append(sp)
    return out


# ------------------------------------------------------------------ 4. per-sentence prosody targets
def f0_track(x, sr, k):
    import numpy as np, parselmouth
    M = _measure()
    snd = parselmouth.Sound(x, sr)
    n = int(len(x) / sr / HOP) + 1
    f = M.pitch_track(snd, n, k['f0_floor'], k['f0_ceil'])
    stc = M.clean_f0(f)                     # st re 100 Hz, NaN unvoiced
    return stc


def smooth_interp(tf, v, ms):
    import numpy as np
    ok = ~np.isnan(v)
    if ok.sum() < 2: return np.where(ok, v, np.nanmean(v) if ok.any() else 0.0)
    vi = np.interp(tf, tf[ok], v[ok])
    w = max(3, int(ms / 1000 / HOP) | 1)
    ker = np.hanning(w); ker /= ker.sum()
    pad = w // 2
    vp = np.pad(vi, (pad, pad), mode='edge')
    return np.convolve(vp, ker, mode='valid')[:len(vi)]


def phrases_of(plan):
    """Split a sentence's words into phrases at every boundary that gets a real pause (or the sentence end)."""
    ph, cur = [], []
    for q, w in enumerate(plan['words']):
        cur.append(q)
        if q == len(plan['words']) - 1 or (w['pause_ms'] is not None and w['pause_ms'] >= 150):
            ph.append(cur); cur = []
    return ph


def targets(x, sr, plan, spans, med_st, k, prof):
    """Return new st contour (5 ms frames, NaN unvoiced), duration factor per frame, gain dB per frame (input time)."""
    import numpy as np
    stc = f0_track(x, sr, k)
    n = len(stc)
    tf = np.arange(n) * HOP
    o = stc - med_st                                         # st re voice median
    sm = smooth_interp(tf, o, k['smooth_ms'])
    T = np.full(n, np.nan)
    bump = np.zeros(n)
    acc = np.zeros(n)
    gain = np.zeros(n)
    dur = np.full(n, 1.0 / (k['global_rate'] * (k['aside_rate'] if plan['aside'] else 1.0)))
    P0 = k['peak_st'] if k['peak_st'] is not None else prof['tts_targets']['f0']['phrase_peak_st_above_median']
    words = plan['words']
    for pi, idx in enumerate(phrases_of(plan)):
        s0, e0 = spans[idx[0]][0], spans[idx[-1]][1]
        if e0 - s0 < 0.08: continue
        last = words[idx[-1]]
        cls = last['cls'] if last['cls'] != 'end' else 'end'
        if cls == 'comma_micro': cls = 'comma'
        E = k['end_st'].get(cls, k['end_st']['sentence'])
        On = k['onset_first_st'] if pi == 0 else k['onset_later_st']
        P = P0 - (k['later_peak_drop_st'] if pi > 0 else 0.0)
        if e0 - s0 < 0.6 or len(idx) <= 2: P = On + (P - On) * k['short_phrase_peak_scale']
        # peak word: first emphasised word in the first half, else the first content word
        emph = [q for q in idx if words[q]['cat'] in k['accent_attract']
                and (spans[q][0] - s0) / (e0 - s0) <= k['peak_pos_max']]
        cont = [q for q in idx if words[q]['cat'] != 'function']
        pw = emph[0] if emph else (cont[0] if cont else None)
        if pw is not None:
            tp = spans[pw][0] + 0.45 * (spans[pw][1] - spans[pw][0])
            pos = (tp - s0) / (e0 - s0)
            if pos > k['peak_pos_max']: tp = s0 + k['peak_pos_default'] * (e0 - s0)
        else:
            tp = s0 + k['peak_pos_default'] * (e0 - s0)
        tp = max(tp, s0 + 0.06)
        a, b = int(s0 / HOP), min(n, int(e0 / HOP) + 1)
        tt = tf[a:b]
        # baseline: onset -> end value (declination), held level on the last word for comma / mid ellipsis
        hold = k['held_final'].get(cls)
        lw0 = spans[idx[-1]][0] if (hold is not None and len(idx) >= 2) else e0
        lw0 = max(lw0, s0 + 0.1)
        T[a:b] = On + (E - On) * (np.minimum(tt, lw0) - s0) / max(lw0 - s0, 1e-3)
        dip = k['final_dip_st'].get(cls)
        if dip:                             # low end: extra fall over the last half of the voicing
            lw = spans[idx[-1]]
            vv = np.where(~np.isnan(o[int(lw[0] / HOP):min(n, int(lw[1] / HOP) + 1)]))[0]
            if len(vv) >= 4:
                v0, v1 = (int(lw[0] / HOP) + vv[len(vv) // 2]) * HOP, (int(lw[0] / HOP) + vv[-1]) * HOP
                r = np.clip((tt - v0) / max(v1 - v0, 1e-3), 0, 1)
                T[a:b] += dip * r
        if hold is not None:                                  # small lift over the last 40 % of the held word
            r = np.clip((tt - (lw0 + 0.6 * (e0 - lw0))) / max(0.4 * (e0 - lw0), 1e-3), 0, 1)
            T[a:b] += hold * r * (tt >= lw0)
        # the early peak: a pitch accent on the peak word, up to P st above the median
        if pw is not None:
            wd = spans[pw][1] - spans[pw][0]
            half = max(k['accent_half_min'], k['accent_width'] * wd)
            tp = max(tp, s0 + 0.9 * half)                     # the rise starts at the onset, not before it
            Bp = On + (E - On) * (min(tp, lw0) - s0) / max(lw0 - s0, 1e-3)
            A = max(0.0, P - Bp) * k['accent_cat_scale'].get(words[pw]['cat'], 1.0)
            u = np.clip((tt - tp) / half, -1, 1)
            acc[a:b] = np.maximum(acc[a:b], A * (0.5 + 0.5 * np.cos(math.pi * u)))
        # emphasis bumps and gains
        for q in idx:
            w = words[q]; c = w['cat']
            ws, we = spans[q]
            ia, ib = int(ws / HOP), min(n, int(we / HOP) + 1)
            if ib - ia < 2: continue
            win = np.sin(np.linspace(0, math.pi, ib - ia)) ** 0.6
            if c in k['emph_st'] and not (c == 'content' and q == idx[-1]):
                amp = k['emph_st'][c] * (0.0 if q == pw else 1.0)
                bump[ia:ib] = np.maximum(bump[ia:ib], amp * win)
                gain[ia:ib] = np.maximum(gain[ia:ib], k['emph_db'][c] * np.minimum(1, win * 3))
            if q == idx[-1] and len(idx) >= 2:
                gain[ia:ib] += k['final_word_db'] * np.minimum(1, np.linspace(0, 3, ib - ia))
            # pre-pause word: first 30 % untouched, the rest x g so the word's mean factor is f
            if q == idx[-1] and (w['pause_ms'] is not None and w['pause_ms'] >= 150 or w['cls'] == 'end'):
                f = k['final_stretch'].get(cls, 1.0)
                if abs(f - 1) > 1e-3:
                    g = (f - 0.3) / 0.7
                    m0 = ia + int(0.3 * (ib - ia))
                    dur[m0:ib] *= g
    w = k['contour_weight']
    rs = np.full(n, k['resid_scale'])
    for idx in phrases_of(plan):                              # no residual boost on the first 100 ms of a phrase
        a = int(spans[idx[0]][0] / HOP)
        m = min(n - a, int(0.1 / HOP))
        if m > 0: rs[a:a + m] = 1.0 + (k['resid_scale'] - 1.0) * np.linspace(0, 1, m)
    new = np.where(np.isnan(T), sm, (1 - w) * sm + w * T) + rs * (o - sm) + np.maximum(acc, bump)
    ceil_ = (k['peak_st'] if k['peak_st'] is not None else P0) + k['ceiling_over_peak_st']
    new = np.where(new > ceil_ - 1, ceil_ - 1 + np.tanh(new - ceil_ + 1), new)   # soft ceiling
    new = o + np.clip(new - o, -k['max_shift_st'], k['max_shift_st'])
    new[np.isnan(o)] = np.nan
    return dict(o=o, new=new, dur=dur, gain=gain, tf=tf)


# ------------------------------------------------------------------ 4b. PSOLA
def psola(x, sr, tg, med_st, shift_st, k, seed=1):
    """Praat Manipulation with the new pitch tier and duration tier; returns y and the in->out time map."""
    import numpy as np, parselmouth
    from parselmouth.praat import call
    # Praat's overlap-add randomises unvoiced stretches: seed it per sentence so renders are reproducible
    parselmouth.praat.run(f'random_initializeWithSeedUnsafelyButPredictably ({int(seed) % 2147483647})')
    snd = parselmouth.Sound(x, sr)
    dur_s = len(x) / sr
    man = call(snd, 'To Manipulation', 0.01, k['f0_floor'] - 15, k['f0_ceil'])
    pt = call('Create PitchTier', 'pt', 0, dur_s)
    tf, new = tg['tf'], tg['new']
    for t, v in zip(tf, new):
        if not np.isnan(v) and 0 < t < dur_s:
            call(pt, 'Add point', float(t), float(100 * 2 ** ((v + med_st + shift_st) / 12)))
    call([pt, man], 'Replace pitch tier')
    d = tg['dur']
    dt = call('Create DurationTier', 'dt', 0, dur_s)
    ch = np.where(np.abs(np.diff(d)) > 1e-4)[0]
    pts = sorted(set([0] + list(ch) + list(ch + 1) + [len(d) - 1]))
    for i in pts:
        call(dt, 'Add point', float(min(tf[i], dur_s)), float(d[i]))
    call([man, dt], 'Replace duration tier')
    y = call(man, 'Get resynthesis (overlap-add)')
    yv = y.values[0].astype(np.float64)
    # time map: out(t) = integral of the (piecewise-linear) duration tier
    tpts = np.array([min(tf[i], dur_s) for i in pts]); dpts = np.array([d[i] for i in pts])
    grid = np.arange(0, dur_s + HOP, HOP)
    dg = np.interp(grid, tpts, dpts)
    tout = np.concatenate([[0], np.cumsum((dg[1:] + dg[:-1]) / 2 * np.diff(grid))])
    return yv, grid, tout


def apply_gain(y, sr, gain_db, tf, grid, tout):
    import numpy as np
    g_in = np.interp(grid, tf, gain_db)
    t_y = np.arange(len(y)) / sr
    g = np.interp(t_y, tout, g_in)
    return y * 10 ** (g / 20)


def set_gaps(y, sr, ref, plan, spans_out, k):
    """Cut every word boundary that needs an exact pause; return pieces joined with exact silences."""
    import numpy as np
    db = frame_db(y, sr) - ref
    nfr = len(db)
    cuts = []                                                    # (left_end_sample, right_start_sample, silence_s)
    words = plan['words']
    for q in range(len(words) - 1):
        w = words[q]
        a_t, b_t = spans_out[q][1] - 0.04, spans_out[q + 1][0] + 0.04
        fa, fb = max(0, int(a_t / HOP)), min(nfr, int(b_t / HOP) + 1)
        if fb - fa < 2: fa, fb = max(0, fa - 4), min(nfr, fb + 4)
        seg = db[fa:fb]
        sil = seg < SIL_DB
        best, i = (0, 0, 0), 0                                   # longest silent run in the region
        while i < len(sil):
            if not sil[i]: i += 1; continue
            j = i
            while j < len(sil) and sil[j]: j += 1
            if j - i > best[0]: best = (j - i, i, j)
            i = j
        cur = best[0] * HOP
        tgt = w['pause_ms']
        if tgt is None:
            if cur * 1000 >= 80: tgt = k['none_gap_max_ms']        # TTS pause where the script has none
            else: continue
        elif w['cls'] == 'comma_micro' and cur * 1000 <= 80:
            continue
        if best[0] >= 3:
            l_end, r_st = (fa + best[1]) * HOP, (fa + best[2]) * HOP
            if tgt >= 150:                                       # crisp phrase end: drop the long breathy decay
                fe = fa + best[1]
                f0_ = max(int(spans_out[q][0] / HOP), fe - int(0.25 / HOP))
                above = np.where(db[f0_:fe] > k['tail_trim_db'])[0]
                if len(above): l_end = min(l_end, (f0_ + above[-1] + 1) * HOP + 0.015)
        else:                                                    # connected speech: cut at the energy minimum
            m = fa + int(np.argmin(seg))
            l_end = r_st = m * HOP + HOP / 2
        cuts.append((int(l_end * sr), int(r_st * sr), tgt / 1000.0))
    pieces, pos = [], 0
    for le, rs, s in cuts:
        if le <= pos: le = pos + 1
        pieces.append(fade(y[pos:le], sr, 12 if s >= 0.15 else 4, 'out'))
        pieces.append(np.zeros(int(round(s * sr))))
        pos = max(rs, le)
        y_next = y[pos:]
        y = np.concatenate([y[:pos], fade(y_next, sr, 4, 'in')])
    pieces.append(y[pos:])
    return np.concatenate(pieces)


# ------------------------------------------------------------------ 5. render
def render(script, out, voice=None, plain=False, knobs=None, project=None, work=None):
    import numpy as np, soundfile as sf
    t_start = time.time()
    k = json.loads(json.dumps(KNOBS)); k.update(knobs or {})
    if voice: k['voice'] = voice
    if k['duration_delta'] is None: k['duration_delta'] = VOICE_DD.get(k['voice'], 0.0)
    prof = load_profile()
    work = work or tempfile.mkdtemp(prefix='hvpost_')
    os.makedirs(work, exist_ok=True)
    plans = plan_script(script, project, k)
    meta = dict(script=script, voice=k['voice'], plain=plain, knobs=k, model=MODEL, sentences=len(plans))
    if plain:
        # plain = the script text as written (lexicon rewrites only), one call per paragraph, default pace
        raw = open(script).read()
        pt = [re.sub(r'\s+', ' ', s).strip() for s in re.split(r'\n\s*\n', raw) if s.strip()]
        items = [dict(text=apply_rewrites(t, k['rewrites']), out=os.path.join(work, f'para{i}.wav')) for i, t in enumerate(pt)]
        kk = dict(k, duration_delta=0.0)
        t0 = time.time(); synth(items, k['voice'], kk, work); meta['synth_s'] = round(time.time() - t0, 2)
        ys = [sf.read(it['out'])[0] for it in items]
        for a in ys: a[:int(0.025 * SR)] = 0.0
        y = np.concatenate([np.concatenate([a, np.zeros(int(0.15 * SR))]) for a in ys])
        y = np.concatenate([np.zeros(int(k['lead_ms'] / 1000 * SR)), y])
    else:
        def key(p):
            return hashlib.md5(json.dumps([p['text'], k['voice'], k['duration_delta'], k['quant'], k['temperature'],
                                           k['seed']]).encode()).hexdigest()[:12]
        items = [dict(text=p['text'], out=os.path.join(work, f's{p["sent"]:03d}_{key(p)}.wav')) for p in plans]
        todo = [it for it in items if not os.path.exists(it['out'])]          # cache: same text/voice/pace
        t0 = time.time()
        if todo: synth(todo, k['voice'], k, work)
        meta['synth_s'] = round(time.time() - t0, 2); meta['synth_cached'] = len(items) - len(todo)
        raw = [sf.read(it['out'])[0] for it in items]
        for x in raw: x[:int(0.025 * SR)] = 0.0                  # Phonon's decoder click before the first word
        allx = np.concatenate(raw)
        ref = float(np.percentile(frame_db(allx, SR), 95))
        xs = [trim(x, SR, ref, margin=0.01)[0] for x in raw]
        t0 = time.time()
        akey = os.path.join(work, 'align_' + hashlib.md5(''.join(it['out'] for it in items).encode()).hexdigest()[:12] + '.json')
        if os.path.exists(akey): spans = json.load(open(akey))
        else:
            spans = align_sentences(xs, plans, SR, work); json.dump(spans, open(akey, 'w'))
        meta['align_s'] = round(time.time() - t0, 2)
        t0 = time.time()
        # voice median from the raw sentences (kept)
        tr = [f0_track(x, SR, k) for x in xs]
        med_st = float(np.nanmedian(np.concatenate(tr)))
        tgs = [targets(x, SR, p, sp, med_st, k, prof) for x, p, sp in zip(xs, plans, spans)]
        allnew = np.concatenate([g['new'] for g in tgs])
        shift = -float(np.nanmedian(allnew))                     # keep the voice's own median
        meta['median_hz'] = round(100 * 2 ** (med_st / 12), 1); meta['template_shift_st'] = round(shift, 2)
        dl = np.concatenate([(g['new'] + shift - g['o']) for g in tgs]); dl = dl[~np.isnan(dl)]
        meta['pitch_edit_st'] = dict(abs_p50=round(float(np.percentile(np.abs(dl), 50)), 2),
                                     abs_p95=round(float(np.percentile(np.abs(dl), 95)), 2),
                                     up_max=round(float(dl.max()), 2), down_max=round(float(dl.min()), 2))
        dd_ = np.concatenate([g['dur'] for g in tgs])
        meta['duration_factor'] = dict(min=round(float(dd_.min()), 2), max=round(float(dd_.max()), 2))
        ys = []
        for x, p, sp, tg in zip(xs, plans, spans, tgs):
            y, grid, tout = psola(x, SR, tg, med_st, shift, k, seed=int(hashlib.md5(p['text'].encode()).hexdigest()[:7], 16))
            y = apply_gain(y, SR, tg['gain'], tg['tf'], grid, tout)
            sp_out = [(float(np.interp(a, grid, tout)), float(np.interp(b, grid, tout))) for a, b in sp]
            d = frame_db(y, SR) - ref                            # crisp sentence end: drop the long breathy decay
            last_on = int(sp_out[-1][0] / HOP)
            ab = np.where(d[last_on:] > k['tail_trim_db'])[0]
            if len(ab):
                y = fade(y[:min(len(y), int(((last_on + ab[-1] + 1) * HOP + 0.015) * SR))], SR, 12, 'out')
            y = set_gaps(y, SR, ref, p, sp_out, k)               # interior pauses only: the tail is untouched
            y, _ = trim(y, SR, ref, margin=0.0)
            ys.append(fade(y, SR, 3))
        meta['post_s'] = round(time.time() - t0, 2)
        if k['sentence_level_even']:                             # even loudness: active-speech RMS per sentence
            lv = []
            for y in ys:
                d = frame_db(y, SR); act = d[d > np.percentile(d, 95) - 25]
                lv.append(10 * np.log10(np.mean(10 ** (act / 10))))
            m = float(np.median(lv))
            ys = [y * 10 ** (float(np.clip(m - l, -3, 3)) / 20) for y, l in zip(ys, lv)]
        parts = [np.zeros(int(k['lead_ms'] / 1000 * SR))]
        joins = []
        for i, (y, p) in enumerate(zip(ys, plans)):
            parts.append(y)
            if i < len(ys) - 1:
                ms, cls = p['words'][-1]['pause_ms'], p['words'][-1]['cls']
                ms = ms if ms is not None else prof['tts_targets']['break_ms']['sentence']
                joins.append((cls, round(ms)))
                parts.append(np.zeros(int(round(ms / 1000 * SR))))
        parts.append(np.zeros(int(k['tail_ms'] / 1000 * SR)))
        y = np.concatenate(parts)
        meta['joins'] = joins
        meta['plan'] = [dict(text=p['text'], aside=p['aside'],
                             words=[(w['core'], w['cat'], w['cls'], None if w['pause_ms'] is None else round(w['pause_ms']))
                                    for w in p['words']]) for p in plans]
    L = write_norm(y, SR, out, k)
    meta['lufs'], meta['peak_dbfs'] = L
    meta['duration_s'] = round(len(y) / SR, 2)
    meta['run_s'] = round(time.time() - t_start, 2)
    json.dump(meta, open(re.sub(r'\.wav$', '', out) + '.render.json', 'w'), indent=1)
    log(f"{out}: {meta['duration_s']} s audio, {meta['run_s']} s run, LUFS {L[0]}")
    return meta


def main():
    if len(sys.argv) > 2 and sys.argv[1] == '_synth':
        return synth_worker(sys.argv[2])
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['render', 'plan'])
    ap.add_argument('script'); ap.add_argument('out', nargs='?')
    ap.add_argument('--voice'); ap.add_argument('--plain', action='store_true')
    ap.add_argument('--knobs'); ap.add_argument('--set', action='append', default=[])
    ap.add_argument('--project'); ap.add_argument('--work')
    o = ap.parse_args()
    kn = json.load(open(o.knobs)) if o.knobs else {}
    for kv in o.set:
        key, v = kv.split('=', 1)
        try: v = json.loads(v)
        except ValueError: pass
        cur = kn
        ks = key.split('.')
        for kk in ks[:-1]:
            cur = cur.setdefault(kk, dict(KNOBS.get(kk, {})) if cur is kn else {})
        cur[ks[-1]] = v
    proj = [p.strip() for p in o.project.split(',')] if o.project else None
    if o.cmd == 'plan':
        for p in plan_script(o.script, proj, kn):
            print(p['text']); print('   ', [(w['core'], w['cat'], w['cls'], w['pause_ms'] and round(w['pause_ms'])) for w in p['words']])
        return
    render(o.script, o.out, o.voice, o.plain, kn, proj, o.work)


if __name__ == '__main__':
    main()
