# Architecture Amendment — Original-English Eligibility Gate

**Status:** final  
**Date:** 2026-08-03  
**Authority:** This companion overrides conflicting language-related snippets in `ARCHITECTURE-SPINE.md`. All other architecture decisions remain unchanged.

**Supersedes:** an earlier draft of this amendment that lived alongside it as
`language-eligibility-amendment.md` (added in `08f5ffd`, removed 2026-08-05). That draft is
superseded in full and must not be reintroduced. Two of its claims are wrong and were already
rejected by the readiness process:

- It defined a decision ID `AD-22`. The spine defines **AD-1 through AD-21 only**; `AD-22` does not
  exist. See `implementation-readiness-report-2026-08-03.md:413` and the resolution in
  `implementation-readiness-report-2026-08-03-rerun.md:216`. Cite this amendment plus AR12/AR13, never `AD-22`.
- It named the persisted stage `validating_language`. The canonical stage is **`checking_language`**,
  as implemented in `src/shared/contracts/generation.ts` and the `lesson_job_status` enum.

`.memlog.md` still records both of those as decisions taken on 2026-08-03. That is correct as
history and is deliberately left unedited; this file, not the memlog, is the current contract.

## Reason

The canonical architecture spine predates the final English-language eligibility requirement. It contains two stale representations:

1. The canonical job-state list omits `checking_language`.
2. `CanonicalTranscript` declares `language: "en"` before segment-level detection and eligibility evaluation.

Those representations must not be implemented.

## Amended workflow order

The durable generation workflow is:

```text
queued
→ validating_video
→ acquiring_transcript
→ awaiting_user_input (only when input/permission is needed)
→ normalizing_transcript
→ checking_language
→ analyzing_video
→ mining_language
→ planning_lesson
→ composing_activities
→ validating_lesson
→ repairing_lesson (bounded, when allowed)
→ publishing
→ completed
```

Terminal states remain:

```text
failed
cancelled
```

`checking_language` is mandatory after every transcript source and before every Lesson Engine/model generation stage.

## Amended canonical transcript contract

A canonical transcript preserves the original normalized speech without assuming it is English:

```ts
type CanonicalTranscript = {
  id: string;
  ownerUserId: string;
  videoId: string;
  sourceType:
    | "manual-caption"
    | "auto-caption"
    | "gemini-url-stt"
    | "cloud-stt"
    | "tab-audio-stt"
    | "uploaded"
    | "pasted";
  sourceProvider: string;
  declaredLanguage?: string;
  normalizedHash: string;
  normalizationVersion: string;
  confidence?: number;
  segments: Array<{
    id: string;
    position: number;
    startMs: number;
    endMs?: number;
    text: string;
    confidence?: number;
    detectedLanguage?: string;
  }>;
};
```

No transcript-level `language: "en"` claim is allowed before the eligibility gate.

## Language analysis ports and policy

Add these provider-neutral contracts:

```text
LanguageAnalysisPort
LanguageEligibilityEvaluator
LanguageEligibilityRepository
```

The evaluator consumes the canonical transcript and versioned segment-language results. It returns the contract defined by `spec-vidlish-lesson-engine/language-eligibility.md`.

Eligibility must consider at least:

- English share;
- absolute coherent English duration;
- reliable English word count;
- transcript and detector confidence;
- whether the allowed English set can support grounded quotes, listening and scored activities.

Thresholds are typed, environment-configured and policy-versioned.

## Eligible source boundary

Only `englishSegmentIds` from an `eligible` report may be passed to Video Analyst, Language Miner, Lesson Planner, activity composition or scored evidence validators.

For mixed-language videos:

- the canonical transcript may preserve all original-language segments;
- non-English segments remain available for traceability/context;
- non-English segments cannot support English source quotes, grammar evidence, listening questions or scored activity evidence.

## Terminal unsupported-language behavior

When the evaluator returns insufficient original English, the workflow stops before Lesson Engine generation and persists:

```text
code: VIDEO_LANGUAGE_UNSUPPORTED
action: choose_another_video
retryable: false
```

Preferred learner copy:

> Video này không có đủ nội dung tiếng Anh để tạo bài học. Hãy chọn một video chủ yếu nói tiếng Anh.

Caption absence, provider exhaustion and low-quality acquisition are not themselves proof that the source language is unsupported.

## No translation substitute

The architecture must not introduce a path that:

- translates non-English speech and labels it source English;
- generates an English rewrite and treats it as transcript evidence;
- creates synthetic English audio as a replacement source;
- grounds listening, grammar or pronunciation tasks in generated/translated English.

## Updated workflow diagram

```text
Acquire source transcript
→ Normalize original speech
→ Detect language per segment
→ Evaluate coherent original-English eligibility
→ eligible: pass only allowed English segment IDs to Lesson Engine
→ ineligible: stop with VIDEO_LANGUAGE_UNSUPPORTED
```

## Testing requirements

Architecture compliance requires fixtures for fully English, primarily English with incidental non-English, coherent mixed-language English chapter, incidental-English-only, fully non-English, translated-caption and low-confidence transcript cases.

CI must prove no Lesson Engine fixture is called before eligibility passes.