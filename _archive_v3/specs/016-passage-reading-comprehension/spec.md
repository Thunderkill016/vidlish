# Feature 016 — Passage reading comprehension

## Problem

Vidlish can now observe lexical reading in context, but that does not establish comprehension of a passage. Reusing a listening gist as reading would also overclaim modality if the learner never saw canonical English text before answering.

## Requirements

1. A passage-reading observation must require canonical English source text to be visible before the response.
2. The initial `hidden_first` gist remains listening-first and must not expose transcript text before attempt.
3. Passage reading must be activity-scoped; it must never inflate target-language-item mastery.
4. The passage must come from the canonical transcript, not model-authored prose.
5. The task must use a selected authoring window distinct from the initial listening window when available.
6. A passage shorter than 8 words or longer than 4,000 characters is not accepted as passage-reading evidence.
7. One-window lessons remain valid but make no passage-reading claim.
8. If a reading passage shares source segments with an earlier listening gist, its capability observation is conservatively `supported`, not `independent`.
9. A shown passage gist is objectively scored using the existing single-choice evaluator and remains completion evidence, not mastery.

## Non-goals

- General reading proficiency from one activity.
- Replacing lexical reading evidence from `meaning_in_context`.
- Generating passages with Gemini.
- Adding a new scheduler or a new persisted activity type.
- Claiming speaking evidence.

## Acceptance

Exact-head CI must pass typecheck/lint, unit tests, production build, Supabase migration/RLS/pgTAP, Chromium journeys, durable Golden Session, and aggregate CI gate before merge.
