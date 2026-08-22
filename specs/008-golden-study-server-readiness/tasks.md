# Tasks: Golden study server readiness

## Slice A — Confirm defect and boundary

- [x] A1 Trace `pnpm study:golden` startup order from port ownership → DB reset → fixture → child server → operator instructions.
- [x] A2 Confirm current code prints “ready” before spawning Vidlish and has no study-port preflight/readiness probe.
- [x] A3 Confirm the runbook describes Vidlish startup before operator URLs are printed.

## Slice B — Fail closed on ambiguous server ownership

- [x] B1 Add loopback port preflight before local DB reset; occupied port must fail before the participant cycle is mutated.
- [x] B2 Spawn Vidlish only after the clean local fixture is prepared.
- [x] B3 Wait for the spawned app to answer HTTP before printing ready instructions.
- [x] B4 Fail on child exit-before-ready or bounded readiness timeout; terminate a timed-out child.
- [x] B5 Preserve existing signal forwarding, isolated runtime env and no-paid-provider boundary.

## Slice C — Proof

- [x] C1 Unit-test occupied and free port preflight.
- [x] C2 Unit-test HTTP readiness, child-exit failure and timeout failure, including timeout child termination and success-path non-termination.
- [x] C3 Full PR CI #490 passed on implementation head `47ae2920a92a68a6a542c8815d7322ad168d7192`: typecheck/lint, unit tests, production build, Supabase migration/RLS tests, Chromium product journeys, durable Supabase-backed learning journey, and aggregate CI gate all succeeded.

## Slice D — Review and merge

- [x] D1 Adversarial review startup races, leaked listeners/processes, credential output, DB-reset ordering and Gate 5 scope. Review added a second pre-spawn port check and direct timeout-kill proof.
- [x] D2 Draft PR #133 opened with the bounded acceptance boundary.
- [x] D3 Final exact head `ddebb888278d6f751647a909334d94f9327a32be` passed full CI #491 / run `32577961401`; PR #133 was marked ready and squash-merged into `main` as `9946df6b799346a9e1470a1c100515c1298fb684` using `expected_head_sha`.

## Explicitly deferred

- changing participant capture/evaluator semantics;
- changing Gate 5 thresholds or participant count;
- remote/mobile network exposure of the local harness;
- production/provider calls;
- unrelated learning-flow changes.
