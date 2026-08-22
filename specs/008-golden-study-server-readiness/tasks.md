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

- [x] C1 Added occupied/free-port test cases in `scripts/golden-study-harness.test.mjs`.
- [x] C2 Added HTTP-readiness, child-exit and timeout test cases, including timeout child termination and success-path non-termination.
- [x] C3 CI #490 and final CI #491 both passed the repository's then-configured suite. Post-merge audit found `vitest.config.ts` did **not** discover `scripts/golden-study-harness.test.mjs`, so those runs must not be cited as proof that C1/C2 executed. Feature 009 exists specifically to close this CI-discovery proof gap.

## Slice D — Review and merge

- [x] D1 Adversarial review startup races, leaked listeners/processes, credential output, DB-reset ordering and Gate 5 scope. Review added a second pre-spawn port check and direct timeout-kill proof.
- [x] D2 Draft PR #133 opened with the bounded acceptance boundary.
- [x] D3 Final exact head `ddebb888278d6f751647a909334d94f9327a32be` passed full configured CI #491 / run `32577961401`; PR #133 was marked ready and squash-merged into `main` as `9946df6b799346a9e1470a1c100515c1298fb684` using `expected_head_sha`. The later Feature 009 discovery correction does not change this merge fact.

## Explicitly deferred

- changing participant capture/evaluator semantics;
- changing Gate 5 thresholds or participant count;
- remote/mobile network exposure of the local harness;
- production/provider calls;
- unrelated learning-flow changes.
