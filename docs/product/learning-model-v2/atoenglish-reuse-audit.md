# AtoEnglish knowledge reuse audit for Vidlish

**Status:** required design input for Learning Model v2  
**Date:** 2026-08-06  
**Decision:** AtoEnglish is stopped as a product. Its repository is a read-only knowledge source. Vidlish is the only implementation and product source of truth.

## 1. Why this audit exists

Learning Model v2 was initially designed from the current Vidlish architecture and external research. That missed a large body of product and pedagogical work already completed in `Thunderkill016/AtoEnglish`.

The correct rule is now:

```text
AtoEnglish evidence and implementation
→ classify keep / adapt / reject
→ encode accepted knowledge in Vidlish contracts and tests
→ research only unresolved gaps
```

Vidlish must not maintain a shared package or runtime dependency on AtoEnglish. Accepted ideas are re-expressed as Vidlish-owned policy, contracts, tests, and documentation.

## 2. AtoEnglish assets reviewed

This audit reviewed the following repository-owned sources and implementations:

- `CONTENT_STYLE.md`
- `src/lib/lessons/lesson-center-reference.ts`
- `src/lib/lessons/lesson-blueprint.ts`
- `src/lib/lessons/learning-flow.ts`
- `src/lib/lessons/content-standard.ts`
- `src/lib/missions/mission-spec.ts`
- `src/lib/missions/mission-evaluator.ts`
- PR #45 `src/lib/missions/autonomous-tutor.ts`
- PR #48 `docs/curriculum/AUTHENTIC_CLIP_LEARNING_CONTRACT.md`
- PR #53 `docs/product/NATURAL_COMMUNICATION_LEARNING_SYSTEM.md`
- PR #57 `src/features/real-talk/domain/learner-attempt.ts`
- PR #57 `src/lib/real-talk/generation-contract.ts`

The strongest knowledge is not the old fixed curriculum quota. It is the later natural-communication, mission, diagnosis, retrieval, transfer, evidence, and review work.

## 3. Canonical product principle absorbed into Vidlish

The strongest AtoEnglish product principle is:

> Natural communication on the surface; an evidence-based invisible curriculum underneath.

For Vidlish this becomes:

> A real video and its communication situation are the learner-facing surface. Vidlish invisibly selects, sequences, scaffolds, evaluates, and revisits the capabilities that can be learned reliably from that evidence.

The learner should not experience a grammar chapter or a transcript summary. They should enter a situation, understand what happened, notice useful language or interactional behaviour, retrieve it, respond, and attempt it again under changed conditions.

## 4. Knowledge to keep as Vidlish policy

### 4.1 Environment and communication-event first

A full video is a source container, not a lesson and not a curriculum unit.

Vidlish should internally distinguish:

```text
source video
→ bounded learning window
→ communication event(s)
→ communicative capability
→ learner activity sequence
```

A communication event may be an opening, information exchange, acknowledgement, follow-up, confirmation, clarification request, repair, topic change, or closing.

This is stronger than selecting isolated vocabulary because it preserves why language is used and what next turn it enables.

### 4.2 Complete acquisition loop

The accepted loop is:

```text
first encounter
→ comprehension
→ progressive support
→ noticing
→ productive retrieval
→ response / interaction
→ changed-context transfer
→ delayed and varied re-exposure
```

Recognition, subtitle reading, shadowing, a multiple-choice score, or reaching a completed screen are not sufficient evidence of acquisition.

### 4.3 Progressive support instead of immediate reveal

AtoEnglish defined a useful scaffold ladder:

```text
replay
→ context hint
→ keyword hint
→ English caption
→ chunk boundaries
→ Vietnamese meaning
→ slower playback when available
```

Vidlish should not expose every layer at the start. The runtime must record the highest support level used because the same correct response with no support and after full reveal are different evidence.

Support is assistance, not punishment. First encounter should normally avoid the full transcript, while replay remains available.

### 4.4 Diagnosis and gap-focused teaching

A baseline attempt may establish that the learner already controls part of a capability. Vidlish should avoid reteaching independently demonstrated items and focus on unresolved gaps.

