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
- **Speed:** at `pr: 1.25` with 2048 shadows, one worker alone takes about 3 s a frame. Four workers sharing 4 CPUs take about 10 s a frame each, so the real throughput is about 2.5 s a frame, and a 2:06 video takes about 2.6 hours.
  - That is longer than a background command may run (2 hours). Run the frames as small resumable chunks, detached: see `chelsea-sunderland-2026-11-08/` for the job list.
  - To keep a stopped chunk, stop the browser (node) and leave the encoder: it gets end-of-input and writes a playable file. Count its frames with `ffprobe -count_frames` and render the rest from there.
  - Never stop `render_par.sh` while it waits on its chunks: if they end, it joins them and deletes its work folder.
- **Check stills first:** check every scene from stills (a 3×3 sheet per 9 stills), fix, then do the full render.

## Lessons from the first video (all caught on stills, before the full render)
1. **Move the camera before the name tags.** Otherwise the tags project with the last frame's camera and drift off their pieces.
2. **Use `cut()` when the camera switches sides.** A spline between two far-apart cameras swings through the board. `cut()` holds the old shot to the frame before, then jumps.
3. **Cues can match across sentences.** `E('over Chelsea.')` matched "went over. Chelsea had the ball". `at()` now warns when a cue spans a sentence end the cue itself doesn't have; use a longer phrase.
4. **Close, low cameras push tags off the top.** Frame a little higher (target y about 2.5–3) or pull back. Tags also fade near the top edge and under the score bug, and push apart when two meet.
5. **A penalty from straight behind hides the keeper.** Go over the taker's shoulder (camera offset about 11 to the side, about 13 up) and move everyone else outside the box and out of the shot.
6. **Big words need open grass.** "1-0" over the goal net was unreadable. Cut to a wide, high side view with the action to one side.
7. **Hold the camera on the subject until the line moves on.** The 77' mix-up was out of shot because the camera started its move to Isidor's run too early.
8. **Captions are phrases, not word counts.**
   - A hard 7-word cap split "in a / row over Chelsea", "one / on one" and "Estêvão / quiet."; the hear-back exposed it.
   - `gen.py` now keeps a sentence whole when it fits on one line (about 50 characters).
   - Otherwise it splits at the best point: commas and pauses first, balanced halves, never after a small word, never inside a name or an "X and Y" pair.
   - A closing quote (`perfect."`) ends a sentence.
   - `srt.py` reads the same lines from `plan.js`, so the subtitles match the screen.
9. **Show only one team's tags while each line-up is named.** All 22 at once cluttered the corners under the coach cards.

## Look
- The background is the house sky gradient, light at the top and deep blue at the bottom.
- Teams keep their own colours: piece `c1` is the club colour and `c2` the band. Tags use the team colour.
- Passes are sky blue or white arcs. Runs are red dashes for the attacking side. Zones are red where the ball is lost.
- There is no depth-of-field: the post pass in `board3d.js` (`postSetup` / `renderFrame`) turned the background grey through tone mapping, so it stays off.

## The stage: the same engine for explainers (9 Nov 2026, first used for Primus "The Bouncer")

A round checkered stage, a wall with a door that opens, a sign that flips, a box that fills with files, and flat props
drawn on canvas. The cast are the same lacquer pieces. `explainer/primus-bouncer-2026-11-09/` is the worked example.

- `page/stage3d.js` (`B3.stage`): `makeStage`, `makeDoor` (`userData.open(q)`), `makeSign` (`userData.flip(q)`),
  `makeCard` (a prop drawn by `draw(ctx, w, h, state)`; `setState`, `setOpacity`), `makeBox`, `cardAt`, `keys`.
- `page/stage.html`: the page. Plan keys: `stage`, `door`, `sign` (`flip` in take seconds or `flipv` in video
  seconds), `box` (`pile` = when each file lands), `pieces` (they hop as they move; `names` renames a tag at a time),
  `cards` (`keys` [[t, x, y, z, rx, ry, rz, scale]], `states`, `op`, `bill` = turn to face the camera), `pins` (a chip
  fixed to a point, `piece:id` or `card:id`), `cam`, `hits`, `wash`, `ui`, `caps`, `flow`/`flow2` (reactions).
  The props of one video live in its own `draw.js` (`window.DRAW[kind]`).
  `stage.html#nocap` hides captions, footnote and stickers, for clean cover stills.
- `page/panels.js` additions: `screen` (a real page in a browser frame: `view` keys and `rings` in image fractions;
  give the frame the capture's own shape so the page shows whole), `giant` takes `x` (left-aligned over open sky),
  `chip` takes `cls: 'light'`, `note` takes `dark`.
- `cues.py`: `Cues(words).S/E(phrase, nth)` and `captions(...)`, shared by every plan written against a narrator take.
- `render_chunks.sh`: a long render as resumable chunks, started detached; `join` adds the mix.
- `page/cover_still.html`: thumbnail and vertical cover from clean stills (`cover.js` beside it).

### Lessons from the first stage video (all caught on stills)
1. **A cue phrase said twice takes the first one.** "One:" matched "for one yes or no", and "You use it" matched
   "before you use it". `Cues` now warns when a phrase with no `nth` is said more than once; use longer phrases.
2. **The sign's back face must hang upside down facing the wall** (`rotation.set(0, -π/2, π, 'ZYX')`), so the turn
   brings it upright to the front. With the first version the sign went blank after the flip.
3. **Big type over the wall is unreadable.** Navy words on a navy wall, twice. Put titles over open sky (`giant.x`),
   or over the wash.
4. **A prop the line is about should fill a quarter of the frame.** The ID card, the three pages and the request
   card were all too small on the first pass; cameras moved in and props scaled up.
5. **Clear the stage for a new idea.** The queue stood in front of the Primus scene; the pawns now walk to the back
   and return for the next section.
6. **Time inside the pause has no take time.** The 0.6 s pause after the cold open is added in video time, so a move
   that must happen during it (the sign's flip, a cut) needs video-time keys (`flipv`) or a take time just before
   the cut. A caption that ends by the pause must be clamped to it, or it hangs through.
7. **Put the hit where the beat is.** The flash, the cut and the sign flip land on the music's entry at the start of
   the pause; the line starts a second later.
8. **A real page gets a frame of its own shape.** A 16:9 capture in a wider panel was cropped at zoom 1.
9. **A reaction clip peaks when it peaks.** The chin-rub reaches its peak about 1.6 s in; keyed on the line it reacts
   to, it peaked after the next cut. Key such a clip a line early and check stills a second after the line.
10. **Speed:** a still is about 2 s. Three workers alone manage about 1.6 s a frame between them; with other renders
    running the 2,361 frames took 85 minutes.
