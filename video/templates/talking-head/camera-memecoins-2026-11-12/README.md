# "Meme coins have served its purpose" (the owner's recording, 12 Nov 2026, upright, 3:32)

The owner's 4:12 selfie take on why meme coins "have served its purpose with this current model": launchpads living
on fees, "vamp" copies, fragmented liquidity, retail tired of the rat race, the last cycle's coins, saturation
("millions of meme coins"), the Elon test, and who still wins (insiders, bundlers, cabals).
The brief: "make the video to be better, adding motion effects, showing memes I'm talking about, the charts,
references to it in the video, and make what I'm talking about illustrative… look at your notes… 10/10."
Out folder: `video/out/meme-coins-served-its-purpose/`.

**Built the way the fifth Primus version was** (the checkpoint: "the fifth version… is the way"): the owner's own
frames and voice, untouched; cuts, graphics and quiet music on top; one encode; measured against the raw.

## The moves, and the sample each is from (`../../STYLE-LIBRARY.md`)
| Move | Sample | Where |
|---|---|---|
| The claim as giant type behind the head, with a date chip | S1, S3 | 0:00 |
| Data cards that build line by line with the voice, source and date on the card | S3 | the current model 0:06; the launchpad model 1:27; "except you have…" 3:07 |
| A timeline that changes state (altcoins → meme coins → ?) | S1 | 0:18 |
| The rat race: a row of coins, a new one pushes the last one out, faster and faster | S1 (playhead), ours | 0:31 |
| REWIND with a stamp, the coins the owner names as real logo cards, then one real chart | S3 | 0:58 |
| Hold, then a burst: a few coins, then a flood of them BEHIND the head on "millions" | S4, S1 | 1:50, 1:59 |
| The Elon test: the steps light on his words (MEME COIN, MUSK POSTS, ?), then bars to scale answer the "?": a Musk post in 2021 and in 2025-26 | S1 (timeline), S3 (split bar) | 2:24 |
| A big word behind the head ("OVERSATURATED") | S4 | 3:00 |
| Word-by-word captions with big key phrases, a stamp, the follow click | S2 | throughout |
New against the last recording (11 Nov): the cards with sources, REWIND and the chart, the rat race, the flood, the
bars. Kept: type behind the head, captions, stamp, follow click. No chips-and-counter, no ring of tiles.

**The handle is @i_am_vickyd** (the owner, 12 Nov, mid-render: "And its follow @i_am_vickyd on X"): opening tag, follow
button, end card ("Follow @i_am_vickyd on X") and cover. The cursor finds the button from the page, whatever the
handle's length.

## What is real
Every number comes from `data.js` (`fetch_data.py`, public APIs, fetched on the day) or is typed in `meme.html` with
its source on the card; `sources.md` lists each one with its date. The coin logos are the tokens' own. The charts
are drawn by us from real daily closes (not a redrawn interface); no app screen or tweet is imitated.

## Build
```bash
K=<work dir>; RAW=<raw.mp4>; T=video/templates/talking-head/camera-memecoins-2026-11-12; PAGE=<page dir>
ffmpeg -i $RAW -vn -ac 1 -ar 16000 $K/src16.wav
# words: faster-whisper medium.en with word times -> words_in.json; names fixed by hand -> words_fixed.json (every word needs a length)
python3 -I video/lib/align_words.py $K/src16.wav $K/words_fixed.json $K/words_ctc.json
python3 -I $T/plan.py $K -v                      # the cut from the real silences; plan.json, plan.js (with wt/we: each word's time), segs.json
python3 -I $T/tokens.py $K                       # tok.js: each caption word's time
python3 -I $T/fetch_data.py <data dir> $PAGE     # data.js and the logos (2 minutes; CoinGecko allows a few calls a minute)
python3 -I $T/mix_raw.py $K $RAW <720.mp3> 22.906 22.906 83.81 10 5
python3 -I $T/matte60.py $K $RAW <rvm.onnx> 0-6.2,118.3-127.7,179.5-187.3     # only where something is behind the head (3 minutes)
python3 -I $T/clean_alpha.py $K
# $PAGE holds meme.html, cover.html (links), plan.js, tok.js, data.js, img/e/*.png (icons), img/coins/*, img/still.png
ALPHA=$K/alpha60c.mkv node $T/render_raw.mjs $PAGE/meme.html $K $RAW <dir> --stills 0.5,12.5,38,64,76,82.2,120.5,163,182,211
CRF=14 ALPHA=$K/alpha60c.mkv node $T/render_raw.mjs $PAGE/meme.html $K $RAW <out.mp4>     # 6 to 7 minutes
python3 -I video/lib/versus_quality.py $RAW <out.mp4> $K/segs.json --voice $K/mix_raw_voice.wav
node $T/cover.mjs $PAGE/cover.html <out prefix>
```
`render_raw.mjs`, `matte60.py` and `clean_alpha.py` now read the frame rate and whether to flip from `plan.json`
(`fps`, `flip`): this recording is 30 a second and is not flipped (nothing in it reads backwards).

## What this recording taught
- **The cut comes from the silences.** The editing app the owner exports from leaves digital silence between
  phrases, so `plan.py` finds every pause exactly and never cuts by word times alone. The aligner put 31 words on
  the wrong side of a silence; `plan.py` re-times those stretches by word length.
- **Two recognisers, with and without a hint, for names.** A hint made both invent a list of coins that were never
  said. Without it both heard "Peanut, Pepe, Billy, Retardio". An unclear word is left out of the caption, not guessed.
- **Check the disk before a long render.** Trying the larger recogniser downloaded 3 GB; the render started with
  250 MB free. Remove a model that was only tried, at once.
- **The encoder was tested on five seconds first** (crf 16: lowest frame 83% of the raw's face detail; crf 14: 90%),
  so the first full render was the last.
- **Timing rules that came out of the half-second sheets** (the first render broke each one): a card arrives no
  more than 0.4 s before its first line and stays 2.5 s or more after its last; one thing has left before the next
  arrives in the same place; a source line sits under the last row that is on screen; a bar never grows past its
  card. Make the half-second sheets from a quick pass before the full render.
- **The last frame.** `-t 211.867` wrote a 6,357th frame: the recording's frozen picture without the end card. The
  renderer now passes `-frames:v` too, and its count fails on one frame more as well as one less.
- **A thing that moves while hidden makes every frame new.** The fire's wobble is computed even when it is not on
  screen, so the page's signature changed on every frame and the render took 9 minutes instead of under 4. Animate only
  what is visible.
