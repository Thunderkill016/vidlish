# Tasks: Bind beginner evidence to server challenges

## Slice A — Lock and prove the bug

- [x] A1 Trace beginner session → attempt → progress repository → Supabase RPC → item state.
- [x] A2 Confirm attempt route accepts client-owned word + answer-key sentence.
- [x] A3 Confirm beginner mutation RPCs are SECURITY DEFINER and executable by `authenticated`.
- [x] A4 Confirm `learner_known_words(uuid)` is SECURITY DEFINER, browser-executable, and lacks an owner check.
- [x] A5 Confirm calibration POST does not bind answers to the server-issued/current item set.

## Slice B — Add durable server challenge authority

- [ ] B1 Add `beginner_evidence_challenges` migration with owner, kind, target, authoritative sentence, expiry and consumed state; no browser policies.
- [ ] B2 Add challenge create/read/record methods to the beginner progress port and fake/Supabase adapters.
- [ ] B3 Add challenge-bound evidence RPC that locks and consumes the challenge atomically with evidence upsert.
- [ ] B4 Revoke browser execution of legacy beginner mutation/read-bypass RPCs and grant only the server/service-role boundary that still needs them.

## Slice C — Bind session and attempt wire contracts

- [ ] C1 Add challenge ids to beginner session/introduction responses.
- [ ] C2 Replace client-supplied word/sentence attempt authority with challenge id + learner action.
- [ ] C3 Load authoritative challenge on attempt, validate owner/kind/expiry, and score stored sentence against ephemeral `heard`.
- [ ] C4 Keep support/reliability semantics unchanged and derive response word from server challenge.
- [ ] C5 Update BeginnerSession UI to send action-only challenge requests.

## Slice D — Bind calibration to server set

- [ ] D1 Extract one deterministic calibration-item constructor shared by GET and POST.
- [ ] D2 Reject missing, extra, duplicated or substituted calibration items before reliability evaluation.
- [ ] D3 Preserve current nonword classification, formula and reliability thresholds.

## Slice E — Proof

- [ ] E1 Add/update pgTAP for authenticated EXECUTE denial on evidence/calibration/known-word RPCs.
- [ ] E2 Add pgTAP for challenge ownership, expiry, single-use consumption and target derivation.
- [ ] E3 Add unit tests for calibration exact-set validation.
- [ ] E4 Add Chromium proof that random challenge fails, valid challenge succeeds once, replay fails, and legacy forged fields cannot redirect evidence.
- [ ] E5 Run focused checks and full exact-head CI.

## Slice F — Review and merge

- [ ] F1 Adversarial review privacy/evidence/ownership/replay/admin-bypass/NULL semantics.
- [ ] F2 Open draft PR with exact acceptance boundary.
- [ ] F3 Merge only after all required CI jobs are green on the exact reviewed head.

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
