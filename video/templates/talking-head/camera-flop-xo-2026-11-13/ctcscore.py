"""Score candidate wordings of one stretch against the audio: CTC forward log-likelihood on wav2vec2."""
import sys, json, numpy as np, soundfile as sf
import onnxruntime as ort
from huggingface_hub import hf_hub_download
wav, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
cands = sys.argv[4:]
rep = 'Xenova/wav2vec2-base-960h'
vocab = json.load(open(hf_hub_download(rep, 'vocab.json')))
so = ort.SessionOptions(); so.log_severity_level = 3
sess = ort.InferenceSession(hf_hub_download(rep, 'onnx/model_quantized.onnx'), so, providers=['CPUExecutionProvider'])
x, sr = sf.read(wav, dtype='float32')
seg = x[int(a * sr):int(b * sr)]
seg = (seg - seg.mean()) / np.sqrt(seg.var() + 1e-7)
lg = sess.run(None, {'input_values': seg[None]})[0][0]
lp = lg - np.logaddexp.reduce(lg, axis=1, keepdims=True)
blank, sep = vocab['<pad>'], vocab['|']
# greedy reading, for reference
inv = {v: k for k, v in vocab.items()}
g = lp.argmax(1); out = []; prev = -1
for t in g:
    if t != prev and t != blank: out.append(inv[int(t)])
    prev = t
print('greedy:', ''.join(out).replace('|', ' '))
for c in cands:
    tok = []
    for i, w in enumerate(c.upper().split()):
        if i: tok.append(sep)
        tok += [vocab[ch] for ch in w if ch in vocab]
    S = 2 * len(tok) + 1
    lab = np.full(S, blank); lab[1::2] = tok
    tk = np.array(tok)
    allow2 = np.zeros(S, bool); allow2[3::2] = tk[1:] != tk[:-1]
    NEG = -1e30
    al = np.full(S, NEG); al[0] = lp[0, blank]; al[1] = lp[0, tok[0]]
    for t in range(1, len(lp)):
        a1 = np.concatenate(([NEG], al[:-1]))
        a2 = np.where(allow2, np.concatenate(([NEG, NEG], al[:-2])), NEG)
        al = np.logaddexp(np.logaddexp(al, a1), a2) + lp[t, lab]
    ll = np.logaddexp(al[-1], al[-2])
    print(f'{ll:9.2f}  {c}')
