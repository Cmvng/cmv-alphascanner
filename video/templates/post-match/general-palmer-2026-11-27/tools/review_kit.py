"""Everything a reviewer needs to look at, from the finished file:
  - sheets/sheet_NN.jpg: every half second, 4x5 frames a page, each frame stamped with its time
  - cuts/cut_NN.jpg: the 3 frames before and after every camera change, full width, stamped
  - heard.json: what Whisper hears in the finished file, with word times
  python3 -I review_kit.py <film.mp4> <out dir> <change times, comma-separated>"""
import json, os, subprocess, sys
film, out, ch = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3].split(',') if x]
os.makedirs(f'{out}/sheets', exist_ok=True); os.makedirs(f'{out}/cuts', exist_ok=True)
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', film]).decode())
stamp = "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='%{pts\\:hms}':x=10:y=10:fontsize=34:fontcolor=yellow:box=1:boxcolor=black@0.6"
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', film, '-vf', f'fps=2,{stamp},scale=270:-1,tile=5x4', f'{out}/sheets/sheet_%02d.jpg'], check=True)
for k, t in enumerate(ch):
    f0 = max(0, round(t * 30) - 3)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', film, '-vf',
                    f"select='between(n\\,{f0}\\,{f0 + 5})',{stamp},scale=360:-1,tile=6x1", '-frames:v', '1', f'{out}/cuts/cut_{k:02d}_{t:.2f}.jpg'], check=True)
from faster_whisper import WhisperModel
m = WhisperModel('medium.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(film, word_timestamps=True, language='en', beam_size=5, initial_prompt='General Palmer. Igor Jesus. Gibbs-White. Emegha. Wesley. Palace. Leeds.')
words = [{'w': w.word.strip(), 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in s.words]
json.dump(words, open(f'{out}/heard.json', 'w'), indent=0)
print('duration', dur, 'sheets', len(os.listdir(f'{out}/sheets')), 'cuts', len(ch), 'words heard', len(words))
print(' '.join(w['w'] for w in words))
