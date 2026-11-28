# "General Palmer has spoken" (Forest 3-2 Chelsea, 27 Nov 2026): AI parody, 1:06, upright, voice only

The owner, 27 Nov: "Can you make videos like this..... I need a video of Chelsea reaction after the match against
Nottingham forest with Cole Palmer as the general", then "Study the sample I sent you and work with that", then "Since
Chelsea lost.. The idea will be another loss and general cold Palmer having a go at everyone.. You have to get the
script right". On how to make him talk: "Free route, slower".
Out folder: `video/out/general-palmer-2026-11-27/`. Sample: S11 in `video/templates/STYLE-LIBRARY.md`.

## The idea
The sample's format kept whole: one seated character in a glass office facing the training pitch, a deadpan
dictator's debrief after the loss, captions on the chest, AI PARODY on screen throughout, no music. Every line takes a
real fact of the match (`sources.md`) and turns it on the squad, then on himself ("And me? I was perfect. Ask anyone.
Don't ask the stats."), then the orders, then "Dismissed."

What we kept from the sample and what we changed:
- **Kept:** the set, the framing, the caption style, the tag, the length, the voice-only sound.
- **Changed, the character:** a 3D caricature in a general's uniform in Chelsea blue. Never a photoreal fake of the
  real player, never a voice made to sound like him (a stock ElevenLabs voice, "Jayce").
- **Changed, the edit:** a cut between a wide and a close framing at each line, and harder punch-ins in the pause
  before the punchlines ("…to nobody.", "TWICE.", "PALACE!", "Don't ask the stats.", "Dismissed."). The sample was
  one unbroken shot.

## Sound
The ElevenLabs take (eleven_v4, voice "Jayce - Lighthearted" `LYg7sV1lKlWiLfgmyT5L`, one generation, 907 credits),
then a gentle compressor and a two-pass linear loudnorm to -14.5 LUFS, -1.5 dBTP. No music, as in the sample. It is
not the owner's own recording, so the voice may be levelled.

## How the character talks (free)
Alibaba's own public demo of Wan2.2-S2V on Hugging Face (`Wan-AI/Wan2.2-S2V`: one image and one audio in, 720x1280 at
30 fps out). It runs on Alibaba's DashScope with one job at a time for everyone, so a piece waits behind the public
queue (13 jobs at one point on 28 Nov). What we learned about it:
- **It drops the first 0.1875 s of the audio** it is given. Every piece starts with 0.35 s of silence.
- **It trims the silence at the end,** and the picture stops about where the speech stops.
- **Keep every piece under about 8 s of audio (padding included).** Alibaba's API documents 20 s, but on 28 Nov the
  demo failed pieces of 12.2 s and 17.5 s, a minute apart once each reached the front of the queue, with no message.
  Every piece of 7.85 s or less went through. The fix that worked: line-sized pieces of 3 to 7 s.
- **Queue them all at once** (`run_parallel.py`), so the waits overlap. The queue held 9 to 15 jobs on 28 Nov, and a
  piece waited 20 to 25 minutes.
- **The first frame is close to the reference image** (mouth shut, a stare): a clean poster frame.
- **The output's own audio is the input, cut,** so `align.py` finds each piece's place on the master voice by
  cross-correlation (match 0.99).
- **Every piece starts from the reference pose.** A join is a pose reset, so every join changes the framing
  (`assemble.py` refuses a timeline that does not).

## Build
```bash
GP=<scratch>/gp; T=video/templates/post-match/general-palmer-2026-11-27
python3 -I $T/tools/make_pieces.py $GP/audio/take.mp3 $GP/pieces        # cut at the middle of real silences, padded
python3 -I $T/tools/run_parallel.py $GP/pieces/plan.json $GP/img/a.jpg 1,2,3 720P
python3 -I $T/tools/align.py $GP/pieces/plan.json $GP/audio/take.mp3     # t0 and vdur of each piece
python3 -I $T/tools/captions_ass.py $T/words.json $GP/caps.ass           # Whisper medium word times, snapped to the sound
python3 -I $T/tools/assemble.py $GP/pieces/plan.json $T/shots.json $GP/audio/voice_m14.wav $GP/caps.ass out.mp4
node $T/tools/cover.mjs $T/cover.html <out prefix> "h=@Cmv_ng&shift=230"
```

## Captions
Word times from faster-whisper medium.en (base.en put "Three" half a second early and swallowed two pauses); a word
that starts in silence is moved to where its sound begins. Real spellings: Igor Jesus, Gibbs-White, Emegha. Two or
three words at a time, upper case, Inter ExtraBold, centred on the chest (y 64%).
