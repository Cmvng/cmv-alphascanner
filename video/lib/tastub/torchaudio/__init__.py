"""A minimal stand-in for torchaudio (no build exists for this torch): file read/write through soundfile."""
import soundfile as sf, torch
from .backend.common import AudioMetaData
__version__ = '0.0-stub'
def info(path, **kw):
    i = sf.info(path); return AudioMetaData(i.samplerate, i.frames, i.channels, 16, 'PCM_S')
def load(path, **kw):
    a, sr = sf.read(path, dtype='float32', always_2d=True); return torch.from_numpy(a.T.copy()), sr
def save(path, audio, sr, **kw):
    sf.write(path, audio.detach().cpu().numpy().T, sr, subtype='PCM_16')
