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

## Another format: "The Keyhole" (light sky-blue style, Fungo Labs, 6 Oct)

A crypto explainer about privacy, told as **who gets to look**. Template: `fungolabs-keyhole-2026-10-06.json` (sources
in `video/out/explainer-fungolabs-2026-10-06-sources.md`).

- **The look (the owner, 6 Oct: "my style is light or shades of blue color palette"):** `explainer.theme: "sky"`. A sky-blue
  page, white frosted glass, navy type and deep-blue accents, faint drifting hex behind everything, captions in a white pill.
  The cold open sits in deep royal blue (never black), with no header; the drop floods the screen with light.
- **Beats** (`kh_*`, every move cued to the spoken word through the measured word timings, `WT()` in `explainer.html`):
  - `kh_cold`: a crowd of pixel eyes opens on an NFT; white price-tag labels pop with wires ("Its traits. Its rarity.
    Its rank."); "Anyone can look": every eye locks on; "Until now": the eyes snap shut, the card turns to ciphertext, a lock.
  - `kh_seal` (`drop: true`): the sealed card with our keyhole mark and a huge "SEALED." with a light sweep.
  - `kh_fhe`: a black box (the contract): enc(7) and enc(5) fly in, enc(12) comes out, "It never sees 7, 5 or 12".
  - `kh_draw`: two 64-bit hex reels spin and lock, then re-encrypt; a "NOBODY CHOOSES." stamp.
  - `kh_bytes`: eight byte tiles light by group as they're named, then animated chance bars.
  - `kh_peek`: the signature moment. The scene opens through a keyhole, then a wipe handle slides across one card: the
    public's side (deep blue, sealed) and the holder's (light, everything visible); "publish" flips the art public while
    the essence locks "for good".
  - `kh_sale`: the NFT moves from seller to buyer; the seller's eye shuts, a block ring counts to 96, "Wake" opens the buyer's eye.
  - `kh_duel`: two sealed cards meet, "computing", one wins with no stat revealed; then the road (three nodes).
  - `kh_genesis`: a sunflower of exactly 3,232 dots, its rings lighting as each share is named.
  - `kh_apply`: four steps light up, the owner's own application card gets a "Sealed" stamp, two safety chips.
  - `kh_end`: the crowd of eyes again: "Seen by all" (all open), "Known by one" (all close but one glowing eye).
- **Our own art only:** a keyhole mark and mirrored 10×10 pixel creatures generated from a seed (`creatureSvg`). Never the
  project's logo, art or trailer when we aren't partnered, and label the NFT on screen "Illustration".
- **Data keys** that clash with the scene builder: never name a beat field `hold` (it sets the screen's length). The peek
  beat uses `sides` for its two labels.
- **Rendering:** a full-screen canvas inside a scene that is itself scaled crashes Chromium's compositor, so the cold
  open zooms its canvas in the drawing and its cards in `.zw`. And if renders start crashing at random, check `df -h /`
  first: a full disk crashes the browser too (6 Oct).
