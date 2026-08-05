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
- Epic 1: `done` — Stories 1.1, 1.2 and 1.3 merged.
- Epic 2: `in-progress` — Stories 2.1, 2.2 and 2.3 merged; Stories 2.4–2.13 remain `backlog`.
- Epics 3, 4 and 5: `backlog`. No Lesson Engine code exists yet.
- Product code: authenticated private-beta shell, URL/metadata validation, CEFR draft, durable
  generation job, native-caption canonical transcript and the original-English eligibility gate.

### What "done" currently means

Every merged story passed CI, and CI runs entirely on fixtures and fakes
(`.github/workflows/ci.yml`). No provider-backed story has been exercised against a live provider.
Supabase Auth, YouTube Data API v3, Supadata and Inngest Cloud have **no staging evidence** recorded
in any artifact. `franc-min` language analysis and the SQL layer (pgTAP against real Postgres) are
the only parts verified outside fixtures. Treat merged stories as CI-complete, not production-proven.

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
- Last completed story: `_bmad-output/implementation-artifacts/2-3-kiem-tra-video-co-du-tieng-anh-goc.md`
- Repository analysis: `_bmad-output/planning-artifacts/repo-analysis-2026-08-05.md` (advisory)

## Next workflow

The canonical backlog order puts **Story 2.4** (hosted generated-transcript fallback) next.

The 2026-08-05 repository analysis recommends inserting a new story **before** 2.4: a transcript
strategy registry plus terminal/recoverable outcomes. The reason is a defect, not a preference —
no code path writes `status = 'failed'` for a transcript failure, so a video without usable captions
leaves its job in `acquiring_transcript` indefinitely while the progress page polls forever. Story
2.4 adds a second strategy to a workflow that still cannot end, and Story 2.4 AC1 already assumes an
"automatic registry" that does not exist. See section 13 of the analysis for scope and acceptance
criteria.

That insertion is a **recommendation pending decision**; `epics.md` and `sprint-status.yaml` remain
the canonical backlog until it is accepted. Once the next story is chosen, run
`bmad-create-story`, then the validation workflow, and only then `bmad-dev-story`.
