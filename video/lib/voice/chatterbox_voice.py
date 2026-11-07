"""Narrator: Resemble AI Chatterbox-Turbo (MIT), its built-in default voice (conds.pt), CPU. No voice cloning, no
pitch or tempo edits: the model's own delivery, sentences grouped up to ~230 characters per call (Turbo caps at about
40 s per call), joined with plain pauses (sentence 0.32 s, paragraph 0.62 s), loudness to -20 LUFS.

  <venv>/bin/python chatterbox_voice.py <script.txt> <out.wav> [--seed 7] [--temp 0.8]

Writes <out>.parts.json (each part's text and start/end in the wav) for word alignment.
Install (CPU only; keep torch CPU so pip doesn't pull the CUDA build):
  python3 -m venv venv_cb
  venv_cb/bin/pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
  venv_cb/bin/pip install --no-deps chatterbox-tts==0.1.7
  venv_cb/bin/pip install "numpy<2" librosa==0.11.0 s3tokenizer transformers==5.2.0 diffusers==0.29.0 resemble-perth \
      conformer==0.3.2 safetensors==0.5.3 pyloudnorm omegaconf
"""
import json, re, sys, time
import numpy as np, soundfile as sf, torch, pyloudnorm as pyln
from chatterbox.tts_turbo import ChatterboxTurboTTS

a = sys.argv[1:]
src, out = a[0], a[1]
seed = int(a[a.index('--seed') + 1]) if '--seed' in a else 7
temp = float(a[a.index('--temp') + 1]) if '--temp' in a else 0.8
torch.set_num_threads(4)
text = open(src).read().strip()
paras = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
t0 = time.time()
tts = ChatterboxTurboTTS.from_pretrained(device='cpu')
sr = tts.sr
load_s = time.time() - t0
pieces, parts, cur_t = [], [], 0.0
for pi, p in enumerate(paras):
    sents = re.split(r'(?<=[.!?])\s+', p)
    groups, cur = [], ''
    for s in sents:
        if cur and len(cur) + len(s) > 230: groups.append(cur); cur = s
        else: cur = (cur + ' ' + s).strip()
    if cur: groups.append(cur)
    for gi, g in enumerate(groups):
        torch.manual_seed(seed + len(parts))
        wav = tts.generate(g, temperature=temp).squeeze(0).cpu().numpy().astype(np.float32)
        # trim leading/trailing near-silence
        env = np.abs(wav); thr = max(1e-3, env.max() * 0.02); idx = np.where(env > thr)[0]
        if len(idx): wav = wav[max(0, idx[0] - int(.02 * sr)): idx[-1] + int(.06 * sr)]
        parts.append({'text': g, 's': round(cur_t, 3), 'e': round(cur_t + len(wav) / sr, 3)})
        pieces.append(wav); cur_t += len(wav) / sr
        gap = 0.62 if gi == len(groups) - 1 and pi < len(paras) - 1 else 0.32
        if not (pi == len(paras) - 1 and gi == len(groups) - 1):
            pieces.append(np.zeros(int(gap * sr), np.float32)); cur_t += gap
audio = np.concatenate(pieces)
meter = pyln.Meter(sr); lufs = meter.integrated_loudness(audio)
audio = pyln.normalize.loudness(audio, lufs, -20.0)
audio = np.clip(audio, -0.98, 0.98)
sf.write(out, audio, sr)
json.dump(parts, open(out + '.parts.json', 'w'), indent=1)
print(json.dumps({'audio_s': round(len(audio) / sr, 2), 'synth_s': round(time.time() - t0 - load_s, 1), 'load_s': round(load_s, 1), 'parts': len(parts), 'sr': sr}))
