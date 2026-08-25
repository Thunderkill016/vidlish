# The reading surface: what the research forces it to be

Written before any code. Every decision below names the finding that forced it,
including the two that contradict what the popular products do.

## Why this exists

Cambridge puts zero to B2 at 500–600 guided hours. This repo has 30 authored
units, about 15 hours. Authored content cannot close that gap at any budget, so
the hours have to come from material the learner already wanted to read. That is
what every product past the beginner plateau does.

## What was wrong before

This repo previously concluded that no naturally-occurring English was usable at
this learner's vocabulary size, from a real measurement: Aesop 0 of 290
paragraphs at 95% coverage, Simple English Wikipedia 0 of 18.

The measurement was right; the conclusion was not. 95% and 98% are thresholds
for **unassisted** reading. Holley (1973) glossed the unknown words and found no
statistically significant relationship between comprehension and the density of
unknown words at all. The question a reading product answers is not "can they
read this alone" but "can they read this *here*".

## What reading the sources themselves changed

Everything above this section came from web-search summaries. Reading the papers
turned up three things no summary carried, and two of them move the design.

**The 95% threshold was never a threshold for reading alone.** Laufer and
Ravenhorst-Kalovski name two: an *optimal* threshold of 8,000 word families
giving 98% coverage, and a *minimal* one of 4,000–5,000 families giving 95%. And
the minimal threshold, in their own words, "enables learners to read **with some
guidance**, and leads to independent reading after 56 academic hours."

So 95% is where a learner can read *with help*. This product's help is a tap that
gives a Vietnamese meaning and the sound. The threshold the surface has to clear
is lower than 95%, not equal to it.

**Vocabulary growth helps comprehension even when coverage does not move.**
Their result: "small increments of vocabulary knowledge contribute to reading
comprehension even though they hardly improve text coverage." Coverage is a
coarse instrument that understates what learning a word is worth. A product that
gated reading on a coverage percentage would be withholding a benefit its own
metric cannot see.

**Video is a poor first step for a beginner, and now there is a number.**
Peters and Webb measured incidental vocabulary from watching one full-length TV
programme: the experimental group learned **4 words on average** (+8.31%) against
1.5 for controls — significant, F(1,60) = 15.99, p < .0001, with viewing
explaining 21% of variance.

Four words per episode. And gains rose with prior vocabulary knowledge:
high-proficiency learners learned significantly more than low-proficiency ones.
Video rewards the vocabulary you already have, which is exactly what a beginner
does not have. **Reading with glosses first, video second** — the ordering was a
hunch before this paragraph and is a measurement after it.

## Seven decisions the evidence makes for us

### 1. Vietnamese glosses, not English definitions

L1 glossing beat L2 glossing across 78 effect sizes from 26 studies
(g = 0.33, p < .001), and the advantage was **largest for beginners** — this
learner exactly. The 1,838 Vietnamese glosses already in the repo are the right
asset, not a shortcut around writing English definitions.

### 2. Audio with the text, never silent reading alone

Over 26 weeks, audio-assisted readers improved **substantially more** than silent
readers on both reading rate and comprehension. Reading while listening is also
how a beginner learns where one word stops and the next begins — the thing they
fail at first. Every line must be playable.

### 3. Count lemmas, not word families

A word family credits the learner with *nation, national, nationality,
internationalise* for knowing *nation*. That unit is validated for learners with
extensive exposure **and a Germanic first language**; Vietnamese is neither. And
reaching a reading threshold does not require most derived forms — a few frequent
affixes carry the coverage on basewords and inflections.

So the counter is baseword + inflections. Counting families here would inflate
the one number this product asks the learner to trust.

### 4. Limit the choice of text, and keep some accountability

This is the finding that contradicts the products. The 2025 meta-analysis of
extensive reading (34 studies, 3,942 learners) found effects were **larger when
learners' text choice was limited and when some form of accountability was
included**.

LingQ and Refold say read whatever you like. The evidence says a bounded shelf
plus something that checks beats an infinite library plus nothing. So: a curated
shelf sized to this learner, and a short comprehension check that costs seconds —
not a free-for-all.

### 5. Prefer the same author and the same topic

Narrow reading — several texts by one author, on one theme — repeats
low-frequency vocabulary more than texts drawn from different authors. That
repetition is not a nicety; see the next decision.

### 6. Reading alone will not do it, and the numbers say why

To have a 50% chance of merely recognising a word's **form**, a learner needs
more than **8** encounters. For a 50% chance of recalling its **meaning**, more
than **14**. Across studies the range is 3–17.

And the pick-up rate from reading is about **one word in twelve** — one in five
in the most favourable studies.

Reading supplies encounters and meaning-in-context. It cannot supply fourteen
encounters of a particular word on schedule. That is what the spaced repetition
already in this repo is for: **every word the learner taps becomes a review item,
carrying the sentence they met it in.** Reading finds the word; FSRS guarantees
the repetitions reading leaves to chance.

### 7. Volume is the point, and it should be visible

Roughly a book a week is the working figure, and about **60,000 words** is where
patterns start recurring usefully. The learner should be able to see words read,
because that is the quantity the effect depends on — and unlike a streak, it
cannot be lost.

## The effect size, stated honestly

This document has quoted d = 1.32 for extensive reading and vocabulary. That
figure is from a vocabulary-specific meta-analysis. The 2025 meta-analysis across
all domains — reading comprehension, vocabulary, fluency, motivation, writing,
oral proficiency — reports effects that are **positive everywhere but small to
medium**.

Quote the conservative one. Extensive reading is the best-supported unbuilt lever
here; it is not a guarantee of a large gain in everything.

## What the surface must do

1. Render real text word by word, each word carrying its status for this learner:
   never seen / learning / known.
2. One tap on a word: Vietnamese meaning, its audio, the sentence it sits in, and
   a way to mark it known.
3. Play any line, and the whole text.
4. Show words read and words known. Both only grow.
5. Send every tapped word into FSRS with its sentence.
6. Offer a bounded shelf, grouped by author and topic, with a short check at the
   end of a text.

## What it must not do

- Not claim a tapped word is known. Tapping is meeting; the review schedule
  decides knowing, and the product already separates independent from supported
  evidence.
- Not report a percentage of comprehension it did not measure.
- Not reset anything at midnight.
