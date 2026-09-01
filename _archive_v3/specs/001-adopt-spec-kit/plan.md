# Implementation Plan: Adopt Spec Kit

## Scope

Methodology/harness migration only. Runtime learner behavior, database schema and production providers are unchanged.

## Current-state findings

- Active BMAD framework: `_bmad/`.
- Generated BMAD agent skills: `.agents/skills/bmad-*`.
- BMAD installers: `install-bmad.sh`, `install-bmad.ps1`, package `bmad:*` scripts and `.github/workflows/install-bmad.yml`.
- Project-specific BMAD-era artifacts: `_bmad-output/`; these contain architecture, epic, readiness, story and validation history and must not be destroyed blindly.
- Repository-specific `.agents/skills/vidlish-hard-gate/` is not BMAD framework content and must remain.

## Target structure

```text
.specify/
  memory/
    constitution.md
specs/
  001-adopt-spec-kit/
    spec.md
    plan.md
    tasks.md
    checklists/requirements.md
docs/archive/bmad/
  README.md
  ...former _bmad-output tree...
.agents/skills/
  vidlish-hard-gate/
```

## Migration decisions

### Preserve history by tree reuse

Archive the exact former `_bmad-output` Git tree under `docs/archive/bmad/`, adding only an archive notice. This preserves every historical artifact byte-for-byte while removing it from active methodology paths.

### Remove framework rather than rename it

Do not rename BMAD skills into Spec Kit names. That would keep a second methodology while changing labels. Remove framework-generated BMAD files, installers and package commands. Git history preserves them if forensic access is needed.

### Keep Spec Kit lean

Vidlish needs a constitution and per-feature spec/plan/tasks/checklist artifacts. It does not need a vendored copy of every upstream command/template to establish source of truth. Agent tooling may invoke upstream Spec Kit commands, but repository governance remains in `.specify/memory/constitution.md` and `specs/`.

### Guard active paths in tests

Add a deterministic architecture test that checks the filesystem and `package.json`. Because `pnpm test` is already a required CI job, the guard is automatically part of the existing CI gate without adding a parallel workflow.

## Documentation changes

- `AGENTS.md`: add constitution/current feature specs to authority order; BMAD archive is historical only.
- `README.md`: replace BMAD installation instructions with Spec Kit repository workflow; update historical-plan link to archive.
- `package.json`: remove `bmad:*` scripts only.

## Verification

Focused:

```bash
pnpm exec vitest run tests/architecture/methodology-source-of-truth.test.ts
```

Required exact-head CI remains authoritative:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
supabase test db
pnpm test:e2e
```

No production provider calls are required or permitted for this migration.

## Risks and mitigations

- **Risk:** historical decision context disappears. **Mitigation:** reuse the entire `_bmad-output` tree in `docs/archive/bmad/` and label it historical.
- **Risk:** generated BMAD skills are accidentally regenerated. **Mitigation:** remove installers/scripts/workflow and enforce forbidden active paths in unit CI.
- **Risk:** product authority is accidentally rewritten during methodology work. **Mitigation:** preserve all current `AGENTS.md` product/state sections; change only authority/workflow wording.
- **Risk:** unrelated open learning PRs race with this migration. **Mitigation:** base on exact current `main`; do not merge or edit their feature branches in this PR.
