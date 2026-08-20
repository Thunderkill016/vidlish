# Vidlish × Language Reactor — Execution Plan

**Status:** active execution ledger  
**Created:** 2026-08-20  
**Benchmark product:** Language Reactor  
**Applies to:** product, learning science, learner model, video UX, review, AI authoring, analytics, rollout  
**Repository baseline:** `main@aa433f07de5784ed806949b028ac25903458f238`  
**Supersedes:** ad-hoc feature sequencing  
**Does not supersede:** `VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md` business/legal/rollout gates

---

## 0. How to use this file

This document is the single execution ledger for turning Vidlish from a generated-video-lesson prototype into a compounding learning product.

Every implementation PR that materially changes the learner experience should update this file in the same PR or immediately after merge.

### Status convention

- `[ ]` not started
- `[~]` in progress
- `[x]` verified complete
- `[!]` blocked / defect
- `[?]` hypothesis requiring learner evidence

### Required update fields per completed item

When marking an item complete, add:

```text
PR: #<number>
Merge SHA: <sha>
Evidence: <CI run / pgTAP / Chromium / moderated test / cohort metric>
Date: YYYY-MM-DD
```

Do not mark an item complete because code exists. Completion requires its acceptance criteria and test gate to pass.

### Priority model

```text
P0 = product path is broken, misleading, unsafe, or fixture-bound
P1 = core learning value / retention loop
P2 = personalization and compounding intelligence
P3 = expansion after evidence
```

---

## 1. Why Language Reactor is the benchmark

Language Reactor is the closest proven product benchmark for Vidlish because it has demonstrated large-scale demand for learning from authentic media rather than from a fixed course.

Current public evidence at the time this document was created:

- Chrome Web Store: about **2,000,000 users** and **4.2/5 from ~4.3K ratings**.
- Product lineage dates to 2018 (`Language Learning with Netflix`).
- YouTube support arrived in 2020.
- Saved items, frequency support, learning stages, PhrasePump, dictionaries, podcasts/media and AI chat have been added over several years.
- Official study advice starts with listening without text, then source-language text, then translation/dictionary support, followed by another listen.

### Official benchmark sources

- https://chromewebstore.google.com/detail/language-reactor/hoombieeljmmljlkjmnheibnpciblicm
- https://www.languagereactor.com/help/basic
- https://www.languagereactor.com/help/studytips
- https://www.languagereactor.com/help/saving-words-transition
- https://www.languagereactor.com/help/updates
- https://www.languagereactor.com/help/faq

### What Vidlish should learn from Language Reactor

1. Authentic content is the learner-facing surface.
2. Playback precision matters enough to be a core product capability.
3. Hiding/revealing text is a learning interaction, not merely display preference.
4. Vocabulary becomes more valuable when it persists across content.
5. Frequency/salience helps learners ignore low-value vocabulary.
6. Review needs a dedicated surface instead of being hidden inside old lessons.
7. The product can grow from one media workflow into a learner-owned language memory.
8. AI is useful after the content interaction loop is good; AI alone is not the product.

### What Vidlish must NOT copy

- permanent dual subtitles as the default;
- vocabulary highlighting as proof of learning;
- `KNOWN` as equivalent to demonstrated capability;
- broad media expansion before retention is proven;
- generic chatbot as the primary learning loop;
- Chrome-extension-first architecture;
- Anki-style identical cards as the full review model;
- 40-language breadth before English-for-Vietnamese product-market evidence;
- feature count as the roadmap metric.

### Vidlish differentiation

Language Reactor is strongest as a **comprehensible-media toolbox**.

Vidlish should become a **learning-evidence engine built on authentic media**:

```text
source video
→ unaided attempt
→ progressive support
→ retrieval
→ changed-context use
→ delayed review
→ learner evidence
→ better selection in the next video
```

The durable advantage is not “AI creates a lesson.”

It is:

```text
learner-owned interest
+ grounded source evidence
+ durable personal learning evidence
+ adaptive support
+ varied delayed retrieval
+ cross-video selection
```

---

## 2. Product North Star

### Learner-facing promise

> Hear and use English that previously required subtitles, using videos you already care about.

### Core loop

```text
choose a video
→ listen before text
→ attempt meaning
→ unlock only the support needed
→ notice 1–2 useful items
→ retrieve without answer
→ use in a changed context
→ hear the source again
→ review later
→ meet the same capability again in another source
```

