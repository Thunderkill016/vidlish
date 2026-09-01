# Feature 023 — Session-bound speaking handoff

## Problem

Feature 022 created a real speaking capture flow, but the learner has to discover it separately from the lesson. That breaks the production loop: a completed lesson should lead directly into speaking rather than ending at a summary card or requiring a detour through progress.

A second risk is session ambiguity. If the post-lesson link says “continue this lesson” but the speaking page silently chooses another completed lesson, the UI and persisted evidence refer to different learning contexts.

## Goal

Hand a just-completed v2 lesson directly into speaking practice using its exact lesson session, while keeping browser completion state as navigation convenience only and preserving all Feature 022 speaking evidence boundaries.

## Requirements

1. Both the fixture v2 learning lab and the learner’s production v2 lesson render a post-completion speaking handoff.
2. The handoff is hidden until the existing runtime UI state says the current blueprint is completed and has a session ID.
3. The handoff URL carries that exact session ID to `/learning-lab/v2/speaking?session=<uuid>`.
4. localStorage is never evidence or authorization authority. It may only control whether the navigation affordance is visible.
5. The speaking page validates an explicit session ID as a UUID and queries it owner-scoped with `status=completed`.
6. An explicit session that is invalid, unowned, incomplete, missing a valid immutable lesson blueprint, or lacks a `guided_transfer` yields no speaking practice. It must not fall back to another lesson.
7. When no session is explicitly requested, the standalone speaking page may still select the most recent valid completed lesson for manual practice.
8. Speaking capture persistence remains governed by Feature 022’s server + DB validation of owner, completed session, and immutable `guided_transfer` activity.
9. This feature does not create objective speaking success/failure, pronunciation scores, intelligibility scores, CEFR claims, mastery claims, transcripts, or persistent audio.
10. Existing lesson attempts, review scheduling, and four-skill evidence semantics remain unchanged.

## Non-goals

- ASR or pronunciation/intelligibility verification.
- New lesson activity types or authoring-model calls.
- Persisting learner audio.
- Replacing the existing v4 runtime persistence model.
- Treating localStorage as a durable source of truth.
- Passing Gate 5.

## Acceptance

- Unit tests prove the handoff is absent before completion, carries the exact completed session after completion, and ignores a state from another blueprint.
- A pure selection test proves an explicit invalid session does not fall through to another valid completed lesson.
- A Chromium journey proves the completion affordance carries the exact session ID in the browser.
- Exact-head CI passes typecheck/lint, unit tests, production build, Chromium product journeys, Supabase migration/RLS tests, durable Golden Session, and aggregate CI gate before merge.
