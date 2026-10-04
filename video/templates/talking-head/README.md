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
clip; captions in the middle; the face-cam below in a blue-ringed card; "Not financial advice · handle" at the
bottom. Jump cuts alternate a small punch-in so they look intentional. Frames are lightly sharpened (`"sharpen": false`
turns it off). If the face-cam sits on top of the chart in the recording, `"mask": { "rect": [x, y, w, h], "color":
"#DBD8DC" }` paints over it with the chart's background so zoomed shots stay clean (the face has its own card).

**Voice:** `"voice": { "enhance": "df3" }` runs DeepFilterNet3 over the whole recording first (removes room echo, fan
and street noise; about 18 dB lower noise floor), then a presence and level chain. Needs the TTS venv
(`pip install deepfilternet`); the weights come from Hugging Face (`fal/DeepFilterNet3`) into `video/.cache/dfnet3`.
Without it: a gentle clean-up only. **Music:** a drop track (`music.id`, default 720), `level` -3 dB by default (-6
with `duck` 10 keeps the voice well on top), ducked under the voice.

## Phone screen recordings (no face-cam)

`"layout": "phone"` with `"chart": [0, 0, width, height]` (the whole screen) and no `face`: the screen fills the frame
at full width under a slim label band, with highlight boxes and close-ups on what the owner is talking about,
captions over a dark fade at the bottom. Reference: the
memecoin video of 3 Oct 2026, `meme-2026-10-03.edl.json` (a 7.5-minute Fomo app recording, 5:24 edit).

**The owner's feedback on the first cut (3 Oct): "words were getting cut out" and "it's getting zoomed out".** So:

- **Cut only at real silences.** `python3 video/lib/phrases.py <out>/src_df3.wav words.json phrases.json` splits the
  cleaned voice into phrases; clips take whole phrases as `{ "t": [start, end] }` ranges. Never cut inside a phrase,
  never drop words from the middle of a sentence; drop only whole phrases (searching, scrolling, "let me see", false
  starts, an exact repeat). Keep pauses natural: `"timing": { "gap_min": 0.7, "gap_keep": 0.4 }`.
- **Check every edge before rendering:** each piece must start and end below about -45 dB in the cleaned voice, and a
  transcript of each clip's audio must contain its first and last words.
- **Never crop the sides of a phone screen.** The owner's second note (3 Oct): token logos and names were cut off, and
  our labels covered the app's header. The screen always shows its full width (`"zk": [[source seconds, 0.5, y, 1]]`,
  only the height moves: 0.375 shows a token page's or profile's top with its name, logo and price; 0.5 for lists),
  with no push or punch-in. Labels live in the band above the screen. Choose heights from gridded filmstrips:
  `python3 video/lib/zoom_strip.py <start> <end> <frames> strip.png raw.mp4`.