Accepted principles from the autonomous tutor prototype:

- baseline attempt is not penalized;
- known successful intents/items can be skipped;
- scaffolding appears only after an attempt;
- support fades from partial cue to complete model;
- failure on transfer reopens only the unresolved capability or item;
- typed input remains a complete learning path; microphone access is optional.

### 4.5 Feedback requires another attempt

AtoEnglish mission policy bounded feedback to one or two high-impact corrections and required a full-task retry.

Vidlish adopts the general rule:

> A correction without an opportunity to apply it is incomplete feedback.

For closed microtasks, retry may target the same item. For a capability task, the learner should perform the complete meaningful task again rather than only edit one highlighted token.

### 4.6 Transfer must materially change conditions

Transfer is not another exercise with the same sentence.

A valid transfer task must:

- require learner production;
- hide the complete answer until after the attempt;
- preserve the communicative goal;
- change at least one meaningful dimension.

Allowed changed dimensions include:

- speaker;
- wording;
- location;
- relationship;
- channel;
- information;
- speed;
- conversational problem;
- required next turn.

Cold transfer with an unseen speaker or unseen input is stronger evidence than controlled variation.

### 4.7 Interactional ability is distinct evidence

A learner may produce one correct sentence without being able to maintain an interaction.

Vidlish should separately model whether the learner can:

- respond at the right moment;
- acknowledge;
- ask a follow-up;
- confirm information;
- request repetition or clarification;
- repair a misunderstanding;
- buy time;
- self-correct;
- close appropriately.

Not every video supports an interactional capability. The system must abstain rather than manufacture one.

### 4.8 Capability evidence has four dimensions

Immediate lesson completion must not become mastery.

Capability evidence is separated into:

```text
comprehension
productive recall
interactional use
delayed transfer
```

A multiple-choice average cannot compensate for missing productive or transfer evidence. A capability may be `introduced`, `practised`, or `retrieved` without being `independent`.

### 4.9 FSRS schedules reviews; it does not decide mastery

AtoEnglish correctly separated scheduling from capability evidence.

Vidlish may use FSRS or another scheduler for chunks, listening forms, and prompts, but the scheduler does not prove that changed-context or interactional transfer occurred.

Review should vary the task:

```text
studied clip retrieval
→ Vietnamese situation cue
→ different speaker recognition
→ multi-turn use
→ cold changed-context transfer
```

Repeated identical cards are not enough.

### 4.10 Vietnamese-first pedagogy

Vidlish should preserve AtoEnglish's Vietnamese-specific advantage:

- Vietnamese is the explanation and guidance language;
- explanations are short, friendly, and non-judgmental;
- L1 interference is attached only when a real Vietnamese learner risk exists;
- pragmatic and relationship differences matter alongside literal meaning;
- Meaning–Form–Pronunciation is used when clarification removes a real blocker;
- pronunciation claims require acoustic evidence and must not be inferred from transcript text;
- output may use VN→EN cues when useful, but translation is a tool rather than a mandatory quota.

## 5. What must be adapted rather than copied

### 5.1 IPOR, ESA, and CELTA stages

Keep the semantics:

- meaningful input;
- processing and clarification;
- output;
- review;
- controlled to freer practice.

Do not force every generated lesson through the old fixed ten-section flow. Vidlish composes a bounded sequence according to source evidence, learner gap, and time budget.

### 5.2 Mission intents and deterministic matchers

Keep:

- observable intents;
- turn-aware evaluation;
- bounded deterministic correction rules;
- no pronunciation score from transcript;
- mandatory retry for capability claims.

Adapt:

- generated video lessons cannot rely on hand-authored regex alone;
- only closed tasks should receive authoritative correct/incorrect evaluation in the first v2 slice;
- open production remains self-check or human/explicitly governed evaluation until a reliable bounded evaluator exists.

### 5.3 Communication-clip roles

AtoEnglish required anchor, variation, interaction, and cold-transfer clips across a capability.

Vidlish starts from arbitrary user videos, so one lesson may not provide all roles. The system should:

