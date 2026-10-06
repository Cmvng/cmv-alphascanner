"""Real word timings for captions: transcribe each recorded sentence with word timestamps and map them onto the words
shown on screen (the spoken text can differ: names written as phonemes, numbers as words).

  python3 lib/word_times.py <captext.json> <voice_dir>   ->  <voice_dir>/words.json  {id: [[t0, t1], ...] per shown word}
"""
import difflib, json, os, re, sys
from faster_whisper import WhisperModel

norm = lambda w: re.sub(r"[^a-z0-9]", '', w.lower())


def main(captext_path, voice_dir):
    cap = json.load(open(captext_path))
    m = WhisperModel('small.en', device='cpu', compute_type='int8')
    out = {}
    for sid, shown in cap.items():
        wav = os.path.join(voice_dir, f'{sid}.wav')
        if not os.path.exists(wav):
            continue
        segs, _ = m.transcribe(wav, beam_size=5, word_timestamps=True, language='en')
        heard = [w for s in segs for w in (s.words or [])]
        toks = shown.split()
        if not heard or not toks:
            continue
        a, b = [norm(t) for t in toks], [norm(w.word) for w in heard]
        tm = [None] * len(toks)
        for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if op == 'equal':
                for k in range(i2 - i1): tm[i1 + k] = (heard[j1 + k].start, heard[j1 + k].end)
            elif op == 'replace' and j2 > j1:          # spread shown words over the heard words they replace ("77" ~ "seventy seven")
                t0, t1 = heard[j1].start, heard[j2 - 1].end
                for k in range(i2 - i1): tm[i1 + k] = (t0 + (t1 - t0) * k / (i2 - i1), t0 + (t1 - t0) * (k + 1) / (i2 - i1))
        end = heard[-1].end
        for i in range(len(toks)):                      # unmatched words sit between their neighbours
            if tm[i] is None:
                prv = next((tm[j][1] for j in range(i - 1, -1, -1) if tm[j]), 0.0)
                nxt = next((tm[j][0] for j in range(i + 1, len(toks)) if tm[j]), end)
                tm[i] = (prv, max(prv + 0.05, min(nxt, prv + 0.35)))
        out[sid] = [[round(x, 3), round(y, 3)] for x, y in tm]
    json.dump(out, open(os.path.join(voice_dir, 'words.json'), 'w'))
    print(f'word timings for {len(out)} lines')


if __name__ == '__main__':
    main(*sys.argv[1:3])
