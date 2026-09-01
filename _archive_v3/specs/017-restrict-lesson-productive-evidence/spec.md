# Feature 017 — Restrict lesson productive evidence

## Problem

`learning_item_states` is a legacy item-level projection used by delayed review and `learner_known_words()`. Its lesson-completion trigger currently treats every target-item attempt with `evaluation.verdict = correct` as a successful retrieval. That collapses recognition tasks such as `meaning_in_context` into productive evidence and can set `last_independent_at` without any production having occurred.

The newer capability-observation model already refuses this inference. The durable legacy projection must not contradict it.

## Requirements

1. Lesson-session `successful_retrievals` MUST increment only for objectively correct `chunk_recall` attempts.
2. A correct `chunk_recall` MAY count as successful retrieval when supported, but MUST set `last_independent_at` only when:
   - no `support_opened` event exists for the same session/activity at or before the attempt; and
   - the immutable activity does not contain a non-null `hintVi`.
3. Recognition/choice activities MUST remain generic interaction history only; they MUST NOT become productive retrieval or independent-production evidence.
4. `attempt_count` remains generic item interaction history and is not redefined by this feature.
5. Existing changed-context transfer semantics MUST remain unchanged.
6. `learner_known_words()` MUST therefore exclude recognition-only, hinted-recall and supported-recall evidence and admit only independently produced evidence.
7. Historical aggregate rows MUST NOT be destructively backfilled. Existing rows combine lesson-session and delayed-review evidence, so subtracting inferred historical pollution could erase legitimate evidence. Future writes are corrected; raw durable attempts remain available for a later audited rebuild.

## Acceptance criteria

A database regression fixture completes one lesson containing four target-item cases: correct recognition, correct recall with immutable hint, correct recall after support, and correct unsupported hint-free recall. After completion:

- all four items are scheduled;
- recognition has `successful_retrievals = 0` and no `last_independent_at`;
- both supported recall cases have `successful_retrievals = 1` and no `last_independent_at`;
- unsupported hint-free recall has `successful_retrievals = 1` and a non-null `last_independent_at`;
- `learner_known_words()` returns only the unsupported hint-free recall item.
