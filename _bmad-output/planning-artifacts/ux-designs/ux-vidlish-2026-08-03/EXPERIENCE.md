---
name: Vidlish
status: final
updated: 2026-08-03
sources:
  - ../../prds/prd-vidlish-2026-08-03/prd.md
  - ../../../specs/spec-vidlish-lesson-engine/SPEC.md
  - ../../research/technical-all-transcript-acquisition-strategies-2026-08-03.md
  - ../../research/domain-youtube-lesson-content-design-2026-08-03.md
design: DESIGN.md
---

# Vidlish — Experience Spine

## Foundation

Vidlish is a responsive web application, desktop-first for creating and studying lessons but fully usable on modern mobile browsers. UI foundation: Next.js + Tailwind + shadcn/ui, subject to Architecture confirmation. `DESIGN.md` owns visual identity; this document owns information architecture, states, behavior, interaction and accessibility.

Product UX principles:

1. **One job at a time.** Create, learn and manage are separate surfaces.
2. **Progressive support.** Learners first attempt gist/recall before revealing all help.
3. **Evidence nearby.** Claims, quotes and answers expose the video timestamp that supports them.
4. **Fallback without blame.** Missing captions trigger another strategy, not a dead end or technical error dump.
5. **Quality before speed.** Generation states explain that the lesson is being checked, not merely generated.
6. **No forced completeness.** Lessons can be shorter when the video contains fewer valuable teaching moments.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Sign in | Signed-out route guard | Minimal passwordless authentication for ownership and quota |
| Create Lesson | App open / primary nav | Paste URL, choose CEFR, inspect video and start generation |
| Generation | Create submission / job URL | Persisted progress, fallback decisions, retry and completion redirect |
| Tab Audio Capture | Generation fallback | Ask permission, guide user to select the correct YouTube tab with audio and show capture/transcription progress |
| Transcript Input | Generation fallback | Paste or upload subtitle/transcript; upload owned media only when permitted |
| Lesson Viewer | Generation complete / Library | Study Core Lesson with video, evidence, activities and completion |
| Library | Primary nav | Open, inspect status and delete saved lessons |
| Account/Private Beta Info | Avatar menu | Sign out, quota summary, privacy/retention explanation and beta feedback link |

Primary navigation has only:

- **Tạo bài học**
- **Thư viện**
- Account menu

No dashboard, marketplace, community, streak or settings hierarchy in MVP.

Desktop shell: slim top bar, content centered inside the application width. Lesson Viewer may use a split layout; other surfaces are single-column. Mobile uses the same top bar with compact nav.

## Voice and Tone

Microcopy is calm, specific and action-oriented. Avoid anthropomorphizing AI.

| Situation | Preferred copy | Avoid |
|---|---|---|
| Empty create | “Dán video bạn muốn học.” | “Hãy để AI biến mọi thứ thành phép màu!” |
| Caption missing | “Video này không có phụ đề dùng được. Vidlish có thể nghe audio của tab để tạo transcript.” | “Transcript unavailable. Error 404.” |
| Permission | “Chỉ audio của tab bạn chọn được dùng tạm thời để tạo transcript. Vidlish không lưu video.” | “Allow screen recording.” without context |
| Long processing | “Video dài đang được chia thành các phần để xử lý.” | “Vui lòng chờ…” indefinitely |
| Quality check | “Đang đối chiếu câu hỏi và trích dẫn với video.” | “AI đang suy nghĩ.” |
| Lesson ready | “Bài học đã sẵn sàng.” | “Generation successful!” |
| Low-confidence STT | “Một số đoạn nghe chưa rõ. Bài học sẽ tránh dùng các đoạn này cho câu hỏi có chấm điểm.” | “Transcript accuracy: 72%” as the only explanation |
| Delete | “Xóa bài học và transcript đã lưu?” | “Are you sure?” |

English labels inside lesson content are allowed when they are learning terms. System navigation and explanation default to Vietnamese.

