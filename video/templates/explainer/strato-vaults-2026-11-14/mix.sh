#!/usr/bin/env bash
# The mix: Lara's take with a 0.6 s pause cut in before "ETH Yield Vault", over "New Bass 01" (Mixkit 720) with its bass
# drop on the pause, the loop bars [22.906, 83.81] repeated to cover the take, the bed ducked under the voice, then one
# gain to -14 LUFS plus a limiter.      bash mix.sh <work dir> <take.mp3> <720.mp3>
set -euo pipefail
W=$1; TAKE=$2; MUS=$3; TOT=107.0
CUT=6.84; GAP=0.6; VO=0.2      # CUT: the middle of the take's silence 6.49-7.19 s, after "the same way."
DROP=$(python3 -I -c "print($CUT + $VO)")                  # the drop lands at the start of the pause
OFF=$(python3 -I -c "print(round(22.906 - $DROP, 3))")      # where the track starts
L0=22.906; L1=83.81                                         # whole bars after the drop that repeat
ffmpeg -v error -y -i "$TAKE" -ar 48000 -ac 1 "$W/take48.wav"
ffmpeg -v error -y -i "$TAKE" -ar 16000 -ac 1 "$W/take16.wav"
ffmpeg -v error -y -i "$W/take48.wav" -filter_complex \
  "[0:a]asplit=2[a][b];[a]atrim=0:$CUT,asetpts=PTS-STARTPTS[a1];[b]atrim=$CUT,asetpts=PTS-STARTPTS[b1];anullsrc=r=48000:cl=mono,atrim=0:$GAP[g];[a1][g][b1]concat=n=3:v=0:a=1,adelay=$(python3 -I -c "print(int($VO*1000))"),highpass=f=70,apad=whole_dur=$TOT,atrim=0:$TOT[v]" \
  -map "[v]" -ar 48000 -ac 1 "$W/voice.wav"
# the bed: the track from OFF to the loop end, then the loop again from its start, joined with a 30 ms crossfade
ffmpeg -v error -y -ss $OFF -to $L1 -i "$MUS" -ar 48000 -ac 2 "$W/m1.wav"
ffmpeg -v error -y -ss $L0 -to $L1 -i "$MUS" -ar 48000 -ac 2 "$W/m2.wav"
ffmpeg -v error -y -i "$W/m1.wav" -i "$W/m2.wav" -filter_complex "[0:a][1:a]acrossfade=d=0.03:c1=tri:c2=tri,atrim=0:$TOT[m]" -map "[m]" "$W/mloop.wav"
# after the drop the bed sits about 12 dB under the voice (preflight: 8 to 16; at 0.14 it measured 16.8, too quiet)
ffmpeg -v error -y -i "$W/mloop.wav" -af "volume='if(lt(t,$DROP),0.45,if(lt(t,$DROP+0.99),0.40-0.17*(t-$DROP)/0.99,0.23))':eval=frame,afade=t=out:st=$(python3 -I -c "print($TOT-3.0)"):d=3.0" \
  -ar 48000 -ac 2 "$W/bed.wav"
ffmpeg -v error -y -i "$W/voice.wav" -i "$W/bed.wav" -filter_complex \
  "[0:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];[vm][md]amix=inputs=2:duration=first:normalize=0[m]" \
  -map "[m]" -ar 48000 -ac 2 "$W/premix.wav"
I=$(ffmpeg -nostdin -v info -i "$W/premix.wav" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
G=$(python3 -I -c "print(f'{-14 - float(\"$I\"):.2f}')"); echo "premix $I LUFS, gain $G dB, drop at $DROP, track from $OFF"
ffmpeg -v error -y -i "$W/premix.wav" -af "volume=${G}dB,alimiter=limit=0.84:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/mix.wav"
ffmpeg -v error -y -i "$W/mix.wav" -ar 16000 -ac 1 "$W/mix16.wav"
ffmpeg -nostdin -v info -i "$W/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
