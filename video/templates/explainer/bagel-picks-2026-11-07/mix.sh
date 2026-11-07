#!/usr/bin/env bash
# The mix: the house-voice take with a 0.6 s pause cut in before "If you're new", over "G Eazy NBA type" (Arulo,
# Mixkit 403). The build plays under the money hook and its drop (14.769 s) lands on the first team slam ("Fulham",
# take 8.62 s); the beat stops for the pause and comes back on "If you're new". The bed is ducked under the voice, then
# one gain to -14 LUFS plus a limiter.      bash mix.sh <work dir> <take.wav> <403.mp3>
set -euo pipefail
W=$1; TAKE=$2; MUS=$3; TOT=${TOT:-79.6}
CUT=${CUT:-51.6}; GAP=0.6; VO=0.2; SLAM=${SLAM:-8.62}
DROP=$(python3 -I -c "print(round($SLAM + $VO - 0.05, 3))")   # the drop on the first slam
OFF=$(python3 -I -c "print(round(14.769 - $DROP, 3))")       # where the track starts
S0=$(python3 -I -c "print(round($CUT + $VO - 0.06, 3))"); S1=$(python3 -I -c "print(round($CUT + $VO + $GAP, 3))")
ffmpeg -v error -y -i "$TAKE" -ar 48000 -ac 1 "$W/take48.wav"
ffmpeg -v error -y -i "$W/take48.wav" -filter_complex \
  "[0:a]asplit=2[a][b];[a]atrim=0:$CUT,asetpts=PTS-STARTPTS[a1];[b]atrim=$CUT,asetpts=PTS-STARTPTS[b1];anullsrc=r=48000:cl=mono,atrim=0:$GAP[g];[a1][g][b1]concat=n=3:v=0:a=1,adelay=$(python3 -I -c "print(int($VO*1000))"),highpass=f=70,apad=whole_dur=$TOT,atrim=0:$TOT[v]" \
  -map "[v]" -ar 48000 -ac 1 "$W/voice.wav"
ffmpeg -v error -y -ss $OFF -i "$MUS" -t $TOT -ar 48000 -ac 2 "$W/mloop.wav"
ffmpeg -v error -y -i "$W/mloop.wav" -af "volume='if(lt(t,$DROP),0.42,if(lt(t,$DROP+0.99),0.26-0.12*(t-$DROP)/0.99,if(between(t,$S0,$S1),0,0.14)))':eval=frame,afade=t=out:st=$(python3 -I -c "print($TOT-3.0)"):d=3.0" \
  -ar 48000 -ac 2 "$W/bed.wav"
ffmpeg -v error -y -i "$W/voice.wav" -i "$W/bed.wav" -filter_complex \
  "[0:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];[vm][md]amix=inputs=2:duration=first:normalize=0[m]" \
  -map "[m]" -ar 48000 -ac 2 "$W/premix.wav"
I=$(ffmpeg -nostdin -v info -i "$W/premix.wav" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
G=$(python3 -I -c "print(f'{-14 - float(\"$I\"):.2f}')"); echo "premix $I LUFS, gain $G dB, drop at $DROP, track from $OFF, stop $S0-$S1"
ffmpeg -v error -y -i "$W/premix.wav" -af "volume=${G}dB,alimiter=limit=0.84:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/mix.wav"
ffmpeg -v error -y -i "$W/mix.wav" -ar 16000 -ac 1 "$W/mix16.wav"
ffmpeg -nostdin -v info -i "$W/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
