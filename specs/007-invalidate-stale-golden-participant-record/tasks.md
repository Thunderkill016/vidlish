# Tasks: Invalidate stale Golden participant records

## Slice A — Confirm defect and boundary

- [x] A1 Trace capture form state → participant JSON build → copy/reset actions.
- [x] A2 Confirm observation controls remain editable after build while `participantJson` remains copyable.
- [x] A3 Confirm current Chromium coverage does not exercise post-build observation mutation.

## Slice B — Invalidate stale record

- [x] B1 Invalidate built participant JSON and copy status when any moderator observation changes.
- [x] B2 Preserve the intentional behavior where scoped Golden browser-state reset keeps an already-built participant JSON available.
- [x] B3 Preserve measurement reload invalidation and all existing schema validation.

## Slice C — Proof

- [x] C1 Extend Chromium proof: build → mutate observation → stale record disappears → rebuild contains new observation.
- [x] C2 Implementation head `3d19c45eb17717006e1ac9186b2f55ce0c3f928f` passed full repository CI #487 / run `32576299389`: typecheck/lint, unit tests, production build, Supabase migration/RLS + pgTAP, Chromium product journeys, durable Supabase learning journey, and aggregate CI gate all succeeded.

## Slice D — Review and merge

- [x] D1 Adversarial review found no auto-inference, persistence, reset, evaluator, threshold, or Gate 5 contract expansion: the change only invalidates browser-local built output when moderator select state changes.
- [x] D2 Open draft PR with the bounded acceptance boundary. PR #132.
- [x] D3 Lock merge protocol: this tracker-converged head must pass full exact-head CI again, then PR #132 may be merged only with that unchanged expected head SHA. The actual merge result remains repository/PR metadata rather than a pre-merge tracker claim.

## Explicitly deferred

- server/browser persistence of participant records;
- changes to Gate 5 thresholds or evaluator semantics;
- participant recruitment/automation;
- production/provider calls;
- unrelated learning-flow changes.