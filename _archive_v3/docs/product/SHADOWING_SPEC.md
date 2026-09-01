# Shadowing: what the evidence says, and what this product may therefore claim

Written before any code. Every design decision below names the finding that
forced it. Where the evidence is weak, that is written down too, because the
one thing this product may not do is manufacture the feeling of progress.

## Why shadowing, and why now

Extensive reading has the larger coefficient (d = 1.32) but no usable material
at this learner's vocabulary size — measured, see
`LEARNING_SCIENCE_PRODUCT_RULES.md`. Shadowing needs no external material: the
curriculum audio already exists, rendered by Kokoro at build time.

## What shadowing actually is

> "the act or task of listening in which the learners track the heard speech and
> repeat it as exactly as possible" — Mochizuki 2006, via Yavari & Shafiee 2019

It is **not** repeating after the speaker finishes, and it is **not** reading
aloud along with a script. Those are different techniques with different
results: Yavari & Shafiee compared shadowing against *tracking* (speaking along
with subtitled video) on four groups of intermediate learners and found
shadowing **significantly more effective** for oral fluency.

That distinction is a build constraint. An implementation that shows the text
and plays the audio has built tracking, not shadowing, and may not claim
shadowing's results.

## What it improves — and what it does not

On thirty Vietnamese A2 learners over ten weeks (Nguyen et al. 2024,
rEFLections 31(3), ERIC EJ1459868 — the closest study to this learner there is):

| Feature | Cohen's d |
| --- | --- |
| Intonation | 1.50 |
| Linking | 1.16 |
| Stress | 1.08 |
| Read-aloud task overall | 1.25 |
| **Free-response task overall** | **1.24** |

The free-response number is the one that matters: the gain showed up in
unscripted speech, not only in re-reading the practised sentence.

**What it does not do.** Niimoto 2022 found significant gains in
suprasegmental production and listening, and **no significant difference in
segmental production or comprehensibility**. Shadowing moves rhythm, stress,
linking and intonation. It does not reliably fix individual consonants and
vowels.

So this product must never tell the learner that shadowing is correcting their
individual sounds. It may say it is training the music of the sentence.

**Honest weight on those numbers.** EJ1459868 is a one-group pre/post design
with no control group, n = 30 — its own stated limitation. Uncontrolled pre/post
gains overstate. Treat d ≈ 1.0–1.5 as "large and worth building", not as a
number to quote at a learner.

## The measurement problem this creates

Word error rate is the validated scorer already in this repo (ICC = 0.929
against human raters, known target only). But WER counts **words**, and
shadowing moves **prosody**. A learner can score 100% WER while flattening every
contour — the exact shape of illusory progress.

So shadowing is scored on two separate axes and they are never merged into one
number:

1. **Words** — WER from the on-device recogniser. Answers: did you say it?
2. **Rhythm** — articulation rate against the reference, plus correlation of the
   amplitude envelope after duration normalisation. Answers: did you say it with
   the same timing?

Amplitude-envelope modulation is an established acoustic measure of speech
rhythm, and articulation rate together with interval-based rhythm measures are
strong predictors of human similarity ratings of L2 speech. The envelope is a
proxy, not a phonetic transcription — it is reported as rhythm, never as
pronunciation accuracy.

## The staged progression, and why it is not optional

Unstaged shadowing fails for low-proficiency learners. Kadota & Tamai 2004 give
four stages, Hamada 2012 adds the scaffolds; Mu & Wasuntarasophit 2025
(EJ1479870) state the added steps are **essential** for students with limited
English proficiency. This learner is below the A2 of every study cited here, so
the scaffolds are load-bearing.

| # | Stage | What the learner does |
| --- | --- | --- |
| 1 | Listening | Hear the line. No text. |
| 2 | Parallel reading | Shadow while the script is visible. |
| 3 | Mumbling (×2) | Shadow the sounds only, no attempt at accuracy. |
| 4 | Check understanding | Meaning in Vietnamese, confirmed. |
| 5 | Synchronized reading | Read aloud with the audio, script visible. |
| 6 | **Prosody shadowing** | Shadow with **no script**. This is the stage that is shadowing. |
| 7 | Check details | What was unclear. |

Stages 1–5 are preparation. Only stage 6 is measured, because only stage 6 is
the technique the evidence is about.

## Dose

Yavari & Shafiee: 15 minutes per session, two sessions per week, ten sessions.
EJ1459868: ten weeks. So the unit of delivery is a **short daily-ish block**, not
a one-off exercise, and the product should say when a learner has done too
little of it to expect anything.

## Sources

- Yavari & Shafiee 2019, *Effects of Shadowing and Tracking on Intermediate EFL Learners' Oral Fluency* — ERIC EJ1201305
- Nguyen et al. 2024, *Effects of Video-Based Shadowing on Suprasegmental Features* (Vietnamese learners, A2) — ERIC EJ1459868
- Mu & Wasuntarasophit 2025, *Effects of the Shadowing Technique on English Listening Comprehension* — ERIC EJ1479870
- Kadota & Tamai 2004; Hamada 2012 — staged progression, cited in the above
- Niimoto 2022 — suprasegmental gains, no segmental gain, cited in EJ1459868
