# AGENTS.md

## Mission

Take one Vietnamese adult from **no English at all** to using it — listening,
speaking, reading, writing — the way a language is actually acquired rather than
studied.

The product is currently built **personal-first**: the product owner is the first
real learner, and genuine use of Vidlish should drive the next product fixes.
External-user/business validation is deferred until the owner explicitly
reactivates it.

The product promise is not “AI generates a lesson.” The durable value is:

`comprehensible input at the learner's level + personal capability evidence + varied delayed review + progressively less support`

### Video is a source, not the centre

This project began as a YouTube product for A2–B2 learners who already watched
English video. That is no longer the mission. A learner starting from zero
cannot use authentic video as their default first input when it is not yet
comprehensible.

The video pipeline stays. It is one source of input among several and becomes
useful when the learner can actually use it. Do not plan the product as though
creating video lessons is the daily destination.

### What the mission implies, and what it costs

- **Input-led, not input-only.** Beginner work starts from language the learner
  can understand with bounded support. Retrieval, production, interaction and
  corrective feedback may enter as soon as the task is comprehensible enough
  to attempt; receptive and productive outcomes are different capability
  evidence and must not be collapsed into one `known` claim.
- **Comprehensibility is a gate; the current one-new-target implementation is a
  policy.** The lexical set available to that gate comes from unsupported
  independent production because that is the durable evidence the current
  beginner system has. This is a conservative, auditable product policy — not a
  universal definition of Krashen's `i+1`, lexical comprehension, or everything
  the learner knows. Widening it requires an explicit feature, tests and learner
  evidence; higher generation acceptance is not enough.
- **High-frequency vocabulary carries coverage, not the whole curriculum.**
  Frequency should be a strong prior because common words recur often, but
  target order also needs communicative usefulness, prerequisites, learner
  need, learnability and opportunities for reuse. Do not turn an approximate
  first-thousand vocabulary target into a scientifically fixed course order.
- **Vietnamese support is itself a scaffold.** It should carry the earliest
  learning when English-only support is not enough and then taper as evidence
  shows the learner can succeed with less help. An approximate “first few
  hundred words” boundary is a product hypothesis, not a scientifically fixed
  cutoff.

The evidence basis and limitations for these distinctions are recorded in
`specs/002-calibrate-learning-policy/research.md`. Do not replace one slogan
with another; context-dependent research remains context-dependent.

The product owner has explicitly allowed storing what the learner writes,
recording what they say, and keeping Vietnamese explanations for early learning
where needed. That permission is purpose-bound; it is not a reason to collect
raw text/audio on unrelated tasks.

## Authority order

Before changing product behavior, read these in order:

1. `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`
2. `.specify/memory/constitution.md`
3. the current feature's `spec.md`, `plan.md`, `tasks.md` and explicit PR/issue acceptance criteria
4. code + tests on the branch being changed
5. `AGENTS.md` and `HANDOVER.md` for program/execution state and operational traps
6. `docs/product/learning-model-v2/golden-session-validation.md` only when work concerns the deferred external-user Golden Session study
7. `docs/archive/bmad/` only for historical context

The Golden Session five-person protocol is retained unchanged as a future market
validation instrument. Its old “current Gate 5” language must not override the
personal-first Master Plan.

Archived sprint/story/readiness metadata is never current authority. If an
archived decision is still required, restate it in current product docs, the
constitution, or an active feature specification.

## Current program state

