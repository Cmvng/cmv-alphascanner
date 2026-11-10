"""The gate before any video goes to the owner. It checks what can be measured against video/OWNER-CHECKPOINT.md and
prints the rest as a list to go through by eye. A FAIL means: do not send.

  python3 -I video/lib/preflight.py <video.mp4> --kind recording|explainer|analysis|post-match|music-led|art
        --music <library id> | owner | none      (owner = music from the owner's own samples; none = voice only)
        [--sample-ok]            the owner heard a sample of this track for this video and said yes
        [--voice voice.wav --bed bed.wav]   the two stems, to measure how far the music sits under the voice
        [--captions plan.json | file.srt]   scanned for banned words
        [--monetised]            a football analysis or review for X / YouTube: no betting words at all
        [--reactions N]          how many reaction stickers the video has

Why it exists (10 Nov 2026): a video went out with a soundtrack the owner had never heard, 20 dB under the voice. The
rules were written down and not read. The owner: "Can't you save what I like into a checkpoint so that once I want to
create a video, you just simply do what I want?" """
import argparse, json, os, re, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('--kind', required=True, choices=['recording', 'explainer', 'analysis', 'post-match', 'music-led', 'art'])
ap.add_argument('--music', required=True); ap.add_argument('--sample-ok', action='store_true')
ap.add_argument('--voice'); ap.add_argument('--bed'); ap.add_argument('--captions'); ap.add_argument('--monetised', action='store_true')
ap.add_argument('--reactions', type=int, default=0)
A = ap.parse_args()
res = []
def say(level, msg): res.append(level); print(f'{level:5s} {msg}')

# ---- 1. the soundtrack: one the owner approved by ear, or a sample they said yes to
lib = {t['id']: t for t in json.load(open(os.path.join(HERE, 'music.json')))['tracks']}
if A.music == 'none':
    say('ok', 'no music: voice only')
elif A.music == 'owner':
    say('ok', "music from the owner's own samples")
else:
    t = lib.get(int(A.music))
    if not t: say('FAIL', f'track {A.music} is not in video/lib/music.json: add it, and send the owner a 10-second sample first')
    elif t.get('owner') == 'rejected': say('FAIL', f'"{t["name"]}" was rejected by the owner ({t.get("owner_note", "")})')
    elif t.get('owner') == 'approved' or A.sample_ok: say('ok', f'"{t["name"]}": ' + ('approved by the owner' if t.get('owner') == 'approved' else 'sample approved for this video (record it in music.json)'))
    else: say('FAIL', f'"{t["name"]}" has never been approved by the owner. Send a 10-second sample and wait for a yes (--sample-ok), or use an approved track')

# ---- 2. loudness
out = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-nostats', '-i', A.video, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(re.search(r'"input_i"\s*:\s*"(-?[\d.]+)"', out).group(1)); TP = float(re.search(r'"input_tp"\s*:\s*"(-?[\d.]+)"', out).group(1))
say('ok' if -15.0 <= I <= -13.0 else 'FAIL', f'loudness {I:.1f} LUFS (wanted -14, give or take 1)')
say('ok' if TP <= -1.0 else 'FAIL', f'true peak {TP:.1f} dBTP (wanted -1 or lower)')

# ---- 3. the music under the voice
if A.voice and A.bed and A.music != 'none':
    import soundfile as sf
    v, sr = sf.read(A.voice, dtype='float32'); b, _ = sf.read(A.bed, dtype='float32')
    if v.ndim > 1: v = v.mean(axis=1)
    if b.ndim > 1: b = b.mean(axis=1)
    n = min(len(v), len(b)); k = int(sr * .05); f = n // k
    db = lambda x: 20 * np.log10(np.sqrt(np.mean(np.square(x))) + 1e-9)
    ve = np.array([db(v[i * k:(i + 1) * k]) for i in range(f)]); sp = np.repeat(ve > -38, k)
    half = n // 4                                                  # skip an intro build
    under = db(v[:f * k][sp]) - db(b[:f * k][half:][sp[half:]])
    say('ok' if 8 <= under <= 15 else 'FAIL', f'music {under:.1f} dB under the voice while speaking (wanted 8 to 15; 20 reads as a hum, under 8 fights the words)')
elif A.music != 'none' and A.kind in ('recording', 'explainer', 'analysis', 'post-match'):
    say('WARN', 'no --voice/--bed given: the music level under the voice was not measured')

# ---- 4. picture: size, a whole first frame, no black frames
w, h = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', A.video]).decode().strip().split(',')[:2])
if A.kind in ('recording', 'music-led') and w > h: say('WARN', f'{w}x{h}: this kind of video is watched upright; make the 9:16 cut too')
else: say('ok', f'{w}x{h}')
raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', A.video, '-vf', 'fps=2,scale=64:64,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 64, 64).astype(float)
dark = (fr.mean(axis=(1, 2)) < 14).mean()
say('ok' if dark < .01 else 'WARN', f'{dark * 100:.1f}% of frames are near black (the owner: never black backgrounds; deep navy is fine)')
say('ok' if fr[0].std() > 8 else 'FAIL', 'the first frame is a real picture (it is the poster frame on most platforms)' if fr[0].std() > 8 else 'the first frame is blank or flat')

# ---- 5. words
if A.captions:
    txt = open(A.captions, encoding='utf8').read()
    if A.captions.endswith('.json'): txt = ' '.join(c['t'] for c in json.loads(txt)['caps'])
    low = txt.lower()
    if 'ai analyst' in low: say('FAIL', '"AI Analyst" is in the text: the owner finds it cringe. It is "the analysis"')
    if A.monetised:
        bad = [wd for wd in ('odds', 'bet ', 'bets', 'betting', 'stake', 'tips', 'picks', 'bookie', 'bookmaker', 'units', 'booking code', 'naira', '₦', 'cmvngpicks.com') if wd in low]
        say('FAIL' if bad else 'ok', f'betting words on a monetised video: {bad}' if bad else 'no betting words')
    if 'ai analyst' not in low and not A.monetised: say('ok', 'no banned phrases in the captions')
say('ok' if A.reactions <= 3 else 'FAIL', f'{A.reactions} reaction stickers (the owner: at most three)')

print('\nBy eye, before sending (video/OWNER-CHECKPOINT.md, "Before you send"):')
for line in open(os.path.join(HERE, '..', 'OWNER-CHECKPOINT.md'), encoding='utf8').read().split('## Before you send')[1].split('\n## ')[0].strip().splitlines():
    if line.strip(): print('  ' + line)
bad = res.count('FAIL')
print(f'\n{bad} FAIL, {res.count("WARN")} WARN' + ('  -> do not send' if bad else ''))
sys.exit(1 if bad else 0)
