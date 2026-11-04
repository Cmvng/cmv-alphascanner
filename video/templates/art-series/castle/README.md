# The Gamdom castle film (#Gamdom100kRound2, 4 Nov 2026, 1:18, 16:9)

The owner drew a 62 × 94 cm charcoal piece:
- GAMDOM in cracked stone, a giant eye inside the letters, smoke above;
- a tear falling from the eye into the ruins, whose cracks light up where it lands;
- a castle tower rising with its stones pulled up on threads of light, its flags flying.

The brief: "the artwork tells the story promoting the platform". The finished piece waits veiled in the centre while
the progress clips play at the sides, then everything focuses on the unveiling. They asked for "badass music" and
cinematic work.

## The film

| Time | What happens |
|---|---|
| 0:00 | **Cold open:** the smoke ("13.10.2026 · Gamdom went offline."), then the eye pulling back ("They said it was over."). |
| 0:07 | **The wall:** the veiled piece in the centre, the real sessions in the side panels, cut every two beats. Each panel is labelled with what is being drawn. |
| 0:21 | **The drop:** the panels fly in as a mosaic of the piece, made from the owner's own frames. A negative frame lands on the first stab, the mosaic melts into the real photo on the second, and the photo grows to the whole sheet. "MUST FIGHT BACK" in chrome lands on the full hit. |
| 0:29 | **The read:** the camera travels through the drawing in story order, using the 4000 px close-ups: the name, the eye, the tear, the ruins, the stones, the flags. |
| 0:45 | **The return:** the drawn flags cut to Gamdom's real logo (their own loading screen at 2.5×), "16.10.2026 · Gamdom is back." |
| 0:48 | **The site:** gamdom.com recorded read-only, shown whole in a floating screen with one caption each: Casino, Originals, Sports, King of the Hill, Royalty Ranks. |
| 1:01 | **The close:** blank page to finished piece (the whole session rushed through), the artist at the wall with the credits, the tagline, and the hashtag with Code STEVE and "18+ \| Gamble responsibly" on the last hit. |

The music is "Fragments Of Bangkok" (Mixkit 625), started 13.954 s in:
- the first stab (35.954) lands at video 22.0, and the second stab at 23.03;
- the full hit is at 25.12;
- the end card lands on the last hit before the fade (88.69 → 74.74).

The mix is one gain to −14 LUFS plus a limiter, with no loudnorm. The final file measures −14.2 LUFS, peak −1.5 dBFS.

## Build
1. `castle_plan.py <beats.json> <assets> plan.json`: the timeline. Every cut is on a beat of the track.
2. `extract.py plan.json <page>`: the frames of each clip segment.
   - `rect` crops the letterboxed parts of the owner's CapCut compilation.
   - `fx` moves the panel crop sideways.
3. `../unveil/mosaic.py <cfg> <page> 28 18` with `mosaic_pull: .55`, from a pool cut out of the session clips.
4. `node ../unveil/render.mjs <page>/castle.html plan.json --stills …`, then `bash ../unveil/render_par.sh <page>/castle.html plan.json out.mp4 3 14`. Three chunks take about 6 minutes.
5. `node cover.mjs <page>/cover.html <out>`: the cover and the thumbnail.

## Lessons
- **Exact stills at every change before the full render.** The first full render showed the drawing vanishing under
  the title for 0.9 s; a leftover time limit from the template hid it early.
- **White type on white paper needs a shade at the foot of the frame.** It is ramped with the lines, so it never pops.
- **Label what the clip shows, not what the plan hoped for.** The eye time-lapse had been labelled "the tear" and
  "the ruins".
- **A CapCut compilation hides black frames between parts.** Measure them (mean luma per 0.1 s) and start each part
  after them.
- **The owner's images are theirs to use.** The 1:18 left their frame mockups out over the "no AI" bonus. They wanted
  them in, so the 31-second cut uses them all. The one fix is Gamdom's real logo on the laptop image.

## The 31-second entry cut (after the owner's notes, 4 Nov)

The owner's notes: use the frame images they sent; the zoomed photos lacked definition; the entry is 30 s, with the long
form showing the process; the story and the artwork itself must come through.

- **`prep30.py`:**
  - The photo's levels are set to the owner's own mockups (paper about 236, charcoal about 30), levels and white balance only.
  - The mockups are saved as JPEGs. On the laptop one, the fake spade logo is replaced with Gamdom's real logo.
  - Gamdom's logo is cut out with alpha.
