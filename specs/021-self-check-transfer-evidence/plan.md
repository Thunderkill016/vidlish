# Plan

1. Add a separate durable timestamp for fully confirmed self-check transfer.
2. Rebuild historical immediate-transfer aggregate evidence from raw lesson attempts and immutable blueprints.
3. Restrict future `transfer_succeeded_at` writes to objective `correct` transfer evaluations.
4. Extend pgTAP coverage so a real self-check transfer writes attempted + self-checked state but not succeeded state.
5. Run exact-head CI and merge only after every required gate is green.
