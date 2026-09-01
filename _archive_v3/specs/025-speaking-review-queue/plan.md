# Plan

1. Define bounded speaking-review queue contracts and pure derivation.
2. Add owner-scoped Supabase read model over completed sessions, immutable blueprints and speaking receipts.
3. Keep fake runtime explicitly empty instead of inventing eligibility.
4. Surface speaking due/upcoming separately from lexical FSRS review on `/review`.
5. Lock derivation, owner scoping and exact-session suppression with tests.
6. Run exact-head CI and merge only after aggregate gate is green.
