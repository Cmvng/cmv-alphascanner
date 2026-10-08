"""Voice, music, sound effects and the final mix for the cmvng videos.

  python3 audio.py speak  sentences.json voice out_dir speed models_dir -> one WAV per sentence + durations.json
  python3 audio.py beats  music_file start_seconds out.json            -> tempo + beat grid of the track from `start`
  python3 audio.py mix    timeline.json out.wav                         -> voice + music (ducked) + sound effects

Voices: Kokoro (natural, free, offline: af_heart, af_bella, am_michael, bf_emma, ...) or a Piper .onnx file.
Sound effects are synthesised here (no licences needed), or recorded Mixkit effects by id (free licence; see lib/sfx.json).
"""
import re
import json, os, subprocess, sys, wave
import numpy as np

SR = 48000
FF = os.environ.get('FFMPEG', 'ffmpeg')


# ----------------------------------------------------------------------------- files
def read_any(path, sr=SR, channels=2):
    """Decode any audio file with ffmpeg → float32 array (n, channels)."""
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-f', 'f32le', '-ac', str(channels), '-ar', str(sr), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()


def write_wav(path, a, sr=SR):
    a = np.clip(a, -1, 1)
    if a.ndim == 1:
        a = a[:, None]
    with wave.open(path, 'wb') as w:
        w.setnchannels(a.shape[1]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((a * 32767).astype('<i2').tobytes())


# ----------------------------------------------------------------------------- voice
def trim(a, sr, thr=0.012, pad=0.04):
    """Cut leading/trailing silence so lines follow each other like a real read."""
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx):
        return a
    p = int(pad * sr)
    return a[max(0, idx[0] - p): idx[-1] + p]


# Voice colour, applied to every line after it is spoken (ffmpeg filters at 48 kHz). "deep" is the explainer voice the
# owner picked (3 Oct): a touch lower, warmer, more present, with a small room. Line lengths don't change.
VOICE_FX = {
    'broadcast': 'highpass=f=70,equalizer=f=160:t=q:w=1:g=3,equalizer=f=3500:t=q:w=1.2:g=3.5,equalizer=f=7500:t=q:w=2:g=-2,'
                 'acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=4,aecho=0.8:0.5:28:0.06',
    'deep': 'asetrate=48000*0.955,aresample=48000,atempo=1/0.955,highpass=f=60,equalizer=f=140:t=q:w=1:g=4,'
            'equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=7500:t=q:w=2:g=-2.5,'
            'acompressor=threshold=-21dB:ratio=3.5:attack=5:release=100:makeup=5,aecho=0.8:0.5:32:0.07',
}


def voice_fx(a, chain):
    raw = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', VOICE_FX[chain],
                          '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-'], input=a.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def speak(sentences_file, voice, out_dir, speed='1.0', models_dir='.', fx=None):
    os.makedirs(out_dir, exist_ok=True)
    out = {}
    items = json.load(open(sentences_file))
    if voice.endswith('.onnx'):                                   # Piper voice file
        from piper import PiperVoice, SynthesisConfig
        pv = PiperVoice.load(voice)
        cfg = SynthesisConfig(length_scale=1 / float(speed))
        def say(text):
            path = os.path.join(out_dir, '_tmp.wav')
            with wave.open(path, 'wb') as w:
                pv.synthesize_wav(text, w, syn_config=cfg)
            a = read_any(path, SR, 1)[:, 0]
            return a
    else:                                                         # Kokoro voice name
        from kokoro_onnx import Kokoro
        k = Kokoro(os.path.join(models_dir, 'kokoro-v1.0.onnx'), os.path.join(models_dir, 'voices-v1.0.bin'))
        lang = 'en-gb' if voice[0] == 'b' else 'en-us'
        style = voice
        if '+' in voice:                                          # a blend: "am_michael:0.6+am_fenrir:0.4"
            parts = [(v.split(':')[0], float(v.split(':')[1]) if ':' in v else 1.0) for v in voice.split('+')]
            tot = sum(w for _, w in parts)
            style = sum(k.get_voice_style(v) * (w / tot) for v, w in parts)
        # a name written [Name](/ipa/) is spoken from its phonemes exactly (the G2P guesses many names wrong:
        # "Olise" as AH-lize, "Doué" as dow-AY); the rest of the line is phonemized as usual
        IPA = re.compile(r'\[([^\]]+)\]\(/([^/)]+)/\)')
        def say(text):
            if IPA.search(text):
                parts, pos = [], 0
                for m in IPA.finditer(text):
                    if text[pos:m.start()].strip(): parts.append(k.tokenizer.phonemize(text[pos:m.start()], lang).strip())
                    parts.append(m.group(2)); pos = m.end()
                if text[pos:].strip(): parts.append(k.tokenizer.phonemize(text[pos:], lang).strip())
                a, sr = k.create(' '.join(x for x in parts if x), voice=style, speed=float(speed), lang=lang, is_phonemes=True)
            else:
                a, sr = k.create(text, voice=style, speed=float(speed), lang=lang)
            a = np.asarray(a, dtype=np.float32)
            return np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a).astype(np.float32)
    for s in items:
        a = trim(say(s['text']), SR)
        if fx:
            a = voice_fx(a, fx)
        a = a / (np.abs(a).max() + 1e-9) * 0.89
        write_wav(os.path.join(out_dir, f"{s['id']}.wav"), a)
        out[s['id']] = len(a) / SR
    json.dump(out, open(os.path.join(out_dir, 'durations.json'), 'w'))


