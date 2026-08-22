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
- [ ] C3 Run full exact-head CI.

## Slice D — Review and merge

- [x] D1 Adversarial review startup races, leaked listeners/processes, credential output, DB-reset ordering and Gate 5 scope. Review added a second pre-spawn port check and direct timeout-kill proof.
- [ ] D2 Open draft PR with bounded acceptance boundary.
- [ ] D3 Merge only after all required CI jobs are green on the final exact head.

## Explicitly deferred

- changing participant capture/evaluator semantics;
- changing Gate 5 thresholds or participant count;
- remote/mobile network exposure of the local harness;
- production/provider calls;
- unrelated learning-flow changes.
