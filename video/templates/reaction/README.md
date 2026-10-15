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

**Mixing in post-match screens (4 Oct 2026):** any `review.beats` screen from `video/templates/post-match/` can sit between the
reaction screens. Write its type without the prefix (`"table"`, `"quote"`, `"stats"`): the renderer adds `rv_` itself, so
`"rv_table"` becomes `rv_rv_table` and draws nothing. Example: a `table` beat ("Group 4 now") after the main match's reveal.
Keep its `title` short (about 12 characters) so it fits the screen.

## Judged on the result, extras on their own chip (13 Oct 2026)

Reference: `ucl-2026-10-13-reaction.json` (five Champions League ties, 4 from 5). The owner: "you called the match right
with the proper analysis and you still marking yourself wrong."
- `ok` on `rx_reveal` is the **result** (did the team we backed win). Anything added to it (goals at both ends, a clean
  sheet, the margin) goes in `extra: {text, ok, at: [line, frac]}`: a white chip on the score card, "Extra read …
  YES/NO". Say it plainly in the voice, then the verdict: "Lens never scored, so the extra read missed. But the result?
  Called it."
- `tally_at: [line, frac]` lands the big n/of tally on the words "Called it" / "we missed", not before them.
- Order the games for a story: three from three, then the miss, then the big one as the finale.
- `rx_cold` takes `tint: 'blue'` for a royal-blue cold open (the owner: never black).
- Photos: each venue's stadium (`picks[].stadium`) and the players who decided it (`people`); check every one by eye.
  When a scorer has no free photo (Tresoldi, Rrahmani on 13 Oct), use the other players and the stadium.
- Rendering: the presenter cut-out takes about 15 minutes, and a full render about 25. Check `df` first: Chromium keeps
  deleted temp files open, so free disk drops by ~2 GB mid-render and a full disk crashes a worker. If a render dies,
  `--resume --keep-segs 1,2` keeps the presenter frames and any finished segments.

## Seven ties in one video (14 Oct 2026)

Reference: `ucl-2026-10-14-reaction.json` (the seven Walk-Out ties, 3 from 7, 2:19). The config was generated from the
analysis file by a short script, so the picks, kits and crests came straight across.
- **Fit X (140 s):** 7 ties fit at the approved pace when each call line is one sentence and each result line is about
  25 words. The first render was 141.5 s, so it cost a second render. The stills estimate ran about 6 s long (147.6 s
  against 141.5 s), so trim until the estimate is under about 145 s before the first full render.
- **Names on the cards:** the cards print `home` / `away` as they are. When the app's names are raw ("Bodoe/Glimt",
  "Shakhtar D", "Como 1907"), set the proper name and point `crest_home` / `crest_away` at the cached crest
  (`.cache/crests/<app name slug>.png`) so the badge doesn't change.
- **Stickers:** `sticker: {x: 50, y: 790}` puts the emoji left of the presenter, below the score card. The old
  `x: 760, y: 330` covered the away team's crest.
- **Photos:** look at all of them on one sheet before rendering. Drop snapshots and photos where the player is a speck,
  and leave out players with no free photo: the stadium carries their beat.
- **Cover frame:** take it in the gap between the last result line and the outro (no caption, tally still up), and
  check the presenter's eyes are open. Build the cover in scratch and copy it in after the render.
- **Stills cost time here:** each stills run redoes the presenter cut-out (about 10 minutes), so check the photos and
  names first and run one stills pass, not several.

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