# ----------------------------------------------------------------------------- music analysis
def onset_env(x, sr, hop=512):
    n = len(x) // hop
    fr = x[:n * hop].reshape(n, hop) * np.hanning(hop)
    S = np.log1p(np.abs(np.fft.rfft(fr, axis=1)))
    flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
    return np.concatenate([[0], flux]), sr / hop


def beats(music_file, start, out_json):
    """Tempo and beat grid from `start` (nudged onto the nearest strong hit). A phase-aware comb over
    60 s of the track: every candidate tempo is scored at its best-fitting phase."""
    sr = 22050
    x = read_any(music_file, sr, 1)[:, 0]
    env, fps = onset_env(x, sr, hop=256)
    start = float(start)
    i0, i1 = int(max(0, start - 0.6) * fps), int((start + 0.6) * fps)
    start = (i0 + int(np.argmax(env[i0:i1]))) / fps if i1 > i0 else start
    seg = env[int(start * fps): int((start + 60) * fps)]
    seg = (seg - seg.mean()) / (seg.std() + 1e-9)
    best = (-9, 120.0)
    for bpm in np.arange(80, 175, 0.05):
        p = 60 / bpm * fps
        idx = np.arange(0, len(seg) - p, p)
        sc = max(seg[(idx + ph).astype(int)].mean() for ph in np.arange(0, p, max(1, p / 16)))
        best = max(best, (sc, bpm))
    bpm = best[1]
    if bpm > 140:          # count the slower pulse: a cut on every beat at 140+ is too busy
        bpm /= 2
    json.dump({'start': start, 'bpm': bpm, 'beat': 60 / bpm}, open(out_json, 'w'))


# ----------------------------------------------------------------------------- sound effects
rng = np.random.default_rng(7)


def _sweep_noise(dur, f0, f1, width=0.5):
    """Noise through a band-pass whose centre glides f0→f1 (log). Short-time FFT filtering."""
    n = int(dur * SR); hop = 256; win = 1024
    x = rng.standard_normal(n + win)
    out = np.zeros(n + win)
    w = np.hanning(win)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for k, i in enumerate(range(0, n, hop)):
        u = i / max(1, n)
        fc = f0 * (f1 / f0) ** u
        g = np.exp(-0.5 * (np.log(np.maximum(freqs, 1) / fc) / width) ** 2)
        out[i:i + win] += np.fft.irfft(np.fft.rfft(x[i:i + win] * w) * g) * w
    return out[:n] / (np.abs(out).max() + 1e-9)


def _stereo(m, pan=0.0):
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([m * l * 1.41, m * r * 1.41], 1)


def fx_whoosh(dur=0.5):
    n = int(dur * SR); t = np.arange(n) / n
    env = np.sin(np.pi * np.clip(t / 0.62, 0, 1) / 2) ** 2 * np.clip((1 - t) / 0.38, 0, 1) ** 1.5
    up = _sweep_noise(dur * 0.62, 350, 5000); down = _sweep_noise(dur * 0.38 + 0.01, 5000, 900)
    m = np.concatenate([up, down])[:n] * env
    pan = np.linspace(-0.7, 0.7, n)
    return np.stack([m * np.cos((pan + 1) * np.pi / 4), m * np.sin((pan + 1) * np.pi / 4)], 1) * 1.2


