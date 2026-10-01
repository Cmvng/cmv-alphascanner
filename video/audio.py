"""Voice and music for the picks video.

  python3 audio.py speak  sentences.json voice.onnx out_dir [speed]  -> one WAV per sentence + durations.json
  python3 audio.py mix    timeline.json  out.wav               -> voice track placed at each sentence's start time
  python3 audio.py music  seconds out.wav                      -> soft background bed (generated, royalty-free)

Voice uses Piper (offline text-to-speech, free). Voices: https://huggingface.co/rhasspy/piper-voices
"""
import json, os, sys, wave
import numpy as np

SR = 22050


def speak(sentences_file, voice_path, out_dir, speed='1.0'):
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(voice_path)
    cfg = SynthesisConfig(length_scale=1 / float(speed))
    os.makedirs(out_dir, exist_ok=True)
    out = {}
    for s in json.load(open(sentences_file)):
        path = os.path.join(out_dir, f"{s['id']}.wav")
        with wave.open(path, 'wb') as w:
            voice.synthesize_wav(s['text'], w, syn_config=cfg)
        with wave.open(path) as w:
            out[s['id']] = w.getnframes() / w.getframerate()
    json.dump(out, open(os.path.join(out_dir, 'durations.json'), 'w'))


def read(path):
    with wave.open(path) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        return a, w.getframerate()


def write(path, a, sr=SR):
    a = np.clip(a, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((a * 32767).astype(np.int16).tobytes())


def mix(timeline_file, out_path):
    tl = json.load(open(timeline_file))
    total = np.zeros(int(tl['duration'] * SR) + SR)
    for s in tl['sentences']:
        a, sr = read(s['wav'])
        if sr != SR:  # simple resample
            a = np.interp(np.linspace(0, len(a), int(len(a) * SR / sr), endpoint=False), np.arange(len(a)), a)
        i = int(s['start'] * SR)
        total[i:i + len(a)] += a[:len(total) - i]
    write(out_path, total * 0.95)


def music(seconds, out_path):
    """Calm, low pad: Am9 - Fmaj7 - Cmaj7 - G6 with a soft pulse. Sits under the voice."""
    seconds = float(seconds)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    bpm = 92
    bar = 4 * 60 / bpm
    chords = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 59, 64, 67], [55, 59, 62, 64, 71]]  # midi
    f = lambda m: 440 * 2 ** ((m - 69) / 12)
    out = np.zeros(n)
    seg = 2 * bar
    for k in range(int(seconds // seg) + 2):
        notes = chords[k % 4]
        start = k * seg - 0.6
        i0, i1 = max(0, int(start * SR)), min(n, int((start + seg + 1.8) * SR))
        if i0 >= n:
            break
        tt = t[i0:i1] - start
        env = np.minimum(1, tt / 1.4) * np.clip((seg + 1.8 - tt) / 1.8, 0, 1)
        for j, m in enumerate(notes):
            for det in (-0.004, 0.004):
                out[i0:i1] += env * 0.06 * np.sin(2 * np.pi * f(m) * (1 + det) * tt + j)
        out[i0:i1] += env * 0.05 * np.sin(2 * np.pi * f(notes[0] - 12) * tt)  # bass
    # soft pulse on each beat
    beat = 60 / bpm
    for b in range(int(seconds / beat)):
        i = int(b * beat * SR)
        k = np.arange(min(int(0.25 * SR), n - i))
        out[i:i + len(k)] += 0.10 * np.sin(2 * np.pi * 55 * k / SR) * np.exp(-k / (0.06 * SR))
    # gentle tremolo, fades
    out *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
    fade = int(1.5 * SR)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    write(out_path, out / (np.abs(out).max() + 1e-9) * 0.5)


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    {'speak': speak, 'mix': mix, 'music': music}[cmd](*args)
