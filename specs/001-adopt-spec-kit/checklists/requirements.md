# Requirements Quality Checklist

## Source of truth

- [x] The specification names one active methodology.
- [x] The constitution is repository-owned and read live rather than copied into agent templates.
- [x] Current product authority remains above archived historical material.
- [x] Historical BMAD artifacts are explicitly non-authoritative.

## Migration safety

- [x] Runtime learner behavior is out of scope.
- [x] Production provider usage is unnecessary and prohibited for this change.
- [x] Project-specific `vidlish-hard-gate` is preserved.
- [x] Historical project artifacts are preserved before active BMAD paths are removed.
- [x] Regeneration paths are removed, not merely undocumented.

## Verifiability

- [x] Acceptance criteria are observable from a fresh checkout.
- [x] A deterministic test guards the active-path boundary.
- [x] Existing full CI remains the merge authority.
- [x] Exact-head success is required before merge.
