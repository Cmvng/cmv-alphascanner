# Motion study (14 Nov 2026): 20 recommended repos, what we take, what we skip

The owner sent a list of 20 repos "to make better motion videos" and asked for them to be studied. All of them were
read: the skill repos in full, the libraries' READMEs, and the web-hosted skills' source. Downloaded files were only
read; nothing from them was run. The test is our pipeline, where every frame is `window.render(t)` seeked by
Playwright (`video/templates/art-series/unveil/render.mjs`), and the owner's rules: light or blue backgrounds, real
screens shown whole, no made sound effects, and an effect that is flawless in motion or left out.

## Built from this study (in the repo now)

**`video/lib/motion.js`**: deterministic helpers, `window.M`. Load it with
`<script src="file:///home/user/cmv-alphascanner/video/lib/motion.js">`.
- **`M.E` easing curves.** They come from LottieFiles' tables:
  - `standard` (0.2,0,0,1) is the house curve;
  - `enter` (0.05,0.7,0.1,1) for entrances;
  - `exit` (0.3,0,1,1) for exits;
  - `gentle` (0.4,0,0.2,1) for camera and ambient moves;
  - `settle` (0.175,0.885,0.32,1.275) overshoots about 10%.
- **`M.spring(t, a, {k, c})`.** A closed-form damped spring (the Remotion and Motion model). Presets in `M.SP`:
  `pop` (about 11% overshoot), `card` (no overshoot), `heavy`, `bouncy`. `M.settle()` gives when a spring is done.
  Use no bounce on prices, candles and numbers (Motion's advice for trading UI).
- **`M.inout(t, a, b, o)` with `M.apply()`.** An element enters at a and leaves at b. Entrances ease out; exits ease
  in and take 70% of the entrance time. It is never opacity alone: position or scale always moves with it.
- **Timing helpers:**
  - `M.child(a, i)`: follow-through, children 0.1 s after the parent, then 0.08 s apart;
  - `M.stagger(i, n, a)`: keeps a cascade under 0.5 s;
  - `M.dist(px)`: a longer move takes longer (1.3× at 200 px, 1.6× at 400 px).
- **Ambient life:** `M.float` and `M.breathe` (±3 px or ±1% over 4 s).
- **Hits:** `M.squash` and `M.shake`. Squash on a stamp's landing; one decaying shake per video, on the drop.
- **Paths and numbers:**
  - `M.arc`: curved paths for anything that flies;
  - `M.draw`: an SVG stroke drawing itself on (hairline-style lines and arrows);
  - `M.count`: a number counting up to what the voice says.
- **`M.scene(t, a, b)`.** A scene change with depth: the old scene eases back to 0.98, the new one settles in from
  1.02.

**`video/lib/beats.py`** (librosa). It maps a track's tempo, beats and downbeats (every 4th beat, counted from the
drop), the strong hits, and every drop. A drop is a level jump of 10 dB or more.
- **Checked against our known drops:** "Sparta" 32.02 s (we use 31.997) and "New Bass 01" 22.94 s (we use 22.906).
- **Use:** with `--offset`, it prints video times. Slams and stamps go on hits, scene cuts on downbeats.
- **Never add a sound on them.**

**Motion blur in `render.mjs`, opt-in: `MBLUR=32`.** This follows /anatomy-reveal and Remotion's CameraMotionBlur.
- **How it works:**
  1. Each frame is laid out at both ends of a 180° shutter.
  2. The largest distance any element travels is measured.
  3. A frame that moves less than 2 px is one sharp shot.
  4. A moving frame gets one sample per 2 px of travel (up to 32), averaged in the renderer.
- **Tested on the Primus documents flying into the folder:**
  - a fixed 6 samples showed stepped copies of the text ("CCCCV") and was rejected;
  - the adaptive version gives a smooth smear like a real camera;
  - still frames are pixel-identical to the normal render.
- **Cost:** about 10× render time on fast stretches only. Use it on final renders that have fast moves (flights,
  whips, push-ins). Never use it on the owner's own picture.

