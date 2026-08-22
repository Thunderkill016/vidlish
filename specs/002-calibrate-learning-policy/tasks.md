# Tasks: Calibrate learning policy against evidence

## Slice A — Establish the evidence record

- [x] A1 Read current product authority in order: master plan, golden-session validation, constitution, current code/tests.
- [x] A2 Review research on receptive/productive knowledge, comprehension vs production practice, explicit instruction, corrective feedback, lexical coverage, frequency, multiword sequences, CEFR, pronunciation validation and FSRS boundaries.
- [x] A3 Record decisions and limitations in `research.md`.
- [x] A4 Record Gemini-family implications without changing production model policy.

**Verification:** every material claim in `research.md` has a traceable source or is explicitly labelled a Vidlish decision/hypothesis.

## Slice B — Correct active governance language without changing behavior

- [x] B1 Update `AGENTS.md` so `input-led` is not read as `input-only`.
- [x] B2 Update `AGENTS.md` so one-new-word `i+1` is explicitly the current conservative lexical policy.
- [x] B3 Update `AGENTS.md` so productive-independent evidence is not presented as universal lexical knowledge.
- [x] B4 Update `AGENTS.md` so the approximate Vietnamese scaffold word count is a policy hypothesis, not a scientific threshold.
- [x] B5 Amend Constitution Principle II consistently and bump the constitution version.

**Verification:** active authority still preserves grounding, reveal, retry, transfer, delayed evidence, privacy, architecture and exact-head CI invariants.

## Slice C — Correct executable-file documentation without changing execution

- [x] C1 Rewrite `check-comprehensible-input.ts` comments to describe a deterministic lexical-novelty policy rather than the definition of Krashen's theory.
- [x] C2 Rewrite misleading test comments while preserving every assertion.
- [x] C3 Review `compose-beginner-input.ts` comments for the same distinction.
- [x] C4 Search/review active authority and relevant learning paths for stale absolute claims (`i+1`, `input before output`, approximate vocabulary cutoffs, universal `known`) and update the explanatory text in scope for this feature. GitHub code search did not surface additional indexed hits; the next implementation slice must repeat the audit against its checkout before changing behavior.

**Focused verification:**

```bash
pnpm exec vitest run src/modules/learning/application/check-comprehensible-input.test.ts
pnpm exec vitest run src/modules/learning/application/compose-beginner-input.test.ts
```

Local execution was not available in the research environment, so these checks remain to be proven by the PR CI head rather than marked green from inspection alone.

## Slice D — Adversarial consistency review

- [x] D1 Compare branch to `main`: executable-file changes are comments only; no learner-visible logic change is intended.
- [x] D2 Compare branch to `main`: no DB/schema/RLS/provider/config file is changed.
- [x] D3 Confirm wording explicitly says receptive evidence is a future capability and is not inferred from existing records.
- [x] D4 Confirm answer-hidden, retry, changed-context transfer and delayed-review evidence remain non-negotiable invariants.
- [x] D5 Confirm Gemini research preserves one production model and does not authorize paid/model benchmarking before the existing gate.

## Slice E — Required merge gate

- [ ] E1 `pnpm typecheck`
- [ ] E2 `pnpm lint`
- [ ] E3 `pnpm test`
- [ ] E4 `pnpm build`
- [ ] E5 `supabase test db`
- [ ] E6 `pnpm test:e2e`
- [ ] E7 Review the exact PR head and merge only if required jobs are green.

## Deferred follow-up feature

After this policy correction lands, specify a separate vertical slice for a multidimensional learner-capability contract. That feature should project existing independent-production evidence honestly, add one real receptive evidence source, and compare a capability-aware comprehensibility decision with the existing conservative gate before changing learner-visible behavior.
