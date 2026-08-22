# Implementation Plan: Calibrate learning policy against evidence

## Scope

This slice changes **governance, research documentation, and implementation wording only**. Learner-visible runtime behavior, database schema, persisted evidence, provider configuration and production execution remain unchanged.

The purpose is to remove false certainty before changing the learner model.

## Current-state findings

### Product and governance

- `AGENTS.md` correctly protects grounding, reveal boundaries, retry, changed-context transfer, delayed evidence and the distinction between shipping/reliability/teaching value.
- It currently phrases several product policies as stronger scientific claims than the evidence supports: input before output as a categorical sequence, `i+1` as exactly one unknown word, productive independence as the universal definition of `known`, and Vietnamese guidance around an approximate 300-word boundary.
- `.specify/memory/constitution.md` repeats the strongest version of the lexical-known policy in Principle II.
- `docs/product/learning-model-v2/golden-session-validation.md` already contains a more balanced loop: source input, progressive support, productive retrieval, correction/retry, changed-context use and honest after-check. That behavior should not be weakened.

### Runtime

- `check-comprehensible-input.ts` is a deterministic lexical novelty gate with a default `maxNewWords = 1`.
- The function already supports an explicit wider budget, so the runtime shape is a policy seam rather than an irreversible algorithm.
- `compose-beginner-input.ts` adds an important second gate: the permitted new word must be the intended target. It fails closed by discarding wandering drafts.
- The current known set is based on independent production evidence. This is conservative for input selection but does not represent receptive knowledge.
- Progress/review already separate encountered, supported, independent, transferred and delayed evidence, which makes a future multidimensional learner model compatible with the current evidence architecture.

## Decisions

### 1. Separate invariants, policies and hypotheses

Use these meanings consistently:

- **Invariant:** weakening it would allow misleading evidence, unsafe ownership, broken grounding, answer leakage, false mastery, or an unverified product claim.
- **Policy:** a deliberate current operating choice with an explicit boundary and safe default; it can change through a later spec and evidence.
- **Hypothesis:** a product/learning assumption that must be measured before it becomes a stronger policy.

### 2. Preserve the one-new-word runtime default in this slice

The existing gate is safe and test-covered. Research does not justify deleting it merely because it is not a universal SLA law. Change the explanatory contract, not the behavior.

Later policy experiments must remain explicit through `maxNewWords` or a richer policy contract and must be validated against learner outcomes, not generation acceptance rate.

### 3. Stop overloading productive evidence as universal lexical knowledge

For current code, independent unsupported production remains the source used by the beginner gate. Documentation will call it what it is: **productive-independent evidence used by the current conservative gate**.

A later feature will introduce capability dimensions. This slice must not fabricate receptive evidence from historical productive records.

### 4. Describe the zero-beginner loop as input-led

Input remains the entry point and support should preserve comprehensibility. Bounded retrieval/production, corrective feedback and retry are compatible with this mission and already exist in the golden-session design.

Do not change the current hard evidence loop:

`comprehensible input -> notice -> retrieval -> changed-context use -> delayed review -> less support`

The wording correction explains that production is part of the loop rather than a forbidden stage before an arbitrary threshold.

### 5. Make Vietnamese taper evidence-sensitive

Keep Vietnamese as an intentional early scaffold. Stop treating an approximate word count as a scientific threshold. A future scaffold policy should use learner evidence and task difficulty, with word count/frequency as one signal at most.

### 6. Do not switch Gemini models here

Model capability research is recorded, but the product sequence still requires usability/learner evidence before model-economics optimization. Production remains one provider + one model. The later benchmark remains capped at three candidates and uses cost per accepted lesson.

## Files to change

### Active feature artifacts

- `specs/002-calibrate-learning-policy/spec.md`
- `specs/002-calibrate-learning-policy/research.md`
- `specs/002-calibrate-learning-policy/plan.md`
- `specs/002-calibrate-learning-policy/tasks.md`

### Governance / explanatory contracts

- `AGENTS.md`
  - replace categorical input/output sequencing with input-led wording;
  - mark the one-new-word gate as current conservative policy;
  - distinguish productive-independent lexical evidence from universal lexical knowledge;
  - mark the Vietnamese word-count boundary as an initial scaffold hypothesis.
- `.specify/memory/constitution.md`
  - clarify Principle II without weakening the comprehensible-input gate;
  - bump constitution version as a material rule clarification.
- `src/modules/learning/application/check-comprehensible-input.ts`
  - rewrite comments so they accurately describe the deterministic lexical policy and its limitations;
  - no executable logic change.
- `src/modules/learning/application/check-comprehensible-input.test.ts`
  - rewrite misleading comments only if necessary;
  - assertions remain unchanged.
- `src/modules/learning/application/compose-beginner-input.ts`
  - rewrite explanatory comments only if they imply the one-word budget is a universal learning law;
  - no executable logic change.

## Compatibility

- No API contract changes.
- No database migration.
- No RLS change.
- No generated lesson contract change.
- No analytics event change.
- No provider call.
- No production deployment required to validate semantic compatibility.

## Verification

Because executable behavior is not intended to change, verification has two layers.

### Focused

```bash
pnpm exec vitest run src/modules/learning/application/check-comprehensible-input.test.ts
pnpm exec vitest run src/modules/learning/application/compose-beginner-input.test.ts
```

The tests must retain the existing one-new-word default and explicit widening behavior.

### Required exact-head CI before merge

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
supabase test db
pnpm test:e2e
```

No production Supabase, Gemini, Supadata or other paid provider call is authorized by this feature.

## Risks and mitigations

- **Risk: documentation correction silently weakens runtime gates.**  
  **Mitigation:** no executable logic changes; existing unit assertions remain intact.

- **Risk: research is promoted into a new dogma.**  
  **Mitigation:** sources and limitations are recorded; context-dependent findings are labelled as such; future runtime changes require separate feature evidence.

- **Risk: multidimensional capability scope explodes this slice.**  
  **Mitigation:** specify the target model but defer schema/application implementation to the next bounded feature.

- **Risk: newer Gemini models trigger premature provider churn.**  
  **Mitigation:** preserve existing hard-gate ordering and one-production-model rule; benchmark only at the model-economics gate.

- **Risk: word-count scaffold language remains authoritative elsewhere.**  
  **Mitigation:** search active (non-archive) paths for `300`, `i+1`, `known`, `input before output` and update only statements that incorrectly present hypotheses as settled facts.
