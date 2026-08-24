# Feature 025 — Speaking review queue

## Problem

Feature 024 can classify the first speaking capture at least 24 hours after lesson completion as `independent`, but the learner has no trustworthy way to discover that delayed opportunity.

## Requirements

- Derive speaking-review reachability from durable completed lesson sessions, immutable lesson blueprints and speaking receipts.
- A candidate is the exact owned `guided_transfer` activity from the completed lesson session.
- `dueAt = completedAt + 24 hours`.
- Any existing speaking receipt for that exact session/activity removes it from this delayed-independent queue.
- Due and upcoming speaking reviews remain separate from lexical FSRS review state.
- `/review` links a due speaking candidate to the exact session via `/learning-lab/v2/speaking?session=...`.
- Opening before 24 hours is not presented as an independent opportunity.
- The queue creates no new scheduler table and persists no new mastery/capability state.
- Speaking evidence remains `self_check / unscored`; due status is not success, intelligibility, pronunciation, CEFR or mastery.
- Raw audio, transcript and recognized learner speech remain outside durable queue data.
- All Supabase reads are owner-scoped and paginated.
- Fake runtime must not fabricate speaking review eligibility.
- Gate 5 remains unchanged.
