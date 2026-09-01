# How to build an English site for Vietnamese learners that is actually good

The question the product owner asked, and the answer this project can defend
after a day of reading sources rather than summaries.

## The short answer

Build for **assembly**, not for vocabulary or motivation. Everything specific
about Vietnamese learners points at the same gap, and it is not the gap most
products are built to fill.

## Why "for Vietnamese" is not marketing

English and Vietnamese differ in the machinery that turns words into sentences,
not just in the words. Vietnamese has **no verb conjugation, no articles, and no
plural inflection.** A Vietnamese speaker learning English is not missing
vocabulary items; they are missing an entire apparatus their first language
never had.

The error data says exactly this. Across studies of Vietnamese learners' writing
the top three error types are **prepositions, articles and tenses**, and verb
tense and aspect alone accounted for **28% of syntactic errors — the largest
single category.** Articles are omitted or used inconsistently because the rules
"were non-existent in their L1". Plural marking is dropped because Vietnamese
nouns do not inflect.

And in speech, the same story from the other side: 85% of learners in one
interview study reported pronunciation difficulty traceable to Vietnamese being
tonal, with English intonation deviating as a result; /θ/ and /ð/ collapse to
/t/ or /s/ because the sounds do not exist; northern speakers mix /l/ and /n/.
On consonant clusters, measured on 36 learners: **77.4%** of two-consonant
errors were feature change — overwhelmingly the unaspirated /p/ /t/ /k/ — and
**78.2%** of three-consonant errors were deletion.

So "for Vietnamese learners" means a specific, short, measurable list. Not a
Vietnamese interface on a generic course.

## The finding that should change what gets built

From the same interview study: Vietnamese learners showed **high motivation and
enthusiasm** and still struggled, because the interference was structural.

That is the opposite of the assumption almost every language product is built
on. Streaks, leagues, points, daily reminders — the whole retention apparatus —
address a motivation problem this learner does not have. And the evidence
already collected in this repo says those mechanics correlate with nothing
anyway: external and introjected regulation were **unrelated** to language
achievement in a 2025 multilevel meta-analysis.

**Do not build motivation. Build the missing machinery.**

## Seven things such a product owes

**1. A course, not a menu.** Design starts with goals; principles come after.
This repo had eight documents of principles and no goals, and it produced
eighteen learner-facing routes with three separate "review" surfaces. Nation and
Macalister put environment and needs analysis *first* for this reason.

**2. Production as the spine.** The blocked step is assembly, so the daily
session has to end in the learner producing a sentence, not recognising one.
Recognition scores better on tests — d = 0.69 against d = 0.47 — and drains
away: form recognition fell from 18% to 6% by follow-up while meaning recall
rose from 9% to 12%. A product that optimises for the number that moves fastest
builds the wrong thing.

**3. Vietnamese as the language of explanation.** L1 glossing beat L2 glossing
across 78 effect sizes from 26 studies, and the advantage was largest for
beginners. Explaining a learner's progress in English jargon to someone who came
to learn English is the page failing at its one job.

**4. Enough material to fill the hours.** Cambridge puts zero to B2 at 500–600
guided hours. No authored syllabus reaches that. The hours have to come from
material the learner already wanted to read, with a layer over it — which is
what every product that survives past beginner does.

**5. Silence as a first-class mode.** This learner is often somewhere he cannot
speak aloud. A production path that only works in private is a path that mostly
goes unused. Typing a missing word is production and works anywhere.

**6. The specific sounds, not "pronunciation".** Aspirated /p/ /t/ /k/, final
consonants, /θ/–/ð/, and for northern speakers /l/–/n/. High variability
phonetic training has the strongest evidence in this whole file — g = 0.67
against a control across 79 studies — and it only works if it trains the right
contrasts.

**7. Honesty about the timeline.** Thirty minutes a day is about 182 hours a
year, so B2 is roughly three years. At that horizon the product's job is not to
be the fastest method. It is to waste nothing, and to show movement often enough
that the learner is still here next year.

## What this product still owes

Direct translation producing unidiomatic English was the other theme in the
interview data — L1 thought patterns surviving into L2 output. Nothing here
addresses it, and the honest treatment is formulaic sequences: chunks retrieved
whole rather than assembled word by word from Vietnamese. The curriculum schema
already calls its unit `targetChunks` while the review key is a single word.
That gap is the next real piece of work.

And **evaluation** — whether any of this works for this learner — has no
instrument beyond `/measure`. It is the step that closes the loop and it is not
built.
