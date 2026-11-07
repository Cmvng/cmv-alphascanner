# The house voice: free and commercial-use

## 7 Nov update: no more delivery edits, Chatterbox-Turbo is the narrator
The owner on the Bagel picks video (Kokoro with the delivery profile): "this voice sounded like a robot".
- **The cause was our own editing:**
  - every phrase was forced into the same pitch shape;
  - the take was synthesised in about 30 separate pieces, joined with exact digital silences.
- **The base voices themselves are close to ElevenLabs Multilingual v2 in public blind arenas** (Kokoro about 30 Elo behind,
  Phonon ahead on Artificial Analysis). They are far below ElevenLabs v3 and v4.
- **Rule: never edit pitch or tempo again.** Use the model's own delivery, with plain sentence pauses and loudness only.
- **Narrator from now on: `chatterbox_voice.py`.** This is Resemble AI Chatterbox-Turbo (MIT) in its built-in voice, with no
  cloning. It runs on CPU at about 1.6–2× real time (80 s of audio takes about 2–2.5 min). Install notes are in the script header:
  keep torch CPU, or pip pulls the 3 GB CUDA build.
- **Always hear-back the take** (faster-whisper medium.en). Re-record any sentence that is misheard; a sentence can be
  spliced back in. In one take, "Unbeaten in three" was heard as "I'm beaten in three", so it was re-recorded as "Three games
  unbeaten".
- **Runners-up, both plain:** Kokoro af_heart and Phonon Zoey. A/B reel: `video/out/voice-samples-2026-11-07/voice-test-reel-2026-11-07.mp3`.

## Before 7 Nov (kept for the record; the delivery edits below are retired)

The owner, 7 Nov 2026: "I don't want to be using ElevenLabs again… study the voice pattern… use that same voice pattern
for my videos."

**What this is:** a free, local narrator. Its *delivery* is measured from our three ElevenLabs takes: the pace, the
pause after each kind of punctuation, the phrase melody (early peak, steady fall, low end), emphasis on names, numbers
and contrast words, and the energy. The delivery targets are in `../../templates/voice/lara-delivery/` (`analysis.md`,
`profile.json`, `measure.py`).

**What it is not: a copy of "Lara".**
- "Lara – Natural, Relatable and Engaging" is a professional Voice Library clone of a real woman. She verified her
  voice, and she is paid each time it is used.
- Copying the *sound* of her voice, or training anything on her audio, would break ElevenLabs' Prohibited Use Policy
  (§3 consent, §12 no training on output). It would also cut her out of her pay and carries publicity-law risk.
- So the timbre here is a stock voice of a free model. Nothing was trained on, matched to or derived from her audio;
  her takes were only *measured* for timing and melody.
- **Never** name a voice "Lara". **Never** EQ or blend a voice toward hers.
- Speaking *style* (pace, pauses, intonation habits) is not protected (US Copyright Office, Digital Replicas report,
  2024).

## The two engines (both commercial-use licences, both checked at the primary source)

| | Default: `house_voice.py` | Runner-up: `house_voice_post.py` |
|---|---|---|
| Model | Kokoro-82M, voice **af_heart** (af_bella also tuned) | Gradium Phonon-31M-en, voice **Zoey** (Harper also tuned) |
| Licence | Apache-2.0, code and weights | runtime MIT or Apache-2.0; weights and voices Apache-2.0 |
| How the delivery is applied | inside the model: phoneme durations, then the pitch/energy predictor re-runs, then pitch-curve edits, exact pauses, word gains | sentence by sentence, exact pauses, then Praat TD-PSOLA pitch and duration edits |
| Speed here (4 shared cores) | about 1–3 min per minute of audio | about 30–60 s per 70 s first time, 3–5 s re-render |

## Measured against the delivery profile (judge, 7 Nov)

On the Primus script, scored on the delivery points that have a set normal spread (the plain stock voices are shown for
comparison):

| | Within normal spread | Average distance (z) |
|---|---|---|
| Lara's own take | 16 of 18 | 0.51 |
| af_heart, house | **16 of 18** | 0.87 |
| af_heart, plain | 9 of 18 | 1.56 |
| Zoey, house | 12 of 18 | 1.22 |

On the unseen football text, Zoey house did best (0.83). Clarity was 0–2.8% word errors.

**Honest gaps:**
- Both house voices move their pitch a little less than Lara: a range of 10.5–11.6 st against her 12.
- Her slight croak at phrase ends is rare in Kokoro and absent in Phonon.
- Kokoro clips some final z sounds ("games").
- Nobody has listened yet, so the owner's ear test with the A/B reel decides between the two.

**Listening reel:** `video/out/voice-samples-2026-11-07/ab-reel.mp3`, with the running order in `ab-reel.txt`.

**The owner's choice (7 Nov): the free house voice, part 2 of the reel (Kokoro af_heart with the delivery).** He
was offered Lara on ElevenLabs (credits), this voice, or a mix, and chose this one. It is the default narrator from
now on.

## Use

```bash
# one-time install in a fresh session (CPU torch keeps it small; about 1.6 GB)
python3 -m venv ~/tts && . ~/tts/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install "kokoro>=0.9.4" soundfile ptts     # ptts only for the Phonon runner-up

# default: Kokoro af_heart with the delivery profile
~/tts/bin/python video/lib/voice/house_voice.py --text script.txt --out voice.wav --voice af_heart --project "Primus"
# runner-up: Phonon Zoey (system python3; point HOUSE_TTS_PY at the venv python)
HOUSE_TTS_PY=~/tts/bin/python python3 -I video/lib/voice/house_voice_post.py render script.txt voice.wav --voice Zoey --project "Primus"
# check any take against the profile
python3 -I video/templates/voice/lara-delivery/measure.py voice.wav words.json script.txt out.json \
  --compare video/templates/voice/lara-delivery/profile.json
```

**Script markup** (`house_voice.py`):
- a blank line starts a new paragraph (a longer beat and a pitch reset);
- `…` gives a held-up pause;
- `*word*` marks a key word;
- `(aside)` is read faster and lower.

Write the script by the rules in `analysis.md`, "How to write a script for this delivery":
- sentences of 8–14 words;
- punctuation controls every pause;
- digits with symbols;
- write the spoken names, not @handles;
- put the stressed word early in the phrase.

The output is a 24 kHz wav at −20 LUFS plus `<out>.words.json`. Mix it as usual (−14.5 LUFS, limiter at −1.4 dBTP).

**Disclosure:** YouTube descriptions keep "Narrated with an AI voice." (house rule).