def fx_impact(dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 62 * np.exp(-t * 2.5) + 38
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    click = rng.standard_normal(n) * np.exp(-t / 0.006) * 0.6
    body = _sweep_noise(dur, 900, 120, 0.8) * np.exp(-t / 0.18) * 0.35
    m = np.tanh(1.8 * (boom + click + body)) * 0.9
    return _stereo(m)


def fx_riser(dur=1.6):
    n = int(dur * SR); t = np.arange(n) / n
    m = _sweep_noise(dur, 400, 9000, 0.6) * t ** 2.2 * 0.8
    tone = np.sin(2 * np.pi * np.cumsum(220 * 4 ** t) / SR) * t ** 3 * 0.18
    return _stereo(m + tone)


def fx_tick(pitch=1.0):
    n = int(0.09 * SR); t = np.arange(n) / SR
    m = (np.sin(2 * np.pi * 1800 * pitch * t) + 0.4 * np.sin(2 * np.pi * 3600 * pitch * t)) * np.exp(-t / 0.018)
    return _stereo(m * 0.55)


def fx_ding():
    """Win: bright two-note chime."""
    out = np.zeros((int(1.6 * SR), 2))
    for k, (f, delay) in enumerate([(1318.5, 0.0), (1975.5, 0.09)]):
        n = int(1.4 * SR); t = np.arange(n) / SR
        m = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in [(1, 1, 0.5), (2.0, 0.35, 0.25), (2.76, 0.25, 0.15), (5.4, 0.12, 0.06)])
        i = int(delay * SR); out[i:i + n] += _stereo(m * 0.42, -0.25 + 0.5 * k)
    return out


def fx_thud():
    """Loss: muffled low hit and a falling tone."""
    n = int(0.9 * SR); t = np.arange(n) / SR
    m = np.sin(2 * np.pi * np.cumsum(140 * np.exp(-t * 3) + 45) / SR) * np.exp(-t / 0.22)
    m += _sweep_noise(0.9, 300, 80, 0.7) * np.exp(-t / 0.1) * 0.3
    return _stereo(np.tanh(1.5 * m) * 0.8)


def fx_cash():
    """Money total: quick bright shimmer."""
    n = int(0.8 * SR); t = np.arange(n) / SR
    m = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in [(2637, 0.12), (3136, 0.18), (3951, 0.25), (5274, 0.3)])
    m += _sweep_noise(0.8, 6000, 9000, 0.4) * np.exp(-t / 0.15) * 0.4
    return _stereo(m * 0.25)


# ---- reaction sounds for the post-match videos (all synthesised: no licences)

def fx_boom():
    """The meme "boom": a deep, saturated sub hit with a long tail."""
    n = int(2.2 * SR); t = np.arange(n) / SR
    f = 75 * np.exp(-t * 1.4) + 36
    m = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.75)
    m += 0.5 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR) * np.exp(-t / 0.35)
    m += rng.standard_normal(n) * np.exp(-t / 0.004) * 0.5
    m = np.tanh(2.6 * m) * 0.95
    tail = np.convolve(m, np.exp(-np.arange(int(0.25 * SR)) / (0.08 * SR)) * 0.0009, mode='full')[:n]
    return _stereo(m + tail)


def _voices(dur, formants, swell, seed=0):
    """Many voices: two decorrelated noise beds through vowel formants, with a slow, uneven swell."""
    n = int(dur * SR); t = np.arange(n) / SR
    out = []
    for ch in range(2):
        bed = sum(a * _sweep_noise(dur, f0, f1, 0.35) for f0, f1, a in formants)
        wob = 1 + 0.25 * np.sin(2 * np.pi * (0.7 + 0.3 * ch) * t + ch) * np.sin(2 * np.pi * 0.31 * t)
        out.append(bed * swell(t) * wob)
    return np.stack(out, 1) / (np.abs(np.stack(out, 1)).max() + 1e-9)


