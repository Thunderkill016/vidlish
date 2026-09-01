# Feature 024 — Delayed speaking review

## Problem
Feature 022/023 proves that a learner used the microphone and completed a speaking self-check, but every speaking observation is conservatively `supported` because the capture happens immediately after a completed lesson whose guided-transfer exemplar may already have been revealed.

## Requirements
1. A speaking receipt remains privacy-safe: no durable audio, transcript, recognized text, pronunciation score, intelligibility score, CEFR claim, or mastery claim.
2. The database, not the browser, decides speaking support strength.
3. The first speaking receipt for one completed lesson session + guided-transfer activity may be `independent` only when the lesson was completed at least 24 hours before the receipt is created.
4. Immediate post-lesson captures and every second-or-later capture for the same session + activity are `supported`.
5. Persist an authoritative positive `attemptNumber` and `support` on every speaking receipt. Network retries using the same idempotency key must return the original receipt without incrementing the ordinal.
6. Four-skill progress must project the persisted speaking support value while keeping verification=`self_check` and outcome=`unscored`.
7. After one speaking attempt is saved, the UI may reveal the immutable guided-transfer exemplar and invite a retry. A retry never becomes independent merely because the learner ignores the exemplar.
8. Existing completed-lesson handoff remains valid; Feature 024 must not require a delayed wait before speaking practice can be used.

## Non-goals
- ASR, speech-to-text, pronunciation scoring, intelligibility scoring, accent scoring, or AI speech evaluation.
- Persisting raw audio or learner speech text.
- Treating independent self-check evidence as objective success.