Learning Model v2 is merged into `main` (PR #44, 19/08/2026). There is no
separate integration branch any more; `design/learning-model-v2` is history.
Work from `main`.

Integrated and reachable from a route or workflow:

- learner-first product shell;
- `/start` beginner path for zero/very-low lexical evidence;
- server-bound beginner evidence challenges;
- source-grounded Study Mode workspace;
- durable lesson sessions and privacy-safe attempts;
- server-confirmed support/replay evidence;
- source-lesson changed-context and delayed review;
- capability-oriented progress views;
- Supabase RLS/RPC + pgTAP;
- Chromium product journeys + durable Supabase journeys.

### What is proven, and what is not

**The production-shaped v2 authoring path can publish readable blueprints.** That
is reachability evidence, not proof of teaching value.

**The technical evidence paths are heavily tested.** That means the system can
store and project evidence according to current contracts; it does not mean a
fixture learned English.

**The active learner evidence now comes from the owner's genuine use.** Do not
invent owner learning evidence from CI or from this document. When the owner
uses Vidlish, the durable evidence itself should determine the strongest claim
shown in `/progress`.

A known personal-learning gap remains: the beginner path can bank narrow
independent word evidence, but it does not yet have its own durable
changed-context + cross-session delayed-review chain equivalent to the
source-lesson review path.

### Active personal development sequence

1. make `/start` the default entry below authentic-media readiness;
2. store only server-authoritative independent evidence;
3. show the learner the strongest claim durable evidence supports;
4. make the next evidence-bearing action obvious;
5. connect beginner evidence to changed-context, cross-session delayed review;
6. use Vidlish genuinely and fix observed learning friction in bounded slices;
7. expand speaking/writing/listening support only when it improves the owner's
   real learning loop.

This sequence is **not blocked by a five-person external study**.

### Deferred external-market sequence

If the owner later wants to validate Vidlish for other people or commercial
rollout, reactivate the existing program deliberately:

1. five-person moderated Golden Session study using genuine participants;
2. 20–50 learner cohort with predeclared thresholds;
3. benchmark at most three authoring models by cost per accepted artifact;
4. payment/retention/legal/operations validation;
5. rollout.

The old five-person Gate 5 remains unpassed. Do not fabricate it, but do not use
it as a blocker for personal-first development either.

## Non-negotiable learning invariants

- Source quotes must be exact spoken English from canonical permitted transcript segments.
- Model/provider output may return IDs/labels; server hydrates exact quote/timestamps and rejects evidence outside the allowlist.
- No answer/reveal before the configured attempt boundary.
- Reading a correction is not completion; retry is required where policy says so.
- Transfer must change context/input rather than repeat the source sentence.
- Completion != mastery.
- Scheduler state decides when an item returns; it does not prove independent capability.
- Delayed transfer must be stored/claimed separately from immediate transfer.
- Supported and independent success are different claims.
- A stronger personal checkpoint must preserve its weaker prerequisites; an inconsistent stronger-looking timestamp must fail closed.
- Persist bounded evidence appropriate to the task. Writing/speaking may store learner writing/audio when that is the feature; unrelated tasks may not piggyback raw content.
- Provenance/source evidence uses semantic evidence styling; do not use it decoratively.
- Solved and revealed are different states.

## Product scope guardrails

In scope:

- English target language, one learner, from zero;
- Vietnamese guidance for early learning, tapering as evidence shows less support is sufficient;
- short sessions;
- generated/curated beginner input below authentic-media readiness;
- YouTube source once authentic English is appropriate;
- input-led progression with retrieval, writing and speaking tasks when comprehensible enough to attempt;
- separate receptive and productive capability evidence;
- the same loop at every level: input → notice → retrieval → changed-context use
  → delayed review → less support;
- desktop + mobile web.

Out of scope while personal-first: other target languages, classroom or
multi-tenant features, a public marketplace, payment-gateway expansion,
multi-provider production routing, broad social/gamification systems.

**Pronunciation scoring is not free to adopt.** Before shipping a learner-facing
score, validate the speech stack on Vietnamese-accented English. A scorer that
mishears correct speech and marks it wrong is worse than no score for a
beginner. Until then, report only what the system can actually check.

## Production/provider safety

- Ordinary local/CI work uses fixtures, fakes, and local Supabase.
- Do not call production Supabase, Gemini, Supadata, or another paid provider unless the task explicitly authorizes that run.
- Never expose service keys in client code, logs, screenshots, prompts, tests, or repository files.
- Production uses one enabled provider/model/key at a time. Development agents and temporary offline benchmarks do not change this rule.
- Personal-first scope does not weaken owner isolation, RLS, RPC privilege or evidence-authority requirements.

## Architecture

Keep dependency direction:

`app/route handlers → application → ports ← adapters`

Key areas:

- `src/shared/contracts/`: runtime/domain contracts and privacy-safe schemas;
- `src/modules/learning/application/`: authoritative learning behavior;
- `src/modules/learning/ports/`: repository/provider interfaces;
- `src/adapters/fake/`: deterministic tests/dev;
- `src/adapters/supabase/`: production persistence adapter;
- `src/platform/`: wiring/config;
- `supabase/migrations/`: additive DB invariants/RPC/RLS;
- `supabase/tests/`: pgTAP;
- `tests/e2e/`: user-level browser evidence.

Do not let UI-local state become authority for durable learning evidence.

## Required verification

For application/UI-only changes, run the smallest relevant tests first, then the full gate before merge.

Canonical commands:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
supabase test db
pnpm test:e2e
```

### Check SQL locally before pushing it

```bash
pnpm db:local                                    # apply every migration
pnpm db:local supabase/fixtures/a.sql b.sql      # then run these, in order
```

`scripts/local-schema.mjs` applies all migrations to an in-process Postgres
(PGlite — real Postgres compiled to WASM, no Docker).

It does not replace `supabase test db`: PGlite has no pgTAP, so assertions,
RLS-as-a-role and `security definer` behaviour are still only proven in CI.

Database changes are not complete until pgTAP passes. Learning-flow changes are
not complete until Chromium journeys pass. Persistence changes are not complete
until the durable Supabase journey proves the expected rows and privacy
boundary.

Never weaken tests, add forced browser clicks, or loosen security constraints
just to make CI green. Diagnose from the failing job/log and fix the product
behavior or test contract deliberately.

## Spec Kit execution protocol

Use Spec Kit for bounded vertical slices, not vague “improve everything” prompts.
The constitution is read live from `.specify/memory/constitution.md`.

For every implementation task with material scope:

1. state the acceptance boundary and invariants in `specs/<feature>/spec.md`;
2. clarify material ambiguity before choosing architecture;
3. inspect current code/tests before writing `plan.md`;
4. choose the smallest vertical slices and verification in `tasks.md`;
5. keep unrelated refactors out;
6. implement with tests, then run focused checks and the full required gates;
7. analyze the diff/spec/plan/tasks for privacy, grounding, ownership and misleading capability claims;
8. converge artifacts only when implementation and verification agree;
9. merge only the exact reviewed head after all required CI jobs are green.

Small mechanical fixes may use a lightweight spec/PR acceptance boundary, but
they still obey the constitution and verification rules.

## AI tool roles

This repository is intentionally compatible with multiple development agents
while keeping one source of truth.

- Primary implement/refactor/CI agent: strongest available coding agent with full repo + terminal context.
- Independent reviewer: different frontier coding model/agent for adversarial correctness/privacy/RLS/race/test review.
- Large-context/research agent: docs/API/platform research, verified against primary sources.
- GitHub coding/review agents: consume `AGENTS.md`, constitution, active feature artifacts and path-specific instructions.

Do not paste separate contradictory project rules into each agent. Update the
constitution, this file, or the product authority documents instead.

## Communication

- Product-owner communication: Vietnamese.
- Code, identifiers, commit messages and technical contracts: English unless existing files dictate otherwise.
- Report what is verified versus inferred.
- Never claim a feature is production-ready, retained, mastered, paid-validated, legal-cleared, externally validated, or CI-green without corresponding evidence.
