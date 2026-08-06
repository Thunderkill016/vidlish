# Vidlish Product & Business Master Plan

**Status:** priority override  
**Owner direction:** focus only on Vidlish; AtoEnglish is read-only knowledge  
**Date:** 2026-08-06  
**Applies to:** product, learning, AI, infrastructure, security, legal, billing, pricing, rollout

---

## 1. Why this document exists

Vidlish has accumulated substantial technical and learning-design work before four business-critical questions have been answered:

1. Does the target learner complete a first lesson and feel a real learning gain?
2. Do they return for a second lesson and delayed review?
3. Will they pay and remain paid after the novelty of AI generation disappears?
4. Can each paid learner be served with safe, predictable gross margin and acceptable legal risk?

No additional architecture, provider integration, multilingual expansion, payment integration, or production rollout should bypass these questions.

This file is the current priority source of truth. Detailed Learning Model v2 documents remain valid within this product boundary, but they do not override the business gates below.

---

## 2. Current verified project state

### Repository

- Repository: `Thunderkill016/vidlish`
- Current `main`: `71f287b7317338df00c490293c57fa593cbbbb26`
- `main` contains the two Shorts/weak-transcript terminalization fixes.
- Learning Model v2 PR: `#44`
- PR #44 head before this document: `721486a1cf55698585c4c0d09d948ed94e3d7310`
- PR #44 is draft, open, mergeable, 50 commits ahead and 2 commits behind `main`.
- PR #44 adds about 7,956 lines across 35 files.
- CI run #211 passed typecheck, lint, 225 unit tests, build, Supabase/RLS tests, Chromium journeys, and the final CI gate.

### Production

- Production domain: `https://vidlish.vercel.app`
- Current production deployment still runs `main@a1b28f09dbde24cc30df99b7e50aa53e347be21f`.
- Therefore the application code from merged Shorts fixes is not yet the production runtime.
- A production database compatibility trigger prevents insufficient-evidence jobs from returning to an endless active state.
- Production currently avoids the infinite loading incident, but it can still show the older generic failure experience.

### Learning Model v2

Implemented as foundation, not as production-ready behavior:

- grounded `lesson:v2` contract;
- learner-safe DTO without answer keys before attempt;
- deterministic closed-task evaluation;
- one-task-at-a-time fixture learning lab;
- real YouTube evidence player bound to canonical segments;
- additive session, attempt, and review-state persistence foundation;
- AtoEnglish knowledge audit and reuse policy;
- constrained diagnosis/candidate/authoring foundations;
- runtime policy contract for progressive support, retry, transfer, and evidence.

Not yet complete:

- runtime does not fully consume the new learning policy;
- provider-backed v2 workflow is not connected;
- preview Supabase is not isolated and operational;
- no two-video live provider benchmark exists;
- no learner cohort evidence exists;
- no willingness-to-pay evidence exists;
- no legal clearance exists for a commercial arbitrary-YouTube workflow;
- no billing, tax, refund, or support operation exists.

---

## 3. Product thesis and initial customer

### Product thesis

Vidlish should not sell “AI turns a YouTube URL into a lesson.” That is a reproducible feature with weak retention.

The durable product is:

> Vidlish helps Vietnamese learners turn English videos they already care about into measurable listening and communication ability, then remembers their gaps and brings the right material back for review.

The compounding value is:

```text
user-owned interest
+ grounded learning activity
+ personal capability evidence
+ varied delayed review
+ progressively less support
```

### Initial target customer

MVP targets:

- Vietnamese adults;
- approximately A2–B2;
- already watch English YouTube content;
- depend on subtitles or understand passively but cannot retain/use the language;
- willing to spend 5–12 minutes per learning session.

MVP does not target all learners, children, exam preparation, every language pair, or every media source.

---

## 4. Scope decisions

### In scope for the first commercial validation

- English-language YouTube videos;
- Vietnamese learner guidance;
- one lesson from one bounded source selection;
- 5–12 minute sessions;
- one or two meaningful learning windows;
- first-listen comprehension;
- progressive support;
- one or two useful targets;
- productive retrieval;
- correction with retry;
- changed-context transfer;
- delayed review;
- desktop and mobile web.

### Explicitly deferred

- Vietnamese video to English lesson;
- Chinese video or arbitrary language pairs;
- TikTok, podcasts, Spotify, PDF, websites, meetings, uploads;
- automatic processing of an entire multi-hour video;
- realtime AI speaking conversation;
- pronunciation scoring from transcript text;
- creator marketplace;
- public user-generated lesson catalog;
- unlimited plans;
- multi-provider production routing;
- children and classroom administration.

These may remain architecturally possible, but they are not current product commitments.

### Video-length policy hypothesis

- Shorts/micro video: eligible only when learning-evidence density is sufficient; otherwise refuse honestly.
- Standard video: select bounded windows rather than teach the whole video.
- Long video: use chapters or require the learner to choose a range/topic.
- Multi-hour video: never send the whole transcript/media to an authoring model; treat it as a source container.

Thresholds are hypotheses and must be benchmarked. Do not lower evidence requirements merely to increase generation success.

