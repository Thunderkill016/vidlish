# Plan

1. Extend speaking receipt contract with authoritative `attemptNumber` and `support`.
2. Add a migration that backfills existing speaking receipts as `supported`, then replaces the RPC so it serializes on the lesson session, assigns attempt ordinals, and marks only a first capture after a 24-hour delay as `independent`.
3. Update Supabase adapters/read models and speaking capability projection to use persisted support.
4. Reveal the immutable transfer exemplar only after a saved capture and keep it visible for retries.
5. Add unit/pgTAP/UI coverage for delayed first attempt, immediate first attempt, retry support, idempotency, privacy boundaries, and projection semantics.
6. Open a PR and merge only after exact-head CI is fully green.
