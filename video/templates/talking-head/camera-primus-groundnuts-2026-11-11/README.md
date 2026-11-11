# Primus Labs, "The groundnut test" (11 Nov 2026, upright, 1:51)

The owner's 2:41 selfie recording: a practical example of Primus Labs' zkTLS. They are at a supermarket with a bottle
of groundnuts, no cash, a bank app that is down, no ATM card, and an exchange that has paused withdrawals; the shop
uses Primus, so they log in to their own exchange account and the shop gets a proof that the money is there.
The brief: "clean and good and better than what you did the last time… the cinematic, the ambience… the illustration
of Primus Lab… sequenced in a good way… be fast with it." Out folder: `video/out/primus-groundnut-test/`.

**Concept: THE RECEIPT.** The story prints as a till receipt as the owner tells it. Four ways to pay are struck out;
then the proof prints: "ENOUGH MONEY? YES ✓ · MY BALANCE: HIDDEN".

## The format (new: the stage panel)
- **Full frame** for the hook, the pay-off and the sign-off: the owner in the studio look, a card above the head.
- **Stage down** for the explaining: a white panel (1000×700) docks at the top, and the whole camera picture moves
  300 px lower on the same curve, so the top of the head sits just under the panel and the face stays whole. The
  captions move into the panel's bottom strip, so nothing covers the owner.
- The panel shows three scenes in turn:
  1. the receipt (the problem), 5–31 s, and again (the proof and the "YOU CAN GO" stamp), 74–79 s;
  2. the diagram "How the shop checks": My account, Me, The shop, the Primus node on the locked session, and a step
     line in the owner's words, 31–74 s;
  3. Primus' own docs page, scrolled to the two sentences that match, then "NOT ON EVERY PLATFORM", 85–99 s.

## Build
```bash
K=<work dir>; RAW=<raw.mp4>; LIB=video/lib; T=video/templates/talking-head/camera-primus-groundnuts-2026-11-11
ffmpeg -i $RAW -vn -ac 1 -ar 48000 $K/src.wav               # then adeclip, dereverb.py (WPE), df_enhance.py -> $K/src_df3.wav
python3 -I $LIB/portrait_pro_long.py prep $RAW $K           # 3 min; start this first, it needs nothing else
python3 -I $LIB/portrait_pro_long.py matte $K <rvm.onnx>    # 16 min for 161 s (with other light jobs running)
python3 -I $LIB/align_words.py $K/df16.wav $K/words_in.json $K/words_ctc.json   # words_in: faster-whisper medium.en, names fixed
python3 -I $T/plan.py $K                                    # plan.json, plan.js, segs.json; check every edge is quiet
python3 -I $LIB/portrait_pro_long.py preview $K $K/segs.json <dir> 1,16.6,41,69.5   # look at these at full size first
python3 -I $LIB/portrait_pro_long.py render $K $K/segs.json $K/cam_pro.mp4 4
python3 -I $T/build_av.py $K $K/cam_pro.mp4                 # base.mp4 (the camera's move under the panel) and voice.wav
python3 -I $T/remix.py $K <543.mp3> 24.642 24.642 69.677 $K/mix.wav 7 6        # "A New Life", set from the voice
NODE_USE_ENV_PROXY=1 node $T/capture_docs.mjs <docs url> <dir> 500 1500 2 "phrase|phrase"   # the real page and where the phrases sit
node $T/render.mjs <page>/stage.html $K <out.mp4>           # the page dir: stage.html, plan.js, docs.js, img/
python3 -I $T/review.py $K <out.mp4> && python3 -P -E $T/hearback.py $K && python3 -I $T/srt.py $K <out.srt>
node $T/cover.mjs <page>/cover.html <out prefix>
python3 -I $LIB/preflight.py <out.mp4> --kind recording --music 543 --voice $K/voice.wav --bed $K/rm_bed.wav --captions $K/plan.json --reactions 0 --cover <cover.png>
```
`<page>/img/` holds `primus-logo.svg` (Primus' file), `docs-proof-of-assets.png` (the capture) and `still.png` (a
frame of the studio look, for the cover). `docs.js` is `window.DOCS = ` + the capture's `rects.json`. Not committed.

## How it was kept fast (the owner: "last time you took forever")
- The long steps started first and ran alone: prep, then the matte, then the studio-look render. Everything light
  (voice clean-up, transcript, cut plan, the docs capture, the page, the cover, the post kit) was done beside them.
- The page was checked on stills over a **stand-in base**: one preview frame of the studio look, run through the real
  `build_av.py`, so the panel, the camera's move and every scene were right before the real picture existed.
- The sound was mixed and measured on the real voice before the picture was ready.
- One overlay render, because the first frame, the cards and the levels had been checked on stills.

## Lessons
- The owner sits close to the phone: the head is about a third of the frame's height. Cards above the head leave only
  400 px. Moving the camera down 300 px while a panel is shown gives a 578 px stage and keeps the face whole.
- The strip that opens above the moved picture is the top of the backdrop mirrored (`build_av.py`); the studio
  backdrop is a smooth blur, so the join is invisible.
- The aligner ran one word ("Lab.") through a 1.2 s pause. The cut-edge check (`plan.py` prints the level at every
  edge) caught it; the fix is read off the voice's energy.
- A caption can tidy a slip in a name (the owner's "Primus Tech Lab" is captioned "Primus Labs"); say so in the
  message. A made-up event about a real company (the hack) gets an "example" tag and no logo.
