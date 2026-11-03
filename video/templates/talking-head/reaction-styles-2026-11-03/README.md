# The owner's weekend styles, on their reaction clips only (3 Nov 2026, a sample reel, 0:37)

The owner found two styles over the weekend and asked to see them on their own reaction videos only:
- Ola Ξlixir's icon-per-word talking head;
- @sollunix's sourced data breakdown.

The study is in `../../IDEAS.md` (3 Nov). There is no voice; the reaction clips are silent. The edit is cut on the bar
lines of "The Farewell" (Mixkit 546, 129.2 bpm). The drop lands on the cut into the Jaw Drop. The story is Primus Labs ×
Cournot, and every fact comes from the 29 Oct work (`../camera-cournot-2026-10-29/sources.md`).

| # | Style | Reaction | What it shows |
|---|---|---|---|
| 1 | Brand open | Wait, What? | Cournot navy and Primus orange split behind the cut-out, both real logos huge, a date chip |
| 2 | Icons over the head | Jaw Drop | A tile pops over the head on each key word: Cournot's mark, prediction markets, Primus's mark |
| 3 | Flashback | The Sob | Black and white, a split-flap "BEFORE ZKTLS", "taken at face value" struck through |
| 4 | Data card | The Grin | "TODAY", then Cournot's own figures building line by line, with the source on the card |
| 5 | Rewind | Side-Eye | The clip plays back at 3× with a VHS glitch, then the docs' word: INADMISSIBLE |
| 6 | Split bar | Yikes | Six proofs; one fails, and the whole bundle goes red (the docs' rule) |
| 7 | Orbit + Follow | LOL | Tiles circle the head, then a cursor clicks Follow on @i_am_vickyd |

## Files
- `plan.py`: the bar-cut timeline and the frame map. The Side-Eye plays forward, then back, then forward again.
- `rx_styles.html`: the page. It reads `video/out/vreact/<id>/full` and `cut`, which are frame-aligned.
- `grid.html`: the closing grid.
- `img/`: the logos.
  - Cournot's own `logo_black.svg` from cournot.ai.
  - Primus's wordmark is cut from Cournot's 29 Oct cover.
  - The avatar is from the Grin clip.

## Lessons
- **Loudnorm flattens a drop.** The bed is set with one gain plus a limiter, so the jump into the drop survives
  (about +20 dB). The quiet opening bars are lifted 6 dB.
- **A class rule inside a stamp leaks to its caption** (`#stamp span` styled the source line too). Use `#stamp>span`.
