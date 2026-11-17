# The talking character (owner's cartoon), free: 17 Nov 2026

**The ask (17 Nov):** "Can't you make videos like this with characters talking or explaining stuff...???" (sample S10,
@0xgiwax's Primus explainer). Then: "Without using eleven labs.. Can't I get you the images of the characters and it
works like that." Then: "Use the character inspiration of my own videos of me... So the character looks like me".
The owner made the poses from our prompts (`../pose-prompts.md`, `../owner-pose-prompts-full.txt`) and sent seven
(`video/assets/characters/cmv/`). Asked how the mouths should be made, they chose "You make them for free". Asked
for the voice, they chose "Lara".

**How it works.** No AI video and no ElevenLabs video credits are used.
1. **The mouths are drawn here, on each pose** (`drawmouth.py`), as a half-open and an open version. The lower lip
   and the beard drop a little (a jaw), and an opening with top teeth and a tongue is painted in the cartoon's own
   colours, at 4x and reduced. The rest of the picture is untouched, pixel for pixel. The lip line of each pose was
   measured from row-brightness profiles (`poses.tsv`): an automatic search picked the cheek, then the moustache.
2. **Each pose is cut out of its white background** (`cutout.py`). The cut is a flood fill from the picture's edges,
   with the colour un-mixed from white along the outline. All poses use one scale (0.585 → 599×899), and the feet sit
   on one line, so poses switch in place.
3. **The mouth track** (`mouthtrack.py`) is made from Lara's voice. Each frame is closed, half or open, changing 15
   times a second: open on loud syllables, half on soft ones, closed between words.
4. **The page** (`demo-prospect-2026-11-17/demo.html`) puts the character on the left. It changes pose on each line
   with a hard cut and a 1.8% pop, plus a slow breath and sway. The real screens sit on the right, with the captions
   under them.
   - The pose and the mouth are picked on the nearest whole frame, so the motion-blur sub-frames never mix two
     shapes.
   - A 0.1 s cross-fade between poses showed two figures at once on the half-second sheet (fixed 17 Nov).

## Layout and motion (the owner, 17 Nov: "the distance between the character and what it's trying to show is kind of too large, and there's no way you can actually see what you're actually trying to show… the transition of the character… it's kind of too off")
- **The screen is big and sharp.**
  - Screenshots are shown at their own pixels (the owner's 1200 px screenshots at 1200).
  - Captured pages are taken at 2x and shown about 1300 px wide.
  - The line being read gets a close-up cut from the same 2x capture, at 1:1.
  - On a screenshot whose text is small, the camera pushes in (about 1.45x, the named region drifting toward the
    middle) and pulls back: see `zoom()` in `../../explainer/primus-proof-of-creation-2026-11-17/poc.html`.
- **The character stands right at the screen.**
  - It is drawn at 0.8 (`SC`), its feet at y 1050, the left of its picture at x -20.
  - The screens start at x 560–620, so the pointing hand reaches the screen's edge.
  - The captions sit under the screen.
- **No sideways jump.** The pointing pose (04) is drawn left of the others (its feet 69 px, its head 106 px), so it
  is moved over by `HX['04'] = 88`; neither the head nor the feet jumps far. Measure each new pose the same way.
- **Pose changes move.**
  - In the 0.12 s before a change the character dips: it squashes 5% down and 2% wider.
  - The swap happens at the bottom of the dip, and the new pose springs back with a slight overshoot.
  - There is no blend. A blended frame showed two heads, and the old hard cut with a pop read as "too off".
  - Check it on consecutive frames around a change, at full size.

## Make it
```bash
T=video/templates/characters/talking; A=video/assets/characters/cmv; O=<scratch>/poses
# per pose (values from poses.tsv): mouths, then the cut-out at the one scale
python3 -I $T/drawmouth.py $A/01_Standing.png 518 $O/01 522 204 470 575
python3 -I $T/cutout.py $A/01_Standing.png $O/01_half.png $O/01_open.png <page>/img/p01 880 0.585
# the mouth track from the voice as placed in the video, word times moved to video time
python3 -I $T/mouthtrack.py <voice.wav> <words.js> <seconds> <page>/mouth.js 30 0.2,8.36,0.6
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh <page>/demo.html <plan.json> <out.mp4> 3 16
```
Check the faces at full size on open-mouth frames of every pose, and look at the frames either side of each pose
change.

## The demo (17 Nov)
- **What it is:** the first 24.2 s of the Prospect video (`../../explainer/prospect-2026-11-16/`), re-made with the
  owner's character presenting. It was first made on the same Lara take and mix (no new credits), then re-voiced (below).
- **The pose for each line:** Thinking for the question; Key Point on "implied probability"; Pointing at the post;
  Standing on "So I just found…"; Pointing at "prediction market"; Key Point on "live now"; Counting on "Let me break
  it down"; Pointing at the slates; Shrug on "peer to peer".
- **What it shows on the right:** the real Prospect screens: the 15 Nov price card, the 12 Nov launch post and
  release, the three slates, and the order book from their launch video.
- **The voice:** Lara was the first take. The owner then said "Sorry use my own voice or a male voice" (17 Nov). They
  chose Olawale (ElevenLabs, Nigerian English, male), one of three voices measured closest to their own recordings.
  - The demo was re-voiced with one Olawale take (364 credits): `cmv-character-demo-olawale.mp4`.
  - The first full video in this format is `../../explainer/primus-proof-of-creation-2026-11-17/`. It uses a free
    male voice (Kokoro am_fenrir, at the owner's pitch), because ElevenLabs had run out of credits.
- **Still open:** 12 more poses can be added when the owner sends them; each needs its lip line measured first.
