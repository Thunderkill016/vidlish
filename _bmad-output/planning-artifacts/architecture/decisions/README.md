# Architecture Decision Records

Cross-cutting decisions that outlive a single planning session. Session-scoped architecture lives in
`../architecture-vidlish-2026-08-03/`; initial adapter choices live in that folder's
`IMPLEMENTATION-DECISIONS.md` as `ID-*`. An ADR does not override the PRD, the Architecture Spine or
the Language Eligibility Amendment.

Numbering follows `repo-analysis-2026-08-05.md` section 14, which proposed the first five. Numbers
are reserved on proposal so they do not collide.

| ID | Title | Status |
|---|---|---|
| ADR-001 | Lesson generation provider and per-lesson budget | **not written** — blocks Epic 3 |
| ADR-002 | Admin-client reads versus RLS as the read boundary | **not written** |
| ADR-003 | Lesson grounding enforced by foreign key | **not written** |
| [ADR-004](ADR-004-transcript-orchestration-and-terminal-outcomes.md) | Transcript strategy orchestration and terminal outcomes | proposed |
| [ADR-005](ADR-005-transcript-fallback-tiers-and-cost-routing.md) | Transcript fallback tiers and cost-aware routing | proposed |

## Status values

- **proposed** — written, not yet decided. Do not implement against it.
- **accepted** — decided. Implementations must comply.
- **superseded** — replaced; the replacement is named in the frontmatter.

## Format

Frontmatter with `id`, `title`, `status`, `date`, `supersedes`, `relates_to`, then: Status, Context,
Decision, Consequences, Alternatives considered, Compliance and verification, Open questions.

Record why an option was rejected, not only which one was chosen. When a decision fixes a numeric
threshold, record where the number came from — the repository rule against unexplained magic numbers
applies to decisions as well as to code.
