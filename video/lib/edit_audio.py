"""Talking-head edit: cut the owner's own recording at word boundaries, tighten the pauses, clean the voice.

  python3 edit_audio.py plan edl.json out_dir

Reads the edit decision list (source video, word timings from faster-whisper, the cold open and the clips as ranges of
word indices) and writes out_dir/plan.json (every kept piece of the recording with its place on the new timeline) and
out_dir/voice.wav (the cleaned voice on that timeline, silence elsewhere).
"""
import json, os, subprocess, sys
import numpy as np

SR = 48000
FF = os.environ.get('FFMPEG', 'ffmpeg')
# the owner's phone/laptop mic: a gentle clean-up (noise floor, boxiness, presence, even level) — no robot sound
VOICE = ('highpass=f=75,afftdn=nr=10:nf=-42:tn=1,equalizer=f=280:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.3:g=3,'
         'equalizer=f=9000:t=q:w=1.5:g=1.5,acompressor=threshold=-22dB:ratio=3:attack=6:release=120:makeup=4')
# after DeepFilterNet3 (voice.enhance = "df3"; the owner asked for a clearer, more present voice, 3 Oct): the room and
# the echo are already gone, so this cuts the low rumble, lifts presence and keeps the level steady and forward
VOICE_DF = ('highpass=f=85,highpass=f=85,equalizer=f=250:t=q:w=1.2:g=-2,equalizer=f=3000:t=q:w=1.2:g=3.5,'
            'equalizer=f=8000:t=q:w=1.5:g=2,deesser=i=0.35,acompressor=threshold=-24dB:ratio=4:attack=5:release=120:makeup=5')
# 5 Oct: measured on the owner's camera audio (DNSMOS overall / speech-recogniser confidence), VOICE_DF made the cleaned
# voice WORSE (2.57 / -0.284 against 2.91 / -0.271 for the cleaned voice alone): its presence and air boosts lift the
# hiss and its compressor pumps. The default after cleaning is now only a rumble cut and a gentle boom cut ("post":
# "light"); "full" keeps the old chain. Generative restoration (Resemble Enhance) scored higher on DNSMOS but blurred the
# owner's consonants (the recogniser heard "only market" for "Polymarket"), so it is not used.
VOICE_LIGHT = 'highpass=f=80,lowshelf=f=220:g=-4'
DF_PY = os.environ.get('DF_PYTHON', '/home/user/.venvs/tts/bin/python')


def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def energy(x, win=0.01):
    k = int(win * SR); n = len(x) // k
    return 20 * np.log10(np.sqrt((x[:n * k].reshape(n, k) ** 2).mean(1)) + 1e-9), k


def snap(e, k, t, lo, hi):
    """Move a cut to the quietest 10 ms within [t+lo, t+hi]: cuts land between sounds, not inside them."""
    a, b = max(0, int((t + lo) * SR / k)), min(len(e) - 1, int((t + hi) * SR / k))
    return (a + int(np.argmin(e[a:b + 1]))) * k / SR if b > a else t


def pieces_for(words, rng, e, k, floor, gap_keep=0.2, gap_min=0.38):
    """One word range → the spoken pieces, with any pause longer than gap_min shortened to gap_keep.
    A range is [first, last] word index, optionally with { "pre"/"post": seconds to widen } or { "start"/"end": source
    seconds } to fix a cut by hand: whisper's word edges can be a syllable off ("resistance", "3,000" ending early), so
    every cut is checked by transcribing the edited voice."""
    if isinstance(rng, dict):                            # { "t": [start, end] } in source seconds: a phrase cut at its silences
        s, t_end = rng['t']
    else:
        a, b = rng[0], rng[1]; opt = rng[2] if len(rng) > 2 else {}
        s = words[a]['s']; t_end = words[b]['e']
        if b + 1 < len(words): t_end = min(t_end, words[b + 1]['s'])
        if a > 0: s = max(s, words[a - 1]['e'] - 0.02)
        s = snap(e, k, s, -0.05, 0.02); t_end = snap(e, k, t_end, 0.0, 0.12)
        s = opt.get('start', s - opt.get('pre', 0)); t_end = opt.get('end', t_end + opt.get('post', 0))   # by-hand fixes, in source seconds
    # pauses inside: frames below the floor for longer than gap_min
    i0, i1 = int(s * SR / k), int(t_end * SR / k)
    quiet = e[i0:i1] < floor
    out, cur, j = [], s, 0
    while j < len(quiet):
        if quiet[j]:
            q = j
            while q < len(quiet) and quiet[q]: q += 1
            if (q - j) * k / SR > gap_min and j > 0 and q < len(quiet):
                cut0 = (i0 + j) * k / SR + gap_keep / 2; cut1 = (i0 + q) * k / SR - gap_keep / 2
                out.append([round(cur, 3), round(cut0, 3)]); cur = cut1
            j = q
        else: j += 1
    out.append([round(cur, 3), round(t_end, 3)])
    return [p for p in out if p[1] - p[0] > 0.05]


