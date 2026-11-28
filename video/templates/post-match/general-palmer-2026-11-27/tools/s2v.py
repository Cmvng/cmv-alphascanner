"""Run one audio piece through the Wan2.2-S2V space: python3 -I s2v.py <img> <wav> <out.mp4> [720P|480P]"""
import sys, shutil, time
from gradio_client import Client, handle_file
img, wav, out = sys.argv[1:4]; res = sys.argv[4] if len(sys.argv) > 4 else '720P'
t = time.time()
c = Client('Wan-AI/Wan2.2-S2V', verbose=False)
r = c.predict(ref_img=handle_file(img), audio=handle_file(wav), resolution=res, api_name='/predict')
v = r['video'] if isinstance(r, dict) else r
shutil.copy(v, out); print(out, round(time.time() - t), 's')
