# Agentics Credit, "I tried it" (4 Nov 2026, 1:48, 16:9)

The owner's eight-scene, first-person script about @agenticscredit came with six pictures:
- four of Agentics Credit's own images: "We underwrite the record", "Trade our capital", "The ACS scale: 300 to 850" and "The market does";
- two app screenshots: the dashboard and the positions.

The voice is Lara (ElevenLabs eleven_v4, voice_id vChnJZ1Cu89g2XXumPfT): one take of 105.7 s, 1,726 credits, with the owner's approval first.

**Format (new):** a blue stage.
- **Their images** float as cards.
- **The owner's screens** are shown whole in a viewport, and a camera moves to each number as it is said, with a ring.
- **The $100 example** is a worked card: ticket, shares, then win $200 (green) or lose $0 (red), stamped "Just an example".
- **The ACS scale** stands beside their 300–850 image: a long red "losses" pull, a short green "wins" push, and a "580 and above · waitlist" box.
- **Checklists** tick on the words for "if you're new" and the heads-up.

## Build

1. `bash mix.sh <work> <take.mp3> <720.mp3>`:
   - a 0.6 s pause before "If you're new" at take 10.0 s;
   - "New Bass 01" (Mixkit 720) from 12.706 s, so the bass drops at video 10.2 s;
   - the loop bars [22.906, 83.81] repeated to cover the take;
   - ducked under the voice, then one gain plus the limiter: −14.5 LUFS, peak −1.4 dB.
2. **Word times:** `python3 -P -E ../bagel-live-2026-11-03/words.py <work>/take16.wav <work>/words.json large-v3`. Two doubts were settled on short snippets:
   - the name, heard as "Agentix Credit";
   - "it closes everything"; the long run had heard "every time".
3. **Page:** `page/agx.html`.
   - It needs `page/img/`: collateral.jpg, nodeposit.jpg, acs.jpg, market.jpg, dash.jpg, pos.jpg, and logo.png (the bars cropped from acs.jpg).
   - These are not in git, because one of them is the owner's account.
   - Times in `SC` and `CAP` are take seconds: `T(s) = s + 0.2 + (s ≥ 10 ? 0.6 : 0)`.
4. **Render:** `bash ../../art-series/unveil/render_par.sh $PWD/page/agx.html <work>/plan.json out.mp4 3 16`, with plan.json = `{fps: 30, total: 107.6, audio: {src: mix.wav, in: 0, fade: [107.55, 0.05]}}`. Three chunks take about 10 minutes.
5. **Cover:** `node cover.mjs $PWD/page/cover.html <out>` makes the cover (1080 × 1920) and the thumbnail (1280 × 720).
6. **Checks:**
   - 2 fps sheets of the whole video, plus 10 fps across the scene changes;
   - `python3 -P -E hearback.py <work>/hb_plan.json <work>/mix16.wav`: 0 of 39 captions flagged.

## Notes

- **Ring positions are in screenshot pixels**, read from a 25 px grid drawn over each screenshot.
- **Layout faults the stills caught** (fixed):
  - the name chip sat on the caption;
  - the "580+" label overflowed its box;
  - the "losses" and "wins" labels collided;
  - the cover's headline wrapped off the bottom.
- **Fact-check:** everything matches their docs and dated posts, except the risk numbers. The owner's dashboard says 12% halves and 20% closes, while their docs list 5%, 7.5% and 12% (likely the agent limits). The video keeps the owner's line, because it is what their screen shows, and the post kit says so.

## Second version: the owner's video reactions (same day)

The owner: "You could have put my reaction videos into this video… Or reaction sticker anyone".

- **Five video reactions,** not stickers, as the owner asked on 29 Oct. They come from `video/out/vreact/<id>/full`
  and play at real speed, with the room.
- **Each one lands on its line:**
  - Side-Eye on "just because you say you're a good trader";
  - Jaw Drop on "$200", then Yikes on "$0";
  - It's Over on "closes everything";
  - the Grin on the end card.
- **The layout:**
  - the edit (`#edit`) eases to 0.72 and slides into the left 1382 × 778;
  - the clip fills a 538 × 930 panel on the right, above the captions, cropped to 1,400 px of the frame round the face;
  - nothing being explained is covered, and the captions stay clear.
- **That's 2.8 a minute,** per the reaction rules (two or three a minute, one meaning per face).
