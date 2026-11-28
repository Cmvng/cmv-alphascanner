import sys, json
from faster_whisper import WhisperModel
m = WhisperModel('medium.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(sys.argv[1], language='en', word_timestamps=True, beam_size=5, vad_filter=False)
W = []
for s in segs:
    for w in s.words: W.append({'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)})
json.dump(W, open(sys.argv[2], 'w')); print(len(W), 'words')
