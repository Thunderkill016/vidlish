# Vidlish — English, YouTube and AI adoption ledger

Last reviewed: 2026-08-19

This document records evidence-backed technology choices for the Vidlish MVP. It exists to stop agent-driven stack churn: a new library is not an improvement unless it strengthens the learning loop, provenance, reliability, privacy, or cost per accepted lesson.

## Decision rules

1. Canonical source evidence stays server-owned. A model may name permitted segment IDs; it may not author source quotes.
2. Deterministic analysis runs before or after the model whenever a rule can be checked without AI.
3. Heuristics may guide authoring but may not become CEFR, mastery, or learner-capability claims.
4. Production uses the smallest reliable provider surface. Do not add a framework solely to wrap one provider.
5. Do not add a dependency when a platform standard already solves the problem well enough.
6. Do not hand-edit package-manager integrity data. New packages require an authentic `pnpm`-generated lockfile and full CI.
7. Ordinary CI never spends production/provider quota.

## Adopted now

### English transcript analysis — platform primitives

**Choice:** `Intl.Segmenter` plus deterministic local analysis.

**Why:** Vidlish needs cheap signals such as word/sentence density, lexical diversity, contractions, discourse markers, questions and speech rate before generation. These are authoring hints, not CEFR verdicts. Pulling a large NLP framework only for these features would add bundle/runtime/maintenance cost without improving evidence quality.

**Implementation:** `src/modules/language/application/analyze-english-learning-signals.ts`.

### YouTube metadata — YouTube Data API v3

**Choice:** keep the official `videos.list` API as the canonical metadata source and request only the fields Vidlish validates/persists.

**Why:** official availability/privacy/embeddability/language metadata is more reliable than scraping. The `fields` partial response narrows data collection and response bytes. It does **not** reduce the documented quota unit cost for `videos.list`.

**Implementation:** `src/adapters/youtube/youtube-data-api-provider.ts`.

### YouTube learning playback — IFrame Player API

**Choice:** keep the official IFrame Player API for bounded source playback, caption policy and future support-ladder playback-rate control.

**Why:** it preserves YouTube playback policy and gives Vidlish timestamp cue/load, player errors, caption controls and supported playback rates without downloading or proxying media.

**Important API behavior:** `cueVideoById` / `loadVideoById` reset playback rate to `1`; any slower-playback support must re-apply a supported rate after cue/load and treat the playback-rate event as authoritative.

**Implementation:** `src/app/(protected)/learning-lab/v2/_components/youtube-evidence-player.tsx` plus the pure rate selector in `src/modules/video/domain/select-learning-playback-rate.ts`.

### Transcript acquisition — Supadata native captions

**Choice:** keep the current server adapter for native transcript acquisition and canonical normalization/provenance.

**Why:** the current architecture already separates provider acquisition from transcript normalization, English eligibility, immutable permitted segments and hashes. Swapping to unofficial YouTube internal APIs would weaken datacenter reliability and operational predictability.

### AI generation — Google GenAI SDK + Zod

**Choice:** direct Gemini SDK, structured JSON schema, Zod validation, deterministic post-model quality validation.

**Why:** production currently has a one-provider/one-model policy. A provider abstraction framework adds little while the product is still validating lesson quality. Direct usage also makes token counts, model version, finish reason and failure semantics explicit.

**Implementation:**
- `src/adapters/gemini/gemini-lesson-provider.ts`
- `src/modules/lesson/application/validate-generated-lesson-quality.ts`
- `src/modules/lesson/application/generate-lesson.ts`

The quality gate rejects schema-valid but semantically weak drafts: ungrounded cited vocabulary/phrases/cloze answers, duplicate choices/items, malformed cloze blanks and source-line copies masquerading as new examples.

## Approved next, but dependency/migration gated

### FSRS-6 — `open-spaced-repetition/ts-fsrs`

**Repository:** `open-spaced-repetition/ts-fsrs`

**Status:** approved direction; not yet integrated.

**Why:** delayed review still uses the validation-slice `+1 day / +3 days` scheduler. The official TypeScript FSRS implementation is the correct replacement rather than maintaining a home-grown approximation.

**Integration boundary:**
- authentic `pnpm` lockfile;
- database fields for FSRS card state (not just `next_review_at`);
- deterministic mapping from persisted review evidence to rating;
- server-authoritative scheduling;
- fake/Supabase parity;
- backfill/default state for existing items;
- pgTAP + unit + durable second-session tests;
- scheduler state must never be presented as mastery.

### TUBELEX English frequency data

**Repository:** `naist-nlp/tubelex`

**Status:** promising, defer until data packaging + attribution are designed.

**Why:** frequency and dispersion derived from YouTube subtitles match Vidlish's listening domain better than generic written-word lists and could improve vocabulary selection/usefulness ranking.

**Integration boundary:**
- vendor only a compact, versioned derived artifact needed by Vidlish;
- preserve BSD-3-Clause attribution and source/version metadata;
- keep frequency as an authoring signal, not a CEFR/mastery claim;
- measure whether it improves accepted-lesson quality before making it required runtime data.

## Rejected as production defaults for the MVP

### Unofficial YouTube / Innertube scraping libraries

**Decision:** do not make them the default metadata/transcript path.

**Reason:** internal YouTube endpoints are not the product contract and commonly have datacenter/IP/anti-bot reliability problems. They may be useful as research tools, not as a canonical production dependency while official metadata + the current transcript provider meet the MVP need.

### General-purpose NLP frameworks just for token/sentence counts

**Decision:** no dependency today.

**Reason:** platform primitives and small deterministic code already provide the signals currently used. Add morphology/POS/phoneme tooling only when a validated learning feature needs it.

### Vercel AI SDK as a wrapper around the current Gemini-only runtime

**Decision:** not needed today.

**Reason:** the product intentionally has one production provider/model during validation. The direct SDK already supports structured output and usage metadata. Reconsider only if provider benchmarking/multi-provider routing becomes an accepted product requirement after the model benchmark gate.

### Automatic CEFR classifiers as truth

**Decision:** never use a heuristic/library output as capability evidence.

**Reason:** text difficulty, learner ability and demonstrated delayed transfer are different things. External level estimates may become hints after validation, but they cannot replace learner evidence.

## Dependency updates already validated separately

Dependabot PR #50 carries package-manager-generated lockfile updates for the current production stack, including Google GenAI, Supabase, Next.js, `tailwind-merge` and Vercel Workflow. Keep dependency modernization separate from learning-behavior changes, then run integration CI after both land.

## Revisit triggers

Re-open a rejected/deferred choice only when at least one of these becomes true:

- a measured learner problem cannot be solved with the current platform primitives;
- provider reliability/cost data justifies an alternative;
- model benchmark evidence requires a provider abstraction;
- pronunciation/audio becomes an explicitly validated product slice with a privacy model;
- TUBELEX or another corpus measurably improves accepted lesson quality;
- FSRS migration has a complete persisted-state and test strategy.
