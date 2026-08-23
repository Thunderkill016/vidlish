# Feature 021 — Self-check transfer evidence strength

## Problem

`learning_item_states.transfer_succeeded_at` can currently be written by a `guided_transfer` activity whose server evaluation is `self_check`. The runtime intentionally does not mark this open response correct or incorrect, so storing a fully checked self-check as transfer success overstates the evidence.

## Requirements

1. A completed/full-criteria `guided_transfer` self-check must be stored separately from objective transfer success.
2. `transfer_self_checked_at` records the latest bounded lesson transfer self-check that confirmed every server-authored criterion.
3. `transfer_succeeded_at` may only be written by an objective `correct` guided-transfer evaluation.
4. Historical aggregate transfer state must be rebuilt from durable activity attempts plus immutable lesson blueprints rather than trusting the old aggregate timestamp.
5. Historical delayed-review transfer remains separate in `last_delayed_transfer_at`.
6. Productive retrieval semantics from Feature 017 must remain unchanged: only correct `chunk_recall` contributes productive retrieval, and independent retrieval still requires no immutable hint and no opened support before the attempt.
7. A self-check must not become objective four-skill success or speaking evidence.
8. Completion remains distinct from mastery and changed-context self-check remains distinct from verified transfer success.