- **`castle30_plan.py`:** music from 25.274 s. The cold open runs 2 bars, the wall 2.6 bars. The mosaic lands on the
  stab, MUST FIGHT BACK on the full hit, then one camera move, the frame images two beats each, the casino, and the
  end card on the downbeat after the drum run (53.197).
- **`castle30.html`:**
  - camera paths (`keys`), with the view clamped inside the sheet;
  - a full-screen mosaic box;
  - the right panel shows the live site;
  - big Anton beats;
  - Gamdom's logo on the end card.
- **Definition rule:** no crop narrower than about 1,900 source px. At 4000 px, the contain share is ≥ 0.41.
- **`cover30.html`:** the cover and thumbnail, from the owner's GAMDOM gallery image.

## The 32-second entry, second cut (after the owner's notes, 4 Nov)

The owner's notes on the 31-second cut:
- keep the frames sequence;
- the opening didn't promote Gamdom or tell the story;
- the Mixkit track was "very poor": use the music from the samples they sent.

- **The music: the rap track from the owner's 29 Oct effects-reel sample.**
  - Measured: 151 bpm, with a big accent every two bars (3.17885 s, from 1.485 s). Each rap line sits between two accents, so there's a vocal gap on every accent.
  - The reel carries 25.87 s of it. `splice32.py` repeats two bars on the beat: source 0–23.40, then 17.0423–25.867. The low-passed beat matches to 0.999 there, and a transcript across the splice reads "…can't be ignored / back and better, this is me but reinforced".
  - The mix is one gain to −14 LUFS plus the limiter.
- **The lyrics carry the cuts.**
  - "I've seen it all" on the drawn eye.
  - "back and better" under the climb to the castle, and again under "GAMDOM IS BACK".
  - "you can try it" over the live site.
  - "out of favors, I just did it" under the end card.
- **The story in Gamdom's own words:** their 13 Oct post, rendered from X's public embed by `tweet_embed.cjs` (`platform.twitter.com/embed/Tweet.html?id=…`, light theme), shown whole over the cracked letters.
- **gamdom.com in the wall, whole:** `rec_phone.cjs` records the site logged out in a phone-sized window (412 × 732, plain load), so a page fits the portrait panel without cropping. Each panel is labelled with what it shows.
- **After "Gamdom is back":** the desktop site, whole, in the floating screen (Originals, King of the Hill), then the end card.
- **`castle32.html`:**
  - `tweets` (the post overlay);
  - labels under both panels;
  - `dim` as a list of `[t, level]` steps.

**Lessons**
- **A beat tracker can lock onto the dotted pulse.** On a syncopated trap beat, beats.py reported 101 bpm, two thirds of the real 151. Check the onset autocorrelation for the two-bar cycle and fold the onsets over it before cutting.
- **Splice a song where the instrumental repeats.** Cross-correlate the low-passed beat two cycles apart: the peak gives the exact spacing, to a few ms. Then choose the cut point where both sides already sound alike.
- **A site cut to a portrait sliver isn't "whole".** Record it in a phone-sized window instead.

## The third cut: the owner's staging (4 Nov)

The owner's notes on the second cut: it looked boring next to the other entries. They described the staging they wanted:
"the artwork in a frame will be in the center, then the various progressions will be around, like it will be revolving
around". The site should be "not scrolling… like a cinematic shot in between". Steve's brief: "make a 30+ second video
promoting gamdom". His post closes with "Must fight back when kicked down."

- **`castle33_plan.py` and `castle33.html`:** the same track, accents, fall, read, frames sequence, casino and end card
  as the second cut. Two parts are new:
  - **The orbit.** The finished photo sits in a CSS 3D frame: a black border, a white mat and a spotlight. Eight
    session clips (slot `orb`, 300 × 534) revolve round it in a preserve-3d scene and face the camera:
    - each panel's brightness and blur follow its depth;
    - two passes use different sessions;
    - on the accent the panels fly into the frame, the light comes on, and the camera pushes through the frame. It
      stops at the view the title photo starts from (share 0.84), so the cut to the photo is seamless.
  - **Cinematic site shots (`cine`).** Sharp stills of gamdom.com (`s_*.jpg`, 3200 × 1800, logged out, plain load) on a
    3D plane: two eased keys of x, y, z, rotateY and rotateX, a light sweep and a green rim. Originals sits between the
    passes; King of the Hill and Casino · Sports come on "you can try it".
- **Lesson:** when the owner describes the staging, build that staging. A flat wall of panels was "boring", while the
  same footage revolving round the framed piece is the shot they pictured.
