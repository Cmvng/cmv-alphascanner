#!/usr/bin/env bash
# Parallel render of the unveil page: K chunks rendered at once (video only), joined without re-encoding, then the
# soundtrack muxed in.   bash render_par.sh <page.html> <plan.json> <out.mp4> [K=3] [crf=14]
set -euo pipefail
PAGE=$1; PLAN=$2; OUT=$3; K=${4:-3}; CRF=${5:-14}
HERE=$(cd "$(dirname "$0")" && pwd)
W=$(mktemp -d "$(dirname "$OUT")/par.XXXX")
N=$(python3 -I -c "import json; p=json.load(open('$PLAN')); print(round(p['total']*p['fps']))")
for ((i=0; i<K; i++)); do
  a=$(( N * i / K )); b=$(( N * (i + 1) / K ))
  FROM=$a TO=$b VIDEO_ONLY=1 node "$HERE/render.mjs" "$PAGE" "$PLAN" "$W/c$i.mp4" "$CRF" > "$W/c$i.log" 2>&1 &
done
wait
for ((i=0; i<K; i++)); do tail -1 "$W/c$i.log"; echo "file 'c$i.mp4'" >> "$W/list.txt"; done
python3 -I - "$PLAN" "$W" "$OUT" <<'PY'
import json, subprocess, sys
p = json.load(open(sys.argv[1])); W, OUT = sys.argv[2:4]; A = p['audio']; T = p['total']
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{W}/list.txt', '-ss', str(A['in']), '-i', A['src'],
                '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', f"afade=t=out:st={A['fade'][0]}:d={A['fade'][1]},apad=whole_dur={T},atrim=0:{T}",
                '-c:a', 'aac', '-b:a', '256k', '-t', f'{T:.3f}', '-movflags', '+faststart', OUT], check=True)
PY
rm -rf "${W:?}"
ffprobe -v error -show_entries format=duration,size -of compact "$OUT"
