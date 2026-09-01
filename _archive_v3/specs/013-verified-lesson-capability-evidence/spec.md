# Feature 013 — Verified lesson capability evidence

## Problem

Feature 012 introduced a four-skill observation model, but lesson attempts still need a conservative bridge into that model. The lesson runtime contains activities with very different evidence strength:

- `chunk_recall` accepts typed text and is objectively checked by the server;
- `guided_transfer` collects written production but is deliberately self-checked and never objectively graded;
- choice activities can depend on video, captions or reading, so their measured receptive skill is not yet provable from the immutable blueprint alone.

Collapsing all of these into the same success signal would recreate the evidence inflation the capability model was introduced to prevent.

## Goal

Project only defensible lesson evidence into four-skill observations while keeping verification strength explicit.

## Rules

1. Add `verification` to capability observations: `objective`, `self_check`, or `self_report`.
2. Add `unscored` outcome for history that is useful but not objectively graded.
3. Non-objective evidence MUST NOT claim `successful` or `unsuccessful` capability.
4. Objectively checked `chunk_recall` projects to item-level writing success/failure.
5. `guided_transfer` projects to writing history with `verification: self_check` and `outcome: unscored` only.
6. Support level is derived from persisted server support events for the same session/activity occurring no later than the attempt.
7. An immutable `chunk_recall.hintVi` is treated conservatively as support until runtime evidence can prove the hint remained hidden.
8. Choice/reflection activities remain unprojected until the product can prove whether they measured listening or reading.
9. Speaking remains unprojected until a trustworthy speaking task and verifier exist.
10. Raw learner text remains absent from capability observations.

## Acceptance criteria

- contract rejects self-check/self-report success claims;
- beginner dictation remains objective listening evidence;
- correct and incorrect typed recall produce objective writing observations;
- support opened after an attempt cannot retroactively change that attempt;
- guided transfer can be recorded without being called successful;
- current ambiguous choice activities do not fabricate listening/reading evidence;
- complete repository CI passes on the exact PR head.
