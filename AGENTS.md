# AGENTS.md

## Mission

Take one Vietnamese adult from **no English at all** to using it — listening,
speaking, reading, writing — the way a language is actually acquired rather than
studied.

The product promise is not “AI generates a lesson.” The durable value is:

`comprehensible input at the learner's level + personal capability evidence + varied delayed review + progressively less support`

### Video is a source, not the centre

This project began as a YouTube product for A2–B2 learners who already watched
English video. That is no longer the mission. A learner starting from zero
cannot use authentic video at all: it is not suitable beginner input for them.

The video pipeline stays, and it is good — it is what a learner graduates *to*
once they can use it. But it is one source of input among several, and no longer
the thing the product is organised around. Do not plan work as though reaching
the video path is the destination.

### What the mission implies, and what it costs

- **Input-led, not input-only.** Beginner work starts from language the learner
  can understand with bounded support. Retrieval, production, interaction and
  corrective feedback may enter as soon as the task is comprehensible enough
  to attempt; receptive and productive outcomes are different capability
  evidence and must not be collapsed into one `known` claim.
- **Comprehensibility is a gate; the current `i+1` implementation is a policy.**
  The beginner generator currently fails closed by allowing at most one new
  target word by default (`src/modules/learning/application/check-comprehensible-input.ts`).
  The lexical set available to that gate comes from unsupported independent
  production because that is the durable evidence the current system has. This
  is a conservative, auditable product policy — not a universal definition of
  Krashen's `i+1`, lexical comprehension, or everything the learner knows.
  Widening it requires an explicit feature, tests and learner evidence; higher
  generation acceptance is not enough.
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

Three decisions the product owner has made, which earlier invariants forbade:
storing what the learner writes, recording what they say, and keeping Vietnamese
explanations for early learning where they are needed. Where an older rule in
this file conflicts with those, the decision wins and the rule needs rewriting —
say so rather than quietly following the stale one.

## Product direction

Decided by the product owner on 25/08/2026. It is written here because two
agents spent a day building in opposite directions without it.

**The product teaches English from zero to real use, and it proves it.** Two
paths, both kept:

1. **The zero path** (`/start`, `/measure`) — an authored syllabus checked
   against the CEFR-J grammar inventory, met one new word at a time, with
   evidence and spaced review. This is the main path.
2. **The video path** (`/create`, `/lessons`, `learning-lab`) — lessons built
   from a learner's own YouTube sources. Kept and developed further, not
   deprecated.

The product is named **Nếp**. Copy and visual identity follow the Nếp direction;
the repository slug remains `vidlish` until a rename is done deliberately.

Where a redesign and a working behaviour collide, **the behaviour wins and the
redesign is written down as owed.** A prettier page that drops a shipped
measurement is a regression even when nothing fails to compile — four such
regressions reached `main` in one day because nobody had written this down.

## Working alongside other agents

More than one agent works in this repository, sometimes at the same time. All of
today's worst damage came from that and none of it came from bad code.

- **Never assume the working tree is yours.** Run `git status` before touching
  anything. If it holds uncommitted work you did not write, do not stash it, do
  not reset it, do not check out over it. Snapshot it (`git stash create` plus a
  tag, and a tar of untracked files, which `stash create` does not include) and
  work in a separate `git worktree`.
- **`main` is the only integration point.** Long-lived side branches diverge
  faster than they deliver: the branch that rebranded this product sat for three
  days, reached 51 commits behind, and cost a full day to land.
- **Read the diff before every commit.** `git add -A` followed by an unread
  commit silently reverted five files here once. If you need to inspect another
  base, use a separate worktree rather than checking out over your own.
- **One contract, not one per tool.** `CLAUDE.md`, `GEMINI.md` and
  `.github/copilot-instructions.md` are pointers to this file and must stay
  that way. AGENTS.md is an open specification, read by more than twenty coding
  agents; a rule that lives in only one of them is a rule the next agent breaks.

## Shipping means it reaches the learner

A merge is not a delivery. Each of these has failed in production here:

