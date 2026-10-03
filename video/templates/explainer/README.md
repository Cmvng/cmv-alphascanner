# Explainer videos (motion graphics)

A vertical explainer for a product or idea (first one: Packs on Limitless, 3 Oct 2026). Every screen is a beat in
`explainer.beats`, drawn by `video/explainer.html` with animated cards, a phone mockup and counters, timed to the voice.

```bash
cp video/templates/explainer/limitless-packs-2026-10-03.json video/out/explainer-<topic>.json   # then rewrite the beats
bash video/daily.sh render video/out/explainer-<topic>.json
```

## The approved sound (owner, 3 Oct)

| Setting | Value | What it does |
|---|---|---|
| `voice` | `af_heart` | the female voice |
| `voice_fx` | `deep` | a touch lower, warmer and more present, with a small room (`VOICE_FX` in `audio.py`) |
| `voice_speed` | `1.0` | unhurried: the voice needs room to carry presence |
| `sound` | `cinematic` | recorded Mixkit effects on every move (`fxCinematic` in `explainer.html`, list in `lib/sfx.json`) and a peak limiter |
| `music_track` | `720` or `370` | a "drop" track from `lib/music.json`: 720 "New Bass 01" (deep tech bass) or 370 "Sparta" (dark trap). The owner liked both |
| `music_drop` | `hook` | the track's drop lands on the cut into that screen; the music stops just after the last line before it, so the drop hits out of silence |

## The opening (cold open → drop)

1. `cold`: a dark screen, one number, one ticket. Short lines with dramatic `pauses` ("$10." / "One ticket." / "$172 back,
   if every leg lands." / "Or nothing at all."), a heartbeat under it, a digital glitch on "nothing", then silence and a
   reverse swell (`tail` sets how long the silence holds).
2. `hook` with `"drop": true`: the title slams in on the drop ("This is a Pack, on Limitless. And here is exactly how it works.").

A line can be `{ "say": "Ten dollars.", "show": "$10." }` when the voice should say it differently from the captions.

## Screens

`cold`, `hook`, `stack` (legs fly into a ticket and the multiplier counts up; with `cue` each leg flies in on its own
line), `rule`, `start` (phone: sign in → balance), `buy` (phone: amount → to win → buy), `track`, `custom`, `pvp`,
`numbers`, `smart`, `outro`. Chapter names go in `explainer.chapters`, the footer line in `explainer.foot`.

## Rules

- Facts only from the product's own docs and app, each one in a `-sources.md` next to the video.
- Our own redrawn screens and no product logo unless the owner is partnered. Footer: "Independent guide · not affiliated
  with <product> · not financial advice".
- The betting-word check runs on explainers: say "amount" and "multiplier", never "stake" or "odds".
- Transcribe every voice line with faster-whisper before sending (names, and nothing that sounds like a swear word).
