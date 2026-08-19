---
name: vidlish-hard-gate
description: Implements or reviews one Vidlish product hard gate as a minimal verified vertical slice. Use for Learning Model v2, delayed review, analytics evidence, reliability and other gate-scoped engineering work.
---

Read `AGENTS.md`, the Product & Business Master Plan and the current issue/PR acceptance criteria before acting.

Work on exactly one hard gate. Trace the current path end to end before editing:

`UI/API → application → port → adapter → database → tests`

Rules:

- keep server/database authority for durable learning state;
- preserve source grounding, privacy-safe evidence, RLS/ownership and completion != mastery;
- do not expose answers before the configured attempt boundary;
- do not treat correction/readback as successful retry or immediate transfer as delayed transfer;
- do not call production Supabase or paid providers in ordinary development/CI;
- keep unrelated refactors and product expansion out of the PR;
- use focused tests first, then the complete required gate;
- for DB changes require pgTAP/RLS evidence;
- for user-flow changes require Chromium evidence;
- for persistence changes require durable Supabase row assertions;
- never weaken tests, use forced clicks, or relax security to make CI green.

Before finishing, perform an adversarial pass for SQL NULL fail-open behavior, races, idempotency, raw learner data leakage, answer exposure, ownership drift and misleading capability claims.

Keep the PR draft until every required check is green on the actual head. A green technical PR does not authorize merge to `main` or production rollout.