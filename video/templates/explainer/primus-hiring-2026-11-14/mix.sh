#!/usr/bin/env bash
# The mix: Lara's take with a 0.6 s pause cut in after the hook ("...with one practical use case.", take 4.56 s, the
# middle of the 4.22-4.90 silence), over "Sparta" (Mixkit 370, approved by the owner on explainers) with its hard drop
# (31.997 s in the track) on the pause; about 12 dB under the voice while Lara speaks, ducked, up to full on the end
# card; then one gain to -14 LUFS plus a limiter.        bash mix.sh <work dir> <take.mp3> <370.mp3>
set -euo pipefail
W=$1; TAKE=$2; MUS=$3; TOT=59.0
CUT=4.56; GAP=0.6; VO=0.2
DROP=$(python3 -I -c "print($CUT + $VO)")                   # the drop lands at the start of the pause
OFF=$(python3 -I -c "print(round(31.997 - $DROP, 3))")      # where the track starts
ENDV=56.0                                                   # video time just after "That's all for now."
ffmpeg -v error -y -i "$TAKE" -ar 48000 -ac 1 "$W/take48.wav"
ffmpeg -v error -y -i "$TAKE" -ar 16000 -ac 1 "$W/take16.wav"
ffmpeg -v error -y -i "$W/take48.wav" -filter_complex \
  "[0:a]asplit=2[a][b];[a]atrim=0:$CUT,asetpts=PTS-STARTPTS[a1];[b]atrim=$CUT,asetpts=PTS-STARTPTS[b1];anullsrc=r=48000:cl=mono,atrim=0:$GAP[g];[a1][g][b1]concat=n=3:v=0:a=1,adelay=$(python3 -I -c "print(int($VO*1000))"),highpass=f=70,apad=whole_dur=$TOT,atrim=0:$TOT[v]" \
  -map "[v]" -ar 48000 -ac 1 "$W/voice.wav"
ffmpeg -v error -y -ss $OFF -t $TOT -i "$MUS" -af "aresample=48000,volume='if(lt(t,$DROP),0.45,if(lt(t,$DROP+0.99),0.40-0.17*(t-$DROP)/0.99,if(lt(t,$ENDV),0.23,0.23+0.22*min(1,(t-$ENDV)/0.5))))':eval=frame,afade=t=out:st=$(python3 -I -c "print($TOT-1.6)"):d=1.6" \
  -ar 48000 -ac 2 "$W/bed.wav"
ffmpeg -v error -y -i "$W/voice.wav" -i "$W/bed.wav" -filter_complex \
  "[0:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];[vm][md]amix=inputs=2:duration=first:normalize=0[m]" \
  -map "[m]" -ar 48000 -ac 2 "$W/premix.wav"
I=$(ffmpeg -nostdin -v info -i "$W/premix.wav" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
G=$(python3 -I -c "print(f'{-14 - float(\"$I\"):.2f}')"); echo "premix $I LUFS, gain $G dB, drop at $DROP, track from $OFF"
ffmpeg -v error -y -i "$W/premix.wav" -af "volume=${G}dB,alimiter=limit=0.84:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/mix.wav"
ffmpeg -v error -y -i "$W/mix.wav" -ar 16000 -ac 1 "$W/mix16.wav"
ffmpeg -v error -y -i "$W/voice.wav" -af "volume=${G}dB,alimiter=limit=0.84:attack=5:release=80:level=false,afade=t=out:st=$(python3 -I -c "print($TOT-0.05)"):d=0.05" -ar 48000 -ac 2 "$W/voiceonly.wav"
ffmpeg -nostdin -v info -i "$W/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
