# UX Amendment — English-Language Eligibility

**Status:** final  
**Date:** 2026-08-03  
**Authority:** This amendment binds `EXPERIENCE.md` and overrides any UX interpretation that every playable video can proceed to Lesson generation.

## Create Lesson copy

The Create surface must state the input boundary near the URL field:

> Dán một video YouTube chủ yếu nói tiếng Anh.

Supporting copy:

> Video không cần có sẵn phụ đề; Vidlish có thể tạo transcript từ audio. Video không có đủ lời nói tiếng Anh sẽ không thể tạo bài học.

## Generation phase

Add a user-facing phase after transcript acquisition:

```text
Đang kiểm tra ngôn ngữ video
```

User-facing stepper may group it under `Lấy hoặc tạo transcript`, but the active status message must explain when language eligibility is being checked.

## Unsupported language state

When the source lacks enough reliable original English:

**Title**

> Video này không phù hợp để tạo bài học tiếng Anh

**Body**

> Vidlish không tìm thấy đủ lời nói tiếng Anh trong video để tạo bài học bám sát nội dung gốc. Hãy chọn một video chủ yếu nói tiếng Anh.

**Primary action**

> Chọn video khác

**Secondary information**

- Không recommend tab-audio capture again when language is confidently non-English.
- Do not offer translation, dubbing or synthetic English alternatives.
- Preserve the failed job in Library only when useful for beta diagnostics; otherwise return to Create with the URL retained.

## Mixed-language behavior

Do not expose a mode selector. If the system accepts a mixed-language video because it contains a substantial coherent English section:

- Lesson scope must clearly name the chapter/portion being taught.
- Evidence links only target English source segments.
- Do not imply the entire multilingual video was converted into a lesson.

## State-pattern amendment

Add:

| State | Surface | Treatment |
|---|---|---|
| Unsupported source language | Generation | Stop before Lesson Engine. Explain that the video lacks enough original English and provide only `Chọn video khác`. |
| Language confidence uncertain | Generation | When the source is likely English but transcript quality is too low, offer a better audio/transcript acquisition path; do not classify as non-English prematurely. |

## Accessibility

- Error announcement uses `role="alert"` or an equivalent accessible status mechanism.
- The primary action receives normal document focus order; focus is not trapped on the error.
- The explanation must not rely on a language-code badge alone.

## Anti-patterns

- “Vidlish will translate this video into an English lesson.”
- “AI-generated English audio” as a replacement for the source.
- Repeatedly asking for audio permission after confidently detecting a non-English source.
- Showing provider language-detection internals or confidence percentages without plain-language explanation.