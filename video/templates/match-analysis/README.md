# The match analysis template

**Reference video:** Denmark v Portugal plus the League A round-up, 1 October 2026 (2:02). The owner approved it as the template for every analysis video.

- `denmark-portugal-2026-10-01.json` is the exact file that made it: app numbers, research, script.
- `frames.jpg` shows the end of each screen, in order.
- `sources.md` lists every researched fact with its source.

**House style:** it is "the analysis" or "match analysis". Never "AI Analyst" on screen, in the voice, in titles or in posts: the owner finds it cringe and low effort, and the render stops if the phrase appears.

Every new analysis video copies this structure, tone and level of detail. Only the facts change.

## The cinematic edit (approved by the owner, 3 Oct 2026: the default for every analysis)

The owner liked the edit of the Packs explainer, asked for it here too, then approved the result ("the dark opening, the cold open, the punchline"). Reference: `croatia-england-2026-10-03-cinematic.json`.

- **Cold open** (`analysis.cold` + `script.pv_cold`): before the title, a dark screen with one big number per line over a
  black-and-white photo (a player to watch, by `player`, or the stadium). Example: "41 years old." (Modrić) / "Still scoring
  for Croatia." / "87 goals for England." (Kane) / "And today, only 100 England fans are allowed in." (stadium, red, with a
  glitch). Steps: `{ big, label, player?, tone: "hot"|"red", glitch, glitch_at }`, one per line; `pauses` and `tail` set the
  silences. Facts only from the sources file.
- **The drop:** the title screen lands on the music's drop, out of a short silence and a reverse swell.
- **Settings:** `"sound": "cinematic"`, `"voice_fx": "deep"`, `"voice_speed": 1.05`, `"music_drop": "pv_hook"`, and
  `"music_vibe"` (e.g. `["dark trap", "trap", "hip-hop"]`) to pick from the drop tracks in `lib/music.json`, which rotate.

## Another format: the blueprint heist ("The Vault", 6 Oct 2026)
Not every analysis has to run through the screens below. On 6 Oct the analysis was told as a heist plan drawn on a
blueprint (`mode: "review"` with `bp_*` beats, drawn by `review.html`; copy `vault-2026-10-06.json`). Use it when one
side is a "vault": a long unbeaten run, a fortress, a defence nobody scores against. Don't use it two days running.
- **The look:** blueprint paper in our blue, white plotter lines that draw themselves, monospace labels, the architect's
  handwritten notes, dossier photos in blue duotone, a title block on every drawing (`review.project`, `review.ref`),
  and the camera panning across one big sheet between drawings. Red only for danger (the alarm, cracks, FAILED).
- **The drawings:** `bp_cold` (numbers in the dark over a faint vault), `bp_title` (unrolls on the drop), `bp_target` (a
  dial counting the run), `bp_alarm` (a 90-minute clock, early goals marked in red), `bp_damage` (a wall cracking under
  the goals conceded), `bp_files` (two dossiers), `bp_plan` (a pitch, expected shapes, the passing as a laser grid,
  arrows and notes), `bp_history` (case files, stamped), `bp_chances` (a gauge, xG bars, the likeliest score),
  `bp_meanwhile` (the other match in the group), `bp_stakes` (the table, called "The prize": "stake" is a banned word),
  `bp_verdict` (our read, the vault shutting, the question).
- **Sound:** a safe dial ticking as the count climbs, the lock, a low alarm, a laser scan, pen on paper (lib/sfx.json).
- **Timing:** most drawings take `line`/`at` hints (which spoken line, how far into it) for when a mark, arrow, stamp or
  note lands. Check every drawing on stills at the real voice timing before the full render.

## Another format: Follow the Sun (a day of games around the world, 7 Oct 2026)
For a slate spread over countries and kick-offs. Reference: `follow-the-sun-2026-10-07.json` (mode "review", screens
`gl_*` in `review.html`).

