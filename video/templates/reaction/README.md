# Reaction to our analysis (the approved format)

Approved by the owner on 1 October 2026: the **presenter** version. Reference file: `tonight-2026-10-01-presenter.json`.

**What it is:** our pre-match analysis takes against the real results, in the style of the example the owner sent, but with no tips and no odds, so it can earn on YouTube and X.

**How each match runs:** fixture card → white "Our take" card → the final score → a big running tally (1/1 ✅, 1/2 🤏, 1/3 ❌), with a boom, then a cheer or a sad trombone. One honest, lively voice line per beat.

**Background:** real 2026 World Cup action photos of each team's own players, from Wikimedia Commons (`lib/teamphotos.mjs`, players in `lib/squads.json`), cut every two beats with push-ins and credited. Teams without World Cup photos use player photos (`people`) or their stadium. **Never broadcast footage.**

**Presenter:** a green-screen clip keyed to the bottom of the screen (`presenter: {id, crop, from}`). Today's is a Mixkit stock clip (28293), with one outfit and one microphone. For different outfits and microphones, she needs new recordings: an AI presenter service, or a real presenter filmed in batches (see the owner's choice).

**Captions:** `caption_style: "bold"`: Anton capitals with the current word in yellow.

**Before posting:**
- YouTube: set "Altered or synthetic content" to Yes (a real person with an AI voice).
- TikTok: switch on the AI-generated label.
- Credits from `credits.txt` go in the description. No betting words; never "AI Analyst".

**Making one:**
1. Research the results with a subagent, from dated sources.
2. Copy the reference file, then set:
   - `picks`: the matches, with scores and stadiums
   - `beats`: the take text, the tally and `ok` (true / false / "half")
   - `say`: the voice lines
3. Render: `bash video/daily.sh render <file>`.
