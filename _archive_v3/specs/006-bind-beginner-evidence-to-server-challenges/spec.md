# Feature Specification: Bind beginner evidence to server challenges

**Feature ID:** 006-bind-beginner-evidence-to-server-challenges  
**Status:** implementation  
**Created:** 2026-08-22

## Problem

The beginner path says the server decides whether an attempt is independent, but two current boundaries let the browser manufacture the facts that decision is based on.

1. `POST /api/beginner/attempt` accepts `word` and the supposed authoritative `sentence` from the request. It then compares `heard` to that client-supplied sentence. An authenticated client can submit a made-up word plus a matching made-up sentence/heard value and bank irreversible independent evidence.
2. `record_beginner_word_evidence` and `record_learner_calibration` are `SECURITY DEFINER` functions granted to `authenticated`. A learner can bypass the Next.js routes and call the mutation RPCs directly for their own user id. `learner_known_words` is also `SECURITY DEFINER`, accepts an arbitrary owner id, and is granted to `authenticated`, so it can expose another learner's beginner capability set outside the intended server boundary.
3. Calibration POST classifies whatever item strings the browser submits, but does not prove that they are exactly the set issued by the current calibration GET. A client can choose an easier trial set and obtain a misleading reliability verdict.

These are evidence-integrity/privacy bugs. They matter even before Gate 5 because beginner capability evidence is durable and feeds the comprehensibility gate.

## Goal

Make the server/database authoritative for every fact that can create beginner capability evidence while preserving the existing learner-visible beginner flow.

A browser may report only learner actions. It must not be able to:

- choose the target word that receives evidence;
- choose the sentence used as the dictation answer key;
- replay a consumed server challenge to create additional evidence;
- choose a different calibration item set from the one the server would currently issue;
- execute beginner evidence/calibration mutation RPCs directly;
- use the beginner known-words RPC to read another learner's capability set.

## User stories

### US1 — Dictation evidence is bound to a server-issued item

When the learner starts or continues a beginner session, the server creates an opaque challenge for each attemptable item. The browser receives the challenge id and learner-visible content. On attempt, the browser sends the challenge id plus learner action only; the server loads the authoritative challenge and derives the target/answer key from it.

**Acceptance criteria**
- Beginner session/introduction responses contain a UUID challenge id for each attemptable item.
- Dictation attempt request no longer needs a client-supplied target word or answer-key sentence.
- Introduction attempt request no longer needs a client-supplied target word.
- Unknown, expired, wrong-owner, or already-consumed challenge ids fail closed and create no evidence.
- A successful record consumes the challenge atomically with the evidence write, so replay cannot increment retrieval counts.
- The response word is derived from the server challenge.
- Existing support semantics remain: an otherwise correct attempt with support opened does not become independent evidence.
- Existing dictation scoring semantics remain unchanged except that the target sentence is server-owned.

### US2 — Browser cannot bypass application evidence authority through Supabase RPCs

**Acceptance criteria**
- `authenticated` has no EXECUTE privilege on the beginner evidence mutation RPC.
- `authenticated` has no EXECUTE privilege on the learner calibration mutation RPC.
- `authenticated` cannot use `learner_known_words(uuid)` as a SECURITY DEFINER read bypass.
- Server-side repository calls continue to work through the service-role/admin boundary.
- pgTAP proves the privilege boundary rather than only proving table INSERT is denied.

### US3 — Calibration is evaluated only for the server-issued deterministic set

**Acceptance criteria**
- GET and POST share one deterministic item-construction function.
- POST recomputes the current expected set from server-owned learner state.
- Answers must contain every expected item exactly once and no additional item; otherwise the request is rejected and no calibration row is written.
- Nonword/real classification remains server-owned.
- Existing reliability formula and thresholds remain unchanged.

## Non-goals

- Changing the beginner vocabulary catalogue or one-new-word runtime policy.
- Changing dictation normalization/scoring.
- Replacing pseudoword calibration or changing its formula/thresholds.
- Hiding learner-visible sentence text from a malicious learner who inspects their own browser; the goal is to prevent arbitrary unissued evidence, not DRM the learning content.
- Changing Gate 5 Golden Session persona, thresholds, or study protocol.
- Adding provider calls, production Supabase writes, payment, gamification, or Gate 6 cohort work.
- Claiming the beginner path is learner-validated because the integrity fix passes CI.

## Invariants

- Completion != mastery.
- Client state/action is not authority for durable capability evidence.
- Server challenge owns the evidence target and answer key.
- Challenge consumption and evidence mutation cannot be separated by a replay window.
- Supported success remains distinct from independent success.
- Calibration verdict remains derived from server-known nonword truth.
- Owner isolation and privacy remain fail-closed.
- Ordinary local/CI verification uses fake/local Supabase only; no paid provider or production database is required.

## Success criteria

1. A forged attempt with a random/unissued challenge cannot create beginner evidence.
2. Reusing a valid consumed challenge cannot increment evidence twice.
3. Extra client fields such as a forged word/sentence cannot redirect the evidence target.
4. An authenticated database role cannot execute the beginner mutation RPCs or arbitrary-owner known-word SECURITY DEFINER read.
5. A calibration request with a substituted, duplicated, or missing item is rejected.
6. Existing legitimate beginner UI flow still passes browser/unit/database verification.
