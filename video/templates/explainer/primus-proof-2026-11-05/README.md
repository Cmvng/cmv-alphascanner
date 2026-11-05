# Primus, "Show your hand" (5 Nov 2026, 1:12, 16:9)

The owner's six-scene, first-person script about @primus_labs, with six pictures:
- four of Primus's own: the cards, Inside / Outside, the docs' MPC-model diagram, and The Cure of Onchain Finance;
- two designed frames: "47 trades" and "one answer".

The voice is Lara (eleven_v4, voice_id vChnJZ1Cu89g2XXumPfT).
- The full script needed 1,302 credits and the account had 1,070, so ElevenLabs refused the first call; nothing was charged.
- The owner chose a trimmed version, saw the text and approved it: 1,046 credits, 69.1 s.

**Format (new): the deal,** after Primus's line "Show your hand. Not your whole deck."
- **Each picture is a playing card** with a white border, dealt onto a light table. It comes in from the top right with an
  overshoot, and the earlier cards stay stacked underneath.
- **A camera inside the card** moves to what Lara names, with blue rings.
- **The pills** "zkTLS" and "FHE" appear in Primus orange.
- **At "keeping the rest confidential",** the five earlier cards fan out under the last one and flip face down: CSS 3D
  `rotateY` to a card back with Primus's round icon.
- **The owner's reaction stickers** come in from the right while the edit shrinks left: Stare, Ugh, Nervous, Nah.

## Build

1. `bash mix.sh <work> <take.mp3> <370.mp3>`:
   - a 0.6 s pause at take 7.0 s (before "If you're new");
   - "Sparta" (Mixkit 370) from 24.797 s, so its drop lands on the pause;
   - ducked under the voice, then one gain plus the limiter: −14.5 LUFS, peak −1.4 dB.
2. **Word times:** `../bagel-live-2026-11-03/words.py`, large-v3. The long run invented "those numbers are true"; a
   short snippet confirmed "those numbers are just my example".
3. **Page:** `page/primus.html`.
   - It needs `page/img/` p1–p6: the pictures, with the PNGs saved as JPEG.
   - It also needs `icon.png` (Primus's round icon, cropped from p3) and `wordmark.png` (cropped from p1, keyed to
     navy-on-transparent).
   - Times are take seconds: `T(s) = s + 0.2 + (s ≥ 7 ? 0.6 : 0)`.
   - Ring rectangles are in picture pixels, read from a 50 px grid drawn over each picture.
4. **Render:** `bash ../../art-series/unveil/render_par.sh $PWD/page/primus.html <work>/plan.json out.mp4 3 16`, with plan
   `{fps: 30, total: 72, audio: {src: mix.wav, in: 0, fade: [71.95, 0.05]}}`.
5. **Cover:** `node cover.mjs $PWD/page/cover.html <out>`.
6. **Checks:** 2 fps sheets, plus 10 fps across the deals and stickers; `python3 -P -E hearback.py <work>/hb_plan.json <work>/mix16.wav`.

## Fixes from the stills

- **The first two frames were empty,** because the first card waited for its own start time. It is now dealt 0.42 s early,
  so frame one shows it landing.
- **The headline zoom cut off "say your ex…",** and its ring missed "47".
- **The footnote "numbers are just an example" was too small to read.** It now zooms to 2.4×.
- **The wordmark had a cream box,** and faded cards showed through the end card.

## Fixes from the first full render (sheets)

- **The Ace zoom cut "SHOW YOUR HAND" in half at the bottom edge.** The camera now sits higher (y 470), so the headline is
  fully out of the zoomed shot.
- **The @primus_labs chip landed on the headline** while the camera was still pulling back: a camera move starts at its
  key and takes 0.9 s, and the pull-back key was 4.55 s, after the chip's 4.8 s. The zoom now starts at 2.4 s ("when they
  only need"), the pull-back at 3.95 s, and the chip at 4.85 s, on "Primus".
