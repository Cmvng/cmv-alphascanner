# Bagel: make the call while the game is on (3 Nov 2026, 1:39, 16:9)

The owner's script about @bagel_win came with four pictures of their own: step 1 Live, step 2 the price, step 3 Sell
and step 4 Limit. The brief was "use some of my reaction videos with this… take your time and do this well". The voice
is Lara (ElevenLabs, the voice the owner picked on 27 Oct); one take cost 1,465 credits.

**Concept:** your own pictures build themselves on the words. Each picture is cut into its pieces over a clean copy of
its background. The headline, subtext, chips and phone enter as Lara says them, and at rest every frame is the owner's
picture exactly. The pictures I made (the hook, "if you're new", the Chelsea example, the close) use the same look.

| Scene | Take s | What's on screen |
|---|---|---|
| 1 Hook | 0–12.4 | Scoreboard "LIVE · 63'" flips 0–0 → 1–0 on "scores". Side-Eye's calm look, then It's Over on "ahh". Then the Bagel icon and a Live pill |
| 2 If you're new | 12.4–16.9 | A 0.6 s pause, then the music's hit lands on Bagel's logo. Bagel's own app image from bagel.win |
| 3 Step 1 | 16.9–25.7 | The owner's Live picture. Rings on NBA, Premier League and La Liga, then the match card, on the words |
| 4 Step 2 | 25.7–41.7 | The owner's price picture. A ring on 48% |
| 5 My example | 41.7–66.7 | A price chart that branches both ways. Jaw Drop on "about $14", Yikes on "about $4"; then $20 or $0 at full time |
| 6 Step 3 | 66.7–74.8 | The owner's Sell picture. A ring on the position's value |
| 7 Step 4 | 74.8–82.5 | The owner's Limit picture. A ring on 39% |
| 8 Heads up | 82.5–95.4 | The chart returns, stamped "just my example". The endpoints pulse on "cuts both ways", then the profile card |

## Build (in order)

1. `bash mix.sh <work> <take.mp3> <586.mp3>`: the voice with the pause, the bed and the mix (−14.5 LUFS, true peak
   −1.4 dB, drop about +12 dB).
2. `python3 -P -E words.py <work>/take16.wav <work>/words.json large-v3`: word times. Every time in `data.py` comes
   from these.
3. `python3 -I layers.py pics page/img`: the clean background of each picture (a cubic surface per channel).
4. `python3 -I cut_pieces.py pics page/img`: the pieces with alpha. It checks that each picture rebuilds (max 2–3
   levels off).
5. `python3 -I data.py page`: `page/bagel_data.js` and `<work>/plan.json`.
6. `node render16.mjs $PWD/page/bagel.html 99.4 <work>/mix.wav out.mp4`. Use `--stills t,…` for single frames.
7. `node cover.mjs $PWD/page/cover.html <out>`: the cover (1080×1920) and the thumbnail (1280×720).
8. Checks:
   - `python3 -I sheets16.py out.mp4 rev 2 full`, plus 10 fps sheets across each reaction;
   - `python3 -P -E hearback.py <work>/plan.json <work>/mix16.wav` (0 of 42 captions flagged).

The page reads the reaction frames from `video/out/vreact/` (frame-aligned `cut` webps) and the die-cut stickers from
`video/out/reactions/` with its `lib.js`. Both are gitignored, so build them first with the reactions engine.

## Timing

- Times are take seconds. The page maps them to video seconds with `T(s) = s + 0.2 + (s ≥ 12.43 ? 0.6 : 0)`, which
  accounts for the pause.
- **Phones and cards dissolve** into the next scene: the next one starts about 0.25 s before the old one has gone,
  and the chart sits above the phone (z-index 3).
- **Text never overlaps:** the old line leaves in 0.2 s, right as the next starts.

## Lessons

- **Two pieces fading at the same moment leave a near-empty frame.** A 2 fps sheet can miss it; render exact stills
  at each scene change.
- **Pulse the dots, not the group.** Scaling the endpoint group pushed "$20" into the "my example" pill.
- **A popping stamp overshoots.** Leave room for its biggest size, not its rest size.
