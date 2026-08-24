# Tasks: Gate 5 local participant files

## Local file boundary

- [x] Reuse the existing participant/study schemas for local file handling.
- [x] Add validated participant JSON download on capture.
- [x] Keep clipboard copy as fallback.
- [x] Add exact-five local JSON import on evaluator.
- [x] Keep manual Study JSON edit/paste as fallback.

## Verification

- [x] Add unit coverage for serialization/import/strict schema rejection.
- [x] Extend durable capture Chromium coverage to verify downloaded bytes.
- [x] Extend evaluator Chromium coverage to import five files.
- [ ] Update the Gate 5 runbook.
- [ ] Review diff for persistence/evidence/threshold drift.
- [ ] Run exact-head full repository CI.
- [ ] Squash merge only the exact green head.

## Explicitly unchanged

- Gate 5 remains unpassed until five genuine moderated participant records exist.
- No study record is uploaded or persisted by Vidlish.
- Gate 5 thresholds and authoritative schemas are unchanged.
- No migration, provider, scheduler, capability, progress, billing, Gate 6 or Gate 7 change.
