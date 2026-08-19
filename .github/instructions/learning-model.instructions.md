---
applyTo: "src/modules/learning/**/*.ts,src/modules/learning/**/*.tsx,src/app/api/learning-lab/**/*.ts,src/app/(protected)/learning-lab/**/*.tsx,src/shared/contracts/lesson-v2.ts,src/shared/contracts/privacy-safe-learning-evidence.ts,supabase/migrations/**/*.sql,supabase/tests/**/*.sql,tests/e2e/learning-model-v2*.ts"
---

# Learning Model v2 instructions

- Server session/immutable blueprint/repository persistence are authority; browser-local state is a cache/UI projection only.
- Do not expose answer/reveal before configured attempt boundaries.
- Incorrect/correction paths must not advance when retry is required.
- Immediate transfer and delayed transfer are separate evidence dimensions.
- A scheduler may choose `next_review_at`; it must not create a mastery claim.
- Persist bounded enums/IDs/counts/timestamps/evaluation evidence, not raw learner free text/audio/transcription.
- Every owner-scoped mutation must be enforceable independently of the UI and covered by RLS/RPC/ownership tests.
- Treat PostgreSQL `NULL`/CHECK behavior, concurrent requests and idempotent retries as explicit threat surfaces.
- If changing a migration/RPC, add or update pgTAP. If changing a user-visible learning flow, add or update Chromium E2E. If changing durable persistence, prove the actual Supabase rows in the durable journey.
- Do not use `force` clicks or timing sleeps to hide layout/state bugs in Playwright.
- Completion means the activity flow finished, not that the learner has retained or mastered the item.