# SLEEP ON IT: a music film for Bagel 1.6 (9 Nov 2026, 30.5 s, 16:9 and 9:16, music only)

The owner asked for "a fresh, clean, new inspiration idea for Bagel".

**Concept:** Bagel 1.6 added Auto Claim, and its Help Center says the run starts once a day at 8:30 AM UTC+8. That is
**1:30 AM in Lagos**. So: it is 1:29 AM, you are asleep, your combo won tonight. The clock turns 1:30, a bagel comes up
as the sun, and the phone says the profit was claimed. "It claimed itself." The end line is "Sleep on it."

Earlier Bagel films here: the combo how-to (29 Oct), "Make the call while the game is on" (3 Nov), THE CHAIN (7 Nov),
EASY MODE (8 Nov, a video game). This one is a night-to-sunrise scene with one object, one phone and big type.

## Timeline (110 bpm, bar = 2.18 s; the drop is 3 bars in, at 6.55 s)
| Bars | Seconds | What happens |
|---|---|---|
| −3 | 0–2.2 | Deep navy sky, a moon, a phone asleep on the stage. "1:29 AM", then "Lagos. You are asleep." |
| −2 | 2.2–4.4 | A card lights on the lock screen. "Your combo won tonight." |
| −1 | 4.4–6.5 | The big clock counts 1:29:57, :58, :59 on the beats (a tick each), then "1:30 AM" |
| 0–2 | 6.5–13.1 | **The drop.** Flash, the bagel rises as the sun, the sky turns light blue, the phone jumps and shows "Claimed". "It claimed itself." Then "Auto Claim · new in Bagel 1.6", "Once a day, from 1:30 AM Lagos time", "8:30 AM UTC+8 · it is not instant" |
| 3 | 13.1–15.3 | The phone turns once. "Also new in 1.6: Batch claim. Winning combos, claimed together." |
| 4 | 15.3–17.5 | "MFA on withdrawals. A second check before money leaves." |
| 5 | 17.5–19.6 | "Support, in the app. A Contact Support entry." |
| 6–7 | 19.6–24.0 | The real changelog page, whole, then closer, with the four lines ringed one by one |
| 8–10 | 24.0–30.5 | End card: "Sleep on it.", Bagel's logo, "1.6 is out", Bagel's own face pops into the hole of the sun, the 18+ line, "Video by @Cmv_ng" |

## Files
- `page/sleep.html`: the whole film. `window.render(t)` draws one frame; the timing constants (BPM, DROP, `bar(k, beats)`)
  are at the top. It needs `board3d.js`, `stage3d.js` and `panels.js` from `tactics-3d/page/` beside it, plus
  `shots/changelog.png` (the page as captured) and `img/` (Bagel's logos from its media kit).
- `mix.sh`: the soundtrack on the bar grid, plus three made sounds that belong to things on screen
  (`art-series/alive/sfx.py`): the clock's ticks, a chime on "Claimed", a chime when the face pops in. No swells or
  whooshes. Also writes the track without music.
- `sources.md`, `post-kit.md`, `cover/cover.js`.

## Render
```bash
PG=<work dir>/page; mkdir -p $PG && cp -r page/* $PG/ && cp ../../tactics-3d/page/{board3d.js,stage3d.js,panels.js} $PG/
bash mix.sh <work dir>/mix <Mi Gente mp3>
echo '{"total": 30.545, "fps": 30, "audio": {"src": "<work dir>/mix/mix.wav", "in": 0, "fade": [29.545, 1]}}' > plan.json
node ../../art-series/unveil/render.mjs $PG/sleep.html plan.json out.mp4 15       # about 2 s a frame on 4 CPUs
HASH='#v' VIEW_W=1080 VIEW_H=1920 node ../../art-series/unveil/render.mjs $PG/sleep.html plan.json out_9x16.mp4 15   # upright
```

**Two shapes, one page.** `sleep.html#v` is the upright cut: its own camera keys and type positions, the phone moved
under the text, and the room around the changelog used for a headline and the four features.

## What made it work
- **One fact carries the film.** The 1:30 AM run time is real and local, so the story needs no invented numbers.
- **The sky is the house blue; yellow belongs to Bagel.** Night is deep navy (never black), day is the light sky.
  The sun, the phone screen and the stage rim are Bagel's yellow.
- **The sun is placed by screen position** (`skyAt`: a point on screen, a fixed distance along that ray), so it sits
  between the text and the phone in every shot and never under the type.
- **Symbols on the phone, the real page as proof.** There is no way to capture the new in-app screens, so the phone
  shows plain symbols (a tick, a lock, a speech bubble), the footnote says "Illustration", and the changelog is the real page.
- **It says the catch.** "It is not instant" is on screen with the run time.

## Lessons
- Night to day in one scene: animate the renderer's exposure (0.2 to 1) and repaint the background gradient; the
  background is not tone-mapped, so the two move separately. Keep screens and sky objects on unlit materials.
- A daytime floor under a strong spot light burns to white and loses the contact shadow: the spot is at half power by day.
- Type that pops in over a 3D object needs its own space. Measure the longest line first, then place the object.
