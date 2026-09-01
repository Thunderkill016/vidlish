# Vidlish AI Development Stack

**Status:** development workflow authority  
**Updated:** 2026-08-19

This document defines how AI products are used to build Vidlish faster without turning the production product into a multi-provider experiment.

## Principle

Use multiple frontier agents in **development** for specialization and independent review. Keep **production inference** constrained by `AGENTS.md` and the Product & Business Master Plan: one enabled provider/model/key after the explicit provider benchmark gate.

## Roles

### 1. Primary implementation agent — Codex

Use Codex as the default implementation/refactor/CI agent for long-horizon repo work.

Best-fit tasks:

- vertical feature slices;
- migrations and refactors;
- CI debugging from real logs;
- test generation and repair;
- browser QA;
- parallel independent worktrees.

Use the strongest coding model available in Codex for hard architecture/persistence work. Do not pin this repository to a model version; model releases move faster than the project contract.

Codex must consume `AGENTS.md` and the `vidlish-hard-gate` skill.

### 2. Independent adversarial reviewer — Claude Code

Use Claude Code as a second-opinion reviewer, not as a second concurrent editor of the same files.

Best-fit review lanes:

- PostgreSQL/RLS semantics;
- concurrency and idempotency;
- privacy-safe evidence boundaries;
- Next.js server/client leakage;
- answer exposure and learning-policy violations;
- missing edge-case tests.

`CLAUDE.md` imports the canonical `AGENTS.md`; do not maintain a separate Claude-specific product plan.

### 3. Large-context/current-doc cross-check — Gemini CLI

Use Gemini CLI for broad repository tracing, external-doc/API cross-checks and large-context research.

Best-fit tasks:

- verify current SDK/API behavior against primary sources;
- scan broad architecture before a migration;
- compare docs/changelogs/deprecations;
- independently challenge assumptions made by the implementation agent.

`GEMINI.md` imports `AGENTS.md`. Prefer the latest stable CLI release for normal work; preview/nightly is for isolated experiments only.

### 4. GitHub-native automation — Copilot cloud agent + code review

Use GitHub-native agents for repeatable issue-to-PR work and review automation where repository context already lives in GitHub.

The repo provides:

- `AGENTS.md` — cross-agent rules;
- `.github/copilot-instructions.md` — repository-wide review behavior;
- `.github/instructions/learning-model.instructions.md` — learning/DB-specific rules;
- `.github/skills/vidlish-hard-gate/SKILL.md` — repeatable delivery workflow.

Do not let a cloud agent merge a product hard gate solely because its own checks passed; integration CI and product gates remain authoritative.

### 5. Design — Figma + code source of truth

Use Figma MCP for reusable foundations/components/screens when quota and write access are available. Keep code behavior/contracts authoritative; Figma does not override learning/persistence rules.

When Figma write quota is unavailable, implement validated UI slices in code, then sync the approved structure back into Figma later rather than blocking engineering.

### 6. Operations, analytics and security

Preferred connected tools:

- Vercel for deployment/log inspection;
- PostHog for product analytics, experiments, errors and cohort evidence;
- Codex Security for an independent security scan/review lane;
- GitHub as source of truth for code, PRs and CI.

Do not add another tool when an existing connected tool already covers the job.

## Default multi-agent pattern

For a hard product gate:

1. **Implementer:** Codex executes the smallest vertical slice on its own branch/worktree.
2. **Reviewer:** Claude Code reviews the diff/architecture independently and returns concrete defects only.
3. **Researcher:** Gemini CLI checks current external APIs/docs only when the slice depends on unstable external behavior.
4. **GitHub CI:** typecheck/lint/unit/build/pgTAP/Chromium/durable Supabase run as applicable.
5. **Integration owner:** resolves findings, verifies the actual PR head, and merges only when the required gate is green.

Do not run three agents on the same implementation problem with overlapping edits. Parallelism is valuable when scopes are independent, not when it creates merge noise.

## Cost and safety policy

- Development-agent subscriptions/usage are tooling cost, not production inference architecture.
- Ordinary CI never receives paid production provider keys.
- Provider benchmarking for Vidlish authoring remains a separate product gate and is limited to the candidate count defined in the master plan.
- Never copy production secrets into agent memory/context files.
- Treat external MCP/plugins as privileged integrations; grant only the access needed for the task.

## What to optimize

Optimize for:

`verified product learning per engineering hour`

not:

`number of agents × number of generated commits`

The fastest workflow is the one that reduces rework while preserving grounding, privacy, durable evidence and truthful product claims.