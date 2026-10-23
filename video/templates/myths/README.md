# Matchday Myths: the weekend's biggest game told as a legend

The owner approved this series on 23 Oct 2026. It answers "my videos are not doing well": one game per Short, 35–50 s,
real AI film instead of templated boards, a character narrator, and a two-part story. The prophecy goes out before the
game, and a "the prophecy held" or "broke" Short goes out after it.

Episode 01: El Clásico, `clasico-2026-10-25-*`.
- Shot prompts, models and narration: `-shots.json`.
- The edit: `-edit.py`.
- Cover and thumbnail: `-cover.py`.
- Facts: `-sources.md`.

## The format
1. **One game, one myth.** Each club becomes a symbol drawn from its colours, nickname or crest motif: Barcelona an
   armada with blue-and-garnet sails, Real Madrid a white kingdom with a crown, Torino a bull, Gladbach the Foals.
   - **Never** generate real players' faces.
   - **Never** show club crests in AI scenes. Real names are said and shown in the captions only.
2. **The story comes from dated facts.** Find the one true fact that makes a legend. In Ep. 01: Barcelona's 9 from 9
   equals the record start, which belongs to Real Madrid, the team they face.
3. **Shape (about 45 s):**
   - a cold hook on screen in the first second ("9 BATTLES");
   - the record, with the music's drop;
   - the march;
   - the stakes;
   - the wound (the twist);
   - the seer with two facts;
   - "The prophecy…", then the touch on the verdict;
   - the prophecy card;
   - "Follow and see if the prophecy holds".
4. **Look:** every scene at night in moonlit navy and steel blue, the house colour, with warm fire as the accent.
   Captions:
   - headlines in Anton;
   - word-by-word subtitles in Manrope 800 (`manrope-latin-800`, not the `-ext-` file, which has no basic letters);
   - the "MATCHDAY MYTHS" pill throughout.
5. **Sound:**
   - the narrator: ElevenLabs "Obsidian - A Dark Fantasy Storyteller", eleven_v4, with tags like [slow], [pause] and
     [whispering];
   - a track from the wow pool, its drop on the record line;
   - Mixkit hits: 2909 on the hook, 2908 on the drop, 1143 on "The prophecy", 2299 on the touch.

## Cost and the safe way to spend
**Prices (Oct 2026):**
| Item | Credits |
|---|---|
| A 9:16 2K still (GPT Image 2.5) | 275 |
| A 5 s 1080p Kling 3.0 Pro shot, no audio | 3,394 |
| Narration, two takes of ~600 characters | 1,266 |

**Ep. 01 cost 23,279 credits** (six stills, six shots, narration).

**Always:**
1. Get the estimate first (`estimate_only`).
2. Make the stills and show them to the owner before animating. The stills are the storyboard and the start frames.
3. Never re-run a generation to retry: ask first.

The ElevenLabs flow keeps every node, so a single shot can be redone alone.

## Edit notes
- **Kling clips are 5.04 s at 24 fps, 1080×1920.** Render at 24 fps.
- **Slow a clip by no more than about 1.3×,** using `minterpolate`. Slow camera moves hide it well, but it is slow to
  render (about 1 frame a second).
- **Reuse clips as cutaways** with a different crop (`zoom` 1.1–1.2) and `hflip`. The "wound" shot reuses the armada
  with a red grade.
- **Open up the narration at story beats** with inserted gaps (`CUTS`/`GAPS` in the edit). Each cut point must sit in
  a silence, so check the word times first (`vo2.words.json`).
- **Time the seer's touch** (about 3.3 s into its clip) onto the verdict word.
- **The audio graph:** give the last `amix` `duration=longest`, and pad the ducked music with `apad`. Without them the
  mix stopped when the first narration part ended (8.9 s).
