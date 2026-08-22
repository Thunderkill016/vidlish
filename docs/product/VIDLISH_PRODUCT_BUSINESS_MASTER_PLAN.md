# Vidlish Product & Business Master Plan

**Status:** priority source of truth  
**Owner direction:** focus only on Vidlish; AtoEnglish is read-only knowledge  
**Updated:** 2026-08-22  
**Applies to:** product, learning, AI, infrastructure, security, legal, billing, pricing, rollout

---

## 1. Why this document exists

Vidlish has accumulated substantial technical and learning-design work. The point of this document is to stop architecture, provider, billing, and feature expansion from outrunning evidence that the product actually helps learners and can become a viable business.

Four business-critical questions remain:

1. Does the target learner complete a first session and show a real, observable learning gain?
2. Do they return for another session and delayed review?
3. Will they pay and remain paid after the novelty of AI generation disappears?
4. Can each paid learner be served with safe, predictable gross margin and acceptable legal risk?

No architecture layer, provider integration, media expansion, billing feature, or rollout milestone may bypass these questions.

This file is the current product/business priority source of truth. Detailed learning-model documents remain valid inside this boundary, but they do not override the gates below.

---

## 2. Product mission

Vidlish is not fundamentally “AI turns a YouTube URL into a lesson.” That is a replaceable mechanism with weak durable value.

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

Vidlish began as a YouTube-first product for A2–B2 learners. That source-grounded path remains valuable and is already technically strong.

But a zero beginner cannot use authentic English video as the first learning source. The product therefore supports a broader source strategy:

- generated or curated beginner input when authentic media is not yet comprehensible;
- source-grounded YouTube input when the learner is ready for it;
- the same learning loop and evidence principles across both.

Do not organize the roadmap as though reaching the video path is the final destination.

---

## 3. Current verified project state

### Repository and program

Learning Model v2 is merged into `main`; the former integration branch is historical.

Current integrated foundations include:

- learner-first product shell;
- beginner `/start` flow for zero/very-low lexical evidence;
- durable learning sessions and privacy-safe attempt evidence;
- server-confirmed support/replay evidence;
- changed-context transfer;
- delayed review scheduling;
- capability-oriented progress views;
- source-grounded YouTube generation path;
- Supabase RLS/RPC + pgTAP;
- Chromium product journeys;
- durable Supabase Golden Session journey.

### Production authoring

The production-shaped v2 path is reachable and has produced/published `lesson_versions`.

That proves reachability. It does **not** prove:

- authoring reliability at an acceptable rate;
- that a learner can use the session without help;
- that the session teaches anything durable;
- retention;
- willingness to pay;
- legal/commercial readiness.

Do not collapse “shipped”, “reachable”, “reliable”, “teaches”, and “viable business” into one claim.

### Current hard gate

The active product gate is **Gate 5 — moderated usability with five target users**.

Feature 004 defined the predeclared study contract and evaluator. Feature 005/PR #128 made the study runnable locally with durable Supabase-backed measurement, bounded moderator observations, scoped reset, and owner-bound evidence.

PR #128 exact head `51c4ff44bb85fca8cee4f8b39a7e90297fe43d69` passed CI #474 / run `32571811299` and was squash-merged as `fdbee37bd3b1eca473b3c25f65eece772251d987`.

**Gate 5 is still unpassed.** Technical CI and fixture journeys are not substitutes for five genuine participant sessions.

---

## 4. Validation persona versus full product mission

The current Golden Session protocol intentionally uses a narrow B1 persona and one grounded YouTube fixture.

That is a **validation instrument**, not the definition of the whole product.

Why keep it:

- the protocol and thresholds were declared before running the five-person study;
- the source and target language item are already canonical and deterministic;
- changing the persona/source after implementation would make the Gate 5 result harder to interpret;
- it isolates whether the core learning loop is understandable and measurable.

Therefore:

- do not rewrite Gate 5 into a zero-beginner study midstream;
- do not infer from a successful B1 Golden Session that the zero-beginner path is validated;
- later learner studies may validate the beginner path separately using the same evidence discipline.

---

## 5. Core learning loop

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

The product should not overwhelm a first session with summary, vocabulary lists, grammar sections, quizzes, gamification, and unrelated generated content.

A short session should leave the learner with an observable change, not a pile of completed UI states.

---

## 6. Learning evidence policy

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

The current beginner lexical `i+1` implementation is a conservative runtime policy, not a universal SLA law. Changing it requires a bounded feature and learner evidence, not a higher generation acceptance rate.

Vietnamese support is a scaffold and should taper from evidence, not from a scientifically invented fixed word count.

The product owner permits storing learner writing and recording learner speech when those are necessary for writing/speaking functionality. That does not authorize unrelated raw text/audio collection elsewhere.

---

## 7. Source-grounded content policy

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

### Source-length policy hypothesis

