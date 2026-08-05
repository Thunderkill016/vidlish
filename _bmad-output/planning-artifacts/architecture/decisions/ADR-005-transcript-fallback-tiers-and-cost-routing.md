---
id: ADR-005
title: Transcript fallback tiers and cost-aware routing
status: proposed
date: 2026-08-05
supersedes: none
relates_to:
  - ADR-004-transcript-orchestration-and-terminal-outcomes.md
  - ../architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md (ID-4 to ID-9)
  - ../../research/technical-all-transcript-acquisition-strategies-2026-08-03.md
  - ../../ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md (Transcript fallback hierarchy)
  - ../../repo-analysis-2026-08-05.md (section 6)
  - PR #7 (story/2-4-hosted-generated-transcript, unmerged)
---

# ADR-005 — Transcript fallback tiers and cost-aware routing

## Status

**Proposed.** ADR-004 D1 (orchestrator) is a prerequisite for D1 here.

## Context

The transcript research concluded that no single API covers every video and recommended a waterfall
(`technical-all-transcript-acquisition-strategies-2026-08-03.md`, section 1). The UX spine assumes
the same shape and adds learner-facing rules: try server-side strategies automatically, ask the
learner only when consent or input is required, show exactly one recommended action
(`EXPERIENCE.md:115-121`).

`IMPLEMENTATION-DECISIONS.md` picked adapters for the tiers (ID-4 native, ID-5 hosted generate, ID-7
Gemini, ID-8 tab audio, ID-9 unofficial extractor, disabled) but did not fix an order, a cost
boundary, or the conditions for skipping a tier. The backlog order (2.4 → 2.5 → 2.6 → 2.7 → 2.8) is a
story sequence, not a routing decision, and it does not reflect cost or coverage.

PR #7 implements the first two tiers and a first cost guard:

```text
TRANSCRIPT_GENERATED_MAX_VIDEO_DURATION_MS=3600000   # 60 minutes
SUPADATA_GENERATED_TIMEOUT_MS=10000
SUPADATA_GENERATED_POLL_INTERVAL_MS=2000
SUPADATA_GENERATED_MAX_POLLS=30                      # 60 s of polling
```

`HostedGeneratedTranscriptPolicy.evaluate` refuses when the strategy is disabled, when
`job.durationMs` is unknown, or when duration exceeds the cap.

Two problems are visible in those numbers, and one in the contracts.

**The poll budget and the duration cap disagree.** The cap admits a 60-minute video; the poll budget
gives that video 60 seconds to finish generating. Hosted generation of an hour of audio will not
complete in a minute, so long videos are routed into a metered provider call and then almost always
abandoned by `recordTimeout`. Vidlish pays and the learner waits, for nothing. Neither value is
obviously wrong on its own; together they are incoherent.

**Unknown duration blocks the metered tier.** `parseYouTubeDuration` returns `undefined` for live
streams and premieres, so those videos are refused with `VIDEO_DURATION_UNKNOWN`. Failing closed on
cost is right. Today it fails into the hang described in ADR-004 rather than into an action.

**Provider is still closed.** `transcriptProviderSchema` is `z.literal("supadata")`, the pre-existing
`check (provider = 'supadata')` constraints on `transcripts` and `transcript_acquisition_attempts`
survive, and #7 adds the same constraint to the new `transcript_provider_jobs` table. Both current
strategies are Supadata so nothing breaks yet. Story 2.6 (Gemini) and Story 2.8 (Google Cloud STT)
are not Supadata.

## Decision

### D1 — Four tiers, in this order

| Tier | Strategy | Cost band | Learner action | Status |
|---|---|---|---|---|
| 0 | `supadata-native-caption` | `none` | none | shipped |
| 1 | `supadata-generated-transcript` | metered | none | PR #7 |
| 2 | user-provided transcript / SRT / VTT (Story 2.7) | `none` | paste or upload | **pull forward** |
| 3 | terminal `TRANSCRIPT_UNAVAILABLE` (ADR-004 D2) | — | choose another video | with ADR-004 |

**Story 2.7 moves ahead of Story 2.6.** It costs nothing per use, covers any video for a learner
willing to paste, carries the lowest legal and vendor risk, and turns the terminal state from a dead
end into a recovery path. Gemini public-URL transcription (ID-7) is a provider-preview capability of
unknown coverage; it should be measured against tier 1's real numbers before being built, not
assumed to sit above a free option.

Deferred beyond private beta: tab-audio capture (2.8) and, unless legal approval arrives, the
unofficial extractor (2.5, disabled by default per ID-9).

Explicitly rejected for MVP: a second caption-only vendor. It duplicates tier 0's coverage and only
hedges vendor outage. Server-side audio download plus STT is also rejected; the research ranks it
highest-risk and recommends against it as a production default.

