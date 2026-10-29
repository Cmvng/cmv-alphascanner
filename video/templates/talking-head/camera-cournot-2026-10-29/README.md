# Primus Labs × Cournot, "Who decides who won?" (29 Oct 2026, the owner's recording, 1:15 + end card)

The owner's 1:57 selfie (1080×1920, 30 fps) about Primus Labs and Cournot, an AI oracle that settles prediction
markets. The brief: the owner's post text, "do your proper research and make this video a 10/10".

## The edit
The approved Primus "Proof of Nomad Life" flow: the owner talking from the first frame, with real pages floating above
the head. There is no separate opening scene.

- **The hook first:** "A prediction market is only as good as the way it decides who won" (moved from 0:32), over
  cournot.ai's "Settle real-world outcomes with evidence, not votes."
- **Every screen is a capture of the real page,** taken read-only at 430 px ×3 (`video/out/cournot-2026-10-29/site/`):
  - Primus's hero and its zkTLS definition;
  - Cournot's 29 Oct announcement on Medium (the cover, "This is where Primus Labs adds…", and "Primus verifies the
    source. Cournot verifies whether the evidence satisfies the market.");
  - the four proofs from cournot.ai;
  - the two docs rules ("Evidence without a valid proof is inadmissible", and "A single invalid proof… invalidate the
    entire evidence bundle");
  - "Official resolution layer for 42".
- **Two walkthroughs on the light grid page:**
  - "Rules → evidence → verdict" follows the owner's audit line on cournot.ai's own sentence.
  - "In numbers" is the live stats grid: 6494 resolutions, 99.71%, under 8 minutes, each outlined as the owner gets to it.
- **Two stickers** on the strongest lines: Wait, What? on "is this proof correct?" and the Grin on "GG".
- **The end card:** the medium cover, plus the owner's caveat in their words ("The proof shows the data came from the
  source, not that the source was right" and private credit "coming soon").
- **Outlines** are Primus orange (#FD4C00), the subject's own colour. Each one lands on the word.

## Files
- **`plan.py`:** the edit list.
  - `KEEP` holds source spans in output order, each edge at the quietest 20 ms near it, with pauses over 0.4 s closed.
  - It also holds the captions (the owner's words, `|` between chunks, aligned to the medium.en word times) and the
    beats (`ev`, in output seconds).
  - It writes `data.js` here and `plan.json` in the work dir.
- **`build_av.py`:**
  - `base.mp4`: the camera, cut at phrase gaps, with zoom alternating 1.0 / 1.07 and the grade.
  - The voice pieces, then "A New Life" (543), with the drop on "partnership". The bed is rendered in its own pass,
    then sidechained.
- **`cournot.html`:** the overlay, drawn over `base.mp4` with these parts:
  - floats `[x, y, w]` windows of a capture, with orange outlines in capture px;
  - notes, the two `#full` walkthroughs, the stickers from `video/out/reactions/`, the captions and the end card.
- **`render.mjs`:** screenshots each frame of the overlay over base.mp4 (`--stills t1,t2` for single frames).
- **`capture_page.mjs`:** the read-only capture.
  - It scrolls the page through once (cournot.ai's intro animation leaves the page dark until it has run).
  - Then it brings each phrase to the middle and screenshots it.
- **`ocr_rect.py`:** finds a phrase's box in a capture (tesseract), for the outlines.
- **`lines.py`:** prints every text line's box on a capture. Each float window ends in a gap between lines, and each
  outline covers its sentence's lines.
- **`card_shot.mjs`:** puts an element at several heights in the viewport and screenshots each. That's how the
  Proof of Authenticity card was caught whole, below the sticky tab bar.
- **`review.py`:** writes `review-full-NN.jpg`, every 0.5 s.
- **`ten.py`:** writes `ten-NN.jpg`, at 10 fps round every float, outline, walkthrough key, note, sticker and the end card.
- **`cover.html` / `cover.mjs`, `srt.py`, `hearback.py`, `words_med.py`, `sources.md`.**

## Rebuild
```
python3 -P -E words_med.py <work>/raw16.wav <work>/words_med.json            # faster-whisper medium.en
<tts venv>/bin/python video/lib/df_enhance.py <work>/src48.wav <work>/src_df3.wav
python3 -I plan.py <work>
python3 -I build_av.py <work> raw.mp4 543.mp3
PW=<playwright> node render.mjs "$PWD/cournot.html" <work> out.mp4
python3 -I review.py <work> out.mp4; python3 -I ten.py <work>/plan.json out.mp4 <dir>; python3 -I hearback.py ...
```

## Lessons
- **cournot.ai draws nothing until its intro has run.** The first captures were the dark background only. Scroll the
  whole page first, then capture each phrase.
- **A sticky tab bar rides along in full-page captures.** Crop the capture below it (`home-resolution-c` from y 800,
  `home-stats-c` from y 210), and offset the outlines to match.
- **Fit a walkthrough's title to its panel** (the loop in `cournot.html`): "Rules → evidence → verdict" ran past the
  edge at the first size.
- **A beat moves when an edge moves.** Moving the "no-brainer" end by 0.5 s moved every later beat. Rebuild the plan and
  re-check those overlays.
- **The first render's cards cut through text, and its walkthrough zoomed past the page's edges.** Every window now comes
  from `lines.py`'s line boxes: it ends in a gap between lines, and each outline covers all of its sentence's lines.
  Walkthroughs keep the page's full 1290 px width, so the page keeps its own margins.

## Text behind the owner (a test, 29 Oct, from the owner's "7 video effects" reference)
`fx_behind.html` puts the hook's words behind the owner's head. The layers, back to front:
1. the camera;
2. a royal-blue wash on the room;
3. "WHO WON?";
4. the owner cut out;
5. the caption.

To build the cut-out frames:
- `video/lib/react_matte.py` on the stretch, then `m_####.png`;
- the camera's own pixels inside the body, the matte's colour at the edges.

Then `node render.mjs "$PWD/fx_behind.html#<frames dir>/" <work> out.mp4`, with a work dir holding that stretch's
base.mp4, mix.wav and plan.json.
