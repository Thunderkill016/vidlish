# Plan — Feature 017

1. Audit every migration that defines `schedule_lesson_v2_target_reviews()` and confirm the latest production definition still promotes all correct attempts into productive evidence.
2. Replace the function in an additive migration so lesson-session productive evidence is restricted to `chunk_recall`.
3. Preserve generic `attempt_count`, existing transfer semantics, review scheduling, ownership and conflict-update behavior.
4. Treat immutable `hintVi` as support and derive runtime support from durable `learning_support_events` occurring no later than the attempt.
5. Add an isolated pgTAP regression covering recognition, immutable hint, runtime support and independent recall in one completed session.
6. Verify `learner_known_words()` sees only the truly independent item.
7. Do not mutate historical aggregate rows because their source dimensions are no longer separable without an audited rebuild.
8. Run exact-head CI including migration rebuild, pgTAP, browser journeys and durable Golden Session before merge.
