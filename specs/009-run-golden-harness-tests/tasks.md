# Tasks: Execute Golden study harness tests in CI

## Slice A — Confirm proof gap

- [x] A1 Inspect CI #491 unit-test logs for `golden-study-harness`; no execution entry is present.
- [x] A2 Inspect `vitest.config.ts`; canonical include patterns exclude `scripts/**/*.test.mjs`.
- [x] A3 Confirm `scripts/golden-study-harness.test.mjs` is the bounded test file that needs discovery.

## Slice B — Make proof reachable

- [x] B1 Add only `scripts/golden-study-harness.test.mjs` to the canonical Vitest include list.
- [x] B2 Correct Feature 008 tracker language so CI #490/#491 is not presented as having executed the excluded harness tests.

## Slice C — Evidence

- [ ] C1 Open draft PR and verify exact-head unit log names `scripts/golden-study-harness.test.mjs` as passing.
- [ ] C2 Require full exact-head CI green.

## Slice D — Review and merge

- [ ] D1 Adversarial review for unintended test-discovery expansion or runtime/product changes.
- [ ] D2 Merge only with green final exact-head CI and unchanged PR head.

## Explicitly deferred

- Golden harness runtime changes;
- Gate 5 threshold/contract changes;
- participant recruitment or synthetic records;
- production/provider calls;
- unrelated test-suite restructuring.
