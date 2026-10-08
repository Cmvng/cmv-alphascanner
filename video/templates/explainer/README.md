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

## Inspiration the owner liked: Fungo Labs' "Are you in?" (7 Oct 2026)

A 17-second product clip (16:9, 60 fps, no voice; only music and interface sounds) for Fungo Labs' whitelist
"pass it" feature. The owner sent it as "a cool video". What makes it work:
- **The real interface, filmed with a virtual camera.** The page is built once, and a camera pans and zooms after the
  cursor: close on the field while it types, wide when the result arrives. The headline slides half out of frame. It
  reads as a live product, not slides.
- **Every interaction is acted out:**
  - the cursor eases in, buttons press down, and the focused field gets a glowing ring;
  - the handle types one letter at a time;
  - the button's label changes ("Pass it" becomes "Pass it to @nomineehandle" with an Edit link), then a loading state
    ("Passing…").
- **Shape first, content second.** The result card grows as a plain yellow block, then its content lands: the logo grid,
  "SPOT PASSED. TO @nomineehandle", "Copy the card", "Post on X".
- **A status pill tells the story without words:** "Waiting for them" becomes "Claimed".
- **The payoff is social proof:** "10 HOLDERS. 10 NOMINATIONS.", with ten avatar cards popping in one by one, each with
  a "1 nomination" chip.
- **A strict palette:** black and one yellow (the brand's own), a soft amber light drifting behind, a tight grotesk for
  the headline and mono capitals for labels. Fades in and out.

**What we take:**
- A "product demo" scene kit: a cursor that moves and clicks, typing, a button whose label changes, a loading state, a
  card that grows then fills, a status pill, and a camera that follows the action.
- Use it for the app (search a team, tap, the pick card builds) and for crypto and Polymarket walkthroughs, redrawn in
  our own UI.
- End on a social-proof grid when there is a real count to show.
- Keep the subject's own palette (the owner's rule), with our blue as the frame.

## Another format: copy trading (`cf_*`, CopyFomo on Fomo, 7 Oct 2026)

Template: `copyfomo-copy-2026-10-07.json` (sources in `video/out/explainer-copyfomo-2026-10-07-sources.md`). A product
walkthrough that starts from the owner's own app recording and a market number, in the "product demo" style of the Fungo
Labs clip.
- **`rec`:** the owner's screen recording plays inside a phone on any beat:
  `"rec": {"file": "<path from video/out>", "from": 0, "to": 6.6, "speed": 0.6}`. make-video cuts the frames, and the
  page waits for each frame to decode.
- **Beats:**
  - `cf_cold`: three big numbers over the recording, in deep blue;
  - `cf_title`: drop;
  - `cf_mkt`: two bars and a stamp;
  - `cf_red`: the recording, plus a tally of coins read off it (`tape`), red against green;
  - `cf_hot`: trending cards;
  - `cf_tide`: a crowd of traders, bull then bear;
  - `cf_top`: a leaderboard board, a stamp and week bars;
  - `cf_bot` / `cf_live`: a Telegram chat. `msgs` take `me`, `bot` (with `rows`, `btns`, `tapbtn`, `tap`), `shot` (a
    profile screenshot) or `note`, each timed by `at: [line, word regex, fallback fraction, offset]`. `pill` is a status
    pill;
  - `cf_set`: twelve questions, with detail cards (`hits`) and an arm button;
  - `cf_rules`: rules and a quote card;
  - `cf_end`: logo, title and chips.
- **The subject's look:** `explainer.brand.logo` (their profile picture in `video/out/brand/`); the app's own colours on
  every app piece. Bot screens are labelled "redrawn from the docs", and example trades are labelled as examples.
- **Words with numbers in them:** the timing regex matches the caption's words, which show digits ("$33.1", "78%"),
  not the spoken words. Match the digits, or rely on the fallback fraction.

## Another format: "Planet Fungo" (`nd_*`, a nature-documentary fan film, 8 Oct 2026)

Template: `fungolabs-planet-2026-10-08.json` (sources in `video/out/explainer-fungolabs-planet-2026-10-08-sources.md`).
The owner asked for "a dope fun video" for Fungo Labs' whitelist. Instead of explaining the product again, it continues
the project's own latest clip (the bear whispers a secret, the bunny zips its mouth) as a wildlife documentary.
- **The voice:** `bm_george` (a British male Kokoro voice, `en-gb`) at 0.95, hushed and slow, like a wildlife film.
- **The look:** pixel art drawn as SVG (crisp edges). Night in deep royal blue for the cold open, then a light morning sky.
  The island (grass, stepped earth), their yellow mushrooms and the Z block are drawn once. The bunny and the bear are
  hand-drawn fan art, with faces that can be swapped (`ndFace(eyes, mouth)`) and a zipper drawn tooth by tooth
  (`ndZip`). Their own four creatures come from `explainer.brand.art`.
- **The documentary frame:**
  - a "Night cam" tag and a running timecode (`clock`);
  - a lower third for each "species" in made-up Latin (`l3: [name, latin]`, `l3_at`, `l3_hold`);
  - pixel speech bubbles (`ndBub`; tails `nd-tail-l` / `nd-tail-r`).
- **Beats:**
  - `nd_cold`: the whisper (ciphertext in the bubble), the gasp, the zip in the tail;
  - `nd_title`: sunrise and the title on the drop;
  - `nd_whale`: a bag of money and a sad trombone;
  - `nd_bot`: a scan beam, a read-out (`term` rows; `hex` rows scramble) and "READ: DENIED";
  - `nd_crowd`: their cats and king drop in to a sealed listing;
  - `nd_makers`: their quote on a yellow card;
  - `nd_holder`: a close-up, the unzip, the holder's card, the tagline;
  - `nd_end`: the whitelist bar and the owner's application.
- **Sound:** night crickets (Mixkit 1789), a whisper (302), a cartoon gasp (967), a synthesised zipper (`zip` in
  `audio.py`), a boing (2894), bubbles (729), a sad trombone (744), computer sounds (3122, 2847), a meow (92) and a fairy
  sparkle (871).
- **The betting-word check runs here too:** their site's "Nobody picks what you get" was flagged ("picks"), so the video
  quotes their 6 Oct post, "Nobody gets to choose. Not even us."
