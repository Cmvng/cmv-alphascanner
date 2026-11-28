"""Clean the owner's voice with DeepFilterNet3 (speech enhancement): everything that is not their speech is taken down.
  <dfenv>/bin/python dfclean.py <in.wav> <out.wav> [attenuation limit dB, default none]
The recording is mono in both channels (checked), so it is cleaned as one channel at 48 kHz and written back at the
input's own rate, in both channels, float, the same length."""
import os, sys
import numpy as np, soundfile as sf, torch, torchaudio.functional as F
from df.enhance import enhance, init_df
inp, outp = sys.argv[1:3]; att = float(sys.argv[3]) if len(sys.argv) > 3 else None
model, st, _ = init_df(model_base_dir=os.environ.get("DF_MODEL"))   # DeepFilterNet3 (the Hugging Face copy fal/DeepFilterNet3; GitHub refused the download here)
x, sr = sf.read(inp, dtype='float32', always_2d=True); m = torch.from_numpy(x.mean(1).copy())[None]
y = enhance(model, st, F.resample(m, sr, st.sr()), atten_lim_db=att)
y = F.resample(y, st.sr(), sr)[0].numpy()[:x.shape[0]]
y = np.concatenate([y, np.zeros(x.shape[0] - len(y), np.float32)])
sf.write(outp, np.stack([y, y], 1), sr, subtype='FLOAT'); print('cleaned', inp, '->', outp, sr, 'Hz', len(y) / sr, 's')