### Product must answer these questions better over time

1. What can this learner already understand without support?
2. What do they understand only with caption/meaning/replay support?
3. Which words/chunks are worth learning from this source?
4. Which items can they retrieve independently?
5. Which can they use under changed conditions?
6. What is due now?
7. What content would provide the next useful encounter?
8. Is the learner needing less support over time?

### Anti-goals

Vidlish is not primarily:

- a transcript reader;
- a subtitle translator;
- an AI quiz generator;
- a vocabulary list generator;
- a generic English chatbot;
- a fixed curriculum clone;
- an XP/streak game;
- a claim engine for “mastery” after one session.

---

## 3. Current repository truth at baseline

Baseline audited commit:

```text
aa433f07de5784ed806949b028ac25903458f238
Merge PR #76 — learner can open their own v2 lesson
```

### Already strong foundations

- canonical transcript and permitted-segment provenance;
- original-English eligibility gate;
- deterministic source selection;
- Gemini v1/v2 structured authoring foundation;
- immutable `lesson:v2` blueprints;
- owner-scoped lesson/session persistence;
- privacy-safe attempt evidence;
- support-event persistence;
- FSRS review state and scheduling foundation;
- pgTAP owner/RLS/idempotency coverage;
- Chromium fixture journeys;
- server-side source hydration rather than trusting generated quote text;
- completion explicitly separated from mastery in v2 product direction.

### P0/P1 defects found by whole-repository audit

These must be closed before adding large new product surfaces.

#### VLR-001 — real v2 attempt path still evaluates against Golden fixture

**Status:** `[!]`  
**Priority:** P0

Current route:

`src/app/api/learning-lab/v2/attempts/route.ts`

still calls:

```text
createGoldenSessionLearningBlueprint()
```

A learner can open a real generated blueprint, but attempt submission can still be validated/evaluated against the Golden fixture.

Acceptance:

- no learner production write path imports Golden fixture;
- server resolves the blueprint from the owned durable session/lesson version;
- arbitrary generated activity IDs work;
- activity IDs absent from the owned blueprint are rejected;
- hydrated source evidence comes only from that owned blueprint;
- one real-generated-blueprint E2E proves the path.

#### VLR-002 — support events still use Golden blueprint and fixture policy

**Status:** `[!]`  
**Priority:** P0

Current route:

`src/app/api/learning-lab/v2/support-events/route.ts`

hard-codes both Golden blueprint and fixture runtime policy.

Acceptance:

- resolve owned session → lesson version → real blueprint;
- derive/use real runtime policy for that blueprint;
- support unlock boundary remains server-authoritative;
- replay evidence remains source-range-bound;
- no Golden fixture import in production support route.

#### VLR-003 — delayed review resolver only understands Golden item `a-member-of`

**Status:** `[!]`  
**Priority:** P0

Current fixture resolver supports a single hard-coded item.

Acceptance:

- every durable reviewable target item can produce a bounded review plan;
- review plan is generated/derived from persisted lesson evidence, not a fixture switch;
- retrieval answer is hidden before attempt;
- changed-context review is distinct from exact-source recall;
- unknown/unresolvable items fail closed rather than fabricating a task.

#### VLR-004 — no arbitrary generated-v2 end-to-end journey in CI

**Status:** `[!]`  
**Priority:** P0

Current durable/Chromium journeys prove Golden-shaped data well but do not prove a generated blueprint with arbitrary activity/item IDs across real session APIs.

Required journey:

```text
publish arbitrary lesson:v2
→ open learner route by jobId
→ start/resume owned session
→ submit incorrect attempt
→ unlock support
→ retry
→ recall
→ transfer
→ complete session
→ persist review state
→ create delayed review
→ retrieve/transfer review
```

Must assert:

- ownership;
- idempotency;
- no raw productive text persisted;
- no answer before attempt;
- session progression matches blueprint;
- no fixture IDs are required.

#### VLR-005 — assisted-completion client/server progression mismatch

**Status:** `[!]`  
**Priority:** P0

Client can treat max-attempt exhaustion as assisted completion while server progression may remain on the same incorrect activity.

Acceptance:

- one authoritative progression rule shared by client display and server persistence;
- if assisted completion is allowed, it must be explicitly represented and persisted;
- if not allowed, UI must not expose Continue;
- browser regression test covers the max-attempt incorrect case.

