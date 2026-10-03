"""Download the video from one of the owner's own X posts (best quality X serves).

  python3 video/lib/fetch_x.py https://x.com/<user>/status/<id> out.mp4

Uses X's public embed data (the same JSON the embedded-post widget reads). X re-compresses uploads, so when the owner
can share the original file (a Google Drive or Dropbox link set to "anyone with the link"), that is sharper.
"""
import json, re, subprocess, sys, urllib.request

url, out = sys.argv[1], sys.argv[2]
tid = re.search(r'status/(\d+)', url).group(1)
req = urllib.request.Request(f'https://cdn.syndication.twimg.com/tweet-result?id={tid}&lang=en&token=x', headers={'User-Agent': 'Mozilla/5.0'})
d = json.load(urllib.request.urlopen(req, timeout=30))
vids = [v for m in d.get('mediaDetails', []) for v in (m.get('video_info') or {}).get('variants', []) if v.get('content_type') == 'video/mp4']
if not vids: sys.exit('No video in that post.')
best = max(vids, key=lambda v: v.get('bitrate', 0))
subprocess.run(['curl', '-sS', '-f', '-o', out, best['url']], check=True)
print(f"{out}: @{d.get('user', {}).get('screen_name')} · {d.get('created_at')} · {(d.get('text') or '')[:120]!r}")
