# "Gambit" (the owner's own recording, 28 Nov 2026): 1:38, upright, untouched picture and voice

The owner, 28 Nov, with a Dropbox link to their recording and two screenshots of Gambit's weekly tournament: "Here are
some pictures I took. And you gave free expression to use any color palette... You don't need to use the blue again
lete see how creative you can be". Out folder: `video/out/gambit-2026-11-28/`. Sources: `sources.md`. Post kit:
`post-kit.md`.

## The idea
- **A palette of its own: the chess table.** Gambit is a chess word, so the screen parts sit on a forest-green board
  (`#173A27` / `#13311F` squares), with gold (`#F2C14E`) rings and lime (`#9BF26E`) for the money. Ink `#10241A`, light
  ivory chips. No blue anywhere (their words); no black background.
- **On camera (0:00 to 0:21):** the talking-head moves of their samples: GAMBIT and $250 in giant type behind their
  head, the gambitmarkets chip, then **their own two screenshots, as they took them**, cut to the part they talk
  about, with gold rings drawn on their words ($250, "top-ranked agent", then the top of the leaderboard).
- **From 0:21 they read from their screen to the end, so their face is not shown again** (the 28 Nov Entropy rule).
  That part is a screen recording of Gambit's real app, made by us: the phone screen whole in the frame, the pages
  changing with a tap (a white touch dot) on their words: the weekly leaderboard by P&L, the tournament card ($250,
  3+ trades, $100+ volume), Agents (the AI tab, then Manual), the markets, a game's lines and liquidity, the sports
  board for "combo picks", the past tournaments ($250 winner, GP), and back to the timer.

## The recording
A CapCut export, 1080×1920, 30 frames a second, 9.4 Mbit/s, 96.4 s. **The last 2 s are CapCut's black logo screen**:
the take ends at 94.4 s (blackdetect) and the end card follows (4 s).

## Where they look at the screen
`tools/gaze.py` (MediaPipe face landmarker; python3.13 here, needs `apt-get install libegl1 libgles2`) and face sheets
at 230 px checked by eye: on camera 0 to 19.5 s; reading from 21.5 s, with short looks up at 26 to 28, 30 to 31, 33 to
37, 73, 79, 83 and 85 to 87. Joined into one stretch (no flash of the face for a second or two), its start moved out to
the pause before word 40: 21.23 s to the end (`plan_gb.py`).

## Build
```bash
G=<scratch>/gb; T=video/templates/talking-head/camera-gambit-2026-11-28; F=video/templates/talking-head/camera-flop-xo-2026-11-13
E=video/templates/talking-head/camera-entropy-2026-11-28
python3 -I $E/tools/whisper_words.py $G/audio/rec16.wav $G/audio/words.json
python3 -I video/lib/align_words.py $G/audio/rec16.wav $G/audio/words.json $G/work/words.json
python3 -I $T/tools/plan_gb.py $G/work && python3 -I $F/tokens.py $G/work                  # captions, the screen stretch, tok.js
python3 -I $T/tools/extend_bed.py 370.mp3 $G/work/bed_src.wav 1.0 98.4 31.997 31.997 95.997     # "Sparta", its drop at 1 s
# their voice cleaned first (28 Nov, the owner on Entropy: "remove the background noise"): DeepFilterNet3, then de-ess, -5 dB above 7 kHz, nothing above 15 kHz
DF_MODEL=<dfmodel>/DeepFilterNet3 <dfenv>/bin/python $E/tools/dfclean.py $G/work/rec_audio_raw.wav $G/work/gb_df.wav
ffmpeg -i $G/work/gb_df.wav -af "deesser=i=0.5:m=0.5:f=0.5:s=o,highshelf=f=7000:g=-5:t=s:w=0.7,lowpass=f=15000:p=2,lowpass=f=15000:p=2" -c:a pcm_f32le $G/work/gb_clean.wav
ffmpeg -i $G/work/bed_src.wav -af highshelf=f=4000:g=-5 -c:a pcm_f32le $G/work/bed_src_dark.wav     # the music's highs off the voice's consonants
python3 -I video/templates/talking-head/camera-probly-2026-11-20/tools/mix_pb.py $G/work $G/work/gb_clean.wav $G/work/bed_src_dark.wav 0 94.4 0 98.4 1.0 11.5 4
python3 -I $F/matte60.py $G/work $G/raw/rec.mp4 rvm_mobilenetv3_fp32.onnx 0-21.2,25.6-38 && python3 -I $F/clean_alpha.py $G/work
WB=$E/tools/wordboxes.js node $T/tools/gcap.cjs $G/cap home=https://app.gambitmarkets.com/ lb=https://app.gambitmarkets.com/leaderboard agents=https://app.gambitmarkets.com/agents
WB=$E/tools/wordboxes.js node $T/tools/gstates.cjs $G/cap                         # tabs: P&L, past tournaments, AI / Manual, markets
WB=$E/tools/wordboxes.js node $T/tools/gcombo2.cjs $G/cap                         # sports board, one game's lines
# page dir: gb.html, cover.html, plan.js, tok.js, boxes.js, img/{cap -> captures, own -> the owner's screenshots, e -> Fluent emoji}, img/crown-logo.png, img/king-pile.webp, img/still.png
CRF=12 node $F/render_raw.mjs $G/page/gb.html $G/work $G/raw/rec.mp4 video/out/gambit-2026-11-28/gambit_9x16.mp4
node $F/cover.mjs $G/page/cover.html video/out/gambit-2026-11-28/gambit
```
- **The captures** are Gambit's public app at phone size (430×932 at 2.5×), no login, with every word's box saved so
  the rings sit on the words. Robinhood, a combo builder and any page naming Kalshi or Polymarket were not found
  without a login (`gterms.cjs` searched the terms page too): the captions keep the owner's words, the screen shows
  what is public.
- **The crown logo** is Gambit's own file (`app.gambitmarkets.com/crown-logo.png`) and the end-card art its own `images/leaderboard/king-pile-light.webp`, shown no larger than their own pixels.
- **crf 12** as on Entropy: the flat screen panel needs few bits and the default crf 16 lands under the recording's
  bitrate.

## The sound
Their voice, cleaned (see the build): the gaps between the words 15.5 dB quieter (-60 to -76 dBFS), the sizzle on the
words 7 dB lower (6 to 10 kHz from 5 to 12 dB under the voice band), the 19.2 kHz whine 13.5 dB lower, no word down more
than 3.8 dB, the loudness range kept (4.6 LU). No compressor, no limiter, plain gain. "Sparta" 15 dB under the voice, its
highs 11 dB under the voice's consonants. The DeepFilterNet3 weights are the Hugging Face copy `fal/DeepFilterNet3`
(GitHub refused them here), loaded into `deepfilternet` 0.5.6 in its own environment (torch 2.0.1, numpy below 2).

## Checks done
Stills over the recording's own frames at every scene; half-second sheets of the finished file; `versus_quality.py`
against the raw; `preflight.py --kind recording --music 370`; the cover cut to 3:4, 1:1, 7:8 and 16:9.
