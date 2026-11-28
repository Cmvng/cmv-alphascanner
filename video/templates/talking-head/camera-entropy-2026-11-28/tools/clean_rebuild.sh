# Entropy, 28 Nov: the owner heard background music and a screech under their voice ("the version of no music…").
# Their voice is separated from it (Demucs htdemucs, vocals stem), then mixed and muxed as before.
# The picture is never touched: every file keeps its video stream as it is (-c:v copy).
set -e
S=/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad; E=$S/en; W=$E/wc; O=/home/user/cmv-alphascanner/video/out/entropy-2026-11-28
V=$S/sep/en/htdemucs/rec_audio/vocals.wav
mkdir -p $W; cp $E/work/plan.json $E/work/words.json $E/work/segs.json $W/
cd /home/user/cmv-alphascanner
python3 -I video/templates/talking-head/camera-probly-2026-11-20/tools/mix_pb.py $W $V $E/work/bed_src.wav 0 288.0333 0 292.0333 1.0 10 4
mux() { ffmpeg -nostdin -v error -y -i "$1" -i "$2" -map 0:v -map 1:a -c:v copy -c:a aac -b:a "$3" -t 292.0333 -movflags +faststart "$4"; }
mux $O/entropy_9x16.mp4 $W/mix.wav 256k $W/entropy_9x16.mp4
mux $O/entropy_chat-copy.mp4 $W/mix.wav 96k $W/entropy_chat-copy.mp4
mux $O/entropy_chat-copy.mp4 $W/voice.wav 96k $W/entropy_no-music_chat-copy.mp4
mux $S/dl-entropy/entropy_9x16_dl.mp4 $W/mix.wav 160k $W/entropy_9x16_dl.mp4
ls -la $W/*.mp4
echo REBUILD DONE
