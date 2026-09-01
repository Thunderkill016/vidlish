# Plan: Freeze the predeclared Golden study surface

1. Introduce a server-only `GOLDEN_STUDY_MODE` boundary with literal-true semantics.
2. Make the canonical `pnpm study:golden` command preload that flag before the harness starts.
3. Suppress only the post-completion speaking handoff on the Golden fixture page while study mode is active.
4. Leave normal learner runtime, production lesson sessions, evidence persistence, measurement and thresholds unchanged.
5. Add focused tests for the flag/preload boundary.
6. Review the diff for study-scope drift, then require exact-head full CI before squash merge.