#### VLR-006 — production config does not fail closed on fixture v2 authoring

**Status:** `[!]`  
**Priority:** P0

Acceptance:

- production runtime rejects `LEARNING_AUTHORING_PROVIDER=fixture`;
- test proves production config fails before serving requests;
- `.env.example` documents authoring/session adapter choices explicitly.

#### VLR-007 — stale PR #68 must not be merged blindly

**Status:** `[!]`  
**Priority:** P1

PR #68 contains useful evidence-producing authoring gates but currently targets an old base and is non-mergeable against the current `main`.

Salvage requirements:

- rebase/re-implement selectively on current main;
- preserve current authoring split and PR #69–#76 behavior;
- require first unaided gist;
- require chunk recall;
- recall cannot start with answer text visible;
- require later changed-context transfer sharing at least one target item;
- rerun exact-head full CI.

---

## 4. Target product architecture

The target architecture borrows Language Reactor's media interaction strengths but uses Vidlish's evidence model as the core.

```text
YouTube source
    ↓
metadata / transcript / language evidence
    ↓
segment + communication-event analysis
    ↓
learner-state intersection
    ↓
bounded lesson authoring
    ↓
VIDEO LEARNING WORKSPACE
    ├─ precise replay
    ├─ first listen without text
    ├─ progressive caption/hint/meaning
    ├─ retrieval
    └─ transfer
    ↓
privacy-safe evidence
    ↓
item/capability state
    ↓
FSRS due scheduling
    ↓
varied review
    ↓
cross-video candidate selection
```

### Authority boundaries

**Deterministic/server authority:**

- source allowlist;
- timestamps;
- item identity;
- answer/reveal boundary;
- progression;
- support unlock;
- owner scope;
- idempotency;
- due scheduling;
- budget/rate limits;
- schema + pedagogical gates.

**Model responsibility:**

- bounded diagnosis;
- selecting among already-permitted candidates when deterministic rules leave ambiguity;
- Vietnamese explanation;
- natural changed-context scenario generation;
- bounded examples/distractors;
- future correction suggestions where contract permits.

AI output never becomes source evidence by declaration.

---

# PHASE 0 — Make real v2 trustworthy

**Objective:** remove all Golden-fixture dependence from learner production runtime and prove arbitrary generated lessons work end-to-end.

**Language Reactor lesson:** reliable media interaction must work before layering vocabulary memory and AI features.

**Status:** `[!]` blocked by VLR-001…006

### Deliverables

- [ ] VLR-001 real blueprint attempt resolution
- [ ] VLR-002 real blueprint support resolution
- [ ] VLR-003 generic delayed-review plan resolution
- [ ] VLR-004 arbitrary generated-v2 durable E2E
- [ ] VLR-005 assisted-completion consistency
- [ ] VLR-006 production fixture-authoring guard
- [ ] replace fixture-specific imports in learner production API tree
- [ ] add runtime assertion that session lesson version matches resolved blueprint
- [ ] update stale docs claiming modules are fully connected

### Exit gate

Phase 0 passes only when:

```text
one non-Golden generated blueprint
can be opened, attempted, supported, completed and reviewed
using production-shaped APIs and Supabase persistence
without any fixture IDs or fixture blueprint/policy imports
```

### Required evidence

- unit tests;
- exact-head typecheck/lint/build;
- pgTAP owner/RLS tests;
- Supabase-backed arbitrary blueprint journey;
- Chromium journey;
- grep/search proving no Golden imports in production learner API routes.

---

# PHASE 1 — Video Learning Workspace

**Objective:** make source interaction itself excellent before adding more AI.

**Language Reactor features to adapt:** precise replay, subtitle-level playback, auto-pause, hide/reveal text, fast lookup/support.

**Vidlish difference:** support is sequenced by learning policy and recorded as evidence.

**Status:** `[ ]`

## 1.1 Precise source playback

### VLR-101 — segment replay as first-class action

- [ ] current activity always knows its evidence range;
- [ ] replay one bounded source segment/window;
- [ ] replay ordinal persisted server-side;
- [ ] second+ replay distinguishable from initial exposure;
- [ ] player does not drift to unrelated transcript ranges.

Acceptance:

