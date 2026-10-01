# cmvng picks videos

Fill in a short template with your matches and picks. The tool makes a vertical (9:16) video in the cmvng style, with a voiceover, word-by-word captions and soft music:

**intro board → for each match: matchup card, stats card, pick card → stake-split recap → outro**

After the games, the same file with each pick's result makes a second video: **won/lost board → scoreboard for each pick → money staked, returned and profit → outro**. See [The results video](#the-results-video-after-the-games).

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
| `units` | | Override the units for this pick | `7.5` |
| `crest_home`, `crest_away` | | Your own crest image (file or URL). **Only use crests you have permission to use** | `crests/enyimba.png` |

For the whole video (top of the file):

| Field | Default | What it does |
|---|---|---|
| `competition` | | Shown on the intro and every match card |
| `date` | | `YYYY-MM-DD` |
| `title` | `"5 Picks"` | Worked out from the number of picks |
| `stake_example` | `10000` | The amount the recap splits across the picks |
| `currency`, `currency_word` | `₦`, `naira` | The symbol on screen and the word in the voiceover |
| `units` | `{ "value": 7.5, "small": 5 }` | Units for picks with a positive or negative edge |
| `skip_negative_edge` | `false` | Set to `true` to drop picks where your % is below the bookmaker's |
| `cta` | `cmvngpicks.com` | `{ "url", "line", "say" }` for the outro |
| `voice` | `en_US-ryan-high` | Any [Piper voice](https://huggingface.co/rhasspy/piper-voices), e.g. `en_GB-alan-medium` |
| `music` | `true` | `true` = built-in soft bed, `false` = none, or a path to your own track |

Templates to copy:
- `templates/picks.blank.json`: empty, ready to fill in.
- `templates/picks.template.csv`: the same as a spreadsheet. Fill it in Excel or Google Sheets and export as CSV.
- `templates/picks.example.json`: a filled example (Nations League, 1 October 2026).

## What it works out for you

- **Fair odds** = 100 ÷ your %.
- **Bookmaker %** = 100 ÷ the price. This still includes the bookmaker's margin.
- **Edge** = price × your % − 1. A positive edge means value at this price, on your numbers.
- **Units:** a positive edge gets 7.5 ("Value") and anything else gets 5 ("Small stake"). A negative-edge pick also shows *"Thin price… keep the stake small"*.
- **Stake split** for the recap: amount ÷ total units = one unit, then units × one unit for each pick. Stakes are rounded down so the total never goes over the amount.
- **Pictures:**
  - National teams get their flag automatically. Flags are public domain, from flagcdn.com.
  - Clubs get a cmvng-style shield in the club's colours with a 3-letter code. Club crests and league logos are trademarks, so they're only used if you add your own via `crest_home` / `crest_away`.
- **Voiceover script:** built from the numbers using fixed sentence patterns, so it never invents a stat or says "sure" or "banker". It's saved as `script.txt`, which also works as the post caption.

## Making a video

```bash
# Once: install the tools
npm i -D playwright && npx playwright install chromium     # the renderer
pip install piper-tts numpy                                 # voice + music (optional; without them you get captions only)
# ffmpeg must be installed (https://ffmpeg.org)

# Every time
node video/make-video.mjs my-picks.json            # or my-picks.csv
node video/make-video.mjs my-picks.json --stills   # quick preview pictures of each scene first
```

The video lands in `video/out/<file name>/<file name>.mp4`, together with `script.txt`. A 5-pick video runs about 2 minutes and takes about 5–10 minutes to render on a 4-core machine.

Other options: `--no-voice`, `--fps 30`, `--workers 3`, `--out path.mp4`.

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

The video runs **results board → one scoreboard card per pick (WON ✓ / LOST ✗ stamp, stake → returned) → the day's totals → outro**, about 50 seconds for 5 picks.

Money, not units. The tool splits `stake_example` across the picks by units, exactly as the morning video's recap does, then works out:
- **Returned** per pick: a win pays stake × price, a void gives the stake back, and a loss returns 0.
- **The day:** staked, returned, profit or loss, and return on stake.

To show it in dollars, set `"stake_example": 100, "currency": "$", "currency_word": "dollars"`. To show naira, set `"stake_example": 10000, "currency": "₦", "currency_word": "naira"`. Amounts under 1,000 show cents (`$17.50`); bigger amounts show whole numbers (`₦2,300`).

Optional for the whole video:
- `date_label`: what the intro shows instead of the date, e.g. `"Weekend of 19–21 September"`.
- `day_label`: what the voice says, e.g. `"This weekend"` → *"This weekend's results: two won, three lost."*

A losing day is said plainly: *"That's down 32 dollars on the day. We post every result, good days and bad."* Post the bad days as well as the good ones. Showing only the winners is what makes followers stop trusting a tipster.

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

Leave crests out. National teams get flags automatically and clubs get cmvng shields. Don't copy crest image links from your data provider: those images aren't licensed for your videos.

Turning the copied text into a video needs a computer that can run this tool. An ordinary AI chat can't render it, because it has no renderer, voice or encoder. The options:
- **Claude Code with this repo:** paste the text and say *"make the video"*. It saves the file and runs `make-video.mjs`.
- **Your own computer:** save the text as `today.json` and run `node video/make-video.mjs today.json`.
- **Fully automatic:** a scheduled job on the server runs `make-video.mjs` right after the session and after settlement, then posts the MP4 to Telegram or WhatsApp. This needs a machine with Chromium and ffmpeg. A small VPS is fine, but Vercel functions can't run it.

## Before you post

- Your percentages should be honest. The video shows your model's % next to the bookmaker's. If your numbers run high, every pick looks like "value" when it isn't.
- Units are a staking guide for **single bets**, not accumulators.
- The outro always carries "18+ · Only stake what you can afford to lose".