**`video/lib/determinism.mjs`** (after Motion's motion-reviewer and the Remotion 3D rules).
- **What it does:** renders the same times forward, backward and shuffled, then compares the pixels. It also flags
  CSS transitions and keyframes, requestAnimationFrame, timers, the wall clock, unseeded random numbers and
  `element.animate()`.
- **First run found a real fault on today's Primus page.** A 1692 px logo shown 44 px tall came out up to 39 levels
  different depending on the frame drawn before. That would flicker at the parallel render's chunk joins.
- **Fix:** pre-scale big images to about twice their shown size. What remains is up to 15 levels of compositor edge
  noise, which the check reports as harmless.
- **Run it on every new page before the full render.**

## Rules adopted (from the LottieFiles motion-design skill, the Remotion skills and Motion's ai-kit)
1. **Three layers, or it looks flat.**
   - Primary: the thing the voice names.
   - Secondary: its parts following 0.05 to 0.15 s later, a shadow arriving after its card.
   - Ambient: a ±3 px float, a slow gradient drift, a 1% breath.
   This answers the 9 Nov "just flat".
2. **Direction:**
   - ease-out to enter, ease-in to leave;
   - exits shorter than entrances (70%);
   - never linear on a spatial move;
   - never opacity alone for something that matters.
3. **Choreography:**
   - lead with the hero;
   - everything in one group enters from the same side;
   - no more than a third of the elements moving at once;
   - no unbroken move over a third of the frame (break it with an arc or a change of speed);
   - a stagger stays under 0.5 s in total;
   - after a resolution, hold 0.1 to 0.2 s of stillness.
4. **Timing by size:** a small chip 0.2 to 0.3 s, a card 0.35 s, a panel 0.5 s, a dramatic reveal 0.6 to 1.2 s.
   Distance adds time.
5. **Zooms are perceptual** (Remotion): scale = s0·(s1/s0)^e(t), not a straight line from s0 to s1. A straight-line
   zoom seems to slow as it grows. Our `view()` camera should switch to this.
6. **Phases driven by their own trigger** (Remotion's map explainer): each item is timed from its own word with a fixed
   length, not as a slice of a longer reveal, or long items flash by. This is how our captions and rings already work.
7. **Annotations draw on** (Remotion text highlights): a ring or underline draws itself over 0.6 to 0.8 s from its
   word. A highlighter grows from the left behind the text. All in blue, never yellow, never "hand-drawn rough".
8. **Safe areas** (Remotion layout):
   - key text 80 px from the sides and 100 px from top and bottom (at 1080 wide);
   - headlines at least 84 px, supporting text at least 44 px;
   - decide what is seen first.
9. **Animate transform, opacity or clip-path, not width, top or left.** Reflow can jitter between frames.

## The 20, one by one
| # | Repo | Verdict | What we take |
|---|---|---|---|
| 01 | LottieFiles/motion-design-skill | **adopt the rules** | the easing and duration tables, the three layers, choreography, the 1/3 rules, the quality checklist (above, and in `motion.js`) |
| 02 | motiondivision/ai-kit (Motion) | **adopt the ideas** | springs by perceived duration (0.2 s snappy, 0.4 s normal, about 1 s heavy); no overshoot on trading numbers; the reviewer's list of non-deterministic code, now in `determinism.mjs` |
| 03 | remotion-dev/skills | **adopt the ideas** | motion blur by sub-frames, perceptual zoom, draw-on highlights, overlay transitions that don't shorten the voice, safe areas, silence detection (loudnorm, then silencedetect). Rejected: their SFX advice (whoosh, vine-boom), light leaks, grain and vignette, and their voiceover recipe (a TTS call per scene and asking for API keys) |
| 04 | /hairline | **borrow the idea** | one bright outline with a dim inner crease for line figures; 700 ms ease-out (0.32,0.72,0,1); stagger by distance from a centre, `|i−a|×30–60 ms`. It runs on requestAnimationFrame and bans colour, so we do not use the kit |
| 05 | /anatomy | **borrow the idea** | isometric camera (45° around, 30° up), four tones by the way a face points, an explode that spreads from one part. For mechanism explainers only, in plain Three.js; hundreds of grey parts would be too busy |
| 06 | /anatomy-reveal | **borrow the blur** | its sub-frame motion blur, sized to how far things move (now in `render.mjs`) and its "one continuous take, 0.24 s whips" pacing. Its "geometry only" products would mean redrawing real products: no |
| 07 | /blender-agents | **skip** | not found under that name; the nearest (scenario-labs skills and plugin) needs Blender and a paid Scenario account, and makes AI assets, which clash with the real-material rule |
| 08 | three.js | **already used** | our 3D boards; add the isometric look (05) and `mixer.setTime(t)`, never a clock |
| 09 | react-three-rapier | **skip the wrapper** | if physics is ever needed, run the deterministic Rapier build at load, store the poses, and read them in `render(t)` |
| 10 | react-postprocessing | **skip** | bloom washes out light backgrounds; grain and noise flicker; its time adds up by itself |
| 11 | three.quarks | **skip** | calls `Math.random` with no seed; a hand-written seeded particle formula is simpler |
| 12 | Tweakpane | **optional, for us** | sliders to tune a page on stills; never in a video |
| 13 | GSAP | **available, not needed yet** | free now, plugins included (SplitText, DrawSVG, MorphSVG); timelines can be seeked (`tl.pause(); tl.seek(t)`). Worth vendoring only for per-letter text or shape morphs |
| 14 | Remotion | **not switching** | our page and renderer do the same job (one function of time, frame by frame, ffmpeg); its ideas came over through 03 |
| 15 | Manim | **borrow the moves** | Write, Create and Transform (text and lines drawing on, one shape becoming another) can be done with `M.draw` and our pages; installing it (cairo, LaTeX) adds nothing for us |
| 16 | Lottie (lottie-web, MIT) | **when a brand gives one** | a project's own Lottie file can be seeked frame by frame (`goToAndStop(frame, true)`), so it is deterministic; use their official animations as real material |
| 17 | Openverse API | **music only, carefully** | CC-licensed music would still go to the owner as a 10-second sample first; its sound effects are exactly what the owner rejected ("your slop AI transition sound", 22 Oct) |
| 18 | librosa | **adopted** | `video/lib/beats.py` |
| 19 | WhisperX | **already have it** | word timing by wav2vec2 forced alignment is what `video/lib/align_words.py` does |
| 20 | FFmpeg | **already used** | the encode, the mixes, loudness, silence detection |

## Next video: the motion audit (with the half-second sheets)
- **Determinism:** `determinism.mjs` passes on the page.
- **The three layers:** something on screen keeps a little life, and parts follow their parent.
- **Moves:**
  - no linear spatial move;
  - no opacity-only change on what matters;
  - entrances ease out, exits ease in and are shorter;
  - no unbroken move over a third of the frame;
  - stagger under 0.5 s;
  - at most a third of the elements moving at once.
- **Fast moves** were watched frame by frame. If they strobe, render with `MBLUR=32`.
- **Hits:**
  - slams and stamps sit on hits from `beats.py`;
  - the title sits on the drop;
  - nothing makes a sound.
- **Big images** are pre-scaled to about twice their shown size. Real screens shown in the camera stay at native pixels
  or below.