### D2 — Cost-aware routing is a property of the tier, not of the workflow

Each strategy declares a `costBand` (already in PR #7) and a policy that can refuse a job before any
provider call. The orchestrator (ADR-004 D1) skips refused tiers and moves on; a refusal is not a
failure and does not consume a retry.

Routing inputs for private beta are deliberately few: `durationMs`, the strategy's own enablement,
and whether the strategy has already been attempted for this job. Per-account cost accounting stays
in Story 2.10.

### D3 — The metered tier's duration cap and poll budget must be derived from one number

Pick the maximum wall-clock time Vidlish will spend generating a transcript, then derive both:

```text
generated_poll_budget_ms = SUPADATA_GENERATED_MAX_POLLS × SUPADATA_GENERATED_POLL_INTERVAL_MS
TRANSCRIPT_GENERATED_MAX_VIDEO_DURATION_MS ≤ generated_poll_budget_ms × observed_realtime_factor
```

`observed_realtime_factor` must be measured against the real provider, not guessed. Until it is
measured, the two settings must not imply capacity the pipeline does not have. The safe interim move
is to lower the duration cap rather than raise the poll budget, because a long poll budget also
holds an active-quota slot.

This ADR does not fix the numbers. It fixes the rule that they are derived together and that the
derivation is recorded.

### D4 — Provider becomes an open enum before any non-Supadata strategy

`transcriptProviderSchema` becomes a Zod enum and the three `check (provider = 'supadata')`
constraints become `check (provider in (...))`. This is a prerequisite for Story 2.6 and Story 2.8,
not part of them, for the same reason ADR-004 D0 records: widening identity while adding a strategy
is what made PR #7 a 33-file change.

### D5 — Tier changes never weaken the language invariant

Every tier produces a `TranscriptCandidate` that goes through the same Zod validation, deterministic
normalization, atomic canonical persistence and the original-English gate. No strategy may declare a
source English, and no strategy may return translated or generated-English text as source speech.
This restates existing rules so that adding a tier cannot be read as an exemption.

## Consequences

**Positive**

- A learner whose video has no captions has a free, immediate path to a lesson instead of a dead end.
- Cost per attempted job is bounded before the call, not after.
- Adding a provider stops requiring identity migrations.

**Negative**

- Story 2.7 needs UI work (paste, upload, parse errors, timing caveats) that Story 2.6 would not.
- Pulling 2.7 forward reorders the sprint backlog and requires updating `epics.md` and
  `sprint-status.yaml`.
- D3 may require lowering the duration cap, which reduces coverage until the realtime factor is
  measured.

**Cost note.** Tier 0 and tier 2 are effectively free; tier 1 is the only metered step in private
beta. Cost per successful lesson is therefore dominated by Epic 3, not by transcripts. That
proportion should be re-checked once ADR-001 fixes a lesson-generation budget.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep backlog order, build 2.6 before 2.7 | Puts a preview-risk metered provider ahead of a free path that covers every video. |
| Add a second caption vendor at tier 1 | Duplicates tier 0 coverage; hedges only vendor outage, which is not the observed failure. |
| Server-side audio download plus STT | Highest legal and operational risk in the research matrix; recommended against as a production default. |
| Raise the poll budget to match the 60-minute cap | Holds an active-quota slot for the whole wait and hides the real question, which is the unmeasured realtime factor. |
| Route by `captionAvailable` from YouTube metadata | Useful as a pre-flight UX hint, but it is a provider claim about caption existence, not about usability, and must not gate a tier. |

## Compliance and verification

- **Unit:** orchestrator skips a tier refused by policy without consuming a retry and without
  recording a failure attempt.
- **Unit:** duration cap and unknown-duration refusals produce the documented reasons.
- **Contract test:** every registered strategy declares a `costBand`, and no strategy sets a
  transcript-level language claim.
- **Staging:** measure `observed_realtime_factor` for hosted generation across at least five videos
  spanning short, medium and long, then set the two settings in D3 from that measurement and record
  it in this ADR.
- **Staging:** confirm whether Supadata `mode=native` can return a YouTube auto-translated track. If
  it can, tier 0 needs a translated-track guard before private beta, since
  `translationStatus` is currently always `unknown` in production.

## Open questions

1. What is the real `observed_realtime_factor` for Supadata `mode=generate`? Blocks D3.
2. Does `mode=native` ever return an auto-translated caption track? Blocks a tier 0 guard and bears
   on the core product invariant.
3. Should tier 2 be offered proactively when tier 1 is refused for duration, rather than only after
   tier 1 fails? Offering earlier saves a metered call on long videos.
4. Is Story 2.6 worth building at all for private beta if tier 2 lands first and measures well?
