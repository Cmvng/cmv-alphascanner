# How your reactions flow with the video

The owner, 7 Nov 2026: "I need it to be in a way whereby it moves from being a video reaction sticker to… flow with the
concept of the video… intertwined… progressing with the video… connects with the video. Not a case whereby it just shows
up and goes away."

His very first brief (29 Oct) already asked for this: "it flows with the video". This playbook is the answer. It comes
from the 7 Nov research: film and animation craft, how creators build in their faces and avatars, and an audit of our own
stickers. The sources are listed at the end.

## The idea in one line

**You are a character in the scene, not a stamp on top of it.** You're already there before the moment, you react on
the exact word, and you're attached to the thing you react to, which reacts back. Across the video your reactions tell a
small story of their own.

## Why the 4–5 Nov stickers felt like they "just show up and go away"

The audit of the Agentics and Primus videos found:
1. **They were timed to the caption line, not to the moment.**
   - Jaw Drop gasped at an empty box 2.7 s before "$200" appeared.
   - Side-Eye looked away before the claim it mocks.
2. **The face arrived already at its peak.** You never saw a face change, so nothing "reacted"; a photo just appeared.
3. **The whole video shrank to 72% for each sticker.** That pulled your face away from the thing it answered and shrank
   the thing being explained, for 18–25% of each video.
4. **Same spot, same pop, every time.** Viewers learn the pattern and it reads as an ad break.
5. **No thread.** Each reaction was a separate event: no build-up, no payoff, no callback.

## The seven rules

### 1. Be there before the moment: listen, then react
Arrive 0.5–1.5 s before the trigger in a **listening** face. Use The Stare until a real neutral clip exists. Then change
expression **in place** on the trigger word, landing 0.2 s (6 frames) after the word ends.
- **Why:** the Kuleshov effect. A face *changing* next to something is what reads as a reaction. Real listeners react
  about 0.2 s after the line.
- **Never:** pop in already making the face.

### 2. Two anchors: the word and the thing
Every reaction is tied to **one word** and to **one thing on screen**: a number, a card, a ring, a score.
- **Word:** times come from the audio itself. Run `video/lib/align_words.py`, because Whisper runs about 0.4 s early on
  the first word after a pause, exactly where reactions land.
- **Thing:** the thing must already be on screen and close to you, so the viewer sees both in one glance.
- **Test:** if you can't name the word and the thing, cut the reaction.

### 3. Live somewhere in the layout; never shrink the video for a face
Every scene gives you a **home** that belongs to that video's concept:
- peeking from behind a card;
- sitting on the edge of a chart;
- standing in a corner of the scoreboard.

Some fixed points:
- **Size:** co-host size is about 380 px wide.
- **The one big moment:** the hero size (450–520 px, with the make-room shrink) is allowed **once per video at most**,
  for the single biggest moment.
- **When the content needs the space:** you move out of the way, not the content.

### 4. Move like a real object, and every entrance and exit has a reason
- **Enter:** peek out from behind the thing, rise from the edge, or slap on like a sticker.
- **Leave:** duck behind the card as the next one flies in, get pushed off by the next graphic, or ride away with the
  card you're stuck to.
- **The change of face:** a quick squash, a small overshoot, then settle.
- **Hard reactions** (Ugh, Wince, Shook) **recoil away** from the bad thing. **Soft reactions** (Nervous, Hmm, Nah) **lean
  in**.
- **Between beats:** you breathe slightly. You never freeze, and you never bob mechanically.

### 5. Look at it, and it reacts back
- **Lean:** lean toward the thing you react to. A face on the right leans left.
- **React back:** 2–4 frames after your reaction lands, the thing answers:
  - the card shudders when you recoil;
  - the ring pulses when you go nervous;
  - the blurred numbers shake "no" with your finger-wag.
- **The test:** delete the sticker. If nothing else on screen would change, it was bolted on.

### 6. Give the reactions an arc
Plan the reactions like a script:
- **The arc:** skeptical → the problem gets worse (escalate) → the payoff → a callback of an earlier face at the end.
- **Budget:** **2–3 reactions a minute**, at least 2 s apart inside a chain and 5 s apart otherwise.
- **The strongest face** goes to the climax.
- **One face, one meaning** per video.

### 7. Never over the information, and leave room for the big one
- **Information comes first:** you never cover text, a screen or a number. While a number is being read, you stay in
  the listening face.
- **Hide on dense scenes:** duck out during definitions and diagrams.
- **Leave room for the big one:** on a verdict line ("and they lost the match") the script leaves a 0.4–1 s beat. The
  face *is* the moment, and the next line comes in over its tail.

## Your example: "…and they lost the match"

1. During "and they…", you're already on the scoreboard card's edge, listening (The Stare), leaning toward the score.
2. On "lost", the score lands on the card. Red is fine here, because it means the loss.
3. 0.2 s later your face turns to The Wince and you recoil away from the score. 3 frames after that, the card shudders.
4. The voice leaves a beat of 0.5 s, and the music dips.
5. On the next line, the next card slides in. You duck behind it, and peek back out from behind the new card, listening
   again.

## How each clip is best used

