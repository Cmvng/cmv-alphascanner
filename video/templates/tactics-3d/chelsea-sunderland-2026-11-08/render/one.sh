#!/usr/bin/env bash
# one chunk: frames [$1, $2); skipped if already done; written to a temp name, then moved
a=$1; b=$2; o=/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/jobs/r_$(printf %05d $a).mp4
[ -f "$o.done" ] && exit 0
FROM=$a TO=$b VIDEO_ONLY=1 node /home/user/cmv-alphascanner/video/templates/art-series/unveil/render.mjs /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/page/board.html /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/plan.json "$o.tmp.mp4" 16 > "$o.log" 2>&1   && mv "$o.tmp.mp4" "$o" && touch "$o.done" && echo "done $a-$b $(date +%T)" >> /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/jobs/progress.txt   || echo "FAILED $a-$b $(date +%T)" >> /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/jobs/progress.txt
