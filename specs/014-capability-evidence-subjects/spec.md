# Feature 014 — Capability evidence subjects

## Problem

Capability observations currently require `itemKey`, but not every measured capability belongs to one lexical item. Multi-item transfer and future reading-comprehension tasks are activity-level evidence. Forcing them into an item key risks inflating vocabulary mastery.

## Requirements

1. Capability evidence MUST declare an explicit subject.
2. A subject MUST be either a `language_item` or an `activity`.
3. Beginner dictation MUST remain language-item scoped.
4. Objectively checked `chunk_recall` MUST remain language-item scoped.
5. Multi-item `guided_transfer` self-check evidence MUST be activity scoped and MUST NOT fan out into one observation per target item.
6. Verification-strength invariants remain unchanged: only objective evidence may claim success/failure; self-check and self-report remain unscored.
7. No raw learner text, transcript or audio is added to observations.

## Non-goals

- no reading activity yet;
- no speaking scoring;
- no database migration;
- no learner UI change;
- no mastery claim from one observation.

## Acceptance

Full repository CI passes on the exact PR head before merge.