**The look:**
- A globe (d3-geo, Natural Earth land in warm sand, a pale blue ocean) flies city to city as the kick-offs move through
  the day. The ball follows the great circle.
- At each stop, the night falls where it really is at that kick-off; the sun's position comes from the date and hour.
- The host country is tinted in the home team's kit, and the venue is labelled.
- A timeline of the day (Lagos time) runs along the bottom. The sun moves along it and becomes the moon after dusk.

**Each pick needs:**
- `ko` (Lagos "HH:MM");
- `city: {name, lat, lon, venue, local, iso}`, where `iso` is the numeric country code used for the tint;
- `home_short` / `away_short`;
- `kit` where the crest colour is wrong.

**The screens:**
- `gl_cold`: the globe at night, every city lighting up, one big line per spoken line.
- `gl_title`: FOLLOW THE SUN on the drop, the globe spinning while the day runs from the first kick-off to the last.
- `gl_match`: a stop, made of the kick-off board, the city, the model bar and `points: [[tag, text, line, at]]`.
  Keep it to two spoken lines.
- `gl_deep`: "Inside the game", for the headline games: last five as W/D/L pills, the table, key men, and the read.
  Each block lands on its line (`form_at`, `table_at`, `men_at`, `read_at`).
- `gl_end`: the whole route drawn city to city.

**The cover:** `node video/make-cover.mjs video/out/<slug>.json` after the render, with a `cover` block in the cfg. It
makes `<slug>_cover.png` (1080×1920) and `<slug>_thumbnail.png` (1280×720).

**Lessons from the first one:**
- The pale ocean and sand land are there because a saturated blue globe measured 91% blue.
- Eight stops fit under X's 140 s only at two lines each.

## Another format: "The envelope, please" (the day's games as an awards night, 8 Oct 2026)
For a slate of unrelated games. Reference: `envelope-2026-10-08.json` (mode "review", screens `en_*` in `review.html`).

**The look:** a light stage with a soft spotlight. Every game is a category ("Category 3 / 7"). Two nominee cards
(crest, table line, last five as W/D/L pills, key man) slide in, "The case" card fills row by row (goals for and
against a game, expected goals today, then two researched notes), and an envelope in the home side's colours waits
at the bottom with a wax seal in the away side's colour and the country's flag. On the verdict line the seal breaks,
the flap opens and the verdict card slides out and grows: verdict, likeliest score, and the win-chance bar in kit
colours.

