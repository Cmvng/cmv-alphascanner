# The 3D tactical board (house template, 9 Nov 2026)

The owner, 9 Nov, on the earlier flat chessboard: *"It was not quality… the chessboard was not like rendered the quality
3D. It was just flat. It was not really clean."* Then: *"Please make sure that the analysis board is clean, is well
rendered, is quality. I don't want any poor job."*

This is the answer: a real three.js scene rendered in headless Chromium. It has lacquered chess pieces (clear-coat,
studio reflections), a pitch mowed in squares with real line geometry, soft shadows, goals with nets that ripple, and a
camera that moves and cuts like a broadcast. The first video made with it is `chelsea-sunderland-2026-11-08/`.

## Files
- `page/board3d.js` is the engine, exposed as `window.B3`:
  - **Setup:** `setup(canvas, {pr, w, h, fov, shadow})` builds the renderer, the lights and the house sky background.
  - **The world:** `makeBoard`, `makePiece(team, role)` and `makeBall`.
  - **Drawing on the pitch:** `makeArrow` / `updateArrow` (passes are tube arcs, runs are dashed ribbons, both grow over time) and `makeZone` / `updateZone`.
  - **Motion:** `keyAt` (piece motion), `ballAt` (ball flight with a peak), `camAt` (a Catmull-Rom camera) and `rippleNet`.
  - **Roles:** GK is a king; CB, LB, RB, LWB and RWB are rooks; DM, CM and AM are knights; LM, RM, LW and RW are bishops; ST and CF are queens.
- `page/board.html` is the video page. It reads `plan.js` (`window.PLAN`, in take seconds) and maps take time to video time with `T()`, which includes the cold-open pause. Each frame it:
  1. moves the camera (first, so tags project with this frame's camera);
  2. updates the pieces, the ball, the arrows, the zones and the nets;
  3. renders the 3D;
  4. draws the panels, then the name tags, the reactions and the captions.
- `page/panels.js` is the HTML layer, driven by `PLAN.ui`. Its types are `giant`, `title`, `bug`, `chip`, `stat`, `coach`, `bars`, `quote`, `table`, `cta`, `note` and `flash`.
- `<video>/gen.py` is the choreography. It turns the script's word times into `plan.js` and `words.js`, using helpers like `piece`, `mv`, `shape`, `lab`, `hi`, `ball`, `arrow`, `zone`, `ui`, `cam` and `cut`.
- `<video>/mix.sh`, `srt.py`, `cover/cover.html` (the cover and thumbnail are rendered from the same 3D scene) and `sources.md`.

## Making a video
```bash
python3 -I gen.py <words_script.json> <page dir>        # writes plan.js + words.js; warns if a cue crosses a sentence end
node video/templates/art-series/unveil/render.mjs <page>/board.html <plan.json> --stills 12,21,27,... <stills dir>
bash video/templates/art-series/unveil/render_par.sh <page>/board.html <plan.json> <out.mp4> 4 16
python3 -I srt.py <words_script.json> <out.srt>
node cover/shot.mjs $PWD/cover/cover.html v cover.png    # and "t" for the thumbnail; "#t;cx,cy,cz;tx,ty,tz;fov" to tune the camera
```
- **Speed:** at `pr: 1.25` and 2048 shadows, a frame takes about 3 s per worker. A 2:06 video takes about 55 minutes on 4 workers.
- **Check stills first:** check every scene from stills (a 3×3 sheet per 9 stills), fix, then do the full render.

## Lessons from the first video (all caught on stills, before the full render)
1. **Move the camera before the name tags.** Otherwise the tags project with the last frame's camera and drift off their pieces.
2. **Use `cut()` when the camera switches sides.** A spline between two far-apart cameras swings through the board. `cut()` holds the old shot to the frame before, then jumps.
3. **Cues can match across sentences.** `E('over Chelsea.')` matched "went over. Chelsea had the ball". `at()` now warns when a cue spans a sentence end the cue itself doesn't have; use a longer phrase.
4. **Close, low cameras push tags off the top.** Frame a little higher (target y about 2.5–3) or pull back. Tags also fade near the top edge and under the score bug, and push apart when two meet.
5. **A penalty from straight behind hides the keeper.** Go over the taker's shoulder (camera offset about 11 to the side, about 13 up) and move everyone else outside the box and out of the shot.
6. **Big words need open grass.** "1-0" over the goal net was unreadable. Cut to a wide, high side view with the action to one side.
7. **Hold the camera on the subject until the line moves on.** The 77' mix-up was out of shot because the camera started its move to Isidor's run too early.
8. **Captions end at a closing quote too** (`perfect."`), or the next sentence joins the line.
9. **Show only one team's tags while each line-up is named.** All 22 at once cluttered the corners under the coach cards.

## Look
- The background is the house sky gradient, light at the top and deep blue at the bottom.
- Teams keep their own colours: piece `c1` is the club colour and `c2` the band. Tags use the team colour.
- Passes are sky blue or white arcs. Runs are red dashes for the attacking side. Zones are red where the ball is lost.
- There is no depth-of-field: the post pass in `board3d.js` (`postSetup` / `renderFrame`) turned the background grey through tone mapping, so it stays off.
