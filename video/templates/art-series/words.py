# word timings for the template soundtracks → words_<n>.json
import sys, json
from faster_whisper import WhisperModel
m = WhisperModel('small.en', device='cpu', compute_type='int8')
out_dir = sys.argv[1]
for f in sys.argv[2:]:
    segs, _ = m.transcribe(f, word_timestamps=True, beam_size=5)
    ws = [{'w': w.word.strip(), 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in s.words]
    name = f.rsplit('/', 1)[1].rsplit('.', 1)[0]
    json.dump(ws, open(f'{out_dir}/words_{name}.json', 'w'))
    print(name, ' '.join(f"{w['w']}@{w['s']}-{w['e']}" for w in ws))
