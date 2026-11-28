"""Queue several pieces on the Wan2.2-S2V space at once (each takes its own place in the public queue, so the waits
overlap), skipping pieces already made. One retry each.
  python3 -I run_parallel.py <plan.json> <image> <n,n,...> [720P]"""
import json, sys, shutil, time, os, threading
from gradio_client import Client, handle_file
plan = json.load(open(sys.argv[1])); img = sys.argv[2]; want = [int(x) for x in sys.argv[3].split(',')]
res = sys.argv[4] if len(sys.argv) > 4 else '720P'
def one(p):
    for attempt in (1, 2):
        t = time.time()
        try:
            c = Client('Wan-AI/Wan2.2-S2V', verbose=False)
            r = c.predict(ref_img=handle_file(img), audio=handle_file(p['audio']), resolution=res, api_name='/predict')
            v = r['video'] if isinstance(r, dict) else r
            shutil.copy(v, p['video']); print(f"piece {p['n']}: done in {round(time.time() - t)} s", flush=True); return
        except Exception as e:
            print(f"piece {p['n']}: attempt {attempt} failed after {round(time.time() - t)} s: {str(e)[:200]}", flush=True); time.sleep(30)
ths = []
for p in plan:
    if p['n'] in want and not (os.path.exists(p['video']) and os.path.getsize(p['video']) > 0):
        th = threading.Thread(target=one, args=(p,)); th.start(); ths.append(th); time.sleep(3)
for th in ths: th.join()
print('ALL DONE', flush=True)
