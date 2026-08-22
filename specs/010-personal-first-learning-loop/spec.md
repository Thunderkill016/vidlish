# Feature 010 — Personal-first learning loop

## Product decision

Vidlish is currently being built first for the product owner to learn English with it personally.

The five-person moderated Golden Session study remains useful as a future market-validation instrument, but it is no longer the active blocker for product development. It must not be deleted or rewritten as if it already passed; it is simply deferred until external-user or commercial validation becomes a goal again.

The active development loop is now:

```text
owner learns in Vidlish
→ Vidlish stores durable capability evidence
→ product shows the strongest evidence it actually has
→ the next learning action is obvious
→ observed learning friction drives the next bounded fix
```

## Problem

The repository mission already says “one learner”, but current authority and UI still behave as if development must stop at a five-person market-validation gate.

The learner dashboard also privileges creating YouTube lessons, while the zero/very-low-English `/start` path is the actual entry point for a personal learner who is not yet ready for authentic video.

Finally, the progress page exposes useful capability counts but does not tell the learner where they are in the core loop or what evidence is still missing before a claim gets stronger.

## Goal

Make the product and repository operate personal-first without weakening evidence integrity.

### Learner-facing outcome

The signed-in learner should be able to open Vidlish and immediately see:

1. the primary action to continue learning at the current level;
2. whether Vidlish has observed independent retrieval, changed-context use, and delayed transfer;
3. the next evidence-bearing action instead of a vanity “level” or XP score;
4. YouTube creation as a secondary source path, not the default destination.

## Acceptance criteria

1. Product authority no longer names the five-person moderated study as the active blocker. It is explicitly retained as deferred market validation.
2. `AGENTS.md`, Master Plan, Golden validation metadata, and HANDOVER agree on the personal-first development loop.
3. Dashboard primary CTA routes to `/start`; YouTube creation remains available but secondary.
4. Empty dashboard copy no longer tells a zero learner to begin by pasting a video.
5. Progress page displays a deterministic personal learning checkpoint derived only from durable evidence already owned by the learner.
6. Checkpoint stages distinguish:
   - no durable language evidence yet;
   - independent retrieval observed;
   - independent changed-context transfer observed;
   - delayed transfer observed.
7. A stronger checkpoint cannot be earned through completion count, scheduler state, support-only success, or self-report.
8. The `/start` page no longer presents the current one-new-word policy as a universal scientific law.
9. Existing five-person evaluator/harness/routes remain intact for future market validation.
10. No production provider, billing, external participant, or synthetic learner record is used.
11. Focused unit/UI tests plus full exact-head CI must pass before merge.

## Non-goals

- declaring the product scientifically effective from one learner;
- deleting the Golden Session market-validation tooling;
- adding payment, retention, social, gamification, or multi-user features;
- changing the current beginner vocabulary-selection algorithm in this slice;
- claiming mastery from one delayed success;
- provider/model benchmarking.

## Evidence language

The personal checkpoint is not a certification score and not a pass/fail exam. It is a truthful projection of the strongest durable learning evidence currently stored.

A single delayed-transfer item means “Vidlish has observed one complete evidence loop at least once”, not “the learner has mastered English” or even “the item is permanently mastered”.