## Global Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| App top bar | All authenticated surfaces | Logo returns to Create Lesson. Primary nav has Create and Library only. Account menu contains quota/privacy/sign out. |
| Video URL field | Create | Paste-friendly. Validation waits until blur or submit, not each keystroke. Successful validation reveals metadata preview without moving the primary action far down the page. |
| CEFR selector | Create | A1–C1 with one-sentence learner-friendly descriptions in tooltip/help. Selected level persists for the session, not global profile in MVP. |
| Job phase stepper | Generation | Reads persisted job state. Completed, active, fallback-required and failed are distinct. Refresh resumes the same job. |
| Fallback card | Generation | Shows one recommended next action. Alternative methods live under “Cách khác”. Provider names remain hidden unless internal debug mode. |
| Evidence link | Lesson | Timestamp seeks the player and gives focus to the relevant transcript row. Keyboard activation supported. |
| Support control | Lesson | Transcript support modes: hidden/keywords/full English/translation on demand where available. The lesson may prescribe an initial mode for an activity, but the user can reveal support. |
| Activity card | Lesson | Attempt → submit → feedback. “Xem đáp án” is separate from “Nộp”. Open production prompts use self-check criteria, not fake automated scoring. |
| Destructive dialog | Library | Names what will be deleted. Confirm button says “Xóa bài học”; focus starts on Cancel. |

## Create Lesson Surface

### Default state

Composition:

1. Brand promise and one-line explanation.
2. YouTube URL field.
3. CEFR selector.
4. Primary button: **Tạo bài học**.
5. Small privacy note: video is not stored; transcript handling link.
6. Recent lesson shortcut only when the user already has lessons; no full dashboard.

### Valid URL state

After validation, show compact metadata:

- Thumbnail.
- Title and channel.
- Duration.
- Availability badge.
- Transcript strategy is not promised before the job starts; avoid misleading “captions found” unless inspection is reliable.

### Submit behavior

- Creates a persisted job first.
- Navigates to `/jobs/{id}` immediately.
- Button becomes disabled only after job ID is returned.
- Duplicate submit with same URL/level/session uses idempotency handling and opens the existing job.

## Generation Surface

### Phase vocabulary

1. Kiểm tra video.
2. Lấy hoặc tạo transcript.
3. Phân tích nội dung.
4. Chọn phần đáng học.
5. Tạo hoạt động.
6. Kiểm định bài học.
7. Hoàn tất.

Do not expose internal model calls as separate user-facing steps.

### Persisted progress

- Job page can be reopened from URL.
- Refresh, backgrounding or temporary network loss does not reset the job.
- If processing continues server-side, user may leave and return via Library/“Đang xử lý”. MVP may poll; realtime is optional.

### Fallback decision hierarchy

When a strategy fails:

1. Automatically try the next server-side strategy if policy allows.
2. Ask the user only when permission/input is required.
3. Recommend **Chia sẻ audio của tab** for a playable video with no usable captions.
4. Place **Dán/upload transcript** under alternatives.
5. Never ask the user to understand “InnerTube”, proxy or vendor errors.

### Tab Audio Capture flow

1. Explain purpose, scope and retention before opening the browser picker.
2. Primary button: **Chọn tab YouTube**.
3. Browser picker opens only from a direct user action.
4. After selection, verify an audio track exists.
5. Show live state: waiting for playback / capturing / transcribing / completed.
6. The user can stop capture; completed chunks remain usable.
7. Explain that the YouTube video may need to play through the required portion.
8. On permission denial, keep the job and offer retry/paste/upload.

Privacy copy must state:

- Vidlish receives audio from the selected tab only when the browser provides it.
- Video is not stored.
- Temporary audio is deleted after transcription or failure according to retention policy.

### Long video behavior

- Show that the video is being divided into sections.
- If a single Core Lesson would exceed the learning budget, generation result becomes an overview lesson plus micro-lesson candidates.
- MVP may initially publish only the overview and first micro-lesson, but UX must not imply the whole video was taught in 15 minutes.

## Lesson Viewer

### Desktop composition

- Left/sticky media rail: player, video map/chapters, transcript support controls and compact progress.
- Right reading rail: Core Lesson phases in sequence.
- Player remains visible while studying, but does not occupy more than roughly 42% of viewport width.

### Mobile composition

- Player at top, not permanently sticky after significant scroll.
- Compact lesson phase navigation below player.
- Evidence timestamp taps scroll back to player and seek.
- Transcript opens in an inline accordion or bottom sheet; never forces a side-by-side layout.

### Lesson opening

Show:

1. Title, CEFR and estimated time.
2. Up to three learning outcomes.
3. Activation/prediction.
4. Gist activity before full transcript is automatically expanded.

The user may skip an activity, but skip is explicit and does not fabricate a score.

### Phase navigation

A compact phase rail shows:

- Bắt đầu.
- Hiểu ý chính.
- Ngôn ngữ đáng học.
- Luyện tập.
- Nhớ lại.
- Vận dụng.
- Kết thúc.

Clicking a phase scrolls to it. A phase is marked complete when required interactions are attempted or explicitly skipped; the system does not require perfect answers.

### Transcript behavior

Support modes:

