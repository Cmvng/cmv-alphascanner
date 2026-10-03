# Editing the owner's own recordings (talking head + chart)

The owner films themselves talking over a screen recording (TradingView chart, face-cam in a corner) and sends it. We cut
it into a vertical video (and a 16:9 one with `--fmt wide`) in the house style. References: the ETH videos of 30 Sep 2026
(`eth-2026-09-30.edl.json`, site showcase) and 2 Oct 2026 (`eth-2026-10-02.edl.json`, the coin itself as the showcase,
cleaned voice, face-cam patch).

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
6. **Showcase:** `{ "id": "PRODUCT" }` in the clip list places it. **For a crypto video the showcase is the coin
   itself** (the owner asked for this, 3 Oct): `"product": { "kind": "coin", "coin": "ETH-USD", "name": "Ethereum",
   "zone": [2600, 2700], "zone_label": "most activity", "levels": [{ "p": 3000, "label": "target" }], "points": [...] }`.
   At render time it fetches the live price, 24h change and 4-hour candles from Coinbase's public API and draws them
   with the zone and levels the owner talked about (a level off the chart, like the target, becomes an arrow with its
   distance in %). The render prints whether the price is still inside the zone: if not, rewrite the points so they
   read true. Points restate what the owner said on the chart, never a new call. Otherwise (a site plug) it is a
   phone mockup of the live site plus three points the site itself states. Then the end card.
7. **Check the cut:** `python3 video/lib/edit_audio.py plan <edl> <out>` writes `voice.wav`; transcribe it. Fix any
   clipped word with `{ "end": <source seconds> }` (or "start", "pre", "post") on that range: whisper's word edges
   can be a syllable off for the owner's accent.
8. **Stills, then render:** `node video/edit-video.mjs <edl> --stills 1,6,12.5,20` then `node video/edit-video.mjs <edl>`.

## Layout (vertical)

Header chips (pair · handle) and a progress bar; the chart in a rounded panel on top, zoomed and following each
clip; captions in the middle; the face-cam below in a lime-ringed card; "Not financial advice · handle" at the
bottom. Jump cuts alternate a small punch-in so they look intentional. Frames are lightly sharpened (`"sharpen": false`
turns it off). If the face-cam sits on top of the chart in the recording, `"mask": { "rect": [x, y, w, h], "color":
"#DBD8DC" }` paints over it with the chart's background so zoomed shots stay clean (the face has its own card).

**Voice:** `"voice": { "enhance": "df3" }` runs DeepFilterNet3 over the whole recording first (removes room echo, fan
and street noise; about 18 dB lower noise floor), then a presence and level chain. Needs the TTS venv
(`pip install deepfilternet`); the weights come from Hugging Face (`fal/DeepFilterNet3`) into `video/.cache/dfnet3`.
Without it: a gentle clean-up only. **Music:** a drop track (`music.id`, default 720), `level` -3 dB by default (-6
with `duck` 10 keeps the voice well on top), ducked under the voice.

## Rules

- Crypto content: "Not financial advice" stays on screen; no "guaranteed" or "sure" anywhere we add.
- The product segment only states what the product's own site says.
- The owner's face and voice are theirs; we never use them for anything they didn't send for this purpose.
