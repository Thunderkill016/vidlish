# Plan

1. Derive a short canonical English reading context from each `meaning_in_context` activity's evidence refs.
2. Inject that context into the learner prompt before the objective choice without exposing the full evidence catalog.
3. Project correct/incorrect meaning attempts as activity-scoped objective reading observations only when canonical context resolves.
4. Keep support strength tied to persisted server support events before the attempt.
5. Add learner-view and capability-projection regressions.
6. Run full exact-head CI and merge only after the aggregate gate is green.
