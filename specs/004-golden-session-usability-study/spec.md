# Feature Specification: Golden Session usability study gate

**Feature branch:** `feature/golden-session-usability-study`  
**Status:** implementation  
**Authority:** `docs/product/learning-model-v2/golden-session-validation.md`

## Problem

Gate 5 requires a moderated usability pass with exactly five target learners. The
Golden Session now exposes privacy-safe per-session measurement, but the study
still needs a deterministic way to combine that durable evidence with the small
set of observations that only a human moderator can make.

Without a locked study contract, a moderator can accidentally move the goalposts,
count an unscored exit ticket as learning gain, ignore a blocked participant, or
turn positive verbal intent into payment evidence.

## Goal

Provide a bounded, privacy-safe study record and deterministic evaluator for the
five-person Golden Session usability pass.

The evaluator must answer only this question:

> Did this five-person moderated usability pass meet the predeclared Gate 5
> thresholds in the Golden Session validation protocol?

It does not prove retention, mastery, payment intent, model quality, or rollout
readiness.

## Inputs

Each participant record combines:

1. one existing `LearningMeasurementSummary` from the owner-scoped measurement
   projection; and
2. bounded moderator observations that telemetry cannot honestly infer.

Moderator observations required for the gate:

- participant code, never name/email;
- test platform: desktop or mobile;
- completed without moderator instruction;
- could restate the lesson goal in their own words;
- before target-recognition level;
- after target-recognition level;
- whether the participant became blocked and the bounded block category;
- whether a severe grounding, answer-exposure, or misleading-mastery defect was
  observed.

Recognition levels are bounded to `not_recognized`, `partial`, `recognized`.
Improvement means the after level is strictly higher than the before level. The
unscored after-listen activity never creates recognition improvement by itself.

## Gate thresholds

The evaluator must implement the predeclared five-person thresholds without
silent reinterpretation:

- exactly 5 unique participants and 5 unique session IDs;
- at least 4/5 both complete the durable session and do so without moderator
  instruction;
- at least 4/5 can restate the lesson goal;
- at least 4/5 have a persisted changed-context transfer attempt;
- 0/5 are blocked by player, support, feedback, retry, or another flow defect;
- zero severe grounding, answer-exposure, or misleading-mastery defects;
- all 5 sessions expose an observed elapsed time and the median is within
  240–480 seconds inclusive;
- at least 3/5 show moderator-observed target-recognition improvement.

Every threshold must be reported separately as pass/fail plus the observed
count/value. Overall Gate 5 usability status passes only when every threshold
passes.

## Privacy boundary

The study contract must reject arbitrary notes and must not contain:

- learner names, email, phone, IP, user agent;
- raw open responses;
- transcript/caption/source text;
- raw audio or recognized speech;
- provider error strings;
- free-form qualitative notes.

Qualitative research notes may exist in a separate local moderator notebook, but
they are not input to the automated gate evaluator and should avoid unnecessary
PII.

## Non-goals

- recruiting or fabricating five learners;
- claiming the study has run before real participant records exist;
- persisting study results to production Supabase;
- adding third-party analytics;
- changing lesson progression, evidence, mastery, or review state;
- evaluating the later 20–50 learner cohort;
- benchmarking Gemini models;
- treating willingness-to-return or willingness-to-pay answers as behavioral or
  payment evidence.

## Acceptance criteria

1. A strict Zod contract accepts exactly five unique, privacy-safe participant
   records and rejects duplicate participant/session identifiers.
2. The evaluator implements every threshold above deterministically and exposes
   no hidden weighting or composite score.
3. Recognition gain comes only from bounded moderator before/after observation,
   never from `afterListen.latestVerdict`.
4. Completion and transfer thresholds require matching durable measurement facts;
   moderator claims alone cannot manufacture them.
5. Missing elapsed-time evidence fails the time threshold closed.
6. Focused tests cover a passing study, threshold failures, duplicate records,
   and the unscored-after-listen boundary.
7. A runbook tells a moderator exactly how to collect the five records and how
   to interpret the evaluator without overstating what Gate 5 proves.
8. No runtime learning behavior, provider configuration, production data, or
   billing path changes in this feature.