- source range comes from canonical evidence;
- replay is available before text reveal unless activity policy explicitly forbids it;
- no transcript text required to request replay.

## 1.2 Slow playback as support, not default

### VLR-102 — wire playback-rate selector to YouTube player

Existing groundwork:

`select-learning-playback-rate.ts`

Required:

- [ ] expose available playback rates from player;
- [ ] select closest supported rate to 0.75×;
- [ ] reapply after `loadVideoById` / cue transitions where YouTube resets speed;
- [ ] listen to playback-rate change events;
- [ ] unlock only when `slower_playback` support is permitted;
- [ ] persist slow-playback support evidence;
- [ ] never pretend speed changed when YouTube rejects it.

## 1.3 Progressive caption behavior

### VLR-103 — text is an earned scaffold

Default sequence:

```text
source audio
→ replay
→ context hint
→ keyword hint when safe
→ English caption
→ chunk boundaries
→ Vietnamese meaning
→ slow playback when useful
```

Rules:

- [ ] first-listen gist begins with caption hidden;
- [ ] answer-bearing hint is omitted rather than weakened into fake help;
- [ ] caption reveal records support level;
- [ ] meaning reveal records support level;
- [ ] returning to lesson restores durable support state honestly.

## 1.4 Listening replay after learning

### VLR-104 — close the before/after loop

At the end of the session:

- replay original source without text first;
- ask a bounded recognition/comprehension check;
- show the learner the support difference from first encounter;
- do not call improvement “mastery.”

### Phase 1 metrics

Instrument:

- first-listen attempt rate;
- replay count before first text reveal;
- highest support level used;
- caption reveal rate;
- slow-playback usage;
- source replay after transfer;
- session abandonment by activity.

### Exit gate

A moderated learner should be able to say what changed between the first and final listen without being forced through a long document-style lesson.

---

# PHASE 2 — Learner Language Memory

**Objective:** make every studied video improve the next one.

**Language Reactor feature to adapt:** saved vocabulary, learning stages, frequency-based prioritization, cross-content recognition.

**Vidlish difference:** state comes from observed evidence, not only a manual label.

**Status:** `[ ]`

## 2.1 Evidence-based item state

### VLR-201 — canonical learner item state

Required dimensions:

```text
introduced
practised
retrieved
transfer_attempted
transfer_succeeded
delayed_retrieved
support_history
last_seen_at
last_independent_at
due_at
FSRS card state
```

Do not collapse these into one `known` boolean.

## 2.2 Manual learner control without fake mastery

### VLR-202 — useful manual controls

Allow bounded learner actions such as:

- “Đã quá dễ / bỏ qua”;
- “Muốn gặp lại”;
- “Không hữu ích với tôi.”

Manual actions affect selection priority; they do not create mastery evidence.

## 2.3 Lexical usefulness

### VLR-203 — frequency/salience ranking

Use deterministic ranking before model authoring.

Candidate inputs may include:

- source frequency;
- corpus frequency / dispersion;
- learner novelty;
- communicative usefulness;
- recurrence within source;
- due-state intersection;
- Vietnamese learner difficulty where evidence exists.

TUBELEX remains a candidate corpus artifact, not a runtime network dependency.

Requirements before adoption:

- compact/versioned artifact;
- attribution/license review;
- benchmark showing better target selection;
- no CEFR verdict derived from frequency alone.

## 2.4 Real learner snapshot for authoring

### VLR-204 — remove hard-coded personalization defaults

Current authoring must progress from mostly CEFR-driven input to durable learner evidence.

Populate from server-side state:

- [ ] goals;
- [ ] time budget;
- [ ] known/easy item keys;
- [ ] weak/recently failed items;
- [ ] due items;
- [ ] recently reviewed items;
- [ ] historical support need;
- [ ] recent content/topic history where privacy policy permits.

### Exit gate

Two learners with the same CEFR and same source can receive different target selection for explainable reasons grounded in their own learning history.

---

# PHASE 3 — Vidlish PhrasePump / Due Review

**Objective:** create a dedicated review surface that turns prior source learning into durable retrieval.

**Language Reactor feature to adapt:** PhrasePump and due-date saved-item review.

**Vidlish difference:** review varies evidence type and separates scheduler from capability claims.

**Status:** `[ ]`

## 3.1 Review queue

### VLR-301 — due queue becomes primary dashboard action

Dashboard order remains:

