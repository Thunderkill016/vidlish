# Vidlish Product & Business Master Plan

**Status:** priority source of truth  
**Owner direction:** build Vidlish first as the owner's own English-learning system; external/commercial validation is deferred until explicitly reactivated  
**Updated:** 2026-08-22  
**Applies to:** product, learning, AI, infrastructure, security, future business validation and rollout

---

## 1. Why this document exists

Vidlish has accumulated substantial technical and learning-design work. The current goal is simpler than the previous startup-validation roadmap:

> Make Vidlish good enough that its owner can use it as a real English-learning system, every day, and let durable learning evidence drive what gets built next.

The active questions are therefore:

1. Can the learner start from the English they can actually handle now?
2. Does Vidlish create durable evidence of independent recall rather than completion theatre?
3. Can the learner use language in a changed context?
4. Does that evidence survive a delayed review?
5. Does support decrease as evidence strengthens?
6. When the learner gets stuck or the evidence chain breaks, what is the smallest product cause to fix?

Business questions — external usability, cohort retention, willingness to pay, unit economics, legal/commercial rollout — remain useful if Vidlish later becomes a product for other people. They are **not the current blocker** for improving the owner's learning system.

---

## 2. Product mission

Vidlish is not fundamentally “AI turns a YouTube URL into a lesson.” That is a replaceable mechanism.

The product mission is:

> Help one Vietnamese learner progress from no usable English toward listening, speaking, reading, and writing ability through comprehensible input, capability evidence, changed-context use, delayed review, and progressively less support.

The compounding value is:

```text
comprehensible input at the learner's level
+ personal capability evidence
+ varied delayed review
+ progressively less support
```

### Video is a source, not the centre

Vidlish began as a YouTube-first product for A2–B2 learners. That source-grounded path remains valuable and technically mature.

But authentic English video is not the correct first input for a learner who cannot yet understand it. The source strategy is therefore:

- generated or curated beginner input while authentic media is not yet comprehensible;
- source-grounded YouTube input when the learner is ready;
- the same evidence discipline across both.

The dashboard, roadmap and progress model must not imply that creating a video lesson is the main daily job.

---

## 3. Current verified project state

Learning Model v2 is merged into `main`; the former integration branch is historical.

Current integrated foundations include:

- learner-first product shell;
- beginner `/start` flow for zero/very-low lexical evidence;
- server-bound beginner evidence challenges;
- durable learning sessions and privacy-safe attempt evidence;
- server-confirmed support/replay evidence;
- changed-context transfer for source lessons;
- delayed review scheduling for source-lesson items;
- capability-oriented progress views;
- source-grounded YouTube generation path;
- Supabase RLS/RPC + pgTAP;
- Chromium product journeys;
- durable Supabase Golden Session journey.

Production-shaped v2 authoring has produced and published `lesson_versions`. That proves reachability; it does not prove authoring reliability, teaching effectiveness, retention, willingness to pay, or commercial readiness.

### Important current gap for the personal learner

The beginner path stores narrow independent word evidence and within-session reuse, but it does **not yet have its own durable changed-context + cross-session delayed-review chain** comparable to source-lesson review items.

Do not hide this gap by treating a beginner word as retained merely because it was independently produced once. Closing this gap is a legitimate personal-learning priority.

---

## 4. Active development loop: owner dogfooding

The active program is no longer blocked on recruiting five external participants.

Use this loop instead:

```text
owner learns in Vidlish
→ durable evidence is written by server-authoritative paths
→ progress UI projects only claims that evidence supports
→ learner follows the next evidence-bearing action
→ observed friction / missing evidence becomes a bounded feature
→ repeat
```

Rules:

- the owner is the first real learner, not a synthetic fixture;
- fixture/CI still proves software behavior, not learning;
- one learner cannot prove population-level effectiveness, and the product must never say otherwise;
- personal use is enough to decide what is useful to build **for the owner's own learning**;
- external market-validation gates reactivate only when the owner explicitly wants to validate Vidlish for other users or commercial rollout.

---

## 5. Personal learning checkpoint

The personal progress surface should expose the strongest durable claim the system can currently make, not a level/XP score.

Claim strength is monotonic:

```text
no independent evidence yet
→ independent retrieval / production observed
→ independent changed-context use observed
→ delayed transfer observed
```

Evidence rules:

