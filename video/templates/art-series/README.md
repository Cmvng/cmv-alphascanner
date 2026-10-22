# Art series: hype cuts from the owner's drawing sessions (Gamdom #Gamdom100kRound2)

## The project
- **The drawing:** 62 × 94 cm, landscape. The Gamdom logo and a castle, rising out of the ashes ("must fight back when kicked down").
- **The challenge:** #Gamdom100kRound2 ends 5 November and needs a 30+ second video promoting Gamdom.
- **The plan:**
  - Each ~4-hour session becomes one cut (CUT 01, CUT 02 …).
  - When the drawing is finished, the cuts are combined into the 30+ second reveal. Its end card carries "18+ · Play responsibly".
- **The workflow:** the owner sends inspiration reels for each cut ("templates") along with the session's footage.

## The owner's rules (22 Oct, after rejecting the first CUT 01)

*"Why did you not use any soundtrack for what I sent to you? I gave you templates… so people can actually extract
some soundtracks from there… You don't even tell a clean story… This is poor quality."*

1. **Use the soundtrack from the owner's templates.** Extract the audio from the reels they send (`ffmpeg -i v1.mp4 -vn
   -c:a pcm_s16le -ar 44100 t1.wav`) and cut the video to it. Never swap in a stock track or write your own lines
   when they've sent templates. Their templates are spoken speeches with a music bed.
2. **Edit in the template's own style.** Study each reel:
   - template 1: white serif captions synced to the voice;
   - template 3: one word in a script font;
   - template 4: small lines on black, cut against footage on the track's hits.
3. **Tell a clean story.** Show the drawing clearly, in session order:
   - blank page;
   - sketch;
   - first black;
   - the black spreading;
   - where it's going.

   Put a hook at the top ("Drawing the Gamdom castle · Session 01") so a viewer knows what they're watching. Show the artist's face and hands; those are the human moments.
4. **Quality:**
   - Keep the footage in colour, with a gentle warm grade (`grade.txt` below).
   - Never use black-and-white or crushed blacks.
   - Never zoom past about 2.3× on the 1080 square source (crop height ≥ 820 px); the first CUT 01 went to 3.7× and looked soft.
   - Pick sharp frames for freezes: score them with a Laplacian variance.

The first CUT 01 (`cut01.html`, `mix-cut01.py`, `cover.html`, `cut01-post-kit.md`) is kept only as a record of what
was rejected. Don't reuse its look: black-and-white, our own story cards, a stock track, heavy zooms.

## How the redo was built (`cut01b.html` main 0:37, `cut01c.html` short 0:16)
1. **Frames.** Extract the frames with `ffmpeg -i progress.mp4 -vf fps=30,unsharp=5:5:0.7 -q:v 2 fr/%04d.jpg`.
   - Grade them once into `fg/`, with this filter:
     `eq=contrast=1.10:saturation=0.96:brightness=-0.025,colorbalance=rs=-0.035:gs=-0.01:bs=0.045:rh=0.045:gh=0.012:bh=-0.035,curves=master='0/0 0.1/0.065 0.5/0.47 0.9/0.9 1/0.975'`.
   - The owner's time-lapse ends with a CapCut logo (frames 811+), so stop at 805.
2. **Word timings.** Run `python3 -P -E words.py <out dir> t1.wav …` (faster-whisper) for word-level timings. Paste them into the page's `W`.
3. **The main cut (`cut01b.html`).**
   - **Captions:** chunks of 3–7 words (`CH`), each word fading in as it's spoken, with one script word per line (`ACC`).
   - **Timing:** a line that ends on its script word stays up at least 0.5 s.
   - **Shots:** footage shots (`SHOTS`) cut at phrase starts. They come in three kinds:
     - `play`: a source range at a speed;
     - `hold`: a freeze frame with a push-in and a soft flash;
     - `rush`: the whole session in about a second, three frames blended.
   - **Overlays:** embers rising throughout (denser towards the end), warm light leaks on the big moments, a light vignette and grain.
   - **Ending:** a boom on the end card: "The Gamdom castle / is rising. / #Gamdom100kRound2".
4. **The short cut (`cut01c.html`).** Lines on black (`CARDS`) and footage shots on the template track's hits. Find the hits by printing RMS per 0.1 s: they show as −9 dB spikes between phrases.
5. **Render.** `PAGE=cut01b.html node render.mjs stills 1,7,20` for stills, then `PAGE=… OUT=silent.mp4 node render.mjs video`.
6. **Sound.**
   - `mix-cut01b.py` / `mix-cut01c.py`: the template soundtrack at its own level (it is already about −14 LUFS), quiet whooshes into the freezes, a reversed swell, then the boom (Mixkit 2909) and a low tail.
   - Finish with `alimiter=limit=0.84`.
   - Final measurement: −13.9 LUFS, true peak −1.1 dBTP.
7. **Cover.** `node cover2.mjs` renders `cover2.jpg` and `thumb2.jpg`: the artist at the paper, "Drawing the Gamdom castle, by hand."
8. **Post kit.** `cut01b-post-kit.md`. Tell the owner: if an app mutes the copied sound, open the template reel → Use audio → add our video with its own sound at 0. The edit is timed from the start of that sound.

## Ask the owner to film the next sessions like this
- **Camera:** on a tripod, square to the paper, with exposure and focus locked.
- **Light:** one lamp from the side, so the charcoal texture shows.
- **Coverage:**
  - a few close-ups of the hand and the charcoal;
  - a moment looking at the camera (it made the best freeze in CUT 01);
  - a slow pass along the sheet at the end.
- **Templates:** send the next cut's template reels along with the footage.
