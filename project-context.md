# Vidlish Project Context

## Current stage

- PRD: final.
- Lesson Engine SPEC: final.
- UX: final.
- Architecture: final.
- Product code: not started.
- Next workflow: `bmad-create-epics-and-stories` after all downstream artifacts apply the language eligibility invariant below.

## Product promise

Vidlish turns a public, playable **English-language YouTube video** into a personalized English lesson for Vietnamese learners.

Canonical tagline:

> **Any English video. Your English lesson.**

## Non-negotiable language eligibility invariant

A video is eligible only when its original spoken content contains enough reliable English to build a grounded Core Lesson from the video itself.

Rules:

1. The primary spoken language must be English, or the video must contain a coherent English portion large enough to support a valid lesson.
2. Incidental non-English speech is allowed, but it is context only and cannot be used as English source evidence.
3. Source quotes, listening tasks, grammar noticing, vocabulary mining and pronunciation/listening evidence must come from actual English speech in the source video.
4. Vidlish must not translate a non-English video, synthesize a new English audio track or present AI-generated English as speech from the source video.
5. When reliable English content is insufficient, generation stops before Lesson Engine calls and returns `VIDEO_LANGUAGE_UNSUPPORTED` with the action `choose_another_video`.
6. Caption absence is not a terminal error; the system may use audio-to-text to recover the original English speech. Confirmed non-English source language is a terminal eligibility result for MVP.

## Eligibility flow

```text
YouTube URL
→ acquire or create transcript
→ detect language at transcript and segment level
→ evaluate sufficient original English content
   → eligible: continue to Lesson Engine
   → ineligible: stop with VIDEO_LANGUAGE_UNSUPPORTED
```

The exact numeric threshold is architecture/config seed, but it must consider both English share and absolute coherent English duration. It cannot accept a video merely because a few isolated English words appear.

## Core scope

```text
input English video
→ obtain original English transcript
→ generate grounded Core Lesson
→ learn
→ save / reopen / delete
```

No translation-based lesson mode is part of MVP.