#!/usr/bin/env bash
# join the kept partial chunks and the new ones in frame order, then add the mix (as render_par.sh does)
set -euo pipefail
K=/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/keep; J=/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/jobs; L=$J/concat.txt; : > $L
for i in 0 1 2 3; do
  echo "file '$K/p$i.mp4'" >> $L
  case $i in 0) R="00307 00466 00626 00785";; 1) R="01194 01368 01542 01716";; 2) R="02169 02335 02502 02668";; 3) R="03112 03279 03446 03613";; esac
  for r in $R; do [ -f "$J/r_$r.mp4.done" ] || { echo "missing $r"; exit 1; }; echo "file '$J/r_$r.mp4'" >> $L; done
done
ffmpeg -v error -y -f concat -safe 0 -i $L -i /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/mix/mix.wav -map 0:v -map 1:a -c:v copy   -af "afade=t=out:st=125:d=1.0,apad=whole_dur=126,atrim=0:126" -c:a aac -b:a 256k -t 126.000 -movflags +faststart /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/cs.mp4
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -show_entries format=duration,size -of compact /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/cs.mp4
