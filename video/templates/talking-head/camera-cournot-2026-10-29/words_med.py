"""Word timings with the medium.en model: python3 -P -E words_med.py <in.wav> <out.json>"""
import json, sys
from faster_whisper import WhisperModel
m = WhisperModel('medium.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(sys.argv[1], word_timestamps=True, vad_filter=False, beam_size=5,
                       initial_prompt='Primus Labs, zkTLS, Cournot Protocol, AI oracle, prediction markets, proof of reasoning, 42, resolutions, private credit.')
out = [{'s': round(w.start, 2), 'e': round(w.end, 2), 'w': w.word.strip()} for s in segs for w in s.words]
json.dump(out, open(sys.argv[2], 'w'))
print(len(out), 'words')
