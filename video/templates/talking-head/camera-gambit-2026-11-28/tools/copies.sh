set -e
cd /home/user/cmv-alphascanner/video/out/gambit-2026-11-28
P=$(mktemp -d)
# chat copy: full 1080x1920, two-pass at 2.1 Mbit/s (about 27 MB for 1:38; the still screen parts need little, the face gets the rest)
ffmpeg -nostdin -v error -y -i gambit_9x16.mp4 -c:v libx264 -preset slow -b:v 2100k -pass 1 -passlogfile $P/c -an -f mp4 /dev/null
ffmpeg -nostdin -v error -y -i gambit_9x16.mp4 -c:v libx264 -preset slow -b:v 2100k -pass 2 -passlogfile $P/c -c:a aac -b:a 128k -movflags +faststart gambit_chat-copy.mp4
# no-music chat copy: the same picture, their voice only
ffmpeg -nostdin -v error -y -i gambit_chat-copy.mp4 -i /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/gb/work/voice.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart gambit_no-music_chat-copy.mp4
ls -la gambit_chat-copy.mp4 gambit_no-music_chat-copy.mp4
echo COPIES DONE