- **Migrations do not reach production by being merged.** Nine were missing on
  25/08, and pages had already died three separate times for the same reason —
  `learning_item_states` on 19/08, `learner_known_words()` on 23/08,
  `learning_speaking_attempts` on 25/08. CI proves migrations apply to a
  throwaway database and says nothing about the real one. Check
  `supabase migration list --linked`: an empty Remote column is a feature that
  does not exist for the learner.
- **A 200 on a static asset is not a working page.** After a deploy, read the
  runtime errors, not the status code of a `.wav` file. A page returning 500 for
  every signed-in learner served its assets perfectly.
- **A green CI job that applied nothing is indistinguishable from drift.** Any
  automation that syncs an environment must fail when it cannot act.

## Authority order

Before changing product behavior, read these in order:

1. `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`
2. `docs/product/learning-model-v2/golden-session-validation.md`
3. `.specify/memory/constitution.md`
4. the current feature's `spec.md`, `plan.md`, `tasks.md` and explicit PR/issue acceptance criteria
5. code + tests on the branch being changed
6. `docs/archive/bmad/` only for historical context

Archived sprint/story/readiness metadata is never current authority. If an archived decision is still required, restate it in current product docs, the constitution, or an active feature specification.

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
- Persist only bounded privacy-safe evidence. The product owner has since
  authorised storing what the learner writes and recording what they say, for
  their own account, to make writing feedback and speaking possible at all —
  so "no raw audio, no open text" is no longer absolute. It still holds
  everywhere those two are not the point: an attempt on a listening item has no
  business carrying free text.
- Provenance/source evidence uses semantic evidence styling; do not use it decoratively.
- Solved and revealed are different states.

## Product scope guardrails

In scope:

- English target language, one learner, from zero;
- Vietnamese guidance for early learning, tapering as evidence shows less support is sufficient;
- short sessions;
- **generated comprehensible sentences** for a learner below authentic-media readiness, **YouTube source** once they are ready — both bounded, both gated;
- input-led progression: listening/reading supply understandable language, while bounded retrieval, writing and speaking tasks enter when the learner can attempt them; receptive and productive capability evidence stay separate;
- the same loop at every level: input → notice → retrieval → changed-context use
  → delayed review → less support;
- desktop + mobile web.

Out of scope: other target languages, classroom or multi-tenant features, a
public marketplace, several payment gateways, multi-provider production routing.

**Pronunciation scoring is not out of scope any more, but it is not free to
adopt.** Speech recognition is measurably worse on Vietnamese-accented English
than on most other L1 groups, and every scoring product's accuracy rests on its
transcription. A scorer that mishears correct speech and marks it wrong is worse
than none for a beginner: they will fix a fault they do not have. Before
shipping any score, measure it on Vietnamese speakers — `L2-ARCTIC` carries four,
with human phoneme-level annotations. Until then, report what is checkable —
which words a listener could not make out — and do not dress it as a score.

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

## Spec Kit execution protocol

Use Spec Kit for bounded vertical slices, not vague “improve everything” prompts. The constitution is read live from `.specify/memory/constitution.md`; do not copy it into agent-specific templates.

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

Small mechanical fixes may use a lightweight spec/PR acceptance boundary, but they still obey the constitution and verification rules.

Parallel agents should work on separate branches/worktrees and non-overlapping scopes. One agent may implement while another reviews threat/privacy/test gaps. Do not have several agents edit the same files concurrently without an explicit integration plan.

## AI tool roles

This repository is intentionally compatible with multiple development agents while keeping one source of truth.

- Primary implement/refactor/CI agent: use the strongest available coding agent with full repo + terminal context.
- Independent reviewer: use a different frontier coding model/agent for adversarial review of correctness, privacy, RLS, race conditions and test gaps.
- Large-context/research agent: use for docs/API changes and cross-checking current external platform behavior; verify against primary sources.
- GitHub coding/review agents: consume `AGENTS.md`, `.specify/memory/constitution.md`, active feature artifacts and path-specific instructions.

Do not paste separate contradictory project rules into each agent. Update the constitution, this file, or the product authority documents instead.

## Communication

- Product-owner communication: Vietnamese.
- Code, identifiers, commit messages and technical contracts: English unless existing files dictate otherwise.
- Report what is verified versus inferred.
- Never claim a feature is production-ready, retained, mastered, paid-validated, legal-cleared, or CI-green without corresponding evidence.
