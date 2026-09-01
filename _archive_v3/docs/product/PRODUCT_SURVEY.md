# What the English-learning products actually do, and which of it applies here

Written after the product owner said this repo was being built mechanically —
hardcoded units instead of a natural English-learning site — and told me to go
look at real products. The criticism was right at the structural level, and this
document is what changed my mind, with the numbers that did it.

## The number that decides the architecture

Cambridge puts **zero to B2 at roughly 500–600 guided learning hours**, and zero
to C2 at 1,000–1,200. The immersion community, counting differently, puts
fluency near 1,500 hours of input.

Those figures disagree about a lot and agree about the thing that matters:
**hundreds to a thousand-plus hours.**

This repo has 30 authored units. Even at a generous half hour each, that is
15 hours. **Authored content cannot fill 600 hours** — not written by me, not
written by anyone, not at any budget. Every product that works past beginner
solves this the same way: it stops authoring and starts consuming material the
learner already wanted to consume.

That is the whole argument. Everything below is detail.

## Four families

### A. Authored course + gamification

Duolingo, Babbel, Busuu, Memrise, Mondly.

Hand-written lessons in a fixed order, streaks and points on top. **This is the
shape this repo built.**

What independent comparison found: Busuu leads overall, with the most
comprehensive results for reading/grammar and oral proficiency; Duolingo scores
higher on the receptive skills, reading and listening; **Babbel came out least
effective — most learners did not exceed beginner level.**

The recurring criticism is the one the product owner made here: unnatural
sentences, a plateau nobody gets past, and learners who can translate an
exercise but cannot retrieve a word when they need it. Duolingo users report
liking the gamification while finding the tasks repetitive.

Worth keeping from this family: explicit teaching order, and the fact that
Busuu's lead came from covering production, not from more drilling.

### B. The learner's own material, with a layer over it

LingQ, Language Reactor, Readlang, Migaku, Lingopie.

**None of them authors a syllabus.** The learner brings a Netflix episode, a
YouTube video, an article, an ebook, a podcast. The product puts a layer over it:

- **Every word is coloured by what this learner knows.** In LingQ: blue = never
  seen, yellow = being learned, unmarked = known. The text itself becomes the
  progress display.
- **One tap gives meaning, audio and an example, without leaving the text.**
  Language Reactor does it inside the video with dual subtitles; Readlang does it
  on any web page.
- **The count of known words is the metric.** It only grows. Nothing resets.
- Listening mode blurs the subtitle so comprehension is tested before the answer
  is revealed.

This family is the direct implementation of comprehensible input and extensive
reading — the two largest effects in this product's own research file.

### C. Speaking and pronunciation AI

ELSA Speak, Speak, Loora, Praktika, TalkPal.

**ELSA is the closest thing to a direct reference this project has**, and it was
founded by a Vietnamese speaker, Vu Van, for exactly the problem this learner
has: she arrived in the US believing she was fluent and found people could not
understand her.

ELSA extracts speech features **down to the phoneme**, compares them against a
large corpus of non-native English speech, and tells the learner which specific
sound was wrong and where to put their tongue — claimed at 95% accuracy. Studies
find significant pronunciation gains against a control group (p < .001).

That is a level of feedback this repo cannot currently produce and should not
pretend to. What this repo built instead — HVPT for perception, shadowing for
prosody — is the part with the strongest research backing and no proprietary
model behind it. The gap that remains is exactly ELSA's: per-phoneme production
feedback.

The conversation apps (Speak, Loora, Praktika, TalkPal) all do the same thing:
low-pressure spoken output with immediate correction. Their claimed value is
automaticity — producing language without consciously assembling it.

### D. Spaced repetition over mined sentences

Anki, Migaku, Clozemaster.

Take sentences from real material where **exactly one element is unknown** — i+1
— and put them into spaced repetition. Described in the community as the single
most effective technique for intermediate learners and up.

This repo already has both halves: `check-comprehensible-input.ts` finds i+1
sentences, and FSRS schedules them. What it lacks is the source of sentences:
right now they come from an authored catalogue rather than from something the
learner chose to read.

