# Language Eligibility Contract

## Purpose

The Lesson Engine consumes only source material containing enough original English speech to produce a grounded English lesson. This contract is evaluated before Video Analyst, Language Miner or any other lesson-generation stage.

## Eligibility result

```ts
type LanguageEligibilityResult =
  | {
      status: "eligible";
      primary_language: "en";
      english_segment_ids: string[];
      excluded_non_english_segment_ids: string[];
      evidence: {
        english_share: number;
        coherent_english_duration_ms: number;
        reliable_english_word_count: number;
        confidence?: number;
      };
    }
  | {
      status: "ineligible";
      reason: "insufficient-original-english" | "language-confidence-too-low";
      detected_languages: string[];
    };
```

## Required rules

1. Detect language per transcript segment after normalization.
2. The primary source for lesson mining, source quotes, listening tasks, grammar noticing and scored evidence is actual English speech from the video.
3. Non-English segments are excluded from English language mining and scored evidence.
4. Mixed-language videos are eligible only when their English segments form enough coherent material for a valid Core Lesson.
5. Isolated English words, brand names, proper nouns or short code-switched phrases do not satisfy eligibility.
6. When eligibility fails, return `VIDEO_LANGUAGE_UNSUPPORTED` and stop before any Lesson Engine model calls.
7. No translation, English rewriting, synthetic English audio or generated English track may substitute for missing original English in MVP.

## Integration with existing Lesson schema

`SourceRef.source_language` remains `"en"` because the lesson source is the eligible English segment set, not a translated representation of non-English speech.

For a mixed-language source:

- `Transcript` may preserve all source segments for context and traceability.
- `Lesson.source` references the filtered eligible English segment set.
- every `source_quote`, language item and scored listening activity must reference an English segment ID.
- content questions that depend on non-English segments are not generated in MVP.

## Quality gates

A Lesson must fail before publish when:

- any source quote points to a non-English segment;
- any grammar/listening activity is grounded in translated or generated English;
- eligibility evidence is missing;
- the English segment set is too small to satisfy activity validity and lesson progression without inventing content.

## Testing fixtures

Minimum fixtures:

1. Fully English video with manual captions — eligible.
2. Fully English video with STT transcript — eligible.
3. Primarily English video with incidental non-English speech — eligible, non-English excluded.
4. Mixed-language video with a coherent English chapter — eligible only for that chapter/segment set.
5. Primarily non-English video with isolated English phrases — ineligible.
6. Fully non-English video — ineligible.
7. Low-confidence STT where language cannot be trusted — request better transcript/capture or fail safely.