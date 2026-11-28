# "Entropy" (the owner's own recording, 28 Nov 2026): 4:52, upright, untouched picture and voice

The owner, 28 Nov, with a Dropbox link to their recording and https://x.com/entropyIO: "There are some parts where I'm
actually looking at the screen while talking… that's where you actually like showcase what I'm actually talking about…
the opportunities from their Discord… what creators are saying… their website, what the team said, how to position…
where I'm [not] visibly looking at the screen, you can be doing the motion design, like how the samples you already know
how to do. But once I'm looking at the screen, you will not show my face anymore again, because basically it will make
it look as if I'm doing an unprofessional video… as quickly as possible, while making sure that there are no mistakes."
Out folder: `video/out/entropy-2026-11-28/`. Sources: `sources.md`. Post kit: `post-kit.md`.

## The idea (second version, 28 Nov)
Two modes, switched by where they look:
- **On camera:** the talking-head moves of their samples (S1 to S4 in `video/templates/STYLE-LIBRARY.md`): giant type
  behind the head, real pages and posts above it ringed on their words, icons, word-by-word captions with big phrases.
- **Looking at their screen (seven stretches, 1:52): a screen recording of Entropy's real app, made by us.** The phone
  screen sits whole in the frame and its pages change the way a recording does: a tap (a white touch dot), then the
  next page. The amounts they say are typed into the real Amount field of the trade screen ($10,000 … $100,000,000,
  `tools/trade.cjs`); "delta neutral" is a tap on Long, then Short; the tiers are Entropy's own docs page (Frontend
  Fees: Tier 1 $0M, Tier 2 $3M, Tier 3 $8M, Tier 4 $15M of rolling 30-day volume), each row ringed on its word; the
  program is the app's Referrals tab and the real posts (@Athayagg's list of the six plans, @entropyIO's Creator
  Grants post), the Discord is its real invite page.
- **The first version** had a light panel with our own card of the six plans and our own role chips there. The owner,
  28 Nov: "You'll be displaying the app, the application… the features of the app… I did not say you can't put one of
  our stupid mock photo". No card of ours stands in for the app any more.

## The recording
A CapCut export, 1080×1920, 30 frames a second, not mirrored, 9.5 Mbit/s, 290.04 s. **The last 2 s are CapCut's black
logo screen**: the take ends at 288.033 s (blackdetect), so `plan_en.py` ends there and the end card follows. Their head
reaches from about y 580 (median 620) down to the beard at about y 1520, lower than in the car selfies: every card
lives in the ceiling (y 36 to 550), the giant type behind the top of the head (y 330 to 750), the captions on the vest.

## Where they look at the screen
MediaPipe's face landmarker (eye-look-down blend shapes and head pitch, every third frame) with frames checked by eye
gave 11 stretches; `plan_en.py` joins those less than 6 s apart (no flash of the face) and moves each edge OUT to the
middle of the nearest pause (an edge already inside a pause stays there). The result, in `plan.json` "screen":
51.6-104.3, 112.1-117.5, 127.0-137.6, 143.5-149.9, 158.5-164.1, 174.0-192.4, 261.7-274.1. The panel finishes rising at
each start and starts dropping at each end, so their face is never seen looking down. MediaPipe runs under python3.13
here (`pip` installs there) and needs `apt-get install libegl1 libgles2`; the gaze script was lost with a container
restart, so these stretches are kept in `plan_en.py` as data.

