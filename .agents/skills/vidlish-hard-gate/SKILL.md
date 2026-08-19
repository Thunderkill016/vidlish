---
name: vidlish-hard-gate
description: Deliver one Vidlish product hard gate as a bounded, verifiable vertical slice without violating grounding, privacy, learning-evidence or provider-safety invariants.
---

# Vidlish hard-gate delivery

Read `AGENTS.md` and the current product authority before editing.

## Workflow

1. Write the exact acceptance boundary in 3–8 bullets. Separate what must be proven from what is explicitly deferred.
2. Trace the current end-to-end path before changing it: UI/API → application → port → adapter → database → tests.
3. Identify the smallest slice that produces durable evidence. Do not add adjacent platform features.
4. Implement server authority first for state/evidence changes, then UI projection.
5. Add tests at the narrowest useful layer and at the durable boundary:
   - unit for policy/evaluation/idempotency;
   - pgTAP for migration/RLS/RPC/ownership;
   - Chromium for user behavior;
   - durable Supabase E2E when persistence semantics change.
6. Run focused tests, then the required full CI gate.
7. Review the diff adversarially for:
   - raw learner text/audio leakage;
   - answer exposure before attempt;
   - completion/mastery confusion;
   - ownership/RLS drift;
   - `NULL` fail-open checks;
   - race/idempotency bugs;
   - production/paid-provider leakage;
   - flaky browser workarounds.
8. Open a draft PR. Mark the gate done only after all required CI jobs are green on the actual PR/integration head.

## Parallel-agent rule

Parallelize only independent scopes in separate branches/worktrees, e.g. one agent implements while another reviews DB/privacy/test gaps. Never let two agents concurrently edit the same migration, contract or session-state file without an explicit integration owner.

## Stop conditions

Do not merge to `main`, enable production provider calls, or broaden product scope merely because the technical slice passes CI. Product/business gates in `AGENTS.md` remain authoritative.