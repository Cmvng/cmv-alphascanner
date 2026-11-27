# "SEEN": the @i_am_vickyd X profile film (27 Nov 2026), 0:51, 16:9 and 9:16, music-led

The owner, 27 Nov: "I want to do a state of the art motion design of my X profile @i_am_vickyd. Take your time and
deliver me a master piece.... Make sure to use any soundtrack even if there are copyright issues there".
Out folder: `video/out/xprofile-2026-11-27/`.

## The idea
**The light in his eye.** He draws eyes in charcoal; his X avatar is a drawing with a lure of light beside the face.
The catchlight in one of his eyes (e6, r about 59 px at its own pixels) is the same size as the avatar's lure (r 60 px
in the 2048 drawing), so the drop cuts light to light. From there one circle carries the film: the avatar circle,
every post card collapsing into its own avatar circle, and 242,220 points of light (one per post) that gather into
his avatar, the lure first.

| Time (s) | Section | What happens |
|---|---|---|
| 0.0-1.5 | Hook | His signed eye (e3) pulls back from a close-up of the iris to the whole sheet on torn paper |
| 1.5-7.5 | The rhyme | One drawing a bar on a growing pile, the iris locked to one screen circle (r 210); his own bio words on chips: "Charcoal", "pencil", "artist", "& trader" |
| 7.5-10.5 | Burst | Cuts on two beats, then on single beats, same locked iris |
| 10.5-12.0 | Still bar | e6 alone, anchored on its catchlight: a slow push, a snap on the pre-hit, stillness |
| 12.0 | Drop | Hard cut light to light: the avatar's lure on the catchlight's place and size, pulling back into its circle; a white ring draws on from the lure's angle |
| 13.5-19.5 | Who | The cmvng wordmark (the site's own logo, built on the beats), @i_am_vickyd, "on X since Aug 2011 · Nigeria", 12,719 followers; source chip "X · 27 NOV 2026" |
| 19.5-25.5 | Trader | The avatar shrinks into the iris of e1 (the eye with a price line in its veins); one camera from the veins to his own Bitcoin chart (27 Nov), push-in on his drawn path |
| 25.5-27.0 | | His chart shrinks into its place in his post; the post collapses into its avatar circle |
| 27.0-28.5 | | "Patience will be rewarded" unfolds from its avatar at the lock point |
| 28.3-31.5 | Building | His bio word BUILDING; his app's real match card ("A RED FLAG ON THE FAVOURITE" ringed) and the form rows |
| 31.45-34.5 | | His Real Madrid call (26 Nov 2026), "I am calling it now" ringed |
| 34.5-38.2 | The wall | Pull-back from that card to 24 of his posts; each collapses into its own avatar circle |
| 38.2-43.5 | 242,220 | The 24 avatars become 24 points; a powers-of-ten pull-back to 242,220 points (one per post), counted in frame, landing on the bar at 42.0 |
| 43.5-46.5 | The gather | Every point swirls into its own pixel of his avatar, the lure first; held half-made for about a second (the screenshot moment) |
| 46.5-48.0 | | The real drawing fades in under the points; the ring draws on again from the lure |
| 48.0-51.3 | End | His motto "its not over / until I win" (his post of 24 Oct 2025), "Follow @i_am_vickyd on X" clicked |

## Real material only (none of it committed: it is the owner's)
- Six charcoal eyes he posted on 26 Nov (`page/img/e1..e6`, at their own pixels; the GAMDOM drawing left out).
- The 2048 drawing his avatar is cropped from (post 1990997890102083642).
- His posts as X's own embed draws them (light theme, 1644 px wide): the wall cards are PNG at 440 px (twice their
  shown size), the RM card also at 1100 px for the close part of the pull-back.
- His app's real screens (cmvngpicks.com match page, 27 Nov, read-only capture): `04_match_chelsea__type_of_match`,
  `__form_last10`. No betting word on either.
- Profile numbers from X's own data on 27 Nov: 12,719 followers, 242,220 posts, joined 7 Aug 2011, Nigeria.
- Our own type, rings and chips are the only things laid over his art and screens.

## Soundtrack
"Royalty" (Instrumental), Egzod, Maestro Chives & Neoni (NCS), a 51.27 s excerpt as mastered (one join at 22.5 s,
8 ms crossfade), -14 LUFS, -6.2 dBTP. "No Rival" (Instrumental), same makers, NCS, is on the same 160 bpm grid
(bar 1.5 s = 45 frames; drop 12.0, lifts 24.0 and 36.0, last hit 48.0), so the second version is a swap of the sound
only. Samples of both went to the owner before the render. NCS lets creators use them free with a credit.

## Build
```bash
XP=<scratch>/xp; T=video/templates/art-series/profile-seen-2026-11-27
# the page reads img/ next to it (the owner's art, avatar, cards, app screens) and plan.json (51.3 s, 1,539 frames)
node video/lib/determinism.mjs $XP/page/seen.html <50 times across 0-51.3>               # and with VIEW_W=1080 VIEW_H=1920
MBLUR=32 BLUR_STEP=3 bash video/templates/tactics-3d/render_chunks.sh $XP/page/seen.html $XP/page/plan.json $XP/jobs_w 3 210 14
VIEW_W=1080 VIEW_H=1920 HASH='#v' MBLUR=32 BLUR_STEP=3 bash video/templates/tactics-3d/render_chunks.sh ... $XP/jobs_v 3 210 14
# join the chunks (concat, -c copy), then mux the excerpt as is: -af "apad=whole_dur=51.3,atrim=0:51.3" -c:a aac -b:a 256k
node $T/tools/coverart.cjs $XP/page/seen.html $XP/cover 45.7                              # the page in its cover mode (#c)
node video/templates/explainer/prospect-2026-11-16/cover.mjs $T/cover.html video/out/xprofile-2026-11-27/xprofile
```
Each shape renders in about 9 minutes with 3 workers on this machine.

## What this film taught
- **Elements with a z-index inside a container without one join the page's stacking.** The drawings (z-index 10 and
  up) covered the bio words on the first render; nothing on the stills showed it because the word chips were never
  looked for. A layer that must sit on top gets its own z-index.
- **Hard cuts and switches are chosen on the frame, never on the sample.** Under motion blur a frame is sampled across
  its shutter; a cut that falls inside it mixes two pictures. The page clamps every sample to its frame's side of each
  cut (`CUTS`), and hides everything at opacity 0 with display:none, so the blur measure never sees a hidden element jump.
- **A field of 242,220 points is drawn into one buffer, with its own motion blur.** The page's motion blur does not
  see inside a canvas. Each moving point is drawn at up to 24 instants across the shutter; overlapping points average
  their colours. The field maps onto the disc by the area-preserving concentric map, so it contracts as one flow; the
  first version sent each point to a random place on the disc and read as snow.
- **A card shown from 5x down to 1x changes with frame order.** The wall cards were 560 px JPEG shown at 220 to 440:
  the determinism check failed by up to 38 levels. PNG at twice the shown size, and a larger file for the one card
  seen close, fixed it.
- **Text that moves by fractional pixels stays soft when it stops.** The motto letters animated on 0.1 px steps and
  rested blurred in sequential order but sharp when drawn fresh. Text moves on whole pixels.
