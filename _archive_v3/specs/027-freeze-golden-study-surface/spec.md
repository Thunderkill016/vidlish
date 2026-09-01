# Feature Specification: Freeze the predeclared Golden study surface

**Feature branch:** `feat/027-freeze-golden-study-surface`  
**Status:** implementation  
**Authority:** `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`, `docs/product/learning-model-v2/golden-session-validation.md`

## Problem

Gate 5 is a predeclared moderated usability instrument. Feature 023 later added a post-completion speaking handoff to `/learning-lab/v2`. That product extension is valid for normal learners, but allowing it to appear inside the five-person Golden study changes the moderator-observed instrument after thresholds were locked.

The extra copy can also prime post-session goal-restatement or recognition observations. CI cannot tell us whether that bias is material, so the study must fail closed by preserving the declared surface instead of silently accepting drift.

## Goal

Keep the canonical `pnpm study:golden` runtime on the locked Golden Session study surface while leaving normal learner runtime unchanged.

## Requirements

1. The canonical study command must set a server-only explicit study-mode flag before the Next.js child runtime is created.
2. `/learning-lab/v2` must suppress the post-completion speaking handoff only when that exact study-mode flag is `true`.
3. Normal fixture/local/CI learner runtime must still render the speaking handoff as before.
4. Production lesson-session speaking handoff must remain unchanged.
5. Study mode must not alter lesson progression, durable attempt evidence, support/replay evidence, measurement projection, moderator observations, or Gate 5 thresholds.
6. Study mode must not cause fixture/CI sessions to count as real Gate 5 participants.
7. The flag must be server-only; do not introduce a `NEXT_PUBLIC_*` study authority.

## Non-goals

- changing the Golden Session blueprint;
- changing predeclared Gate 5 thresholds;
- fabricating/recruiting participants;
- disabling speaking in the normal product;
- changing Feature 022–026 speaking evidence semantics;
- starting Gate 6 before Gate 5 is passed or corrected and revalidated.

## Acceptance criteria

1. A focused unit test proves study mode is enabled only by literal `GOLDEN_STUDY_MODE=true`.
2. A focused preload test proves the canonical study command's preload sets that flag.
3. The Golden fixture page conditionally omits `SpeakingCompletionHandoff` in study mode and keeps it otherwise.
4. Exact-head repository CI is green before merge.
5. Gate 5 remains explicitly unpassed after this feature; this change protects instrument integrity rather than supplying learner evidence.
