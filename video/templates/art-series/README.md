# Art series: hype cuts from the owner's drawing sessions (Gamdom #Gamdom100kRound2)

The owner is drawing a 62 × 94 cm piece (landscape): the Gamdom logo and a castle, rising out of the ashes ("must fight
back when kicked down"). It's for the #Gamdom100kRound2 challenge, which ends 5 November and needs a 30+ second video
promoting Gamdom.

**The plan:**
- Each ~4-hour session becomes one teaser "cut" (CUT 01, CUT 02 …). The cuts build mystery and never show the whole piece.
- When the drawing is finished, every cut is combined into the 30+ second reveal: the entry. Its end card carries
  "18+ · Play responsibly".

The owner, 22 Oct: *"it has to be top notch… something that reflects a story… crazy and badass, that reflects the art,
that reflects the progress and creates hype."*

## The look (keep it across the series)
- **Grade:** an ash black-and-white on every shot: grayscale, high contrast, a heavy vignette, a cool multiply tint,
  overlay film grain that changes every frame, and drifting ash specks. The paper reads as grey and the charcoal as pure black.
- **Story cards:** short lines on black (Liberation Serif 68 px, one Playfair italic accent word), with a black halo
  so lines stay readable over anything.
- **Signature:** a REC HUD (CUT 0N, a blinking red ●REC, SESSION 0N, "0N / ??"), and "CUT 0N / ??" on every end card.
  The "??" is the hook: nobody knows how many cuts there will be.
- **The drop:** a beat-cut montage of four words in Anton (CUT 01: KICKED / DOWN. / NOT / OUT.), each on a darkened
  frame, with glitch and RGB-split on alternate beats and a white flash on the first.
- **End card:** one line in Playfair italic. The ghost of a hidden detail (CUT 01: the castle tower) sits behind it at
  16% opacity, with the hashtag beneath.
- **Hide the art:** close crops of the tower, the letters, the black. Never the whole sheet before the reveal.

## Story arc (one chapter per cut)
- **CUT 01: "The dark comes first."** They knocked me down → thought I'd stay there → everything went dark → so that's
  where I started. The first session filled the paper's edges with charcoal: the dark is the first thing on the page.
- Next cuts should climb: the castle walls go up (building back), the letters cut out of the black (the name holds),
  light breaking through, then the reveal. Each cut's montage words answer the last.

## How CUT 01 was built
1. **Frames.** Extract them from the owner's video (1080 × 1080, 27 s, no audio):
   `ffmpeg -i progress.mp4 -vf fps=30,unsharp=5:5:0.7 -q:v 2 fr/%04d.jpg`.
   Make grain with `ffmpeg -f lavfi -i color=c=0x808080:s=540x960:r=8 -vf noise=alls=70:allf=t+u,format=gray -frames:v 8 -start_number 0 grain/g%d.png`.
2. **The page.** `cut01.html` draws any moment with `window.seek(t)`. Edit the timeline at the top of its script:
   - `CARDS`: story cards, given as start, end, label and line;
   - `SHOTS`: each shot's output times, source start, speed, and two crop windows (the move goes from one to the other);
   - the montage beats: `SHOTS` entries with `punch` and a `word`, one per beat;
   - `END0` (where the end card starts) and `TOTAL` (the length).
   Source coordinates are in the 1080 × 1080 frame.
3. **Check, then render.**
   - Stills: `node render.mjs stills 1.2,8,20.5` → `still_<t>.png`. Look at every card and montage word.
   - Video: `node render.mjs video` → `silent.mp4` (Playwright screenshots piped into x264 at crf 15, 30 fps).
4. **Sound.** Run `python3 mix-cut01.py <dir> video/.cache/sfx video/.cache/music/318.mp3`.
   - **Music:** Thunder by Arulo, Mixkit 318. It has a quiet build to 20.2 s, then the drop (94.9 bpm). The montage
     cuts fall on its beats: 20.20, 20.83, 21.47, 22.10, 22.73, 23.36.
   - **Sound effects:** Mixkit. 2297 rumble, 497 heartbeat, 1143 whoosh-impact on the cracks, 2299 bass hits on the
     cards, 1492 whooshes, 2951 glitch, 3194 pencil, 2908 reversed as the swell plus the drop hit, 2909 boom on the end card.
   - **Silence before the drop:** the music dips to 2% from 19.97 to 20.2 s.
   - **Loudness:** use gain + `alimiter`, not loudnorm. Loudnorm flattened the drop into the build. CUT 01 measured
     −14.1 LUFS, peak −1.1 dBFS, with the build at about −20 dB RMS and the drop at about −10.
5. **Mux:** `ffmpeg -i silent.mp4 -i mix.wav -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart cut01.mp4`.
6. **Cover and thumbnail:** `node cover.mjs` → `cover.jpg` (1080 × 1920) and `thumb.jpg` (1280 × 720) from one frame.
7. **Delivery:** a ~28 MB chat copy (two-pass 7.5 Mb/s), a private download page for the full file, and the post kit
   (`cut01-post-kit.md` is the model).

## Ask the owner to film the next sessions like this
- **Camera:** locked on a tripod, square to the paper, with exposure and focus locked (no auto-brightness pumping).
- **Light:** one lamp from the side, so the charcoal texture and the hand's shadow read.
- **Coverage:** a few close-ups (hand, charcoal, smudging) and a slow handheld pass along the sheet at the end of the session.
- **The reveal:** one clean shot of the finished piece, wiped from black or from a cloth pulled off.
- **Optional:** the owner's own voice reading the story lines, for the reveal.
