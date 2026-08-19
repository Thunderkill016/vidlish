# Learning-science product rules

Vidlish is not a quiz generator wrapped around YouTube. The product must turn a learner-owned video into evidence that the learner can first understand, then retrieve, then reuse language with progressively less support.

This document is a product constraint, not a claim that any single activity proves language mastery. Research informs the design; learner evidence and cohort outcomes decide whether a feature stays.

## Minimum learning loop

Every generated first-session lesson must preserve this order:

1. **Unaided gist listen** — the first activity is a `gist_choice` with captions hidden on the first pass.
2. **Progressive support** — replay, hints, captions, chunk boundaries, meaning, and slower playback are scaffolds that unlock only as needed. They are not the default presentation.
3. **Form retrieval** — at least one `chunk_recall` requires the learner to reconstruct a target item. A recall activity may not start with captions already shown.
4. **Changed-context transfer** — at least one `guided_transfer` reuses a target item from recall in a different situation.
5. **Delayed retrieval** — the same item can return through the existing FSRS-backed review state. Immediate lesson completion is not mastery.

The deterministic authoring quality gate enforces steps 1, 3, and 4. The runtime support policy enforces step 2. Review scheduling owns step 5.

## Why these rules exist

### Captions are support, not the task

A meta-analysis of captioned L2 video found strong overall benefits for listening comprehension and vocabulary learning, while outcome/test type changes the measured effect. That supports making captions available. It does **not** justify exposing the transcript before the learner has tried to decode the audio.

Product consequence: keep captions in the support ladder, require the first gist pass to be `hidden_first`, and reject a recall item whose caption policy is `shown`.

Reference: Montero Perez, Van Den Noortgate & Desmet (2013), *System*, DOI `10.1016/j.system.2013.07.013`.

### Recognition is not enough

Research reviews of L2 vocabulary training distinguish restudy/recognition from retrieval practice and show that retrieval plus spacing or semantic elaboration can build stronger form-meaning connections than massed repetition alone. Repeated retrieval has benefits, but more repetitions are not automatically more efficient once time-on-task is considered.

Product consequence: do not optimize for number of quiz questions. Require an actual production/retrieval event before the item can count as retrieved evidence.

References:
- Nakata (2017), *Studies in Second Language Acquisition*, DOI `10.1017/S0272263116000280`.
- Barcroft et al. review (2020), *Studies in Second Language Acquisition*, DOI `10.1017/S0272263119000500`.

### Transfer must change the context

A learner can memorize the exact source sentence without learning to use its language. Vidlish therefore separates source-grounded recall from generated changed-context use.

Product consequence: a valid generated lesson must contain a `chunk_recall` and a later `guided_transfer` sharing at least one `candidateId`. Transfer before retrieval, or transfer using a different target, does not satisfy the loop.

This is a product operationalization of transfer practice, not a claim that one successful response proves generalized communicative competence.

### Spacing is durable state, not a streak

Meta-analytic and longitudinal L2 vocabulary research supports spacing encounters rather than concentrating all exposure in one sitting. Vidlish already represents delayed review with scheduler state so the product can bring an item back after the first lesson.

Product consequence: session completion must never be displayed or persisted as mastery. Review scheduling and later performance are separate evidence.

Reference: *How effective is second language incidental vocabulary learning? A meta-analysis*, *Language Teaching* (Cambridge University Press), especially its synthesis of spaced versus massed encounters.

### AI proposes; deterministic systems decide

Recent reviews of AI in second-language learning show rapid growth, but writing and speaking dominate the literature while listening remains a smaller evidence base. Generative AI can enable richer task design, but use of AI alone does not make a task pedagogically transformative.

Product consequence: Gemini may diagnose candidate material and author task wording, but it does not decide provenance, mastery, CEFR, scheduler state, or whether a lesson meets the minimum learning loop. Those are deterministic or evidence-driven decisions.

References:
- Bao et al. (2025), systematic review of AI in SLA, DOI `10.1007/s10791-025-09833-6`.
- Li, Shadiev & Chiu (2025/2026), systematic review/meta-analysis of GenAI and task-based language learning, DOI `10.1007/s11528-025-01140-7`.

## Feature-adoption rules

A new learning feature belongs in Vidlish only when it satisfies all of these constraints:

- It targets a named capability: comprehension, productive recall, interactional use, changed-context transfer, or delayed transfer.
- It produces bounded evidence that can be interpreted without storing raw learner text/audio unless that privacy expansion was explicitly approved.
- It does not reveal the answer before an attempt.
- It has a deterministic fallback or guard when AI output can affect what the learner is taught.
- It can be evaluated against learner outcomes, not only engagement or completion.
- It does not infer CEFR or mastery from a single heuristic, model judgement, or session.

## High-value next experiments

These are experiments, not automatic dependencies:

- **Confidence calibration:** capture a bounded confidence rating before feedback so correct guesses and calibrated knowledge are distinguishable without persisting raw text.
- **Listening decoding micro-loop:** selective dictation/chunk segmentation for moments where comprehension fails despite known vocabulary.
- **Adaptive scaffold fading:** use prior support/replay evidence to start later encounters with less help, while allowing escalation.
- **YouTube lexical salience:** evaluate TUBELEX frequency/dispersion as a deterministic usefulness signal, versioned and benchmarked before it influences target selection.
- **Slow playback support:** wire supported YouTube playback rates to the existing `slower_playback` support step without exposing it before unlock.

None of these should be promoted as improving learning until cohort evidence shows a meaningful gain in delayed retrieval/transfer or a reduction in support needed for equivalent performance.
