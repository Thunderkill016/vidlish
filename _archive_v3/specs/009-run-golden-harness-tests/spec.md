# Feature 009 — Execute Golden study harness tests in canonical CI

## Problem

`scripts/golden-study-harness.test.mjs` contains the socket/HTTP proofs for the Gate 5 operator harness, but `vitest.config.ts` currently includes only TypeScript tests under `src/`, `tests/unit/`, and `tests/integration/`.

CI #490 and #491 were green, but their unit-test logs contain no `golden-study-harness` execution because this `.test.mjs` file was outside Vitest discovery. Therefore those runs prove the repository stayed green after Feature 008; they do **not** prove the new harness unit tests executed.

## Goal

Make the existing Golden study harness test file part of the canonical `pnpm test` suite so exact-head CI actually exercises the operator-readiness proof.

## Acceptance criteria

1. `vitest.config.ts` explicitly includes `scripts/golden-study-harness.test.mjs`.
2. No production/provider configuration, Gate 5 threshold, participant/evaluator contract, or learning runtime behavior changes.
3. Exact-head CI unit-test logs explicitly show `scripts/golden-study-harness.test.mjs` executing successfully.
4. Full required CI is green on the final reviewed PR head before merge.
5. Feature 008 documentation is corrected to distinguish “test code existed” from “test was executed by CI” until Feature 009 closes the gap.

## Non-goals

- changing Golden harness runtime behavior;
- adding new Gate 5 metrics or thresholds;
- recruiting/simulating participants;
- enabling provider or production calls;
- broadening Vitest discovery to unrelated script tests.
