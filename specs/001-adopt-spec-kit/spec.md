# Feature Specification: Adopt Spec Kit as the active development workflow

**Feature ID:** 001-adopt-spec-kit  
**Status:** migration  
**Created:** 2026-08-22

## Problem

Vidlish currently has two different layers of development truth. Current product and engineering decisions live in `AGENTS.md`, product documents, code and tests, while BMAD installs a large generated framework, agent skills, installer scripts, a dedicated installer workflow, package commands, sprint metadata, and planning artifacts. The overlap makes stale process material look authoritative and makes it possible to regenerate a second methodology into the repository.

## Goal

Make Spec Kit the single active feature-development workflow while preserving useful BMAD-era project history as read-only archive material.

## User stories

### US1 — An implementation agent can find one current workflow
Given a fresh checkout, an agent can determine the active governance and feature artifacts without invoking or installing BMAD.

**Acceptance criteria**
- `.specify/memory/constitution.md` exists and states durable Vidlish invariants.
- Active feature work is documented under `specs/<feature>/` using spec, plan and tasks artifacts.
- `AGENTS.md` points to the constitution and treats BMAD-era material as archive only.
- README describes Spec Kit, not BMAD installation.

### US2 — Historical project decisions are not destroyed
A maintainer can still inspect BMAD-era planning and implementation artifacts when investigating history.

**Acceptance criteria**
- The former `_bmad-output` tree is preserved under `docs/archive/bmad/`.
- The archive contains an explicit notice that it is historical and not active authority.
- Git history remains the authority for removed framework-generated files.

### US3 — BMAD cannot silently return
A normal CI run fails if active BMAD framework paths or commands are reintroduced.

**Acceptance criteria**
- `_bmad/`, `_bmad-output/`, `install-bmad.sh`, `install-bmad.ps1`, and `.github/workflows/install-bmad.yml` do not exist.
- `.agents/skills/` has no `bmad-*` skills; repository-specific `vidlish-hard-gate` remains.
- `package.json` has no `bmad:*` scripts.
- A deterministic unit/architecture test enforces the active-path boundary.

## Non-goals

- Rewriting historical BMAD documents into present-tense product truth.
- Changing learner behavior, database schema, provider behavior, or production configuration.
- Vendoring the entire upstream Spec Kit implementation into the repository.
- Merging unrelated learning PRs as part of this migration.

## Invariants

- Current product authority and hard-gate claims in `AGENTS.md` remain intact.
- No production or paid provider calls are needed for this migration.
- The project-specific `vidlish-hard-gate` skill remains active.
- Historical artifacts are clearly separated from active authority.

## Success criteria

1. Fresh repo inspection yields exactly one active methodology: Spec Kit plus Vidlish-specific hard gates.
2. CI on the exact migration head is fully green.
3. The migration can be merged without changing runtime application behavior.
