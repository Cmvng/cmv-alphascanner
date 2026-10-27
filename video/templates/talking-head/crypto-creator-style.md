# Crypto project videos: the contest-winning creator style

The owner, 26 Oct 2026: the two creators sent on 4 Oct "won a competition cos of the unique style", and the Kaito
creator sent on 22 Oct "was the one who onboarded them". Use this file for every recording the owner makes about a crypto
project (an app, a campaign, a launch). It is the brief before `README.md`'s pipeline, which does the cutting.

## The three references, measured (26 Oct)

| | Eliza, "Prism explained in 180 sec" | geek, "ActionModel $100K campaign" | Kaito creator, "Smart Followers vs Inner Circle" |
|---|---|---|---|
| Format | 9:16, 1080×1920, 3:11 | 3:2, 1620×1080 at 60 fps, 0:36 | 16:9, 0:48 |
| Voice | 577 words, **181 wpm**, gaps 0.3 s | 110 words, **185 wpm**, gaps 0.24 s | 128 words, 173 wpm |
| Creator | seated, waist up, dark room with warm lamps and bokeh, holds a coin the whole time | seated, waist up, room with depth (glowing monitor, red LEDs, shelf) | to camera, warm room, clip-on mic visible |
| The app | real screens on ~60% of the running time | the project's X post on a phone, beside him | own motion graphics, no app |
| Sound | a music bed under the voice (gaps only 5 dB below speech) | a music bed (gaps 10 dB below) | voice only, sound logo at the end |

Frame sheets and transcripts: the session scratchpad, `cr_an/` (`eliza_*.jpg`, `geek_*.jpg`, `kaito_1.jpg`, `tx.json`).

## What they all do (why they won)

