"""Word times of the take: python3 -P -E words.py <wav16> <out.json> [model]"""
import json, sys
from faster_whisper import WhisperModel
m = WhisperModel(sys.argv[3] if len(sys.argv) > 3 else 'medium.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(sys.argv[1], word_timestamps=True, beam_size=5, language='en')
ws = [{'s': round(w.start, 3), 'e': round(w.end, 3), 'w': w.word.strip()} for s in segs for w in s.words]
json.dump(ws, open(sys.argv[2], 'w'), indent=0)
print(len(ws), 'words'); print(' '.join(w['w'] for w in ws))
