# The unveil: the Gamdom castle, by hand (#Gamdom100kRound2, 4 Nov 2026)

**The owner's concept (4 Nov):**
- The finished drawing waits, veiled, in the centre.
- The progress shots and time-lapses play cinematically in panels at the sides, with short lines, to one big track.
- Everything then focuses on the centre for the unveiling.

**What we add:**
- The video wall cut on the beat.
- At the drop, the side clips break into a **photomosaic of the piece made from the owner's own progress frames**.
- The mosaic melts into the real photo, which grows to fill the frame.
- The title, a beat-cut montage, the scale shot and the end card.

There's no AI anywhere: no generated imagery and no AI voice. The judges give extra points for that.

## Runbook (tonight)
1. **Intake.** Save each file the owner sends in its own new folder. Probe it (orientation, HDR, length) and make a contact sheet.
2. **Config** (`config.json`, the shape is in the dry run):
   - `clips`: id → {path, dur};
   - `art`: the final photo, copied into `<page>/img/`, plus `art_wh`;
   - `hook`: the strongest real-time shot, such as hands on charcoal;
   - `build_clips`: in session order, each with its label;
   - `lines`, `title`, `open_words`;
   - `hero`: art crops as `[cx, cy, width]` fractions, clips, one `rush` with "From a blank page", then "to this.";
   - `end_clip`: the artist beside the piece, or the physical unveiling;
   - `track` and `track_in`: put the drop about 15–20 s into the video.
3. **Beats:** `python3 -I ../hype/beats.py <track> beats.json`
4. **Plan:** `python3 -I plan.py config.json beats.json plan.json` prints the timeline.
5. **Frames:**
   - `python3 -I extract.py plan.json config.json <page>`: frames per segment. HDR is tone-mapped, and the colour is checked to about 0.5 level.
   - `python3 -I mosaic.py config.json <page>` builds the mosaic.
6. **Stills:** `node render.mjs <page>/unveil.html plan.json --stills 0.6,3,6,…,drop±0.5,… <dir>`. Look at every scene change.
7. **Render:** `bash render_par.sh <page>/unveil.html plan.json out.mp4 3` takes about 3.6 min for 44 s. It matches the single render frame for frame.
8. **Check:**
   - `python3 -I ../hype/sheets16.py out.mp4 rv 2 full`, plus 10 fps across the drop;
   - loudness;
   - a SEND copy if the file is over 30 MiB.

## Layout (1920 × 1080)
- **Centre box:** 460, 210, 1000 × 660. The art is shown `cover` inside it, veiled with blur 34 → 14 px and brightness 0.12 → 0.30 through the build.
- **Panels:** 394 × 700 at x 30 and x 1496, y 190.
- **Session label:** centred under the box, Manrope 600 26 px.
- **Mosaic:** 25 × 16 tiles drawn at 2×. Each tile is the progress frame whose 3 × 3 brightness best matches its cell, with a reuse penalty. The tiles fly in from the panels over `fly`, a negative frame lands on the drop, and the tiles melt into the photo from the centre outwards over `wave`. The photo then grows to the whole sheet over `grow`.
- **Type:**
  - Anton one-word caps for the open;
  - Instrument Serif lines over the veil and in the hero;
  - the chrome title with RGB tears on the beats;
  - the end card: #GAMDOM100K**ROUND2** in Gamdom green, the handle, and "18+ | GAMBLE RESPONSIBLY".

## From the research (4 Nov, sources in the session notes)
- **Reveal last,** hold the final image, and show the piece's size with the artist beside it.
- **Prove it's handmade:** real-time hands, the time-lapse, the true 62 × 94 cm size. Judges rewarded visible effort and no-AI work.
- **Stand apart from the other charcoal entry** that used the same tagline: the scale, the castle logo, and a physical unveiling with a person in shot.
- **Music:** X has no licence from music publishers, so a commercial track can get the post withheld. The fallback is Mixkit 543 "A New Life" (free licence, drop at 24.64 s).
