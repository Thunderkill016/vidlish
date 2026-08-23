# Feature 012 — Learning capability observations

## Problem

Vidlish currently has durable beginner evidence, but it does not yet have a general capability language for the four skills. A dangerous shortcut would be to treat the way a learner answers as the skill being measured. For example, dictation uses a written response but primarily measures listening. Likewise, legacy `introduce_word` evidence proves some productive recall but does not say whether the learner spoke or wrote the word.

Without an explicit model, later personalization can collapse listening, reading, speaking and writing into one `known` flag and overestimate learner ability.

## Goal

Introduce a privacy-safe capability observation model that:

- names only the four skills: listening, reading, speaking and writing;
- separates the measured skill from the response mode;
- records whether success was supported or independent;
- projects current beginner dictation evidence conservatively;
- refuses to guess speaking or writing from legacy productive evidence whose modality was never recorded;
- stores no raw learner text, transcript, audio or answer key.

## Product rules

1. `targetSkill` is the only field that represents the capability being measured.
2. `responseMode` describes how an answer was supplied and MUST NOT be promoted into skill evidence.
3. `independent` is stronger evidence than `supported`, but neither means mastery by itself.
4. Beginner dictation projects to listening evidence with a writing response mode.
5. Existing productive beginner retrieval remains unclassified until a future challenge records a trustworthy speaking or writing modality.
6. Inconsistent aggregate evidence fails closed rather than fabricating an observation.

## Non-goals

- no speech recognition or pronunciation scoring;
- no new learner UI;
- no widening of the beginner comprehensibility gate;
- no migration that guesses historical speaking/writing modality;
- no claim that one successful observation equals mastery.

## Acceptance criteria

- a strict shared contract represents four-skill observations;
- dictation projects as listening, never writing capability;
- supported and independent dictation remain distinguishable;
- legacy productive retrieval is surfaced as unclassified rather than assigned to speaking/writing;
- unit tests lock these semantics;
- repository CI passes on the exact PR head.
