# Feature 019 — Four-skill progress read model

## Problem

The progress page still presents legacy `learning_item_states` productive evidence with speaking language such as “tự nói ra”, even though that aggregate state does not record whether the learner spoke or wrote. Feature 018 made defensible lesson capability observations available per session, but there is still no learner-facing aggregate across durable lesson evidence and beginner dictation.

A progress page that guesses modality is worse than an empty skill. Vidlish must show only evidence for the skill a task actually measured.

## Requirements

1. The progress read model MUST aggregate the canonical four skills only: listening, reading, speaking and writing.
2. It MUST keep objective independent success, objective supported success, objective failure and unscored evidence separate.
3. It MUST NOT turn event counts into mastery, CEFR, proficiency percentages or scores.
4. Lesson evidence MUST be rebuilt from immutable `lesson_versions.blueprint`, privacy-safe `activity_attempts` and durable `learning_support_events` using the existing capability projector.
5. Beginner dictation MUST contribute listening evidence through the existing beginner projector. A written dictation response MUST NOT contribute writing evidence.
6. Legacy productive retrieval evidence without response modality MUST remain outside the four-skill aggregate and MUST NOT be labelled speaking or writing.
7. Speaking MUST remain zero until a trustworthy speaking task and verifier produce speaking observations.
8. Every service-role read MUST be owner-scoped explicitly, including lesson sessions, lesson versions, attempts, support events and beginner item state.
9. Durable collections MUST be paginated; Supabase row caps MUST NOT silently truncate progress history.
10. The feature MUST NOT introduce a second capability/mastery persistence table.
11. The learner-facing progress page MUST explain that the displayed values are evidence observations, not mastery.

## Acceptance criteria

- Independent beginner dictation increments listening independent evidence and no writing evidence.
- A supported objective reading activity increments reading supported evidence.
- Speaking remains zero in the absence of speaking observations.
- Another owner's evidence cannot change totals.
- The progress page no longer claims legacy unclassified productive evidence is something the learner “said”.
- Full CI, browser journeys and the durable Golden Session remain green on the exact PR head.
