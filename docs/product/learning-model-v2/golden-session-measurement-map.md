# Golden Session measurement map

**Status:** implementation contract for the five-person moderated usability gate  
**Feature:** `specs/003-golden-session-measurement/`

This document maps the validation protocol to durable evidence. The rule is simple: derive a metric from existing learning state whenever possible; add a product event only for a client-observable fact the server cannot reconstruct.

## Source-of-truth map

| Protocol meaning | Durable source | Interpretation |
| --- | --- | --- |
| Session viewed | `lesson_sessions.started_at` | A successful start/resume is the conservative proxy for the active lesson being shown. Vidlish does not claim pixel visibility. |
| First source play started | `learning_support_events` where `event_kind = 'playback'` | Existing playback semantics remain "play started". |
| First source play completed | `learning_product_events.source_play_completed` | Emitted only after the YouTube player reports the bounded range `ENDED`. It is not inferred from a play click. |
| First gist attempted/outcome | `activity_attempts` for the `gist_choice` activity | Attempt number and evaluation verdict are authoritative. |
| Support requested | `learning_support_events.support_opened` | The bounded support-step enum is persisted; support copy is not. |
| Replay | `learning_support_events.playback_ordinal >= 2` | Replay remains a derived playback fact, not a duplicate product event. |
| Target notice exposure | Persisted attempt on `meaning_in_context` | Conservative proxy: the learner interacted with the target-notice activity. Vidlish does not claim that every rendered pixel was read. |
| Retrieval attempted/outcome | `activity_attempts` for `chunk_recall` | Uses privacy-safe response evidence plus server evaluation; raw text is not returned by the measurement API. |
| Correction shown | `learning_product_events.correction_shown` | Emitted after React commits an incorrect-result panel. The event uses that incorrect attempt's immutable row ID as its idempotency key, and the production RPC verifies the matching session/activity/verdict before accepting it. No correction copy or learner answer is stored. |
| Mandatory retry attempted | `activity_attempts.attempt_number >= 2` for the relevant activity | No duplicate retry event is needed. |
| Changed-context transfer attempted/self-check | `activity_attempts` for `guided_transfer` | Attempt/evaluation rows remain learning authority. Product measurement cannot strengthen the capability claim. |
| After-listen check attempted | `activity_attempts` for `exit_ticket` | The Golden fixture's exit ticket carries the final hidden-caption source check. |
| Session completed | `lesson_sessions.status = 'completed'` plus `completed_at` | Completion means the first journey ended, not mastery. |
| Incomplete/abandoned during moderated analysis | Started session with status other than `completed` | Report `current_activity_id` as the last known activity. Do not mutate state from `beforeunload` or claim a reliable browser-close event. |
| Observed elapsed time | `started_at` to `completed_at`, otherwise `updated_at` | This is durable interaction time up to the last server-confirmed action, not exact foreground-tab dwell time. |
| Player/runtime defect | `learning_product_events.runtime_error` | Only a bounded error enum is stored: no provider message, code dump, URL, IP, user agent, transcript or learner content. |

## Moderator API

`GET /api/learning-lab/v2/measurement?sessionId=<uuid>` returns an owner-scoped, privacy-safe projection. It includes:

- session/completion and last-known activity;
- observed elapsed seconds;
- play-start vs confirmed play-completion distinction;
- gist, retrieval, transfer and after-listen attempt counts/verdict categories;
- support/replay counts and bounded support-step labels;
- correction count;
- bounded runtime-error categories.

It does **not** return raw open responses, transcript/caption/source text, audio, email, IP, user agent, arbitrary JSON or provider error strings.

## Still operator-observed

The five-person study still requires a human moderator for facts that telemetry cannot honestly infer:

- whether the learner understood the initial promise in their own words;
- whether a support action was intentional or caused by confusion;
- whether correction/retry felt useful or punitive;
- why the learner stopped;
- whether the final message felt credible;
- willingness to use Vidlish again or pay.

These observations belong in the moderated study notes, not in learner capability state.

## Interpretation boundary

Measurement rows are product-observation evidence only. They must never:

- mark an item learned/mastered;
- schedule or pass a review;
- advance a lesson session;
- change an evaluation verdict;
- substitute for delayed retrieval/transfer evidence.

The learning engine remains `comprehensible input + capability evidence + varied delayed review + progressively less support`; this measurement slice only makes the current Golden Session inspectable enough to test with real learners.