- Hidden.
- Keyword support.
- Full English transcript.
- Vietnamese explanation/translation on demand where generated.

Rules:

- Gist starts with transcript hidden by default.
- Evidence links can reveal the relevant segment without expanding the entire transcript.
- Current playback segment may highlight when reliable timing is available.
- Low-confidence segments show a subtle warning only when the user opens them; they are excluded from scored evidence.

### Language item behavior

Each item displays:

- Term/chunk.
- Type/register.
- Vietnamese meaning and level-appropriate English definition.
- Source quote with evidence timestamp.
- Context explanation.
- Generated example clearly labeled.

Cards expand for details rather than showing every field by default. Item order follows lesson goals, not alphabetic order.

### Activity behavior

Scored activities:

- One clear action per card.
- Feedback explains why, with evidence timestamp when video-dependent.
- Retry is allowed within the session.
- Correct answer is not revealed before submission unless user chooses “Xem đáp án”.

Open activities:

- Retrieval prompt hides target content until the user attempts mentally or in a text field.
- Transfer/production gives 2–4 self-check criteria.
- MVP does not pretend to grade open speaking/writing accurately.

### Completion

End with:

- Exit ticket.
- Three key takeaways at most.
- Mark complete toggle/button.
- Link back to Library.

No confetti, streak or forced share prompt.

## Library

Default: reverse chronological list.

Each row/card includes:

- Thumbnail.
- Video title/channel.
- CEFR.
- Created date.
- Status: processing / ready / failed / completed.
- Transcript source summary only when relevant to retry or quality.

Behavior:

- Ready row opens Lesson.
- Processing row opens Job page.
- Failed row opens the failure/fallback state, not a dead detail page.
- Delete action is in overflow menu; confirmation names dependent transcript deletion.
- MVP supports basic filter: All / In progress / Completed / Failed. No search requirement unless the library becomes large in beta.

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold load | All | Layout-matched Skeleton, not spinner-only full page |
| Signed out | Protected route | Preserve intended URL, redirect to Sign in, return after auth |
| Empty Library | Library | “Chưa có bài học.” + one primary action “Tạo bài đầu tiên” |
| URL invalid | Create | Inline message with examples of accepted YouTube URLs |
| Video unavailable | Generation | Explain private/deleted/restricted and return to URL field |
| Caption path exhausted | Generation | Automatically transition to recommended user-permission fallback |
| Permission denied | Capture | Keep job, explain nothing was captured, offer Retry and Other methods |
| No audio track | Capture | Ask user to reselect the YouTube tab and ensure “Share tab audio” is enabled where available |
| STT low confidence | Generation/Lesson | Continue only if quality gates can avoid weak segments; otherwise ask for another input method |
| AI/schema failure | Generation | One bounded repair happens automatically; then user sees retry action without raw JSON |
| Quality gate failure | Generation | “Bài học chưa đạt kiểm tra chất lượng.” Offer regenerate; do not publish partial lesson |
| Offline | Global | Toast + persisted state; disable only actions requiring network |
| Delete success | Library | Remove row and show undo only if backend supports safe soft-delete; otherwise confirmation is final |

## Interaction Primitives

- `Tab` order follows reading/visual order.
- `Enter` submits URL form only when validation requirements are met.
- `Space`/`Enter` activates evidence timestamps and CEFR segmented buttons.
- `Esc` closes the topmost Dialog/Sheet and returns focus to trigger.
- `/` may focus Library search only if search is added; no hidden shortcut dependency in MVP.
- Player keyboard controls remain owned by YouTube iframe when focused.
- No drag-and-drop requirement.
- No hover-only actions on mobile; overflow menu remains tappable.
- Modal stack depth maximum one. Browser share picker is external and must not be covered by another dialog.

## Accessibility Floor

- WCAG 2.2 AA target for core responsive web flows.
- Every form control has visible label; placeholders are not labels.
- Status changes announced through `aria-live` without repeatedly reading the entire phase list.
- Stepper uses text and icon/state, not color alone.
- Evidence chips have accessible name such as “Mở video tại 02:14”.
- Activity feedback states “Đúng/Sai/Chưa hoàn thành” in text.
- Transcript rows are navigable as a list; current row state is announced only when user opts into synchronized transcript to avoid noisy screen-reader output.
- Reduced motion respected; no required animation.
- Minimum touch target 44×44 CSS pixels for primary mobile controls.
- Browser capture permission explanation is readable before the picker opens.
- Language attributes distinguish Vietnamese UI and English lesson text when practical.

## Responsive & Platform

