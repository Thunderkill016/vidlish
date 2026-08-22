# Tasks: Calibrate learning policy against evidence

## Slice A — Establish the evidence record

- [x] A1 Read current product authority in order: master plan, golden-session validation, constitution, current code/tests.
- [x] A2 Review research on receptive/productive knowledge, comprehension vs production practice, explicit instruction, corrective feedback, lexical coverage, frequency, multiword sequences, CEFR, pronunciation validation and FSRS boundaries.
- [x] A3 Record decisions and limitations in `research.md`.
- [x] A4 Record Gemini-family implications without changing production model policy.

**Verification:** every material claim in `research.md` has a traceable source or is explicitly labelled a Vidlish decision/hypothesis.

## Slice B — Correct active governance language without changing behavior

- [ ] B1 Update `AGENTS.md` so `input-led` is not read as `input-only`.
- [ ] B2 Update `AGENTS.md` so one-new-word `i+1` is explicitly the current conservative lexical policy.
- [ ] B3 Update `AGENTS.md` so productive-independent evidence is not presented as universal lexical knowledge.
- [ ] B4 Update `AGENTS.md` so the approximate Vietnamese scaffold word count is a policy hypothesis, not a scientific threshold.
- [ ] B5 Amend Constitution Principle II consistently and bump the constitution version.

**Verification:** active authority still preserves grounding, reveal, retry, transfer, delayed evidence, privacy, architecture and exact-head CI invariants.

## Slice C — Correct executable-file documentation without changing execution

- [ ] C1 Rewrite `check-comprehensible-input.ts` comments to describe a deterministic lexical-novelty policy rather than the definition of Krashen's theory.
- [ ] C2 Rewrite misleading test comments while preserving every assertion.
- [ ] C3 Review `compose-beginner-input.ts` comments for the same distinction.
- [ ] C4 Search active non-archive paths for stale absolute claims (`i+1`, `input before output`, `300`, universal `known`) and update only the explanatory text that conflicts with this feature.

**Focused verification:**

```bash
pnpm exec vitest run src/modules/learning/application/check-comprehensible-input.test.ts
pnpm exec vitest run src/modules/learning/application/compose-beginner-input.test.ts
```

## Slice D — Adversarial consistency review

- [ ] D1 Confirm runtime diff contains no learner-visible logic change.
- [ ] D2 Confirm no DB/schema/RLS/provider/config change exists.
- [ ] D3 Confirm no wording implies receptive evidence has already been implemented.
- [ ] D4 Confirm no wording weakens answer-hidden, retry, transfer or delayed-review evidence.
- [ ] D5 Confirm model research does not authorize production multi-model routing or paid benchmarks before the existing gate.

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
