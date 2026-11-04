# The hype cut engine (Gamdom #Gamdom100kRound2 final, 4 Nov 2026)

This engine builds the owner's reference style (see `../PLAYBOOK.md`):
- a speech hook with one-word captions;
- a negative flash on the drop;
- real footage cut hard on the beat, with a few beat effects;
- the brand inside the action.

The output is 16:9, 1920 × 1080 at 30 fps, for X. There's no generated imagery and no AI voice.

## Tools
- **`beats.py <audio> <out.json> [t0 t1]`** finds the beats, the tempo, the hits (the strongest onsets, 0.12 s or more
  apart) and the drop. On Mixkit 586 it found the drop at 17.36 s, the track's known hit, at +29 dB.
- **`textlayer16.mjs <text.json> <dir>`** renders the text as transparent PNG frames. The kinds are:
  - `word`: one-word Anton caps that pop;
  - `line`: a serif line;
  - `small`: a small top-left label;
  - `title`: a chrome face with a dark extrusion. Red and cyan ghosts tear on each `glitch` time, and an optional
    green line runs underneath;
  - `end`: the hashtag, with "18+ | GAMBLE RESPONSIBLY" under it.
- **`hype.py <spec.json> <out.mp4> [--from a --to b] [--stills t,… dir]`** cuts the owner's original files to the
  spec in one encode (crf 14). Each shot has:
  - a source range;
  - an optional time map (speed ramps, holds);
  - `cover` (fill 16:9 round a focus point) or `contain` (the whole frame on black);
  - a punch-in;
  - effects: `neg`, `flash`, `rgb`, `shake`, `whip`.

  A whole session can rush past in a second: fast shots decode fewer frames, and a rush decodes keyframes only.
- **`sheets16.py <video> <dir> <fps> <prefix> [t0 t1]`** makes the frame sheets for the check.

## Checks done on the engine (test clips only)
- **The footage keeps its colour.** yuv → rgb → yuv uses the source's own matrix with accurate rounding. A plain shot
  measured 0.01 levels of conversion error and 0.10 after the crf 14 encode (the playbook limit is 0.5).
  - Without `accurate_rnd`, the conversion was 0.9 levels darker.
- **Speed:** a 23 s test with every effect rendered in 62 s.
- **HDR:** ffmpeg here has `zscale` and `tonemap`, for HDR phone footage.
