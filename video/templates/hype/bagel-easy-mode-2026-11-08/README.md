# EASY MODE: a concept film for @bagel_win (8 Nov 2026, 30 s, 16:9, music only)

The owner asked for "a cool concept video on @bagel_win showing all the cool stuffs on the app and making it look cool".

**Concept:** Bagel's own tagline, "Predict on easy mode 🎮", played as a video game. The Bagel icon is the character.

1. **0–3 s, title screen:** the character drops in onto the Bagel logo, and PRESS START blinks on the beat.
2. **3–6 s, SELECT DIFFICULTY:** the character is the cursor and hops HARD → NORMAL → EASY. HARD and NORMAL get struck through, then LOADING.
3. **6 s, the drop:** a white flash, PREDICT ON, EASY MODE and 🎮.
4. **8–22 s, the level map:** Bagel's five store screens are phones the character hops across, one level per bar. Each phone is locked (grey, 🔒) until he lands. Then it flashes, pops, and its level title slams in on the left.
   - **1 Start in seconds:** rings on Sports, then Continue with Google.
   - **2 Combo:** rings on Live, then 51% (1 HIT) and 89% (2 HITS), then COMBO!, and the camera pushes in.
   - **3 Never miss a market:** the notification cards pop in one per beat, each with a 🔔.
   - **4 Squad chat:** the messages pop in one per beat, with ❤️ 🔥 😂 🚀.
   - **Final, 100% Polymarket:** the price chart draws left to right as 0% → 100% counts up, then rings on 46% and 27%.
5. **22–24 s, ALL LEVELS CLEAR!:** the camera pulls back over the whole map, ✓ on every phone, confetti.
6. **24–30 s, end card:** EASY MODE: ON (the toggle flips), Predict on easy mode 🎮, Download Bagel · @bagel_win, @i_am_vickyd, and 18+ · All trading involves risk.

**House rules applied:**
- Royal-blue stage, with Bagel's yellow and its screens in their own colours.
- Blue accents, and no narrator.
- A 10 s soundtrack sample was sent to the owner first.

## Build
1. Cut the phones out of Bagel's Play screenshots (1800×3200; crop 1368×2460 at 216,740), with a rounded alpha mask (`mask.py`).
   Then run `veil.py` to build `notif_veil.png`, a clean wallpaper patch behind the notification cards, so they can pop in.
2. `python3 -I mix.py <190.mp3> <sfx dir> <work>`: the music, 36 game effects, −14 LUFS, true peak −1.5 dBFS (limited at 4× oversampling).
3. `bash video/templates/art-series/unveil/render_par.sh page/easy.html plan.json out.mp4 3 16`. `plan.json` is `{fps: 30, total: 30, audio: {src: mix.wav, in: 0, fade: [29.9, 0.1]}}`.
4. `node video/templates/tactics-chess/cover.mjs page <out> bagel_easy_mode`: the cover (1080×1920) and thumbnail (1280×720) from `page/cover.html`.

`page/img/` (Bagel's screenshots and logos, the pixel font) stays in the work dir and is not committed. The pixel font is Press Start 2P (SIL OFL), from @fontsource.
