# Vidlish Project Context

## Current stage

- Research: complete.
- PRD and English-language eligibility amendment: final.
- Lesson Engine SPEC and companions: final.
- UX: corrected and final.
- Architecture: final; initial implementation adapters locked in `IMPLEMENTATION-DECISIONS.md`.
- Epics & Stories: final; 5 epics / 29 stories; coverage and quality validation PASS.
- Implementation Readiness rerun: **READY/PASS**.
- Sprint Planning: complete; canonical tracking exists at `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Epic 1: `in-progress`.
- Story 1.1 implementation artifact: created and `ready-for-dev` at `_bmad-output/implementation-artifacts/1-1-truy-cap-private-beta-va-dang-nhap-an-toan.md`.
- Product code: not started.

Story 1.1 must pass the dedicated story-validation workflow before development begins.

## Product promise

Vidlish turns a public, playable **English-language YouTube video** into a personalized English lesson for Vietnamese learners.

Canonical tagline:

> **Any English video. Your English lesson.**

## Non-negotiable language eligibility invariant

A video is eligible only when its original spoken content contains enough reliable English to build a grounded Core Lesson from the video itself.

1. Primary spoken language is English, or a coherent English portion is independently large enough for a valid lesson.
2. Incidental non-English speech is context only and cannot be English source evidence.
3. Source quotes, listening, grammar, vocabulary and scored evidence come from actual English speech in the source video.
4. Vidlish does not translate a non-English video, synthesize English audio or present AI-generated English as source speech.
5. Insufficient original English stops before Lesson Engine calls with `VIDEO_LANGUAGE_UNSUPPORTED` and `choose_another_video`.
6. Caption absence is recoverable through other transcript strategies; confirmed non-English/insufficient-English is terminal for MVP.

## Canonical flow

```text
YouTube URL
→ validate metadata/playability
→ create durable job
→ acquire or create original-language transcript
→ deterministic normalization
→ detect language at transcript/segment level
→ evaluate sufficient coherent original English
   → eligible: pass only allowed English segment IDs to Lesson Engine
   → ineligible: VIDEO_LANGUAGE_UNSUPPORTED
→ multi-stage lesson generation
→ deterministic quality gates and bounded repair
→ atomic immutable publish
→ learn / reopen / delete
```

## Initial implementation decisions

- Auth: Supabase six-digit email OTP.
- Private beta: server-managed Postgres `beta_access` allowlist.
- Metadata/playability: YouTube Data API v3 `videos.list`.
- Native captions: Supadata `mode=native`.
- Hosted generated transcript: Supadata `mode=generate`.
- Language detector: `franc-min@6.2.0` behind a port; coherent-window and fail-closed policy.
- Public YouTube URL transcription: `gemini-3.6-flash` behind a feature-gated adapter.
- Browser tab audio: Google Cloud Speech-to-Text V2 `chirp_3`.
- Unofficial extractor: disabled by default and optional pending approval.
- Local/CI: fixtures only; no live provider calls.

## Backlog shape

```text
Epic 1: 3 stories
Epic 2: 13 stories
Epic 3: 7 stories
Epic 4: 3 stories
Epic 5: 3 stories
Total: 29 stories
```

Hard dependency:

```text
Epic 1 → Epic 2 → Epic 3
                    ├─→ Epic 4
                    └─→ Epic 5
```

Epic 5 does not hard-depend on Epic 4.

## Core MVP scope

```text
input eligible English video
→ obtain original-language transcript
→ verify sufficient original English
→ generate grounded Core Lesson
→ learn
→ save / reopen / delete
```

No translation-based lesson mode, AI tutor chat, pronunciation scoring, gamification, payment, classroom management, mobile-native app or public sharing is part of MVP.

## Readiness and tracking evidence

- Canonical backlog: `_bmad-output/planning-artifacts/epics.md`
- Backlog validation: `_bmad-output/planning-artifacts/epics/final-validation.md`
- Readiness PASS: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-08-03-rerun.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Current story: `_bmad-output/implementation-artifacts/1-1-truy-cap-private-beta-va-dang-nhap-an-toan.md`

## Next workflow

Run the Story 1.1 validation workflow. Only after validation passes may `bmad-dev-story` start implementation.