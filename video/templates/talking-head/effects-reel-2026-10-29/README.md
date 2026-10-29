# Seven effects on the owner's own recordings (29 Oct 2026, a sample reel, 0:54)

The owner sent "7 video effects you can use in Claude" (@favoritetechgal) and asked to see them on their own videos.
Each effect sits on a real line of theirs: six from the Cournot edit, one from the Bagel intro. Every screen is a real
capture, and every number is Cournot's own (as of 28 Oct 2026). The idea bank (`../../IDEAS.md`, 29 Oct) has the study.

| # | Effect | The line | How |
|---|---|---|---|
| 1 | Words behind you | "…decides who won" | Royal-blue wash, "WHO WON?" between the room and the cut-out |
| 2 | Glass cards | "Primus Labs… Cournot" | Frosted cards (a blurred copy of the same frame), two tucked behind the head |
| 3 | Orbit | "Primus is there… to verify" | Five real captures circle the head; the back half sits under the cut-out |
| 4 | Documentary | "That's the fundamental part" | Navy duotone, an orange disc behind the owner, stamped type, handle and Follow |
| 5 | Checklist | "reads the rules… evidence… verdict… zkTLS" | A glass panel ticks each step on the word |
| 6 | Numbers split | "a very no-brainer partnership" | Cournot's figures above, the camera in a card below |
| 7 | Timeline | Bagel: "how I make a combo pick" | Blue grade, REC timecode, the Bagel video's real chapters lighting up |

## Files
- `build.py`: cuts the seven spans frame-exact and checks each clip's frame count. It also makes the voice and the bed
  (543, the drop on effect 2).
- `matte_frames.py`: cuts the owner out of the reel's own frames (Robust Video Matting, memory reset per span).
  - Each cut-out matches the exact frame under it.
  - The first try matted the source clips separately, and the camera and cut-out drifted by a frame.
- `data.py`: the captions and beats.
- `fx_reel.html#<work dir>/`: the page.
- `grid.html`: the closing grid.
- `sheets.py`: the check sheets.

## Lessons
- **A cut-out must come from the same frames it covers.** Seeking with `-ss … -t` dropped a frame on four spans, which
  doubled the owner's face for a moment. Trim by frame number, and assert the count.
- **Orbiting cards change layer only in clear air.** The crossing sits beside the crown (y 780), not at the cheeks,
  so no card pops over the face.
- **A count-up shows numbers nobody reported** (0.00%, 42.01%). Real figures pop in whole.
- **`isolation: isolate` on each effect layer** keeps its cards' z-order inside it, so the back cards stay under the
  cut-out.
