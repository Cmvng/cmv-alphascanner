# Primus Labs, "The groundnut test" (11 Nov 2026, upright, 1:51)

Final (third version; the numbers below are the second's and the third measures the same): 111.1 s, 3,333 frames, 1080×1920. -14.1 LUFS, true peak -1.6 dBTP, music 12.1 dB under the voice.

The owner's 2:41 selfie recording: a practical example of Primus Labs' zkTLS. They are at a supermarket with a bottle
of groundnuts, no cash, a bank app that is down, no ATM card, and an exchange that has paused withdrawals; the shop
uses Primus, so they log in to their own exchange account and the shop gets a proof that the money is there.
The brief: "clean and good and better than what you did the last time… the cinematic, the ambience… the illustration
of Primus Lab… sequenced in a good way… be fast with it." Out folder: `video/out/primus-groundnut-test/`.

**Concept: THE RECEIPT.** The story prints as a till receipt as the owner tells it. Four ways to pay are struck out;
then the proof prints: "ENOUGH MONEY? YES ✓ · MY BALANCE: HIDDEN".

## The fourth version is the one that went out last: `depth.html`. Start from it, and from `../../STYLE-LIBRARY.md`.
The third version (`talk.html`) followed ONE of the owner's samples and had the same shape as the Bagel video the day
before. "You just took the last video and use that template… I've sent different videos and styles. Why have you not
learned? Why have you not taken put things in your notes?" The fourth takes the strongest move from each sample:
- **Type and a logo plate behind the head** (S1, S3, S4): the title "THE GROUNDNUT TEST", the Primus logo on a white
  plate, a giant "1000x". They rise from behind the shoulders and the hair covers their lower edge.
- **Glass chips round the head that build with the voice, and a counter** (S1, S3): Cash, Bank app, ATM card, Crypto
  land beside the head on their words and are struck one by one; a tile counts the ways to pay left: 4, 3, 2, 1, 0.
- **A ring of tiles turning behind the head** on the pay-off (S1, S2): bags, groundnuts, the shop, a tick, a party
  popper, the phone, the money travel an arc from one shoulder over the head to the other, following the head.
- Kept from the third: word-by-word captions with big key phrases, the chain, the chips, the stamps, Primus' real
  page in a card, the Follow click, captions that step off the bottle.

**The owner is still not cut out.** The picture is their whole frame in their real room. `matte_cut.py` puts their
outline on the finished timeline (`alpha_cut.mkv`) and `render_depth.mjs` uses it for one thing only: to hide the part
of a `#bk` graphic that falls behind them. Order: picture, shade, the behind layer (hidden where the outline is), the
front layer. The outline is grown a pixel and softened, so nothing prints on the edge of the hair.

```bash
python3 -I $T/matte_cut.py $K                                # alpha_cut.mkv, track.js (the head's place, for the ring)
python3 -I $T/build_av.py $K $K/cam_room.mp4 full
python3 -I $T/tokens.py $K && python3 -I $T/clear.py $K
node $T/render_depth.mjs <page>/depth.html $K <dir> --stills 0,1,19.2,26,34.6,70.2,82.4   # look at the hair edge at full size first
node $T/render_depth.mjs <page>/depth.html $K <out.mp4>      # both layers in one encode; the page dir also needs track.js
```
Lessons from the fourth:
- **Two pipes into one ffmpeg must not wait for each other.** While ffmpeg opens the first pipe it does not read
  the second; waiting for each to drain in turn stops the render at frame 0. Queue both; pause only when both lag.
- **The head's "top" in `pp_track.npz` is about 80 px below the tip of the hair.** Place behind-the-head type from a
  still, not from the number.
- A behind-the-head line reads best when the hair covers a fifth to a third of the letters' height. More and it is
  hidden when the owner sits up; none and there is no depth.

## The third version: `talk.html` (rejected; its captions, chips and cards live on in the fourth)
The second version (the sheet over a smaller picture, `stage.html`) was rejected too: "The sound track doesn't fit the
video. Its poor video editing.. Some part of the video still are not aligned.. So many mistakes.. The motion graphics
is bad. Like didn't you study all the video samples I sent why is this so mid?!!" It had fixed the cut-out and the
crop, and it still looked like slides with a presenter in a box, with a slow film score under a funny, practical
story. None of the talking-head samples the owner sent looks like that.

The third version follows the upright sample they sent on 3 Nov ("AI changed my life", `video/templates/IDEAS.md`):
- **The owner is full screen from the first frame to the last.** Their real room softly blurred, the whole frame.
- **One compact thing pops over the head for each thing they name,** with a small label, 1 to 3 s each, on the word:
  a muscle for the gym, a cart, a globe, the groundnuts; cash, a bank, a card and a coin each get a red cross; the
  Primus logo pill; a lock, a phone, a chain "my phone → Primus → the shop"; chips "Enough to pay? YES / My balance:
  hidden"; a giant "1000x"; four ticks on "good, good, good, good"; a green "YOU CAN GO" stamp; Primus' real docs page
  in a card, scrolled to the two sentences; a red "NOT ON EVERY PLATFORM" stamp; a follow pill that a cursor clicks
  on "Peace".
- **Captions move word by word** at chest height (each word lights up on its own sound, from `tokens.py`); seven key
  phrases go big under them. No caption box.
- **A caption never lands on the bottle.** `clear.py` finds the bottle in the caption band ten times a second;
  `talk.html` moves the lines it would reach sideways, off it, and back to the centre when the bottle goes down.
- **The soundtrack fits the story:** "New Bass 01" (Mixkit 720, approved by the owner on explainers), which
  `video/lib/hear_music.py` describes as a bouncy, warm beat, like the beds in the two talking-head samples. "A New
  Life" is a slow orchestral film score: right for a match analysis, wrong here.

```bash
PP_FULL=1 python3 -I $LIB/portrait_pro_long.py render $K $K/segs.json $K/cam_room.mp4 4 room
python3 -I $T/build_av.py $K $K/cam_room.mp4 full            # the picture only flipped: full screen the whole way
python3 -I $T/tokens.py $K && python3 -I $T/clear.py $K      # tok.js (word times), clear.js (where the bottle is)
python3 -I $T/remix.py $K <720.mp3> 22.906 22.906 83.81 $K/mix.wav 8 6
node $T/render.mjs <page>/talk.html $K <out.mp4>             # the page dir also needs plan.js, docs.js, tok.js, clear.js, img/, img/e/*.png
```
`img/e/` holds the icons: Microsoft Fluent Emoji 3D (MIT), see `sources.md`. Not committed.

## The first version was rejected twice. Read this before reusing anything here.
1. **The cut-out.** The owner was cut out of their room onto a clean backdrop (the `studio` look). "This is the worst
   video ever… See the way you cut the main character from the background. See the way it looks so muddled up. Is it
   not even better for you to actually blur all the elements in the background". Fast hands broke into blocks and
   edges that the half-second sheets never showed.
2. **The crop.** A panel docked at the top and the camera picture was pushed 300 px down under it, on top of a zoom
   that followed the head. The bottle of groundnuts, the thing the whole example is about, was out of frame for most
   of the video. "You cut what I'm actually trying to show. You cut it and everything just looks so weird… Are you not
   seeing what you are creating?"

Both came from checking the wrong thing: the face was whole in every frame, and nobody looked at what the owner was
holding or at the picture in motion. The second version is built on two rules that are now in the checkpoint:
- **The owner's real room, softly blurred. Nothing replaced.** `portrait_pro_long.py … render … room`.
- **The whole picture as they framed it.** `PP_FULL=1`: no zoom, no following crop. When graphics need room, the
  whole picture is made smaller; it is never cropped, pushed out or covered where they show something.

## The format of the second version (rejected; kept for the record)
- **Full frame** for the hook, the pay-off and the sign-off: the owner in their own room, softly out of focus. A card
  sits over the ceiling above the head. Captions sit over the chest in the hook and the pay-off (nothing is held up
  there) and above the head in the sign-off, where the bottle comes back into the lower right.
- **Sheet down** for the explaining: a white sheet (1080×818) comes down from the top, and the owner's **whole
  picture shrinks to 75%** and sits at the bottom centre in a rounded window on a light-blue page. The sheet covers
  only the ceiling of the smaller picture: the head clears its edge in every frame (19 px at the tightest, measured
  from the matte on all 3,219 frames), and the hands and the bottle are always in view. Captions go into the sheet's
  bottom strip, so nothing is ever drawn over the owner.
- The sheet shows three scenes in turn:
  1. the receipt (the problem), 5–31 s, and again (the proof and the "YOU CAN GO" stamp), 74–79 s;
  2. the diagram "How the shop checks": My account, Me, The shop, the Primus node on the locked session, and a step
     line in the owner's words, 31–74 s;
  3. Primus' own docs page, scrolled to the two sentences that match, then "NOT ON EVERY PLATFORM", 85–99 s.

## Build
```bash
K=<work dir>; RAW=<raw.mp4>; LIB=video/lib; T=video/templates/talking-head/camera-primus-groundnuts-2026-11-11
ffmpeg -i $RAW -vn -ac 1 -ar 48000 $K/src.wav               # then adeclip, dereverb.py (WPE), df_enhance.py -> $K/src_df3.wav
python3 -I $LIB/portrait_pro_long.py prep $RAW $K           # 3 min; start this first, it needs nothing else (it deblocks)
python3 -I $LIB/portrait_pro_long.py matte $K <rvm.onnx>    # 16 min for 161 s (with other light jobs running)
python3 -I $LIB/align_words.py $K/df16.wav $K/words_in.json $K/words_ctc.json   # words_in: faster-whisper medium.en, names fixed
python3 -I $T/plan.py $K                                    # plan.json, plan.js, segs.json; check every edge is quiet
PP_FULL=1 python3 -I $LIB/portrait_pro_long.py preview $K $K/segs.json <dir> 1,16.6,41,69.5 room   # look at these at full size first
PP_FULL=1 python3 -I $LIB/portrait_pro_long.py render $K $K/segs.json $K/cam_room.mp4 4 room     # the whole frame, the real room
python3 -I $T/build_av.py $K $K/cam_room.mp4                # base.mp4 (the picture shrinks under the sheet) and voice.wav
python3 -I $T/remix.py $K <543.mp3> 24.642 24.642 69.677 $K/mix.wav 7 6        # "A New Life", set from the voice
NODE_USE_ENV_PROXY=1 node $T/capture_docs.mjs <docs url> <dir> 500 1500 2 "phrase|phrase"   # the real page and where the phrases sit
node $T/render.mjs <page>/stage.html $K <out.mp4>           # the page dir: stage.html, plan.js, docs.js, img/
python3 -I $T/review.py $K <out.mp4> && python3 -P -E $T/hearback.py $K && python3 -I $T/srt.py $K <out.srt>
python3 -I $T/versus_raw.py $K <out.mp4> <dir> 14.5,41,56.5,58.5,61,64,72.6,73.4   # the raw beside the result where they show something
python3 -I $T/motion.py <out.mp4> <dir>                      # consecutive full-size frames at the fastest moments; add times of your own
node $T/cover.mjs <page>/cover.html <out prefix>
python3 -I $LIB/preflight.py <out.mp4> --kind recording --music 543 --voice $K/voice.wav --bed $K/rm_bed.wav --captions $K/plan.json --reactions 0 --cover <cover.png>
```
`<page>/img/` holds `primus-logo.svg` (Primus' file), `docs-proof-of-assets.png` (the capture) and `still.png` (a
frame of the finished picture, for the cover). `docs.js` is `window.DOCS = ` + the capture's `rects.json`. Not committed.
`S_STAGE`, `MARGIN` and `RAMP` are written in both `build_av.py` and `stage.html`; change them together.

## How it was kept fast (the owner: "last time you took forever")
- The long steps started first and ran alone: prep, then the matte, then the picture render. Everything light
  (voice clean-up, transcript, cut plan, the docs capture, the page, the cover, the post kit) was done beside them.
- The page was checked on stills over a **stand-in base**: one preview frame, run through the real `build_av.py`, so
  the sheet, the picture's move and every scene were right before the real picture existed.
- The sound was mixed and measured on the real voice before the picture was ready, and was not touched by the redo.
- One overlay render per version, because the first frame, the cards and the levels had been checked on stills.
- What cost the time was the redo. The first version went out 66 minutes after the owner's message and came straight
  back. A plain blurred room and the whole frame would have been right the first time, and faster.

## Lessons
- **Before anything else, list what the owner shows** (here: a bottle of groundnuts, held low in the right of the
  frame for most of the video) and mark where it is in the raw frame. Every layout choice is then checked against that
  list, not against the face. `versus_raw.py` puts the raw frame beside the finished one for the final check.
- **Do not cut the owner out of their room.** A cut-out is only as good as its worst frame, and with a phone
  recording the worst frames are the fast hands. The `room` look replaces nothing, so it has no edge to get wrong.
- **Watch it move.** Half-second sheets hide what breaks between them. Consecutive frames at full size at every fast
  hand movement, before sending.
- **The recording itself has compression blocks on fast hands.** `prep` now runs a deblocking pass and the final
  sharpening is gentle (.12); stronger sharpening turns the blocks into visible squares.
- **Look for text in the raw picture.** The phone's front camera recorded the owner mirrored: the Chelsea crest and
  the Nike tick read backwards. `build_av.py` flips the picture (`FLIP`); the cover's still is flipped the same way.
- **Captions must not sit on what is held up.** Chest-height captions are fine while the hands are empty; in the
  sign-off the bottle is back in the lower right, so those captions go above the head.
- The aligner ran one word ("Lab.") through a 1.2 s pause. The cut-edge check (`plan.py` prints the level at every
  edge) caught it; the fix is read off the voice's energy.
- A caption can tidy a slip in a name (the owner's "Primus Tech Lab" is captioned "Primus Labs"); say so in the
  message. A made-up event about a real company (the hack) gets an "example" tag and no logo.