- **Point at numbers without cropping:** `"marks": [{ "t": [from, to], "r": [x0, y0, x1, y1], "lens": true, "lr": […] }]`
  (source seconds, fractions of the screen) draws a box around the row being talked about, dims the rest, and pops up a
  magnified close-up of `lr` (the number itself; keep it narrow, half the width or less, or it isn't magnified).
  Check every mark on a still: rows move when the owner scrolls.
- **Captions timed to the words:** `"caption_words": "words_big.json"` (faster-whisper `distil-large-v3`, word
  timings, with a prompt naming the coins); each clip's `cap` is the owner's words, lightly cleaned, aligned word by word.
- **Callouts when the owner says it:** `"call_t": <source seconds>` places a clip's callout at that moment.
- **Check numbers against the screen.** The STONK holder was "13 million" (chart: all-time high about $300M, now
  $191M), not 30 as one transcript heard; the 11,000% trade showed +11,528.99%.
- **Chapters and inserts** as before: `"chapter"` on a clip; `{ "insert": { "kind": "board" | "compare", … } }` between
  clips (figures only from what the owner said or showed).
- **Text sizes:** a cold-open line or the title can take `"size"` (px) and `\n` line breaks.

## Desktop screen recordings with a face-cam corner (16:9)

`"layout": "screen"` with `--fmt wide`: the whole screen at full width (no push, no punch-in), the face-cam in a card over
the corner it covered in the recording, callouts just above the captions, so the site's own header stays clear. Reference:
the XO Market video of 4 Oct 2026, `xo-2026-10-04.edl.json` (a 10-minute CapCut composite, 1440×1080: the browser at
`"chart": [0, 177, 1440, 726]`, the face-cam at `[1141, 713, 299, 367]`, `"mask"` over the face's corner of the screen).

- **Check the sync before anything else.** The owner records the screen and the camera on two devices and lines them up in
  CapCut. On 4 Oct the screen ran 18.0 s ahead of the voice: they read out "you will receive 10 USDCe, about 2 minutes"
  20 s after that box had closed, and the screen went black 18 s before they stopped talking (both devices stopped
  together, so the gap at the end is the offset). Test it on three or four moments where they read something off the screen.
  Fix it once in a new source, screen moved, face and voice untouched:
  `ffmpeg -i src.mp4 -filter_complex "[0:v]split=3[b][s][f];[s]crop=1440:726:0:177,tpad=start_duration=18:start_mode=clone[scr];[f]crop=300:368:1140:712[face];[b][scr]overlay=0:177[b1];[b1][face]overlay=1140:712[v]" -map "[v]" -map 0:a -c:v libx264 -crf 15 -c:a copy synced.mp4`
- **Marks:** fractions of the whole 1440×1080 frame. Check every mark on frames at its start and end: the owner scrolls
  mid-sentence. In 16:9 the close-up (680 px wide) sits under the box, over it, or beside it, never on the box, the
  face-cam card or the callout and caption strip.
- **Read numbers off the screen, not the transcript.** "I will get pay out of 3.39" was the owner reading the button
  ("Buy Yes · Pay $3.39", the price with the fee); the payout on the same screen was $6.40. Leave such a line out and
  put the right number in a callout or on a card.
- **Cards for things the owner asks on camera** ("what does this CP mean?"): a white list card with the answer from the
  project's own docs, dated (`"source"`).
- **Never cut the owner's face.** Their note (4 Oct): "make sure no part is cut out, half of my face is cut out". The face-cam
  card has the camera's own shape (`#stage.wide.screen #facebox` 308×379 for a 299×368 camera) so the whole picture shows,
  with no punch-in on jump cuts; it sits where the camera sat in the recording, clear of the site's content.
- Disk: a 10-minute 1440×1080 source makes about 2.5 GB of frames. Clear the `f/` folders of finished edits first.

## Inspiration the owner likes for crypto videos (4 Oct 2026)

Two reference videos the owner sent (Dropbox links in the chat of 4 Oct), on top of our own style:

**"Prism, explained in 180 sec" (3:11, vertical, presenter to camera at TOKEN2049).**
- Script: hook in one line ("I spent an afternoon clicking through Prism, here's my take"), the market in numbers
  (grew fourfold in a year, $38B, 5 million holders), the problem (scattered, fake tokens), the answer in one image
  ("Amazon for tokenized stocks"), proof numbers (2,400 assets, 18 networks, 67 issuers), a walkthrough, a beginner
  tip, and a closing question as the CTA. About 175 words a minute, no filler.
- Look: product screenshots float in as tilted cards with soft shadows over the upper half while the presenter stays
  visible; a number pops out of the screenshot as its own card ("$38.68B", "5,078,791"); full-screen UI shots shown in
  3D perspective with a slow drift; a logo reveal with a glow early on; small sentence-case captions, two lines.

**"$100,000 campaign ends in 21 days" (0:36, wide, shallow depth-of-field presenter).**
- Script: number + deadline first ("In 21 days, the $100,000 campaign ends"), a "but", the benefits list, who it's
  for, and the link in the caption.
- Look: a giant thin number over the presenter; bright white "breather" screens with one or two words of kinetic text,
  then the list items one at a time in condensed capitals; a phone mockup sliding in; a bullet list beside the
  presenter; the current caption word in the accent colour; a small logo in the corner; 60 fps.

**What we take:** floating tilted screen cards (never cropped) between full-screen shots; number pop-out cards;
white breather cards for lists; a clean caption style (sentence case, current word blue) as an alternative to the
bold capitals; a logo or coin reveal on the title; a soft music bed throughout; and a tighter script (a hook with a
number, problem, answer, proof, how-to, CTA). Recording tip for the owner: a few bullet points written down first,
two to three minutes, face lit from the side with the background a little out of focus.

**How to use them in an EDL** (preview: `node video/edit-video.mjs <edl> --stills …`):
- `"caption_style": "clean"` at the top level: Manrope sentence case, the current word in blue.
- `"float": true` (tilts right) or `"float": "left"` on a clip: the full-width screen becomes a tilted card over a
  blurred copy of itself, sized so the captions sit below it. Vertical cut only (wide keeps the plain screen). It
  shrinks the screen, and the owner dislikes a "zoomed out" screen, so use it on one or two short summary lines,
  never where the viewer must read numbers or token names.
- `{ "id": "LIST", "insert": { "kind": "list", "kicker": "Today", "title": "The other side", "items": [ … ],
  "foot": "…", "step": 0.75 } }`: the white breather card, items slamming in one at a time (up to five short items).

## Rules

- Crypto content: "Not financial advice" stays on screen; no "guaranteed" or "sure" anywhere we add.
- The product segment only states what the product's own site says.
- The owner's face and voice are theirs; we never use them for anything they didn't send for this purpose.
