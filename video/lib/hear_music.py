"""Say what a piece of music sounds like, in words, when you cannot hear it.
  python -I hear_music.py <file[:start-end]> [<file[:start-end]> ...] [--like <reference[:start-end]>]

It runs CLAP (laion/clap-htsat-unfused, a model that puts sound and text in one space) on each clip and prints the
genre and mood descriptions it sits closest to, most likely first. With --like it also prints how close each clip is
to the reference clip (1.00 = the same sound), so candidates can be ranked against music the owner sent or approved.

Why: three soundtracks were chosen from numbers (tempo, how hard the drop hits) and the owner rejected each one by
ear: "weird soundtrack" (10 Nov), "The sound track doesn't fit the video" (11 Nov). The numbers say nothing about
mood. This says "slow orchestral film score" or "light hip hop groove", which is the thing that has to fit the video.
It is a description to choose samples with. It is not the owner's ear: an unheard track still goes to them first.
Needs torch and transformers (the scratch venv has both). Speech over the music pulls every answer towards "speech":
give it a stretch with no talking (a montage, an intro, a pause) or a music-only file."""
import sys, subprocess
import numpy as np, torch
from transformers import ClapModel, ClapProcessor

WORDS = [
    'slow cinematic orchestral film score with strings', 'epic trailer music with big drums', 'emotional solo piano',
    'dark suspense drone', 'calm ambient pad, almost silent', 'lo-fi hip hop beat, relaxed',
    'hip hop instrumental with a head-nod groove', 'trap beat with heavy 808 bass', 'dark aggressive phonk or drill beat',
    'afrobeats instrumental, bouncy and warm', 'amapiano log-drum groove', 'funk groove with bass guitar',
    'playful quirky comedy music', 'happy upbeat corporate pop with claps', 'house or EDM dance track',
    'tech electronic beat with synth bass', 'rock with electric guitars', 'reggaeton or dancehall rhythm',
    'jazz with saxophone or piano', 'a person speaking, no music',
]

def load(spec):
    path, _, rng = spec.partition(':') if (':' in spec and spec.rsplit(':', 1)[1][:1].isdigit()) else (spec, '', '')
    cmd = ['ffmpeg', '-nostdin', '-v', 'error']
    if rng:
        a, b = rng.split('-'); cmd += ['-ss', a, '-t', str(float(b) - float(a))]
    cmd += ['-i', path, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']
    x = np.frombuffer(subprocess.check_output(cmd), np.float32)
    return x / (np.abs(x).max() + 1e-9)

def main():
    args = sys.argv[1:]; ref = None
    if '--like' in args:
        i = args.index('--like'); ref = args[i + 1]; args = args[:i] + args[i + 2:]
    model = ClapModel.from_pretrained('laion/clap-htsat-unfused').eval(); proc = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')
    def feat(o):
        return o if torch.is_tensor(o) else (o.pooler_output if getattr(o, 'pooler_output', None) is not None else o[0])
    with torch.no_grad():
        t = feat(model.get_text_features(**proc(text=WORDS, return_tensors='pt', padding=True))); t = t / t.norm(dim=-1, keepdim=True)
    def emb(x):
        out = []
        for s in range(0, max(1, len(x) - 48000 * 5), 48000 * 8):                 # 10 s windows, 8 s apart
            w = x[s:s + 480000]
            try: i = proc(audio=w, sampling_rate=48000, return_tensors='pt')
            except TypeError: i = proc(audios=w, sampling_rate=48000, return_tensors='pt')
            with torch.no_grad(): out.append(feat(model.get_audio_features(**i))[0])
        e = torch.stack(out).mean(0); return e / e.norm()
    r = emb(load(ref)) if ref else None
    for spec in args:
        e = emb(load(spec)); p = torch.softmax((t @ e) * 30, 0)
        top = torch.topk(p, 4)
        line = '; '.join(f'{WORDS[j]} {float(v) * 100:.0f}%' for v, j in zip(top.values, top.indices))
        print(f'{spec}\n   {line}' + (f'\n   like the reference: {float(e @ r):.2f}' if r is not None else ''))

if __name__ == '__main__':
    main()
