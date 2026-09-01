# Plan

1. Define a narrow local SpeechRecognition facade without depending on experimental DOM typings.
2. Fail closed unless on-device English dictation is explicitly available.
3. Keep raw transcript inside the helper and emit only bounded phrase-detection metadata.
4. Derive target phrases from immutable guided-transfer target items.
5. Run the probe in parallel with the existing MediaRecorder path without changing speaking receipt persistence.
6. Expose local diagnostic state with explicit non-scoring copy.
7. Lock privacy/fallback semantics with unit tests.
8. Run exact-head CI and merge only after the aggregate gate is green.