```text
continue current lesson
→ due review
→ create from new video
→ progress/history
```

Show:

- number due;
- estimated review time;
- no streak pressure;
- no fake urgency for non-due items.

## 3.2 Varied review ladder

### VLR-302 — same item, different retrieval demand

Possible progression:

```text
source clip recognition
→ source-free recall
→ Vietnamese situation cue
→ changed-context production
→ different-speaker recognition
→ multi-turn use
→ cold transfer
```

Not every item must use every task type.

## 3.3 FSRS boundary

### VLR-303 — scheduling is not mastery

FSRS decides **when** an item returns.

It must not independently assert:

- communicative independence;
- interactional ability;
- changed-context transfer;
- mastery.

### Phase 3 metrics

- due-review start rate;
- due-review completion rate;
- delayed retrieval success;
- delayed transfer success;
- support required during review;
- second review return;
- seven-day return tied to review.

### Exit gate

A learner can leave a lesson, return on another day, retrieve the target without the original answer visible, and generate new evidence that updates scheduling.

---

# PHASE 4 — Cross-video Intelligence

**Objective:** make the learner model affect what parts of future videos become lessons.

**Language Reactor feature to adapt:** persistent vocabulary recognition across content and content discovery.

**Vidlish difference:** content selection is based on gaps + due state + communicative evidence, not only saved-word highlighting.

**Status:** `[ ]`

## 4.1 Transcript × learner-state intersection

### VLR-401 — pre-authoring learner relevance analysis

Before Gemini authoring, compute:

```text
which source windows contain
- due items
- weak items
- useful novel items
- already-independent items to skip
- potential changed-context evidence
```

AI receives a narrower candidate set instead of solving personalization from scratch.

## 4.2 Adaptive content density

### VLR-402 — teach fewer, better targets

The lesson may contain one item if that is the only worthwhile item.

No vocabulary quota.

Selection should optimize:

- followable source context;
- useful target density;
- learner relevance;
- transfer opportunity;
- time budget.

## 4.3 Support fading

### VLR-403 — progressively less help

If the learner previously required:

```text
caption + Vietnamese meaning
```

later encounters should begin with less support and unlock only as needed.

Measure whether highest support level trends downward for recurring capabilities.

## 4.4 Cross-video evidence roles

### VLR-404 — variation across sources

Classify source encounters as possible evidence roles:

- first encounter;
- same-speaker recurrence;
- changed wording;
- different speaker;
- changed pragmatic context;
- cold transfer opportunity.

Do not fabricate a role that the source cannot support.

### Exit gate

A new user video is not treated as a blank slate: selection visibly benefits from prior learning evidence.

---

# PHASE 5 — Bounded AI Tutor

**Objective:** use AI where it creates a learning interaction unavailable through deterministic tasks.

**Language Reactor feature to observe:** AI chat, grammar correction, voice input, conversation memory.

**Vidlish rule:** do not build a generic chat tab first.

**Status:** `[ ]`

## 5.1 Evidence-triggered tutor task

### VLR-501

Tutor input should include bounded evidence such as:

```text
target communicative function
last retrieval outcome
highest support used
transfer outcome
allowed correction focus
learner level/goals
```

Example trigger:

```text
retrieval succeeded
+ transfer required Vietnamese meaning
→ generate one fresh context requiring the same function
```

## 5.2 Correction → retry

### VLR-502

Rules:

- 1–2 high-impact corrections maximum;
- correction must be followed by another attempt;
- raw learner text remains ephemeral unless an explicit bounded persistence schema exists;
- model feedback cannot mark capability independent by itself.

## 5.3 Confidence calibration

### VLR-503

Before feedback on selected closed/retrieval tasks, learner may record bounded confidence:

```text
low | medium | high
```

Use initially for analytics/calibration only.

Do NOT change FSRS or mastery logic until cohort evidence shows a valid use.

## 5.4 Audio/pronunciation boundary

### VLR-504

Pronunciation features remain deferred until:

- audio privacy/retention policy exists;
- acoustic evidence is available;
- evaluator validity is benchmarked;
- no pronunciation score is inferred from transcript text alone.

### Exit gate

AI tutor interactions must produce another observable attempt, not just explanation consumption.

---

# PHASE 6 — Discovery and Next Best Video

**Objective:** reduce the need for the learner to guess what to study next.