**Each pick needs:** `ko`, `where` (city, or the country when the venue isn't confirmed), `flag` (emoji),
`home_short` / `away_short`, and `kit` where the crest colour is wrong (Al Ain purple; black for U Cluj and ES Sétif).

**The screens:**
- `en_cold`: night, a spotlight, one envelope per game fanning out; one big line per spoken line (auto-fitted).
- `en_title`: THE ENVELOPE, PLEASE. on the drop, with the running order as small envelopes (time and place).
- `en_game`: `head` (the story, auto-fitted), `kicker`, `home` / `away` {line, form, form_label, man, man_tag, stat},
  `stats` (optional override of the app rows), `notes` [[tag, text, line?, at?]], `verdict` {text, short, score},
  `open_at` (default: the last line). Four lines: the setting, the case, a researched angle, "The verdict: …".
- `en_end`: every verdict card open, and "Follow for the post-match".

**Real pictures (the owner, 8 Oct: "This is football you have to show players of the teams in the background and the
stadium or coaches").** Each `en_game` takes `photos: [{src, credit, label, at: [line, frac], pos}]`: the home side's
own ground first (from the start), then the player or coach on the line that talks about him. The page turns deep blue
over the photo and the cards stay white. A key man with a free photo gets a portrait on his card (`home.photo`).
Photos picked by hand live in `video/.cache/media/<slug>/` and the cfg points `media_dir` at it: a full render wipes
`video/out/<slug>/` first, so anything copied there by hand is lost (8 Oct). Check every person's Wikidata clubs and
every stadium's name before using it; skip group photos where it isn't clear who is who.

**Lessons from the first one:**
- The app's form strings run oldest first. Check them against researched results; on 8 Oct two games clashed and
  used the researched last five instead (labelled).
- With five "wow" tracks, the rotation runs out in six videos; grow the pool.

## Another format: "The Blueprint" (each game drawn up as a technical sheet, 9 Oct 2026)
The owner asked for a "creative, clean, dwelling" analysis of 11 games. Each game is one sheet on light-blue drafting
paper. It has a frame with zone markers, a header ("Sheet 03 / 11", kick-off), and a title block at the bottom like an
engineering drawing. Reference: `video/out/analysis-2026-10-09-blueprint.json`. Screens: `dw_cold`, `dw_title`,
`dw_game` (one per game) and `dw_end`.
- **The photo window.** The home ground (or tonight's venue, labelled as such) scans in from the left. It switches to
  players and coaches on their lines.
  - `photos: [{src, credit, label, sub, team, at: [line, frac], fit: 'contain'}]`.
  - Use `fit: 'contain'` for portraits: the full photo sits on a blurred copy of itself, so no face is cropped.
  - `team` colours the label stripe.
- **The pitch draws itself** with the pen sound, at `pitch_at`.
  - At `front_at`, a dashed front line slides from halfway toward the weaker side, by our win chances. The two halves
    are hatched in the kit colours.
  - At `xg_at`, each side's expected goals is drawn as an arrow toward the other goal (3.0 = the full width).
  - The win-chance ruler under the pitch shows the three numbers.
- **Notes:** two cards (`notes: [{label, text, team, at}]`), one fact each, appearing on their words.
- **Form rows** use the app's last five, unless research shows they're wrong. Then use
  `form: {home, away}, form_label: 'Last five · from match reports'`.
- **The title block:** "The verdict" is written in on the last line, which always starts "The verdict:". Then the
  likeliest score slams in, and `verdict.note` gives one number that backs it.
- **Kits:** set `kit` on every pick. The crests' own colours can mislead.
- **Venues:** check them in the research. On 9 Oct, two games weren't at the home club's own ground: Wieczysta play
  at Wisła Kraków's stadium, and Instituto v Boca was moved to the Kempes. Show the real venue and say so on the label.
- **Pace:** four lines a sheet, about 25 s each. The 11-game cut ran 5:17, so split it into three parts for X.

## Another format: "Super Saturday" (a big slate, four in depth and the rest at a glance, 10 Oct 2026)
The owner, with 52 games on the app: *"focus on the top matches and just talk briefly on the other matches so that it's
not be long."* The globe from Follow the Sun, zoomed in to a map of Europe. Reference:
`super-saturday-2026-10-10.json` (mode "review", `gl_*` screens).
- **Choosing the games.** Four headline games get the full treatment (`gl_match` with three lines, and `gl_deep` for
  the two biggest). The rest of the big leagues get one round-up card per league. Leave out the lower divisions and
  small leagues: 23 of 52 games made it in, and the cut ran about three minutes.
- **The map.** `review.globe_r: 1500` zooms every screen in to Europe. Each screen can set its own `r`, `cy` and
  `centre: [lon, lat]`. The land stays sand and the sea pale blue, as in Follow the Sun.
- **The round-up card, `gl_list`.** The map flies from the last stop to the league's country, tints it (`iso` is one
  code or a list) and grows a pin for each listed game. Then one row rises per game on its words:
  - `rows: [{match, lean, note, at: [line, frac]}]`: kick-off, crests, "Home v Away", the model's three-way bar, one
    short researched note, and the lean chip ("Villa 47%").
  - `title`, `sub` and `stop` head the card. Two spoken lines a card, with every game named in them.
  - Order the cards by kick-off around the headline games, and end on the late headline game.
- **Stadium postcards.** `gl_match` takes `photo: {src, label, credit, pos, at}`: the home ground as a tilted postcard
  with the city and kick-off on it ("London · 12:30 today"), and the credit along the bottom.
- **Faces on "Inside the game".** Each `gl_deep` key man can take `photo` (a round avatar). Check every photo by eye
  for the right player and club; the credits are joined at the bottom.
- **Cover:** set `cover.row_max` (6 here) so the crest row fits.

## Another format: "The Tactics Board" (each tie on a coach's whiteboard, 13 Oct 2026)
The owner asked for a "well detailed" Champions League analysis, clean and appealing, with the commentary all the way
through and a "clean and mini cover". Each tie is one whiteboard. Reference: `tactics-board-2026-10-13.json`
(mode "review", `tb_*` screens: `tb_cold`, `tb_title`, `tb_game` one per tie, `tb_end`).
- **The board.** A pitch (620×890) on the left, the home side at the bottom attacking up and the away side mirrored at
  the top. Each side's XI is a row of kit-coloured magnets placed by its formation.
  - `home` / `away`: `{form: '4-2-3-1', xi: [GK, then each line from the team's right to its left], out: [names],
    key: [{i, name, stat, photo, credit, at}], arrows: [{kind, label, at}]}`.
  - `key` turns magnet `i` into a photo magnet that grows on its words, and a card in the side panel. Name tags
    counter-scale, so they stay the same size.
  - `out` names are struck through in red marker under the formation.
  - `arrows` use presets (`right`, `left`, `middle`, `counter`, `press`, `block`, `setpiece`). Each draws on its
    words with a numbered dot; the label goes in the side panel's legend, never on the pitch.
- **Model bar and verdict.** `model_at` shows our three-way bar. On the last line the verdict is written in marker and
  `verdict.score` stamps in as "likeliest". `verdict.short` is the line on the end card.
- **Sound.** A faint stadium crowd (Mixkit 2097, −28 dB) plays under every screen, with a marker squeak on the arrows
  and a magnet click on the players.
- **Pace.** Four lines a board (context, team news and key men, how they play and the model, the verdict), about
  30–32 s each. Five ties ran 2:58, under the three minutes for a Short.
- **Cover.** `cover.style: 'tb'` uses `cover-board.html`: "The Tactics Board." in two sizes, a mini board drawn from
  `cover.feature[0]` (its magnets, the away key man as a photo magnet, one marker arrow), and the crest row.
- **Names on magnets** are short (surname, 14 px). Check crowded lines (a back four with a holding pair) on a still.
- **The post-match ("full time", 13 Oct): `tb_ft` boards** replace `tb_game`, built from the afternoon's config so the
  model numbers and key men match. Reference: `video/templates/post-match/tactics-board-fulltime-2026-10-13.json`.
  - `score: [home, away]` slams into the header; `kicker` carries the venue and half-time score.
  - `goals: [{team, min, name, note, at}]`: each ball drops into the net its team attacks (home: top, away: bottom) on
    its words, and "22' Suárez" is written in marker in that box, in time order.
  - `home/away.key` brings back the afternoon's key men as photo magnets with `res` (what they did, sourced).
  - `call: {text, short, score, result: called|missed|void}` is stamped on `stamp_at` (the words "Called it" or
    "Missed it"). Say the verdict as "Our call: …", never "We said" (heard back as "We set").
  - `tb_end` turns into the scorecard when the boards are `tb_ft`: each row has the real score, our call and a chip,
    then the tally. The cover takes `cover.mode: 'ft'` (the feature tie's goals in the nets, the score on the halfway
    line, crest pairs ringed green or red).

## Two cuts from one file

- **Full** (about 2 minutes, for X and YouTube): `bash video/daily.sh render video/out/<file>.json`
- **Short** (about 60 seconds, for Shorts, Reels and TikTok): `bash video/daily.sh render video/out/<file>.json --short`. The main match only, with no round-up and no tactics screen. Tighter lines go in `script_short`, which overrides `script` screen by screen.

## Platforms

X and YouTube (Shorts up to 3 minutes; X up to 2:20 without Premium). The video is football analysis only, with no betting content, so it can be monetised. Tips videos go to TikTok and Facebook instead.

## Screens, in order

| # | Screen | What it shows | Voice | Length in the reference |
|---|---|---|---|---|
| 1 | `pv_hook` | Both crests, the **headline** (`analysis.headline`, e.g. "Portugal without Ronaldo"), competition and kick-off | The story first, then the match: "Portugal top the group, and tonight they're without Cristiano Ronaldo. It's Denmark, in Copenhagen. Here's the analysis." | aim for 6–7 s |
| 2 | `pv_stake` · What's on the line | The group table, highlighted, and 2 notes | The table, then what a result changes | 12.8 s |
| 3 | `pv_players` · Players to watch | 4 cards: photo, name, role, club and one fact | Two players a side, with the fact that makes each matter | 15.3 s |
| 4 | `pv_tactics` · How they play | Formation diagrams and 3 notes a side | Shape, then the one number that explains their style | 14.7 s |
| 5 | `pv_model` · Our model | xG and the win-chance bar from the app | **Why** the model says what it says, then the three percentages | 12.1 s |
| 5a | `pv_big` · The number (optional, `analysis.big`) | One full-screen stat that explains the model, just before it: `{kick?, num}` or `{kick?, pair: [home, away]}` with both crests, a `label` and an optional `note` chip | The number, then why it matters | first used 5 Oct (France v Belgium: one goal conceded each in three games) |
| 6 | `pv_expect` · What to expect | 3 points and the verdict chip | How the game will look, the key duel, a history fact, then "Our read: …" | 15.3 s |
| 7+ | `pv_round` · Around League A | One screen per other match: its stadium, crests, xG, win chances and 2 notes | One storyline, then the model's favourite | 8.9–14.7 s each |
| last | `pv_cta` | "Follow for more match analysis" | "That's the analysis. Follow for more football, by the numbers." | 5.1 s |

Form and stats screens (`pv_form`, `pv_stats`) are skipped when the app's numbers clash with confirmed recent results. The likely-scores screen is left out of the analyst version.

## What made it work

1. **Lead with the news.** Ronaldo leaving the squad is in the first line.
2. **Explain the model.** Portugal are top, but the model leans Denmark, and the video says why: Portugal were outshot 22 to 12 in Oslo, and Denmark won the last meeting in Copenhagen. Never just read out numbers.
3. **Use confirmed line-ups.** It was made after the teams were announced (about 75 minutes before kick-off), so the formations and players are fact, not prediction.
4. **Give one specific fact per player.** "Scored the only goal the last time Portugal came here" beats "a key player".
5. **Round-up order:** matches from the same group come first, because they affect the main match's table.
6. **Calm analyst tone.** 153 words a minute, at voice speed 1.14.

## How to make one

```bash
node video/from-app.mjs matches                                         # match numbers on the app
node video/from-app.mjs preview --match <main> --with <id>,<id>,<id>    # app numbers for the main match + round-up
```

1. **Research** in parallel:
   - one deep brief for the main match (context and table, team news and confirmed XIs, two key players a side with a current stat, how each plays, the last 3 meetings, storylines, form);
   - one short brief (under 250 words) for each round-up match.
   
   Every fact needs a dated source; mark anything unconfirmed and leave it out.
2. **Fill in** `analysis`, the `round` object for each round-up match, a `stadium` for the real venue, `skip`, and the `script`. Copy the shape of `denmark-portugal-2026-10-01.json`.
   **A likeliest score must fit the call.** When both sides expect about 1 to 1.5 goals, the app's single most likely score is usually 1–1, even for a clear favourite (14 Oct: City 56% to win, yet 1–1 at 12% topped the list). Show the first score in the app's list that fits the called result (a City win → 1–0), or no score at all. On 14 Oct a 1–1 sat under all seven calls and the video had to be rendered again.
3. **Check names:** test new names with Kokoro and whisper, and add respellings to `SAY_NAMES`.
   Then read every line for words the deep voice runs together. Each of these was heard wrong at least once:
   - "and" / "end", "won" / "one", "to" / "two" / "too", "rested" / "arrested";
   - "win to go top" → "went", "edge it" / "edge the" → "edged" (a preview then sounds like a result: say "should edge");
   - "Team nil" (say "Three–nil to Team"), "One–all" (say "One goal each");
   - a "/" in a name ("Bodø/Glimt" is read "Bodø slash Glimt": write "Bodø Glimt" in the voice line).
4. **Render:** `bash video/daily.sh render video/out/<file>.json`. The betting-word check runs first.
5. **Check:** look at a frame from the end of every screen, then transcribe the whole voice with whisper and read it against the script.
6. **Send** the video and the post kit, and save `sources.md` next to it. The kit has:
   - the X post, opening "<Home> v <Away>: tonight's analysis 📊";
   - the YouTube title "<Home> vs <Away>: Match Analysis | <the story>";
   - the description, with photo credits;
   - the tags.
   
   The line "Narrated with an AI voice" goes only at the end of the YouTube description, never in the video.

## The Walk-Out (`wo_*`, CSS 3D players' tunnels, 14 Oct 2026)

Template: `walkout-2026-10-14.json` (sources: `walkout-2026-10-14-sources.md`; build script pattern: one `tie()` per match).
The owner asked for "today's Champions League analysis… take your time on the creative idea". Each tie is a walk down
its players' tunnel, built in CSS 3D (no WebGL), so the crests, photos and text stay crisp and a frame costs about 0.65 s
on three workers.

- **The world** (`woWorld` in `review.html`): perspective 760, the eye at z = 760.
  - Walls, ceiling and floor are 160 px tiles along z. A tile is drawn only when it is wholly in front of the eye, because Chromium draws a plane that crosses the eye badly.
  - The camera is the world's transform: `rotateY(ry) translateZ(d)`, with transform-origin z = 760, so a turn pivots on the eye.
  - The far end is the stadium's own photo under a beam. Each wall has a light strip in that side's kit colour (`kit.c`; the bar and plates use `kit.bg`). The crests are painted near the entrance.
- **A tie** (`wo_tie`):
  - The header slides in: kick-off, crests, venue, "Tunnel 03 / 07".
  - The camera walks in and turns 17° to each key man's poster as he is named (`home.key[].at`). His plate rises with the stat.
  - The model card drops in on `model_at`, showing win chances and expected goals. No app form (on 14 Oct it clashed with confirmed results) and no likeliest score (it was 1–1 for all seven ties, under win calls; see step 2 of "How to make one").
  - On `read_at` the camera accelerates out (cubic), a white flash, then the stadium photo fills the screen and the call slams in (`verdict`, label `Our call`).
  - A key man with no free photo gets a crest poster on a white card with a kit-colour band.
- **Cold open** (`wo_cold`): the tunnel in deep royal blue, with a pair of ceiling lights clanking on per line and the exit glow growing. It has the same `steps` as `tb_cold` (big word, label, tone, glitch).
- **Title** (`wo_title`, `drop: true`): "The / Walk-Out" over the tunnel, with the fixture list. **End** (`wo_end`): a light page with every call.
- **Sound:** footsteps in a tunnel (Mixkit sfx 543), a crowd bed under every tie, a reversed whoosh into the exit and the stadium (2111) as we come out.
- **Voice lessons from the say-check and hear-back:**
  - "Our read" is heard as "I'll read": use "Our call".
  - "Betis beat" is heard as "bet is": "a home win for Betis".
  - Say "PSG", not "Paris Saint-Germain", which was heard as "Paris and German".
  - "goals in ten games" is heard as "and": use "from".
- **Wikimedia:** search Commons by venue name with `commons_search.mjs`-style calls, slowly (it rate-limits). `resolveStadium` takes a team, not a venue, and matched La Cartuja to Camp Nou. Skip agency photos even when they are on Commons (a LUSA photo of Pepê was skipped).