| Width | Behavior |
|---|---|
| ≥ 1100px | Lesson uses sticky two-column media/content layout; Create remains centered single column; Library may use two-column cards if content remains readable |
| 768–1099px | Lesson uses narrower media rail or stacked layout depending on viewport height; phase navigation remains visible |
| < 768px | All surfaces single column; top nav compact; transcript and video map use Accordion/Sheet; player non-sticky after initial viewport |

Primary beta target: Chromium desktop because tab-audio behavior is most capable there. Create, caption-based generation, Lesson and Library must still work in other modern browsers; audio fallback availability is capability-detected and explained.

## Inspiration & Anti-patterns

### Patterns adopted

- Language Reactor: precise video/transcript interaction and contextual evidence.
- Yabla: deliberate listening activities and replayable chunks.
- British Council: pre-viewing → while-viewing → post-viewing progression.
- TED-Ed: watch/think/deepen/transfer structure.
- Edpuzzle: timestamped questions and persisted activity state.
- shadcn/ui: accessible default components rather than a custom widget system.

### Patterns rejected

- Always-on bilingual subtitles.
- AI chat as the primary lesson interface.
- Summary + 20 words + random quiz template.
- Streaks, XP, confetti and notification pressure.
- Dashboard analytics before users have meaningful lesson history.
- Provider/debug terminology in user-facing errors.
- Publishing partial lessons when quality gates fail.

## Key Flows

### Flow 1 — Caption fast path (Minh, B1 learner, laptop)

1. Minh signs in and lands on Create Lesson.
2. He pastes a public YouTube interview URL and selects B1.
3. Metadata preview confirms title/channel; Minh presses **Tạo bài học**.
4. Job page shows video check, then transcript acquisition. A caption provider succeeds; no permission is requested.
5. The stepper advances through analysis, selection, activities and quality validation.
6. **Climax:** Lesson Viewer opens with three outcomes and a gist question before the transcript is expanded. Minh can immediately see this is a guided lesson, not a transcript dump.
7. He answers gist, clicks a timestamp on a phrasal verb and the video seeks to the evidence.

Failure: provider one times out; the job silently tries provider two and only shows “Đang thử nguồn transcript khác” if the delay becomes noticeable.

### Flow 2 — No-caption audio fallback (Lan, A2 learner, Chrome desktop)

1. Lan pastes a vlog with no captions.
2. Server-side strategies fail. Generation page displays one recommended card: **Tạo transcript từ audio của tab**.
3. Lan reads that video is not stored and temporary audio is deleted, then presses **Chọn tab YouTube**.
4. Browser picker opens; she selects the YouTube tab with audio enabled.
5. Capture state says “Phát video để Vidlish nghe phần cần xử lý.” The progress bar follows captured/transcribed duration.
6. **Climax:** The capture finishes and the same job automatically continues into lesson analysis; Lan does not restart or paste the URL again.
7. The final lesson uses simpler explanations and avoids low-confidence audio segments for scored questions.

Failure: Lan selects a tab without audio. The UI asks her to reselect and keeps paste/upload alternatives available.

### Flow 3 — Learning with progressive support (Huy, B2 learner, phone)

1. Huy opens a saved Lesson on mobile.
2. Player appears first; learning outcomes and a gist question follow. Transcript is hidden.
3. After answering, he opens the video map and replays a difficult 45-second segment.
4. A listening-decoding activity offers keyword support, then full transcript only after his attempt.
5. He studies two discourse markers, completes a retrieval task without visible answers and writes a short transfer response using self-check criteria.
6. **Climax:** At the exit ticket, Huy can explain the speaker’s position and use one target expression in a new context; the lesson’s phases feel connected.
7. He marks complete and returns to Library.

### Flow 4 — Return and recover (Mai, A1 learner, next day)

1. Mai opens Library and sees one ready lesson, one completed lesson and one failed transcript job.
2. She opens the failed row; it restores the exact fallback state and offers paste/upload instead of starting over.
3. She opens the completed lesson; no provider call runs and all evidence links still work.
4. **Climax:** Mai trusts that Vidlish is a library of stable lessons, not a disposable AI generator.
5. She deletes an unwanted lesson after a dialog explains the saved transcript will also be removed when no other lesson uses it.

## Handoff Notes

- Architecture must preserve persisted job URLs, capability detection for tab audio and provider-independent error mapping.
- Lesson Engine companions are authoritative for schema, CEFR and quality behavior.
- Exact color/typography implementation follows `DESIGN.md`; behavior wins over mockups on conflict.
- Mockups are composition references only and must not introduce new product requirements.
