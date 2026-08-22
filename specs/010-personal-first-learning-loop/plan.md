# Plan: Personal-first learning loop

## Authority change

Update current product authority so the active loop is owner dogfooding with durable learning evidence. Preserve the five-person Golden Session protocol as deferred market validation; do not mutate its predeclared thresholds.

Files:

- `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`
- `docs/product/learning-model-v2/golden-session-validation.md`
- `AGENTS.md`
- `HANDOVER.md`

## Application slice

Add a pure application projection that classifies the strongest personal capability evidence from `LearningReviewItemState[]`.

It must be monotonic in claim strength and use only durable facts:

```text
no_evidence
→ independent_retrieval
→ changed_context_transfer
→ delayed_transfer
```

Rules:

- `lastIndependentAt` is required for independent retrieval;
- changed-context requires both independent retrieval and `transferSucceededAt` on an item;
- delayed transfer requires `lastDelayedTransferAt`;
- completion counts, due dates, scheduler state, exposure count and supported-only retrieval do not raise the checkpoint.

The projection also returns counts needed by the learner UI and a bounded next-action code/copy.

## UI slice

### Dashboard

- Primary CTA becomes `/start` (“Học ngay” / equivalent).
- YouTube creation stays as a secondary source path.
- Empty state points a beginner to `/start`, not `/create`.

### Progress

Add a “Vòng học cá nhân” section showing the strongest observed checkpoint and the next evidence-bearing action.

Do not remove the existing evidence counts; the checkpoint explains their relationship.

### Start

Rewrite the one-new-word explanation as the current conservative policy rather than a universal acquisition claim. Do not change the selection gate in this feature.

## Verification

Focused:

- unit tests for checkpoint classification, including anti-upgrade cases;
- update/add relevant dashboard/progress browser or unit coverage using existing test style.

Full gate:

- typecheck + lint;
- unit tests;
- production build;
- pgTAP/RLS suite (should remain unchanged but required by repo protocol);
- Chromium product journeys;
- durable Supabase journey;
- aggregate CI gate.

## Risks reviewed

- accidentally calling one delayed transfer “mastery”;
- treating supported success as independent capability;
- deleting or silently passing the old market-validation gate;
- turning personal-first into hardcoded identity logic;
- making YouTube inaccessible rather than secondary;
- changing beginner difficulty policy without evidence.
