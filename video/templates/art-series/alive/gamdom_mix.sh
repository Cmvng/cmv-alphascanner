#!/usr/bin/env bash
# The sound of 'The Living Drawing': "WOLF" (HoliznaCC0, Free Music Archive, CC0) and nothing else. Its drop (12.0 s
# in the track) lands on the film's drop, the quiet intro is lifted so a phone still plays it, and the beat before the
# drop is cut to silence. No added effects: on the art series the owner called made transition sounds "slop" (22 Oct).
#   DROP=8.8 TOT=30.8 BAR=3.2 bash gamdom_mix.sh <work dir> <wolf.mp3>        writes mix.wav (-14 LUFS)
# The music-free version of this film is simply silent, for posting under a sound picked in the app.
set -euo pipefail
W=$1; MUS=$2; DROP=${DROP:-8.8}; TOT=${TOT:-30.8}; BAR=${BAR:-3.2}; DT=${DT:-12.0}
c() { python3 -I -c "print(round($1, 3))"; }
DARK=$(c "$DROP - $BAR / 8"); OFF=$(c "$DT - $DROP")
ffmpeg -v error -y -ss $OFF -i "$MUS" -t $TOT -af "volume='if(lt(t,$DARK-0.06),2.8,if(lt(t,$DARK),2.8*($DARK-t)/0.06,if(lt(t,$DROP),0,1)))':eval=frame,afade=t=in:st=0:d=0.5,afade=t=out:st=$(c "$TOT - 1.6"):d=1.6" -ar 48000 -ac 2 "$W/premix.wav"
I=$(ffmpeg -nostdin -v info -i "$W/premix.wav" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
G=$(python3 -I -c "print(f'{-14 - float(\"$I\"):.2f}')"); echo "premix $I LUFS, gain $G dB, track from $OFF s, silence $DARK-$DROP"
ffmpeg -v error -y -i "$W/premix.wav" -af "volume=${G}dB,alimiter=limit=0.84:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/mix.wav"
ffmpeg -nostdin -v info -i "$W/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
