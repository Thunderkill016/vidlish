# Vidlish Constitution

Version: 1.0.0
Ratified: 2026-08-22

This constitution is the durable engineering and product-governance contract for Vidlish. Feature specifications may narrow these rules; they may not silently weaken them.

## I. Learner evidence before product claims

Vidlish exists to take one Vietnamese adult from no English to usable English. Product work must preserve the acquisition loop:

`comprehensible input → notice → retrieval → changed-context use → delayed review → less support`

Completion is not mastery. Scheduler state is not proof of independent capability. Reading a correction is not a successful attempt. Delayed transfer must remain distinct from immediate transfer.

Claims such as production-ready, retained, mastered, paid-validated, or teaching-effective require corresponding evidence. Green CI is necessary engineering evidence, not learner-outcome evidence.

## II. Comprehensible input is a gate

For beginner-generated material, a sentence is eligible only when the learner evidence makes it comprehensible under the current i+1 policy. "Known" is based on demonstrated production without opened support, not self-report.

Vietnamese guidance is an intentional scaffold for the earliest vocabulary and must taper as evidence grows. Authentic YouTube input is a later source, not the organizing center for a zero-beginner.

## III. Grounding and reveal boundaries are server-owned

When content derives from a canonical source, quoted English and timestamps must come from permitted canonical segments. Providers may return IDs or labels; server code hydrates canonical text and rejects evidence outside the allowlist.

No answer or reveal may cross the configured attempt boundary. Solved and revealed remain separate states. UI-local state must not become authority for durable learning evidence.

## IV. Privacy and ownership are scoped, explicit contracts

Persist only data required by the learning purpose. Learner writing and learner audio may be stored only in flows where writing or speaking is the explicit purpose and only under the learner's ownership boundary. Listening or recognition attempts must not acquire unrelated free text or raw audio.

Secrets and provider keys are server-only. Ordinary development and CI use fixtures, fakes, and local Supabase. Production Supabase, Gemini, Supadata, or another paid provider must not be called unless a task explicitly authorizes that run.

## V. Architecture and persistence must fail closed

Maintain dependency direction:

`app/route handlers → application → ports ← adapters`

Ownership, provenance, idempotency, RLS, version checks, and durable state transitions belong in application/database contracts, not inferred UI behavior. Database changes require pgTAP evidence. Learning persistence changes require the durable Supabase journey. Learning-flow changes require browser evidence.

Never weaken tests, forced-click around product behavior, or loosen security constraints to make CI pass.

## VI. Specifications are executable decision records

Active feature work uses Spec Kit artifacts under `specs/<feature>/`:

1. `spec.md` defines the user problem, acceptance boundary, invariants, and measurable outcomes without prescribing implementation prematurely.
2. `plan.md` records architecture, data, migration, security/privacy, and verification decisions.
3. `tasks.md` decomposes the smallest verifiable vertical slices and names verification for each slice.
4. `checklists/` records requirement-quality checks when useful.

Clarify material ambiguity before planning. Analyze cross-artifact contradictions before implementation. Converge only after implementation and verification agree with the specification.

Historical artifacts may explain why a decision existed; they are never active authority by age alone.

## VII. One source of truth, minimal methodology

The authority order is:

1. current product authority documents named in `AGENTS.md`;
2. this constitution;
3. the current feature's `spec.md`, `plan.md`, `tasks.md`, and explicit PR/issue acceptance criteria;
4. code and tests on the branch;
5. archived historical material for context only.

Do not duplicate this constitution into generated templates or agent-specific instruction copies. Agents should read it live. Repository-specific hard gates may extend it, but competing methodology frameworks must not become a second source of truth.

## VIII. Verification before merge

Use the smallest relevant checks while implementing, then the repository's complete required CI gate before merge. At minimum the current project expects typecheck, lint, unit tests, production build, Supabase migration/RLS tests, browser journeys, and the durable learning journey where configured by CI.

A pull request may merge only against the exact reviewed head after all required jobs for that head succeed. A rerun must still target the same head. Provider-real tests are separate evidence and must not be substituted by fixtures or consumed without authorization.

## Governance

Amendments require an explicit repository change that explains the reason and compatibility impact. A principle change increments the major version. A materially expanded rule increments the minor version. Clarifications increment the patch version.

When a feature specification conflicts with this constitution, the constitution wins unless the same change intentionally amends the constitution. When current product-owner decisions invalidate an older rule, update the rule explicitly rather than silently ignoring it.