- beginner `knownWords()` counts only independently produced words under the current narrow policy, so it can contribute to the independent stage;
- support-only success does not count as independent;
- exposure count, lesson completion, streaks and scheduler state do not upgrade capability;
- changed-context requires independent evidence plus a successful changed-context attempt;
- delayed-transfer claim requires the earlier prerequisites and a delayed-transfer timestamp;
- one delayed-transfer item means one complete observed evidence loop, **not mastery or fluency**.

The checkpoint exists to answer two learner questions:

1. “What has Vidlish actually observed me doing?”
2. “What should I do next to create stronger evidence?”

---

## 6. Core learning loop

Every serious learner-facing path should strengthen the same small primitive:

```text
understandable input
→ notice what matters
→ retrieve / produce before reveal
→ use it in a changed context
→ receive bounded correction when needed
→ retry where policy requires it
→ meet it again after delay
→ require less support as evidence strengthens
```

The product should not overwhelm a session with summary, vocabulary lists, grammar sections, quizzes, gamification and unrelated generated content.

A short session should leave the learner with an observable capability change or an honest indication of what still needs work.

---

## 7. Learning evidence policy

Track evidence dimensions separately. At minimum the product distinguishes:

- comprehension / recognition;
- productive recall;
- interactional or task use;
- changed-context transfer;
- delayed transfer;
- support level required.

Rules:

- completion != mastery;
- scheduler state != independent capability;
- reading a correction != successful retry;
- reveal/assistance must remain distinguishable from independent success;
- changed-context transfer must actually change context/input;
- delayed transfer must remain separate from immediate transfer;
- UI-local state cannot become authority for durable capability evidence.

The current beginner one-new-target lexical gate is a conservative runtime policy, not a universal definition of i+1 or comprehensibility. Changing it requires a bounded feature and learner evidence.

Vietnamese support is a scaffold and should taper from evidence, not from an invented fixed word count.

The owner permits storing learner writing and recording learner speech when those are necessary for writing/speaking functionality. That does not authorize unrelated raw text/audio collection elsewhere.

---

## 8. Beginner-first priority

For the personal learner, `/start` is the default entry point whenever authentic English is still too difficult.

Current priorities inside this path:

1. serve input that satisfies the current conservative comprehensibility policy;
2. collect independent evidence without letting the browser choose the answer key;
3. reuse known material across varied contexts;
4. add durable cross-session beginner review so independently produced words can be tested after delay;
5. expand beyond lexical-only evidence as listening, reading, speaking and writing capabilities become measurable;
6. reduce Vietnamese/support only when evidence says the learner succeeds without it.

Do not rush the learner into YouTube just because the video pipeline already exists.

---

## 9. Source-grounded content policy

For YouTube/source-grounded lessons:

**Every source quote must come from canonical permitted transcript evidence.**

Boundary:

- deterministic code selects/limits evidence;
- model/provider proposes bounded diagnosis/authoring output and IDs/labels;
- server maps labels to canonical IDs;
- server hydrates exact text/timestamps;
- evidence outside the allowlist is rejected;
- quality/grounding gates run before publish.

The model must not invent a quote and have the system call it grounded.

YouTube stays available as a secondary source path when it is useful for the learner.

---

## 10. Learner surfaces

### Dashboard

Priority order:

1. start/continue learning at the learner's current level;
2. complete genuinely due review;
3. continue an active source lesson if one exists;
4. inspect capability/evidence history;
5. create a new YouTube lesson as an optional source path.

### Progress

The page should show:

- narrow independent evidence;
- changed-context evidence;
- delayed-transfer evidence;
- what does **not** count as capability;
- one clear next evidence-bearing action.

### Learning surface

One current task at a time. Input first; learner action before reveal; bounded feedback after the action; support progressively revealed rather than dumped upfront.

---

## 11. AI/provider decision

Production uses:

```text
one enabled provider
+ one production model
+ one production project/key
+ server-only calls
```

No automatic multi-provider fallback is needed for the personal-learning goal.

Models are bounded proposal/authoring components, not authority for learner evidence, answer keys, grounding truth or progression.

Model benchmarking is deferred until a real personal-learning bottleneck justifies it. When needed, benchmark at most three candidates and evaluate cost per **accepted** learning artifact, not token price alone.

---

## 12. API-key, privacy and security safety

