# Feature Specification: Gate 5 local participant files

**Feature branch:** `feat/028-gate5-local-file-bundle`  
**Status:** implementation  
**Authority:** `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`, `docs/product/learning-model-v2/golden-session-validation.md`

## Problem

Gate 5 already has a privacy-safe capture page and a strict five-person evaluator, but the moderator must copy participant JSON through the clipboard, save it manually, then later assemble five records by hand. That creates avoidable operator risks: losing a record during reset, editing JSON accidentally, selecting the wrong record, or corrupting the final bundle.

The fix must reduce local handling errors without turning Vidlish into a study-data store and without fabricating any participant evidence.

## Goal

Let the moderator download each already-validated participant record as a local JSON file and later import exactly five such files into the existing strict Gate 5 evaluator.

## Requirements

1. Capture must continue deriving the current owner-scoped durable measurement and bounded moderator observation exactly as before.
2. After a participant passes `goldenSessionUsabilityParticipantSchema`, capture may download that exact parsed record as `application/json` using a deterministic local filename.
3. Download must happen entirely in the browser. No study record may be POSTed, written to Supabase, analytics, AI/Gemini, or localStorage.
4. Clipboard copy must remain available as a fallback.
5. Evaluator import must accept exactly five local participant files at once.
6. Each imported file must independently pass `goldenSessionUsabilityParticipantSchema`.
7. The assembled five-person object must still pass the existing `goldenSessionUsabilityStudySchema`, including exact count and unique participant/session IDs.
8. Import only prepares canonical Study JSON. It must not evaluate or mark Gate 5 passed until the operator explicitly clicks the existing evaluation action.
9. Manual Study JSON paste/edit must remain available as a fallback.
10. File handling must not introduce a new evidence schema, persistent study cache, browser authority, database table, scheduler, provider, or threshold.

## Non-goals

- recruiting or simulating real participants;
- auto-generating missing participant files;
- storing participant study records in production infrastructure;
- relaxing the exactly-five or uniqueness rules;
- changing Gate 5 thresholds;
- starting Gate 6, Gate 7, billing, or rollout work;
- storing qualitative/free-form notes in automated Gate 5 records.

## Acceptance criteria

1. Unit tests prove deterministic participant serialization, strict participant parsing, exactly-five assembly, and duplicate-session rejection through the existing study schema.
2. Durable Chromium capture downloads a file whose bytes parse back to the same participant record.
3. Chromium evaluator imports five JSON files, reconstructs the canonical study record, and only then evaluates the unchanged thresholds.
4. Existing manual clipboard/paste paths remain functional.
5. Exact-head full repository CI is green before merge.
6. Gate 5 remains explicitly unpassed until five genuine moderated participant records are collected.
