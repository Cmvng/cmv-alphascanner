# THE LIVING DRAWING: the owner's Gamdom charcoal piece as a lit relief (9 Nov 2026, 30.8 s, 16:9 and 9:16, music only)

The owner: *"That my video of me drawing that Gamdom drawing… Can you create me like a cinematic kind of like? Just
create me something that is cool. That when someone sees it, like okay, wow."* This is the one case where the owner
asked for their footage to be treated; the clean-cut rules in `../README.md` still hold for everything else.

**Concept:** the drawing wakes up. First the real footage, untouched: the tools, the hand, the hours, the artist in
front of the eye. "It started as dust." One beat of dark. On the drop the camera goes *into* the drawing: the paper is
lit as a relief, a light travels across the cracked letters, the eye catches it, the tear runs down into the ruins,
the castle's flags move, and the camera pulls back until the whole piece is a sheet in a pool of light.

## Timeline ("WOLF", 75 bpm; shots change on the bar, 3.2 s; the drop is at 8.8 s)
| Seconds | What |
|---|---|
| 0.4–5.2 | Three upright panels of the owner's footage, one per beat group: tools ("Charcoal"), the hand ("By hand"), the time-lapse ("62 × 94 cm") |
| 5.2–8.4 | The artist facing the eye, one wide shot. "It started as dust." |
| 8.4–8.8 | Dark, and the music stops for the beat |
| 8.8–12.0 | **the name:** low across the cracked stone letters, the light sweeping with the camera |
| 12.0–15.2 | **the eye:** the word from further back; the light comes up and the eye is looking at you |
| 15.2–18.4 | **the tear:** down its trail into the ruins, a puff of charcoal dust where it lands |
| 18.4–21.6 | **the rise:** up the castle to the flags, which move |
| 21.6–26.4 | The whole piece, pulling back to a sheet in a pool of light |
| 26.4–30.8 | The artist at the finished wall. "Drawn by hand. Charcoal on paper. 62 × 94 cm. @i_am_vickyd" |

## How the relief is made (and what to say about it)
- `prep.py` turns a photo of the drawing into three maps: the picture itself (albedo), a height map and a normal
  map. Height comes from the drawing's own tones (ink low, paper high, softened), so the light catches the strokes
  the owner drew. Nothing is repainted: every pixel of colour is the photo.
- For the two close-ups with real depth to them (the castle and the letters), `depth.py` adds a depth estimate from
  Depth Anything v2 small (an open model, Apache-2.0, run locally). The eye and the whole piece use tones only.
- **Say this plainly in the post:** the drawing is by hand; the *lighting and camera* are computer-made, and two shots
  use software depth estimation. Do not write "no AI" on this film.
- `alive.html` draws a displaced plane with its own shader: a moving light, a pool of light, a warm/cool split tone,
  dust points, and the flags swaying (a vertex wave inside rectangles given in `plan.js`).
- **Never zoom past the photo's own pixels:** the camera stays at z ≥ 2.05 on the 4000-pixel photos (1:1 at 1920 wide).

## Files
- `alive.html`: the page. Reads `plan.js` (`images`, `shots` with camera/light/pool keys, `pans` for the footage
  panels, `text`, `flash`, `shade`). `window.render(t)` draws one frame.
- `gamdom_gen.py`: this film's plan, every cut on the beat grid. `python3 -I gamdom_gen.py <page dir> <bpm> <drop s> [beats per shot]`
  (run with 150 8.8 8: the track is 75 bpm, counted in double time).
  Add `v` for the upright cut: it writes `plan_v.js` (1080×1920); copy it to `plan.js` in a second page folder and
  render with `VIEW_W=1080 VIEW_H=1920`. Upright, the three clips play one at a time at their own pixels, and the relief
  camera stays at z ≥ 3.6 (1920 photo pixels fill the height there).
- `prep.py`, `depth.py`: the maps. `extract.py`: frame sequences cut out of the owner's compilation, cropped to each
  clip, never regraded.
- `gamdom_mix.sh`: the soundtrack, music only. `sfx.py`: made sounds for other films (ticks, chimes); not used here.

## Lessons
- **First tries looked embossed, like pressed metal.** Fixes: normal strength 0.42, specular 0.12, camera no closer
  than 1:1, thin edges, and small bright specks not treated as paper.
- **The owner's rule on sound for this series stands:** no made whooshes, swells or hits. The sample sent on 9 Nov
  had three; the final has none. Silence for one beat before the drop is an edit of the track, not an effect.
- **The auto-crop for a clip must test columns only inside the rows it found,** or a wide strip fails; trim each
  span's ends so no neighbouring clip or burned-in caption gets in.
- The page renders at about 2 s a frame alone; with other renders running, about 6 s.
