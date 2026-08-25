# What the top repositories in this space actually do

Six searches and four clones, done on 25/08/2026 so that nobody repeats them.
Each verdict below comes from reading the code, not the README — twice the
README said something the code did not do.

## The finding that matters most

**No repository does this end to end.** Not one covers curriculum, input corpus,
measurement and web architecture together. The two most complete language
platforms on GitHub both track progress as a **position**, not as evidence.

---

## Read Frog — `mengxi-ream/read-frog` — 9.3k ★ — GPL-3.0 + commercial

A browser extension that turns whatever the learner is already reading into
material: tap an unknown word, it goes to a notebook, the notebook becomes
flashcards, the cards are scheduled Again/Hard/Good/Easy.

**Worth taking as direction, not code.** Its input source is the one thing this
product has no equivalent of and cannot author its way to: *real text the
learner already needs to read*. For this learner that is documentation, issues
and blog posts. It is a graduation path — the i+1 gate would reject nearly all
real web text at A1 — and it sits naturally *before* the video path.

Its rating scale is the same four this codebase already uses.

## FreeLingo — `ArtCC/freelingo` — AGPL-3.0 + commercial licence

710 files, CEFR A1→C2 in six languages, LLM-generated lessons over a
deterministic week/day grid, SM-2 scheduling, placement assessment.

**Its specification format is better than ours and was adopted.** 37 spec files,
each with `description` + `applyTo` frontmatter naming the files it governs,
then Overview → Product rules → **Out of scope**. It also separates *history*
(phase specs) from a single *current-state* document per domain.

**Its progress model was rejected.** `progress_day` is a 0-indexed integer
counting completed days. Finishing a day proves attendance; nothing brings
material back because the learner could not produce it. That is the model this
product deliberately replaced with evidence.

It has SM-2, not FSRS — the same retention for 20–30% more reviews.

## Earthworm — `cuixueshe/earthworm` — 11k ★ — AGPL-3.0

Sentence construction by joining words, with points and leaderboards.

**Third-party write-ups claim it uses spaced repetition. It does not.** Across
293 source files: `fsrs` 0, `spaced` 0, `nextReview` 0, `ebbinghaus` 0. The 14
matches for `interval` are all `setInterval`. Progress is
`coursePack → course → statement` ordered by an index, and a cursor into it.

Its content is a three-column table — Chinese, English, phonetic — with no
can-do, no grammar reference, no skill and no evidence.

**Worth taking:** the idea that the content step belongs in the toolchain. That
became `pnpm curriculum`. **Not taken:** its gamification. Points and
leaderboards are seductive detail, and removing seductive detail is the largest
effect in the multimedia-learning literature (g = 1.00).

## Feedback Prize ELL 1st place — `rohitsingh02/…` — MIT

The winning ensemble for scoring English-learner writing. MIT, so unlike the
platforms above its code could be used.

**Not deployable here.** It is a transformer ensemble that needs a GPU, and this
product runs on serverless with none. Its value is as a reference for *what
writing feedback should score* rather than as something to ship. The exact
analytic dimensions were not confirmed from the repository and must be read from
the competition before being quoted.

## UniversalCEFR — 505,807 CEFR-labelled texts

**Licence-blocked.** CC BY-NC-SA or "Unknown" depending on the source dataset.
NonCommercial reaches derived work. Same trap as Tatoeba's audio, where 91% of
recordings could not be reused.

## LibreLingo

Archived by its maintainer. Forks exist; none evaluated.

---

## Where this product is ahead, and why that is not a boast

| | Earthworm | FreeLingo | here |
| --- | --- | --- | --- |
| spacing | none | SM-2 | FSRS |
| progress measured by | cursor | days completed | evidence produced unaided |
| anchored to a published inventory | no | CEFR levels | CEFR-J, A1 63/63 and A2 31/31 |
| four skills as separate behaviour | no | lesson types | yes, each graded |
| a measure the product does not teach to | no | placement only | elicited imitation, repeatable |

The gap is not effort. Both platforms are larger and older than this one. The
difference is that they answer "did the learner attend?" and this one is built
to answer "can the learner do it?" — and that question is harder to fake.

**What none of them have, and neither do we:** feedback on writing.
