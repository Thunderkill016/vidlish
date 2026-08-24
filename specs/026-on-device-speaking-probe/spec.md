# Feature 026 — On-device speaking probe

## Problem

Speaking capture is real but intentionally self-check / unscored. A future verifier needs speech recognition evidence without silently sending private learner audio or transcript to an external service.

## Requirements

- The probe is optional and must fail closed.
- Recognition may run only when the browser exposes unprefixed `SpeechRecognition` with on-device English dictation support.
- Availability/install checks must request `processLocally: true`, `en-US`, dictation quality.
- Recognition itself must set `processLocally = true`.
- No `webkitSpeechRecognition`, cloud recognition or remote fallback is allowed.
- The probe consumes a cloned live microphone track and must not replace MediaRecorder speaking capture.
- Raw recognized transcript must not leave the local helper, appear in UI, enter FormData/API requests, localStorage, Supabase, AI/Gemini or analytics.
- The only probe output is bounded local diagnostic metadata: target phrase detected and recognized word count.
- Target phrases come from immutable target-item surface forms for the selected guided-transfer activity.
- Phrase detection is exact after bounded normalization; no fuzzy match is allowed in this slice.
- A detected phrase is not pronunciation success, intelligibility, CEFR or mastery.
- A missing phrase is not speaking failure.
- Probe output must not be persisted or projected into four-skill progress in Feature 026.
- If local ASR is unsupported, unavailable or errors, the existing speaking self-check continues unchanged.
- Gate 5 remains unchanged.
