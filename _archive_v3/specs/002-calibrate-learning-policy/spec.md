# Feature Specification: Calibrate learning policy against evidence

**Feature ID:** 002-calibrate-learning-policy  
**Status:** research / policy correction  
**Created:** 2026-08-22

## Problem

Vidlish has several strong safety-oriented learning rules, but some current comments and governance text present implementation heuristics as if they were settled second-language-acquisition laws. In particular:

- the current beginner lexical gate operationalizes `i+1` as at most one new word;
- the current learner lexical set treats unsupported productive recall as the universal meaning of a word being `known`;
- the mission language can be read as input-first becoming input-only for a zero beginner;
- Vietnamese scaffolding is described with an approximate word-count boundary that has not been validated as a learner-specific threshold.

These choices may be useful conservative policies. The problem is claiming more scientific certainty than the evidence supports. That makes later adaptation difficult and risks optimizing the learner model around the wrong construct.

## Goal

Separate three categories explicitly across current Vidlish authority and implementation documentation:

1. **durable evidence invariants** — e.g. completion is not mastery, attempt precedes reveal, delayed transfer is separate, source grounding is server-owned;
2. **conservative runtime policies** — e.g. a one-new-word lexical budget for the current beginner generator;
3. **product hypotheses to validate** — e.g. the rate at which Vietnamese support should fade or when a learner is ready for authentic media.

Preserve the current safe runtime behavior while creating an evidence-backed path toward a multidimensional learner capability model.

## User stories

### US1 — Product decisions distinguish evidence from heuristic

A maintainer reading active Vidlish governance can tell which learning rules are supported as broad evidence principles and which are current product policies that may be changed after learner validation.

**Acceptance criteria**
- Research notes cite primary research, systematic reviews/meta-analyses, standards, or primary project documentation where available.
- `i+1 = one new word` is described as the current conservative lexical-novelty policy, not as the definition of Krashen's construct or a universal SLA threshold.
- Unsupported productive recall remains strong evidence of productive capability but is not described as the only possible form of lexical knowledge.
- Input remains central, but governance does not forbid bounded production, retrieval, interaction, or corrective feedback for beginners merely because output is involved.
- Vietnamese support tapering is evidence-driven/policy-driven rather than treated as a scientifically fixed word count.

### US2 — Runtime safety does not regress during the policy correction

Existing beginner generation remains fail-closed while the learner-model redesign is still unimplemented.

**Acceptance criteria**
- The default lexical novelty budget remains one unless a later feature explicitly changes it with tests.
- `composeBeginnerInput` still rejects drafts that exceed the configured gate or teach the wrong target.
- Existing reveal, grounding, ownership, retry, transfer, and delayed-review invariants remain unchanged.
- No database schema, provider configuration, or production call is required by this feature.

### US3 — Future learner state can represent different capabilities

The next implementation features have an explicit target model instead of overloading one `known` boolean/set.

**Acceptance criteria**
- The research/plan distinguishes at least receptive recognition/comprehension from productive recall/use.
- Scheduler state remains memory-timing state, not capability evidence.
- A future capability representation can add listening, reading, speaking/writing recall/use, changed-context transfer, and delayed evidence without rewriting source-grounding contracts.
- This feature does not claim the future capability model is already implemented.

## Non-goals

- Changing the beginner sentence acceptance algorithm in this slice.
- Replacing FSRS.
- Shipping pronunciation scoring or realtime speaking.
- Switching the production Gemini model or adding production model routing.
- Rebuilding the curriculum graph.
- Claiming a complete or final theory of second-language acquisition.
- Skipping the five-person usability and learner-cohort gates already required by the product plan.

## Invariants

- Completion != mastery.
- Scheduler state != independent capability.
- Correction read != successful retry.
- Changed-context transfer remains distinct from source repetition.
- Delayed transfer remains distinct from immediate transfer.
- Canonical-source grounding and reveal boundaries remain server-owned.
- Runtime behavior stays fail-closed while policy confidence is being recalibrated.
- Research claims must be traceable to cited evidence and must state limitations where the evidence is context-dependent.

## Success criteria

1. A fresh reader can identify which current learning rules are invariants, policies, and hypotheses.
2. No learner-visible runtime behavior changes accidentally as a consequence of wording corrections.
3. The next learner-model implementation can be specified around capability dimensions rather than a universal `known` flag.
4. The current product-validation sequence remains intact; research does not become an excuse to expand scope before usability/effectiveness evidence exists.
