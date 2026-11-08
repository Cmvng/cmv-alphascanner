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
- `pieces: [{team, role: K|Q|R|B|N|P, label, keys: [[t, x, y, dur?], ...], hi: [[t0, t1]], on: [t0, t1]}]`. Pieces glide to each key.
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
