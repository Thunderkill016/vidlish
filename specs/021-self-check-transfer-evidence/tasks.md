# Tasks

- [x] Add `transfer_self_checked_at` to durable item state.
- [x] Rebuild historical immediate transfer aggregates from raw attempts + immutable blueprints.
- [x] Restrict future `transfer_succeeded_at` to objective `correct` transfer evaluations.
- [x] Add pgTAP coverage for self-check vs objective transfer state.
- [ ] Run exact-head CI.
- [ ] Merge only after aggregate CI gate succeeds.