**Language Reactor feature to adapt:** YouTube/media discovery and subtitle-aware catalog behavior.

**Status:** `[ ]`

## 6.1 YouTube-only first

### VLR-601

Do not expand to Netflix/books/podcasts/uploads yet.

Recommend YouTube sources using:

- learner topic interest;
- transcript availability/quality;
- language eligibility confidence;
- due/weak item overlap;
- useful novel item density;
- source duration;
- potential variation from recently studied sources.

## 6.2 Recommendation explanations

### VLR-602

Show learner-safe reasons such as:

- “Có 2 cụm đang đến hạn ôn”;
- “Cùng chủ đề bạn đang học, giọng nói khác”;
- “Phù hợp phiên 10 phút.”

Do not expose internal mastery scores or unsupported CEFR precision.

### Exit gate

At least one recommended video is measurably more likely to start/complete than a generic recommendation baseline in a small cohort.

---

# PHASE 7 — Commercial compounding value

**Objective:** monetize the persistent learning system rather than raw AI calls.

**Status:** `[?]` blocked by activation/retention evidence

## Free value hypothesis

- complete first meaningful lesson;
- bounded recurring generation;
- basic review;
- source playback/support loop.

## Paid value hypothesis

- persistent learner model;
- adaptive target selection;
- full due-review queue;
- cross-video intelligence;
- richer learning history;
- bounded AI tutor/transfer variation;
- higher but never unlimited generation allowance.

## Do not sell

- “unlimited AI”;
- higher mastery scores;
- fake premium difficulty;
- answer access as a paywall mechanic.

Commercial gates remain controlled by `VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`.

---

## 5. Unified backlog

| ID | Priority | Status | Deliverable | Depends on | Exit evidence |
|---|---|---|---|---|---|
| VLR-001 | P0 | `[!]` | real blueprint in attempt API | — | arbitrary blueprint E2E |
| VLR-002 | P0 | `[!]` | real blueprint/policy in support API | VLR-001 | support persistence E2E |
| VLR-003 | P0 | `[!]` | generic review planner | VLR-001 | non-Golden item review |
| VLR-004 | P0 | `[!]` | generated-v2 durable/Chromium journey | 001–003 | exact-head CI |
| VLR-005 | P0 | `[!]` | assisted-completion consistency | — | browser regression |
| VLR-006 | P0 | `[!]` | production fixture-authoring guard | — | config test |
| VLR-007 | P1 | `[!]` | salvage learning-science gates from #68 | Phase 0 | exact-head CI |
| VLR-101 | P1 | `[ ]` | precise replay evidence | Phase 0 | Chromium + persistence |
| VLR-102 | P1 | `[ ]` | real slow-playback support | 101 | player test + Chromium |
| VLR-103 | P1 | `[ ]` | progressive caption/meaning | 101 | reveal-boundary E2E |
| VLR-104 | P1 | `[ ]` | final unaided source replay | 103 | session journey |
| VLR-201 | P1 | `[ ]` | canonical learner item state | Phase 0 | fake/Supabase parity |
| VLR-202 | P2 | `[ ]` | bounded learner manual controls | 201 | unit + UX |
| VLR-203 | P2 | `[ ]` | lexical usefulness ranking | 201 | benchmark |
| VLR-204 | P1 | `[ ]` | real learner snapshot authoring | 201 | two-learner deterministic test |
| VLR-301 | P1 | `[ ]` | due-review dashboard queue | 201 | Chromium |
| VLR-302 | P1 | `[ ]` | varied review tasks | 301 | delayed journey |
| VLR-303 | P1 | `[ ]` | FSRS/capability boundary | 301 | invariant tests |
| VLR-401 | P2 | `[ ]` | transcript × learner-state selection | 204 | selection tests |
| VLR-402 | P2 | `[ ]` | adaptive target density | 401 | golden benchmark |
| VLR-403 | P2 | `[ ]` | support fading | 201,302 | cohort trend |
| VLR-404 | P2 | `[ ]` | cross-video evidence roles | 401 | two-video journey |
| VLR-501 | P2 | `[ ]` | evidence-triggered AI tutor | 302 | bounded tutor test |
| VLR-502 | P2 | `[ ]` | correction → mandatory retry | 501 | retry E2E |
| VLR-503 | P2 | `[ ]` | confidence calibration | Phase 1 | privacy-safe analytics |
| VLR-504 | P3 | `[ ]` | audio/pronunciation readiness | legal/privacy gate | benchmark |
| VLR-601 | P3 | `[ ]` | next-best YouTube discovery | 401 | cohort experiment |
| VLR-602 | P3 | `[ ]` | learner-safe recommendation reasons | 601 | UX test |