## Build
```bash
EN=<scratch>/en; T=video/templates/talking-head/camera-entropy-2026-11-28; F=video/templates/talking-head/camera-flop-xo-2026-11-13
python3 -I $T/tools/whisper_words.py $EN/audio/rec16.wav $EN/audio/words.json            # faster-whisper medium.en
python3 -I video/lib/align_words.py $EN/audio/rec16.wav $EN/audio/words.json $EN/work/words.json
python3 -I $T/tools/plan_en.py $EN/work && python3 -I $F/tokens.py $EN/work               # captions, screen stretches, tok.js
python3 -I $T/tools/extend_bed.py 720.mp3 $EN/work/bed_src.wav 1.0 294.0333               # the bed, its drop at 1 s
python3 -I video/templates/talking-head/camera-probly-2026-11-20/tools/mix_pb.py $EN/work $EN/raw/rec.mp4 $EN/work/bed_src.wav 0 288.0333 0 292.0333 1.0 10 4
cp $EN/work/mix.wav $EN/work/mix_raw.wav
python3 -I $F/matte60.py $EN/work $EN/raw/rec.mp4 rvm_mobilenetv3_fp32.onnx 0-6.6,43.6-51.7,150.0-158.6,164.0-170.2,238.4-247.6 && python3 -I $F/clean_alpha.py $EN/work
NODE_USE_ENV_PROXY=1 node $T/tools/posts.cjs $EN/cap/posts athaya=2126380374100234614 grants=2125649258842124723 feed=2125586718204256450 launch=2091927497978130568 aman=2091965172474859697
NODE_USE_ENV_PROXY=1 node $T/tools/pages.cjs $EN/cap/pages home=https://entropy.io/ markets=https://entropy.io/markets discord=https://discord.com/invite/entropyio
python3 -I $T/tools/boxes.py $EN/cap $EN/page/boxes.js                                    # ring boxes from the DOM word boxes
# page dir: en.html, cover.html, plan.js, tok.js, boxes.js, img/{posts,pages} -> captures, img/e (Fluent emoji), img/io_tile.png, img/still.png
node $F/render_raw.mjs $EN/page/en.html $EN/work $EN/raw/rec.mp4 <out dir> --stills 5,57,108,180,245   # stills first
CRF=12 node $F/render_raw.mjs $EN/page/en.html $EN/work $EN/raw/rec.mp4 video/out/entropy-2026-11-28/entropy_9x16.mp4   # crf 12: see below
node $F/cover.mjs $EN/page/cover.html video/out/entropy-2026-11-28/entropy
```
- **Posts** come from X's own embed widget (`platform.twitter.com/widgets.js`) in Playwright, with every word's box saved
  from the embed's DOM, so the rings sit exactly on the words. X's profile timeline widget no longer renders without a
  login, and fetching the timeline JSON with a borrowed browser identity was refused here: the post links came from web
  searches (and one from KuCoin's mirror of the post, which links the original).
- **Pages** are captured at phone size with the cookie banner answered "Reject all". Entropy's docs and leaderboard
  show "not available to users from Prohibited Jurisdictions" from this machine: not used.
- **The iO tile** is cut from the Discord invite (159 px): it is never shown larger than that.
- **crf 12, not the default 16:** at 16 the file came out at 6.6 Mbit/s against the recording's 9.5 (the flat
  screen panels need few bits) and `versus_quality.py` failed it on bitrate, although the face kept 107% of its detail.
- **The opaque screen frames** (the panel covers everything) go through `render_raw.mjs`'s alpha fix one by one, so
  the screen stretches render at about 6 frames a second against about 20 on camera.

## The sound (28 Nov, after the second version)
The owner: "remove the noise, the background noise… Can't you hear the screeching sound that is going on in the
background?" `tools/clean_rebuild.sh <clean voice>` rebuilds every file from a cleaned voice: `tools/dfclean.py`
(DeepFilterNet3, run in its own environment: `deepfilternet` 0.5.6 with torch 2.0.1 and numpy below 2; the weights from
Hugging Face `fal/DeepFilterNet3`, converted to its checkpoint layout), then `deesser`, a 5 dB high shelf at 7 kHz and two
15 kHz low-passes in ffmpeg; music under 11.5 + 4 (15.6 dB under the voice). The picture of every file is a stream copy.
`tools/voice_check.py` measures the gaps, the high band and every word against the recording. Demucs was tried first and
found no music to take out.

## Checks done
Stills over the recording's own frames at every scene; half-second sheets of the finished file; `versus_quality.py`
against the raw; `preflight.py --kind recording --music 720`; the cover cut to 3:4, 1:1, 7:8 and 16:9.