def fx_crowd(dur=3.2):
    """Crowd roar: a stadium on its feet after a goal."""
    sw = lambda t: np.clip(t / 0.35, 0, 1) ** 1.5 * np.clip((dur - t) / 1.4, 0, 1)
    return _voices(dur, [(700, 900, 1.0), (1500, 1800, 0.7), (2600, 2900, 0.45), (300, 380, 0.6)], sw) * 0.9


def fx_groan(dur=2.4):
    """Crowd "ohhh": a near miss or a goal against, falling away."""
    sw = lambda t: np.clip(t / 0.25, 0, 1) * np.clip((dur - t) / 1.6, 0, 1) ** 1.3
    return _voices(dur, [(620, 380, 1.0), (1000, 700, 0.7), (2400, 2100, 0.3)], sw) * 0.85


def fx_scratch():
    """Record scratch: the beat stops, something unexpected happened."""
    parts = [_sweep_noise(0.11, 900, 4200, 0.25), _sweep_noise(0.09, 4200, 600, 0.25), _sweep_noise(0.16, 700, 2600, 0.3)]
    m = np.concatenate(parts)
    t = np.arange(len(m)) / len(m)
    return _stereo(np.tanh(2 * m * (1 - 0.4 * t)) * 0.8)


def fx_aww():
    """Sad trombone: wah, wah, wah, waaah."""
    notes = [(293.7, 0.32), (277.2, 0.32), (261.6, 0.32), (246.9, 1.1)]
    out = []
    for k, (f, d) in enumerate(notes):
        n = int(d * SR); t = np.arange(n) / SR
        vib = 1 + (0.012 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.2) / 0.2, 0, 1) if k == 3 else 0)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        m = sum(np.sin(h * ph) / h ** 1.15 for h in range(1, 12))
        env = np.clip(t / 0.03, 0, 1) * np.clip((d - t) / 0.08, 0, 1) * (1 - 0.35 * np.clip(t / d, 0, 1))
        wah = 0.55 + 0.45 * np.clip(t / 0.12, 0, 1)
        out.append(m * env * wah)
        out.append(np.zeros(int(0.03 * SR)))
    m = np.concatenate(out)
    return _stereo(np.tanh(1.4 * m / (np.abs(m).max() + 1e-9)) * 0.7)


def fx_pop():
    """Sticker pop."""
    n = int(0.12 * SR); t = np.arange(n) / SR
    m = np.sin(2 * np.pi * np.cumsum(380 + 9000 * t) / SR) * np.exp(-t / 0.035)
    return _stereo(m * 0.8)


def fx_flaps(dur=0.7, rate=36.0, seed=7):
    """A split-flap board settling: a burst of small plastic clacks that thins out as the tiles reach their letters."""
    rng = np.random.default_rng(seed)
    n = int((dur + 0.08) * SR); out = np.zeros(n); t = 0.0
    while t < dur:
        i = int(t * SR); k = int(0.014 * SR); tt = np.arange(k) / SR
        c = rng.standard_normal(k) * np.exp(-tt / 0.0014) * 0.9 + np.sin(2 * np.pi * rng.uniform(1700, 2700) * tt) * np.exp(-tt / 0.0025) * 0.45 \
            + np.sin(2 * np.pi * rng.uniform(380, 520) * tt) * np.exp(-tt / 0.004) * 0.3
        amp = rng.uniform(0.55, 1.0) * (1 - 0.65 * t / dur)
        out[i:i + k] += c[:max(0, n - i)] * amp
        t += rng.exponential(1 / (rate * (1 - 0.5 * t / dur)))
    out = np.diff(out, prepend=0) * 0.55 + out * 0.45
    return _stereo(out / (np.abs(out).max() + 1e-9) * 0.6)



def fx_zip(dur=0.5, seed=5):
    """A zipper: a fast run of tiny metal clicks, rising, that slows at the end, over a soft rasp."""
    rng = np.random.default_rng(seed)
    n = int((dur + 0.06) * SR); out = np.zeros(n); t = 0.0
    while t < dur:
        f = t / dur; i = int(t * SR); k = int(0.006 * SR); tt = np.arange(k) / SR
        c = rng.standard_normal(k) * np.exp(-tt / 0.0008) + np.sin(2 * np.pi * (3200 + 2200 * f) * tt) * np.exp(-tt / 0.0012) * 0.6
        out[i:i + k] += c[:max(0, n - i)] * (0.6 + 0.4 * np.sin(np.pi * f))
        t += 1 / (140 + 220 * np.sin(np.pi * min(0.95, f + 0.1)))
    rasp = rng.standard_normal(n) * 0.08 * np.clip(np.sin(np.pi * np.arange(n) / n), 0, 1)
    out = np.diff(out + rasp, prepend=0)
    return _stereo(out / (np.abs(out).max() + 1e-9) * 0.6)