- Local/CI work uses fixtures, fakes and local Supabase by default.
- Do not call production Supabase, Gemini, Supadata or another paid provider unless the task explicitly authorizes it.
- Never expose service/provider keys in client code, logs, screenshots, prompts, tests or repository files.
- Browser action must not be authority for canonical target/answer/evidence truth.
- `SECURITY DEFINER` privilege is part of the write boundary; direct-table RLS alone is not enough.
- Preserve owner scoping structurally where possible, not only in UI/routes.

Personal-first does not mean “security no longer matters”; the owner should be able to trust their own learning history.

---

## 13. Deferred market-validation program

The existing five-person Golden Session protocol, evaluator and local study harness are retained unchanged as a **future external-user validation instrument**.

Current state:

- technical harness exists and is tested;
- five genuine participant records have not been collected;
- the old five-person Gate 5 therefore remains **unpassed**;
- that unpassed state does not block personal-first development.

If the owner later wants Vidlish to become a product for others, reactivate the market sequence deliberately:

1. five-person moderated usability using the predeclared Golden Session protocol;
2. 20–50 learner cohort with predeclared retention/learning thresholds;
3. authoring/provider economics benchmark;
4. payment, retention, legal and operations validation;
5. rollout.

Do not fabricate old Gate 5 records or retroactively call the market gate passed.

The Golden Session files and `/learning-lab/v2/usability*` tooling remain useful for that future purpose but are not daily learner UX.

---

## 14. Future business model

Commercialization is optional and deferred.

If reactivated, the subscription should pay for the compounding learning system rather than merely more AI calls:

- persistent learner model;
- adaptive input selection;
- richer review queue;
- capability/evidence history;
- larger bounded source allowance;
- economically viable priority processing.

Pricing, payment intent, retention, gross margin and legal readiness remain hypotheses until real external behavior exists.

Do not integrate multiple payment gateways, promise unlimited generation, or perform commercial rollout while the current goal is personal learning.

---

## 15. Legal/commercial notes for later

Commercial arbitrary-YouTube scale still requires legal review. If that phase returns:

- prefer official embed/player behavior;
- do not download/rehost video without a valid basis;
- do not create a public lesson catalog from arbitrary sources;
- keep transcript-derived storage bounded and purpose-limited;
- provide source attribution, disclosures and copyright/takedown paths as required;
- complete privacy/terms/refund/retention/deletion/incident/tax/e-commerce requirements before broad paid rollout.

These are not the active product blocker today.

---

## 16. Execution priority now

### P0 — make Vidlish useful for the owner's real learning

- `/start` is the primary entry point below authentic-media readiness;
- use Vidlish for genuine learning sessions rather than synthetic learner records;
- inspect `/progress` for the strongest evidence actually earned;
- follow the next evidence-bearing action;
- record observed friction as bounded product work.

### P0 — close the beginner delayed-review gap

The zero/very-low path currently cannot prove its independent word evidence survives across sessions. The next learning-system slice should connect beginner evidence to a durable, changed-context delayed review without manufacturing mastery claims.

### P0 — protect evidence integrity

- server authority before UI projection;
- support/reveal remains distinct from independence;
- no answer-key fields chosen by the browser;
- no stale/local UI state promoted to durable capability;
- no completion/streak/XP shortcut into stronger claims.

### P1 — improve from observed personal friction

Examples include confusing instruction, input too hard/easy, missing listening support, poor audio quality, review timing, weak correction, inability to practice speaking/writing, or a progress claim that does not match the learner's actual ability.

Only build these from an observed need or a clearly traced learning-system gap.

### Deferred — external validation and business

Five-person usability, cohorts, payment, economics, legal rollout and broad market work stay parked until explicitly reactivated.

---

## 17. Do not do next

Do not immediately:

- recruit five people merely to unblock personal development;
- add more target languages;
- add arbitrary media/file types;
- add several AI providers or automatic fallback routing;
- build gamification/social layers to create activity metrics;
- add payment gateways;
- lower evidence gates to make progress numbers rise;
- claim mastery from completion;
- claim learning from fixture CI;
- hardcode the product to one account identity — “one learner first” is product scope, not an authorization bypass.

---

## 18. Next deliverable

The next product deliverable is not another market-validation artifact.

It is:

> A personal learner can enter through `/start`, see honest independent evidence in `/progress`, and then take beginner material through a real cross-session changed-context delayed review so Vidlish can observe whether it was retained.

That closes the largest current break in the personal learning loop.
