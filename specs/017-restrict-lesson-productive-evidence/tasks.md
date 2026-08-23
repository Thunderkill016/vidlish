# Tasks — Feature 017

- [x] Audit the latest `schedule_lesson_v2_target_reviews()` definition.
- [x] Confirm recognition tasks currently pollute productive legacy evidence.
- [x] Add migration restricting lesson-session productive retrieval to correct `chunk_recall`.
- [x] Require no prior support and no immutable hint for `last_independent_at`.
- [x] Preserve generic attempt counts and transfer semantics.
- [x] Add pgTAP regression for recognition, hinted recall, supported recall and independent recall.
- [x] Assert `learner_known_words()` only admits independently produced evidence.
- [x] Document why no historical destructive backfill is attempted.
- [ ] Open pull request.
- [ ] Pass exact-head full CI.
- [ ] Merge only after aggregate CI gate is green.
