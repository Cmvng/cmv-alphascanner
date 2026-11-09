#!/usr/bin/env bash
# The sound of 'Sleep on it': "Mi Gente" (Arulo, Mixkit 284, a moombahton bounce; a stock track, not the hit of the
# same name). Its full beat starts 17.99 s in; the film starts 3 bars before that, so the beat lands on 1:30 AM.
# Only three kinds of made sound (art-series/alive/sfx.py), each one something on screen: the clock's ticks on the
# countdown, a chime when the phone says "Claimed", a chime when Bagel's face pops in. No swells, hits or whooshes
# (the owner, 22 Oct, on made transition sounds: "slop").   bash mix.sh <work dir> <284.mp3>
# Writes mix.wav (-14 LUFS) and sfx_only.wav (the music-free version, for posting under a sound picked in the app).
set -euo pipefail
W=$1; MUS=$2; BAR=2.181818; BEAT=0.545455; DROP=6.545455; TOT=30.545; DT=17.99; SFX=$(cd "$(dirname "$0")" && pwd)/../../art-series/alive/sfx.py
c() { python3 -I -c "print(round($1, 3))"; }
b() { c "$DROP + $1 * $BAR + ${2:-0} * $BEAT"; }
python3 -I "$SFX" "$W/sfx.wav" "$TOT" tick:$(b -1 0):-4 tick:$(b -1 1):-4 tick:$(b -1 2):-4 tick:$(b -1 3):-1 ding:$(b 0 1):-2 ding:$(b 9):-5
ffmpeg -v error -y -ss $(c "$DT - $DROP") -i "$MUS" -t $TOT -af "volume='if(lt(t,$DROP-0.1),1.5,1)':eval=frame,afade=t=in:st=0:d=0.25,afade=t=out:st=$(c "$TOT - 2.0"):d=2.0" -ar 48000 -ac 2 "$W/music.wav"
ffmpeg -v error -y -i "$W/music.wav" -i "$W/sfx.wav" -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:normalize=0[m]" -map "[m]" -ar 48000 -ac 2 "$W/premix.wav"
I=$(ffmpeg -nostdin -v info -i "$W/premix.wav" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
G=$(python3 -I -c "print(f'{-14 - float(\"$I\"):.2f}')"); echo "premix $I LUFS, gain $G dB"
ffmpeg -v error -y -i "$W/premix.wav" -af "volume=${G}dB,alimiter=limit=0.8:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/mix.wav"
ffmpeg -v error -y -i "$W/sfx.wav" -af "volume=5dB,alimiter=limit=0.84:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/sfx_only.wav"
ffmpeg -nostdin -v info -i "$W/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
