"""For each made piece, find where its picture sits on the master voice: cross-correlate the piece's own audio with
the master around where it was cut from. Writes "t0" (master time of the piece's first frame) into plan.json.
  python3 -I align.py <plan.json> <master.mp3>"""
import json, subprocess, sys, os
import numpy as np
plan = json.load(open(sys.argv[1])); SR = 16000
dec = lambda f: np.frombuffer(subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', f, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
PAD = 2.0
m = np.concatenate([np.zeros(int(PAD * SR), np.float32), dec(sys.argv[2]), np.zeros(int(PAD * SR), np.float32)])   # room for a first frame before 0
for p in plan:
    if not os.path.exists(p['video']): continue
    o = dec(p['video'])
    # the piece was cut from src_s and delayed by pre: expected t0 = src_s - pre + (whatever the model dropped)
    lo = int((p['src_s'] - p['pre'] - 0.5 + PAD) * SR); hi = int(min(len(m) / SR, p['src_e'] + 1.0 + PAD) * SR)
    seg = m[lo:hi]
    c = np.correlate(seg, o, 'valid') if len(seg) >= len(o) else np.correlate(o, seg, 'valid')
    k = int(c.argmax()); t0 = (lo + k) / SR if len(seg) >= len(o) else (lo - k) / SR
    ref = m[int(t0 * SR):int(t0 * SR) + len(o)]; t0 -= PAD
    n = min(len(ref), len(o))
    r = float(np.corrcoef(ref[:n], o[:n])[0, 1])
    vd = float(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=duration', '-of', 'csv=p=0', p['video']]).decode())
    p.update(t0=round(t0, 4), corr=round(r, 3), vdur=round(vd, 3))
    print(f"piece {p['n']:2d}: first frame at {t0:7.3f} s (cut {p['cut_s']:6.2f}-{p['cut_e']:6.2f}), picture to {t0 + vd:7.3f}, match {r:.3f}",
          '' if t0 <= p['cut_s'] + 0.001 and t0 + vd >= p['cut_e'] - 0.001 else '  <-- does not cover its cut')
json.dump(plan, open(sys.argv[1], 'w'), indent=1)
