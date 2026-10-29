# The owner's reactions: a signature layer for every video

The owner, 29 Oct 2026: "for my videos, there will be reaction videos, like in a corner or something, like a sticker
form… if I'm trying to explain something… say a moment and it's funny or an angry moment or sad moment or confusing
moment, these reaction videos… will be the one that we use to express it… in a creative manner… it flows with the video
and is creative enough to captivate the audience." The clips are silent: no words, only faces.

The full study, with the research and sources, is `study-2026-10-29.md` (a copy of what the owner got). It is sent to the owner
with two demos:
- `primus-nomad-reactions.mp4`: the 27 Oct Primus video with six reactions;
- `reaction-lab.mp4`: the angles reel.

## The library
- `library.json` holds each reaction's id, name, feeling, uses, its Dropbox source, and the in/out/peak seconds kept
  from the clip.
- **Build it** (about 10 minutes for nine clips on CPU):
  1. `python3 -I video/lib/react_matte.py <clip.mp4> <work>/m<i> rvm_mobilenetv3_fp32.onnx` cuts the person out with
     Robust Video Matting. Get the model from the RobustVideoMatting GitHub release (v1.0.0); it runs on onnxruntime.
     The result is temporally steady, so hair doesn't flicker.
  2. `python3 -I video/lib/react_sticker.py <work>/m<i>/rgba.mkv video/out/reactions/<id> 520 <in> <out> <peak>` makes
     the die-cut sticker: a bust shape, a white border and RGBA frames at 30 fps. Add `tall` for raised arms (hands on
     the head), otherwise the bust curve cuts across the forearms.
  3. `python3 -I video/lib/react_lib.py video/templates/reactions/library.json video/out/reactions --full <id>=<clip.mp4> …`
     writes `lib.js` for the pages, plus the real full-frame clips used for interrupts.
- **Check the library sheet** (`video/out/reactions/library-sheet.jpg`) at full size before using a new reaction.
- **New clips** (the list of what to record is in the study): same T-shirt, wall and light, 4–5 s each (neutral, the
  face for 2–3 s, neutral again), 4K at 30 fps. Add them to `library.json` and rebuild.

## Using it in a video
- `stickers.js` is the engine. A page lists events `{k, id, t0, t1, …}` and calls `RX.draw(events, t)` from
  `window.render`.
- `render.mjs` renders the page:
  - over a finished video with `--base` (its sound is kept);
  - as a whole frame without it;
  - `--stills t1,t2` for checks.
- **Placements** (`k`):
  - `sticker`: a corner sticker.
  - `peek`: slides in from a frame edge.
  - `behind`: rises from behind the caption bar.
  - `interrupt`: a full-frame cutaway of the real clip.
  - `stamp`: CALLED IT / MISSED IT.
  - `chain`: a flipbook of faces in one spot.
  - `bubble`: a round mood bubble whose face changes on the beats.
- The chart ride and the caption swap are built from `sticker` events placed from data or from the laid-out text (see
  `lab.html`).

## The rules (from the study)
1. **One locked style:** the baked white border, `RX.SHADOW`, a tilt of ±4–8°, the same pop in (0.2 s, overshoot) and pop
   out (0.12 s). Never restyle it per video: the sameness is the signature.
2. **React, don't announce.** Land just after the word it answers. Side-Eye and Wait, What? may come a beat early.
3. **Length:** a sticker stays 0.8–1.6 s. An interrupt stays under 1 s, and there is at most one per video.
4. **Frequency:** 2–4 per minute, at least 6 s apart. Keep It's Over and The Wail for the climax.
5. **Free space only:**
   - never on the face or the thing being explained;
   - never on captions (in the camera layout a one-line caption starts at y 1733, two lines at y 1679);
   - never under the platform buttons (TikTok covers about 320 px at the bottom and 120–164 px at the right);
   - a sticker is about 25–30% of the frame width.
6. **Each face keeps one meaning** (the Grin = it came off; The Sob = it missed), so viewers learn the vocabulary.
7. **No sound effect** unless the owner picks one (the study asks). Never a whoosh.
8. **Facts on screen stay sourced:**
   - Prices come from a dated source (the reel used Kraken's public OHLC: `api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440`).
   - Results and calls come from our own post-match sources.

## Checks before sending (as for every video)
- Stills at every reaction, at full size.
- Then 10 frames a second across each reaction window (the pop in, the hold and the pop out).
- A frame diff against the base video outside the windows: it must be encode noise only.
- `review.py`'s every-half-second sheets for the whole video.
