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

**A script the owner wrote in the first person** (their opinion, "I don't buy it") never gets this house voice: on 27 Oct
the owner called it "so rubbish" on the airdrops video. Use the owner's own recording or a voice the owner picked
(ElevenLabs "Lara", 27 Oct). Recorded lines go in with `"voice": "dir:<folder>"` and `"voice_fx": false`, one
`<line id>.wav` per line (`s0_0`, `s0_1`… as in the render's `sentences.json`). One take of the whole script is cut into
lines with `python3 -P -E video/lib/split_take.py take.mp3 <render>/sentences.json <folder>`, which hears every piece
back.

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

## Another format: the hype edit (`hy_*`, no voice, 8 Oct 2026)

Template: `fungolabs-hype-2026-10-08.json`. The owner's pick after "Planet Fungo" scored 1/10: a fun or "dope" video is
music-led, not narrated.
- **Two scenes:**
  - `hy_cold` (`hold` 4.0): the hook, the bunny and "I KNOW A SECRET.", then a giant zipper shuts the screen;
  - `hy_reel` (`hold` 23.5): one scene holding seven shots (logo, sealed, choose, seen, known, wl, end), each timed in
    seconds after the drop.
- **The hits:** `explainer.hits` lists the track's kicks in seconds after the drop. Map them from the track's loudness
  first. Sparta: 0, 1.5, 2, 4, 5.5, 6, … and a dead stop from 15.0 to 16.0. Slams, shakes and flashes land on them.
- **Light and dark:** shots with `hy-lite` get a light-blue page, so the big hits cut light and dark.
- **Sound without a voice:**
  - `voice: false`;
  - `music_gap` (seconds of silence before the drop);
  - `music_muffle` ({hz, db}: the build sounds far away until the drop).

## Another format: the voxel film (`vx_*`, 3D, no voice, 8 Oct 2026)

Template: `fungolabs-voxel-2026-10-08.json`. The owner on the flat hype edit: "just looks normal". Their own clips are 3D
voxel art, so this one is built in 3D voxels too: one world, one camera, the words around it.
- **The engine:** three.js (`assets/three/three.min.js`, r160, MIT), loaded only when a scene is `ex_vx_*`. Headless
  Chromium draws it with SwiftShader (software WebGL2), about 1.3 s a frame, so a 28 s film takes about 6 minutes on
  three workers. Everything is a function of the global time, so every worker draws the same frame.
- **Layers:** a CSS background per shot (`VX_BG`: deep blue for the hook and the zipper, light blue for the rest, navy
  for the silence), words behind the canvas (`.vx-back`: they get covered by the 3D, like "FUNGO LABS" behind the
  flying tiles), the transparent canvas, then words in front.
- **Shots** (`vxShot`, seconds after the drop): hook, logo (the mark builds from flying voxels on the first three
  kicks), tunnel (the camera flies through the mark's empty centre into a ring of sealed cards, with a wide lens),
  roll (eight byte dice tumble and land, then the seal slams over them), crowd (their creatures in three rows), known
  (the track's dead stop: dark, one beam through the centre onto the bunny), wl (the mark and a 20-cell bar, 4 lit),
  end, zip (a macro on the zipper with the handle).
- **The camera:** `VX_PATHS` keys `[time, position, target]`, joined by a smooth Hermite path that only stops at the
  ends, so a move can pass through a key (the centre of the mark) without stopping. Every hit kicks the lens.
- **Models:** `model(voxels)` makes one InstancedMesh per model; sprites become voxels with `vxImgGrid` (their PNGs,
  3 deep). Keep sizes in mind: at distance d the frame is 0.39·d wide and 0.69·d high (fov 38).
- **Check stills at several times per shot:** at the first try the hook was a wall of green (camera too close), the
  crowd was cut off at the sides, the beam lit only the top of the head, and the end mark sat on the words.


## Another format: the narrated 3D explainer (`ax_*`, Axis Robotics, 9 Oct 2026)

Templates: `axis-robotics-2026-10-09.json` (long form, about 4:30) and `axis-robotics-short-2026-10-09.json` (about
1:05). Sources are in `video/out/explainer-axis-2026-10-09-sources.md`. The owner asked for something "very
explanatory, clean motion designs and concepts even the team will be very impressed". The voxel film's three.js world
now carries a narrated story, cued to the spoken word.

- **The engine:**
  - It is the same software WebGL as the voxel film, loaded only when a scene is `ex_ax_*`. `assets/geo/landdots.js`
    holds 2,368 land points for the globe.
  - There is one world. Each scene type shows its own set and camera (`AXF[type]` in `explainer.html`), and the page
    around it holds the words and cards (`buildAX` / `drawAX`).
  - Reflections come from a soft studio prefiltered once (PMREM). A shadow-catcher floor gives everything a soft blue
    shadow on the page.
- **Simulation versus the real world:** every arm, belt and part has a green wire twin, and two clipping planes split
  them at a scan line. All wire on a navy page means "in simulation"; a green line sweeping across turns it solid
  ("deploy on the real line").
- **Scenes:**
  - `ax_cold`: three pedestals (a chip lights, an arm wakes, a near-empty data crate glitches red). With
    `kind: "line"`, it is the parts line in green wire on royal blue instead, the short's hook.
  - `ax_title`: their mark builds rod by rod (twelve rays fly in along their own directions), then a green ring.
  - `ax_gap`: a black tower (text on the internet) beside a few green blocks (robot data), and an outlined gap labelled
    with their phrase.
  - `ax_loop`: a figure-eight track with four gates; a pulse lights each gate as it is named, then more pulses join.
  - `ax_axes`: one task tile multiplied ×5 on each axis as it is named (3,125); the camera pulls back to hold it all.
  - `ax_crowd`: a dotted globe; contributors light up green and upload beams shoot out. The number swaps from
    contributors to trajectories (`big2`).
  - `ax_proof`: the arm misses the part until the selected data arrives, then carries it to the tray. Alongside it
    are 1,200 demonstrations as lines, a scan that picks 600, a results card, and a 40-dot grid.
  - `ax_sg`: their photos on floating cards in front of a white Marina Bay Sands silhouette, plus their video in a card
    (`rec`).
  - `ax_lotus`: the parts line. Two arms pick parts by inverse kinematics and drop them into four bins. It goes from
    real, to simulation, to faster training, to the deploy sweep.
  - `ax_net`: partner logos on black discs orbiting the mark, beside a dated timeline.
  - `ax_end`: the mark with a soft green halo.
- **Cues:** `cue: { key: [line, "word regex", fallback fraction, offset] }`. The regex matches the caption words
  (digits as shown, e.g. "16"). A missing cue falls back to the line's start.
- **Framing in a vertical frame:** at fov 30 the frame is only 0.30·d wide. The first stills had every camera too
  close; work out each shot's width from the distance first. Words anchored to 3D points are kept on screen.
- **Rendering:** about 1 s a frame on three workers.

## The same 3D world, a new story: sim to real (`ax_*`, Axis Robotics, 14 Oct 2026)

Template: `axis-sim2real-2026-10-14.json` (sources in `video/out/explainer-axis-2026-10-14-sources.md`). The owner sent
four of the company's posts (a sim-to-real demo, new Challenger spots, the $AXIS token) and asked for "a clean, well
created video". The 9 Oct engine is reused. The new scenes are built from the posts themselves:

- **`ax_cold` with `kind: "rooms"`:** the randomized room from their demo (an arm, a basket, five everyday objects) on
  deep royal blue, with one look per line ("A yellow room." / "A green one." / "A purple one."). On the last line
  ("None of them exist.") the room glitches into green wireframe. `looks` picks the rooms from `AXR.LOOKS`, their
  simulator's colours.
- **`ax_distill`:** the method as four steps, each cued to its word (`vis`, `rand`, `real`):
  - the RL expert works at 1.7× in wireframe on navy;
  - the camera appears with its field of view, and a **second camera renders live into a corner of the same canvas**
    (scissor and viewport, after the main render), framed by `.ax-ins` ("What the camera sees");
  - the walls change look every 0.42 s with a tick (visual randomization), and the light changes with them;
  - the deploy sweep: the room has its own clip plane (`clipR`) in camera space, so it dissolves behind the green line
    while the arm stays solid.
  Every episode re-places the objects at random (`axRoomPos`: five of twelve slots, jittered), and the arm fetches the
  juice box into the basket by inverse kinematics (`axRoom`).
- **`ax_demo`:** their own video, which has sim and real side by side, shown as two cards (sim above, real below). Each
  card shows one half of the same frames (`.ax-half`, image at 200% width), and `recAt` now updates every `img.rec` in
  a scene.
- **`ax_chal`:** 63 contributor tiles arrive row by row; a green scan passes; the picked ones rise in green with a
  badge. Their Challenger artwork drops in on `card` and leaves on `card_out`; the chips are cued `c0`…
- **`ax_token`:** a dark coin with their mark and a green band spins down into place. The allocation ring (SVG) is
  centred on the coin's projected position, and each segment draws on its cue (`a0`…). Labels show only for shares
  of 9% or more (`label_min`); the legend lists all of them in two columns.

**Voice lessons (checked before the first render, as the 9 Oct entry asked):**
- "AXIS" mid-sentence was heard as "Access" again. "The AXIS token" (full vowel) was heard right.
- "sim-to-real" came out as "Simterreal"; "sim to real work" is clear.
- So: run every brand-name line through Kokoro, the deep voice effect and whisper first (`audio.py speak` on a small
  `sentences.json`, then `ab_hear.py`), about two minutes.

**Facts:** the token figures come from the docs' tokenomics page, which says they "may change before TGE". So the video
says it; it gives no price or listing, and the note "not financial advice" is on screen. Where the company's own
sources disagreed (how often Challenger tasks come out, the contributor count), the fact was left out.

## Another format: the glass film (`pr_*`, Primus Labs, 14 Oct 2026)

Template: `primus-glass-2026-10-14.json`. Sources: `video/out/explainer-primus-2026-10-14-sources.md`. The owner asked
for "a video on this project", with four posts as sources, and "take your time". The one idea is **glass**: on a public
chain every wallet is clear glass, and the product frosts it, so the money stays in the system but the numbers blur.

- **The engine** (`PR` in `explainer.html`, loaded for `ex_pr_*`) is a separate three.js world from `ax_*`. It
  differs in two ways:
  - **Real frosted glass:** `MeshPhysicalMaterial` with `transmission: 1`. Roughness 0 is clear and 0.4–0.55 is frosted:
    whatever sits behind or inside truly blurs, and animating `roughness` frosts it over in front of you.
    - Two rules make it work. First, **the canvas is opaque and the page is in the scene** (a gradient sky sphere and a
      floor grid). Transmission only sees what is drawn in 3D, so with an HTML background the glass shows white.
    - Second, **glass is `toneMapped: false`**. With ACES, the bright page seen through glass came out grey.
    - Labels inside glass must be opaque (`alphaTest`, not `transparent`), or the glass doesn't see them.
    - **Keep `ior` at 1.5 and make the glass thin (`thickness` 0.4).** three.js scales the frost blur by `ior × 2 − 2`, so
      ior 1.25 halves it and the frosted panes looked clear. Thick glass (0.9) refracted labels, coins and rings into
      doubles. Thin glass at ior 1.5 gives the full frost and no ghosts.
    - Anything behind glass that must not show twice: keep it out of the glass (the cold open's amounts float above
      the wallets). Making it `transparent` hides it entirely, because the glass's depth occludes it.
  - **Their mark from their own logo paths:** the site's SVG `d` strings, parsed (M/L/H/V/C/Z) into three.js shapes and
    extruded, an orange square with a white bracket and key on its face.
- **Scenes:**
  - `pr_cold`: twelve glass wallets on deep royal blue (fov 40). The amounts count up on line 2 (the front six only;
    the back rows overlap). A coin hops on line 3 with a trail and a ring following it, and the edges go red on the twist.
  - `pr_title`: the mark behind a frosted pane that clears (`clear` cue) and lifts away fast. The wordmark is their SVG
    as an `<img>`, and the tagline is two lines.
  - `pr_duo`: "hidden" versus "confidential". The left wallet leaves the hub (its pipe greys, its flow stops) and turns
    into an opaque black box. The right wallet keeps its flow, grows yield bars, and frosts on `private`.
  - `pr_vault`: one vertical column. A gold $U falls through a frosted FHE gate and turns into an orange eU **exactly at
    the glass**, using two clip planes at the gate's height (gold above, orange below, same position). Then it goes down
    a frosted tube (sent privately) into a cream vault (the door opens and small eU coins rise for yield), then back up
    as $U. The tags are anchored to 3D points.
  - `pr_wrap`: their co-founder's interview (`rec`, their own clip, muted, its subtitles visible) over a glass wallet
    with a pane that frosts on `wrapper`, and a magnifier that passes on `outsiders`.
  - `pr_zk`: an example web page (labelled as one). One row lifts off as a card and is redrawn as "over $10,000 · TRUE",
    the page frosts, a key appears and stays, and an orange seal stamps the card (`signed`). Then two chips: "Proof of
    the claim" and, struck through, "A copy of your account".
  - `pr_kaito`: their partner's post image in a card, the sealed card turning below, and chips.
  - `pr_quote` / `pr_back` (`set: "calm"`): quote cards (`quotes`, one in their orange), or a timeline plus a token box,
    over the mark behind frosted glass.
  - `pr_end`: the mark inside a frosted cube with blue edges; the frost thins on "not".
- **Framing (portrait, fov 30):** the visible width is about 0.30 × distance. Every first-pass camera was too close: the
  boxes were cut off and the vault ran past the frame. Work out the widest moment of each shot first. Also call
  `cam.updateMatrixWorld()` in `prCam`: tags projected before the render otherwise use the last frame's camera, which
  is wrong on a scene's first frame.
- **Length:** at voice 1.0 the gaps between lines add about 30% to the raw voice. 119 s of voice came out at 2:34, and
  trimming to 2:19 took cutting about 40 words. Keep a project video under 2:20 for X without Premium.
- **Voice:** "invested too" was heard as "two" (now "also invested"). "BNB" was heard as "B&B", so say "B N B". "PADO"
  was heard as "Potto", so say "Pah-doe". "zee kay T L S" reads well for zkTLS.

## Another format: follow the money (`ad_*`, the owner's opinion piece "Airdrops have not peaked", 27 Oct 2026)

Template: `airdrops-2026-10-27.json`. Sources: `airdrops-2026-10-27-sources.md`. Cover and thumbnail: `airdrops-cover-2026-10-27.html`
(shot by `airdrops-cover-2026-10-27.mjs`). The owner sent a finished script, with on-screen notes and a source for every number,
in reply to a post. The video keeps their words. One device carries the argument: **a pipe from crypto's money splits into
users (airdrops, green) and builders (fees and token sales, ink), and a valve swings the same coins from one cup to the other.**

- **Scenes:**
  - `ad_cold`: the real post it answers, redrawn as an X card (`post`: avatar, name, handle, paragraphs word for word, and
    `peak`, the phrase to strike). Blank ghost cards fan out on "posts"; the phrase gets a blue highlight, then a red strike
    on "buy", then a big "??".
  - `ad_title` (drop): the question and the pipe, both branches flowing.
  - `ad_users`: year bars on one scale (`scale` px per $1B), each cued to its year. A Hyperliquid card with a ring that
    counts to 31%. On "dropped", a dashed red line falls across the bar tops, then a stamp lands. The kicker says the
    trackers differ, because the three numbers measure different things.
  - `ad_build`: a field of 460 coin dots with a counter (46,034), then the builders' bars on one scale beside the users' 2026
    bar, with each project's logo on its bar.
  - `ad_promise`: two promise cards. One quotes the post with its phrase in blue (`hi`), an ICO chip, and a day counter with
    a striped bar. The other quotes the CMO, adds a help-page line (`note`) and a fees toggle that flips on "fees". Then "Make
    this make sense" lands and both cards tilt.
  - `ad_same` / `ad_end`: the pipe again. The valve swings to builders on "airdrops" and the users' cup drains; then it swings
    back on "invested" and the pipe blurs behind the end line.
- **No whoosh on the cuts** (the owner dislikes them). The pipe's coins move along the real SVG paths (`getPointAtLength`).
- **Name clashes:** `.bar`, `.bars` and `.pk` already exist in this page (the Limitless app bar and the Packs). The family
  uses `adbar`, `adbars` and `adpk`, and the first stills had the bars drawn from the top of the screen until the rename.
- **Voice:** "Pump fun said" was heard as "Pump funds said", and so was "Pump dot fun said". "In July 2025, Pump dot fun said:
  airdrop coming soon." is clear. Say "Pump dot fun", "V C", "I C O" and "C M O".
- **The drop:** keep the swell into it short and quiet (max 1.4 s at −11 dB) and the "??" hit at −9 dB, so the drop lands
  out of near-silence. The first render rose only 5 dB.
- **Facts:** the owner's numbers were checked again against the pages on the day. The owner's wording was kept wherever the
  facts allow it (the owner, 27 Oct: "It has been fact checked"). Only the day count was moved on to the posting day.
