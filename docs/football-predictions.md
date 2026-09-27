# Football predictions (`/football`)

Match predictions for 8 leagues: Premier League, Championship, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie and Primeira Liga.

## How it works

| Piece | File | What it does |
|---|---|---|
| Engine | `src/lib/football/engine.ts` | Loads data, fits the model, predicts matches, backtests. No dependencies. |
| Predictions API | `api/football.ts` | `GET /api/football?league=E0` → next fixtures, power ratings, this season's track record. CDN-cached for 30 min. |
| AI preview API | `api/football-preview.ts` | Claude searches the web for team news and checks the model's numbers against it. CDN-cached for 6 h per match. |
| Page | `src/pages/football.tsx` | Fixtures, power ratings and track record tabs. |
| Backtest | `scripts/football-backtest.ts` | Replays past seasons week by week and compares with bookmaker odds. |

**Data (free, no API key):**
- [football-data.co.uk](https://www.football-data.co.uk): results, half-time scores, xG and bookmaker odds (`mmz4281/<season>/<league>.csv`), plus upcoming fixtures with odds (`fixtures.csv`).
- [openfootball](https://github.com/openfootball/football.json): full season schedules (public domain). Team names are matched to football-data's names automatically by pairing played matches with the same date and score.

**Model:** a Dixon-Coles model.
- Each team has an attack and a defence rating, and there's a league-wide home advantage.
- Goals follow a Poisson distribution, with the Dixon-Coles correction for low scores (0-0, 1-0, 0-1, 1-1).
- Matches are weighted by age (`exp(-0.002 × days)`, so a match from a year ago counts about half).
- Where xG exists, the rating target is a 50/50 mix of goals and xG.
- Promoted teams start from a weak prior; teams relegated from the league above start from a strong one.
- Every market (1X2, double chance, over/under, both teams to score, correct score, half time) comes from the same score-probability grid.

## Accuracy

Backtest over 2024-25 and 2025-26 (5,832 matches, model refitted every week on past data only):

| | Result called right | Log loss |
|---|---|---|
| Model | 51.2% | 0.996 |
| Bookmakers (closing odds) | 53.2% | 0.975 |
| Know-nothing guess | — | 1.075 |

The model gets close to the bookmakers but does not beat them. Betting on every outcome where the model was 5%+ above the odds returned −18%. The app says so on the Track record tab.

## Running things

```bash
npm run football:backtest              # accuracy report for the last 2 seasons
npm run football:backtest -- --grid    # try a grid of model settings
npm run football:backtest -- --write   # refresh src/lib/football/backtest-summary.json (shown in the app)
```

The backtest needs Node 22.6+ (it runs TypeScript directly).

The AI preview needs `ANTHROPIC_API_KEY` in Vercel's environment variables (the same key `api/claude.ts` uses). It calls `claude-opus-5` with web search (up to 4 searches per preview), so each preview costs a few cents. Previews are cached per match for 6 hours. To use a cheaper model, change `MODEL` in `api/football-preview.ts`.

## Ideas for next steps

- Blend the model with bookmaker odds when they're available. This would be more accurate, but it's less of an independent opinion.
- Track predictions over time: store each prediction before kick-off and show a running record.
- More leagues: football-data.co.uk also covers Scotland, Belgium, Turkey and Greece, but openfootball has no schedules for them yet, so fixtures would only come from `fixtures.csv`.
