# Tasks: Beginner listen-before-text integrity

## Learner flow

- [x] Hide standalone first-word text during listening.
- [x] Mark explicit first-word text reveal as support.
- [x] Keep audio replay available without text support.
- [x] Distinguish independent-known and supported first-word feedback.
- [x] Hide later sentence target while sentence text is hidden.

## Verification

- [x] Cover first-word independent path in Chromium.
- [x] Cover first-word supported path and durable known count in Chromium.
- [x] Cover later sentence target/text hiding in Chromium.
- [ ] Review diff for persistence/scoring/scheduler drift.
- [ ] Run exact-head full repository CI.
- [ ] Squash merge only the exact green head.

## Explicitly unchanged

- No Gate 5 work.
- No migration or schema change.
- No new scheduler, score or capability type.
- Server-owned challenges and existing support semantics remain authoritative.
