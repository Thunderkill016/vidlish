---
name: vidlish-hard-gate
description: Deliver one Vidlish product hard gate as a bounded, verifiable vertical slice while preserving grounding, privacy, ownership and learning-evidence invariants.
---

# Vidlish hard-gate workflow

Read `AGENTS.md` first.

- Define the acceptance boundary before editing.
- Trace UI/API → application → port → adapter → DB → tests.
- Keep the slice minimal and vertical.
- Server/persistence remains authority; UI-local state is projection only.
- Add unit + pgTAP + Chromium + durable Supabase coverage according to the changed boundary.
- Never weaken tests, force browser clicks, or call production/paid providers to get a green run.
- Review for privacy leaks, answer exposure, completion/mastery confusion, RLS/ownership drift, SQL NULL fail-open behavior, races and idempotency.
- Keep PR draft until required CI is green on the actual head.
- A green technical gate does not authorize merge to `main` or production rollout.