| Clip | Role | Use it for | Notes |
|---|---|---|---|
| The Stare | **listening / skeptical** | the default face between beats; deadpan "really?" | the most reusable: context sets its meaning |
| Side-Eye | reaction with a built-in **look** | a bold claim | two real looks; aim them at the claim |
| Hmm | thinking | "wait, how does that work?" | short (2.8 s) |
| Nervous | soft, uh-oh | a risk you can't see yet | can read as a smile at small size; keep it 380 px+ |
| Ugh | hard, disgust | someone taking more than they should | pair it with a recoil |
| Wince | hard, ouch / or a grin when it settles | a loss; also a closing grin | the eyes squeeze at about 1.3 s |
| Shook / Jaw Drop | hard, shock | a real reveal only | needs an unmistakable trigger, or it reads fake |
| Nah | soft, a pointing **gesture** | "not that", "don't do this" | start at frame 30 (skips the lip movement), so the wag lands on the key words |
| It's Over / The Wail | hero moments | the single biggest loss | once per video at most |
| Crack-Up / LOL / The Grin | payoff | the joke landing, the win, the callback at the end | |

## The two modes

- **Co-host (the default):** you stay docked in your home through a section and change expression as the argument goes.
  You duck out on dense scenes and come back.
- **Hero (rare, once per video at most):** a big face for the single biggest moment. Only here may the content make
  room.

## Checklist before a video ships

- [ ] Every reaction has a word **and** a thing on screen. The face changes about 0.2 s after the word ends.
- [ ] You were there, listening, before each reaction (no pop-in at the peak).
- [ ] Nothing shrinks for your face (except one hero moment at most).
- [ ] Each entrance and exit has a reason (peek, duck, pushed, ride, slap).
- [ ] You lean toward the thing, and the thing reacts back.
- [ ] There is an arc: escalation, a payoff and a callback.
- [ ] 2–3 a minute; never over a number, a screen or text.
- [ ] The deletion test: remove the sticker and something else on screen changes.

## What to record next (makes the flow much stronger)

Silent, the same T-shirt and the same white wall, phone at head height, 6–8 s each. Start neutral, react, then settle
back:
1. **Neutral, watching** (10 s): just listening. This is the most important missing clip.
2. **Look left** and **look right**, as if at a screen beside you.
3. **Point down-left** and **point left**, at "this".
4. **Lean in** (curious) and **lean back** (suspicious).
5. **Nod yes**, **shake no**, **facepalm**, **shrug**.
6. **Slow-burn annoyance**, building over 5 s.
7. **A laugh that builds** from a smirk.

## For the builder

- **Engine:** `video/lib/react_flow.js`. It covers:
  - segments (where you live: an `anchor()`, plus enter and exit);
  - beats on words or phrases (`at: 'every trade'`);
  - listen / idle clips;
  - in-place swaps with squash, recoil or lean;
  - ducks, looks and breathing;
  - `peakT(i)` and `ReactFlow.kick()` for the element reacting back.
- **Example:** `video/templates/explainer/primus-proof-2026-11-05/page/primus-flow.html`, the 7 Nov re-cut. You are a
  card player peeking out from behind the hand.
- **Word times:** `python3 -I video/lib/align_words.py take.mp3 words.json words_ctc.json` (CTC forced alignment).
- **Timing table (30 fps):**

  | | Value |
  |---|---|
  | Arrive before the trigger | 0.5–1.5 s |
  | Face change after the word ends | 0.2 s (6 f) |
  | Entrance | 0.34 s, decelerating, with a small overshoot |
  | Swap | 2 f squash + 4 f overshoot/settle |
  | Recoil | 22 px and 6° away, back over about 0.55 s |
  | Element reacting back | 2–4 f after the face lands |
  | Minimum hold | 0.5 s |
  | Usual hold | 1–2 s, or until the next beat |
  | Exit | 0.26 s, at a phrase boundary or as something passes over |
  | Breathing | about 1% over 2.6 s |
  | Budget | 2–3 a minute |

- **Sound (no whooshes):** motion is silent. Only contact makes a sound: a soft tap when a card lands on you, and a
  slap when a sticker sticks. For the big face, dip the music 3–6 dB or leave a short silence.
- **Never:** reuse the 4–5 Nov RX block (caption-line timing, global shrink, identical pop).

## Sources (7 Nov 2026 research)

- **Editing:**
  - Dmytryk, *On Film Editing* (1984): cut to the listener, and cut while the scene is alive.
  - Murch, *In the Blink of an Eye*.
  - The Kuleshov effect (Pudovkin 1929; Hitchcock on CBC *Telescope*, 1964).
  - Smith, "The Attentional Theory of Cinematic Continuity" (2012).
- **Timing:**
  - Levinson & Torreira, *Frontiers in Psychology* (2015): turn gaps of about 200 ms.
  - Provine (1993): laughter punctuates at phrase boundaries.
  - Willis & Todorov (2006): face impressions form in 100 ms.
- **Animation and motion:**
  - Thomas & Johnston, *The Illusion of Life* (1981): anticipation, squash and stretch, the moving hold.
  - Williams, *The Animator's Survival Kit*: takes and accents.
  - Willenskomer, "UX in Motion Manifesto" (2017): offset and delay, parenting.
  - "Bump the lamp" from *Who Framed Roger Rabbit*.
- **Learning:**
  - Kizilcec et al. (2015): a constant instructor face is cheaper than one that keeps appearing.
  - Pi et al. (2017): pointing improves learning.
  - Sundararajan & Adesope (2020): irrelevant detail hurts.
- **Creator practice:**
  - PNGtuber expression states (veadotube).
  - Tella and Screen Studio: the camera shrinks for the content.
  - Patriot Act, The Weather Channel's mixed reality and Sky's Carragher: presenters inside the graphics.
  - Karasubonk: the reaction comes after the item lands.
  - The MrBeast production guide (2024): "you can't fake intensity".
- **Full reports:** the research workflow's journal from 7 Nov. Key numbers are copied into the timing table above.
