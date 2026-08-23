# Plan — Feature 016

1. Generalize canonical reading-context resolution to distinguish lexical and passage boundaries.
2. Synthesize one shown `gist_choice` server-side from a second selected brief window when the canonical passage is eligible.
3. Insert the task after existing gist activities without changing persisted activity schema.
4. Render canonical passage text in the learner view only for shown gist evidence.
5. Give shown reading gist a capability runtime policy with no listening support ladder.
6. Project correct/incorrect shown gist attempts as objective activity-scoped reading evidence.
7. Downgrade the observation to supported if the same source segments were exposed in an earlier listening gist.
8. Add unit coverage for synthesis, fail-closed behavior, learner visibility, runtime policy, and capability projection.
9. Run exact-head full CI and merge only when the aggregate gate is green.