FX = {'whoosh': fx_whoosh, 'impact': fx_impact, 'riser': fx_riser, 'ding': fx_ding, 'thud': fx_thud, 'cash': fx_cash,
      'tick': lambda: fx_tick(1.0), 'tick2': lambda: fx_tick(1.26), 'tick3': lambda: fx_tick(1.5),
      'boom': fx_boom, 'crowd': fx_crowd, 'groan': fx_groan, 'scratch': fx_scratch, 'aww': fx_aww, 'pop': fx_pop,
      'flap': lambda: fx_flaps(0.26, 30.0, 3), 'flaps': lambda: fx_flaps(0.7, 36.0, 7), 'flapsl': lambda: fx_flaps(1.3, 40.0, 11), 'zip': fx_zip}
FX_GAIN = {'whoosh': 0.4, 'impact': 0.42, 'riser': 0.32, 'ding': 0.5, 'thud': 0.5, 'cash': 0.4, 'tick': 0.35, 'tick2': 0.35, 'tick3': 0.4,
           'boom': 0.62, 'crowd': 0.42, 'groan': 0.42, 'scratch': 0.45, 'aww': 0.4, 'pop': 0.35,
           'flap': 0.32, 'flaps': 0.36, 'flapsl': 0.36, 'zip': 0.42}


# ---- recorded sound effects (Mixkit Sound Effects Free License: commercial use allowed, no credit needed;
#      the files can't be passed on by themselves, so they live in the git-ignored cache and download on first use)
SFX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache', 'sfx')
_sfx_cache = {}


def sfx_sample(ref, reverse=False, rate=1.0, maxlen=None):
    """A recorded effect by Mixkit id ('788') or path → stereo array (peak 1.0)."""
    key = (str(ref), reverse, rate, maxlen)
    if key in _sfx_cache:
        return _sfx_cache[key]
    path = str(ref)
    if path.isdigit():
        path = os.path.join(SFX_DIR, f'{ref}.mp3')
        if not os.path.exists(path):
            os.makedirs(SFX_DIR, exist_ok=True)
            subprocess.run(['curl', '-sS', '-f', '-o', path, f'https://assets.mixkit.co/active_storage/sfx/{ref}/{ref}-preview.mp3'], check=True)
    a = read_any(path, int(SR / rate), 2) if rate != 1.0 else read_any(path, SR, 2)   # rate < 1: lower and longer
    a = a[max(0, np.argmax(np.abs(a).max(1) > 0.002) - 48):]
    if reverse:                                  # a reverse swell: the tail played backwards, ending on the hit itself
        a = a[_anchor(a, 'peak'):]
    if maxlen and len(a) > maxlen * SR:
        a = a[:int(maxlen * SR)]
        f = int(0.15 * SR); a[-f:] *= np.linspace(1, 0, f)[:, None]
    if reverse:
        a = a[::-1].copy()
        f = int(0.4 * SR); a[:f] *= np.linspace(0, 1, f)[:, None] ** 2
    a /= np.abs(a).max() + 1e-9
    _sfx_cache[key] = a
    return a


def _anchor(a, align):
    """Sample index of the moment that should land on the cue: onset, peak, end or start."""
    if align == 'start':
        return 0
    if align == 'end':
        return len(a)
    hop = 240; m = np.abs(a).max(1); n = len(m) // hop
    e = np.sqrt((m[:n * hop].reshape(n, hop) ** 2).mean(1))
    if align == 'peak':
        return int(np.argmax(e) * hop)
    db = 20 * np.log10(e + 1e-9)
    return int(np.argmax(db > db.max() - 12) * hop)      # onset: where it first gets within 12 dB of its peak


def _loud_rms(a, win=0.3):
    m = a.mean(1) if a.ndim == 2 else a
    k = int(win * SR)
    if len(m) <= k:
        return rms(m)
    c = np.cumsum(np.concatenate([[0.0], m.astype(np.float64) ** 2]))
    return float(np.sqrt((c[k:] - c[:-k]).max() / k) + 1e-9)


