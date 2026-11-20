#!/usr/bin/env bash
# The mix for the MagicMarkets referral video (#ad, 20 Nov): the free house voice (Kokoro af_heart with the measured
# delivery, natural pitch; the owner chose "Free female voice today") over "New Bass 01" (Mixkit 720, approved on
# explainers), extended on its own 4-bar cycle (extend_music.py from the 16 Nov brief). Its drop (22.941 s in the
# track) lands in a 0.4 s breath added after the hook ("...turn into whales.", take 5.6 s; "This" at 5.94 s). The bed is
# raised BEDDB dB (set by measuring with preflight before the render) with its highs eased, ducked under the voice, up
# to full on the end card, then one gain to -14 LUFS plus a limiter.
#   BEDDB=6 bash mix_mm.sh <work dir> <take.wav> <720.mp3> <extend_music.py>
set -euo pipefail
W=$1; TAKE=$2; MUS=$3; EXT=$4; TOT=91.7; BEDDB=${BEDDB:-6}
CUT=5.75; GAP=0.4; VO=0.2
DROP=$(python3 -I -c "print($CUT + $VO)")                   # the drop lands at the start of the added breath
OFF=$(python3 -I -c "print(round(22.941 - $DROP, 3))")      # where the track starts
ENDV=88.1                                                   # video time just after "through my link."
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
ffmpeg -v error -y -i "$W/premix.wav" -af "volume=${G}dB,alimiter=limit=0.80:attack=5:release=80:level=false" -ar 48000 -ac 2 "$W/mix.wav"
ffmpeg -v error -y -i "$W/voice.wav" -af "volume=${G}dB,alimiter=limit=0.80:attack=5:release=80:level=false,afade=t=out:st=$(python3 -I -c "print($TOT-0.05)"):d=0.05" -ar 48000 -ac 2 "$W/voiceonly.wav"
ffmpeg -nostdin -v info -i "$W/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