- label which evidence role the current source supplies;
- avoid claiming capability mastery from one video;
- schedule future varied evidence when compatible videos become available;
- expose an explicit coverage gap instead of inventing variation.

### 5.4 Content standards

Keep structural quality checks such as measurable outcomes, plausible distractors, natural language, L1 risk quality, and real-world situations.

Replace curriculum quotas with adaptive ceilings and evidence requirements. A source-derived five-minute lesson may have one target item; it must not generate eight words merely to satisfy a unit standard.

## 6. What must not be copied

Do not port:

- `UnitTemplate.tsx` or other monolithic UI architecture;
- the fixed A0–B2 curriculum route structure;
- mandatory 8–20 vocabulary quotas;
- mandatory dialogue, quiz, translation, or shadowing counts;
- XP, league, streak, or reward logic as evidence of learning;
- full model answers before attempt;
- transcript-based pronunciation, accent, or comprehensibility scoring;
- binary mastery from immediate completion;
- a rigid ten-section learner flow;
- AtoEnglish database or runtime dependencies.

## 7. Gap analysis against current Vidlish PR #44

### Already aligned

Current Learning Model v2 already contains:

- canonical transcript allowlists and server-hydrated quotes/timestamps;
- explicit separation of source evidence and generated examples;
- learner context and time budget;
- can-do outcomes;
- first-listen / gist semantics;
- task-before-feedback and answer hiding;
- deterministic evaluation for closed tasks;
- transfer examples labelled as generated;
- completion separated from mastery in prose;
- item-level attempt and review persistence foundation;
- fail-closed diagnosis and candidate selection.

### Missing or under-specified

PR #44 still lacks enforceable contracts for:

1. communication events and interactional functions;
2. ordered progressive support and support-used evidence;
3. correction followed by mandatory retry;
4. transfer changed dimensions;
5. unseen-speaker or unseen-input evidence roles;
6. interactional-use evidence;
7. delayed-transfer evidence;
8. capability state separate from item review state;
9. varied-review task types;
10. Vietnamese L1/pragmatic risk metadata;
11. explicit rule that FSRS scheduling cannot mark capability mastery;
12. source-role and capability-coverage gaps across multiple videos.

The current authoring pipeline must not advance to live provider output until the first four missing contracts are implemented and tested. Otherwise the model can produce polished activities that still regress to annotated-video exercises.

## 8. Vidlish implementation decisions

### Decision A — Vidlish is the only source of truth

AtoEnglish remains unchanged and read-only. Accepted knowledge is copied as concepts with provenance, then owned and evolved in Vidlish.

### Decision B — no shared cross-repository package

A shared package would create maintenance and release coupling to a stopped project. Reuse occurs through documented policy, Vidlish contracts, and regression tests.

### Decision C — strengthen the runtime before live authoring

Implementation order:

1. add support-ladder, retry, and changed-dimension contracts;
2. persist support used and retry evidence;
3. add communication-event and capability-evidence contracts;
4. add varied/delayed review policy;
5. update fixture lesson and Chromium journey;
6. only then connect provider-backed diagnosis and constrained authoring;
7. run real-video evaluation after explicit quota permission.

### Decision D — preserve abstention

If a video does not support a meaningful communicative capability, changed-context transfer, or trustworthy acoustic claim, Vidlish must narrow the lesson or abstain. It must not fill missing pedagogy with invented content.

## 9. Required invariants for the next code slice

The next code slice must make these rules executable:

- support is ordered and cannot be marked used before the learner reaches it;
- full transcript/meaning reveal cannot occur before the configured attempt boundary;
- feedback with a correction creates a retry requirement;
- a capability task cannot complete while its required retry is pending;
- transfer declares at least one changed dimension;
- transfer does not expose a full suggested answer before attempt;
- completion remains a session status, not capability mastery;
- support level and retry evidence are persisted without raw audio or unrestricted free text.

## 10. Provenance note

This audit treats AtoEnglish repository work as internal product evidence, not as external scientific proof. Pilot thresholds, clip counts, support orders, retry limits, and review intervals remain hypotheses to validate. External research is still required where the internal repository has no reliable answer.
