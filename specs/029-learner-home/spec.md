# Feature Specification: Learner-first daily home

**Feature branch:** `feat/029-learner-home`  
**Status:** implementation

## Problem

Vidlish already has useful learner flows, but the dashboard still reads like an internal product surface: it foregrounds implementation language, does not surface delayed speaking work, and does not make the zero-to-English path visible enough. On mobile, the bottom navigation declares five columns while rendering six links, forcing one item into another row.

The learner should be able to open Vidlish and immediately answer three questions:

1. What can I learn now if I am building from zero?
2. Is anything due for review or speaking today?
3. What lesson was I already working on?

## Requirements

### Daily learner home

- The dashboard headline is learner-facing and action-oriented.
- The existing current/most-recent video lesson remains directly reachable.
- Beginner progress is read from the existing owner-scoped beginner progress repository.
- The dashboard always exposes the `/start` path and shows the current known-word count when available.
- Lexical review due items continue to use the existing review repository and review-plan validation.
- Delayed speaking due items use the existing speaking review queue reader.
- When delayed speaking is due, the dashboard deep-links the exact eligible lesson session.
- When lexical review is due, the dashboard links directly to the existing v2 review flow.
- If nothing is due, the dashboard may show the next known review time and links to `/review`.
- Learner copy must avoid internal terms such as FSRS, scheduler, evidence projection, mastery gate, or Gate 5 on the dashboard.

### Mobile navigation

- Desktop keeps all existing navigation items including `Tạo bài`.
- Mobile shows exactly five primary learner tabs in a single five-column row: Tổng quan, Từ số 0, Thư viện, Ôn tập, Tiến bộ.
- `Tạo bài` remains directly available from the dashboard, so removing it from the mobile bottom bar does not remove the capability.

## Non-goals

- No Gate 5 work.
- No new learner evidence or scoring semantics.
- No new scheduler or review persistence.
- No migration or provider change.
- No change to speaking support classification.
- No artificial streak, XP, mastery score, or engagement counter.

## Verification

- Typecheck/lint and production build.
- Existing unit and Supabase tests remain green.
- Chromium journey verifies the learner-facing dashboard and exactly five mobile navigation tabs.
- Existing durable learning journey remains green.
- Merge only after exact-head aggregate CI is green.