---

## 6. Metrics and evidence model

Do not optimize roadmap using number of generated lessons.

### Activation

Track:

- generation acceptance rate;
- time to first learning activity;
- first-listen attempt rate;
- first-session completion;
- retrieval completion;
- changed-context transfer completion;
- final source replay completion.

### Learning interaction quality

Track per activity/item:

- attempt count;
- closed-task correctness;
- support steps opened;
- highest support level;
- replay count;
- whether caption was needed;
- whether Vietnamese meaning was needed;
- productive retry completion;
- transfer outcome;
- optional confidence band;
- delayed retrieval outcome.

Do not persist unrestricted productive text merely for analytics.

### Retention

Primary early metrics:

- second meaningful session within 7 days;
- due-review return;
- delayed-review completion;
- week-two active learning;
- learner-created second video lesson;
- support level decreasing across recurring targets.

### AI quality/economics

Track separately:

- diagnosis input/output tokens;
- authoring input/output tokens;
- combined tokens per accepted v2 lesson;
- latency per model call;
- deterministic rejection reason;
- authoring retry count;
- cost per accepted lesson.

The split v2 workflow must not lose diagnosis cost from total lesson economics.

### Capability claims

Allowed evidence language:

- encountered;
- practised;
- retrieved;
- used with support;
- changed-context attempt;
- delayed retrieval;
- delayed transfer.

Avoid:

- mastered;
- fluent;
- CEFR upgraded;
- independent capability;

unless a future explicit evidence policy defines and validates those claims.

---

## 7. Analytics event plan

Prefer bounded event schemas over free-form logs.

Suggested event families:

```text
learning_session_started
learning_activity_attempted
learning_support_opened
learning_replay_used
learning_activity_advanced
learning_session_completed
learning_review_due
learning_review_started
learning_review_attempted
learning_review_completed
learning_source_replayed
learning_recommendation_opened
```

Required dimensions should be bounded IDs/enums only where possible:

- lesson/session/activity type;
- phase;
- item key/internal ID;
- attempt ordinal;
- verdict;
- support type;
- whether support was required;
- elapsed bucket;
- schema/policy version.

Do not include:

- raw answer text;
- transcript text;
- email;
- OTP;
- API keys;
- model response bodies.

---

## 8. PR slicing rules

Every implementation PR should solve one coherent vertical slice.

Preferred shape:

```text
contract / use case
→ server composition
→ adapter/persistence
→ UI if needed
→ focused tests
→ full gate
```

Avoid:

- one PR mixing learner runtime + billing + design system + dependency upgrades;
- framework migration for its own sake;
- broad refactor before fixing an end-to-end defect;
- weakening fixture tests instead of adding the missing arbitrary-blueprint test;
- merging stale PRs without rebuilding on current main.

### Mandatory PR questions

Before merge, answer:

1. What learner behavior improves?
2. What evidence becomes more trustworthy?
3. Could this reveal an answer earlier?
4. Could this advance a session falsely?
5. Could this persist raw learner content?
6. Could owner/session/lesson identities drift?
7. Does retry remain idempotent?
8. Does CI prove the production-shaped path or only a fixture path?
9. Does this create a stronger learning claim than the evidence supports?
10. Does this increase paid-provider cost, and is that measured?

---

## 9. Test strategy by layer

### Unit

Use for:

- selection;
- authoring gates;
- evaluation;
- scheduling;
- policy derivation;
- answer/reveal boundaries;
- support unlock rules.

### pgTAP

Required for:

- RLS;
- owner scope;
- security-definer RPCs;
- progression invariants;
- idempotency;
- privacy constraints;
- review-state persistence.

### Supabase-backed journey

Required for:

- arbitrary generated blueprint runtime;
- session resume;
- retry progression;
- support persistence;
- delayed review;
- FSRS card-state mutation.

### Chromium

Required for:

- user-visible progression;
- caption/support reveal;
- assisted completion behavior;
- precise replay controls;
- review journey;
- mobile/desktop critical flow.