1. **The project is the hero, the creator is the guide.** The real app is on screen most of the time, in the project's
   own colours (Prism's dark green, ActionModel's purple and mint, Kaito's teal). The project's logo sits in a corner
   throughout (geek), or a glowing glass logo pops in over the creator on the word that names the project, 1.2 s in
   (Eliza).
2. **Something new every 1–3 seconds.** The face is never alone for more than about 4 s: a card slides in, a word
   changes colour, a number slams, a list item lands.
3. **Real screens, staged like a product film (Eliza):**
   - **Floating cards above the head:** screenshots in the empty top third, tilted in 3D perspective with a soft
     shadow, sliding in and stacking (a stat card on top of a table). The creator stays on screen below.
   - **Full-screen walkthroughs:** the app fills the frame with a slight 3D tilt and a slow drift, the edges soft
     (depth of field). A **glowing rounded outline** lands on the exact item she names ("BlackRock", the "Match" column,
     the "Swap / Limit" tabs), and the cursor is visible.
   - **Between sections:** a fast blur or whip pan, never a stock transition.
   - **The phone version:** a phone mockup slides in from the side when she says "mobile".
4. **Kinetic type only for the lines that sell:**
   - a big number over the creator: "$100,000" in tall condensed type (geek); "$38.68B" and "5,078,791" as a zoomed
     stat card (Eliza);
   - a logo with a two-line caps statement either side of her: the Apple logo with "WHILE OTHERS ARE GATED", the
     Nvidia logo with "OPEN TO ANYONE";
   - a list, one item per beat, on a clean white canvas in condensed caps (geek: "EXCLUSIVE REWARDS", "PAID
     OPPORTUNITIES"…), or bullets that build up beside his head as he names them ("• VIDEOS", "• GRAPHICS").
5. **Captions that follow the voice, quietly:**
   - small to medium clean sans, 1–7 words at a time, with no heavy box;
   - the spoken word in the brand colour (geek: mint), or the words still to come dimmed (Eliza);
   - placed at chest or lap height, not at the bottom edge;
   - on a white canvas they turn black and keep going.
6. **A dense, honest script at about 180 words a minute.** Every sentence carries a fact, a number or a feature.
   Eliza's shape:
   1. first-person reviewer: "I spent an afternoon clicking through Prism and here's my take";
   2. the market in two numbers;
   3. the problem in three short pains (scattered platforms, four versions of one stock, fake tokens);
   4. "Prism solves this", then an analogy: "Think of it as Amazon for tokenized stocks";
   5. features one by one, each on its own screen;
   6. the relatable line: "For a beginner like me…";
   7. an honest caveat: "a theme basket is still one theme… its own fees";
   8. the differentiator, then the tools;
   9. the call to action: "What are you waiting for? Go explore Prism."

   geek's shape for a campaign: urgency (21 days, $100,000), what's new, the perks as a list, who should apply, the
   link in the caption.
7. **A signature:** Eliza's coin, geek's hoodie and room, the same seat and light every video. People recognise the
   creator before the caption.

## How we cut the owner's version

Follow `README.md` for the cutting. On top of it:
- **Layout:**
  - **9:16:** the owner fills the frame, with the top third kept free for floating app cards.
  - **16:9:** the owner on one side, the app or the phone on the other, then full-screen walkthroughs.
- **App screens:** real screenshots or the owner's screen recording, never AI copies of the UI.
  - Each gets a 3D tilt of 6–12°, a soft shadow and a slow drift.
  - A glowing outline in the brand colour marks the exact item on the word that names it.
  - A fast blur links one section to the next.
- **Colour:** the app keeps its own colours (dark if the app is dark). Our own frames, cards and canvases follow the
  house rule: light or blue, with the brand colour as the accent.
- **Captions:** word-synced (`word_times.py`), the spoken word in the brand colour, chest height, no box.
- **Kinetic type:** at most one big number or list per 15 s, so it stays special.
- **Sound:** for an app tour, a soft bed under the voice, about 15–20 dB below it. Short UI clicks only on taps the
  viewer can see. No whooshes on every cut (the owner dislikes them).
- **Length:** up to 2:20 for X without Premium. If the owner talks for longer, cut to the strongest 2:20 and keep the
  full cut for YouTube.

## CapCut's techniques, and how we do each one here

Researched on 27 Oct 2026. Most of the guidance comes from CapCut's and other vendors' own pages, so treat it as
practice, not proof. The full brief with sources is `brief.md` in the session scratchpad. We render with ffmpeg and
HTML, so each technique is rebuilt here, not clicked.

| CapCut tool | What good use looks like | Our version |
|---|---|---|
| Keyframed zoom, "smooth zoom" | A push of 8–15% that starts as the voice names the thing and settles before the click. About three per 30 s, one action each. | Scale 1.00→1.12 with an ease-out over 0.35 s, held for at least the phrase. Record the screen at 1440p or more so it stays sharp. |
| Jump-cut punch-in | Alternate medium and close shots of 10–20% on talking-head cuts. | Already in `build_av.py` (1.0 / 1.07 around the face anchor). |
| Auto captions with keyword highlight | 3–7 words a chunk, sparing emphasis. Keep clear of the bottom 20–25%, the top 10–15% and the right edge. | Word-synced captions (`word_times.py`), the spoken word in the brand colour, chest height. Never the bouncy all-caps yellow look. |
| Remove filler words and pauses | Flags um, uh and repeats for review. | `plan.py` keeps whole phrases, drops false starts and compresses pauses over 0.4 s. |
| Speed ramp | Speed up typing and waiting. | 2–4× on loading and typing, with a small "4×" badge. |
| Mask spotlight | A blurred copy underneath, with the sharp area showing through a feathered mask. | Blur and dim the screen except a rounded rectangle on the item named, plus a glow outline. |
| Motion tracking | Text or an arrow that follows an object for a short clip. | Keyframe the outline per frame from the recording's cursor or tap position. |
| Background removal or chroma key | The creator cut out over a screenshot looks planned. Keep the area behind the face quiet. | Use when the owner films in front of a plain wall. Matting a busy room looks cheap. |
| Split screen or picture-in-picture | Use a split when both matter, and a picture-in-picture face when the screen leads. Keep faces off the divider and text in the inner 80%. | The `duo` and `desk` layouts. |
| Phone or device mockups | The app inside a phone frame sliding in. | Draw the phone frame in HTML, so there are no template watermarks. |
| Zoom on click (Screen Studio style) | Zoom on each click, settle quickly, and add motion blur to the moves. iPhone recordings don't show taps, so add tap circles. | Ripple circles at each tap, plus the push-in above. |
| Voice enhance | Removes clicks and echo. | DeepFilterNet3 (`df_enhance.py`). |
| Auto reframe 16:9→9:16 | Paid since April 2026, and it can crop out the key UI. | Redraw for 9:16 by hand; never blind-crop the app. |
| Script to video, AI B-roll | AI clips get details wrong. Kaito Studio can void rewards for AI-generated content, and Superteam bans AI-only entries. | Never for a contest entry. Use real screens and the real person. |

## What contests and projects say they judge
- **Published rubrics** (Superteam bounties, Flare):
  - Busha: clarity, storytelling, pacing, accuracy and engagement, and the creator must have used the product.
  - Bayse (a prediction market): clarity, accuracy, visual flow, audio and lighting, and an app walkthrough.
  - Solana Summit: creativity 25%, emotion and vibe 25%, relevance 20%, execution 15%, community impact 15%.
  - Flare: creativity 30%, education 25%, visual quality 25%, engagement 20%.
- **Kaito Studio** (it replaced Yaps in Jan 2026): brands pick the creators. The terms ask for original content, and
  rewards can be voided for AI-generated or bot-boosted posts, or for a post edited or deleted mid-campaign.
- **Prediction markets:** the Wall Street Journal found creators faking winning Polymarket bets on a look-alike site (June
  2026). Only ever show the owner's real positions, and say when a video is paid.
- **X:**
  - Length: 2:20 without Premium.
  - Ranking: the open-sourced ranker scores video watch time and dwell.
  - Format: the October 2026 "Video Kickstart Bonus" (invite-only) pays for original, watermark-free vertical videos under
    3 minutes.
  - Captions: burn in our own rather than rely on X's.

## Never (what experienced editors call cheap)
- Glitch, shake and transition packs.
- A sound effect on every cut.
- Every caption word bouncing.
- Zooms "for energy", or zooming while the viewer is reading.
- One-click templates ("audiences smell the template").
- AI B-roll with wrong details.
- An unchecked auto reframe that crops off the button being explained.

## What to ask the owner to record (send this before a project video)

1. **Camera:**
   - **Framing:** a phone on a stand at eye level, waist up, 4K 30 fps, with exposure and focus locked. Landscape for
     16:9; for 9:16, landscape with the face centred works too.
   - **The room:** a lamp behind and to the side, with some depth (a shelf, a plant, a monitor glow), and a soft light on
     the face.
   - **Mic and prop:** a clip-on mic, and the same seat and look each time. A prop is optional (a coin, a phone).
2. **Script:**
   - Open with the reviewer line ("I spent a day inside X, here's my take") or the urgency line (the deadline and the
     prize).
   - One idea per sentence, with a one-second pause between sentences.
   - Say the numbers clearly, and name every feature you want shown ("the calculator", "Reserve Watch").
3. **Screen recording**, as a separate file from the camera, at the device's full resolution:
   - move the cursor or finger slowly and stop on each feature for 2 s;
   - tap, then hold still;
   - scroll slowly;
   - no notifications.
4. **Send:**
   - the original files (Drive or Dropbox), not WhatsApp copies;
   - the project's X link and logo;
   - the one line you want people to remember.