def plan(edl_path, out_dir):
    E = json.load(open(edl_path)); base = os.path.dirname(os.path.abspath(edl_path))
    src = os.path.join(base, E['source']); words = json.load(open(os.path.join(base, E['words'])))
    os.makedirs(out_dir, exist_ok=True)
    V = E.get('voice') or {}; df3 = V.get('enhance') == 'df3'
    if df3:                                              # clean the whole recording once, then cut the clean voice
        # "declip": repair clipped peaks first; "dereverb": take the room echo out (WPE) before DeepFilterNet3
        tag = 'src' + ('_declip' if V.get('declip') else '') + ('_wpe' if V.get('dereverb') else '') + '_df3'
        raw_wav, clean = os.path.join(out_dir, 'src_raw.wav'), os.path.join(out_dir, tag + '.wav')
        if not os.path.exists(clean):
            af = ['-af', 'adeclip'] if V.get('declip') else []
            subprocess.run([FF, '-v', 'error', '-y', '-i', src] + af + ['-ac', '1', '-ar', str(SR), raw_wav], check=True)
            if V.get('dereverb'):
                from dereverb import dereverb
                import soundfile as sf
                d, r = sf.read(raw_wav, dtype='float32'); sf.write(raw_wav, dereverb(d, r), r)
            subprocess.run([DF_PY, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'df_enhance.py'), raw_wav, clean], check=True)
        x = load(clean)
    else:
        x = load(src)
    e, k = energy(x)
    floor = np.percentile(e, 20) + 3                     # just above the room noise (soft consonants stay in)
    T = E.get('timing', {})
    t = T.get('lead', 0.35); segs = []
    def place(kind, item, gap_after):
        nonlocal t
        ps = []
        for rng in item['w']: ps += pieces_for(words, rng, e, k, floor, T.get('gap_keep', 0.2), T.get('gap_min', 0.38))
        seg = {'kind': kind, 'start': round(t, 3), 'pieces': []}
        for a, b in ps:
            seg['pieces'].append({'src': a, 'dur': round(b - a, 3), 'out': round(t, 3)}); t += b - a
        seg['end'] = round(t, 3); seg.update({x_: v for x_, v in item.items() if x_ != 'w'})
        segs.append(seg); t += gap_after
    for i, c in enumerate(E['cold']): place('cold', c, T.get('cold_gap', 0.45) if i < len(E['cold']) - 1 else 0)
    t += T.get('silence', 0.75)                          # the silence before the drop
    drop = round(t, 3); segs.append({'kind': 'title', 'start': drop, 'end': round(drop + T.get('title', 1.5), 3), **E.get('title', {})}); t += T.get('title', 1.5)
    for c in E['clips']:
        if c.get('id') == 'PRODUCT':
            pr = E.get('product', {})        # its own kind ("coin": the coin itself, live) is kept as kind2
            segs.append({**pr, 'kind2': pr.get('kind'), 'kind': 'product', 'start': round(t + 0.1, 3), 'end': round(t + 0.1 + T.get('product', 8.5), 3)}); t += 0.1 + T.get('product', 8.5) + 0.25
            continue
        if c.get('insert'):                 # a full-screen graphic between clips (a numbers board, a comparison card)
            ins = c['insert']; d = ins.get('dur', 7.5)
            segs.append({**ins, 'kind2': ins.get('kind'), 'kind': 'insert', 'start': round(t + 0.1, 3), 'end': round(t + 0.1 + d, 3)}); t += 0.1 + d + 0.25
            continue
        place('clip', c, T.get('clip_gap', 0.2))
    # captions timed to the spoken words: each clip's caption text is aligned to the word timings that fall in its pieces
    if E.get('caption_words'):
        import difflib, re
        CW = json.load(open(os.path.join(base, E['caption_words'])))
        norm = lambda w: re.sub(r"[^a-z0-9%$]", '', w.lower())
        for sg in segs:
            if not sg.get('pieces') or not sg.get('cap'): continue
            ws = []
            for p_ in sg['pieces']:
                a_, b_ = p_['src'], p_['src'] + p_['dur']
                for w in CW:
                    m_ = (w['s'] + w['e']) / 2
                    if a_ <= m_ < b_: ws.append({'n': norm(w['w']), 't0': round(p_['out'] + max(0, w['s'] - a_), 3), 't1': round(p_['out'] + min(p_['dur'], w['e'] - a_), 3)})
            toks = sg['cap'].split(); tn = [norm(x) for x in toks]
            sm = difflib.SequenceMatcher(None, tn, [w['n'] for w in ws], autojunk=False)
            tm = [None] * len(toks)
            for op, i1, i2, j1, j2 in sm.get_opcodes():
                if op == 'equal':
                    for k_ in range(i2 - i1): tm[i1 + k_] = (ws[j1 + k_]['t0'], ws[j1 + k_]['t1'])
                elif op == 'replace' and j2 > j1:          # spread the caption words over the heard words they replace
                    a0, b0 = ws[j1]['t0'], ws[j2 - 1]['t1']
                    for k_ in range(i2 - i1): tm[i1 + k_] = (a0 + (b0 - a0) * k_ / (i2 - i1), a0 + (b0 - a0) * (k_ + 1) / (i2 - i1))
            t_lo, t_hi = sg['pieces'][0]['out'], sg['end']       # words with no match sit between their neighbours
            for i_ in range(len(toks)):
                if tm[i_] is None:
                    prv = next((tm[j][1] for j in range(i_ - 1, -1, -1) if tm[j]), t_lo); nxt = next((tm[j][0] for j in range(i_ + 1, len(toks)) if tm[j]), t_hi)
                    tm[i_] = (prv, max(prv + 0.05, min(nxt, prv + 0.3)))
            sg['words'] = [{'w': toks[i_], 't0': round(tm[i_][0], 3), 't1': round(tm[i_][1], 3)} for i_ in range(len(toks))]
    segs.append({'kind': 'end', 'start': round(t + 0.2, 3), 'end': round(t + 0.2 + T.get('end', 3.8), 3), **E.get('end', {})})
    dur = round(t + 0.2 + T.get('end', 3.8), 3)
    # the voice on the new timeline: pieces with 12 ms fades, then the clean-up chain
    v = np.zeros(int((dur + 0.5) * SR), np.float32); f = int(0.012 * SR)
    for sg in segs:
        for p in sg.get('pieces', []):
            a = x[int(p['src'] * SR):int((p['src'] + p['dur']) * SR)].copy()
            a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
            o = int(p['out'] * SR); v[o:o + len(a)] += a
    os.makedirs(out_dir, exist_ok=True)
    raw = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', (VOICE_DF if V.get('post') == 'full' else V.get('post_af', VOICE_LIGHT)) if df3 else VOICE, '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-'],
                         input=v.tobytes(), capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.float32).copy(); v /= np.abs(v).max() + 1e-9; v *= 0.89
    import wave
    with wave.open(os.path.join(out_dir, 'voice.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(v, -1, 1) * 32767).astype('<i2').tobytes())
    json.dump({'source': src, 'duration': dur, 'drop': drop, 'segments': segs}, open(os.path.join(out_dir, 'plan.json'), 'w'), indent=1)
    spoken = sum(p['dur'] for s in segs for p in s.get('pieces', []))
    print(f'plan: {dur:.1f}s ({spoken:.1f}s of speech in {sum(len(s.get("pieces", [])) for s in segs)} pieces), drop at {drop:.2f}s')


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    {'plan': plan}[cmd](*args)
