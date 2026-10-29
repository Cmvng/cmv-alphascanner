# Bagel, "How to build a combo" (29 Oct 2026, the owner's recording, 2:15)

The owner sent an 8:44 CapCut export:
- the camera intro (0:00–1:01);
- then their screen: Bagel on the left, cmvngpicks.com on the right;
- their own Grin clip looping in the bottom-left corner. That was their first try at reactions: "I was not getting it right".

The brief: "a video explaining @bagel_win and how to create combo picks… too long… be creative about it so it's
shorter". The reactions have to be "visibly evident", unlike the first demo, where they were too fast and too small.

## The edit
- **The hook:** yesterday's 7-pick combo, "one pick to win", with the Jaw Drop in a split screen.
- **The title** lands on the music's drop.
- **What Bagel is:** the owner on camera, in a rounded card, with name chips and two real screens floating above their head:
  a Bagel market, then the $5 stake screen as a preview of where the video goes.
- **The two apps** (≤1.5 s establishing shot), then the three steps:
  1. **Build the slip (cmvng).** The camera follows the newest slip line, read by OCR, as the slip grows.
  2. **Find each game on Bagel.** Fast searches with a ▶▶ badge, and the "Everton v Newcastle, Totals, 4.5, Under" flow at real
     speed.
  3. **Place the combo:** $5, max payout $10.1, 2.02x (zoomed to 3×), Combo Order Placed.
- **The end card.**

## Files
- **`plan.py`:** the edit list. Every piece is a span of the recording, in a mode (cam, bagel, cmvng, both, title or end), with:
  - its speed and its camera keys;
  - its captions (the owner's words, `|` between chunks, timed by aligning to the transcript);
  - the reactions, marks, stamps, tracker, chapters, floats and chips.

  It writes `plan.js` here and `plan.json` in the work dir.
- **`bagel.html`:** the page that draws every frame from the recording's frames and the reaction library
  (`video/out/vreact/`).
- **`frames.py`:** extracts only the frames the plan uses (every k-th for fast pieces).
- **Reactions** are drawn by the page in the vr.js look. `snap` on a window gives it snap zooms ([[seconds in, zoom], ...],
  4 frames each); Wait, What? has two.
- **`build_av.py`:** the voice pieces plus "Sparta" (370), with the drop on the title. The bed is rendered in its own pass,
  because in one graph with the sidechain the music dropped out after 88 s.
- **`cover.html` / `cover.mjs`, `srt.py`, `hearback.py`, `sources.md`.**

## Rebuild
```
python3 -P -E words_med.py raw16.wav <work>/words_med.json           # faster-whisper medium.en
<tts venv>/bin/python video/lib/df_enhance.py src48.wav <work>/src_df3.wav
python3 -I plan.py <work>; python3 -I frames.py <work> raw.mp4
python3 -I build_av.py <work> <work>/src_df3.wav 370.mp3
PW=<playwright> node ../../reactions/render.mjs "$PWD/bagel.html#<work>/src/" out.mp4 --dur 134.95 --audio <work>/mix.wav --noreuse
```
`<work>/runs.json` holds the speech runs of the cleaned voice: energy above −50 dB, gaps under 0.12 s merged. Every cut sits in a pause; plan.py's
`tight` closes pauses over 0.42 s down to 0.22 s.

## Lessons
- **The owner's baked-in corner overlay** (x 40–265, y 835–1080) is kept out of every Bagel window: windows end at y 833, and
  the combo bar's numbers go to the tracker instead.
- **Canvas text needs its fonts loaded explicitly** (`document.fonts.load`). `document.fonts.ready` only covers fonts
  the DOM uses, so the first title still came out in a fallback serif.
- **Stamps on fast pieces outlive the screen they mark.** "Not found" stamps go on the real-time pieces, where the owner says
  it.
- **Check every cut against the energy, not only the words.** d2 ended at 92.83 s, where the transcript said "app" had
  begun but the voice ran on without a pause to 93.17 s, so "app" was clipped. The hear-back caught it: a 0.75 s caption
  with only 25% of its words heard. A cut now goes at the energy minimum after the last word (93.25 s, −72 dB).
- **A mark goes on the thing the owner acts on, and ends with its screen.**
  - The "ask box" outline sat on the label row above the text box.
  - "Under 84%" stayed up 0.9 s after its panel closed.
  - Both were found on the 10 fps overlay sheets (`vr_review.py` now makes `ov-NN.jpg` from a plan's marks, stamps,
    chips, floats and chapters).
- **Zoom until the numbers read.** At 2.06× the stake screen's "Max payout $10.1" was about 18 px. At 3× it's about
  34 px.
- **Watch the fast-forwards for what the app shows by itself.** Typing "gijon" and "lecce" into Bagel's search briefly
  listed political markets (Israel, Iran, Ukraine) for 0.2–0.35 s. `holds` on a fast piece keeps the frame before such
  a range. The frames were found by OCR of the kept frames; patched into the render with stills, so nothing re-timed.
- **A stamp ends with its app's screen** (`mode_end` in plan.py): the Guijuelo stamp ran 0.18 s into cmvng.
