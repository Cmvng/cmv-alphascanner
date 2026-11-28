set -e
cd /home/user/cmv-alphascanner
S=/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad; G=$S/gb; O=video/out/gambit-2026-11-28; V=$O/gambit_9x16.mp4
echo "== decode"; n=$(ffmpeg -nostdin -v error -i $V -f null - 2>&1 | wc -l); echo "decode errors: $n"; [ "$n" = 0 ]
ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -show_entries format=duration,size -of compact $V
echo "== versus"; python3 -I video/lib/versus_quality.py $G/raw/rec.mp4 $V $G/work/segs.json --voice $G/work/voice.wav --camera 0-21.2 | tail -7
echo "== preflight"; python3 -I video/lib/preflight.py $V --kind recording --music 370 --voice $G/work/voice.wav --bed $G/work/bed.wav --captions $G/work/plan.json --cover $O/gambit_cover.png | grep -E "^(ok|FAIL|WARN)|FAIL,"
echo "== end frames"; mkdir -p $G/look/fin; for t in 0.0 20.9 21.3 94.3 94.5 94.7 98.35; do ffmpeg -nostdin -v error -y -ss $t -i $V -frames:v 1 -vf scale=270:480 $G/look/fin/f_$t.png; done
python3 -I -c "
from PIL import Image; import glob
fs=sorted(glob.glob('$G/look/fin/f_*.png'), key=lambda f: float(f.split('_')[-1][:-4])); im=[Image.open(f) for f in fs]
W=Image.new('RGB',(270*len(im),480)); [W.paste(x,(i*270,0)) for i,x in enumerate(im)]; W.save('$G/look/fin/strip.jpg')"
echo "== copies"; bash $G/tools/copies.sh
echo "== hear-back"; ffmpeg -nostdin -v error -y -i $V -vn -ac 1 -ar 16000 $G/work/final16.wav; python3 -I $S/en/tools/hear.py $G/work $G/work/final16.wav | tail -6
echo ALL CHECKS DONE