def peak_limit(x, ceiling=0.95, release=0.15):
    """Look-ahead peak limiter: turns down only the loud moments instead of the whole mix."""
    blk = 64; n = len(x) // blk + 1
    pk = np.zeros(n * blk); pk[:len(x)] = np.abs(x).max(1)
    pk = pk.reshape(n, blk).max(1)
    need = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    look = 3                                               # ~4 ms look-ahead so the gain is down before the hit
    need = np.minimum.reduce([np.roll(need, -k) for k in range(look + 1)])
    g = np.empty(n); cur = 1.0; r = 1 - np.exp(-blk / (release * SR))
    for i in range(n):
        cur = need[i] if need[i] < cur else cur + (need[i] - cur) * r
        g[i] = cur
    gs = np.interp(np.arange(len(x)), np.arange(n) * blk + blk / 2, g)
    return x * gs[:, None]


# ----------------------------------------------------------------------------- mix
def rms(a):
    return float(np.sqrt(np.mean(a ** 2)) + 1e-9)


def mix(timeline_file, out_path):
    tl = json.load(open(timeline_file))
    n = int((tl['duration'] + 0.5) * SR)
    voice = np.zeros(n, dtype=np.float32)
    for s in tl.get('sentences', []):
        if not s.get('wav'):
            continue
        a = read_any(s['wav'], SR, 1)[:, 0]
        i = int(s['start'] * SR)
        voice[i:i + len(a)] += a[:max(0, n - i)]

    out = np.zeros((n, 2), dtype=np.float32)
    out += voice[:, None]

    m = tl.get('music')
    if m:
        full = read_any(m['file'], SR, 2)
        st = int(m['start'] * SR)
        music = np.concatenate([np.zeros((-st, 2), np.float32), full]) if st < 0 else full[st:]
        if m.get('loop'):                        # past the loop end, go back to the loop start (whole bars: no seam)
            a, b = int(m['loop'][0] * SR), int(m['loop'][1] * SR)
            music = music[:max(0, b - st)]
            x = int(0.008 * SR)
            ramp = np.linspace(0, 1, x)[:, None]
            while len(music) < n:                # 8 ms crossfade at the seam
                seg = full[a:b]
                music = np.concatenate([music[:-x], music[-x:] * (1 - ramp) + seg[:x] * ramp, seg[x:]])
        if len(music) < n:                       # loop if the track is shorter than the video
            music = np.concatenate([music] * (n // max(1, len(music)) + 1))
        music = music[:n]
        # loudness: music sits ~2 dB under the voice between lines and ~11 dB under while the voice speaks
        talking = voice[np.abs(voice) > 0.02]
        v_rms = rms(talking) if len(talking) else 0.1
        if m.get('ref') == 'loud':                     # level from the track's loud part (tracks with a quiet intro and a drop)
            k = int(0.4 * SR); c = np.cumsum(np.concatenate([[0.0], music.mean(1).astype(np.float64) ** 2]))
            st = np.sqrt(np.maximum(0, (c[k:] - c[:-k])[::k // 4] / k))
            m_rms = float(np.percentile(st, 80)) + 1e-9
        else:
            m_rms = rms(music[int(2 * SR):int(30 * SR)] if len(music) > 30 * SR else music)
        base = v_rms / m_rms * 10 ** ((-2 + m.get('level', 0)) / 20)
        if m.get('muffle'):                            # cold open: the track sounds far away until the drop
            from scipy.signal import butter, sosfiltfilt
            mu = m['muffle']; cut = int(mu['until'] * SR)
            sos = butter(4, mu.get('hz', 650), 'low', fs=SR, output='sos')
            low = sosfiltfilt(sos, music[:cut + int(0.1 * SR)], axis=0).astype(np.float32) * 10 ** (mu.get('db', 2) / 20)
            x = np.clip((np.arange(len(low)) - (cut - int(0.06 * SR))) / (0.06 * SR), 0, 1)[:, None]
            music[:len(low)] = low * (1 - x) + music[:len(low)] * x
        for c0, c1 in m.get('cuts', []):               # music drops out (e.g. the beat stops before the drop)
            i0, i1 = int(c0 * SR), int(c1 * SR); fo, fi = int(0.03 * SR), int(0.004 * SR)
            music[max(0, i0 - fo):i0] *= np.linspace(1, 0, min(fo, i0))[:, None]
            music[i0:i1] = 0
            music[i1:i1 + fi] *= np.linspace(0, 1, len(music[i1:i1 + fi]))[:, None]
        env = np.abs(voice)
        k = int(0.03 * SR); env = np.convolve(env, np.ones(k) / k, 'same')
        active = (env > 0.015).astype(np.float32)
        # attack 40 ms, release 350 ms
        g = np.empty_like(active); cur = 0.0
        a_c, r_c = 1 / (0.04 * SR), 1 / (0.35 * SR)
        for i in range(0, n, 64):
            tgt = active[i]
            cur += (tgt - cur) * min(1, (a_c if tgt > cur else r_c) * 64)
            g[i:i + 64] = cur
        duck = 10 ** (-m.get('duck', 9) * g / 20)
        fade_in = np.clip(np.arange(n) / (0.08 * SR), 0, 1)
        fade_out = np.clip((n - np.arange(n)) / (1.2 * SR), 0, 1)
        out += music * (base * duck * fade_in * fade_out)[:, None]

    talking = voice[np.abs(voice) > 0.02]
    v_ref = rms(talking) if len(talking) else 0.1
    for e in tl.get('fx', []):
        if e.get('sfx'):                               # recorded effect: its onset/peak/end lands on the cue, level vs the voice
            a = sfx_sample(e['sfx'], e.get('reverse', False), e.get('rate', 1.0), e.get('max'))
            a = a * (v_ref / _loud_rms(a) * 10 ** (e.get('db', -6) / 20))
            if e.get('pan'):
                a = a * np.array([min(1, 1 - e['pan']), min(1, 1 + e['pan'])], dtype=np.float32)
            i = int(e['t'] * SR) - _anchor(a, e.get('align', 'onset'))
            if i < 0:
                a, i = a[-i:], 0
            out[i:i + len(a)] += a[:max(0, n - i)]
            continue
        if e['type'] not in FX:
            continue
        a = FX[e['type']]() * FX_GAIN[e['type']] * e.get('gain', 1.0)
        i = int(e['t'] * SR) - (int(0.62 * 0.5 * SR) if e['type'] == 'whoosh' else len(a) if e['type'] == 'riser' else 0)
        i = max(0, i)
        out[i:i + len(a)] += a[:max(0, n - i)]

    peak = np.abs(out).max()
    if tl.get('limiter') == 'peak':
        out = peak_limit(out)
    elif peak > 0.98:
        out = np.tanh(out / peak * 1.2) / np.tanh(1.2) * 0.98   # gentle limiter
    write_wav(out_path, out)


# ----------------------------------------------------------------------------- team colour
def colour(*files):
    """Main colour of each crest / flag (ignores transparent, near-white and near-black pixels) → JSON list."""
    import colorsys
    out = []
    for f in files:
        try:
            a = read_image(f)
            px = a.reshape(-1, 4).astype(float) / 255
            px = px[px[:, 3] > 0.5][:, :3]
            hsv = np.array([colorsys.rgb_to_hsv(*p) for p in px[::max(1, len(px) // 4000)]])
            keep = (hsv[:, 1] > 0.3) & (hsv[:, 2] > 0.25)
            if keep.sum() < 20:
                out.append(None); continue
            h = hsv[keep]
            bins = np.histogram(h[:, 0], bins=24, range=(0, 1))[0]
            b = int(np.argmax(bins)); sel = h[(h[:, 0] >= b / 24) & (h[:, 0] < (b + 1) / 24)]
            r, g, bl = colorsys.hsv_to_rgb(np.median(sel[:, 0]), min(0.85, np.median(sel[:, 1])), min(0.8, np.median(sel[:, 2])))
            out.append('#%02x%02x%02x' % (int(r * 255), int(g * 255), int(bl * 255)))
        except Exception:
            out.append(None)
    print(json.dumps(out))


def read_image(f):
    raw = subprocess.run([FF, '-v', 'error', '-i', f, '-vf', 'scale=96:-1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, 96, 4)


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    {'speak': speak, 'mix': mix, 'beats': beats, 'colour': colour}[cmd](*args)