### Provider benchmark

Not ordinary CI.

Use only with explicit quota authorization and a bounded golden set.

Measure:

- accepted lesson rate;
- pedagogical rejection reasons;
- provenance defects;
- latency;
- token usage;
- cost per accepted lesson.

---

## 10. Current known documentation drift to clean during implementation

Do not create a standalone docs-cleanup sprint before P0 runtime fixes. Update stale claims when touching their owning area.

Known drift at baseline:

- [ ] `AGENTS.md` still contains older statements about v2 production readiness;
- [ ] `ENGLISH_YOUTUBE_AI_ADOPTION.md` contains older FSRS “approved next” state;
- [ ] some historical BMAD artifacts describe earlier architecture and must remain historical, not current truth;
- [ ] brand/product copy suggests audio transcription fallback more broadly than current native-caption production strategy supports;
- [ ] v1 `masteredVocabulary` terminology conflicts with v2 `completion != mastery` semantics.

---

## 11. Explicitly deferred until this plan earns them

Do not prioritize yet:

- Netflix integration;
- Chrome extension;
- arbitrary webpage import;
- books/PDF;
- podcasts as a separate media pipeline;
- multi-language source pairs;
- generic conversation chatbot;
- pronunciation score;
- public lesson marketplace;
- social graph;
- XP/league/streak economy;
- multiple production LLM providers;
- autonomous agent architecture for learner-facing tutoring;
- unlimited subscription tiers.

A deferred feature may move earlier only with evidence that it removes a validated blocker for the core learner segment.

---

## 12. Decision log

### 2026-08-20 — Language Reactor chosen as primary market/product benchmark

Decision:

- use one proven product benchmark rather than mixing unrelated apps;
- adapt media interaction, persistent vocabulary memory, due review and discovery concepts;
- do not clone its architecture or permanent dual-subtitle behavior;
- keep Vidlish differentiation centered on learning evidence, transfer and adaptive review.

### 2026-08-20 — whole-repository audit determines next priority

Decision:

- fix real-v2 runtime composition before adding new product surface;
- Golden Session remains a test fixture, not a production learner runtime dependency;
- add arbitrary generated-blueprint E2E because Golden-only CI cannot prove real v2 correctness.

### 2026-08-20 — PR #68 treated as salvage input, not merge candidate

Observed state:

- PR #68 open;
- old base;
- non-mergeable against current main;
- contains useful learning-science quality gates.

Decision:

- re-implement/rebase only the valid invariants on current main after Phase 0 runtime fixes.

---

## 13. Execution checkpoint

### NOW

```text
Phase 0 — Make real v2 trustworthy
```

Work order:

1. VLR-001 — real blueprint in attempt API
2. VLR-002 — real blueprint/policy in support API
3. VLR-003 — generic delayed review planner
4. VLR-005 — assisted-completion consistency
5. VLR-006 — production fixture-authoring guard
6. VLR-004 — arbitrary generated-v2 end-to-end CI journey
7. VLR-007 — salvage/rebase evidence-producing lesson gates from PR #68

### NEXT AFTER PHASE 0

```text
Phase 1 — Video Learning Workspace
```

Start with:

1. precise replay;
2. slow playback wiring;
3. progressive caption/meaning support;
4. final unaided replay.

### DO NOT JUMP AHEAD TO

- AI tutor;
- discovery;
- more media types;
- monetization engineering;

until Phase 0 and Phase 1 evidence exists.

---

## 14. Change log

| Date | Change | PR / SHA | Evidence |
|---|---|---|---|
| 2026-08-20 | Created execution plan from whole-repo audit + Language Reactor benchmark | branch `docs/language-reactor-master-plan` | baseline `main@aa433f07…` |

---

## 15. Definition of success for this plan

This plan is working when Vidlish reaches the following product behavior:

```text
A learner brings a video they care about.
Vidlish knows what they already struggle with.
The first listen does not give away the text.
Support appears only when needed.
The learner retrieves and uses a useful item.
The system remembers how much help was required.
The item returns at the right time in a different task.
A later video is selected/structured using that evidence.
Over time the learner needs less support for the same capability.
```

That is the target.

Not “more generated lessons.”
Not “more AI features.”
Not “more screens.”

The compounding unit is **better learner evidence producing a better next learning encounter**.
