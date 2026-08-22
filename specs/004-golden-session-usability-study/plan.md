# Implementation Plan: Golden Session usability study gate

## Scope

This is an operator/research slice layered on the privacy-safe measurement work
from feature 003. It must not touch lesson progression, learning evidence,
provider selection, production persistence, or billing.

## Existing inputs

`LearningMeasurementSummary` already provides the durable facts needed for most
thresholds:

- session completion;
- observed elapsed seconds;
- changed-context transfer attempt count;
- support/replay activity;
- correction counts;
- bounded runtime-error categories.

The validation protocol deliberately leaves some facts to a human moderator:
lesson-goal understanding, before/after target recognition, whether a learner was
blocked, and severe product defects.

## Design

### 1. Shared bounded contract

Add `src/shared/contracts/golden-session-usability.ts`.

The contract contains exactly five participant records. Each record embeds the
existing `learningMeasurementSummarySchema` and a strict moderator observation
object with bounded enums/booleans only.

Use a short pseudonymous participant code rather than identity information.
Reject duplicate participant codes and duplicate session IDs at schema level.

### 2. Pure deterministic evaluator

Add `src/modules/learning/application/evaluate-golden-session-usability.ts`.

The evaluator is pure: no database, no provider, no clock, no random values. It
returns one result per predeclared threshold and an overall `passed` boolean.

Recognition order:

`not_recognized < partial < recognized`

A participant shows improvement only when the moderator's after level has a
strictly greater rank than before. `measurement.afterListen.latestVerdict` is
ignored for this calculation.

Median time uses the five durable `observedElapsedSeconds` values. If any value
is missing, the time threshold fails closed and reports the missing-evidence
count.

Completion without instruction counts only when both facts are true:

- durable `measurement.completed`; and
- moderator `completedWithoutModeratorInstruction`.

Changed-context use counts only from durable `measurement.transfer.attemptCount
>= 1`.

### 3. Focused tests

Cover:

- a passing 5-person study;
- a study failing multiple independent thresholds;
- duplicate participant/session rejection;
- an unscored after-listen attempt that does not create recognition gain;
- missing elapsed-time evidence failing closed.

### 4. Moderator runbook

Add `docs/product/learning-model-v2/golden-session-usability-runbook.md` with:

- recruitment/persona reminder;
- exact per-participant collection steps;
- how to obtain the owner-scoped measurement summary;
- bounded observation categories;
- how to run/interpret the evaluator once wired into an operator surface;
- explicit wording for what a pass does and does not prove.

This feature intentionally stops short of fabricating participants or claiming
Gate 5 has passed.

## Verification

Required before merge:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

No schema/persistence behavior changes are planned, so new pgTAP coverage is not
required by this slice. The full repository CI still decides merge readiness and
must remain green on the exact PR head.

## Adversarial review checklist

- no raw learner response/audio/transcript fields;
- no arbitrary/free-form notes in the automated study contract;
- no PII identifiers;
- no recognition inference from unscored exit ticket;
- no completion inferred from moderator observation alone;
- no transfer inferred from moderator observation alone;
- no hidden composite score or threshold drift;
- no capability/mastery/review mutation;
- no claim that the five-person study actually ran.
