"""Snap faster-whisper word times to the audio with CTC forced alignment.

faster-whisper large-v3 word starts run about 0.18-0.20 s early on our narrator takes (10% of words more than 0.4 s
early), so anything keyed straight to words.json (captions, reaction stickers) lands early. This re-times each word
on wav2vec2 CTC posteriors (Xenova/wav2vec2-base-960h, ONNX int8, 95 MB, cached in ~/.cache/huggingface) using the
aligner in video/templates/voice/lara-delivery/measure.py.

  python3 -I video/lib/align_words.py <audio> <whisper_words.json> <out_words.json> [--lag 0.19]

Input and output are lists of {"s", "e", "w"} in seconds of the audio file. Words the aligner can't place keep their
whisper times shifted by --lag (default 0.19 s). Zero-length whisper words (hallucinations) are dropped first.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'templates', 'voice', 'lara-delivery'))
import measure  # noqa: E402  (the aligner and its number/acronym spelling rules)


def main():
    a = sys.argv[1:]
    if len(a) < 3:
        sys.exit(__doc__)
    audio, src, out = a[0], a[1], a[2]
    lag = float(a[a.index('--lag') + 1]) if '--lag' in a else 0.19
    words = [w for w in json.load(open(src)) if w['e'] - w['s'] > 0.005]
    res = measure.ctc_align(audio, [w['w'] for w in words])
    spans = res['spans'] if res else [None] * len(words)
    fixed, moved = [], []
    for w, sp in zip(words, spans):
        if sp:
            fixed.append({'s': round(sp[0], 3), 'e': round(sp[1], 3), 'w': w['w']})
            moved.append(sp[0] - w['s'])
        else:
            fixed.append({'s': round(w['s'] + lag, 3), 'e': round(w['e'] + lag, 3), 'w': w['w'], 'est': True})
    json.dump(fixed, open(out, 'w'), indent=0)
    if moved:
        moved.sort()
        print(f'{len(fixed)} words, {len(moved)} aligned; whisper start error median {moved[len(moved) // 2]:+.3f} s, '
              f'p90 {moved[int(len(moved) * .9)]:+.3f} s -> {out}')
    else:
        print(f'aligner unavailable: whisper times + {lag} s -> {out}')


if __name__ == '__main__':
    main()
