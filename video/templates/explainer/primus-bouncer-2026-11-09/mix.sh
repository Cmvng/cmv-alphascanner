#!/usr/bin/env bash
# The mix: Lara's take with a 0.6 s pause cut in after the cold open ("...for one yes or no."), over "P.D." (Arulo,
# Mixkit 413, a clean hip-hop beat with an empty voice band). The intro plays under the club door and the beat comes in
# (DT, 16.0 s into the track) on the pause, so it hits as "Crypto has the same problem" starts. Bed ducked under the
# voice, then one gain to -14 LUFS plus a limiter. After the voice ends (VEND) the bed rises under the end card and fades.
#   TOT=78.7 CUT=10.85 VEND=76.3 DT=16.0 bash mix.sh <work dir> <take.wav> <413.mp3>
# Also writes voice_only.wav (-16 LUFS): the track for the music-free version, to post under a sound chosen in the app.
set -euo pipefail
W=$1; TAKE=$2; MUS=$3; TOT=${TOT:-78.7}; CUT=${CUT:-10.85}; DT=${DT:-16.0}; VEND=${VEND:-76.3}; GAP=0.6; VO=0.2
DROP=$(python3 -I -c "print(round($CUT + $VO, 3))"); OFF=$(python3 -I -c "print(round($DT - $DROP, 3))")
ffmpeg -v error -y -i "$TAKE" -ar 48000 -ac 1 "$W/take48.wav"
ffmpeg -v error -y -i "$W/take48.wav" -filter_complex \
  "[0:a]asplit=2[a][b];[a]atrim=0:$CUT,asetpts=PTS-STARTPTS[a1];[b]atrim=$CUT,asetpts=PTS-STARTPTS[b1];anullsrc=r=48000:cl=mono,atrim=0:$GAP[g];[a1][g][b1]concat=n=3:v=0:a=1,adelay=$(python3 -I -c "print(int($VO*1000))"),highpass=f=70,apad=whole_dur=$TOT,atrim=0:$TOT[v]" \
  -map "[v]" -ar 48000 -ac 1 "$W/voice.wav"
ffmpeg -v error -y -ss $OFF -i "$MUS" -t $TOT -ar 48000 -ac 2 "$W/mloop.wav"
ffmpeg -v error -y -i "$W/mloop.wav" -af "volume='if(lt(t,$DROP),${PRE:-0.5},if(lt(t,$DROP+0.99),0.3-0.14*(t-$DROP)/0.99,if(lt(t,$VEND),${BED:-0.16},${BED:-0.16}+0.24*min(1,(t-$VEND)/0.8))))':eval=frame,afade=t=in:st=0:d=0.4,afade=t=out:st=$(python3 -I -c "print($TOT-2.0)"):d=2.0" -ar 48000 -ac 2 "$W/bed.wav"
ffmpeg -v error -y -i "$W/voice.wav" -i "$W/bed.wav" -filter_complex \
  "[0:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];[vm][md]amix=inputs=2:duration=first:normalize=0[m]" -map "[m]" -ar 48000 -ac 2 "$W/premix.wav"
I=$(ffmpeg -nostdin -v info -i "$W/premix.wav" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
G=$(python3 -I -c "print(f'{-14 - float(\"$I\"):.2f}')"); echo "premix $I LUFS, gain $G dB, drop at $DROP, track from $OFF"
ffmpeg -v error -y -i "$W/premix.wav" -af "volume=${G}dB,alimiter=limit=0.84:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/mix.wav"
ffmpeg -v error -y -i "$W/mix.wav" -ar 16000 -ac 1 "$W/mix16.wav"
ffmpeg -nostdin -v info -i "$W/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
IV=$(ffmpeg -nostdin -v info -i "$W/voice.wav" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
ffmpeg -v error -y -i "$W/voice.wav" -af "volume=$(python3 -I -c "print(f'{-16 - float(\"$IV\"):.2f}')")dB,alimiter=limit=0.84:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/voice_only.wav"
