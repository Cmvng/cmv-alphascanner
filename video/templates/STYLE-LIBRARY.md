# The owner's style library: every sample they sent, the moves in each, and what each video has used

**Read this before designing any video.** The owner sends samples so the work learns from ALL of them and gets
better, not so one of them is copied. 11 Nov, after an edit that followed a single sample and had the same shape as
the video before it: *"I've sent you different several video ideas, quality video ideas… You just took the last
video and use that template… I've sent different videos and styles. Why have you not learned? Why have you not taken
put things in your notes?"*

## First, before any move: the recording is the standard
The owner's own picture and sound go into the final video untouched (`render_raw.mjs`, `mix_raw.py`), and
`video/lib/versus_quality.py` must pass. A move is built ON the recording, never by re-making it.

## The rule
1. **Never one sample, never the last video's shape.** Every video takes moves from at least three different samples
   below, and at least two of its main moves were not in the previous video of the same kind (see the ledger).
2. **Improve, do not copy.** Take the move, do it in house style (light or blue, never black, the subject's own
   colours, real screens, the owner's own words), and make it mean something in this story.
3. **Fewer moves, done properly.** A move that is not clean in motion is left out (11 Nov: "I will tell you to do
   something, you will do worse"). Check each one frame by frame.
4. **Write it down.** A new sample gets an entry here the day it arrives (the moves, the owner's words), the long
   notes go in `IDEAS.md`, and the ledger gets a row for every video sent.
5. Before building, write in the template's README which moves the video uses and which sample each is from.

## The samples (long notes: `video/templates/IDEAS.md`)
| # | Sample | Sent | The owner's words | Its moves |
|---|---|---|---|---|
| S1 | "7 video effects you can use in Claude" (@favoritetechgal, 0:26, upright) | 29 Oct | sent as a reference | **Depth:** type, a circle and panels BEHIND the presenter; glass widgets floating round them; reels orbiting behind and in front; a split (chart page above, clip in a card below); a spotlight (room dimmed, a word behind the head); a checklist that ticks; a timeline with a playhead |
| S2 | Ola Ξlixir, "AI changed my life in under a year" (0:52, upright) | 3 Nov | "two talking-head styles" they found | an icon over the head for each noun, on the word; word-by-word captions, key phrases big; a flashback in black and white with a split-flap date and the old problem struck out; a tilted stamp; their own post cards stacking in; tiles orbiting the head behind and in front; a Follow button a cursor clicks |
| S3 | @sollunix, "Pump.fun vs StonkFun: where your fee goes" (1:16, 16:9) | 3 Nov | same message | a brand cold open (both logos huge behind the head, a date chip); captions of one to three words with the key word in colour; a glass card that builds line by line with the voice, its source on it; a full-screen data room; "REWIND" with a date stamp; real screenshots on a timeline; a split bar ("every $100"); a verdict card |
| S4 | "20 hours" self-improvement reel (0:39, 16:9) | 9 Nov | "I loved it… it looks super cool" | whisper and shout: tiny captions and a few giant words; the giant word laid out round the head, a hand passing in front of it; the hook number shown three times the same way; one long unbroken take, then a seven-second burst of fast cuts with the music hitting harder; shape rhymes in the burst |
| S5 | Camera explainer reference | 22 Oct | sent as a reference | the owner to camera for the hook and the takeaway; about 45% of the time on full-screen graphics while the voice continues; one canvas that changes state; a logo sting |
| S6 | Fungo Labs' own clip "Are you in?" | 8 Oct | liked; our flat hype edit was "a 1/10" | the product acted out; a camera that follows the cursor; a strict palette; 17 seconds |
| S7 | The owner's reaction clips (grey T-shirt set, shirtless set) | 29 Oct, 5 Nov | "I like the reaction when it's in sticker form" | their own reactions as die-cut stickers, at most three, mixed sets, each fitting its line (not when they are on camera throughout) |
| S8 | Global Tribe Tales, POV Finance (faceless story channels) | 23 Oct | "clean and well done", "relatable" | one hero in the same outfit, bright scenes, thumbnails with no text, a title that names an injustice and promises a payoff |
| S9 | The reels and templates sent with their art and the Gamdom entry | 22 Oct, 4 Nov | "You only tell the story with the templates"; "people are doing quality stuff" | their footage and music as sent; a story told with their own templates; cinematic entries with real hype music |

## The moves, as we build them
| Move | From | How (ours) | Tool |
|---|---|---|---|
| Type or a logo plate behind the head | S1, S3, S4 | giant condensed type or the project's logo on a plate, its lower edge tucked behind the hair; rises from behind the shoulders. Before building: look at what is on the wall beside the hair. Anything that touches the hair in the picture shows through the graphic there; keep the graphic clear of that spot | `depth.html` `bk` layer, `matte60.py`, `clean_alpha.py`, `render_raw.mjs` |
| Glass chips round the head that build with the voice | S1, S3 | white glass chips beside the head, each landing on its word, struck or ticked on the next; a counter tile | `depth.html` (`way`, `.ctr`) |
| A ring of tiles turning behind the head | S1, S2 | tiles travel an arc from one shoulder over the head to the other, following the head | `depth.html` (`HALO`), `track.js` |
| An icon over the head on the word | S2 | one compact 3D icon and a small label, 1 to 3 s | `talk.html` (`one`) |
| Word-by-word captions, key phrases big | S2, S3, S4 | each word lights on its own sound; up to seven big phrases; steps off anything held up | `tokens.py`, `clear.py` |
| A real page in a card, the sentence outlined | S3 | the project's own page, captured as served, scrolled to the line | `capture_docs.mjs` |
| A stamp | S2 | tilted, one colour, on the verdict | `talk.html` (`.stamp`) |
| A Follow click | S2, S3 | our own pill, a cursor clicks it on the sign-off | `talk.html` (`#fol`) |
| A giant number | S4 | the hook or pay-off number, giant, shown the same way each time it is said | `depth.html` (`.bt`) |
| Flashback in black and white | S2 | NOT YET USED. Ask before regrading the owner's picture (22 Oct: "why did you change the color?") | |
| Split: page above, the owner below | S1 | REJECTED in the form of 11 Nov ("poor video editing… so mid"). Not for their own recordings | `stage.html` |
| Brand cold open, date chip | S3 | NOT YET USED on a recording (used in spirit: the logo plate behind the head) | |
| Data card that builds, with its source | S3 | NOT YET USED on a recording | |
| REWIND with a date stamp | S3 | NOT YET USED | |
| Split bar ("every $100") | S3 | NOT YET USED | |
| Hold, then a burst montage | S4 | NOT YET USED on a recording | |
| Whisper captions (tiny) | S4 | NOT YET USED: unreadable at feed size on their own | |
| Their own reaction stickers | S7 | at most three, none when they are on camera throughout | `reactions/` |

## The ledger: what each of the owner's recordings used (newest first)
| Date | Video | Main moves | Verdict |
|---|---|---|---|
| 11 Nov | Primus "groundnut test", 5th version | the 4th version's moves, on the owner's untouched picture (60 fps, one encode) and untouched voice; chips and logo plate moved clear of the head | "why didn't you do it like this one you just sent me now?" (11 Nov): this is the way to edit their recordings |
| 11 Nov | Primus "groundnut test", 4th version | type and logo plate behind the head (S1, S3, S4); glass chips and a counter (S1, S3); ring of tiles behind the head (S1, S2); giant number (S4); word captions, stamp, real page, Follow click (S2, S3) | "the original quality… was top quality. But when you made the edit… it was just poor": the picture and sound had been processed, not the design judged |
| 11 Nov | same, 3rd version | icon over the head on the word, word captions, stamp, Follow click (all S2) | REJECTED: "You just took the last video and use that template" |
| 11 Nov | same, 2nd version | split: sheet above, the owner smaller below (S1), receipt, box diagram | REJECTED: "poor video editing… the motion graphics is bad… so mid" |
| 11 Nov | same, 1st version | cut-out on a studio backdrop, panel with the camera pushed down | REJECTED: "the worst video ever"; "You cut what I'm actually trying to show" |
| 10 Nov | Bagel and the international break | studio look, cards above the head, real app screens | soundtrack rejected ("weird soundtrack"); "too many errors" |

**For the next recording:** the main moves must differ from the 4th version above. Unused and worth trying first:
the brand cold open with a date chip, a data card that builds with its source, the hold-then-burst ending, REWIND.
