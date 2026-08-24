# Plan: Gate 5 local participant files

1. Add pure local-file helpers that reuse the existing participant/study schemas.
2. Let capture download the already-validated participant JSON with a deterministic filename while keeping clipboard fallback.
3. Let evaluator import exactly five local participant JSON files and canonicalize them through the existing study schema before evaluation.
4. Extend Chromium coverage for downloaded bytes and five-file import.
5. Update the moderated-study runbook so local files are the preferred operator workflow.
6. Review the diff for persistence/evidence/threshold drift, then require exact-head full CI before squash merge.
