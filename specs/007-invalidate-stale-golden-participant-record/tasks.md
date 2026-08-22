# Tasks: Invalidate stale Golden participant records

## Slice A — Confirm defect and boundary

- [x] A1 Trace capture form state → participant JSON build → copy/reset actions.
- [x] A2 Confirm observation controls remain editable after build while `participantJson` remains copyable.
- [x] A3 Confirm current Chromium coverage does not exercise post-build observation mutation.

## Slice B — Invalidate stale record

- [ ] B1 Invalidate built participant JSON and copy status when any moderator observation changes.
- [ ] B2 Preserve the intentional behavior where scoped Golden browser-state reset keeps an already-built participant JSON available.
- [ ] B3 Preserve measurement reload invalidation and all existing schema validation.

## Slice C — Proof

- [ ] C1 Extend Chromium proof: build → mutate observation → stale record disappears → rebuild contains new observation.
- [ ] C2 Run focused checks where available and full exact-head CI.

## Slice D — Review and merge

- [ ] D1 Adversarial review for accidental auto-inference, persistence, reset regression, or Gate 5 contract changes.
- [ ] D2 Open PR with the bounded acceptance boundary.
- [ ] D3 Merge only after all required CI jobs are green on the exact reviewed head.

## Explicitly deferred

- server/browser persistence of participant records;
- changes to Gate 5 thresholds or evaluator semantics;
- participant recruitment/automation;
- production/provider calls;
- unrelated learning-flow changes.