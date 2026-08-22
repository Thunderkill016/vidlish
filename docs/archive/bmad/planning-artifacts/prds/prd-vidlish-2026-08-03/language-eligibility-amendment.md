# PRD Amendment — English-Language Video Eligibility

**Status:** final  
**Date:** 2026-08-03  
**Authority:** This amendment overrides any PRD wording that implies every public/playable YouTube video is eligible regardless of spoken language.

## Product boundary

Vidlish creates English lessons **from original English speech in the source video**.

A public/playable video is not automatically eligible. It must contain enough reliable, coherent English speech to support the Lesson Engine requirements and quality gates.

## Amended product promise

> Paste a public, playable English-language YouTube video, choose your level and receive a grounded Core Lesson built from the English actually spoken in that video.

Caption absence is not terminal because Vidlish may transcribe the original audio. A confidently non-English source is terminal for MVP.

## Functional requirements

### FR-LANG-1 — Detect source language

After transcript acquisition and normalization, the system detects language at both transcript and segment level before any Lesson Engine generation stage.

### FR-LANG-2 — Require sufficient original English

The system continues only when the video contains enough reliable and coherent original English speech to satisfy Core Lesson grounding, listening and activity requirements.

Eligibility considers:

- dominant/primary spoken language;
- absolute amount of coherent English speech;
- transcript/STT confidence;
- whether English segments are substantial enough for source quotes, language mining and scored activities.

A few isolated English words, names or short phrases do not make a non-English video eligible.

### FR-LANG-3 — Mixed-language video behavior

A mixed-language video may be accepted only when its English portions independently contain enough material for a valid lesson. Non-English portions may provide context but cannot be treated as English source evidence.

### FR-LANG-4 — Reject unsupported source language

When there is insufficient original English speech, the job stops before expensive Lesson Engine calls and returns:

```text
VIDEO_LANGUAGE_UNSUPPORTED
```

User action:

```text
choose_another_video
```

Preferred message:

> Video này không có đủ nội dung tiếng Anh để tạo bài học. Hãy chọn một video chủ yếu nói tiếng Anh.

### FR-LANG-5 — No translation-based substitute

MVP must not:

- translate a non-English transcript and call it source English;
- synthesize an English audio replacement;
- create listening, grammar or pronunciation evidence from generated English;
- label translated/generated text as a source quote from the video.

## Updated acceptance criteria

Private beta readiness additionally requires:

1. Language detection works for caption, auto-caption, STT, uploaded and pasted transcript sources.
2. Fully non-English videos fail before Lesson Engine/provider generation costs.
3. English videos without captions remain eligible through audio-to-text fallback.
4. Mixed-language fixtures demonstrate both an eligible case with substantial English and an ineligible case with incidental English only.
5. No published Lesson contains English source evidence derived by translation.

## Updated success metric

Acquisition coverage is measured only against **eligible English-language videos**, not all public/playable videos.