#!/usr/bin/env bash
# A long page render as resumable chunks (a background command is stopped at two hours; this survives it and a restart).
#   bash render_chunks.sh <page.html> <plan.json> <jobs dir> [workers=3] [frames per chunk=150] [crf=16]     render
#   bash render_chunks.sh join <jobs dir> <plan.json> <mix.wav> <out.mp4>                                    join + sound
# Start it detached:  setsid nohup bash render_chunks.sh ... > jobs.log 2>&1 &
# Each chunk is written to a temp name and moved when whole, so a rerun only does what is missing. progress.txt in the
# jobs dir gets one line per chunk and "ALL FINISHED" at the end. On 4 CPUs three workers is about as fast as it gets.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); RENDER=$HERE/../art-series/unveil/render.mjs
if [ "$1" = join ]; then
  J=$2; PLAN=$3; MIX=$4; OUT=$5; TOT=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['total'])" "$PLAN"); L=$J/concat.txt; : > "$L"
  while read -r a b; do [ -f "$J/r_$(printf %05d "$a").mp4.done" ] || { echo "missing chunk $a"; exit 1; }; echo "file '$J/r_$(printf %05d "$a").mp4'" >> "$L"; done < "$J/list.txt"
  ffmpeg -v error -y -f concat -safe 0 -i "$L" -i "$MIX" -map 0:v -map 1:a -c:v copy \
    -af "afade=t=out:st=$(python3 -I -c "print($TOT-1)"):d=1.0,apad=whole_dur=$TOT,atrim=0:$TOT" -c:a aac -b:a 256k -t "$TOT" -movflags +faststart "$OUT"
  ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -show_entries format=duration,size -of compact "$OUT"; exit 0
fi
PAGE=$1; PLAN=$2; J=$3; NW=${4:-3}; PER=${5:-150}; CRF=${6:-16}; mkdir -p "$J"
python3 -I -c "
import json,sys
p=json.load(open(sys.argv[1])); n=round(p['total']*p['fps']); per=int(sys.argv[2])
open(sys.argv[3],'w').write(''.join(f'{a} {min(n,a+per)}\n' for a in range(0,n,per)))" "$PLAN" "$PER" "$J/list.txt"
cat > "$J/one.sh" <<ONE
#!/usr/bin/env bash
a=\$1; b=\$2; o=$J/r_\$(printf %05d \$a).mp4
[ -f "\$o.done" ] && exit 0
FROM=\$a TO=\$b VIDEO_ONLY=1 node $RENDER $PAGE $PLAN "\$o.tmp.mp4" $CRF > "\$o.log" 2>&1 && mv "\$o.tmp.mp4" "\$o" && touch "\$o.done" && echo "done \$a-\$b \$(date +%T)" >> $J/progress.txt || echo "FAILED \$a-\$b \$(date +%T)" >> $J/progress.txt
ONE
chmod +x "$J/one.sh"; echo "start $(date +%T), $NW workers" >> "$J/progress.txt"
xargs -P "$NW" -L 1 "$J/one.sh" < "$J/list.txt"
echo "ALL FINISHED $(date +%T)" >> "$J/progress.txt"
