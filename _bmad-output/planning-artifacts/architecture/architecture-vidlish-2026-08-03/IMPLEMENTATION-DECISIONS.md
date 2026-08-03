# Implementation Decisions — Vidlish MVP

**Status:** final, normative  
**Date:** 2026-08-03  
**Authority:** This companion selects the initial adapters and operational defaults required to implement the existing architecture. It does not replace domain ports, PRD requirements, or the Original-English Eligibility Gate.

## Decision precedence

1. PRD and PRD language-eligibility amendment define product behavior.
2. Architecture spine and language-eligibility amendment define invariants and boundaries.
3. This file selects initial implementations behind those boundaries and resolves implementation-level contract extensions.
4. Provider behavior never overrides canonical validation, normalization, ownership, privacy, or fail-closed rules.

## ID-1 — Authentication

- Initial mode: Supabase email OTP with a six-digit code.
- Magic-link sign-in is not part of MVP.
- `signInWithOtp` must use `shouldCreateUser: false` unless the email has already passed the private-beta admission path.
- OTP verification creates the cookie-based Supabase SSR session.
- Authentication responses remain neutral and do not reveal whether an account or allowlist entry exists.

## ID-2 — Private-beta admission

- Initial mechanism: Postgres table `beta_access` keyed by normalized email.
- `beta_access` is not owner-scoped end-user data; browser clients cannot insert, update, or delete rows.
- Administration occurs through reviewed SQL migration or an explicit service-role-only admin command outside the learner UI.
- Protected application access requires both a valid Supabase session and an active allowlist entry.
- Story 1.1 account menu contains sign-out only. Quota and retention details appear only after their owning stories exist.

## ID-3 — Video metadata and playability

- Initial adapter: YouTube Data API v3 `videos.list`.
- Requested parts: `snippet`, `contentDetails`, and `status`.
- Canonical mapping uses title/channel/thumbnail, ISO-8601 duration, caption indicator, privacy status, upload status, `status.embeddable`, and region restriction.
- Missing resource maps to not found; private/restricted/non-embeddable/region-blocked states map to stable product errors.
- YouTube response objects remain inside the adapter.
- Local and CI use fixtures.

## ID-4 — Caption fast path

- Initial adapter ID: `supadata-native-caption`.
- Supadata transcript request uses `mode=native` and timestamped output (`text=false`).
- The adapter does not request translation and does not force `lang=en`.
- Available manual/auto source metadata is retained when the provider exposes it; otherwise confidence/source uncertainty remains explicit.
- Empty or unavailable native transcript returns `not_applicable`, not unsupported language.

## ID-5 — Hosted generated-transcript fallback

- Initial adapter ID: `supadata-generated-transcript`.
- Supadata request uses `mode=generate`; generated text must remain in the spoken source language.
- HTTP 202 provider jobs are polled through a durable workflow step.
- Results always pass adapter validation, deterministic normalization, canonical persistence, and language eligibility.
- The adapter is disabled when `SUPADATA_API_KEY` is absent.

## ID-6 — Language analysis

- Initial adapter: `FrancLanguageAnalysisAdapter` using exact package `franc-min@6.2.0`.
- Detection runs on coherent windows and segment groups, not isolated one-word fragments.
- `eng` maps to canonical `en`; ambiguous/short/unsupported results map to `und` or low reliability.
- Franc distance/ranking is not treated as calibrated probability.
- Eligibility combines detector output with English share, coherent duration, reliable word count, transcript quality, and evidence usability.
- Uncertain cases fail closed or request a better transcript; they are never silently accepted as English.

## ID-7 — Gemini public-URL transcription

- Initial exact model ID: `gemini-3.6-flash`.
- Adapter ID: `gemini-public-youtube-transcription`.
- Only public YouTube URLs already validated by the metadata boundary are passed to Gemini.
- Prompt and schema request verbatim original-language transcription with timestamps when supportable.
- Translation, summary, rewrite, grammar correction, synthetic English, and invented timestamps are forbidden.
- Adapter is disabled when `GEMINI_API_KEY` is absent.
- The YouTube-URL input capability is treated as provider-preview risk behind the port and feature flag.

## ID-8 — Browser tab-audio STT

- Initial provider: Google Cloud Speech-to-Text API V2.
- Exact model ID: `chirp_3`.
- Initial region: `asia-southeast1`, subject to deployment-region validation before staging.
- Audio is uploaded as private bounded chunks; recognition uses bounded requests and original-language transcription.
- Auto language detection may assist transcription, but Story 2.3 remains the only product eligibility authority.
- Provider confidence values that are not calibrated must not be presented as exact accuracy.
- Adapter is disabled when required Google Cloud credentials/configuration are absent.

## ID-9 — Unofficial extractor

- Disabled by default in every environment.
- Story implementation remains optional and blocked until explicit legal/policy approval and an exact package/service decision.
- It is never required for Story 2, private-beta acceptance, or the original-English product promise because approved hosted, Gemini, user-input, and tab-audio paths exist.

## ID-10 — Environment and credential behavior

- Local and CI use fixture adapters and do not require external provider credentials.
- Staging enables only adapters whose credentials and policy flags exist.
- A provider-dependent story cannot be marked end-to-end complete in staging until its selected credential is configured; its contract and fixture tests may still be completed earlier.
- Production/preview/local secrets and datasets remain isolated.
- No production secret is required to scaffold or complete Story 1.1.

## ID-11 — Pull-request CI floor

The first application story creates a GitHub Actions pull-request workflow running:

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Provider tests use fixtures/fakes. Preview deployment and repository branch-protection configuration are separate operational settings and are not falsely claimed by Story 1.1.

## ID-12 — Canonical lifecycle and ProductError actions

The Architecture Language Eligibility Amendment owns the canonical job lifecycle. Implementations must include `checking_language` after `normalizing_transcript` and before `analyzing_video`, regardless of the stale list in the original spine.

The canonical safe action union is extended to:

```ts
type ProductErrorAction =
  | "retry"
  | "capture_audio"
  | "provide_transcript"
  | "choose_another_video"
  | "create_new_job"
  | "contact_support";
```

Rules:

- `VIDEO_LANGUAGE_UNSUPPORTED` always uses `choose_another_video` and `retryable: false`.
- Caption absence/provider exhaustion must not use `choose_another_video` as a language conclusion unless the user simply elects to abandon the job.
- Incompatible stale job/pipeline may use `create_new_job`.
- UI still exposes at most one primary action for each state.
- Database enum, domain schema, workflow event and UI mapping use the same versioned contract.

## Official implementation references

- Supabase Auth: passwordless email OTP.
- YouTube Data API v3: video resource and `videos.list`.
- Supadata Transcript API: `native`, `generate`, and asynchronous job behavior.
- Gemini API: `gemini-3.6-flash` and public YouTube URL video input.
- Google Cloud Speech-to-Text V2: `chirp_3`.
- npm `franc-min`: version 6.2.0.

Exact external versions are rechecked during Story Creation and locked in `pnpm-lock.yaml` or typed environment configuration.