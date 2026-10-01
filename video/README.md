# cmvng picks videos

Fill in a short template with your matches and picks. The tool makes a vertical (9:16) video, about a minute long, in the cmvng style.

- **Opening (first 3 seconds):** a big "5 PICKS TODAY" that slams in, with the stadiums cutting on the beat.
- **For each match:**
  - The home team's real stadium behind it.
  - The teams slide in, then the pick card slams in with the price.
  - The bookies' % is shown against our model's %.
  - The **cmvng Signal** lights up 1, 2 or 3 bars of the logo.
- **The slate:** how a stake splits by bars.
- **Call to action:** results tonight.

Sound:
- A natural presenter voice (Kokoro) reads it like a person would. Captions highlight each word as it's spoken.
- A beat-driven music track sits under the voice, and every cut lands on the beat.
- Sound effects fire on every reveal: a whoosh on each cut, an impact when the pick lands, ticks as the bars light, and a ding or thud on results.

After the games, the same file with each pick's result makes a second video: **won/lost board → scoreboard for each pick (WON ✓ / LOST ✗) → money staked, returned and profit → next picks**. See [The results video](#the-results-video-after-the-games).

## What you give it

One row (or block) per match. Only six things are required. Everything else is optional, and a card simply leaves out anything you don't fill in.

| Field | Required? | What it is | Example |
|---|---|---|---|
| `home`, `away` | ✅ | Team names | `Germany`, `Serbia` |
| `pick` | ✅ | The bet, as it should appear on screen | `Germany to Win` |
| `odds` | ✅ | The bookmaker's price | `1.21` |
| `model` | ✅ | Your % chance for the pick | `80` |
| `kickoff` | | Kick-off time (Lagos) | `19:45` |
| `home_win`, `draw`, `away_win` | | Your % for each result (all three or none) | `79`, `15`, `6` |
| `xg_home`, `xg_away` | | Expected goals | `2.49`, `0.66` |
| `form_home`, `form_away` | | Last 5 results, **oldest → newest** | `WLDDL` |
| `scored_home`, `scored_away` | | Goals scored per game | `2.5`, `1.1` |
| `conceded_home`, `conceded_away` | | Goals conceded per game | `0.7`, `1.4` |
| `rating_home`, `rating_away` | | A team rating such as Elo | `1884`, `1697` |
| `note` | | One line shown under a value pick | `Kosovo have scored in 9 of 10` |
| `say` | | How the voice should say the pick, if different | `Germany to win` |
| `signal` | | Override the cmvng Signal for this pick (1, 2 or 3 bars) | `3` |
| `stadium`, `stadium_credit` | | Your own background photo (file or URL) and its credit line, instead of the automatic stadium | `photos/enyimba.jpg` |
| `crest_home`, `crest_away` | | Your own crest image (file or URL). **Only use crests you have permission to use** | `crests/enyimba.png` |

For the whole video (top of the file):

