"""Word timings with the medium.en model: python3 -P -E words_med.py <in.wav> <out.json>"""
import json, sys
from faster_whisper import WhisperModel
m = WhisperModel('medium.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(sys.argv[1], word_timestamps=True, vad_filter=False, beam_size=5,
                       initial_prompt='Bagel app, Polymarket, prediction markets, combo pick, cmvng, Everton, Newcastle, Leverkusen, Stuttgart, Benfica, Brentford, Nottingham Forest, Shabana, Sporting Gijon, Frosinone, Lecce, Al-Hazm, Midtjylland.')
out = [{'s': round(w.start, 2), 'e': round(w.end, 2), 'w': w.word.strip()} for s in segs for w in s.words]
json.dump(out, open(sys.argv[2], 'w'))
print(len(out), 'words')
