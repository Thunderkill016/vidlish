# Feature 020 — Delayed review capability evidence

## Problem

Four-skill progress now rebuilds evidence from beginner dictation and lesson-v2 attempts, but durable delayed-review attempts are omitted. That drops later writing evidence from the learner's capability history.

Delayed review also has a reveal boundary: the server reveals the recall answer after each attempt. Therefore a retry cannot be labelled independent merely because no support event exists.

## Requirements

1. Delayed recall MUST be projected as writing evidence because the learner produces typed English from a meaning-only prompt.
2. Recall evaluation MUST remain objective correct/incorrect evidence.
3. Recall attempt number 1 MUST be independent.
4. Recall attempt number 2+ MUST be supported because a prior post-attempt reveal exposed the answer.
5. Delayed transfer MUST remain writing self-check, unscored and supported. Confirmation MUST NOT become objective transfer success.
6. Review evidence MUST use the existing privacy-safe capability observation contract and a distinct `learning_review` evidence kind.
7. The four-skill progress reader MUST include owner-scoped, paginated `learning_review_sessions` and `learning_review_attempts`.
8. A review attempt without an owner-scoped review session MUST fail closed.
9. Review evidence MUST NOT create speaking evidence.
10. No new capability/mastery persistence table may be introduced.

## Acceptance criteria

- A first correct delayed recall creates one independent objective writing success.
- A first incorrect delayed recall creates one independent objective writing failure.
- A later correct recall after reveal creates supported, not independent, writing success.
- A delayed transfer self-check creates supported unscored writing evidence only.
- Progress aggregation includes delayed review evidence and owner-scopes both review tables.
- Full exact-head CI is green before merge.
