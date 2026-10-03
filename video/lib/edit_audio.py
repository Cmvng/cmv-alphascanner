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
    df3 = (E.get('voice') or {}).get('enhance') == 'df3'
    if df3:                                              # clean the whole recording once, then cut the clean voice
        raw_wav, clean = os.path.join(out_dir, 'src_raw.wav'), os.path.join(out_dir, 'src_df3.wav')
        if not os.path.exists(clean):
            subprocess.run([FF, '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', str(SR), raw_wav], check=True)
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
        for rng in item['w']: ps += pieces_for(words, rng, e, k, floor)
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
    raw = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', VOICE_DF if df3 else VOICE, '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-'],
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