---

## 5. First-session product experience

The first free lesson must create a clear before/after result:

```text
cannot understand a selected moment
→ attempts first listen
→ opens support progressively
→ notices a useful communicative item
→ retrieves it without the answer
→ uses it in a changed context
→ hears the source again with improved recognition
```

The learner should leave with:

- one observable listening gain;
- one or two retrievable language items;
- one successful changed-context use;
- an honest next review time.

The product must not overwhelm the first session with summary, vocabulary lists, grammar sections, quizzes, and unrelated generated content.

---

## 6. Website and lesson UX direction

### Landing page

Sell the learner outcome, not the generation mechanism.

Primary promise:

> Hear what previously required subtitles, using videos you already want to watch.

Primary CTA:

> Learn free from your video

Required sections:

- interactive before/after demonstration;
- how Vidlish works in three steps;
- who it is for;
- supported-video truth;
- privacy and copyright explanation;
- pricing after the business test exists;
- real learner evidence only after a cohort produces it.

### Dashboard

Priority order:

1. continue current lesson;
2. complete due review;
3. create from a new video;
4. inspect learning history and usage.

### Create flow

```text
URL
→ metadata preview
→ supported-language/evidence preflight
→ choose learning goal and 5/10/15-minute budget
→ show bounded processing scope and estimated usage
→ confirm
→ truthful queued/processing state
```

### Lesson layout

Desktop:

- source media and replay controls on the left;
- one current task and feedback on the right.

Mobile:

- video;
- task;
- submit;
- feedback;
- next.

The lesson surface must be environment/communication-first, not a long document.

---

## 7. Learning evidence policy

Track separate evidence dimensions:

- comprehension;
- productive recall;
- interactional use;
- changed-context transfer;
- delayed transfer.

Completion means required activity flow finished. It does not mean mastery.

FSRS or another scheduler may decide when an item returns. It cannot independently prove transfer or interactional ability.

Store only data required to continue learning:

- attempts and outcomes;
- support level used;
- retry state;
- transfer state;
- item review state;
- timestamps and version/provenance.

Do not store raw audio or unrestricted personal free text by default.

---

## 8. AI provider decision

### Production rule

MVP production uses:

```text
one provider
+ one production model
+ one production project/key
+ server-only calls
```

No automatic multi-provider fallback.

The code may expose a provider-neutral port so the vendor can be replaced later, but only one adapter is enabled in production at a time.

### Selection method

Benchmark at most three candidates offline/temporarily:

1. one low-cost candidate;
2. one balanced candidate;
3. one stronger reference candidate.

Use the same golden source set and contract. Revoke or disable non-selected keys after the benchmark.

The decisive metric is:

```text
cost per accepted lesson
```

An accepted lesson must pass:

- grounding and timestamp checks;
- schema validation;
- pedagogical rubric;
- Vietnamese explanation quality;
- meaningful transfer;
- latency target;
- human acceptance on the benchmark sample.

Do not select on token price alone.

### Provider use boundary

Deterministic code handles URL parsing, metadata, cache lookup, transcript boundaries, grounding, timestamp hydration, rate limits, budgets, closed-task evaluation, and persistence.

The model is limited to bounded diagnosis and authoring tasks after deterministic evidence selection.

---

## 9. API-key and cost safety

### Environment policy

- Local: fixture by default; no production key.
- CI: fixture; no provider key.
- Preview: fixture or separate low-budget test project only.
- Production: one dedicated project/key available only to server/worker runtime.

No key in `NEXT_PUBLIC_*`, browser code, repository, logs, error payloads, prompt artifacts, or ordinary GitHub Actions.

### Request gates

Every paid provider call requires:

```text
authentication
→ request rate limit
→ active-job limit
→ canonical deduplication/cache check
→ source/evidence preflight
→ token/cost estimate
→ atomic budget reservation
→ queued execution
```

### Required controls before paid beta

- one active generation per free user;
- rolling minute/hour/day generation limits;
- input/output token caps;
- bounded retries;
- global daily and monthly spend caps;
- generation kill switch;
- usage ledger;
- credit/entitlement ledger;
- cache by source/transcript/pipeline version;
- circuit breaker for quota/provider incidents;
- immediate key rotation runbook.

Budget alerts are not sufficient if the provider does not hard-stop charges. The application must enforce its own hard limit.

---

## 10. Business model hypothesis

Do not monetize the first lesson before the learner experiences the core result.

### Free hypothesis

- first lesson complete;
- small recurring generation allowance;
- bounded source duration;
- one active job;
- basic review.

### Paid hypothesis

Subscription pays for the compounding learning system:

- more generation allowance;
- persistent learner model;
- adaptive lessons;
- complete review queue;
- progress/evidence history;
- higher bounded source scope;
- priority processing when viable.

High-variable-cost features may use add-on credits:

- ASR when no usable caption exists;
- unusually long-source analysis;
- additional lessons from the same source;
- future audio-heavy features.

Do not offer true unlimited generation.

### Price test

Initial prices are hypotheses, not commitments. Run a real paywall experiment across a small range only after the first-session experience works.

