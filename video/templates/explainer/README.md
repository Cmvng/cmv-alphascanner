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
- The product keeps its own logo, colours and art (the owner, 6 Oct), credited in the description; our blue is the page
  and the frame. Never make it look official (no "<product> × cmvng"). Footer: "Independent guide · not affiliated
  with <product> · not financial advice".
- The betting-word check runs on explainers: say "amount" and "multiplier", never "stake" or "odds".
- Transcribe every voice line with faster-whisper before sending (names, and nothing that sounds like a swear word).

## Another format: "The Keyhole" (light sky-blue page, the subject in its own colours; Fungo Labs, 6 Oct)

A crypto explainer about privacy, told as **who gets to look**. Template: `fungolabs-keyhole-2026-10-06.json` (sources
in `video/out/explainer-fungolabs-2026-10-06-sources.md`).

- **The look (the owner, 6 Oct):** blue is the page, the subject keeps its colours. `explainer.theme: "sky"` gives a
  light sky-blue page, faint drifting hex, white frosted glass and captions in a white pill; the cold open sits in deep
  royal blue (never black) with no header, and the drop floods the screen with light. `explainer.brand` brings the
  subject: its palette as CSS variables (`primary`, `ink`, `cream`, `ok`, `warn`, `bad`, taken from its own stylesheet),
  its mark (`brandMark()` draws Fungo Labs' from their `favicon.svg` geometry) and its art (`art`, `art_bg`). The first
  draft painted everything blue and the owner called it "monotonous"; never do that.
- **Their art, crisp:** their pixel creatures were sampled from their teaser videos back to the exact pixel grid
  (`video/lib/sprite_grid.py`: crop the sprite, find the cell size that lines up with the most edges, take each cell's
  median colour, background to transparent). The PNGs live in `video/out/brand/` (outside git) and the page shows them
  with `image-rendering: pixelated`. Credit them in the description; the stats on screen are labelled an illustration.
- **Beats** (`kh_*`, every move cued to the spoken word through the measured word timings, `WT()` in `explainer.html`):
  - `kh_cold`: a crowd of pixel eyes with coloured irises opens on one of their creatures; white price-tag labels pop
    with wires; "Anyone can look": every eye locks on; "Until now": the eyes snap shut, the art turns to ciphertext and
    their sealed mark appears.
  - `kh_seal` (`drop: true`): the sealed card (their mark on ink), "SEALED." with a yellow highlighter bar wiping in, and
    the holder's eye appearing in the mark's empty centre.
  - `kh_fhe`: an ink black box with a yellow light: enc(7) and enc(5) fly in, enc(12) comes out.
  - `kh_draw`: two 64-bit hex reels on ink spin and lock in yellow, then re-encrypt; a yellow "NOBODY CHOOSES." stamp.
  - `kh_bytes`: eight byte tiles, one colour per meaning (class, each stat, element, reserved), then chance bars in the
    class colours.
  - `kh_peek`: the signature moment. The scene opens through a keyhole, then a wipe handle slides across one card: the
    public's side (their sealed ink and yellow) and the holder's (light, their creature, coloured stat bars); "publish"
    flips the art public while the essence locks "for good".
  - `kh_sale`: the NFT moves from seller to buyer; the seller's eye shuts (red "View ended"), a block ring counts to 96,
    "Wake" opens the buyer's eye (green "Can view") and the creature appears.
  - `kh_duel`: two sealed cards meet, "computing", one wins with no stat revealed; then the road (three nodes).
  - `kh_genesis`: a sunflower of exactly 3,232 dots on an ink disc, its rings lighting in the share colours as each is named.
  - `kh_apply`: four steps; their mark lights two tiles per step, then seals into the real logo; the owner's own
    application card gets a "Sealed" stamp; two safety chips.
  - `kh_end`: the crowd of eyes again: "Seen by all" (all open), "Known by one" (all close; their mark appears with one
    eye in its empty centre).
- **Data keys** that clash with the scene builder: never name a beat field `hold` (it sets the screen's length). The peek
  beat uses `sides` for its two labels.
- **Rendering:** if renders start crashing at random, check `df -h /` first: on 6 Oct a full disk crashed the browser
  again and again. The cold open zooms its canvas inside the drawing and its cards in `.zw`.
