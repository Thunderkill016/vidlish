# Feature 011 — Separate beginner dictation evidence

## Problem

The beginner comprehensibility gate deliberately treats `learner_known_words()` as a narrow productive-capability signal: a word enters that set only after the learner has independently produced it with no support open.

The current challenge-bound persistence violates that rule. `record_beginner_challenge_evidence` ignores the server-owned challenge `kind`; a perfect no-support `dictation` is persisted through the same `successful_retrievals` / `last_independent_at` fields used by `introduce_word`. Because `learner_known_words()` selects `last_independent_at is not null`, copying a heard sentence perfectly can promote its target word into the productive-known set.

That collapses listening/dictation evidence into productive lexical evidence and can make later generated input appear comprehensible on evidence the learner never demonstrated.

## User outcome

A successful dictation remains durable evidence. It can be distinguished as successful and, where no support was used and calibration is trusted, independent dictation evidence. It never by itself makes the target word a productive-known word.

## Acceptance criteria

1. `BeginnerWordEvidence` represents productive retrieval evidence and dictation evidence separately.
2. A challenge evidence write carries both `successful` and `independent`; `independent=true` with `successful=false` is rejected.
3. The database decides how to persist the write from the server-owned `beginner_evidence_challenges.kind`; callers cannot choose the evidence modality independently of the challenge.
4. `introduce_word` preserves the existing productive behavior: only an independent successful introduction advances `successful_retrievals` and `last_independent_at`.
5. A successful `dictation` advances a separate successful-dictation counter/timestamp. An independent successful dictation additionally advances a separate independent-dictation timestamp.
6. A `dictation` never changes `successful_retrievals` or `last_independent_at`.
7. `learner_known_words()` remains based on `last_independent_at`, so a word with dictation evidence alone is not returned.
8. A later independent `introduce_word` for that same word may still promote it into `learner_known_words()` without erasing its dictation history.
9. Challenge ownership, expiry, one-time consumption and browser privilege boundaries remain unchanged.
10. Fake and Supabase repositories implement the same evidence semantics.
11. Historical rows are not rewritten or backfilled from insufficient provenance. The migration is a forward-correctness boundary and must not invent whether old aggregate evidence came from dictation or production.
12. pgTAP and unit tests explicitly prove that independent dictation cannot promote `knownWords`.

## Non-goals

- redefining the initial self-reported `introduce_word` calibration task;
- changing the beginner lexical novelty budget;
- redesigning all lesson-v2 modality evidence in this slice;
- deleting or guessing at historical `last_independent_at` values;
- adding speech recognition or pronunciation scoring;
- changing Gate 5 evidence or claiming learner-effectiveness.

## Invariants

- Completion and successful copying are not productive mastery.
- Supported and independent evidence remain distinguishable.
- Evidence modality is derived from server-owned challenge state.
- UI-local state and browser-supplied target data are not evidence authority.
- A migration must fail closed rather than infer historical capability that was not observed with sufficient provenance.
