# EASY MODE: a concept film for @bagel_win (8 Nov 2026, v2: 25 s, 16:9 and 4:5, music only)

The owner asked for "a cool concept video on @bagel_win showing all the cool stuffs on the app and making it look cool".

**Concept:** Bagel's own tagline, "Predict on easy mode 🎮", played as a video game. The Bagel icon is the character.

1. **0–2 s, SELECT DIFFICULTY** (from the first frame): the character is the cursor and hops HARD → NORMAL → EASY.
   HARD and NORMAL get struck through, then LOADING.
2. **2.0 s, the drop:** a white flash, PREDICT ON, EASY MODE and 🎮. The first phone slides in by about 2.5 s.
3. **3–17 s, the level map:** the character hops across phones, one level per bar. Each phone is locked (grey, 🔒) until he lands.
   Then it flashes, pops, and its title slams in.
   - **1 Start in seconds:** rings on Sports and Continue with Google.
   - **2 Combo:** rings on Live, then 51% (1 HIT) and 89% (2 HITS), then COMBO! in its own space beside the phone. The camera pushes in.
   - **3 Never miss a market:** three real notification cards pop in, each with a 🔔. The test-user card is removed and the others move up.
   - **4 Squad chat:** the messages pop in, with ❤️ 🔥 😂 🚀.
   - **Final, SAME MARKETS. SAME LIQUIDITY.:** the owner's recorded market list (Starting Soon · Today), with rings on
     36% / 42% / 25%, the $6.2k volume, and 77%. "Built on Polymarket's markets and liquidity."
4. **17–19 s, ALL LEVELS CLEAR!:** the camera pulls back over the whole map, ✓ on every phone, confetti.
5. **19–25 s, end card:** EASY MODE: ON (the toggle flips), Predict on easy mode 🎮, Download Bagel · @bagel_win, Video by @Cmv_ng,
   and 18+ · All trading involves risk (large).

**Two formats, one page:**
- `page/easy.html` renders 1920×1080.
- `page/easy.html#45` renders 1080×1350 for the mobile feed. There, the phone is about half the frame width, so its text is roughly twice as large.

**House rules applied:**
- Royal-blue stage, with Bagel's yellow and its screens in their own colours.
- Blue accents, and no narrator.
- A 10 s soundtrack sample was sent to the owner first.

## v2 (the owner's notes, 8 Nov)
- The intro is cut from 8 s to 2.5 s, and the film opens on SELECT DIFFICULTY.
- "100% POLYMARKET" is now "SAME MARKETS. SAME LIQUIDITY.", and "perks" is dropped.
- The July Tokyo market is replaced by a real market list with no date.
- The test-user notification card is removed.
- The combo counter is off the market.
- The end card reads "Video by @Cmv_ng", and the risk line is larger.
- A 4:5 version is added.

## Build
1. Cut the phones out of Bagel's Play screenshots (1800×3200; crop 1368×2460 at 216,740) with a rounded alpha mask (`mask.py`).
2. `veil.py`: a clean, softened wallpaper patch behind the notification cards, so they can pop in and one slot can stay empty.
3. `market.png`: the owner's recording, frame 492.3 s, crop 470×825 at 62,0 (above the face sticker).
4. `python3 -I mix.py <190.mp3> <sfx dir> <work>`: the music from 14.742 s with 35 game effects, −14 LUFS, true peak −1.5 dBFS (limited at 4× oversampling).
5. `bash video/templates/art-series/unveil/render_par.sh page/easy.html plan.json out.mp4 3 16`.
   - For 4:5, prefix `VIEW_W=1080 VIEW_H=1350 HASH='#45'`.
   - `plan.json` is `{fps: 30, total: 25, audio: {src: mix.wav, in: 0, fade: [24.9, 0.1]}}`.
6. `node video/templates/tactics-chess/cover.mjs page <out> bagel_easy_mode`: the cover (1080×1920) and thumbnail (1280×720).

`page/img/` stays in the work dir and is not committed. It holds Bagel's screenshots and logos, the owner's market frame, and the pixel font
(Press Start 2P, SIL OFL, from @fontsource).
