"""Speech enhancement for the owner's own recordings: DeepFilterNet3 removes room noise and most of the echo while the
voice stays natural. Weights: huggingface.co/fal/DeepFilterNet3 (Apache-2.0), downloaded once into video/.cache/dfnet3.

  <python with deepfilternet + torch> video/lib/df_enhance.py in.wav out.wav
(in this project: /home/user/.venvs/tts/bin/python, which has torch; `pip install deepfilternet` there)
"""
import os, sys, urllib.request, warnings
warnings.filterwarnings('ignore')
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.cache', 'dfnet3')
os.makedirs(D, exist_ok=True)
for f in ('config.ini', 'model.safetensors'):
    if not os.path.exists(os.path.join(D, f)):
        urllib.request.urlretrieve(f'https://huggingface.co/fal/DeepFilterNet3/resolve/main/{f}', os.path.join(D, f))
from df.enhance import enhance, init_df, load_audio, save_audio
from safetensors.torch import load_file
model, st, _ = init_df(model_base_dir=D, epoch='none', log_level='ERROR')
missing, unexpected = model.load_state_dict(load_file(os.path.join(D, 'model.safetensors')), strict=False)
if missing or unexpected: sys.exit(f'DeepFilterNet3 weights did not match: {len(missing)} missing, {len(unexpected)} unexpected')
audio, _ = load_audio(sys.argv[1], sr=st.sr())
save_audio(sys.argv[2], enhance(model, st, audio), st.sr())
print(f'enhanced → {sys.argv[2]}')
