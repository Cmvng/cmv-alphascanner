# THE CHESSBOARD: football tactical breakdowns on a chessboard (8 Nov 2026)

The owner asked for "a tactical breakdown… using chessboard pieces" (8 Nov 2026).

`page/chess.html` is the engine. Everything timed lives in `plan.js` (`window.PLAN`), in take seconds.

## The board
- The pitch (105 × 68 m, 12 px per metre) is a tilted light chessboard: ivory and light-blue squares, with navy pitch lines, on the deep-blue stage.
- **Players are chess pieces in their team's colours** (`teams.{A,B}.color` / `ink`):

  | Position | Piece |
  |---|---|
  | Keeper | king |
  | Defenders | rooks |
  | Midfielders | knights |
  | Wide players | bishops |
  | Striker | queen |
  | Pawns | spare |

## PLAN fields
- `pieces: [{team, role: K|Q|R|B|N|P, label, keys: [[t, x, y, dur?], ...], hi: [[t0, t1]], on: [t0, t1], lab: [[t0, t1]]}]`.
  - Pieces glide to each key.
  - `on` fades a piece set in and out, so a scene can bring its own pieces.
  - `lab` sets when the name shows; the default is `PLAN.names`. Show only the names the scene is about.
- `teams` can hold more than A and B. For example, C is a neutral dark opponent for a general pattern that isn't one match, so you never imply a match that didn't happen.
- `ball: [[t, x, y], ...]`.
- `arrows: [{t0, t1, from: [x, y], to: [x, y], kind: pass|run|press|shot|gap, bend}]`. Passes draw on, runs are dashed, pressing is red.
- `marks: [{t0, t1, kind: zone|dot|ring, ...}]`. A dot is an open square, like a legal move; a zone is a danger area.
- `flags: [{t, text: 'CHECK' | 'CHECKMATE', dur}]`.
- `cam: [[t, cx, cy, zoom, tilt, spin, dur]]`.
- `panels: [{t0, t1, html, style, bars}]`. Flat cards over the board: title, scoreline, stat bars, form.
- `caps`, `flow`, `flow2` (the owner's reactions, at most 3 per video).

## Colours
- Passes are navy, runs and shots blue, and pressing red. There is no yellow.
- Team colours are the clubs' own.

## Workflow (8 Nov 2026: Real Madrid and Man City)
1. **Research:** dated sources only. Line-ups belong to a specific match. If a scene shows a different match (the Clásico XI had Lunin in goal), hide the names. If no source names a player, the piece gets no label.
2. **Script, then Lara:** one take. Write spoken scores in words ("three-one"); the captions turn them back into digits.
3. **Word times:** `python3 -P -E video/lib/script_words.py <take.wav> <script.txt> <dir>`. It runs faster-whisper and the CTC snap, then maps the script's words onto the take, matching letters inside replaced blocks ("Two-nil" ~ "2-0"). It prints the hear-back.
4. **Plan:** `python3 -I <video>/gen.py <dir>/words_script.json <page dir>`. It builds on `chesslib.py`:
   - `Take.S`/`E` phrase lookups;
   - captions;
   - `piece()`;
   - `write()`, which also makes each card fade out fully before the next fades in, and ends a flag before a card that comes after it. Small corner chips (`chip: 1`) are ignored.
5. **Mix:** `TOT=… CUT=… DROPT=… bash mix.sh <dir> <take.wav> <track.mp3>`. The pause is cut in after the cold open, and the track's drop lands on it.
6. **Check:** render stills (`render16.mjs --stills`) and look at every scene. Then render in full (`art-series/unveil/render_par.sh`) and make 1 fps frame sheets.
7. **Deliver:**
   - `srt.py` for the subtitles;
   - `page/cover.html` with `cover.js` and `cover.mjs` for the cover (1080×1920) and thumbnail (1280×720), using a clean board frame (captions, stickers, flags and panels hidden);
   - the post kit and `sources.md`.

## Look
- Captions sit on a navy pill, so they read over the light board.
- The board fades out for the end card. The end card mirrors the cold open: royal blue, the big line, and the result chips.
