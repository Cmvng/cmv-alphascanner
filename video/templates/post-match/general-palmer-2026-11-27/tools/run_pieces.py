"""Send each piece to the Wan2.2-S2V space (Alibaba's own public demo), one at a time, skipping pieces already made.
  python3 -I run_pieces.py <plan.json> <image> [720P]"""
import json, sys, shutil, time, os
from gradio_client import Client, handle_file
plan = json.load(open(sys.argv[1])); img = sys.argv[2]; res = sys.argv[3] if len(sys.argv) > 3 else '720P'
order = [int(x) for x in os.environ.get('ORDER', '').split(',') if x] or [p['n'] for p in plan]
for n in order:
    p = next(q for q in plan if q['n'] == n)
    if os.path.exists(p['video']): print(f"piece {n}: already made", flush=True); continue
    for attempt in (1, 2):
        t = time.time()
        try:
            c = Client('Wan-AI/Wan2.2-S2V', verbose=False)
            r = c.predict(ref_img=handle_file(img), audio=handle_file(p['audio']), resolution=res, api_name='/predict')
            v = r['video'] if isinstance(r, dict) else r
            shutil.copy(v, p['video']); print(f"piece {n}: done in {round(time.time() - t)} s", flush=True); break
        except Exception as e:
            print(f"piece {n}: attempt {attempt} failed after {round(time.time() - t)} s: {str(e)[:200]}", flush=True)
            time.sleep(20)
print('ALL DONE', flush=True)