### E. Sentence-level production

Glossika, Clozemaster, Lingvist — and the correction communities, Busuu,
LangCorrect, Journaly, HiNative.

This is the family that addresses the block this learner actually named:
**knows the words, cannot assemble them into sentences.**

- **Glossika** works on whole sentences: hear one, say it back, and a spacing
  algorithm schedules the ones you struggle with. Vocabulary, grammar and
  pronunciation are never taught separately because the sentence carries all
  three.
- **Clozemaster** blanks one word out of a real sentence and makes you supply
  it. And it changes the metric to match: it **records progress by sentences
  completed, not words learned.**
- **The correction sites** all do the same thing from the other end — you write,
  and native speakers correct it sentence by sentence, explaining why. That
  supply of correctors is the one thing this product cannot copy.

**Why the cloze mechanic fits this learner specifically**, on three counts at
once: it is *production*, which is the blocked step; it is *silent*, so it works
where he usually is; and it is *retrieval from a sparse context*, which is the
condition that beat context-inference on every retention measure.

**And the honest warning that comes with it.** Across technology-assisted
vocabulary learning, recognition scores d = 0.69 and production only d = 0.47.
Production learning is harder and its numbers look worse. But the durability
runs the other way: form recognition was learned at 18% and had fallen to 6% by
follow-up, while meaning recall started lower at 9% and *rose* to 12%.

Recognition looks good immediately and drains away. Production looks poor and
stays. A product that optimises for the number that moves fastest will build the
wrong thing.

## What this product already has, in the shape family B needs

| What LingQ-style reading needs | Already in this repo |
| --- | --- |
| The learner's own real material | `/create` — a YouTube video becomes a lesson with grounded citations |
| Knowing which words the learner knows | `learner_known_words`, plus beginner evidence |
| A meaning on tap | 1,838 Vietnamese glosses |
| Audio for a line | Kokoro renders for authored lines; real speech for video lines |
| Spaced review of saved words | FSRS via `ts-fsrs` |
| An i+1 gate | `check-comprehensible-input.ts` |
| Coverage measurement | the coverage calculator written for extensive reading |

**One thing is missing: the reading surface itself** — real text where every word
carries its known/unknown status, a tap gives meaning and sound, and the known
count grows.

## What this product does that none of them do

Worth writing down, because it is the reason not to simply copy LingQ.

Every product in family A reports progress the learner cannot check: XP, streaks,
levels, "fluency %". This repo separates **independent**, **supported** and
**unscored** evidence, refuses to call completion mastery, and leaves a number at
zero when it cannot honestly fill it — the speaking column stays at 0 until there
is a verifier worth trusting.

That is the product's actual differentiator, and it survives the architecture
change. Family B tracks known words honestly but has no notion of whether you can
*use* one.

## What follows for this repo

1. **Build the reading surface.** It is the missing piece, all its dependencies
   exist, and it unlocks extensive reading — the largest effect in the research
   file — today rather than after thousands more authored words.
2. **Keep the authored units as the on-ramp, not the product.** They are what
   gets a learner from zero to enough words to read anything at all. Thirty units
   is a reasonable ramp; it is not a course.
3. **Do not copy the streak.** Family A's retention mechanics are the one part
   the evidence in this repo actively argues against.
4. **The phoneme gap is real and unclosed.** ELSA does something this product
   cannot. Say so rather than implying the pronunciation work here is equivalent.

## Sources

- Cambridge English guided learning hours; CEFR level estimates
- Independent efficacy comparison of Babbel, Busuu and Duolingo
- LingQ word-status model; Language Reactor dual subtitles and listening mode; Readlang
- ELSA Speak phoneme-level feedback and controlled pronunciation studies
- Refold / Dreaming Spanish immersion hour counts
- Sentence mining and i+1; Nakata (2015) on spacing schedules
- Automated writing feedback meta-analysis, g = 0.55 across 20 studies