- Shorts/micro video: eligible only when learning-evidence density is sufficient; otherwise refuse honestly.
- Standard video: teach bounded windows rather than the whole source.
- Long video: use chapters/ranges or learner choice.
- Multi-hour source: treat as a source container; never send the whole source blindly to an authoring model.

Thresholds are hypotheses. Do not lower evidence requirements just to improve generation success rate.

---

## 8. Product scope guardrails

### In scope

- English target language;
- Vietnamese learner guidance where useful;
- one learner account and personal capability history;
- short desktop/mobile web sessions;
- beginner comprehensible input below authentic-media readiness;
- grounded YouTube input once appropriate;
- retrieval, bounded production, correction, retry, transfer, delayed review;
- progressively less support based on evidence.

### Explicitly deferred until current gates justify expansion

- additional target languages;
- arbitrary language-pair translation products;
- classroom or multi-tenant school administration;
- TikTok/Spotify/PDF/website/meeting/file-source expansion;
- public lesson marketplace/catalog;
- several payment gateways;
- automatic multi-provider production routing;
- true unlimited generation;
- broad social/gamification layers;
- commercial rollout before learning, retention, economics, and legal gates pass.

Pronunciation scoring requires Vietnamese-accent validation before learner-facing scores are trusted.

---

## 9. Product surfaces

### Landing page

Sell learner outcome, not generation mechanics.

The landing page should explain:

- what capability changes;
- how the learning loop works;
- how beginner and authentic-source paths fit together;
- what evidence/progress means and does not mean;
- supported-source truth;
- privacy/source-grounding truth;
- pricing only after willingness-to-pay evidence exists;
- learner claims only after real learner evidence exists.

### Learner home/dashboard

Priority should be capability/workflow driven:

1. continue an active learning session;
2. complete due review;
3. start appropriate new input;
4. inspect capability/evidence history.

Do not let “create another AI lesson” dominate over due learning work.

### Learning surface

One current task at a time. Input and communication first; feedback immediately after the learner action; support progressively revealed rather than dumped upfront.

---

## 10. AI/provider decision

### Production rule

Production uses:

```text
one enabled provider
+ one production model
+ one production project/key
+ server-only calls
```

No automatic multi-provider fallback in the current product.

A provider-neutral port is fine for replaceability; production routing complexity is not a product goal.

### Model selection method

When Gate 7 is reached, benchmark at most three temporary candidates:

1. one low-cost candidate;
2. one balanced candidate;
3. one stronger reference candidate.

The decisive metric is **cost per accepted lesson**, not token price alone.

An accepted lesson must satisfy the relevant grounding, schema, learning-quality, latency, and human-acceptance criteria.

Revoke/disable non-selected credentials after the benchmark.

### Deterministic/provider boundary

Deterministic code handles:

- source parsing/metadata;
- cache/deduplication;
- evidence selection and allowlists;
- transcript boundaries;
- grounding/timestamp hydration;
- rate limits and budgets;
- closed-task evaluation;
- durable persistence and ownership.

Models are bounded proposal/authoring components, not authority for learner evidence or grounding truth.

---

## 11. API-key and cost safety

### Environment policy

- Local: fixture/fake/local Supabase by default; no production key.
- CI: fixture/fake/local Supabase; no paid provider key.
- Preview: fixture or isolated, budget-capped test project only when explicitly required.
- Production: dedicated server/worker-only keys.

No provider/service key in `NEXT_PUBLIC_*`, browser code, repository, logs, screenshots, prompt artifacts, or ordinary Actions output.

### Before paid beta expands

Required controls include:

- active-job limits;
- rolling request limits;
- bounded retries;
- input/output token caps;
- global spend caps/kill switch;
- usage/entitlement ledger;
- cache/deduplication;
- incident/key-rotation runbook.

Budget alerts alone are insufficient if the application can continue spending after the alert.

---

## 12. Business model hypothesis

Do not monetize the first learning experience before the learner has a chance to experience the core result.

### Free hypothesis

A free tier may provide:

- an initial complete learning experience;
- bounded recurring usage;
- due/basic review;
- a strict active-work limit.

### Paid hypothesis

A subscription should pay for the compounding learning system, not merely more AI calls:

- persistent learner model;
- adaptive input selection;
- richer review queue;
- capability/evidence history;
- larger bounded source/input allowance;
- priority processing where economically viable.

High-variable-cost functionality may require add-on credits later. Do not promise true unlimited generation.

### Price test

Pricing is a hypothesis until real payment behavior exists.

Measure:

- checkout start;
- completed payment;
- paid conversion;
- continued learning after payment;
- month-two retention/renewal;
- cancellation/refund reasons;
- gross margin;
- provider cost per accepted learning experience;
- support cost.

A rough planning target that variable provider/transcript/infrastructure cost remains a minority of revenue may be used for modeling, but only real measurements can set the plan.

---

## 13. Validation sequence

