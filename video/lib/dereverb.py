"""Room echo out of the owner's phone recordings: weighted prediction error (WPE, nara_wpe), in 20 s chunks with
short crossfades so memory stays small. On 5 Oct, WPE then DeepFilterNet3 scored best of everything we tried
(DNSMOS 2.94 against 2.83 for the raw camera) while the words stayed as clear as the raw.

  python3 video/lib/dereverb.py in.wav out.wav
"""
import sys
import numpy as np


def dereverb(x, sr, chunk=20.0, ov=0.5):
    from nara_wpe.wpe import wpe
    from nara_wpe.utils import stft, istft
    n, c, o = len(x), int(chunk * sr), int(ov * sr)
    out = np.zeros(n, np.float32); wsum = np.zeros(n, np.float32)
    for s in range(0, n, c - o):
        seg = x[s:s + c]
        if len(seg) < 2048: break
        Y = stft(seg[None], size=1024, shift=256).transpose(2, 0, 1)
        z = istft(wpe(Y, taps=10, delay=3, iterations=3, statistics_mode='full').transpose(1, 2, 0), size=1024, shift=256)[0][:len(seg)]
        w = np.ones(len(z), np.float32)
        if s: w[:o] = np.linspace(0, 1, o)
        if s + c < n: w[-o:] = np.linspace(1, 0, o)
        out[s:s + len(z)] += z * w; wsum[s:s + len(z)] += w
        if s + c >= n: break
    return out / np.maximum(wsum, 1e-6)


if __name__ == '__main__':
    import soundfile as sf
    x, sr = sf.read(sys.argv[1], dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    sf.write(sys.argv[2], dereverb(x, sr), sr)
    print('dereverbed →', sys.argv[2])
