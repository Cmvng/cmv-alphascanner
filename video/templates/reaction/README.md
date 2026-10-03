# Reaction to our analysis (the approved format)

Approved by the owner on 1 October 2026: the **presenter** version. Reference file: `tonight-2026-10-01-presenter.json`.

Second reference: `analysis-review-2026-10-02.json` (France v Italy plus the round-up). It saves the main match for last as the finale, and uses World Cup photos of France and Belgium plus player photos as the background.

**What it is:** our pre-match analysis takes against the real results, in the style of the example the owner sent, but with no tips and no odds, so it can earn on YouTube and X.

**How each match runs:** fixture card → white "Our take" card → the final score → a big running tally (1/1 ✅, 1/2 🤏, 1/3 ❌), with a boom, then a cheer or a sad trombone. One honest, lively voice line per beat.

**Background:** real 2026 World Cup action photos of each team's own players, from Wikimedia Commons (`lib/teamphotos.mjs`, players in `lib/squads.json`), cut every two beats with push-ins and credited. Teams without World Cup photos use player photos (`people`) or their stadium. **Never broadcast footage.**

**Presenter:** a green-screen clip keyed to the bottom of the screen (`presenter: {id, crop, from}`). Today's is a Mixkit stock clip (28293), with one outfit and one microphone. For different outfits and microphones, she needs new recordings: an AI presenter service, or a real presenter filmed in batches (see the owner's choice).

**Captions:** `caption_style: "bold"`: Anton capitals with the current word in blue.

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

## The cinematic edit (approved by the owner, 3 Oct 2026: the default for every post-match video)

Same edit as the explainer and the analysis, on top of the approved format (the presenter and the female voice stay):

- **Cold open:** a beat `{ "type": "rx_cold", "say": [...], "steps": [{ big, label, tone: "hot"|"green"|"red", glitch }],
  "people": [player names for the black-and-white photos, one per line], "pauses": [...], "tail": 0.5 }` first. No
  presenter in it. Example: "This morning, we made four calls." (4) / "Four matches. Ninety minutes each." (90) /
  "Tonight, the scores came in." (?, glitch).
- **The drop:** put `"drop": true` on the `rx_intro` beat; its title and the presenter land on the music's drop.
- **Sound:** `"sound": "cinematic"`: real stadium crowd when we called it, a digital break and a low thud when we missed,
  recorded hits and whooshes elsewhere. Meme screens keep their comic sounds.
- **Settings:** `"voice_fx": "deep"`, `"music_drop": "rx_intro"`, optional `"music_vibe"`.

## Prediction-market plays (Polymarket)

`polymarket-2026-10-02.json` is the reference: the presenter, then one `pm_pick` card per app pick (the app's pick and confidence, the Polymarket question, our side lit green, the price and "$100 → $X"), a `pm_slate` and a `pm_outro`. The rules for converting picks are in `.claude/skills/cmvng-video/SKILL.md` ("Prediction-market plays"). Refresh prices with `python3 video/lib/pm_prices.py <file>` before rendering.

## Presenters and voices

Set `presenter` in the file. Every type sits at the bottom of the screen on the reaction (`rx_`) and Polymarket (`pm_`) screens.

| Type | Setting | Look |
|---|---|---|
| Green-screen clip | `{id: 28293, crop, from}` (Mixkit id, or `file`) | Cut out over the background (the approved female presenter) |
| Several angles | `{clips: [{id}, {id}, ...]}` | Switches angle screen by screen |
| Studio cam | `{box: true, clips: [{id: 2955}, {id: 2960}, {id: 2956, crop: "1440:810:480:150"}]}` | A framed "cmvng studio · live" panel. Clips 2955, 2960 and 2956 are one male presenter at a studio mic, filmed from three angles (Mixkit free licence) |
| Owner photo | `{photo: "<cut-out .webp/.png>"}` | A still cut-out with breathing, a small lift on each spoken word, and a punch on every result |

**The owner's photo** is kept in `video/.cache/pundits/`, outside git, because it's personal:
- `owner_mic.webp` is cut out with rembg (birefnet-portrait), and the phone in the hand is repainted as a cmvng microphone.
- `owner_front.jpg` is a front-facing photo, for a lip-synced talking version later.

**Voices:** `voice` takes a Kokoro voice, or a blend such as `"am_michael:0.5+am_onyx:0.5"` (American male) or `"bm_george:0.6+bm_fable:0.4"` (British male). The female presenter uses `af_heart`.

**Tips videos:** results of Polymarket plays carry `"tips": true`. `rx_take` takes `tag` and `label` (for example "Polymarket · this morning" and "Our play"). `rx_reveal` takes `stamp` instead of `n`/`of` for a moment outside the count. `rx_outro` takes `warn` for the 18+ line.

## Voice check: names and auto-captions

Transcribe every line before sending. If a name could be misheard as a swear word, say it another way and keep the name on screen only. For example, "Alajbegović levelled" was heard as "…bitch levelled", so the line became "Bosnia levelled with ten minutes left". YouTube's auto-captions can limit ads on a video with swearing.
