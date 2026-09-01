# Tasks: Bind beginner evidence to server challenges

## Slice A — Lock and prove the bug

- [x] A1 Trace beginner session → attempt → progress repository → Supabase RPC → item state.
- [x] A2 Confirm attempt route accepts client-owned word + answer-key sentence.
- [x] A3 Confirm beginner mutation RPCs are SECURITY DEFINER and executable by `authenticated`.
- [x] A4 Confirm `learner_known_words(uuid)` is SECURITY DEFINER, browser-executable, and lacks an owner check.
- [x] A5 Confirm calibration POST does not bind answers to the server-issued/current item set.

## Slice B — Add durable server challenge authority

- [x] B1 Add `beginner_evidence_challenges` migration with owner, kind, target, authoritative sentence, expiry and consumed state; no browser policies.
- [x] B2 Add challenge create/read/record methods to the beginner progress port and fake/Supabase adapters.
- [x] B3 Add challenge-bound evidence RPC that locks and consumes the challenge atomically with evidence upsert.
- [x] B4 Revoke browser execution of legacy beginner mutation/read-bypass RPCs and grant only the server/service-role boundary that still needs them.

## Slice C — Bind session and attempt wire contracts

- [x] C1 Add challenge ids to beginner session/introduction responses.
- [x] C2 Replace client-supplied word/sentence attempt authority with challenge id + learner action.
- [x] C3 Load authoritative challenge on attempt, validate owner/kind/expiry, and score stored sentence against ephemeral `heard`.
- [x] C4 Keep support/reliability semantics unchanged and derive response word from server challenge.
- [x] C5 Update BeginnerSession UI to send action-only challenge requests.

## Slice D — Bind calibration to server set

- [x] D1 Extract one deterministic calibration-item constructor shared by GET and POST.
- [x] D2 Reject missing, extra, duplicated or substituted calibration items before reliability evaluation.
- [x] D3 Preserve current nonword classification, formula and reliability thresholds.

## Slice E — Proof

- [x] E1 Add/update pgTAP for authenticated EXECUTE denial on evidence/calibration/known-word RPCs.
- [x] E2 Add pgTAP for challenge ownership, expiry, single-use consumption and target derivation.
- [x] E3 Add unit tests for calibration exact-set validation.
- [x] E4 Add Chromium proof that random challenge fails, valid challenge succeeds once, replay fails, and legacy forged fields cannot redirect evidence.
- [x] E5 Full repository CI #482 / run `32574866979` passed on reviewed implementation head `3952f461fda3a42e60fe94dce97ae6396219c58a`. After tracker convergence, final exact head `dc044508a9010ad0153f4e9400694478f68916c2` passed CI #483 / run `32575040768` in full: typecheck/lint, unit tests, production build, Supabase migration/RLS + pgTAP, Chromium product journeys, durable Supabase learning journey, and aggregate CI gate all succeeded.

## Slice F — Review and merge

- [x] F1 Adversarial review privacy/evidence/ownership/replay/admin-bypass/NULL semantics. Review caught and fixed the admin-client/auth.uid calibration mismatch and the stale pgTAP contract that would have preserved browser authority assumptions.
- [x] F2 Open draft PR with exact acceptance boundary. PR #130.
- [x] F3 PR #130 was squash-merged only after final exact-head CI #483 succeeded. Merge commit: `21a6b5f070c0544e0f7049b1c65871be70c8f5de`.

## Explicitly deferred

- hiding learner-visible sentence text from someone inspecting their own browser;
- changing the one-new-word beginner policy;
- changing dictation scoring;
- changing calibration formula/thresholds;
- changing Golden Session Gate 5;
- Gate 6 cohort work;
- paid provider/model work;
- production DB/provider calls;
- payment/gamification/social features.

Feature 006 closes an evidence-authority defect. It does **not** constitute learner evidence and does not pass Gate 5; Gate 5 still requires five genuine participant sessions under the predeclared protocol.
