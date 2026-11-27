#!/usr/bin/env bash
# The mix for the MMIX video (27 Nov): Lara's take (one generation, 77.40 s) with a 0.6 s pause cut in after the hook
# ("...who they are sharing the chain with.", take 5.50 s, inside the 5.34-5.80 silence), over "New Bass 01" (Mixkit 720,
# approved by the owner on explainers), extended on its own 4-bar cycle; its drop (22.941 s in the track) lands on the
# pause, so "MMIX is building..." comes in on it. The bed is raised BEDDB dB (set by measuring with preflight before the
# render) with its highs eased, ducked under the voice, up to full on the end card, then one gain to -14 LUFS plus a limiter.
#   BEDDB=9 bash mix_mx.sh <work dir> <take.mp3> <720.mp3> <extend_music.py>
set -euo pipefail
W=$1; TAKE=$2; MUS=$3; EXT=$4; TOT=82.3; BEDDB=${BEDDB:-9}
CUT=5.50; GAP=0.6; VO=0.2
DROP=$(python3 -I -c "print($CUT + $VO)")                   # the drop lands at the start of the added breath
OFF=$(python3 -I -c "print(round(22.941 - $DROP, 3))")      # where the track starts
ENDV=78.05                                                  # just after "You get it?"
python3 -I "$EXT" "$MUS" "$W/bed_src.wav" "$OFF" "$TOT"
ffmpeg -v error -y -i "$TAKE" -ar 48000 -ac 1 "$W/take48.wav"
ffmpeg -v error -y -i "$W/take48.wav" -filter_complex \
  "[0:a]asplit=2[a][b];[a]atrim=0:$CUT,asetpts=PTS-STARTPTS[a1];[b]atrim=$CUT,asetpts=PTS-STARTPTS[b1];anullsrc=r=48000:cl=mono,atrim=0:$GAP[g];[a1][g][b1]concat=n=3:v=0:a=1,adelay=$(python3 -I -c "print(int($VO*1000))"),highpass=f=70,apad=whole_dur=$TOT,atrim=0:$TOT[v]" \
  -map "[v]" -ar 48000 -ac 1 "$W/voice.wav"
ffmpeg -v error -y -i "$W/bed_src.wav" -af "volume='if(lt(t,$DROP),0.45,if(lt(t,$DROP+0.99),0.40-0.17*(t-$DROP)/0.99,if(lt(t,$ENDV),0.23,0.23+0.22*min(1,(t-$ENDV)/0.5))))':eval=frame,volume=${BEDDB}dB,highshelf=f=3500:g=-5,afade=t=out:st=$(python3 -I -c "print($TOT-1.6)"):d=1.6" \
  -ar 48000 -ac 2 "$W/bed.wav"
ffmpeg -v error -y -i "$W/voice.wav" -i "$W/bed.wav" -filter_complex \
  "[0:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];[vm][md]amix=inputs=2:duration=first:normalize=0[m]" \
  -map "[m]" -ar 48000 -ac 2 "$W/premix.wav"
ffmpeg -v error -y -i "$W/voice.wav" -i "$W/bed.wav" -filter_complex \
  "[1:a][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md]" -map "[md]" -ar 48000 -ac 2 "$W/ducked.wav"
I=$(ffmpeg -nostdin -v info -i "$W/premix.wav" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
G=$(python3 -I -c "print(f'{-14 - float(\"$I\"):.2f}')"); echo "premix $I LUFS, gain $G dB, drop at $DROP, track from $OFF"
ffmpeg -v error -y -i "$W/premix.wav" -af "volume=${G}dB,alimiter=limit=0.76:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/mix.wav"
ffmpeg -v error -y -i "$W/voice.wav" -af "volume=${G}dB,alimiter=limit=0.76:attack=5:release=80:level=false,afade=t=out:st=$(python3 -I -c "print($TOT-0.05)"):d=0.05" -ar 48000 -ac 2 "$W/voiceonly.wav"
ffmpeg -nostdin -v info -i "$W/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