The current execution sequence is intentionally hard-gated.

### Gate 0 — production v2 authoring reachability

**Done.** Production-shaped workflow can publish readable v2 `lesson_versions`.

### Gate 1 — first-session durable flow

**Done in code/tests.**

### Gate 2 — CI failures fixed from real logs

**Done for the current technical slice.**

### Gate 3 — support/replay server evidence

**Done in code/tests.**

### Gate 4 — changed-context + delayed review

**Done in code/tests**, including arbitrary-blueprint and durable Supabase evidence where covered.

### Gate 5 — five-person moderated usability

**Current gate. Not passed.**

Use the existing Golden Session protocol and local harness. Require five genuine participant records. Do not fabricate records or reinterpret fixture CI as learner evidence.

Measure the predeclared outcomes, including completion without moderator instruction, changed-context attempt/use, before/after recognition, elapsed time, blocking defects, and severe grounding/mastery defects.

### Gate 6 — 20–50 learner cohort

Only after Gate 5 passes or produces a clear correction plan that is implemented and revalidated.

Measure activation and return behavior, including:

- first-session completion;
- observable learning evidence;
- second session within the declared window;
- delayed-review return;
- week-two activity;
- support requirements over time;
- defect rate and time to value.

### Gate 7 — authoring-model economics benchmark

Only after the learning experience is worth optimizing.

Benchmark at most three candidates and select one production model by cost per accepted lesson/experience.

### Gate 8 — payment, retention, legal, and operations validation

Use real payment intent/transactions and actual continuing usage. Complete legal/commercial requirements before broad paid launch.

### Gate 9 — rollout

Only after learning quality, retention, payment, economics, legal, security, and operational gates pass.

Do not skip gates because a PR merged or CI is green.

---

## 14. Legal and commercial gates

Commercial arbitrary-YouTube scale requires legal review.

For arbitrary user-selected sources, prefer a private companion experience:

- use official embed/player behavior;
- do not download/rehost video without a valid basis;
- do not create a public lesson catalog from arbitrary sources;
- keep transcript-derived storage bounded and purpose-limited;
- expose source attribution and AI-generated-content disclosure where required;
- provide copyright/takedown paths.

Before paid public launch, complete the appropriate versions of:

- Terms of Service;
- Privacy Policy;
- copyright/takedown policy;
- Acceptable Use Policy;
- refund/cancellation policy;
- data retention/deletion process;
- subprocessor list;
- incident response;
- legal assessment of transcript/derivative lesson handling;
- Vietnam e-commerce notification/registration determination;
- accounting/e-invoice/tax setup for the final entity/payment flow.

### Payments

Do not integrate several gateways at once.

Validate demand first, then choose one initial payment route and keep billing behind an internal adapter with verified, idempotent webhook handling.

---

## 15. Execution priority now

### P0 — finish Gate 5 with real evidence

1. Use `pnpm study:golden` in the safe local harness.
2. Recruit five people matching the Golden Session validation persona as closely as practical.
3. Run one participant per clean DB/browser cycle.
4. Capture bounded moderator observations plus owner-scoped durable measurement.
5. Keep five genuine participant records.
6. Evaluate exactly the predeclared thresholds.
7. If a threshold fails, fix the smallest observed cause and rerun the relevant evidence rather than broadening scope.

### P0 — protect source of truth and evidence integrity

- Keep product docs, constitution, active specs, code/tests, and handover aligned.
- Do not let archived BMAD or stale PR state become planning authority.
- Do not let UI-local state, model output, or moderator assumptions manufacture learner capability evidence.

### P1 — Gate 6 cohort, only after Gate 5

Build only the instrumentation/operational support needed for the predeclared 20–50 learner cohort.

### P2 — economics/provider benchmark, only after learner value

Optimize authoring cost/reliability only after the learning loop has learner evidence.

### P3 — payment/legal/operations

Real willingness-to-pay, retention, gross margin, legal review, billing, refund, support, and compliance work.

### P4 — rollout

Only after all preceding evidence gates justify it.

---

## 16. Do not do next

Do not immediately:

- add more target languages;
- add arbitrary media/file types;
- add several AI providers or automatic fallback routing;
- build gamification/social layers to create activity metrics;
- add several payment gateways;
- publish arbitrary AI lessons publicly;
- connect local/preview work to production Supabase casually;
- lower evidence gates to improve generation acceptance;
- claim mastery from completion;
- claim learning from fixture CI;
- claim business viability from signups, generation count, or one-time curiosity;
- move to the 20–50 cohort before the five-person Gate 5 evidence is evaluated.

---

## 17. Next deliverable

The next product deliverable is not another architecture layer.

It is:

> Five genuine moderated Golden Session records, evaluated against the predeclared Gate 5 thresholds, with any observed blocker traced to the smallest product cause.

Everything else must justify why it advances that evidence rather than merely making Vidlish look larger.
