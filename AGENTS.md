# AGENTS.md

## Mission

Build Vidlish as a grounded English-learning product for Vietnamese adults A2–B2 who already watch English YouTube but rely on subtitles or passive understanding.

The product promise is not “AI generates a lesson.” The durable value is:

`user-owned interest + grounded learning activity + personal capability evidence + varied delayed review + progressively less support`

## Authority order

Before changing product behavior, read these in order:

1. `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`
2. `docs/product/learning-model-v2/golden-session-validation.md`
3. current PR/issue acceptance criteria
4. code + tests on the branch being changed
5. older BMAD artifacts only when they do not conflict with the product documents above

Do not treat old sprint/story metadata as current authority.

## Current program state

Learning Model v2 is merged into `main` (PR #44, 19/08/2026). There is no
separate integration branch any more; `design/learning-model-v2` is history.
Work from `main`.

Integrated and reachable from a route or workflow:

- learner-first product shell;
- source-first Study Mode workspace;
- durable lesson sessions and privacy-safe attempts;
- server-confirmed support/replay evidence;
- delayed review sessions, scheduled by FSRS in the application layer;
- Supabase RLS/RPC + pgTAP;
- Chromium product journeys + durable Supabase Golden Session.

### What is proven, and what is not

**A production run authors and publishes v2 blueprints.** Confirmed 21/08/2026
by driving the product's own API as a signed-in learner: six `lesson_versions`
rows, each with `lesson_id` null — hanging off the job, not a v1 lesson — and
activities in the order the authoring gate requires. `learning_authoring_outcome`
reads `authored`.

v1 no longer runs. A job is completed by publishing a v2 blueprint, under the
same rule v1 used: a job reports completed only when something readable exists
behind it. When authoring produces nothing the job terminalizes and says so.
The v1 tables and their rows are untouched; removing that data is its own step.

What is still unproven is **reliability, and everything about learners**. Across
fifteen authoring briefs production holds six published blueprints. Several
failure shapes were found and fixed from the record —
`learning_authoring_outcome` and `learning_authoring_detail` name the branch and
the cause — but the rate has not been measured on a clean run of the current
code, and the daily job quota bounds how fast that can be done.

No learner other than the owner has opened one. Nothing here says a lesson
taught anyone anything: that needs gates 5 and 6, not another green run.

So: v2 is **reachable and shipping**, its **reliability is unmeasured**, and its
**teaching value is unevidenced**. Do not collapse those three into "it works".

### Hard-gate sequence

0. production authoring path that creates `lesson_versions` — **done**,
   21/08/2026: six blueprints published by real production runs, v1 retired,
   the learner routed to the guided session;
1. first-session durable flow — done;
2. CI failures fixed from real logs — done;
3. support/replay server evidence — done;
4. second-session varied/delayed review — done in code and proven on an
   arbitrary blueprint in CI; reachable in production now that gate 0 is
   closed, but no learner has run one;
5. analytics + moderated usability with 5 target users;
6. 20–50 learner cohort + predeclared go/no-go thresholds;
7. benchmark at most 3 temporary authoring models, select one production
   provider/model by cost per accepted lesson;
8. paid/retention/legal/operations validation;
9. rollout.

Gate 9 used to read "only then consider merge to `main`". That gate was passed
by merging v2 to `main` before the gates above it, so the sequence now describes
rollout rather than merge. Do not treat the merge as evidence the gates were
met.

Do not skip gates because CI is green.

## Non-negotiable learning invariants

- Source quotes must be exact spoken English from canonical permitted transcript segments.
- Model/provider output may return IDs/labels; server hydrates exact quote/timestamps and rejects evidence outside the allowlist.
- No answer/reveal before the configured attempt boundary.
- Reading a correction is not completion; retry is required where policy says so.
- Transfer must change context/input rather than repeat the source sentence.
- Completion != mastery.
- Scheduler state decides when an item returns; it does not prove independent capability.
- Delayed transfer must be stored/claimed separately from immediate transfer.
- Persist only bounded privacy-safe evidence; no raw learner audio or unrestricted open text by default.
- Provenance/source evidence uses semantic evidence styling; do not use it decoratively.
- Solved and revealed are different states.

## Product scope guardrails

In MVP:

- English-language YouTube source;
- Vietnamese learner guidance;
- 5–12 minute sessions;
- bounded source windows;
- listening → progressive support → notice → retrieval → changed-context use → delayed review;
- desktop + mobile web.

Do not expand to multilingual source modes, arbitrary uploads, classroom, public marketplace, realtime AI conversation, pronunciation scoring, several payment gateways, or multi-provider production routing unless the current product authority explicitly changes.

## Production/provider safety

- Ordinary local/CI work uses fixtures, fakes, and local Supabase.
- Do not call production Supabase, Gemini, Supadata, or another paid provider unless the task explicitly authorizes that run.
- Never expose service keys in client code, logs, screenshots, prompts, tests, or repository files.
- Production uses one enabled provider/model/key at a time. Development agents and temporary offline benchmarks do not change this rule.

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
- `supabase/tests/`: pgTAP authority checks;
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
(PGlite — real Postgres compiled to WASM, no Docker) in about thirteen seconds.

Use it before pushing any migration, fixture or pgTAP fixture block. Seven CI
round-trips in one session were spent on fixture SQL written from memory — a
dropped quote, a column that does not exist, a check constraint, a unique
constraint. **None of those needed pgTAP to catch. They needed the schema.**

It does not replace `supabase test db`: PGlite has no pgTAP, so assertions,
RLS-as-a-role and `security definer` behaviour are still only proven in CI. It
answers a narrower question — *does this SQL run against the real schema* — and
that question is where the round-trips went.

Database changes are not complete until pgTAP passes. Learning-flow changes are not complete until Chromium journeys pass. Persistence changes are not complete until the durable Supabase journey proves the expected rows and privacy boundary.

Never weaken tests, add forced browser clicks, or loosen security constraints just to make CI green. Diagnose from the failing job/log and fix the product behavior or test contract deliberately.

## Agent execution protocol

Use agents for bounded vertical slices, not vague “improve everything” prompts.

For every implementation task:

1. state the acceptance boundary and invariants;
2. inspect current code/tests before editing;
3. choose the smallest vertical slice that can be verified end-to-end;
4. keep unrelated refactors out;
5. add/adjust tests with the implementation;
6. run focused tests, then full required gates;
7. inspect the diff for privacy, grounding, ownership and misleading capability claims;
8. open a draft PR until all required CI jobs are green.

Parallel agents should work on separate branches/worktrees and non-overlapping scopes. One agent may implement while another reviews threat/privacy/test gaps. Do not have several agents edit the same files concurrently without an explicit integration plan.

## AI tool roles

This repository is intentionally compatible with multiple development agents while keeping one source of truth.

- Primary implement/refactor/CI agent: use the strongest available coding agent with full repo + terminal context.
- Independent reviewer: use a different frontier coding model/agent for adversarial review of correctness, privacy, RLS, race conditions and test gaps.
- Large-context/research agent: use for docs/API changes and cross-checking current external platform behavior; verify against primary sources.
- GitHub coding/review agents: consume `AGENTS.md`, repository instructions and path-specific instructions.

Do not paste separate contradictory project rules into each agent. Update this file or the product authority documents instead.

## Communication

- Product-owner communication: Vietnamese.
- Code, identifiers, commit messages and technical contracts: English unless existing files dictate otherwise.
- Report what is verified versus inferred.
- Never claim a feature is production-ready, retained, mastered, paid-validated, legal-cleared, or CI-green without corresponding evidence.