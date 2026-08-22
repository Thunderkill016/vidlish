# Plan: Bind beginner evidence to server challenges

## Acceptance boundary

This slice changes only the authority path for beginner evidence and calibration. It does not change what is taught, how dictation is scored, the calibration formula, the Golden Session Gate 5 protocol, provider routing, or production rollout.

## Current end-to-end trace

### Beginner session / dictation

```text
/start BeginnerSession
→ POST /api/beginner/session
→ startBeginnerSession
→ response contains target + sentence text
→ browser POST /api/beginner/attempt with word + sentence + heard
→ route scoreDictation(client sentence, heard)
→ BeginnerProgressRepository.recordWordEvidence(word, independent)
→ Supabase admin RPC record_beginner_word_evidence
→ learning_item_states
```

Integrity gap: the browser chooses both the evidence target and the answer key. The DB mutation RPC is also executable by `authenticated`.

### Calibration

```text
GET /api/beginner/calibration
→ knownWords
→ route builds real/nonword item list
→ browser answers
→ POST /api/beginner/calibration
→ route trusts submitted item set, classifies strings with isNonword
→ assessSelfReportReliability
→ record_learner_calibration RPC
```

Integrity gap: POST does not prove the answer set equals the issued/current set, and the mutation RPC is executable directly by `authenticated`.

## Target design

### Durable word challenge

Add a server-only durable table `beginner_evidence_challenges` containing:

- UUID id;
- owner user id;
- kind: `introduce_word` or `dictation`;
- target word;
- authoritative sentence text for dictation, null for introduction;
- created/expiry timestamps;
- consumed timestamp.

No browser table policy is added. Session creation uses the server/admin repository to create challenge rows.

Wire responses expose only the UUID challenge id in addition to existing learner-visible content.

Attempt requests become action-only:

```text
challengeId
kind
usedSupport
heard OR claimedIndependent
```

The route loads the server challenge, validates kind/owner/expiry, scores against the stored sentence when applicable, then calls one database mutation that locks the challenge, proves it is still usable, consumes it, derives the word from the challenge, and records evidence in the same transaction.

This makes replay fail closed even under concurrent requests.

### RPC privilege boundary

A migration will revoke `authenticated` execution from:

- `record_beginner_word_evidence(...)`;
- `record_learner_calibration(...)`;
- `learner_known_words(uuid)`.

Server/admin access remains available to the service-role boundary. The application moves beginner evidence writes to the challenge-bound RPC. pgTAP asserts privileges explicitly.

### Calibration set binding

Extract deterministic calibration item construction into one server/platform helper shared by GET and POST.

POST recomputes the expected items from current server-owned known words and requires the submitted answers to match that set exactly once per item before classifying/evaluating them.

No calibration threshold/formula changes.

## Architecture

Keep dependency direction:

```text
route/UI
→ application / ports
← fake + Supabase adapters
```

Challenge persistence belongs behind the existing beginner progress repository because it is part of the same evidence-authority transaction. The UI never reads the challenge table directly.

## Verification

### Unit

- deterministic calibration item construction;
- exact-set validation rejects missing/extra/duplicate items;
- fake repository challenge ownership/expiry/replay behavior where practical;
- existing dictation scoring tests remain unchanged.

### pgTAP

- authenticated cannot execute mutation RPCs;
- authenticated cannot execute arbitrary-owner known-word SECURITY DEFINER read;
- challenge-bound evidence RPC derives target from challenge;
- consumed challenge cannot be replayed;
- wrong owner / expired challenge fails;
- supported attempt does not bank independence;
- prior independent evidence remains monotonic.

### Chromium

- legitimate `/start` introduction/attempt works with challenge id;
- random challenge is rejected;
- valid challenge succeeds once;
- replay fails;
- forged legacy `word`/`sentence` fields cannot redirect returned/stored evidence.

### Full gate

After focused checks, run the full required CI on the exact PR head: typecheck/lint, unit, build, pgTAP/RLS, Chromium, durable Supabase journey, aggregate gate.

## Adversarial review checklist

- Can browser still write `p_independent=true` through Supabase directly?
- Can browser read another learner's known words through a SECURITY DEFINER function?
- Can challenge id be used by another owner?
- Can expired/consumed challenge be reused?
- Can client choose the word/sentence through any legacy field?
- Is challenge consume atomic with evidence upsert?
- Does calibration accept substituted or duplicate items?
- Does a failed/replayed request accidentally create exposure/attempt rows?
- Does the fix introduce raw learner text persistence? (`heard` must remain ephemeral.)
- Does any test pass only because admin/service role bypasses the browser privilege being tested?
