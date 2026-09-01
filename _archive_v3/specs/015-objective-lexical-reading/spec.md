# Feature 015 — Objective lexical reading evidence

## Problem

Vidlish has an objectively scored `meaning_in_context` activity, but before this feature the learner-facing view did not contain the canonical English source text before the attempt. Treating that choice as reading evidence would therefore overclaim what the learner actually read.

## Requirements

1. `meaning_in_context` MUST receive its pre-attempt English stimulus from canonical `evidenceCatalog` segments selected by the activity evidence refs.
2. The model MUST NOT supply or rewrite that English stimulus.
3. The learner view MUST expose only the resolved short context for the meaning activity; it MUST NOT expose the full evidence catalog or leak source text into the initial listening gist.
4. Missing, inconsistent, empty, or oversized canonical context MUST fail closed: the learner may still perform the legacy activity, but Vidlish MUST NOT emit reading capability evidence for it.
5. A correct or incorrect server-scored choice with resolved canonical context MAY emit objective `reading` evidence at activity scope.
6. Server-confirmed support opened before the attempt downgrades the observation from independent to supported. The canonical English stimulus itself is the task input, not support.
7. This feature claims only lexical reading-in-context evidence. It MUST NOT claim passage-level reading mastery or general reading proficiency.
8. Raw learner text/audio is not added to the observation.

## Non-goals

- passage-level reading assessment;
- speaking assessment;
- DB migration;
- new activity schema;
- mastery from one successful observation.

## Acceptance

Full repository CI must pass on the exact PR head before merge.