Important metrics:

- paid conversion;
- month-two paid retention;
- refund rate;
- gross margin per paying learner;
- provider cost per accepted lesson;
- support cost per learner.

Target provider/transcript/infrastructure variable cost should remain a minority of revenue; a working initial planning range is no more than roughly 15–20%, subject to real benchmarks.

---

## 11. Product validation gates

### Gate A — activation

Use 20–50 learners from the exact target segment.

Measure:

- lesson generation success;
- first-lesson completion;
- before/after listening recognition;
- retrieval and transfer completion;
- lesson defect rate;
- time to first value.

### Gate B — retention

Measure:

- second lesson within 7 days;
- delayed-review return;
- week-two active learning;
- support level falling over time;
- whether the system selects material the learner considers useful.

### Gate C — willingness to pay

Use a real paywall and real payment intent. Do not rely on survey answers.

Measure:

- checkout start;
- completed payment;
- continued use after payment;
- renewal/month-two retention;
- cancellation reason.

### Gate D — economics

Before scaling, establish:

- actual transcript cost;
- actual model token cost;
- retry/repair rate;
- cache savings;
- cost per accepted lesson;
- cost per active free learner;
- gross margin per paid plan.

If learners generate lessons but do not study, review, return, or pay, stop expanding the platform and correct the product thesis.

---

## 12. Legal and commercial gates

Legal review is required before commercial arbitrary-YouTube scale.

### Initial content boundary

For arbitrary user-selected YouTube content, prefer a private companion experience:

- use official embed/player behavior;
- do not download or rehost video;
- do not create a public lesson catalog from arbitrary videos;
- keep transcript-derived storage bounded and purpose-limited;
- provide copyright reporting/takedown paths;
- expose source attribution and AI-generated-content disclosure.

Public curated content requires compatible ownership, public-domain status, licence, or creator permission.

### Required documents/processes before paid public launch

- Terms of Service;
- Privacy Policy;
- Copyright/takedown policy;
- Acceptable Use Policy;
- refund and cancellation policy;
- data retention/deletion process;
- subprocessor list;
- incident response;
- legal assessment of transcript and derivative lesson handling;
- Vietnam e-commerce notification/registration determination;
- company/accounting/e-invoice/tax setup appropriate to the final entity and payment flow.

### Payments

Do not integrate several gateways at once.

Validate demand first. Then select one initial Vietnam-compatible recurring payment route and keep billing behind an internal adapter with verified, idempotent webhooks.

International Merchant-of-Record or card processing is a later decision after the Vietnam launch model and entity are clear.

---

## 13. Execution priority

### P0 — stop uncontrolled expansion and prove product value

1. Freeze new media types, languages, provider integrations, billing, and infrastructure expansion.
2. Keep PR #44 draft and unmerged.
3. Define one golden learner journey using one supported English video and fixture/provider-independent runtime.
4. Make progressive support, retry, transfer, and honest completion work end to end.
5. Create an operator-run usability protocol for 5 internal/manual testers, then a 20–50 learner cohort.
6. Define analytics and acceptance criteria before the cohort.

### P0 — production reliability

1. Resolve the deployment drift between production `a1b28f0` and current `main@71f287b`.
2. Preserve the production DB compatibility guard until a compatible application runtime is live.
3. Verify the original Shorts incident class no longer creates endless polling.
4. Add a production generation kill switch before paid provider usage expands.

### P1 — model economics

1. Build a 30–50-source golden benchmark representing Shorts, structured video, interview, podcast, entertainment, slang, difficult transcript, and long source.
2. Benchmark no more than three candidate models with temporary budget-capped keys.
3. Select one provider/model based on cost per accepted lesson.
4. Revoke all non-selected credentials.

### P2 — closed beta learning evidence

1. Isolated preview Supabase.
2. End-to-end session/attempt/support/retry/transfer persistence.
3. Delayed review.
4. Small cohort.
5. Analyze activation and week-one retention.

### P3 — willingness to pay and commercial viability

1. Real pricing/paywall experiment.
2. Month-two retention test.
3. Unit economics.
4. Legal review.
5. Initial company, accounting, payment, refund, and support setup.

### P4 — production rollout

Only after learning quality, retention, payment, economics, legal, security, and operational gates pass.

---

## 14. Do not do next

Do not immediately:

- connect multiple AI providers;
- add Vietnamese/Chinese source translation modes;
- add arbitrary file uploads;
- support complete 10-hour processing;
- lower evidence gates merely to accept Shorts;
- build a sophisticated pricing dashboard;
- add several payment gateways;
- publish AI lessons publicly;
- merge PR #44 because CI is green;
- connect preview to production Supabase;
- claim mastery from immediate completion;
- claim business viability from signups or generation count.

---

## 15. Next deliverable

The next implementation deliverable is not another architecture layer.

It is:

> One complete, understandable, measurable Vidlish learning session on a grounded source, with progressive support, retrieval, bounded feedback, mandatory retry, changed-context transfer, honest completion, and privacy-safe evidence—ready for a small learner test.

All work must be evaluated by whether it advances this deliverable and its validation cohort.
