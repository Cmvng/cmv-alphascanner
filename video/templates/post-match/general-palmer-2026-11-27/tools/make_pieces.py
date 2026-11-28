"""Cut the master voice into line-sized pieces at the middle of real silences, each with silence padding (the model
drops the first part of the audio it is given), and write pieces/plan.json.
  python3 -I make_pieces.py <master.mp3> <pieces dir>"""
import json, subprocess, sys, os
src, d = sys.argv[1:3]
C = [0, 2.79, 8.73, 16.34, 21.75, 27.59, 33.15, 38.23, 44.66, 52.38, 57.55, 62.45]
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).decode())
C.append(round(dur, 3))
PRE, POST, OV = 0.35, 0.25, 0.12
plan = []
for i in range(len(C) - 1):
    a = max(0, C[i] - (OV if i else 0)); b = min(dur, C[i + 1] + OV)
    f = os.path.join(d, f'a{i + 1:02d}.wav')
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-t', f'{b - a:.3f}', '-i', src, '-af',   # cut on the input side, so the padding is added after the cut
                    f'adelay={int(PRE * 1000)}:all=1,apad=pad_dur={POST}', '-ac', '1', '-ar', '44100', f], check=True)
    plan.append({'n': i + 1, 'cut_s': C[i], 'cut_e': C[i + 1], 'src_s': round(a, 3), 'src_e': round(b, 3), 'pre': PRE, 'audio': f, 'video': os.path.join(d, f'v{i + 1:02d}.mp4')})
json.dump(plan, open(os.path.join(d, 'plan.json'), 'w'), indent=1)
for p in plan: print(p['n'], p['cut_s'], p['cut_e'], round(p['src_e'] - p['src_s'] + PRE + POST, 2), 's of audio')
