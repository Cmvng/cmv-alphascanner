# Editing the owner's own recordings (talking head + chart)

The owner films themselves talking over a screen recording (TradingView chart, face-cam in a corner) and sends it. We cut
it into a vertical video in the house style. Reference: the ETH video of 30 Sep 2026, `eth-2026-09-30.edl.json`.

## Getting the video

- **From an X post:** `python3 video/lib/fetch_x.py <post link> raw.mp4` (X re-compresses, so it is a little soft).
- **Original file (sharper):** a Google Drive or Dropbox link set to "Anyone with the link"; for Dropbox change
  `dl=0` to `dl=1`. Files over 30 MB can't go through the chat.
- **Tips for the owner:** record the screen and the face-cam as two separate files if the recorder allows it; 1080p;
  a quiet room or a clip-on mic; say the key line once, clearly ("ETH is primed for $3,000, and here's why"); a
  10-second plug for the app makes the product segment stronger than on-screen text alone.

## The edit, step by step

1. **Words:** transcribe with word timings (faster-whisper `small.en`, `word_timestamps=True`) into `words.json`.
2. **Story:** pick the clips that tell it cleanly, as ranges of word indices. Cut only at pauses: a filler glued
   to the next word stays (cutting inside continuous speech sounds broken). Write a clean caption for each clip.
3. **Cold open:** 2–3 of the owner's own strongest lines, each with one big number (house style: build, then a
   punchline in red with a glitch). The title then lands on the music's drop.
4. **Zoom:** look at a frame from the middle of each clip and set `z: [centre x, centre y, width]` (fractions of
   the frame) on what the owner is pointing at; width 0.3–0.45 reads well on a phone.
5. **Callouts:** one short chip per clip where it helps (Breakout + retest, 70% setup ✓, Entry, Stop loss · R:R).
6. **Product:** `{ "id": "PRODUCT" }` in the clip list places the product segment (phone mockup of the live site,
   captured with Playwright, plus three points that the site itself states). Then the end card.
7. **Check the cut:** `python3 video/lib/edit_audio.py plan <edl> <out>` writes `voice.wav`; transcribe it. Fix any
   clipped word with `{ "end": <source seconds> }` (or "start", "pre", "post") on that range: whisper's word edges
   can be a syllable off for the owner's accent.
8. **Stills, then render:** `node video/edit-video.mjs <edl> --stills 1,6,12.5,20` then `node video/edit-video.mjs <edl>`.

## Layout (vertical)

Header chips (pair · handle) and a progress bar; the chart in a rounded panel on top, zoomed and following each
clip; captions in the middle; the face-cam below in a lime-ringed card; "Not financial advice · handle" at the
bottom. Jump cuts alternate a small punch-in so they look intentional. Voice: gentle clean-up only (noise floor,
boxiness, presence, level). Music: a drop track (`music.id`, default 720) at -3 dB, ducked under the voice.

## Rules

- Crypto content: "Not financial advice" stays on screen; no "guaranteed" or "sure" anywhere we add.
- The product segment only states what the product's own site says.
- The owner's face and voice are theirs; we never use them for anything they didn't send for this purpose.