| Field | Default | What it does |
|---|---|---|
| `competition` | | Shown on the intro and every match card |
| `date` | | `YYYY-MM-DD` |
| `title` | `"5 Picks"` | Worked out from the number of picks |
| `stake_example` | `10000` | The amount the slate splits across the picks by Signal bars |
| `currency`, `currency_word` | `₦`, `naira` | The symbol on screen and the word in the voiceover |
| `signal` | `{ "strong": 0.05, "good": 0 }` | Edge needed for 3 bars (5%+) and 2 bars (any edge). Anything else is 1 bar |
| `skip_negative_edge` | `false` | Set to `true` to drop 1-bar picks (your % below the bookmaker's) |
| `results_when` / `next_when` | `tonight` / `tomorrow morning` | When the next video comes out (said at the end) |
| `stadiums` | `true` | `false` = no stadium photos (plain cmvng background) |
| `cta` | `cmvngpicks.com` | `{ "url", "say" }` for the last card |
| `voice` | `af_heart` | Kokoro voice: `af_heart`, `af_bella` (female, the most natural) · `am_michael`, `am_fenrir` (male) · `bf_emma`, `bm_george` (British). Or a Piper `.onnx` file |
| `voice_speed` | `1.12` | 1 = the voice's normal pace |
| `music` | `auto` | `auto` = the built-in track, `false` = none, or a path to your own track (plus `music_start`: the second where its beat drops) |

Templates to copy:
- `templates/picks.blank.json`: empty, ready to fill in.
- `templates/picks.template.csv`: the same as a spreadsheet. Fill it in Excel or Google Sheets and export as CSV.
- `templates/picks.example.json`: a filled example (Nations League, 1 October 2026).

## What it works out for you

- **Fair odds** = 100 ÷ your %.
- **Bookmaker %** = 100 ÷ the price. This still includes the bookmaker's margin.
- **Edge** = price × your % − 1. A positive edge means value at this price, on your numbers.
- **The cmvng Signal** replaces "units". It is the three bars of the cmvng logo:
  - **3 bars, Strong:** your % beats the price by 5% or more.
  - **2 bars, Good:** any edge.
  - **1 bar, Light stake:** your % is below the bookmaker's, so the voice says *"thin price: one bar, keep it light"*.
- **Stake split:** amount ÷ total bars = one bar. Each pick gets bars × one bar, rounded down so the total never goes over.
- **Pictures:**
  - National teams get their flag automatically. Flags are public domain, from flagcdn.com.
  - Clubs get a cmvng-style shield in the club's colours with a 3-letter code. Club crests and league logos are trademarks, so they're only used if you add your own via `crest_home` / `crest_away`.
- **Stadium photos:**
  - The home team's ground comes from Wikidata and Wikimedia Commons.
  - National teams with no fixed home use the stadium where they play most often, or the country's biggest stadium.
  - Each photo has a licence (mostly CC BY or CC BY-SA), and the licence requires credit. The credit is printed small at the bottom of the frame and saved in `credits.txt` for the post caption.
  - If a team has no usable photo, the plain cmvng background is used.
- **Voiceover script:**
  - It's built from the numbers using varied presenter lines, so it never invents a stat or says "sure", "banker" or "guaranteed".
  - The voice says prices the way punters do ("one point two eight").
  - It's saved as `script.txt`.

## Making a video

```bash
# Once: install the tools
npm i -D playwright && npx playwright install chromium     # the renderer
pip install kokoro-onnx numpy                               # the voice (the model, ~350 MB, downloads on first run)
# ffmpeg must be installed (https://ffmpeg.org)

# Every time
node video/make-video.mjs my-picks.json            # or my-picks.csv
node video/make-video.mjs my-picks.json --stills   # quick preview pictures of each scene first (no voice)
```

The video lands in `video/out/<file name>/<file name>.mp4`, together with:
- `script.txt`: what the voice says, which also works as the post caption.
- `credits.txt`: photo and music credits to paste into the post.

A 5-pick video runs about a minute and takes about 5 minutes to render on a 4-core machine.

Other options: `--no-voice`, `--fps 30`, `--workers 3`, `--out path.mp4`.

**Music:**
- The built-in tracks are from Mixkit and free to use in videos under the Mixkit Stock Music Free License, including commercial use. Check mixkit.co/license before you post.
  - Picks video: "Never Going Broke". Results video: "K.O.".
- On TikTok and Instagram you can mute the built-in track and add a trending sound in the app instead.
  - Business accounts can only use the platform's commercial music library.
  - The voice and sound effects stay either way, if you post a version made with `"music": false`.

## Auto-fill from cmvngpicks.com

You don't have to type the numbers. Point the helper at your match pages:

```bash
node video/from-cmvng.mjs https://cmvngpicks.com/m/1010233 1023547 1010235 987933 1010232 --out today.json
node video/make-video.mjs today.json
```

For each match it takes the competition, date and kick-off, **the bet** with its price and %, home/draw/away and expected goals (worked out from the scoreline grid), last-5 form, and goals scored and conceded. If a page has no main bet, it uses the first priced pick and adds a `note_check` line telling you to look at it. **Always check the file before making the video.**

## The results video (after the games)

Same picks, same file, plus the outcome. Add `"mode": "results"` at the top and two fields per pick:

| Field | Required? | What it is | Example |
|---|---|---|---|
| `result` | ✅ | `won`, `lost` or `void` | `won` |
| `score` | | Full-time score, home first | `2-3` |

The video runs **"2/5 WON" and the money back → one scoreboard per pick (WON ✓ with a ding / LOST ✗ with a thud, then the profit or loss) → the day's staked, returned and profit → next picks**, about 45 seconds for 5 picks.

Money, not bars. The tool splits `stake_example` across the picks by Signal bars, exactly as the morning video's slate does, then works out:
- **Returned** per pick: a win pays stake × price, a void gives the stake back, and a loss returns 0.
- **The day:** staked, returned, profit or loss, and return on stake.

To show it in dollars, set `"stake_example": 100, "currency": "$", "currency_word": "dollars"`. To show naira, set `"stake_example": 10000, "currency": "₦", "currency_word": "naira"`. Amounts under 1,000 show cents (`$17.50`); bigger amounts show whole numbers (`₦2,300`).

Optional for the whole video:
- `date_label`: what the intro shows instead of the date, e.g. `"Weekend of 19–21 September"`.

A losing day is said plainly: *"That's 32 dollars down. We post every result, wins and losses."* Post the bad days as well as the good ones. Showing only the winners is what makes followers stop trusting a tipster.

Templates: `templates/results.blank.json` (empty) and `templates/results.example.json` (a filled Premier League weekend).

```bash
node video/make-video.mjs video/templates/results.example.json
```

## Getting it straight from the app (the "video brief" page)

The plan:
1. After the morning session, an admin page in the app lists the day's singles in exactly the picks format above, with a **Copy** button.
2. After the games settle, the same page shows a **Results** tab with the same picks plus `result` and `score`.

What the page needs to output, per single:
- From the bet: `home`, `away`, `competition`, `kickoff`, `pick`, `odds` and `model`.
- From the match page: `home_win`, `draw`, `away_win`, `xg_home`, `xg_away`, `form_home`, `form_away` (oldest → newest), `scored_*` and `conceded_*`.
- After settlement: `result` and `score`.

**Ready-made page for the cmvngpicks app:** `app-page/video_brief.py`. Copy it next to `app.py` and add two lines there (see the top of the file). It adds `/admin/video-brief` behind the existing admin lock. The page has Picks and Results tabs, Morning, Evening and All-day filters, `$` / `₦` switches, and a Copy button. It only reads from the database, using your app's own data:
- The published singles (legs with a booking code) come from the `sportybet_accumulators` rows with `tier = 'singles'`.
- The stats and final score come from each match's `match_catalogue` row, found with `_fl4_match_ids722` / `_fl4_leg_mid722`.

Tests: `python3 -m unittest video/app-page/test_video_brief.py`. They run fake app data through the page and then through the video tool.

Leave crests out. National teams get flags automatically and clubs get cmvng shields. Don't copy crest image links from your data provider: those images aren't licensed for your videos.

Turning the copied text into a video needs a computer that can run this tool. An ordinary AI chat can't render it, because it has no renderer, voice or encoder. The options:
- **Claude Code with this repo:** paste the text and say *"make the video"*. It saves the file and runs `make-video.mjs`.
- **Your own computer:** save the text as `today.json` and run `node video/make-video.mjs today.json`.
- **Fully automatic:** a scheduled job on the server runs `make-video.mjs` right after the session and after settlement, then posts the MP4 to Telegram or WhatsApp. This needs a machine with Chromium and ffmpeg. A small VPS is fine, but Vercel functions can't run it.

## Before you post

- Your percentages should be honest. The video shows your model's % next to the bookmaker's. If your numbers run high, every pick gets 3 bars when it shouldn't.
- The Signal is a staking guide for **single bets**, not accumulators.
- Every frame carries "18+ · Predictions, not guarantees · Bet responsibly".
- Platform rules, in short:
  - Keep bookmaker names, booking codes and links **out of the video**. TikTok and YouTube treat those as promoting gambling.
  - Put the website in your bio.
  - Never say "sure", "banker", "guaranteed" or "fixed".
