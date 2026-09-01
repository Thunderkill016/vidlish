# Feature 018 — Session capability read model

## Problem

Vidlish can already project defensible four-skill capability observations from immutable lesson blueprints, privacy-safe attempts and durable support events, but that projection exists only as application logic. The authenticated measurement API exposes product telemetry, not the language-skill evidence the same session produced.

Persisting a second capability table now would create another source of truth before the projection contract has been exercised through the real read path.

## Requirements

1. The authenticated, owner-scoped session measurement read path MUST expose capability observations projected from durable server evidence.
2. Capability observations MUST be recomputed at read time from:
   - immutable `lesson_versions.blueprint`;
   - privacy-safe `activity_attempts`;
   - durable `learning_support_events`.
3. The read model MUST NOT store learner free text, transcript text, audio or answer content in a capability observation.
4. The read model MUST use the existing `projectLessonActivityCapabilityEvidence()` semantics rather than inventing a parallel mapping.
5. Product telemetry and capability evidence remain distinct concepts. The existing telemetry summariser MUST continue to work without producing capability claims.
6. `/api/learning-lab/v2/measurement` MUST require `capabilityObservations` in its response.
7. Existing telemetry consumers and Gate 5 study payloads without capability observations MUST remain valid. A full measurement API response containing privacy-safe capability observations MUST also remain accepted by the Gate 5 contract.
8. Every service-role read MUST remain explicitly owner-scoped rather than relying on RLS alone.
9. No capability persistence table or migration is introduced by this feature.

## Acceptance criteria

- A session with no qualifying attempts returns `capabilityObservations: []`.
- A durable objectively correct lexical-reading attempt projects an objective reading observation at activity scope without exposing the selected option ID.
- Durable support events are hydrated with enough identity/timing data for the existing projector to determine support state.
- The Gate 5 schema accepts both legacy telemetry-only summaries and a full measurement response with capability observations.
- Existing telemetry fields remain unchanged.
