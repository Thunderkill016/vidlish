# Epic Implementation Clarifications

**Status:** normative companion  
**Purpose:** Remove forward-dependency ambiguity and reference drift discovered during final validation. These clarifications override only the specific wording identified below; all approved story outcomes and requirements remain unchanged.

## 1. Architecture reference convention

- `AD-*` refers to canonical decisions/invariants in `ARCHITECTURE-SPINE.md`.
- `AR*` refers to the derived implementation-requirement inventory in `architecture-ux-requirements.md`.
- A story may cite either form. When both represent the same concern, the architecture document and its amendments are authoritative.

## 2. Story 1.1 scaffold interpretation

Architecture specifies a structural seed and exact stack, not a third-party starter repository. Story 1.1 therefore performs the initial application scaffold from the architecture seed:

- Next.js App Router application;
- Node/pnpm/toolchain lock;
- Tailwind and shadcn setup;
- typed config;
- initial identity/module boundaries;
- Supabase SSR authentication.

It must not create transcript, job, lesson or activity entities before a story needs them.

## 3. Story 1.3 standalone completion

Story 1.3 must be fully demonstrable before Story 2.1 exists.

- Before Story 2.1, the final action is `Xác nhận lựa chọn` and produces a visible `Sẵn sàng tạo bài học` state for the validated video + CEFR in the current Create flow.
- It does not create a generation job or provider call.
- Story 2.1 replaces/promotes that confirmed state into the active `Tạo bài học` submission that persists a job.
- No dead or misleading `Tạo bài học` control may be shipped while Story 2.1 is absent.

## 4. Story 2.5 tab-audio visibility

Story 2.5 implements only pasted transcript and `.srt`/`.vtt` upload.

- The `Cách khác` section may describe that another supported method can become available later, but it must not render an enabled tab-audio capture control before Story 2.6 is implemented.
- Story 2.6 adds the capability-detected `Ghi âm tab video` control and its complete consent/capture/STT behavior.

## 5. Transcript source order is policy-configured

The architecture lists default strategy classes while stories introduce them incrementally. The registry at each story contains only strategies implemented and enabled at that point. Exhaustion behavior remains safe and actionable; adding a later strategy extends the registry without requiring an earlier story to depend on future code.

## 6. Language eligibility authority

`architecture/.../LANGUAGE-ELIGIBILITY-AMENDMENT.md`, the PRD language amendment and the Lesson Engine language contract override stale language snippets in the original architecture spine.

Implementation must use:

```text
normalizing_transcript
→ checking_language
→ analyzing_video only when eligible
```

A canonical transcript is not globally labeled English before the gate.

## 7. Viewer interaction boundary

Story 3.5 publishes and renders source references as readable evidence. Before Story 4.1, a timestamp may be shown as non-interactive reference text. Story 4.1 alone adds seek/player synchronization. No dead button or misleading interactive EvidenceChip is allowed before that story.

## 8. Entity timing

Entities are introduced only by the first story that requires them:

- Story 1.1: auth/private-beta support only when required.
- Story 2.1: videos, lesson jobs, job events.
- Story 2.2: transcripts, segments, acquisition attempts.
- Story 2.3: language results/eligibility reports.
- Story 3.1–3.4: versioned generation artifacts/validation results as needed.
- Story 3.5: lesson identity/version/published pointer.
- Story 4.2–4.3: attempts, reflection and completion state.
- Story 5.2: deletion/tombstone state only if required by the chosen deletion workflow.

No epic performs a complete up-front database build.